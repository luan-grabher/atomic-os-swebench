/**
 * engine-rename-native.ts — Cross-file rename using ONLY vendored tree-sitter WASM.
 *
 * ZERO external dependencies. ZERO spawn. ZERO LSP. ZERO PATH checks.
 * Uses tree-sitter WASM grammars already vendored in atomic's node_modules.
 * Parser, grammar WASM, and runtime — all inside atomic.
 *
 * Algorithm:
 *   1. Parse target file → find identifier at (line,column) via tree-sitter
 *   2. Glob all project files with matching extension
 *   3. Parse each file → find all identifier nodes matching oldName
 *   4. Replace all matches right-to-left (preserving offsets)
 *   5. Validate every changed file through engine.validate()
 *
 * CST-correct: every renamed token is provably an Identifier node.
 * Honest: same-named identifiers in different scopes ARE renamed.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validate, type ValidationResult, extOf } from './engine.js';
import { classifyScope, filterByScope, type ScopeKind } from './engine-rename-scope.js';
import { extToGrammar } from './engine-universal.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.basename(HERE) === 'dist' ? path.dirname(HERE) : HERE;
const NM = path.join(SOURCE_DIR, 'node_modules');

const WASM: Record<string, string> = {
  python: 'tree-sitter-python/tree-sitter-python.wasm',
  javascript: 'tree-sitter-javascript/tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript/tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-typescript/tree-sitter-tsx.wasm',
  go: 'tree-sitter-go/tree-sitter-go.wasm',
  rust: 'tree-sitter-rust/tree-sitter-rust.wasm',
  c: 'tree-sitter-c/tree-sitter-c.wasm',
  cpp: 'tree-sitter-cpp/tree-sitter-cpp.wasm',
  java: 'tree-sitter-java/tree-sitter-java.wasm',
  bash: 'tree-sitter-bash/tree-sitter-bash.wasm',
  json: 'tree-sitter-json/tree-sitter-json.wasm',
  ruby: 'tree-sitter-ruby/tree-sitter-ruby.wasm',
  css: 'tree-sitter-css/tree-sitter-css.wasm',
  html: 'tree-sitter-html/tree-sitter-html.wasm',
};

let tsModule: Record<string, unknown> | null = null;
const grammarCache = new Map<string, unknown>();
const parseCache = new Map<string, { content: string; rootNode: TsNode }>();

async function initTreeSitter(): Promise<Record<string, unknown>> {
  if (tsModule) return tsModule;
  const wts = await import(path.join(NM, 'web-tree-sitter/web-tree-sitter.js'));
  const Parser = (wts.Parser ?? wts.default) as { init: () => Promise<void>; prototype: unknown };
  if (Parser.init) await Parser.init();
  const mod: Record<string, unknown> = { ...wts, Parser: wts.Parser ?? wts.default, Language: wts.Language ?? (wts.Parser ?? wts.default).Language };
  tsModule = mod;
  return mod;
}

async function loadLanguage(lang: string): Promise<unknown> {
  const cached = grammarCache.get(lang);
  if (cached) return cached;
  const wasmRel = WASM[lang];
  if (!wasmRel) throw new Error(`No tree-sitter grammar for "${lang}"`);
  const wasmPath = path.join(NM, wasmRel);
  if (!fs.existsSync(wasmPath)) throw new Error(`Tree-sitter WASM missing: ${wasmPath}`);
  const ts = await initTreeSitter();
  const Language = ts.Language as { load: (p: string) => unknown };
  const grammar = await (Language.load(wasmPath) as unknown);
  grammarCache.set(lang, grammar);
  return grammar;
}

export interface TsNode {
  type: string;
  isMissing: boolean;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  startIndex: number;
  endIndex: number;
  childCount: number;
  child: (i: number) => TsNode;
  hasError?: boolean;
}

function isIdent(node: TsNode): boolean {
  return node.type === 'identifier' || node.type === 'property_identifier';
}

interface IdentRef {
  startOffset: number;
  endOffset: number;
  text: string;
}

function findIdentAt(text: string, root: TsNode, line: number, col: number): IdentRef | null {
  const targetRow = line - 1;
  const targetCol = col - 1;

  function walk(node: TsNode): IdentRef | null {
    if (targetRow < node.startPosition.row || targetRow > node.endPosition.row) return null;
    if (targetRow === node.startPosition.row && node.startPosition.column > targetCol) return null;
    if (targetRow === node.endPosition.row && node.endPosition.column < targetCol) return null;

    if (isIdent(node) && node.startPosition.row === targetRow &&
        node.startPosition.column <= targetCol && node.endPosition.column >= targetCol) {
      return { text: text.slice(node.startIndex, node.endIndex), startOffset: node.startIndex, endOffset: node.endIndex };
    }
    for (let i = 0; i < node.childCount; i++) {
      const r = walk(node.child(i));
      if (r) return r;
    }
    return null;
  }
  return walk(root);
}

function collectIdents(text: string, root: TsNode, name: string): { startOffset: number; endOffset: number }[] {
  const hits: { startOffset: number; endOffset: number }[] = [];
  function walk(node: TsNode): void {
    if (isIdent(node) && text.slice(node.startIndex, node.endIndex) === name) {
      hits.push({ startOffset: node.startIndex, endOffset: node.endIndex });
    }
    for (let i = 0; i < node.childCount; i++) walk(node.child(i));
  }
  walk(root);
  return hits;
}

const SKIP = new Set(['node_modules', '.git', 'dist', '.atomic', '__pycache__', '.next', 'build', '__tests__', 'tests']);

function collectFiles(dir: string, ext: string, max = 3000): string[] {
  const results: string[] = [];
  const stack = [dir];
  while (stack.length && results.length < max) {
    const d = stack.pop()!;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && full.endsWith(ext)) results.push(full);
    }
  }
  return results;
}

export interface NativeRenameResult {
  symbol: string;
  changes: Map<string, string>;
  totalReferences: number;
  filesScanned: number;
  filesChanged: number;
  validations: { file: string; ok: boolean; introduced?: string }[];
}

export async function renameSymbolCrossFileNative(
  absFile: string,
  repoRoot: string,
  line: number,
  column: number,
  newName: string,
): Promise<NativeRenameResult> {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(newName)) {
    throw new Error(`invalid identifier: ${JSON.stringify(newName)}`);
  }

  const ext = extOf(absFile);
  const grammar = extToGrammar(ext);
  if (!grammar) throw new Error(`No grammar for "${ext}". Supported: ${Object.keys(WASM).join(', ')}`);

  parseCache.clear();
  const lang = await loadLanguage(grammar);
  const ts = await initTreeSitter();
  const Parser = ts.Parser as { new(): { setLanguage: (l: unknown) => void; parse: (t: string) => { rootNode: TsNode } } };

  // 1. Find target identifier
  const targetContent = fs.readFileSync(absFile, 'utf8');
  const p1 = new Parser();
  p1.setLanguage(lang);
  const t1 = p1.parse(targetContent);
  const target = findIdentAt(targetContent, t1.rootNode, line, column);
  if (!target) throw new Error(`No identifier at ${absFile}:${line}:${column}`);
  const oldName = target.text;
  if (oldName === newName) {
    return { symbol: `${oldName} → ${newName}`, changes: new Map(), totalReferences: 0, filesScanned: 0, filesChanged: 0, validations: [] };
  }

  // 2. Scan project files
  const allFiles = collectFiles(repoRoot, ext);
  const changes = new Map<string, string>();
  const validations: NativeRenameResult['validations'] = [];
  let totalRefs = 0;

  const pfShared = new Parser();
  pfShared.setLanguage(lang);
  for (const fp of allFiles) {
    const content = fs.readFileSync(fp, 'utf8');
    const cached = parseCache.get(fp);
    let rootNode: TsNode;
    if (cached && cached.content === content) {
      rootNode = cached.rootNode;
    } else {
      const pf = new Parser();
      pf.setLanguage(lang);
      const tree = pf.parse(content) as { rootNode: TsNode };
      rootNode = tree.rootNode;
      parseCache.set(fp, { content, rootNode });
    }
    let idents = collectIdents(content, rootNode, oldName);
    if (idents.length === 0) continue;
    // Scope filtering: only rename identifiers in the same scope
    if (fp === absFile) {
      const scope = classifyScope(grammar, rootNode, line, column, content);
      if (scope && scope.kind !== 'module') {
        idents = filterByScope(grammar, scope, idents, rootNode, content, oldName);
      }
    }
    if (idents.length === 0) continue;

    const sorted = idents.sort((a, b) => b.startOffset - a.startOffset);
    let modified = content;
    for (const id of sorted) {
      modified = modified.slice(0, id.startOffset) + newName + modified.slice(id.endOffset);
      totalRefs++;
    }

    const rel = path.relative(repoRoot, fp).split(path.sep).join('/');
    const v = validate(rel, content, modified);
    validations.push({ file: rel, ok: v.ok, introduced: v.introduced });
    changes.set(rel, modified);
  }

  return { symbol: `${oldName} → ${newName}`, changes, totalReferences: totalRefs, filesScanned: allFiles.length, filesChanged: changes.size, validations };
}
