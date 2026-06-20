/**
 * Tier-C Network Proxy — the honest-ceiling infrastructure for external effects.
 *
 * The atom's three-tier model (ATOMIC_FIELD.md):
 *   Tier A: bytes at rest (files) — byte-reversible, COVERED
 *   Tier B: shell/process effects — byte-effect transaction, COVERED
 *   Tier C: external irreversible effects — honest ceiling, LEDGER DISCIPLINE
 *
 * This module realizes Tier C for HTTP: intercepts outbound requests during
 * atomic_exec runs, records every request/response pair, and provides a
 * deterministic mock/replay mode. The key discipline:
 *   - RECORD mode: transparent proxy, captures all HTTP traffic
 *   - REPLAY mode: deterministic mock, returns recorded responses
 *   - PASSTHROUGH mode: no interception (production only)
 *
 * Integration: loaded by atomic-exec-broker.mjs when ATOMIC_NETWORK_MODE is set.
 * The broker's sandbox profile allows connections ONLY through this proxy.
 *
 * NOT a fake reversal. External effects that left the machine are append-only.
 * This proxy enables deterministic testing and honest recording — it cannot
 * un-send a POST that reached the target server.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecordedExchange {
  id: string;
  timestamp: number;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body?: string;
  };
  durationMs: number;
}

export type NetworkMode = 'record' | 'replay' | 'passthrough';

export interface NetworkProxyOptions {
  mode: NetworkMode;
  storageDir: string;
  port?: number;
  filterHosts?: string[];
}

// ── Storage ────────────────────────────────────────────────────────────────

function storagePath(dir: string, id: string): string {
  return path.join(dir, `${id}.json`);
}

function exchangeId(req: { method: string; url: string; body?: string }): string {
  const h = crypto.createHash('sha256');
  h.update(`${req.method}:${req.url}`);
  if (req.body) h.update(`:${req.body}`);
  return h.digest('hex').slice(0, 16);
}

// ── Proxy Server ───────────────────────────────────────────────────────────

export class NetworkProxy extends EventEmitter {
  readonly mode: NetworkMode;
  readonly storageDir: string;
  readonly port: number;
  readonly filterHosts: string[];
  private server: http.Server | null = null;
  private recordings: Map<string, RecordedExchange> = new Map();
  private replayData: Map<string, RecordedExchange> = new Map();

  constructor(options: NetworkProxyOptions) {
    super();
    this.mode = options.mode;
    this.storageDir = options.storageDir;
    this.port = options.port ?? 0;
    this.filterHosts = options.filterHosts ?? [];
  }

  /** Load previously recorded exchanges for replay mode. */
  async loadReplayData(): Promise<number> {
    if (!fs.existsSync(this.storageDir)) return 0;
    const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data: RecordedExchange = JSON.parse(
          fs.readFileSync(path.join(this.storageDir, file), 'utf8')
        );
        this.replayData.set(data.id, data);
      } catch { /* skip corrupt */ }
    }
    return this.replayData.size;
  }

  /** Start the proxy server. Returns the bound port. */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((clientReq, clientRes) => {
        this.handleRequest(clientReq, clientRes);
      });

      // Handle CONNECT for HTTPS tunneling (replay mode only returns recorded)
      this.server.on('connect', (req, clientSocket, head) => {
        if (this.mode === 'replay') {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          // In replay mode, we don't actually connect
          clientSocket.end();
          return;
        }
        // Passthrough: tunnel the connection
        const [host, portStr] = (req.url ?? '').split(':');
        const port = parseInt(portStr, 10) || 443;
        const serverSocket = net.connect(port, host, () => {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          serverSocket.write(head);
          serverSocket.pipe(clientSocket);
          clientSocket.pipe(serverSocket);
        });
        serverSocket.on('error', () => clientSocket.end());
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        const addr = this.server!.address() as net.AddressInfo;
        resolve(addr.port);
      });
      this.server.on('error', reject);
    });
  }

  /** Stop the proxy server. */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /** Get all recordings from this session. */
  getRecordings(): RecordedExchange[] {
    return Array.from(this.recordings.values());
  }

  /** Export recordings to storage. */
  saveRecordings(): number {
    fs.mkdirSync(this.storageDir, { recursive: true });
    let count = 0;
    for (const [id, rec] of this.recordings) {
      fs.writeFileSync(storagePath(this.storageDir, id), JSON.stringify(rec, null, 2));
      count++;
    }
    return count;
  }

  /** Get the proxy URL for use in HTTP clients. */
  get proxyUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  // ── Request Handler ────────────────────────────────────────────────────

  private handleRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
    const chunks: Buffer[] = [];
    clientReq.on('data', (chunk: Buffer) => chunks.push(chunk));
    clientReq.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8') || undefined;
      const url = clientReq.url ?? '/';
      const method = clientReq.method ?? 'GET';
      const headers = this.filterHeaders(clientReq.headers);

      if (this.mode === 'replay') {
        this.handleReplay(method, url, body, headers, clientRes);
      } else if (this.mode === 'record') {
        this.handleRecord(method, url, body, headers, clientRes);
      } else {
        this.handlePassthrough(method, url, body, headers, clientRes);
      }
    });
  }

  private handlePassthrough(
    method: string, url: string, body: string | undefined,
    headers: Record<string, string>, clientRes: http.ServerResponse,
  ): void {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { ...headers, host: parsed.hostname },
      rejectUnauthorized: false,
    };

    const proxyReq = transport.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(clientRes);
    });
    proxyReq.on('error', (err) => {
      clientRes.writeHead(502);
      clientRes.end(`Proxy error: ${err.message}`);
    });
    if (body) proxyReq.write(body);
    proxyReq.end();
  }

  private handleRecord(
    method: string, url: string, body: string | undefined,
    headers: Record<string, string>, clientRes: http.ServerResponse,
  ): void {
    const startTime = Date.now();
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { ...headers, host: parsed.hostname },
      rejectUnauthorized: false,
    };

    const resChunks: Buffer[] = [];
    const proxyReq = transport.request(options, (proxyRes) => {
      proxyRes.on('data', (chunk: Buffer) => resChunks.push(chunk));
      proxyRes.on('end', () => {
        const resBody = Buffer.concat(resChunks).toString('utf8');
        const exchange: RecordedExchange = {
          id: exchangeId({ method, url, body }),
          timestamp: Date.now(),
          request: { method, url, headers, body },
          response: {
            statusCode: proxyRes.statusCode ?? 200,
            headers: this.filterHeaders(proxyRes.headers),
            body: resBody.slice(0, 100000), // cap at 100KB
          },
          durationMs: Date.now() - startTime,
        };
        this.recordings.set(exchange.id, exchange);
        this.emit('recorded', exchange);

        clientRes.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        clientRes.end(resBody);
      });
    });
    proxyReq.on('error', (err) => {
      clientRes.writeHead(502);
      clientRes.end(`Proxy error: ${err.message}`);
    });
    if (body) proxyReq.write(body);
    proxyReq.end();
  }

  private handleReplay(
    method: string, url: string, body: string | undefined,
    headers: Record<string, string>, clientRes: http.ServerResponse,
  ): void {
    const id = exchangeId({ method, url, body });
    const recorded = this.replayData.get(id);
    if (recorded) {
      clientRes.writeHead(recorded.response.statusCode, recorded.response.headers);
      clientRes.end(recorded.response.body ?? '');
      this.emit('replayed', recorded);
    } else {
      clientRes.writeHead(404);
      clientRes.end(JSON.stringify({
        error: 'no_recorded_response',
        id,
        hint: `No recording found for ${method} ${url}. Record first with mode=record.`,
      }));
      this.emit('replay_miss', { method, url, body });
    }
  }

  private filterHeaders(h: Record<string, string | string[] | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h)) {
      if (v === undefined) continue;
      if (typeof v === 'string') out[k] = v;
      else out[k] = v.join(', ');
    }
    return out;
  }
}

/**
 * Convenience: create and start a proxy for recording or replay.
 * Returns the proxy instance (already listening).
 */
export async function startNetworkProxy(
  mode: NetworkMode,
  storageDir: string,
): Promise<NetworkProxy> {
  const proxy = new NetworkProxy({ mode, storageDir });
  if (mode === 'replay') {
    const count = await proxy.loadReplayData();
    if (count === 0) {
      throw new Error(`No recordings found in ${storageDir}. Record first with mode=record.`);
    }
  }
  const port = await proxy.start();
  // Set env var so the child process can use it
  process.env.ATOMIC_NETWORK_PROXY = proxy.proxyUrl;
  process.env.HTTP_PROXY = proxy.proxyUrl;
  process.env.HTTPS_PROXY = proxy.proxyUrl;
  return proxy;
}
