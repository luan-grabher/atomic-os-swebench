/**
 * advanced-language-guard.proof.mjs -- proves the ts-morph entrypoints in advanced.ts
 * REFUSE non-TS/JS files honestly ('only supports TS/JS') instead of crashing with a
 * confusing 'selector/class/identifier not found' from parsing e.g. CSS as TypeScript.
 * Run: node gates/advanced-language-guard.proof.mjs
 */
import { editSymbol, renameSymbolCrossFile, renameMemberCrossFile } from '../dist/advanced.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => { if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', name); } };

const refusesHonestly = async (fn) => {
  try { await fn(); return false; } catch (e) { return /only supports TS\/JS/.test(String((e && e.message) || e)); }
};

for (const ext of ['css', 'html', 'sql', 'sh']) {
  check(`editSymbol refuses .${ext} honestly`, await refusesHonestly(() => editSymbol(`x.${ext}`, 'x', 'sel', 'replace', 'y')));
  check(`renameSymbolCrossFile refuses .${ext} honestly`, await refusesHonestly(() => renameSymbolCrossFile(`/tmp/x.${ext}`, '/tmp', 1, 1, 'n')));
  check(`renameMemberCrossFile refuses .${ext} honestly`, await refusesHonestly(() => renameMemberCrossFile(`/tmp/x.${ext}`, '/tmp', 'C', 'm', 'n')));
}

// A .ts file must NOT be refused by the TS/JS guard (it may fail later for other reasons).
let tsGuardHit = false;
try {
  await editSymbol('x.ts', 'const a = 1;', 'no_such_selector', 'replace', 'const b = 2;');
} catch (e) {
  tsGuardHit = /only supports TS\/JS/.test(String((e && e.message) || e));
}
check('editSymbol does NOT refuse a .ts file (guard is TS/JS-aware)', tsGuardHit === false);

console.log(`\nADVANCED-LANGUAGE-GUARD ${pass}/${pass + fail}`);
if (fail) process.exit(1);
