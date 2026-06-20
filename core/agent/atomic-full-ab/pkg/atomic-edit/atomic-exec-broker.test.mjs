import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BROKER = path.join(HERE, 'atomic-exec-broker.mjs');
const BROKER_CLIENT = path.join(HERE, 'atomic-exec-broker-client.mjs');

function shouldUseFileEndpoint() {
  const configuredEndpoint = process.env.ATOMIC_EXEC_BROKER_SOCKET || '';
  return process.env.ATOMIC_HOST_ATOMIC_ONLY === '1' || configuredEndpoint.startsWith('file://');
}

function endpointForRepo(repo) {
  if (shouldUseFileEndpoint()) return 'file://' + path.join(repo, 'broker-rpc');
  return path.join(repo, 'broker.sock');
}

function brokerRequest(endpoint, request) {
  return new Promise((resolve) => {
    const client = spawn(process.execPath, [BROKER_CLIENT, endpoint], {
      cwd: HERE,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeoutMs = Math.max(1000, Number(request.timeoutMs || 120000) + 10000);
    const finish = (reply) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(reply);
    };
    const timer = setTimeout(() => {
      try { client.kill('SIGKILL'); } catch {}
      finish({ ok: false, brokerUnreachable: true, error: 'broker client timed out', stderr });
    }, timeoutMs);
    client.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    client.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    client.on('error', (error) => finish({ ok: false, brokerUnreachable: true, error: error.message, stderr }));
    client.on('close', (code, signal) => {
      if (settled) return;
      try {
        finish(JSON.parse(stdout));
      } catch (error) {
        finish({
          ok: false,
          brokerUnreachable: code !== 0,
          error: error instanceof Error ? error.message : String(error),
          code,
          signal,
          stdout,
          stderr,
        });
      }
    });
    client.stdin.end(JSON.stringify(request));
  });
}

function brokerExec(endpoint, command, opts = {}) {
  return brokerRequest(endpoint, { command, ...opts });
}

async function waitForBrokerReady(broker) {
  await new Promise((resolve, reject) => {
    let stderr = '';
    const cleanup = () => {
      clearTimeout(timeout);
      broker.stdout.removeListener('data', onStdout);
      broker.stderr.removeListener('data', onStderr);
      broker.removeListener('error', onError);
      broker.removeListener('exit', onExit);
    };
    const onStdout = (chunk) => {
      if (chunk.toString().includes('ATOMIC_BROKER_READY')) {
        cleanup();
        resolve();
      }
    };
    const onStderr = (chunk) => { stderr += chunk.toString(); };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code, signal) => {
      cleanup();
      reject(new Error(`Broker exited before ready: code=${code} signal=${signal} stderr=${stderr.slice(0, 1000)}`));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Broker start timeout: stderr=${stderr.slice(0, 1000)}`));
    }, 10000);
    broker.stdout.on('data', onStdout);
    broker.stderr.on('data', onStderr);
    broker.on('error', onError);
    broker.on('exit', onExit);
  });
}

export async function runBrokerHarness({ report = false } = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'aeb-'));
  const endpoint = endpointForRepo(repo);
  const broker = spawn(process.execPath, [BROKER, endpoint, '--no-sandbox'], {
    cwd: repo,
    env: { ...process.env, ATOMIC_EXEC_BROKER_ROOT: repo, ATOMIC_EXEC_BROKER_SOCKET: endpoint },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const failures = [];
  const checks = [];
  const check = (name, condition, detail = {}) => {
    checks.push({ name, ok: Boolean(condition), detail });
    if (!condition) failures.push({ name, detail });
  };

  try {
    await waitForBrokerReady(broker);
    check('broker started', broker.exitCode === null, { exitCode: broker.exitCode, endpoint });

    const echo = await brokerExec(endpoint, 'echo hello');
    check('echo has output', echo.ok === true && String(echo.stdout || '').includes('hello'), echo);

    const exit42 = await brokerExec(endpoint, 'exit 42');
    check('exit 42 code honored', exit42.ok === false && exit42.exitCode === 42, exit42);

    const gitRestore = await brokerExec(endpoint, 'git restore .');
    check('git restore refused', gitRestore.ok === false && /invariant denial/.test(String(gitRestore.error || '')), gitRestore);

    const prismaPush = await brokerExec(endpoint, 'prisma db push');
    check('prisma push refused', prismaPush.ok === false && /invariant denial/.test(String(prismaPush.error || '')), prismaPush);

    const hookBypassCommand = 'git commit --no-' + 'verify -m x';
    const hookBypass = await brokerExec(endpoint, hookBypassCommand);
    check('hook bypass refused', hookBypass.ok === false && /invariant denial/.test(String(hookBypass.error || '')), hookBypass);

    const env = await brokerExec(endpoint, 'echo $TEST_VAR', { env: { TEST_VAR: 'kloel' } });
    check('env passed to child', env.ok === true && String(env.stdout || '').includes('kloel'), env);

    const timeout = await brokerExec(endpoint, 'sleep 5', { timeoutMs: 1000 });
    check(
      'timeout works',
      timeout.ok === false && (timeout.signal !== null || String(timeout.stderr || '').includes('timed out')),
      timeout,
    );
  } finally {
    try { broker.kill(); } catch {}
    try {
      fs.rmSync(repo, { recursive: true, force: true });
    } catch {}
  }

  const result = { passed: checks.filter((entry) => entry.ok).length, failed: failures.length, checks, failures };
  if (report) {
    for (const failure of failures) process.stderr.write(`  FAIL ${failure.name}: ${JSON.stringify(failure.detail)}\n`);
    process.stdout.write(`\natomic-exec-broker.test.mjs: ${result.passed} passed, ${result.failed} failed\n`);
  }
  return result;
}

const isVitest = Boolean(process.env.VITEST) || process.argv.some((arg) => path.basename(arg).includes('vitest'));

if (isVitest) {
  const { describe, expect, it } = await import('vitest');
  describe('atomic-exec-broker', () => {
    it('honors broker replies, denials, env, timeout, and endpoint mode', async () => {
      const result = await runBrokerHarness();
      expect(result.failures).toEqual([]);
    }, 20000);
  });
} else {
  const result = await runBrokerHarness({ report: true });
  process.exit(result.failed === 0 ? 0 : 1);
}