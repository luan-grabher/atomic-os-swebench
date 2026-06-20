#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const semantic = '/Users/danielpenin/.codex/bin/semantic-edit';
const atomic = '/Users/danielpenin/.codex/bin/atomic-edit.mjs';

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (options.expectFailure) {
    if (result.status === 0) {
      throw new Error(`expected failure but command passed: ${command} ${args.join(' ')}`);
    }
    return result;
  }
  if (result.status !== 0) {
    throw new Error(
      [
        `command failed: ${command} ${args.join(' ')}`,
        `exit: ${result.status}`,
        result.stdout,
        result.stderr,
      ].join('\n'),
    );
  }
  return result;
}

function json(command, args, options) {
  return JSON.parse(run(command, args, options).stdout);
}

function posOf(text, needle) {
  const index = text.indexOf(needle);
  if (index === -1) throw new Error(`needle not found: ${needle}`);
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-atomic-smoke-'));

try {
  const service = path.join(root, 'service.ts');
  const replacement = path.join(root, 'helper-replacement.ts');
  fs.writeFileSync(
    service,
    [
      "import { A } from './a';",
      '',
      'export class Worker {',
      '  run(userId: string) {',
      "    const payload = { phone: '5511999999999', userId };",
      '    return payload.userId;',
      '  }',
      '}',
      '',
      'export function helper(x: number) {',
      '  return x * 2;',
      '}',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    replacement,
    ['export function helper(x: number) {', '  return x * 3;', '}', ''].join('\n'),
  );

  run('node', ['--check', '/Users/danielpenin/.codex/bin/semantic-edit.cjs']);
  run('node', ['--check', atomic]);

  const outline = json(semantic, ['outline', '--file', service]);
  assert(outline.symbols.some((symbol) => symbol.selector === 'Worker.run'), 'outline missed Worker.run');
  assert(outline.symbols.some((symbol) => symbol.selector === 'helper'), 'outline missed helper');

  const runSymbol = json(semantic, ['read-symbol', '--file', service, '--selector', 'Worker.run']);
  assert(runSymbol.text.includes('phone'), 'read-symbol did not return method body');

  const literalPreview = json(semantic, [
    'replace-literal',
    '--file',
    service,
    '--current',
    "'5511999999999'",
    '--new',
    'null',
    '--dry-run',
  ]);
  assert(literalPreview.changed === true && literalPreview.dryRun === true, 'replace-literal dry-run failed');
  json(semantic, ['replace-literal', '--file', service, '--current', "'5511999999999'", '--new', 'null']);

  const propertyPreview = json(semantic, [
    'replace-object-property-value',
    '--file',
    service,
    '--selector',
    'method:run',
    '--property',
    'phone',
    '--value',
    "'updated'",
    '--dry-run',
  ]);
  assert(propertyPreview.changed === true && propertyPreview.dryRun === true, 'property dry-run failed');
  json(semantic, [
    'replace-object-property-value',
    '--file',
    service,
    '--selector',
    'method:run',
    '--property',
    'phone',
    '--value',
    "'updated'",
  ]);

  json(semantic, [
    'add-named-import',
    '--file',
    service,
    '--module',
    './svc',
    '--name',
    'AccountService',
    '--dry-run',
  ]);
  json(semantic, ['add-named-import', '--file', service, '--module', './svc', '--name', 'AccountService']);
  json(semantic, ['remove-named-import', '--file', service, '--module', './svc', '--name', 'AccountService']);

  json(semantic, [
    'edit-symbol',
    '--file',
    service,
    '--selector',
    'helper',
    '--op',
    'replace',
    '--text-file',
    replacement,
    '--dry-run',
  ]);
  json(semantic, [
    'edit-symbol',
    '--file',
    service,
    '--selector',
    'helper',
    '--op',
    'replace',
    '--text-file',
    replacement,
  ]);

  const beforeRename = fs.readFileSync(service, 'utf8');
  const pos = posOf(beforeRename, 'userId: string');
  json(semantic, [
    'rename-symbol',
    '--file',
    service,
    '--line',
    String(pos.line),
    '--column',
    String(pos.column),
    '--new',
    'accountId',
    '--dry-run',
  ]);
  json(semantic, [
    'rename-symbol',
    '--file',
    service,
    '--line',
    String(pos.line),
    '--column',
    String(pos.column),
    '--new',
    'accountId',
  ]);
  assert(fs.readFileSync(service, 'utf8').includes('accountId'), 'rename-symbol did not write accountId');

  const xf = path.join(root, 'xf');
  fs.mkdirSync(xf);
  fs.writeFileSync(
    path.join(xf, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: false, noEmit: true }, include: ['*.ts'] }),
  );
  fs.writeFileSync(path.join(xf, 'a.ts'), 'export function compute(seed: number) { return seed + 1; }\n');
  fs.writeFileSync(path.join(xf, 'b.ts'), "import { compute } from './a';\nexport const r = compute(41);\n");
  const aFile = path.join(xf, 'a.ts');
  const xfPos = posOf(fs.readFileSync(aFile, 'utf8'), 'compute');
  json(semantic, [
    'rename-symbol-cross-file',
    '--file',
    aFile,
    '--line',
    String(xfPos.line),
    '--column',
    String(xfPos.column),
    '--new',
    'calculate',
    '--repo-root',
    xf,
    '--dry-run',
  ]);
  json(semantic, [
    'rename-symbol-cross-file',
    '--file',
    aFile,
    '--line',
    String(xfPos.line),
    '--column',
    String(xfPos.column),
    '--new',
    'calculate',
    '--repo-root',
    xf,
  ]);
  assert(fs.readFileSync(path.join(xf, 'b.ts'), 'utf8').includes('calculate(41)'), 'cross-file rename missed b.ts');

  const plain = path.join(root, 'plain.txt');
  fs.writeFileSync(plain, 'alpha beta\n');
  const plainHash = sha256(fs.readFileSync(plain, 'utf8'));
  json(atomic, [
    'replace-occurrence',
    '--file',
    plain,
    '--old',
    'beta',
    '--new',
    'gamma',
    '--expected-count',
    '1',
    '--sha256',
    plainHash,
    '--dry-run',
  ]);
  json(atomic, [
    'replace-occurrence',
    '--file',
    plain,
    '--old',
    'beta',
    '--new',
    'gamma',
    '--expected-count',
    '1',
    '--sha256',
    plainHash,
  ]);
  run(
    atomic,
    [
      'replace-occurrence',
      '--file',
      plain,
      '--old',
      'gamma',
      '--new',
      'delta',
      '--expected-count',
      '1',
      '--sha256',
      plainHash,
    ],
    { expectFailure: true },
  );

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        root,
        semantic: {
          outline: true,
          readSymbol: true,
          replaceLiteral: true,
          replaceObjectPropertyValue: true,
          addRemoveImport: true,
          editSymbol: true,
          renameSymbol: true,
          renameSymbolCrossFile: true,
        },
        atomic: {
          replaceOccurrence: true,
          sha256Refusal: true,
        },
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
