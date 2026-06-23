import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { partBSetup } from './smoke-part-b-setup.js';
import { partBRenameProp } from './smoke-part-b-rename-prop.js';
import { partBAnchorAfter } from './smoke-part-b-anchor-after.js';
import { partBAnchorBefore } from './smoke-part-b-anchor-before.js';
import { partBReplaceBetween } from './smoke-part-b-replace-between.js';
import { partBReplaceRegion } from './smoke-part-b-replace-region.js';
import { partBCreateFile } from './smoke-part-b-create-file.js';
import { partBOutlineStat } from './smoke-part-b-outline-stat.js';
import { partBDeleteFile } from './smoke-part-b-delete-file.js';
import { partBMultiTx } from './smoke-part-b-multi-tx.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_DIR = path.basename(__dirname) === 'dist' ? path.dirname(__dirname) : __dirname;

export async function partB(): Promise<void> {
  process.stdout.write('Part B — live MCP stdio round-trip\n');
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

  const findRepoRoot = (start: string): string => {
    let dir = start;
    for (;;) {
      if (fs.existsSync(path.join(dir, '.git'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) return start;
      dir = parent;
    }
  };
  const repoRoot = findRepoRoot(SOURCE_DIR);
  const selfRel = path.relative(repoRoot, SOURCE_DIR).split(path.sep).join('/');
  const fixtureRel = path.posix.join(selfRel, `.smoke-live-fixture.${process.pid}.ts`);
  const fixtureAbs = path.join(SOURCE_DIR, `.smoke-live-fixture.${process.pid}.ts`);
  fs.writeFileSync(fixtureAbs, "export const TARGET = '5511999999999';\n");

  const compiledServer = path.join(SOURCE_DIR, 'dist', 'server.js');
  const transport = new StdioClientTransport({
    command: fs.existsSync(compiledServer) ? process.execPath : 'npx',
    args: fs.existsSync(compiledServer)
      ? [compiledServer]
      : ['--yes', 'tsx', path.join(SOURCE_DIR, 'server.ts')],
    cwd: repoRoot,
    stderr: 'inherit',
  });
  const client = new Client({ name: 'smoke', version: '1.0.0' });
  try {
    await client.connect(transport);
    const ctx = { client, fixtureAbs, fixtureRel, repoRoot, selfRel, selfAbs: SOURCE_DIR };
    await partBSetup(ctx);
    await partBRenameProp(ctx);
    await partBAnchorAfter(ctx);
    await partBAnchorBefore(ctx);
    await partBReplaceBetween(ctx);
    await partBReplaceRegion(ctx);
    await partBCreateFile(ctx);
    await partBOutlineStat(ctx);
    await partBDeleteFile(ctx);
    await partBMultiTx(ctx);
  } finally {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    if (fs.existsSync(fixtureAbs)) fs.unlinkSync(fixtureAbs);
  }
}
