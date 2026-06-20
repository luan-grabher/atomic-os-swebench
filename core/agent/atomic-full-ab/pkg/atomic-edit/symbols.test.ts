import { describe, expect, it } from 'vitest';
import { Project } from 'ts-morph';
import { listSignatures, resolveSymbol, resolveNodeAtPosition } from './symbols.js';

function makeSourceFile(code: string) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, noEmit: true },
  });
  return project.createSourceFile('test.ts', code, { overwrite: true });
}

describe('symbols', () => {
  describe('listSignatures', () => {
    it('lists all declaration signatures in a file', () => {
      const sf = makeSourceFile(`
        export class User {
          id: string;
          username: string;
        }
        export class Auth {
          login(user: User) {
            const token = "jwt";
            return token;
          }
        }
        export function hash(data: string): string {
          return data;
        }
        export const VERSION = "1.0.0";
      `);

      const sigs = listSignatures(sf);
      const selectors = sigs.map((s) => s.selector);

      expect(selectors).toContain('User');
      expect(selectors).toContain('User.id');
      expect(selectors).toContain('User.username');
      expect(selectors).toContain('Auth');
      expect(selectors).toContain('Auth.login');
      expect(selectors).toContain('hash');
      expect(selectors).toContain('VERSION');

      const versionSig = sigs.find((s) => s.selector === 'VERSION');
      expect(versionSig?.kind).toBe('VariableDeclaration');
    });
  });

  describe('resolveSymbol', () => {
    it('resolves top-level functions and classes exactly', () => {
      const sf = makeSourceFile(`
        export class DB {}
        export function connect() {}
      `);

      const dbRes = resolveSymbol(sf, 'DB');
      expect(dbRes.info.kind).toBe('ClassDeclaration');
      expect(dbRes.node.getText()).toContain('class DB');

      const connRes = resolveSymbol(sf, 'connect');
      expect(connRes.info.kind).toBe('FunctionDeclaration');
      expect(connRes.node.getText()).toContain('function connect');
    });

    it('resolves symbols case-insensitively when exact match is missing', () => {
      const sf = makeSourceFile(`
        function authenticateUser() {}
      `);

      const res = resolveSymbol(sf, 'AUTHENTICATEUSER');
      expect(res.info.selector).toBe('authenticateUser');
    });

    it('resolves symbols by fuzzy unique substring', () => {
      const sf = makeSourceFile(`
        class UserSessionController {}
      `);

      const res = resolveSymbol(sf, 'SessionController');
      expect(res.info.selector).toBe('UserSessionController');
    });

    it('throws error when symbol is not found', () => {
      const sf = makeSourceFile(`function test() {}`);
      expect(() => resolveSymbol(sf, 'nonexistent')).toThrow(/no symbol matches "nonexistent"/);
    });

    it('throws error on ambiguous matches', () => {
      const sf = makeSourceFile(`
        function executeTaskA() {}
        function executeTaskB() {}
      `);
      expect(() => resolveSymbol(sf, 'executeTask')).toThrow(/ambiguous selector "executeTask"/);
    });
  });

  describe('resolveNodeAtPosition', () => {
    it('resolves the deepest node at given line/column', () => {
      const sf = makeSourceFile(`
        function run(a: number) {
          const b = a + 10;
          return b;
        }
      `);

      // 'a' parameter is at line 2, column 22
      const paramNode = resolveNodeAtPosition(sf, 2, 22);
      expect(paramNode.kind).toBe('Identifier');
      expect(paramNode.text).toBe('a');

      // 'b' variable declaration is at line 3, column 17
      const varNode = resolveNodeAtPosition(sf, 3, 17);
      expect(varNode.kind).toBe('Identifier');
      expect(varNode.text).toBe('b');
    });

    it('throws error when no node is found at position', () => {
      const sf = makeSourceFile(`const a = 1;`);
      expect(() => resolveNodeAtPosition(sf, 10, 10)).toThrow(/no node found at line 10/);
    });
  });
});
