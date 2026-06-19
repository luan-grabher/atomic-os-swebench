#!/usr/bin/env node
/**
 * byte-floor-language-soundness.proof.mjs — PARADIGM L06/L14: the byte-floor is a LAW, not a TS shape.
 *
 * The Go bug (PW-1) proved the floor was secretly TS-shaped: it HARD-REFUSED `import "strings"` as a
 * "dangling dependency" because node_modules resolution is the wrong model for every non-JS language.
 * This gate proves the fix is COMPLETE across languages AND still SOUND for JS:
 *
 *   BF-<lang> — a valid stdlib/dep import in Go/Rust/Python/Java/C/C++ is NOT refused (no false positive).
 *   BF-JS-SOUND — a JS file importing a package that is NOT installed in node_modules IS still refused
 *                 (the guard is INTACT, not globally disabled — soundness, not mere permissiveness).
 *
 * Drives the real dist byte-floor (checkConnection/checkSupplyChainByteFloor). Pure, no spawn.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { checkConnectionByteFloor, checkSupplyChainByteFloor } from '../dist/connection-gate.js';

const jsonMode = process.argv.includes('--json');
let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-bf-lang-'));
const verdictRed = (absPath, content) => {
  const c = checkConnectionByteFloor(absPath, content);
  const s = checkSupplyChainByteFloor(absPath, content);
  return [...(c.reds || []), ...(s.reds || [])];
};

try {
  // Each: [lang, filename, valid-stdlib-import source that must NOT be refused]
  const cases = [
    ['go',     'main.go',   'package main\nimport "strings"\nfunc main() { _ = strings.ToUpper("x") }\n'],
    ['rust',   'main.rs',   'use std::collections::HashMap;\nfn main() { let _m: HashMap<i32,i32> = HashMap::new(); }\n'],
    ['python', 'm.py',      'import os\nimport sys\nprint(os.getcwd(), sys.argv)\n'],
    ['java',   'M.java',    'import java.util.List;\nclass M { List<String> x; }\n'],
    ['c',      'm.c',       '#include <stdio.h>\nint main(){ printf("x"); return 0; }\n'],
    ['cpp',    'm.cpp',     '#include <vector>\nint main(){ std::vector<int> v; return v.size(); }\n'],
  ];
  for (const [lang, fname, src] of cases) {
    const abs = path.join(work, fname);
    const reds = verdictRed(abs, src); // file does not exist on disk → every wire is "new" (worst case for false positives)
    check(`BF-${lang}: a valid stdlib import in ${lang} is NOT refused by the byte-floor (no false positive)`,
      reds.length === 0, { lang, reds });
  }

  // BF-JS-SOUND: the guard is still real for JS — a bare import to an UNINSTALLED package IS refused.
  const jsAbs = path.join(work, 'app.ts');
  const jsSrc = 'import { thing } from "totally-not-installed-pkg-xyz";\nexport const x = thing;\n';
  const jsReds = verdictRed(jsAbs, jsSrc);
  check('BF-JS-SOUND: a JS/TS import of an UNINSTALLED package IS still refused (guard intact, not disabled)',
    jsReds.length >= 1, { reds: jsReds });

  // ── L07-WIRED: Go supply-chain is now ENFORCED in the byte-floor, soundly ──────
  // With a go.mod present: stdlib (no dot) + declared deps = GREEN (never refused);
  // an undeclared external (dotted) module path = RED (a real dangling dependency).
  const goDir = path.join(work, 'goapp');
  fs.mkdirSync(goDir, { recursive: true });
  fs.writeFileSync(path.join(goDir, 'go.mod'), 'module example.com/app\n\nrequire github.com/pkg/errors v0.9.1\n');
  const goFile = path.join(goDir, 'main.go');
  const goReds = (src) => checkSupplyChainByteFloor(goFile, src).reds;
  check('BF-go-WIRED/stdlib: a Go stdlib import with a go.mod present is NOT refused (sound — dot heuristic)',
    goReds('package main\nimport "strings"\nfunc main(){ _ = strings.ToUpper("x") }\n').length === 0, {});
  check('BF-go-WIRED/declared: a go.mod-declared external dependency is NOT refused',
    goReds('package main\nimport "github.com/pkg/errors"\nfunc main(){ _ = errors.New("x") }\n').length === 0, {});
  const danglingReds = goReds('package main\nimport "github.com/evil/not-required"\nfunc main(){}\n');
  check('BF-go-WIRED/dangling: an UNDECLARED external Go module IS refused (real enforcement, RED-pre/GREEN-post)',
    danglingReds.includes('github.com/evil/not-required'), { danglingReds });
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
