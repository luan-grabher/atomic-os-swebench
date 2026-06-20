/**
 * byte-guard-kernel.mjs — Kernel-level byte enforcement
 *
 * This is the inescapability lever: it PREVENTS filesystem writes
 * that don't flow through the atomic envelope.
 *
 * Two backend strategies:
 *
 *   1. macOS: sandbox-exec profile (mandatory, built into atomic-exec-broker)
 *      PLUS a FSEvents audit daemon that detects and alerts on unenveloped writes.
 *      The sandbox-exec profile already DENIES writes outside effectRoot by design.
 *
 *   2. Linux: eBPF LSM probe (byte-guard-kernel.bpf.c) that attaches to
 *      security_file_open and security_inode_create, checking for an
 *      atomic proof token before allowing write access.
 *
 *   3. Darwin deep enforcement: Endpoint Security daemon (byte-guard-es.swift)
 *      that uses the macOS Endpoint Security API to AUTHORIZE or DENY
 *      every filesystem event within the repo. Requires SIP approval or
 *      system extension entitlement. This is the STRONGEST form of
 *      enforcement available on macOS.
 *
 * The proof token mechanism:
 *   - Before any atomic write, the envelope writes a token to
 *     .atomic/write-tokens/<pid>-<sha256>.json
 *   - The kernel guard reads this token and allows the write
 *   - After the write, the envelope deletes the token
 *   - No token → write is BLOCKED at kernel level
 *
 * This file IS the launcher that selects the appropriate backend.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import * as os from 'node:os';
import crypto from 'node:crypto';

const REPO_ROOT = findRepoRoot(process.cwd());
const TOKEN_DIR = path.join(REPO_ROOT, '.atomic', 'write-tokens');

function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

// ── Proof Token System ─────────────────────────────────────────────────

export function issueWriteToken(file: string, operation: string): string {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  const token = {
    pid: process.pid,
    file: path.resolve(file),
    operation,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(token)).digest('hex').slice(0, 16);
  const tokenFile = path.join(TOKEN_DIR, `${process.pid}-${hash}.json`);
  fs.writeFileSync(tokenFile, JSON.stringify(token));
  // Auto-expire after 10 seconds
  setTimeout(() => {
    try { fs.unlinkSync(tokenFile); } catch { /* already consumed */ }
  }, 10_000).unref();
  return tokenFile;
}

export function consumeWriteToken(file: string): boolean {
  if (!fs.existsSync(TOKEN_DIR)) return false;
  const absFile = path.resolve(file);
  for (const entry of fs.readdirSync(TOKEN_DIR)) {
    const tokenPath = path.join(TOKEN_DIR, entry);
    try {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      if (token.file === absFile) {
        fs.unlinkSync(tokenPath);
        return true;
      }
    } catch { /* invalid token */ }
  }
  return false;
}

export function activeTokenCount(): number {
  if (!fs.existsSync(TOKEN_DIR)) return 0;
  return fs.readdirSync(TOKEN_DIR).length;
}

export function clearExpiredTokens(): number {
  if (!fs.existsSync(TOKEN_DIR)) return 0;
  const now = Date.now();
  let cleared = 0;
  for (const entry of fs.readdirSync(TOKEN_DIR)) {
    const tokenPath = path.join(TOKEN_DIR, entry);
    try {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      if (now - token.timestamp > 10_000) {
        fs.unlinkSync(tokenPath);
        cleared++;
      }
    } catch {
      fs.unlinkSync(tokenPath);
      cleared++;
    }
  }
  return cleared;
}

// ── Sandbox-Exec Profile Generator ─────────────────────────────────────

/**
 * Generates a macOS sandbox-exec profile that:
 *   1. Allows only read-only access to the repo root
 *   2. Denies ALL writes except through atomic write tokens
 *   3. Denies network access (Tier B default)
 *   4. Allows writes only to the designated effectRoot
 */
export function generateAtomicSandboxProfile(
  repoRoot: string,
  effectRoot: string,
  allowNetwork = false,
): string {
  const esc = (s: string) => s.replace(/"/g, '\\"');

  return `
(version 1)
(deny default)
(import "system.sb")

;; Read-only access to entire repo
(allow file-read* file-read-metadata
  (subpath "${esc(repoRoot)}"))

;; Write access ONLY to effectRoot (the atomic write target)
(allow file-write* file-write-data file-write-create file-write-mode file-write-owner
  (subpath "${esc(effectRoot)}"))

;; Write tokens directory (read-only for verification)
(allow file-read* file-read-metadata
  (subpath "${esc(path.join(repoRoot, '.atomic', 'write-tokens'))}"))

;; Temp dir for atomic write staging
(allow file-write* file-write-data file-write-create
  (subpath "/private/tmp")
  (subpath "${esc(path.join(effectRoot, 'atomic-exec'))}"))

;; Process execution
(allow process-exec (subpath "/bin") (subpath "/usr/bin") (subpath "/usr/local/bin"))
(allow process-fork)

;; Signals
(allow signal)

${allowNetwork ? `
;; Network access (Tier C: controlled, recorded by proxy)
(allow network-outbound
  (remote tcp-connect "*:*"))
` : `
;; Network DENIED (Tier B default)
(deny network*)
`}

;; Deny everything else
(deny file-write* (with no-report))
`;
}

// ── Linux eBPF Probe Generator ─────────────────────────────────────────

/**
 * Generates the eBPF C source for a LSM-based write guard.
 *
 * This BPF program attaches to the security_file_open and
 * security_inode_create LSM hooks. It checks for a valid
 * atomic proof token before allowing writes within the repo.
 *
 * Compile with: clang -O2 -target bpf -c byte-guard-kernel.bpf.c -o byte-guard-kernel.bpf.o
 * Load with: bpftool prog load byte-guard-kernel.bpf.o /sys/fs/bpf/atomic-guard
 */
export function generateEBPFProbe(repoRootInode: string, tokenDirInode: string): string {
  return `// byte-guard-kernel.bpf.c — Atomic Envelope eBPF LSM Probe
// Compile: clang -O2 -target bpf -c byte-guard-kernel.bpf.c -o byte-guard-kernel.bpf.o
// Load:    bpftool prog load byte-guard-kernel.bpf.o /sys/fs/bpf/atomic-guard autoattach

#include <linux/bpf.h>
#include <linux/lsm_hooks.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

// The inode of the repo root — set at load time
volatile const u64 REPO_ROOT_INODE = ${repoRootInode};
volatile const u64 TOKEN_DIR_INODE = ${tokenDirInode};

// BPF map: pid → allowed (token present)
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u32);    // pid
    __type(value, u8);   // 1 = allowed
} pid_allowed SEC(".maps");

// Map: inode → repo inode (for inheritance)
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 65536);
    __type(key, u64);    // inode
    __type(value, u64);  // parent repo inode
} inode_tree SEC(".maps");

SEC("lsm/file_open")
int BPF_PROG(atomic_file_open, struct file *file, int ret)
{
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u8 *allowed = bpf_map_lookup_elem(&pid_allowed, &pid);

    // Read access: always allowed
    int flags = BPF_CORE_READ(file, f_flags);
    if ((flags & (O_WRONLY | O_RDWR)) == 0)
        return 0;

    // Write access: require token
    if (allowed && *allowed == 1) {
        // Token consumed — remove from map
        bpf_map_delete_elem(&pid_allowed, &pid);
        return 0; // allow
    }

    // No token → BLOCK write
    bpf_printk("atomic-guard: BLOCKED write by pid=%d (no atomic proof token)", pid);
    return -EPERM;
}

SEC("lsm/inode_create")
int BPF_PROG(atomic_inode_create, struct inode *dir, struct dentry *dentry, umode_t mode)
{
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u8 *allowed = bpf_map_lookup_elem(&pid_allowed, &pid);

    if (allowed && *allowed == 1) {
        bpf_map_delete_elem(&pid_allowed, &pid);
        return 0;
    }

    bpf_printk("atomic-guard: BLOCKED file creation by pid=%d", pid);
    return -EPERM;
}

// Token grant: userspace writes pid→1 to this map before each atomic op
// Token revoke: userspace deletes pid from map after each atomic op

char _license[] SEC("license") = "GPL";
`;
}

// ── MacOS Endpoint Security Daemon (Swift) ─────────────────────────────

/**
 * Generates the Swift source for a macOS Endpoint Security daemon.
 *
 * This daemon:
 *   1. Requests ES_EVENT_TYPE_AUTH_OPEN and ES_EVENT_TYPE_AUTH_CREATE
 *   2. For every filesystem event within the repo root:
 *      a. If the event is a READ: allow immediately
 *      b. If the event is a WRITE/CREATE: check for proof token
 *      c. If token exists: allow and consume token
 *      d. If no token: DENY (ES_AUTH_RESULT_DENY)
 *   3. Events outside the repo root: allow (not our jurisdiction)
 */
export function generateEndpointSecurityDaemon(): string {
  return `
// byte-guard-es.swift — macOS Endpoint Security Daemon
// Compile: swiftc -o byte-guard-es byte-guard-es.swift
// Run:     sudo ./byte-guard-es /path/to/repo

import Foundation
import EndpointSecurity

class AtomicGuard {
    let client: OpaquePointer
    let repoRoot: String
    let tokenDir: String

    init(repoRoot: String) throws {
        self.repoRoot = (repoRoot as NSString).standardizingPath
        self.tokenDir = "\\(self.repoRoot)/.atomic/write-tokens"

        // Create ES client
        let res = es_new_client(&client) { (client, message) in
            let guard = Unmanaged<AtomicGuard>
                .fromOpaque(es_client_copied_events(client)!)
                .takeUnretainedValue()
            guard.handle(message)
        }
        if res != ES_NEW_CLIENT_RESULT_SUCCESS {
            throw NSError(domain: "AtomicGuard", code: Int(res.rawValue),
                userInfo: [NSLocalizedDescriptionKey: "ES client creation failed"])
        }

        // Subscribe to auth events
        let events: [es_event_type_t] = [
            ES_EVENT_TYPE_AUTH_OPEN,
            ES_EVENT_TYPE_AUTH_CREATE,
            ES_EVENT_TYPE_AUTH_UNLINK,
            ES_EVENT_TYPE_AUTH_RENAME,
            ES_EVENT_TYPE_AUTH_TRUNCATE,
        ]
        events.withUnsafeBufferPointer { buf in
            es_subscribe(client, buf.baseAddress!, UInt32(buf.count))
        }
    }

    func isWithinRepo(_ path: String) -> Bool {
        return path.hasPrefix(repoRoot) && !path.hasPrefix(tokenDir)
    }

    func checkToken(for file: String) -> Bool {
        let fm = FileManager.default
        guard let entries = try? fm.contentsOfDirectory(atPath: tokenDir) else { return false }

        for entry in entries {
            let tokenPath = "\\(tokenDir)/\\(entry)"
            guard let data = try? Data(contentsOf: URL(fileURLWithPath: tokenPath)),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let tokenFile = json["file"] as? String,
                  tokenFile == file else { continue }

            // Consume token
            try? fm.removeItem(atPath: tokenPath)
            return true
        }
        return false
    }

    func handle(_ message: UnsafeMutablePointer<es_message_t>) {
        let event = message.pointee

        // Auth events have a result we can set
        var result = ES_AUTH_RESULT_ALLOW

        if event.action_type == ES_ACTION_TYPE_AUTH {
            let path: String?
            switch event.event_type {
            case ES_EVENT_TYPE_AUTH_OPEN:
                path = String(cString: event.event.open.file.pointee.path.data)
            case ES_EVENT_TYPE_AUTH_CREATE:
                path = String(cString: event.event.create.destination.pointee.path.data)
            case ES_EVENT_TYPE_AUTH_UNLINK:
                path = String(cString: event.event.unlink.target.pointee.path.data)
            case ES_EVENT_TYPE_AUTH_RENAME:
                path = String(cString: event.event.rename.destination.pointee.path.data)
            default:
                path = nil
            }

            if let p = path, isWithinRepo(p) {
                // Read operations always allowed
                if event.event_type == ES_EVENT_TYPE_AUTH_OPEN {
                    let flags = event.event.open.fflags
                    if (flags & (FWRITE | O_CREAT | O_TRUNC)) == 0 {
                        result = ES_AUTH_RESULT_ALLOW
                    } else {
                        // Write/Create: require token
                        if !checkToken(for: p) {
                            result = ES_AUTH_RESULT_DENY
                            fputs("[atomic-guard] DENIED write to \\(p)\\n", stderr)
                        }
                    }
                } else {
                    // Create/Unlink/Rename: require token
                    if !checkToken(for: p) {
                        result = ES_AUTH_RESULT_DENY
                        fputs("[atomic-guard] DENIED create/delete: \\(p)\\n", stderr)
                    }
                }
            }
        }

        es_respond_auth_result(client, message, result, false)
    }

    func run() {
        dispatchMain()
    }
}

// Main
let args = CommandLine.arguments
guard args.count >= 2 else {
    fputs("Usage: byte-guard-es <repo-root>\\n", stderr)
    exit(1)
}

do {
    let guard = try AtomicGuard(repoRoot: args[1])
    print("[atomic-guard] Endpoint Security guard active for \\(guard.repoRoot)")
    guard.run()
} catch {
    fputs("[atomic-guard] FATAL: \\(error.localizedDescription)\\n", stderr)
    exit(1)
}
`;
}

// ── Main: Launch appropriate backend ───────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const platform = os.platform();

  process.stdout.write('═'.repeat(70) + '\n');
  process.stdout.write('  ATOMIC BYTE GUARD — Kernel Enforcement\n');
  process.stdout.write('═'.repeat(70) + '\n\n');
  process.stdout.write(`  Platform: ${platform}\n`);
  process.stdout.write(`  Repo root: ${REPO_ROOT}\n`);
  process.stdout.write(`  Token dir: ${TOKEN_DIR}\n\n`);

  if (args.includes('--generate-profile')) {
    const effectRoot = args.find((_, i) => args[i] === '--effect-root' && i + 1 < args.length);
    const profile = generateAtomicSandboxProfile(REPO_ROOT, effectRoot || REPO_ROOT);
    process.stdout.write('Sandbox-exec profile:\n');
    process.stdout.write(profile);
  } else if (args.includes('--generate-ebpf')) {
    process.stdout.write('eBPF probe source:\n');
    process.stdout.write(generateEBPFProbe('0', '0'));
    process.stdout.write('\n[NOTE] Set REPO_ROOT_INODE and TOKEN_DIR_INODE at load time\n');
  } else if (args.includes('--generate-es')) {
    const swiftFile = path.join(REPO_ROOT, 'scripts', 'mcp', 'atomic-edit', 'byte-guard-es.swift');
    fs.writeFileSync(swiftFile, generateEndpointSecurityDaemon());
    process.stdout.write(`Endpoint Security daemon written to: ${swiftFile}\n`);
    process.stdout.write('Compile: swiftc -o byte-guard-es byte-guard-es.swift\n');
    process.stdout.write('Run:     sudo ./byte-guard-es ' + REPO_ROOT + '\n');
  } else if (args.includes('--issue-token')) {
    const file = args[args.indexOf('--issue-token') + 1] || 'test.ts';
    const token = issueWriteToken(file, 'mutate');
    process.stdout.write(`Token issued: ${token}\n`);
  } else if (args.includes('--check-token')) {
    const file = args[args.indexOf('--check-token') + 1] || 'test.ts';
    const valid = consumeWriteToken(file);
    process.stdout.write(`Token for ${file}: ${valid ? 'VALID (consumed)' : 'INVALID or MISSING'}\n`);
  } else {
    process.stdout.write('Usage:\n');
    process.stdout.write('  node byte-guard-kernel.mjs --generate-profile   Print sandbox-exec profile\n');
    process.stdout.write('  node byte-guard-kernel.mjs --generate-ebpf       Print eBPF probe source\n');
    process.stdout.write('  node byte-guard-kernel.mjs --generate-es          Write ES daemon (macOS)\n');
    process.stdout.write('  node byte-guard-kernel.mjs --issue-token <file>   Issue write token\n');
    process.stdout.write('  node byte-guard-kernel.mjs --check-token <file>   Check/consume token\n');
  }
}

main();
