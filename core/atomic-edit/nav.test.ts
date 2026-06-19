import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { browse, outline, readSymbol } from './nav.js';

describe('nav', () => {
  describe('browse', () => {
    it('lists directory entries correctly', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-nav-test-'));
      try {
        fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'hello');
        fs.mkdirSync(path.join(tempDir, 'subfolder'));
        fs.writeFileSync(path.join(tempDir, 'subfolder', 'file2.txt'), 'world');

        const entries = browse(tempDir);
        expect(entries.length).toBe(2);

        const subfolderEntry = entries.find((e) => e.name === 'subfolder');
        const file1Entry = entries.find((e) => e.name === 'file1.txt');

        expect(subfolderEntry).toBeDefined();
        expect(subfolderEntry!.type).toBe('dir');
        expect(subfolderEntry!.size).toBe(1); // 1 child file

        expect(file1Entry).toBeDefined();
        expect(file1Entry!.type).toBe('file');
        expect(file1Entry!.size).toBe(5); // 'hello' length
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when the path is not a directory', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-nav-test-'));
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'hello');
      try {
        expect(() => browse(filePath)).toThrow(/not a directory/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('outline', () => {
    it('outlines ts signatures correctly', async () => {
      const code = `
        export class User {
          private id: string;
          constructor(id: string) {
            this.id = id;
          }
          public getId(): string {
            return this.id;
          }
        }
        export function registerUser(u: User): void {}
      `;
      const result = await outline('user.ts', code);
      expect(result.language).toBe('ts');
      expect(result.symbols.length).toBe(4); // User class, id, getId, registerUser

      const selectors = result.symbols.map((s) => s.selector);
      expect(selectors).toContain('User');
      expect(selectors).toContain('User.getId');
      expect(selectors).toContain('registerUser');
    });

    it('outlines non-ts files using fallback universal outline', async () => {
      // For non-ts files like .py, outline should fallback gracefully
      const code = `
        def hello_world():
            print("hello")
      `;
      const result = await outline('hello.py', code);
      expect(result.symbols).toBeDefined();
      // Should fall back to python or text grammar depending on environment, but should not throw
    });
  });

  describe('readSymbol', () => {
    it('reads a TS class symbol', async () => {
      const code = `
        export class Engine {
          run() {
            return "running";
          }
        }
      `;
      const result = await readSymbol('engine.ts', code, 'Engine');
      expect(result.selector).toBe('Engine');
      expect(result.kind).toBe('ClassDeclaration');
      expect(result.code).toContain('export class Engine');
    });

    it('reads a TS method symbol using Class.method', async () => {
      const code = `
        class Config {
          getValue(key: string): string {
            return "val";
          }
        }
      `;
      const result = await readSymbol('config.ts', code, 'Config.getValue');
      expect(result.selector).toBe('Config.getValue');
      expect(result.kind).toBe('MethodDeclaration');
      expect(result.code).toContain('getValue(key: string)');
    });

    it('reads symbol at position', async () => {
      const code = `
        function test() {
          const variable = 42;
        }
      `;
      // 'variable' is at line 3, column 17
      const result = await readSymbol('test.ts', code, '', { line: 3, column: 17 });
      expect(result.kind).toBe('Identifier');
      expect(result.code).toContain('variable');
    });

    it('throws when symbol is not found', async () => {
      const code = `function dummy() {}`;
      await expect(readSymbol('dummy.ts', code, 'nonexistent')).rejects.toThrow(/no symbol or sub-expression matches/);
    });
  });
});
