/**
 * atomic-swarm core — shared substrate for the swarm surface.
 *
 * Doctrine (inherited from atomic-edit): every action leaves a receipt; every
 * receipt is hashable; secrets never reach a returned or persisted surface;
 * refusal is fail-closed and explicit. This module owns sha256, the
 * append-only ledger under .atomic/, and env-secret redaction.
 */
import crypto from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

export const REPO_ROOT = path.resolve(
  process.env.ATOMIC_SWARM_REPO_ROOT ?? process.env.CODEX_PROJECT_DIR ?? process.cwd(),
);

export function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

const SECRET_ENV_NAME = /TOKEN|SECRET|KEY|PASSWORD|CREDENTIAL|AUTH/i;

export function secretEnvValues(env = process.env) {
  const values = [];
  for (const [name, value] of Object.entries(env)) {
    if (!value || value.length < 8) continue;
    if (SECRET_ENV_NAME.test(name)) values.push(value);
  }
  return values;
}

export function redactSecrets(text, env = process.env) {
  let out = String(text ?? '');
  for (const value of secretEnvValues(env)) {
    out = out.split(value).join('[redacted:env-secret]');
  }
  return out;
}

export function ledgerPath(name) {
  return path.join(REPO_ROOT, '.atomic', name);
}

// Junk guard: a ledger line must carry MEANINGFUL, structured evidence — never the
// degenerate single-character spam (e.g. {"task":"W"}) that once flooded
// swarm-tasks-ledger.jsonl with ~666k lines. A legitimate record is a non-empty plain
// object with at least one substantive field (a string ≥2 chars, a number/boolean, or a
// nested object/array). Anything else is refused at this single chokepoint, so no caller
// — and no stray script routed through appendLedger — can ever write a junk line again.
function isMeaningfulLedgerEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  const keys = Object.keys(entry);
  if (keys.length === 0) return false;
  return keys.some((k) => {
    const v = entry[k];
    if (typeof v === 'string') return v.trim().length >= 2;
    if (typeof v === 'number' || typeof v === 'boolean') return true;
    return v !== null && typeof v === 'object';
  });
}

export function appendLedger(name, entry) {
  if (!isMeaningfulLedgerEntry(entry)) {
    throw refusal(
      `appendLedger refused: degenerate/junk entry rejected — a ledger line must carry ` +
      `structured evidence, not single-character noise. Got: ${JSON.stringify(entry).slice(0, 120)}`,
    );
  }
  const file = ledgerPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const record = { at: new Date().toISOString(), ...entry };
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
  return record;
}

export function refusal(message, extra = {}) {
  const error = new Error(message);
  error.swarmRefusal = true;
  Object.assign(error, extra);
  return error;
}
