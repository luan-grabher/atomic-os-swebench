// extract-to-variable.proof.mjs — adversarial gate for #7 extract-to-variable.
import { universalExtractToVariable } from '../dist/engine-universal.js';
const json = process.argv.includes('--json'); let failures = 0;
const check=(n,c)=>{const ok=!!c;if(!ok)failures++;if(!json)console.log(`  ${ok?'PASS':'FAIL'}  ${n}`);};
const throws=(fn)=>{try{fn();return false;}catch{return true;}};
let r=universalExtractToVariable('x.ts','const result = compute(a + b);\n','a + b','sum');
check('extract a+b->sum (valid, decl + inline replace)', r.validation.ok && r.newText.includes('const sum = a + b;') && r.newText.includes('compute(sum)'));
r=universalExtractToVariable('x.ts','  const y = foo(bar());\n','bar()','b');
check('preserves indent', r.validation.ok && r.newText.includes('  const b = bar();') && r.newText.includes('foo(b)'));
r=universalExtractToVariable('x.ts','const a = 1;\n','1','v','1','let');
check('keyword let honored', r.validation.ok && r.newText.includes('let v = 1;'));
check('ambiguous throws', throws(()=>universalExtractToVariable('x.ts','x;x;\n','x','v')));
check('bad varname throws', throws(()=>universalExtractToVariable('x.ts','const a=1;\n','1','9bad')));
if(json)console.log(JSON.stringify({ok:failures===0,failures,gate:'extract-to-variable'}));
else console.log(failures===0?'\nOK — extract-to-variable proof (0 failures)':`\nFAIL (${failures})`);
process.exit(failures===0?0:1);
