import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { protectedEffectHits, bubblewrapArgs } from './server-tools-exec.js';
import { REPO_ROOT } from './guard.js';

describe('server-tools-exec helper functions', () => {
  it('bubblewrapArgs should generate expected sandbox parameters', () => {
    const effectRoot = path.resolve('.');
    const tempRoot = fs.mkdtempSync(path.join(fs.realpathSync(effectRoot), '.tmp-bubblewrap-'));
    try {
      const args = bubblewrapArgs(effectRoot, tempRoot);

      expect(args).toContain('--ro-bind');
      expect(args).toContain('/');
      expect(args).toContain('--unshare-net');
      expect(args).toContain('--bind');
      expect(args).toContain(fs.realpathSync(effectRoot));
      expect(args).toContain(fs.realpathSync(tempRoot));
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('protectedEffectHits should detect edits to governance-protected files', () => {
    const root = REPO_ROOT;
    const effects = [
      { file: 'CLAUDE.md' },
      { file: 'src/index.ts' },
      { file: 'eslint.config.js' },
    ];
    const hits = protectedEffectHits(root, effects);
    expect(hits.some(h => h.includes('CLAUDE.md'))).toBe(true);
    expect(hits.some(h => h.includes('src/index.ts'))).toBe(false);
  });
});
