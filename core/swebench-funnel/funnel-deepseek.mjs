#!/usr/bin/env node
/**
 * funnel-deepseek.mjs — PARADIGM PART F.4 layer-2: the DeepSeek proposer for the universal truth funnel.
 *
 * Drives DeepSeek V4 Pro (a reasoning model: the answer is in `content`, the chain-of-thought in
 * `reasoning_content`) as the funnel's propose() — the brain the byte-positive funnel funnels toward correct.
 * Reads the key from the environment (DEEPSEEK_API_KEY); never hard-codes it. Bounded-concurrency pool,
 * retry-with-backoff on transient/rate-limit errors, and token/cost accounting so the 4-arm benchmark cost is
 * reported, not hidden.
 *
 * Pure transport: no benchmark logic here (the adapters supply prompts + verifiers).
 */
const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
// V4 Pro pricing (per 1M tokens), for cost accounting only.
const PRICE_IN = 0.435 / 1e6, PRICE_OUT = 0.87 / 1e6;

const stats = { calls: 0, promptTokens: 0, completionTokens: 0, retries: 0, failures: 0 };
export function costSoFar() {
  return {
    ...stats,
    usd: (stats.promptTokens * PRICE_IN + stats.completionTokens * PRICE_OUT),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One DeepSeek chat completion → the final answer `content` (reasoning_content is discarded). Retries on
 * 429/5xx/network with exponential backoff. Throws after maxRetries.
 */
export async function deepseekChat(messages, { maxTokens = 4096, temperature = 0.0, maxRetries = 5, timeoutMs = 180000 } = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY not set');
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) {
        // DRAIN the body — an unconsumed body keeps the undici connection pinned; after a few unread error
        // bodies the per-origin pool exhausts and ALL further fetches hang (the ~20-job ARC stall).
        try { await res.text(); } catch { /* */ }
        stats.retries += 1; lastErr = new Error(`HTTP ${res.status}`);
        await sleep(Math.min(2000 * 2 ** attempt, 30000)); continue;
      }
      if (!res.ok) { const body = await res.text().catch(() => ''); throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`); }
      const d = await res.json();
      const u = d.usage || {};
      stats.calls += 1; stats.promptTokens += u.prompt_tokens || 0; stats.completionTokens += u.completion_tokens || 0;
      return String(d.choices?.[0]?.message?.content ?? '');
    } catch (e) {
      clearTimeout(t);
      lastErr = e; stats.retries += 1;
      if (attempt < maxRetries) { await sleep(Math.min(2000 * 2 ** attempt, 30000)); continue; }
    }
  }
  stats.failures += 1;
  throw lastErr ?? new Error('deepseekChat failed');
}

/**
 * Bounded-concurrency map over items. DeepSeek allows up to 500 concurrent; default 48 is a safe aggressive
 * default. Returns results in input order; a per-item failure becomes {error} rather than aborting the batch.
 */
export async function pool(items, worker, concurrency = 48) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try { results[i] = await worker(items[i], i); }
      catch (e) { results[i] = { error: e instanceof Error ? e.message : String(e) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}
