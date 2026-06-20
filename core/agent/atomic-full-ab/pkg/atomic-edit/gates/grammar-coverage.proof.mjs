/**
 * grammar-coverage.proof.mjs -- proves the universal engine's grammar registry
 * covers the repo's real languages at the PERCEPTION layer: each registered
 * grammar LOADS, parses a valid fixture with ZERO ERROR nodes, exposes named
 * nodes via astNodes, AND honestly detects a broken fixture (no false-green).
 * Honest ceiling: an un-grammared language returns realParser:false, never a
 * fake pass. Run: node scripts/mcp/atomic-edit/gates/grammar-coverage.proof.mjs
 */
import { ensureReady, nativeAvailable, nativeLanguages, astNodes, validate } from '../dist/native-bridge.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', name); }
};

await ensureReady();
check('native engine available', nativeAvailable());
const langs = nativeLanguages();

// [lang, validFixture, rootType, brokenFixture]
const CASES = [
  ['css', '.a{color:red}\n#b > .c{margin:0 auto}', 'stylesheet', '.a{color:red'],
  ['html', '<!doctype html><div class="x"><p>hi</p></div>', 'document', '<div><p></div'],
  ['sql', 'SELECT id, name FROM users WHERE active = true;', 'program', 'SELECT FROM WHERE );'],
];

for (const [lang, ok, root, bad] of CASES) {
  check(`${lang}: registered in GRAMMARS`, langs.includes(lang));
  const nodes = await astNodes(ok, lang);
  check(`${lang}: astNodes returns nodes (grammar loaded)`, Array.isArray(nodes) && nodes.length > 0);
  check(`${lang}: root node '${root}' present`, Array.isArray(nodes) && nodes.some((n) => n.type === root));
  const v = await validate(ok, lang);
  check(`${lang}: valid fixture realParser+parsed+0err`, v.realParser === true && v.parsed === true && v.errorCount === 0);
  const vb = await validate(bad, lang);
  check(`${lang}: broken fixture honestly detected`, vb.realParser === true && vb.parsed === false && vb.errorCount > 0);
}

// Honest ceiling: a language with NO grammar must NOT be silently green.
const noGrammar = await validate('whatever code here', 'cobol');
check('no-grammar lang -> realParser:false (honest, not false-green)', noGrammar.realParser === false && noGrammar.parsed === false);

console.log(`\nGRAMMAR-COVERAGE ${pass}/${pass + fail}`);
if (fail) process.exit(1);
