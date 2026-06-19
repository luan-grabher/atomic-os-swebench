// dev-validation-runner.proof.mjs — adversarial gate for the dev-validation exec admission.
// PROVES (positive): package-runner-fronted LOCAL dev/validation tools (tsc/jest/vitest/eslint...)
// are ADMITTED (externalEffectReason === null) — safe because the exec sandbox denies network.
// PROVES (discriminating): non-allowlisted runners (npx cowsay) AND genuine external commands
// (curl, npm install, git push) are STILL refused. A blanket allow would fail #2/#3.
import { devValidationRunner, externalEffectReason } from '../dist/server-tools-exec.js';

const json = process.argv.includes('--json');
let failures = 0;
function check(name, cond) {
  const ok = !!cond;
  if (!ok) failures += 1;
  if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

// 1. POSITIVE — dev-validation runners admitted
check('npx tsc admitted', devValidationRunner('npx tsc --noEmit') && externalEffectReason('npx tsc --noEmit') === null);
check('pnpm dlx vitest admitted', devValidationRunner('pnpm dlx vitest run') && externalEffectReason('pnpm dlx vitest run') === null);
check('yarn dlx eslint admitted', devValidationRunner('yarn dlx eslint .') && externalEffectReason('yarn dlx eslint .') === null);
check('bunx jest admitted', devValidationRunner('bunx jest') && externalEffectReason('bunx jest') === null);
check('npx --no-install prettier (flag skipped)', devValidationRunner('npx --no-install prettier --check .'));
check('npx -p typescript tsc (value-flag skipped)', devValidationRunner('npx -p typescript tsc -v'));

// 2. DISCRIMINATING — non-allowlisted package runner STILL refused
check('npx cowsay still refused', !devValidationRunner('npx cowsay hi') && externalEffectReason('npx cowsay hi') !== null);
check('npx create-react-app still refused', !devValidationRunner('npx create-react-app app') && externalEffectReason('npx create-react-app app') !== null);

// 3. DISCRIMINATING — genuine external commands STILL refused
check('curl still refused', externalEffectReason('curl https://example.com') !== null);
check('npm install still refused', externalEffectReason('npm install left-pad') !== null);
check('git push still refused', externalEffectReason('git push origin main') !== null);

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'dev-validation-runner' }));
} else {
  console.log(failures === 0 ? '\nOK — dev-validation-runner proof (0 failures)' : `\nFAIL — dev-validation-runner proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);
