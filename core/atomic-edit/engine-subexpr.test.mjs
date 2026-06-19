import { describe, expect, it } from 'vitest';
import { Project } from 'ts-morph';
import { resolveSubExpression } from './dist/symbols.js';

function sourceFile(code) {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, noEmit: true } });
  return project.createSourceFile('test.ts', code, { overwrite: true });
}

describe('resolveSubExpression compiled output', () => {
  it('resolves a parameter inside a function', () => {
    const result = resolveSubExpression(sourceFile('function login(user: string): boolean { return user === "admin"; }'), 'login.user');
    expect(result.selector).toBe('login.user');
    expect(result.kind).toBe('Parameter');
  });

  it('resolves a variable inside a function', () => {
    const result = resolveSubExpression(sourceFile('function p(d: number[]): number { const r = d.reduce((a,b)=>a+b,0); return r; }'), 'p.r');
    expect(result.selector).toBe('p.r');
    expect(result.kind).toBe('VariableDeclaration');
  });

  it('resolves a variable inside a nested method', () => {
    const result = resolveSubExpression(sourceFile('class U { async f(id: string): Promise<any> { const u = await Promise.resolve(id); return u; } }'), 'U.f.u');
    expect(result.selector).toBe('U.f.u');
    expect(result.kind).toBe('VariableDeclaration');
  });

  it('throws on a missing inner expression', () => {
    expect(() => resolveSubExpression(sourceFile('function f(a: number): number { return a*2; }'), 'f.x')).toThrow(/no "x" found/);
  });

  it('throws on a missing container', () => {
    expect(() => resolveSubExpression(sourceFile('const x = 1;'), 'm.y')).toThrow(/no symbol matches/);
  });

  it('throws on a single-part selector', () => {
    expect(() => resolveSubExpression(sourceFile('function f() {}'), 'f')).toThrow(/requires container.expr/);
  });
});
