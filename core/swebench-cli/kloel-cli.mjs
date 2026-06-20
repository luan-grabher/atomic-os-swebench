#!/usr/bin/env node
// kloel-cli.mjs — bootstrap for the agentic Kloel CLI.
// The real source is TypeScript (kloel-cli.ts); Node runs it with native type-stripping. Kept as a
// .mjs entry so every existing reference (Dockerfile, predictions generators, install-kloel.sh) keeps
// working unchanged, while the source stays proper, type-checkable TS. (Was: TS-in-.mjs => parse error.)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
const ts = path.join(path.dirname(fileURLToPath(import.meta.url)), 'kloel-cli.ts');
const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', ts, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
