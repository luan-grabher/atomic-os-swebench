import { isAtomicSelfExpansionPath } from '../server-helpers-self-expansion.js';
import * as path from 'node:path';

const repo = process.cwd();
const results: { name: string; expected: boolean; actual: boolean; pass: boolean }[] = [];

function check(name: string, expected: boolean, actual: boolean) {
  results.push({ name, expected, actual, pass: expected === actual });
}

check('.atomic/loop/ is NOT self-expansion', false,
  isAtomicSelfExpansionPath(repo, path.join(repo, '.atomic/loop/round-1/atomic/src/mathUtils.ts')));
check('loop-data/ is NOT self-expansion', false,
  isAtomicSelfExpansionPath(repo, path.join(repo, 'loop-data/round-1/atomic/src/mathUtils.ts')));
check('server source IS self-expansion', true,
  isAtomicSelfExpansionPath(repo, path.join(repo, 'server-helpers-self-expansion.ts')));
check('engine source IS self-expansion', true,
  isAtomicSelfExpansionPath(repo, path.join(repo, 'engine.ts')));
check('.smoke- is NOT self-expansion', false,
  isAtomicSelfExpansionPath(repo, path.join(repo, '.smoke-test.ts')));
check('dist/ is NOT self-expansion', false,
  isAtomicSelfExpansionPath(repo, path.join(repo, 'dist/server.js')));

const allPass = results.every(r => r.pass);
console.log(JSON.stringify({ allPass, results }, null, 2));
process.exit(allPass ? 0 : 1);
