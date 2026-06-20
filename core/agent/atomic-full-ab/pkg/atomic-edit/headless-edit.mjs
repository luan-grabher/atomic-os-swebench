#!/usr/bin/env node
/**
 * headless-edit.mjs — single governed edit of ONE file, no persistent MCP stdio session.
 *
 * WHY THIS EXISTS (and why not atomic-headless-apply.mjs / atomic-call.mjs):
 *   - atomic-call.mjs spawns the full dist/server.js stdio MCP and keeps it alive — too heavy and
 *     too stateful for a one-shot `node headless-edit.mjs ...` invocation inside a Modal sandbox.
 *   - atomic-headless-apply.mjs is bound to atomic's OWN self-build lattice (SELF_DIR =
 *     REPO_ROOT/scripts/mcp/atomic-edit, runs build.mjs + proof lattice on atomic's own repo). That
 *     path does not exist in this layout and is the wrong governance for an arbitrary /testbed/*.py.
 *
 * WHAT THIS DOES (reuses the REAL engine — governance is NOT reimplemented):
 *   1. replaceText(file, before, oldText, newText)  ← dist/engine.js: unique verbatim match (refuses
 *      ambiguity) + real-parser syntax validation. For .py this writes the candidate to a temp file
 *      and runs `python3 -c "ast.parse(...)"` — a full CPython parse. A syntax regression is REFUSED.
 *   2. requireNegativeProofForRemovedBytes(...)      ← dist/server-helpers-negative-proof.js: the
 *      inverted-byte-default teeth. If the edit removes bytes (multiset diff > 0) it REQUIRES a
 *      proofOfIncorrectness (>=20 chars). No proof on a byte-removing edit ⇒ REFUSED. This is the
 *      SAME primitive the MCP atomic_replace_text handler calls (server-tools-a.js).
 *   3. atomic write to the real absolute path (fs.writeFileSync; the headless path trusts the
 *      caller-supplied absolute /testbed target rather than going through resolveSafeTarget's
 *      repo-root jail, because the agent edits files outside atomic's own tree).
 *
 * Usage (args, no flags needed):
 *   node headless-edit.mjs <file> <oldTextPath> <newTextPath> [proofTextPath]
 * where oldText/newText/proof are read from FILES (avoids shell-quoting hell with multi-line code).
 * Alternatively pass a single JSON spec on stdin:
 *   echo '{"file":"...","oldText":"...","newText":"...","proofOfIncorrectness":"..."}' | node headless-edit.mjs --stdin
 *
 * Exit codes: 0 = ADMITTED (written), 1 = REFUSED (governance/ambiguity/not-found), 2 = SYNTAX_REGRESSION.
 * stdout is always a single-line JSON verdict.
 */
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, 'dist');

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

async function loadEngine() {
  const engine = await import(path.join(DIST, 'engine.js'));
  const neg = await import(path.join(DIST, 'server-helpers-negative-proof.js'));
  return { replaceText: engine.replaceText, requireNegativeProofForRemovedBytes: neg.requireNegativeProofForRemovedBytes };
}

function readSpec() {
  if (process.argv.includes('--stdin')) {
    const raw = fs.readFileSync(0, 'utf8');
    return JSON.parse(raw);
  }
  const [file, oldTextPath, newTextPath, proofTextPath] = process.argv.slice(2);
  if (!file || !oldTextPath || !newTextPath) {
    emit({ ok: false, reason: 'USAGE', error: 'usage: headless-edit.mjs <file> <oldTextPath> <newTextPath> [proofTextPath]  (or --stdin)' });
    process.exit(1);
  }
  return {
    file,
    oldText: fs.readFileSync(oldTextPath, 'utf8'),
    newText: fs.readFileSync(newTextPath, 'utf8'),
    proofOfIncorrectness: proofTextPath ? fs.readFileSync(proofTextPath, 'utf8') : undefined,
  };
}

async function main() {
  let spec;
  try { spec = readSpec(); }
  catch (e) { emit({ ok: false, reason: 'SPEC', error: String(e?.message ?? e) }); process.exit(1); }

  const { file, oldText, newText } = spec;
  const proofOfIncorrectness = spec.proofOfIncorrectness;

  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    emit({ ok: false, reason: 'NOT_FOUND', error: `target file does not exist: ${file}` });
    process.exit(1);
  }
  const before = fs.readFileSync(file, 'utf8');

  const { replaceText, requireNegativeProofForRemovedBytes } = await loadEngine();

  let r;
  try {
    // REAL engine: unique verbatim match (refuses ambiguity / not-found) + syntax validation.
    r = replaceText(file, before, oldText, newText);
  } catch (e) {
    emit({ ok: false, reason: 'MATCH', error: String(e?.message ?? e) });
    process.exit(1);
  }

  const v = r.validation;
  if (!v.ok) {
    // Real CPython ast.parse said the result is broken — refuse, file untouched.
    emit({ ok: false, reason: 'SYNTAX_REGRESSION', file, language: v.language, syntaxBefore: v.before, syntaxAfter: v.after, introduced: v.introduced ?? null });
    process.exit(2);
  }

  let negProof;
  try {
    // REAL governance: inverted-byte-default. Byte-removing edits need a >=20-char proofOfIncorrectness.
    negProof = requireNegativeProofForRemovedBytes({
      action: 'headless_str_replace',
      target: file,
      targetUnit: 'file',
      before,
      after: r.newText,
      proofOfIncorrectness,
      preview: false,
    });
  } catch (e) {
    emit({ ok: false, reason: 'NEGATIVE_BYTES_NO_PROOF', file, error: String(e?.message ?? e) });
    process.exit(1);
  }

  fs.writeFileSync(file, r.newText);
  emit({
    ok: true,
    file,
    language: v.language,
    syntaxBefore: v.before,
    syntaxAfter: v.after,
    changedChars: r.changedChars,
    negativeBytesAdmitted: negProof
      ? { verdict: negProof.verdict, removedByteCount: negProof.removedByteCount, proofLength: negProof.proofLength, witnessKind: negProof.witnessKind }
      : null,
  });
  process.exit(0);
}

main();
