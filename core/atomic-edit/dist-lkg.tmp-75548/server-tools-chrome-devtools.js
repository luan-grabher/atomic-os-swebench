import { atomicSelfSourceRoot } from './server-helpers-self-expansion.js';
import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { URL, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { REPO_ROOT } from './guard.js';
import { fail, ok } from './server-helpers-result.js';
const TARGET_BROWSER_URLS = {
    primary: 'http://127.0.0.1:9222',
    live: 'http://127.0.0.1:9223',
    open: 'http://127.0.0.1:9333',
};
const DEFAULT_EXPERIMENTAL_ARGS = [
    '--experimentalPageIdRouting',
    '--experimentalDevtools',
    '--experimentalVision',
    '--experimentalStructuredContent',
    '--experimentalIncludeAllPages',
];
const sessions = new Map();
function timeoutMs(value) {
    if (!Number.isFinite(value))
        return 30_000;
    return Math.max(1_000, Math.min(120_000, Math.trunc(value ?? 30_000)));
}
function launcherPath() {
    return path.join(REPO_ROOT, 'scripts/mcp/chrome-devtools-open-mcp-launcher.sh');
}
function runtimeRoot() {
    const override = process.env.KLOEL_CHROME_DEVTOOLS_TMP?.trim();
    return override ? path.resolve(override) : path.join(REPO_ROOT, '.codex-artifacts/chrome-devtools-mcp');
}
function chromeBinary() {
    return process.env.CHROME_BIN?.trim() || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}
function cdpBrowserLauncherPath() {
    return path.join(REPO_ROOT, 'scripts/mcp/chrome-devtools-cdp-browser.sh');
}
export function resolveManagedBrowserUrl(options) {
    return resolveBrowserUrl({ ...options, mode: 'browserUrl' });
}
function cdpPortFor(browserUrl) {
    const url = new URL(browserUrl);
    if (!url.port)
        throw new Error(`chrome-devtools managed browserUrl has no explicit port: ${browserUrl}`);
    return url.port;
}
function browserVersionUrl(browserUrl) {
    return `${browserUrl.replace(/\/+$/, '')}/json/version`;
}
async function browserResponds(browserUrl) {
    try {
        const response = await fetch(browserVersionUrl(browserUrl));
        return response.ok;
    }
    catch {
        return false;
    }
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForBrowser(browserUrl, timeout) {
    const deadline = Date.now() + timeout;
    do {
        if (await browserResponds(browserUrl))
            return true;
        await delay(250);
    } while (Date.now() < deadline);
    return false;
}
function brokerClientPath() {
    return path.join(atomicSelfSourceRoot() ?? REPO_ROOT, 'atomic-exec-broker-client.mjs');
}
function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}
function managedLaunchMode() {
    return process.env.KLOEL_CHROME_DEVTOOLS_LAUNCH_MODE === 'open'
        ? 'auto'
        : process.env.KLOEL_CHROME_DEVTOOLS_LAUNCH_MODE ?? 'auto';
}
function cdpLaunchEnv(root, homeDir, runtimeDir, port) {
    return {
        ...process.env,
        CHROME_BIN: chromeBinary(),
        KLOEL_CHROME_DEVTOOLS_TMP: root,
        KLOEL_CHROME_DEVTOOLS_HOME: homeDir,
        KLOEL_CHROME_DEVTOOLS_RUNTIME: runtimeDir,
        KLOEL_CHROME_DEVTOOLS_PORTS: port,
        KLOEL_CHROME_DEVTOOLS_LAUNCH_MODE: managedLaunchMode(),
        TMPDIR: runtimeDir,
        TMP: runtimeDir,
        TEMP: runtimeDir,
    };
}
function brokerSocketPath() {
    const fromEnv = process.env.ATOMIC_EXEC_BROKER_SOCKET?.trim();
    if (fromEnv)
        return fromEnv;
    try {
        const state = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.atomic/codex-broker-current.json'), 'utf8'));
        if (typeof state.repoRoot === 'string' && path.resolve(state.repoRoot) !== REPO_ROOT)
            return null;
        if (typeof state.socket === 'string' && state.socket.trim())
            return state.socket;
    }
    catch {
        /* no broker state available */
    }
    return null;
}
function startCdpBrowserViaBroker(root, env, timeout) {
    const brokerSocket = brokerSocketPath();
    if (!brokerSocket)
        return null;
    // Respect the caller's budget: a small timeoutMs (e.g. a capability probe) must produce a SHORT,
    // blocking-bounded broker call so it fails fast instead of flooring at 5s+margin and being killed
    // mid-spawnSync (the unbounded-hang class). Larger budgets still get a full cold-launch window.
    const timeoutForStart = Math.min(Math.max(1_000, timeout), 30_000);
    const request = {
        command: `/bin/bash ${shellQuote(cdpBrowserLauncherPath())} start`,
        cwd: REPO_ROOT,
        effectRoot: root,
        timeoutMs: timeoutForStart,
        env,
        profile: 'chrome-devtools',
    };
    const result = spawnSync(process.execPath, [brokerClientPath(), brokerSocket], {
        cwd: REPO_ROOT,
        input: JSON.stringify(request),
        encoding: 'utf8',
        timeout: timeoutForStart + 2_000,
        maxBuffer: 8 * 1024 * 1024,
    });
    if (result.error) {
        return { exitCode: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.error.message };
    }
    let reply;
    try {
        reply = JSON.parse(result.stdout || '{}');
    }
    catch (error) {
        return {
            exitCode: result.status ?? 1,
            stdout: result.stdout ?? '',
            stderr: `${result.stderr ?? ''}\n${error instanceof Error ? error.message : String(error)}`.trim(),
        };
    }
    if (reply.brokerUnreachable)
        return null;
    const exitCode = typeof reply.exitCode === 'number' || reply.exitCode === null
        ? reply.exitCode
        : reply.ok === false
            ? 1
            : result.status;
    return {
        exitCode,
        stdout: String(reply.stdout ?? ''),
        stderr: String(reply.stderr ?? reply.error ?? ''),
    };
}
async function startCdpBrowser(browserUrl, timeout) {
    const root = runtimeRoot();
    const runtimeDir = path.join(root, 'runtime');
    const homeDir = path.join(root, 'home');
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(homeDir, { recursive: true, mode: 0o700 });
    const port = cdpPortFor(browserUrl);
    const launchEnv = cdpLaunchEnv(root, homeDir, runtimeDir, port);
    const brokerResult = startCdpBrowserViaBroker(root, launchEnv, timeout);
    let stdout = brokerResult?.stdout ?? '';
    let stderr = brokerResult?.stderr ?? '';
    let exitCode = brokerResult?.exitCode ?? null;
    if (!brokerResult) {
        const child = spawn('/bin/bash', [cdpBrowserLauncherPath(), 'start'], {
            cwd: REPO_ROOT,
            env: launchEnv,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        child.stdout?.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
        });
        child.stderr?.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });
        exitCode = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`chrome-devtools CDP start timed out for ${browserUrl}`));
            }, Math.min(Math.max(1_000, timeout), 30_000));
            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
            child.on('exit', (code) => {
                clearTimeout(timer);
                resolve(code);
            });
        });
    }
    if (exitCode !== 0 && !(await waitForBrowser(browserUrl, 2_000))) {
        const output = trimForReceipt(`${stdout}\n${stderr}`.trim(), 4_000);
        throw new Error(`chrome-devtools CDP start failed for ${browserUrl}: ${output}`);
    }
    if (!(await waitForBrowser(browserUrl, Math.min(timeout, 10_000)))) {
        throw new Error(`chrome-devtools CDP target did not answer ${browserVersionUrl(browserUrl)}`);
    }
}
async function ensureManagedBrowser(options) {
    const browserUrl = resolveManagedBrowserUrl(options);
    if (await browserResponds(browserUrl))
        return;
    await startCdpBrowser(browserUrl, timeoutMs(options.timeoutMs));
}
export function resolveBrowserUrl(options) {
    const raw = options.browserUrl?.trim();
    const candidate = raw || TARGET_BROWSER_URLS[options.target ?? 'primary'];
    let url;
    try {
        url = new URL(candidate);
    }
    catch {
        throw new Error(`chrome-devtools browserUrl refused by Atomic policy: invalid URL ${JSON.stringify(candidate)}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`chrome-devtools browserUrl refused by Atomic policy: unsupported protocol ${JSON.stringify(url.protocol)}`);
    }
    if (url.username || url.password) {
        throw new Error('chrome-devtools browserUrl refused by Atomic policy: credentials are not allowed');
    }
    if (!url.port) {
        throw new Error('chrome-devtools browserUrl refused by Atomic policy: explicit port is required');
    }
    const host = url.hostname.toLowerCase();
    const loopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
    if (!loopback) {
        throw new Error(`chrome-devtools browserUrl refused by Atomic policy: host must be loopback, got ${JSON.stringify(url.hostname)}`);
    }
    if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
        throw new Error('chrome-devtools browserUrl refused by Atomic policy: only a loopback origin is allowed');
    }
    return `${url.protocol}//${url.host}`;
}
function resolveMode(options) {
    if (options.mode)
        return options.mode;
    return options.browserUrl ? 'browserUrl' : 'managed';
}
export function normalizedExtraArgs(options) {
    return (options.extraArgs ?? []).map((arg) => {
        if (!arg.startsWith('--') || arg.includes('\0') || /[\r\n]/.test(arg)) {
            throw new Error(`chrome-devtools extra arg refused by Atomic policy: ${JSON.stringify(arg)}`);
        }
        return arg;
    });
}
function sessionKey(options) {
    const mode = resolveMode(options);
    return JSON.stringify({
        mode,
        target: options.target ?? 'primary',
        browserUrl: mode === 'browserUrl' ? resolveBrowserUrl(options) : null,
        extraArgs: normalizedExtraArgs(options),
    });
}
function buildChromeCommand(options) {
    const extraArgs = normalizedExtraArgs(options);
    const mode = resolveMode(options);
    const browserUrl = mode === 'browserUrl' ? resolveBrowserUrl(options) : resolveManagedBrowserUrl(options);
    return {
        command: '/bin/bash',
        args: [launcherPath(), `--browserUrl=${browserUrl}`, ...DEFAULT_EXPERIMENTAL_ARGS, ...extraArgs],
        mode,
        browserUrl,
    };
}
function writeJsonLine(child, message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
}
function trimForReceipt(value, maxChars = 12_000) {
    if (value.length <= maxChars)
        return value;
    return `${value.slice(0, maxChars)}\n...[truncated ${value.length - maxChars} chars]`;
}
function rememberStderr(session, chunk) {
    session.stderr = trimForReceipt(session.stderr + chunk.toString('utf8'), 24_000);
}
function rejectAll(session, reason) {
    for (const [id, pending] of session.pending) {
        clearTimeout(pending.timer);
        pending.reject(reason);
        session.pending.delete(id);
    }
}
function handleServerRequest(session, msg) {
    if (typeof msg.id !== 'number' || typeof msg.method !== 'string' || msg.result !== undefined || msg.error !== undefined) {
        return false;
    }
    if (msg.method === 'roots/list') {
        writeJsonLine(session.child, {
            jsonrpc: '2.0',
            id: msg.id,
            result: {
                roots: [
                    {
                        uri: pathToFileURL(REPO_ROOT).href,
                        name: path.basename(REPO_ROOT),
                    },
                ],
            },
        });
        return true;
    }
    writeJsonLine(session.child, {
        jsonrpc: '2.0',
        id: msg.id,
        error: {
            code: -32601,
            message: `Method not found: ${msg.method}`,
        },
    });
    return true;
}
function handleJsonLine(session, line) {
    if (!line.startsWith('{'))
        return;
    let msg;
    try {
        msg = JSON.parse(line);
    }
    catch {
        return;
    }
    if (handleServerRequest(session, msg))
        return;
    if (typeof msg.id !== 'number')
        return;
    const pending = session.pending.get(msg.id);
    if (!pending)
        return;
    clearTimeout(pending.timer);
    session.pending.delete(msg.id);
    if (msg.error) {
        pending.reject(new Error(JSON.stringify(msg.error)));
    }
    else {
        pending.resolve(msg.result);
    }
}
function sendRequest(session, method, params, timeout) {
    const id = session.nextId++;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            session.pending.delete(id);
            reject(new Error(`chrome-devtools MCP ${method} timed out; mode=${session.command.mode} stderr=${trimForReceipt(session.stderr, 4_000)}`));
        }, timeout);
        session.pending.set(id, { method, resolve, reject, timer });
        writeJsonLine(session.child, { jsonrpc: '2.0', id, method, params });
    });
}
function sendNotification(session, method, params) {
    writeJsonLine(session.child, { jsonrpc: '2.0', method, params });
}
function createSession(options) {
    const root = runtimeRoot();
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(root, 'runtime'), { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(root, 'home'), { recursive: true, mode: 0o700 });
    const key = sessionKey(options);
    const command = buildChromeCommand(options);
    const child = spawn(command.command, command.args, {
        cwd: REPO_ROOT,
        env: {
            ...process.env,
            KLOEL_CHROME_DEVTOOLS_TMP: root,
            KLOEL_CHROME_DEVTOOLS_HOME: path.join(root, 'home'),
            KLOEL_CHROME_DEVTOOLS_RUNTIME: path.join(root, 'runtime'),
            TMPDIR: path.join(root, 'runtime'),
            TMP: path.join(root, 'runtime'),
            TEMP: path.join(root, 'runtime'),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    const session = {
        key,
        child,
        command,
        nextId: 1,
        lineBuffer: '',
        stderr: '',
        pending: new Map(),
        initialized: Promise.resolve(),
    };
    sessions.set(key, session);
    child.stderr.on('data', (chunk) => rememberStderr(session, chunk));
    child.stdout.on('data', (chunk) => {
        session.lineBuffer += chunk.toString('utf8');
        for (;;) {
            const idx = session.lineBuffer.indexOf('\n');
            if (idx < 0)
                break;
            const line = session.lineBuffer.slice(0, idx).trim();
            session.lineBuffer = session.lineBuffer.slice(idx + 1);
            handleJsonLine(session, line);
        }
    });
    child.on('error', (error) => {
        sessions.delete(key);
        rejectAll(session, error instanceof Error ? error : new Error(String(error)));
    });
    child.on('exit', (code, signal) => {
        sessions.delete(key);
        rejectAll(session, new Error(`chrome-devtools MCP exited; mode=${command.mode} code=${code ?? 'null'} signal=${signal ?? 'null'} stderr=${trimForReceipt(session.stderr, 4_000)}`));
    });
    session.initialized = sendRequest(session, 'initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'atomic-chrome-devtools-bridge', version: '1.0.0' },
    }, 20_000).then(() => {
        sendNotification(session, 'notifications/initialized', {});
    });
    return session;
}
async function getSession(options) {
    const key = sessionKey(options);
    const existing = sessions.get(key);
    if (existing)
        return existing;
    // HARD budget on session setup so NO chrome tool can hang past its declared timeoutMs. Without
    // this, a host with no reachable browser cold-launches Chrome + the chrome-devtools-mcp handshake
    // for ~30-40s; a short-budget caller (capability probe like list_tools) was killed mid-flight — an
    // unbounded hang. Now it fails CLEAN within budget with an actionable message.
    const budget = timeoutMs(options.timeoutMs);
    let timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`chrome-devtools: session setup exceeded ${budget}ms — no reachable browser at the target. ` +
            'Start a browser (or pass browserUrl), or raise timeoutMs.')), budget);
    });
    const setup = (async () => {
        if (resolveMode(options) === 'managed')
            await ensureManagedBrowser(options);
        const session = createSession(options);
        await session.initialized;
        return session;
    })();
    try {
        return await Promise.race([setup, deadline]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
async function callChromeMcp(method, params, options) {
    const session = await getSession(options);
    return await sendRequest(session, method, params, timeoutMs(options.timeoutMs));
}
function closeSession(session) {
    sessions.delete(session.key);
    rejectAll(session, new Error('chrome-devtools MCP session reset'));
    try {
        session.child.stdin.end();
    }
    catch {
        // ignore close races
    }
    if (!session.child.killed)
        session.child.kill('SIGTERM');
}
function resetChromeSessions(options) {
    if (options.all) {
        const current = [...sessions.values()];
        for (const session of current)
            closeSession(session);
        return current.length;
    }
    const session = sessions.get(sessionKey(options));
    if (!session)
        return 0;
    closeSession(session);
    return 1;
}
const chromeBridgeSchema = {
    mode: z.enum(['managed', 'browserUrl']).optional(),
    target: z.enum(['primary', 'live', 'open']).optional(),
    browserUrl: z.string().optional(),
    extraArgs: z.array(z.string()).optional(),
    timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
};
function bridgeReceipt(options) {
    const mode = resolveMode(options);
    return {
        mode,
        target: options.target ?? 'primary',
        browserUrl: mode === 'browserUrl' ? resolveBrowserUrl(options) : resolveManagedBrowserUrl(options),
        sessionKey: sessionKey(options),
    };
}
function normalizeContentBlock(block) {
    if (!block || typeof block !== 'object') {
        return { type: 'text', text: typeof block === 'string' ? block : JSON.stringify(block ?? null) };
    }
    const b = block;
    switch (b.type) {
        case 'text':
            return { type: 'text', text: typeof b.text === 'string' ? b.text : JSON.stringify(b.text ?? '') };
        case 'image':
        case 'audio': {
            if (typeof b.data !== 'string')
                return { type: 'text', text: JSON.stringify(b) };
            const kind = b.type === 'image' ? 'image' : 'audio';
            const mimeType = typeof b.mimeType === 'string' && b.mimeType.length > 0
                ? b.mimeType
                : kind === 'image'
                    ? 'image/png'
                    : 'application/octet-stream';
            // Preserve any annotations/_meta the upstream block carried.
            return { ...b, type: kind, data: b.data, mimeType };
        }
        case 'resource':
        case 'resource_link':
            // Embedded / linked resources are valid MCP content — forward verbatim.
            return b;
        default:
            return { type: 'text', text: JSON.stringify(b) };
    }
}
/**
 * Convert a Chrome DevTools MCP tools/call result into an MCP CallToolResult
 * that preserves block types (text stays text, image stays image, …) instead of
 * flattening everything into JSON text. Pure and side-effect-free so the bridge
 * proof can assert it without a live browser.
 */
export function marshalChromeCallResult(result) {
    const r = (result && typeof result === 'object' ? result : {});
    const rawBlocks = Array.isArray(r.content) ? r.content : [];
    const content = rawBlocks.map(normalizeContentBlock);
    if (content.length === 0) {
        // structuredContent-only or non-standard result: emit a compact JSON text
        // block so the call is never silently empty.
        content.push({ type: 'text', text: JSON.stringify(r ?? {}, null, 2) });
    }
    const out = { content };
    if (r.structuredContent !== undefined) {
        out.structuredContent = r.structuredContent;
    }
    if (r.isError === true)
        out.isError = true;
    return out;
}
/**
 * Stop one or all Atomic-managed Chrome DevTools MCP sessions. Exported so the
 * bridge end-to-end proof can tear its managed browser down deterministically.
 */
export function chromeDevtoolsReset(options) {
    try {
        return ok({ closed: resetChromeSessions(options), activeSessions: sessions.size });
    }
    catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
    }
}
/**
 * Drive a Chrome DevTools MCP tool through the managed/browserUrl bridge and
 * return a faithfully-marshaled MCP result. Single source of truth for both the
 * registered `chrome_devtools_call` tool and the bridge end-to-end proof.
 */
export async function chromeDevtoolsCall(toolName, args, options) {
    try {
        const result = await callChromeMcp('tools/call', { name: toolName, arguments: args ?? {} }, options);
        return marshalChromeCallResult(result);
    }
    catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
    }
}
export function registerToolsChromeDevtools(server) {
    server.registerTool('chrome_devtools_list_tools', {
        title: 'Chrome DevTools MCP bridge: list tools',
        description: 'Lists tools from Chrome DevTools MCP through Atomic. Defaults to managed mode, where Chrome DevTools MCP launches isolated headless Chrome and keeps the MCP child process alive for subsequent calls.',
        inputSchema: chromeBridgeSchema,
    }, async (a) => {
        try {
            const result = await callChromeMcp('tools/list', {}, a);
            return ok({ ...bridgeReceipt(a), result });
        }
        catch (e) {
            return fail(e instanceof Error ? e.message : String(e));
        }
    });
    server.registerTool('chrome_devtools_call', {
        title: 'Chrome DevTools MCP bridge: call any tool',
        description: 'Calls any tool exposed by Chrome DevTools MCP through Atomic. toolName is the raw Chrome MCP tool name such as list_pages, new_page, navigate_page, take_snapshot, take_screenshot, evaluate_script, click, fill, or list_network_requests. Image results (e.g. take_screenshot) are forwarded as real MCP image content, not base64 text, and structuredContent is preserved.',
        inputSchema: {
            ...chromeBridgeSchema,
            toolName: z.string(),
            arguments: z.record(z.string(), z.unknown()).optional(),
        },
    }, async (a) => chromeDevtoolsCall(a.toolName, a.arguments, a));
    server.registerTool('chrome_devtools_reset', {
        title: 'Chrome DevTools MCP bridge: reset sessions',
        description: 'Stops one or all Atomic-managed Chrome DevTools MCP child sessions. Use when the browser process is wedged or you need a fresh isolated browser.',
        inputSchema: {
            ...chromeBridgeSchema,
            all: z.boolean().optional(),
        },
    }, async (a) => chromeDevtoolsReset(a));
}
