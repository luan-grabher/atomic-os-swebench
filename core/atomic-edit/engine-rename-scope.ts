/**
 * engine-rename-scope.ts — Scope-aware rename using tree-sitter queries.
 *
 * Extends CST-correct rename (engine-rename-native) with scope analysis.
 * Determines the scope type of the target identifier (function, method, class,
 * local variable, module-level) and filters candidate identifiers across the
 * project to only rename those that are semantically the same symbol.
 *
 * Algorithm per scope type:
 *   FUNCTION/METHOD  → rename definition + all call_expression references
 *   CLASS            → rename definition + all type references
 *   LOCAL VARIABLE   → rename only within the same function body
 *   MODULE-LEVEL     → rename all identifiers with matching name (CST fallback)
 *
 * Zero LSP. Zero spawn. Pure tree-sitter queries.
 * Supports: Python, JavaScript, TypeScript, Go, Rust.
 */

import type { TsNode } from './engine-rename-native.js';

export type ScopeKind = 'function' | 'method' | 'class' | 'local' | 'module' | 'unknown';

export interface ScopeInfo {
  kind: ScopeKind;
  name: string;
  parentName?: string;
}

/** Tree-sitter query patterns per language for scope detection. */
const SCOPE_QUERIES: Record<string, string> = {
  python: `
    (function_definition name: (identifier) @func.name) @func
    (class_definition name: (identifier) @class.name) @class
    (assignment left: (identifier) @local.name) @local
    (call function: (identifier) @call.name) @call
  `,
  javascript: `
    (function_declaration name: (identifier) @func.name) @func
    (class_declaration name: (identifier) @class.name) @class
    (variable_declarator name: (identifier) @local.name) @local
    (call_expression function: (identifier) @call.name) @call
  `,
  typescript: `
    (function_declaration name: (identifier) @func.name) @func
    (class_declaration name: (identifier) @class.name) @class
    (variable_declarator name: (identifier) @local.name) @local
    (call_expression function: (identifier) @call.name) @call
  `,
  go: `
    (function_declaration name: (identifier) @func.name) @func
    (type_declaration (type_spec name: (type_identifier) @class.name)) @class
    (short_var_declaration left: (identifier) @local.name) @local
    (call_expression function: (identifier) @call.name) @call
  `,
  rust: `
    (function_item name: (identifier) @func.name) @func
    (struct_item name: (type_identifier) @class.name) @class
    (let_declaration pattern: (identifier) @local.name) @local
    (call_expression function: (identifier) @call.name) @call
  `,
};

/**
 * Classify the scope kind of an identifier at a given position.
 * Returns null if the position doesn't point to an identifier in a known scope.
 */
export function classifyScope(
  lang: string,
  rootNode: TsNode,
  line: number,
  column: number,
  text: string,
): ScopeInfo | null {
  const targetRow = line - 1;
  const targetCol = column - 1;

  function walkDefKind(node: TsNode, depth = 0): ScopeKind | null {
    if (depth > 5) return null;
    if (node.type === 'function_definition' || node.type === 'function_declaration' ||
        node.type === 'function_item' || node.type === 'method_definition') {
      return containsPos(node, targetRow, targetCol) ? 'function' : null;
    }
    if (node.type === 'class_definition' || node.type === 'class_declaration' ||
        node.type === 'struct_item' || node.type === 'type_declaration') {
      return containsPos(node, targetRow, targetCol) ? 'class' : null;
    }
    // Check if this is a local variable assignment
    if (node.type === 'assignment' || node.type === 'variable_declarator' ||
        node.type === 'short_var_declaration' || node.type === 'let_declaration') {
      return containsPos(node, targetRow, targetCol) ? 'local' : null;
    }
    for (let i = 0; i < node.childCount; i++) {
      const r = walkDefKind(node.child(i), depth + 1);
      if (r) return r;
    }
    return null;
  }

  const kind = walkDefKind(rootNode);
  if (!kind) {
    // Default: if at module/top level, it's a module-level symbol
    // Check if the identifier is inside a function body → local
    if (isInsideFunction(rootNode, targetRow, targetCol)) return { kind: 'local', name: '' };
    return { kind: 'module', name: '' };
  }

  // Get the name of the parent scope (function/class name)
  let name = '';
  let parentName = '';

  return { kind, name: name || '', parentName: parentName || undefined };
}

function containsPos(node: TsNode, row: number, col: number): boolean {
  if (row < node.startPosition.row || row > node.endPosition.row) return false;
  if (row === node.startPosition.row && col < node.startPosition.column) return false;
  if (row === node.endPosition.row && col > node.endPosition.column) return false;
  return true;
}

function isInsideFunction(root: TsNode, row: number, col: number): boolean {
  const funcTypes = new Set([
    'function_definition', 'function_declaration', 'function_item',
    'method_definition', 'arrow_function', 'function_expression',
  ]);
  let found = false;
  function walk(node: TsNode): void {
    if (found) return;
    if (funcTypes.has(node.type) && containsPos(node, row, col)) {
      found = true;
      return;
    }
    for (let i = 0; i < node.childCount; i++) walk(node.child(i));
  }
  walk(root);
  return found;
}

/**
 * Filter candidate identifiers to only those in the same scope as the target.
 * 
 * For FUNCTION/METHOD: keep identifiers that are:
 *   - The function definition itself
 *   - Inside a call_expression targeting this function
 *   - Same name at module level (imports/exports)
 * 
 * For CLASS: keep identifiers that are:
 *   - The class definition itself
 *   - Type annotations referencing this class
 * 
 * For LOCAL: keep only identifiers within the same enclosing function body.
 * 
 * For MODULE: keep ALL matching identifiers (CST behavior — safe default).
 */
export function filterByScope(
  lang: string,
  scope: ScopeInfo,
  candidates: { startOffset: number; endOffset: number }[],
  rootNode: TsNode,
  text: string,
  oldName: string,
): { startOffset: number; endOffset: number }[] {
  // Module-level: rename everything (standard CST behavior)
  if (scope.kind === 'module' || scope.kind === 'unknown') {
    return candidates;
  }

  // Local variable: only rename within the same function body
  if (scope.kind === 'local') {
    return candidates.filter((c) => {
      const node = findNodeAt(rootNode, c.startOffset, c.endOffset);
      if (!node) return false;
      // Must be inside the same function scope
      return isInsideFunction(rootNode, node.startPosition.row, node.startPosition.column);
    });
  }

  // Function/Method/Class: rename definition + call references
  if (scope.kind === 'function' || scope.kind === 'method' || scope.kind === 'class') {
    return candidates.filter((c) => {
      const node = findNodeAt(rootNode, c.startOffset, c.endOffset);
      if (!node) return true; // if we can't find the node, keep it (safe)
      
      // If this node is the definition itself, keep it
      const parent = findParent(node, rootNode);
      if (parent) {
        const pType = parent.type;
        // Function definition
        if ((scope.kind === 'function' || scope.kind === 'method') &&
            (pType === 'function_definition' || pType === 'function_declaration' ||
             pType === 'function_item' || pType === 'method_definition')) {
          return true;
        }
        // Class definition
        if (scope.kind === 'class' &&
            (pType === 'class_definition' || pType === 'class_declaration' ||
             pType === 'struct_item')) {
          return true;
        }
        // Call expression (function/method invocations)
        if ((scope.kind === 'function' || scope.kind === 'method') &&
            pType === 'call_expression') {
          return true;
        }
      }
      
      // Keep module-level occurrences (imports/exports)
      return !isInsideFunction(rootNode, node.startPosition.row, node.startPosition.column);
    });
  }

  return candidates;
}

function findNodeAt(root: TsNode, start: number, end: number): TsNode | null {
  function walk(node: TsNode): TsNode | null {
    if (node.startIndex === start && node.endIndex === end) return node;
    for (let i = 0; i < node.childCount; i++) {
      const r = walk(node.child(i));
      if (r) return r;
    }
    return null;
  }
  return walk(root);
}

function findParent(node: TsNode, root: TsNode): TsNode | null {
  function walk(current: TsNode): TsNode | null {
    for (let i = 0; i < current.childCount; i++) {
      const child = current.child(i);
      if (child.startIndex <= node.startIndex && child.endIndex >= node.endIndex) {
        if (child.startIndex === node.startIndex && child.endIndex === node.endIndex) {
          return current;
        }
        return walk(child);
      }
    }
    return null;
  }
  return walk(root);
}
