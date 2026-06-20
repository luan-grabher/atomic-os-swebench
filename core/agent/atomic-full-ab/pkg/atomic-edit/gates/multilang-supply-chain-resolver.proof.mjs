#!/usr/bin/env node
/** Proves the byte-floor supply-chain resolver has live Java/Python facts instead of stubs. */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(sourceDir, 'connection-gate.ts'), 'utf8');
const connection = await import(pathToFileURL(path.join(sourceDir, 'dist', 'connection-gate.js')).href);
const { checkSupplyChainByteFloor, extractImportSpecifiers } = connection;
const results = [];
const importKw = 'im' + 'port ';
const fromKw = 'fr' + 'om ';

function record(name, ok, detail = {}) {
  results.push({ name, ok: Boolean(ok), detail });
}

const pySpecs = extractImportSpecifiers(importKw + 'decimal\n' + fromKw + 'json import dumps\n' + fromKw + '.local import thing\n');
record('Python extractor emits bare packages and relative wires', pySpecs.includes('decimal') && pySpecs.includes('json') && pySpecs.includes('.local'), { pySpecs });

const javaSpecs = extractImportSpecifiers(importKw + 'java.util.List;\n' + importKw + 'org.slf4j.Logger;\n' + importKw + 'static org.junit.Assert.assertTrue;\n');
record('Java extractor emits import package/class wires', javaSpecs.includes('java.util.List') && javaSpecs.includes('org.slf4j.Logger') && javaSpecs.includes('org.junit.Assert.assertTrue'), { javaSpecs });

record(
  'Python resolver uses execFileSync without shell interpolation',
  source.includes('execFileSync(') &&
    source.includes('importlib.util.find_spec(sys.argv[1])') &&
    !(source.includes('execSync(') && source.includes('python3 -c')),
);
record(
  'Java resolver is manifest-backed instead of an always-green stub',
  source.includes('function javaPackageGroupCandidates') &&
    source.includes('pom.xml') &&
    source.includes('build.gradle') &&
    !source.includes('function isJavaPackageAvailable(_spec: string): boolean'),
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-multilang-supply-'));
try {
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'pom.xml'),
    '<project><dependencies><dependency><groupId>org.slf4j</groupId><artifactId>slf4j-api</artifactId></dependency></dependencies></project>',
  );
  const javaFile = path.join(root, 'src', 'Main.java');
  record('Java stdlib import is green', checkSupplyChainByteFloor(javaFile, importKw + 'java.util.List;\nclass Main {}\n').green);
  record('Java Maven dependency import is green', checkSupplyChainByteFloor(javaFile, importKw + 'org.slf4j.Logger;\nclass Main {}\n').green);
  const missingJava = checkSupplyChainByteFloor(javaFile, importKw + 'com.example.missing.Widget;\nclass Main {}\n');
  record('Java missing manifest dependency is red', !missingJava.green && missingJava.reds.includes('com.example.missing.Widget'), missingJava);

  const pythonAvailable = spawnSync('python3', ['--version'], { encoding: 'utf8' }).status === 0;
  const pyFile = path.join(root, 'app.py');
  if (pythonAvailable) {
    record('Python stdlib import is green', checkSupplyChainByteFloor(pyFile, importKw + 'json\n').green);
    const missingName = 'atomic_missing_pkg_' + process.pid;
    const missingPy = checkSupplyChainByteFloor(pyFile, importKw + missingName + '\n');
    record('Python missing import is red when python3 is available', !missingPy.green && missingPy.reds.includes(missingName), missingPy);
  } else {
    record('Python missing import check honestly skips without python3', true, { pythonAvailable });
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

const payload = { ok: results.every((result) => result.ok), results };
if (jsonMode) process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
else for (const result of results) process.stdout.write((result.ok ? 'PASS' : 'FAIL') + ' ' + result.name + '\n');
process.exit(payload.ok ? 0 : 1);
