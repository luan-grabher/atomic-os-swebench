/**
 * network-proxy.mjs — Tier-C network proxy for atomic_exec.
 * ESM module, imported by atomic-exec-broker.mjs when ATOMIC_NETWORK_MODE is set.
 *
 * Modes:
 *   record    — transparent proxy, captures all HTTP traffic
 *   replay    — deterministic mock, returns recorded responses
 *   passthrough — no interception (default)
 */
import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export function exchangeId(req) {
  const h = crypto.createHash('sha256');
  h.update(`${req.method}:${req.url}`);
  if (req.body) h.update(`:${req.body}`);
  return h.digest('hex').slice(0, 16);
}

function filterHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    if (typeof v === 'string') out[k] = v;
    else out[k] = v.join(', ');
  }
  return out;
}

export async function startNetworkProxy({ mode, storageDir }) {
  const recordings = new Map();
  let replayData = new Map();

  if (mode === 'replay') {
    if (fs.existsSync(storageDir)) {
      for (const f of fs.readdirSync(storageDir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(storageDir, f), 'utf8'));
          replayData.set(data.id, data);
        } catch { /* skip corrupt */ }
      }
    }
    if (replayData.size === 0) throw new Error(`No recordings in ${storageDir}`);
  }

  const server = http.createServer((clientReq, clientRes) => {
    const chunks = [];
    clientReq.on('data', (c) => chunks.push(c));
    clientReq.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8') || undefined;
      const url = clientReq.url ?? '/';
      const method = clientReq.method ?? 'GET';
      const headers = filterHeaders(clientReq.headers);

      if (mode === 'replay') {
        const id = exchangeId({ method, url, body });
        const rec = replayData.get(id);
        if (rec) {
          clientRes.writeHead(rec.response.statusCode, rec.response.headers);
          clientRes.end(rec.response.body ?? '');
        } else {
          clientRes.writeHead(404);
          clientRes.end(JSON.stringify({ error: 'no_recorded_response', id }));
        }
        return;
      }

      // record or passthrough
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;
      const opts = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers: { ...headers, host: parsed.hostname },
        rejectUnauthorized: false,
      };

      const startTime = Date.now();
      const resChunks = [];
      const proxyReq = transport.request(opts, (proxyRes) => {
        proxyRes.on('data', (c) => resChunks.push(c));
        proxyRes.on('end', () => {
          const resBody = Buffer.concat(resChunks).toString('utf8');
          if (mode === 'record') {
            const exchange = {
              id: exchangeId({ method, url, body }),
              timestamp: Date.now(),
              request: { method, url, headers, body },
              response: {
                statusCode: proxyRes.statusCode ?? 200,
                headers: filterHeaders(proxyRes.headers),
                body: resBody.slice(0, 100000),
              },
              durationMs: Date.now() - startTime,
            };
            recordings.set(exchange.id, exchange);
          }
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
    });
  });

  server.on('connect', (req, clientSocket, head) => {
    if (mode === 'replay') {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      clientSocket.end();
      return;
    }
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

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, recordings, mode, storageDir });
    });
    server.on('error', reject);
  });
}

export async function stopNetworkProxy(proxy) {
  return new Promise((resolve) => {
    proxy.server.close(() => resolve());
  });
}

export function saveProxyRecordings(proxy) {
  if (proxy.mode !== 'record') return 0;
  fs.mkdirSync(proxy.storageDir, { recursive: true });
  let count = 0;
  for (const [id, rec] of proxy.recordings) {
    fs.writeFileSync(path.join(proxy.storageDir, `${id}.json`), JSON.stringify(rec, null, 2));
    count++;
  }
  return count;
}
