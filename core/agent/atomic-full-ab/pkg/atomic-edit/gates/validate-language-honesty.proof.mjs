/**
 * validate-language-honesty.proof.mjs -- proves engine.validate() no longer false-greens
 * on languages with a real grammar. HTML/CSS/SQL edits that introduce a syntax error are
 * CAUGHT (ok:false) via the in-process web-tree-sitter grammar -- not the apostrophe-unsafe
 * structural balance, not a JS-grammar lie -- valid edits pass, and the verdict carries the
 * real language label. Run: node gates/validate-language-honesty.proof.mjs
 */
import { validate } from '../dist/engine.js';
import { prewarmGrammars } from '../dist/native-bridge.js';
import { validateLanguage } from '../dist/lang-bridge.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => { if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', name); } };

await prewarmGrammars(['css', 'html', 'sql']);

// HTML -- the headline false-green: a broken edit must be CAUGHT, not generic ok:true.
const hOk = validate('x.html', '<div><p>a</p></div>', '<div><p>b</p></div>');
check('html valid edit passes (real grammar)', hOk.language === 'html' && hOk.ok === true);
const hBad = validate('x.html', '<div></div>', '<div><p></div');
check('html broken edit CAUGHT (no false-green)', hBad.language === 'html' && hBad.ok === false);
// An apostrophe in text is VALID html -- proves the real grammar, not the structural balance
// (which would false-flag the lone apostrophe as an unterminated string and block the edit).
const hApos = validate('x.html', '<p>x</p>', "<p>don't stop</p>");
check('html apostrophe stays valid (real grammar, not structural FP)', hApos.language === 'html' && hApos.ok === true);

// CSS
const cBad = validate('x.css', '.a{color:red}', '.a{color:red');
check('css broken edit CAUGHT', cBad.language === 'css' && cBad.ok === false);
const cOk = validate('x.css', '.a{color:red}', '.a{color:blue}');
check('css valid edit passes', cOk.language === 'css' && cOk.ok === true);

// SQL
const sBad = validate('x.sql', 'SELECT a FROM t;', 'SELECT FROM WHERE );');
check('sql broken edit CAUGHT', sBad.language === 'sql' && sBad.ok === false);
const sOk = validate('x.sql', 'SELECT a FROM t;', 'SELECT b FROM t;');
check('sql valid edit passes', sOk.language === 'sql' && sOk.ok === true);

// lang-bridge no longer parses CSS/SQL with the JavaScript grammar claiming realParser:true.
const lc = validateLanguage('x.css', '.a{color:red}');
check('lang-bridge does NOT claim a JS-grammar real parse for CSS', !(lc.realParser === true && lc.language === 'javascript'));
const ls = validateLanguage('x.sql', 'SELECT 1;');
check('lang-bridge does NOT claim a JS-grammar real parse for SQL', !(ls.realParser === true && ls.language === 'javascript'));

console.log(`\nVALIDATE-LANGUAGE-HONESTY ${pass}/${pass + fail}`);
if (fail) process.exit(1);
