/**
 * Universal literal and property operations — extends TS-only ts-morph operations
 * to ALL languages via pattern matching with syntax validation.
 *
 * From the Atomic Action Principle taxonomy:
 * - replace_literal: any language (was TS-only via ts-morph)
 * - replace_property_value: any language (was TS-only)  
 * - rename_property_key: any language (was TS-only)
 */

import { validate, type ValidationResult, type EditZones, computeZones, EMPTY_ZONES, type Position } from './engine.js';
export type { EditZones } from './engine.js';
export { EMPTY_ZONES, computeZones } from './engine.js';

// ─────────────────────────── helpers ───────────────────────────

/**
 * Map a file extension to its tree-sitter grammar tag (the keys of the
 * native-bridge GRAMMARS registry). Shared by every universal multi-language
 * op so each one resolves the grammar the same way instead of re-deriving it.
 * Returns null for extensions with no first-class grammar — the caller decides
 * whether to refuse (a construct that needs structure) or fall back to text.
 */
const EXT_TO_GRAMMAR: Record<string, string> = {
  '.py': 'python', '.pyi': 'python',
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.tsx': 'tsx',
  '.go': 'go',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c', '.h': 'c',
  '.cc': 'cpp', '.cpp': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.hh': 'cpp',
  '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.json': 'json',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'css', '.less': 'css',
  '.php': 'php', '.phtml': 'php',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.swift': 'swift',
  '.cs': 'c-sharp',
  '.scala': 'scala',
  '.lua': 'lua',
  '.dart': 'dart',
  '.ex': 'elixir', '.exs': 'elixir',
  '.hs': 'haskell', '.lhs': 'haskell',
  '.graphql': 'graphql', '.gql': 'graphql',
  '.proto': 'proto',
  '.zig': 'zig',
  '.toml': 'toml',
  '.sql': 'sql',
  '.yaml': 'yaml', '.yml': 'yaml',
};

/** Resolve a tree-sitter grammar tag for a file extension (e.g. '.py' -> 'python'), or null. */
export function extToGrammar(ext: string): string | null {
  return EXT_TO_GRAMMAR[ext.toLowerCase()] ?? null;
}

/**
 * The provenance of a universal edit's correctness, surfaced on every universal
 * result so callers/agents never over-trust a scope-only edit:
 *  - 'cst-correct'         edit anchored to a real CST node span (token-correct by construction)
 *  - 'scope-correct'       a binder/scope pass disambiguated the symbol
 *  - 'textual-single-file' word-boundary text match within one file (no scope/types)
 *  - 'requires-LSP'        cross-file / overload / type resolution needed — not decided here
 *  - 'unjudged'            dynamic dispatch / reflection — undecidable by any static tool
 */
export type UniversalMethod =
  | 'cst-correct'
  | 'scope-correct'
  | 'textual-single-file'
  | 'requires-LSP'
  | 'unjudged';

function posToOffset(text: string, pos: Position): number {
  let offset = 0;
  for (let line = 1; line < pos.line; line++) {
    const nl = text.indexOf('\n', offset);
    if (nl === -1) throw new Error(`line ${pos.line} does not exist`);
    offset = nl + 1;
  }
  return offset + (pos.column - 1);
}

// ─────────────────── universal replace_literal ──────────────────

export interface UniversalLiteralResult {
  newText: string;
  oldText: string;
  newLiteral: string;
  validation: ValidationResult;
  zones: EditZones;
}

/**
 * Replace a literal value at a given line/column.
 * Finds the nearest literal (string, number, boolean, null) at that position
 * and replaces it. Works on ANY language — no AST needed.
 *
 * For TS/JS, the existing ts-morph replaceLiteral() gives better AST precision.
 * This universal version covers all other languages via text scanning.
 */
export function universalReplaceLiteral(
  file: string,
  original: string,
  line: number,
  column: number,
  newLiteral: string,
): UniversalLiteralResult {
  const offset = posToOffset(original, { line, column });

  // Find the literal at this position
  const c = original[offset];
  if (!c) throw new Error('position out of range');

  let start = offset;
  let end = offset;
  let oldText: string;

  // String literal (single/double/backtick quoted)
  if (c === '"' || c === "'" || c === '`') {
    const quote = c;
    // Walk backward to find opening quote
    start = offset;
    while (start > 0 && original[start] !== quote) start--;
    if (original[start] !== quote) throw new Error('unterminated string');

    // Walk forward to find closing quote (honor escapes)
    end = start + 1;
    while (end < original.length) {
      if (original[end] === '\\') { end += 2; continue; }
      if (original[end] === quote) { end++; break; }
      end++;
    }
    oldText = original.slice(start, end);
  }
  // Number literal
  else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(original[offset + 1] || ''))) {
    start = offset;
    while (start > 0 && /[0-9a-fA-FxXoObB._]/.test(original[start - 1])) start--;
    // Handle hex prefix 0x, binary 0b
    if (start >= 1 && original[start - 1] === '0' && /[xXbBoO]/.test(original[start] || '')) start--;
    end = offset;
    while (end < original.length && /[0-9a-fA-F._eE+-]/.test(original[end])) end++;
    oldText = original.slice(start, end);
  }
  // Boolean/null literal (word boundary)
  else if (/[A-Za-z]/.test(c)) {
    start = offset;
    while (start > 0 && /[A-Za-z0-9_$]/.test(original[start - 1])) start--;
    end = offset;
    while (end < original.length && /[A-Za-z0-9_$]/.test(original[end])) end++;
    const word = original.slice(start, end);
    if (['true', 'false', 'null', 'nil', 'None', 'True', 'False', 'undefined'].includes(word)) {
      oldText = word;
    } else {
      throw new Error(`not a literal at ${line}:${column} (found: "${word}")`);
    }
  }
  else {
    throw new Error(`not a recognizable literal at ${line}:${column}`);
  }

  if (oldText === newLiteral) {
    return {
      newText: original, oldText, newLiteral,
      validation: validate(file, original, original), zones: EMPTY_ZONES,
    };
  }

  const newText = original.slice(0, start) + newLiteral + original.slice(end);
  return {
    newText, oldText, newLiteral,
    validation: validate(file, original, newText),
    zones: computeZones(original, newText),
  };
}

// ─────────────────── universal property ops ─────────────────────

export interface PropertyEditResult {
  newText: string;
  key: string;
  newKey?: string;
  oldValue?: string;
  newValue?: string;
  validation: ValidationResult;
  zones: EditZones;
}

/**
 * Resolve what language-format style to use for property matching.
 * Returns the regex pattern for extracting `key = value` or `key: value`.
 */
function detectPropertyStyle(ext: string): 'colon' | 'equals' | 'yaml' | 'toml' {
  const styleMap: Record<string, 'colon' | 'equals' | 'yaml' | 'toml'> = {
    '.json': 'colon', '.js': 'colon', '.ts': 'colon', '.tsx': 'colon', '.jsx': 'colon',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.toml': 'toml',
    '.py': 'colon', '.rb': 'colon',
    '.go': 'colon', '.rs': 'colon', '.swift': 'colon', '.scala': 'colon', '.kt': 'colon',
    '.java': 'equals', '.c': 'equals', '.cpp': 'equals', '.h': 'equals', '.hpp': 'equals',
    '.cs': 'equals', '.php': 'equals',
    '.sh': 'equals', '.bash': 'equals',
  };
  return styleMap[ext] || 'colon';
}

/**
 * Replace a property value, preserving the key.
 * Matches: key: oldValue or key = oldValue based on file extension style.
 */
export function universalReplacePropertyValue(
  file: string,
  original: string,
  property: string,
  newValue: string,
): PropertyEditResult {
  const style = detectPropertyStyle(file.slice(file.lastIndexOf('.')));

  // Build pattern for the property
  let pattern: RegExp;
  let match: RegExpExecArray | null;

  if (style === 'colon') {
    // Match `propertyName: value` (handles quotes around key, whitespace)
    pattern = new RegExp(
      `(['"]?${escapeRegex(property)}['"]?\\s*:\\s*)([^,\\n;}]+)`,
      'g',
    );
  } else if (style === 'equals') {
    pattern = new RegExp(
      `(${escapeRegex(property)}\\s*=\\s*)([^;,\\n}]+)`,
      'g',
    );
  } else if (style === 'yaml') {
    // YAML: `key: value` at start of line or after indent
    pattern = new RegExp(
      `(^[ \\t]*${escapeRegex(property)}\\s*:\\s*)(.+)$`,
      'gm',
    );
  } else {
    // TOML: `key = value`
    pattern = new RegExp(
      `(^[ \\t]*${escapeRegex(property)}\\s*=\\s*)(.+)$`,
      'gm',
    );
  }

  pattern.lastIndex = 0;
  match = pattern.exec(original);

  if (!match) {
    throw new Error(`property "${property}" not found in ${file}`);
  }

  // Check for ambiguity
  const second = pattern.exec(original);
  if (second) {
    throw new Error(
      `ambiguous: property "${property}" appears multiple times. ` +
      `Use a more specific property name or use atomic_replace_range with exact coordinates.`,
    );
  }

  const keyPart = match[1];
  const oldValue = match[2].trim();
  const fullMatch = match[0];
  const matchStart = match.index;

  const newText = original.slice(0, matchStart) + keyPart + newValue + original.slice(matchStart + fullMatch.length);

  return {
    newText,
    key: property,
    oldValue,
    newValue,
    validation: validate(file, original, newText),
    zones: computeZones(original, newText),
  };
}

export interface ExprEditResult {
  newText: string;
  validation: ValidationResult;
  zones: EditZones;
}

/**
 * #6 — Wrap a verbatim expression in a generic prefix/suffix (e.g. `foo()` -> `await foo()`,
 * `x` -> `wrap(x)`). Refuses ambiguity unless `occurrence` is given; validate() is the
 * soundness backstop (an unbalanced wrap is refused, never written). Generalizes the
 * specific atomic_add_await_to_call.
 */
export function universalWrapExpression(
  file: string,
  original: string,
  anchor: string,
  prefix: string,
  suffix: string,
  occurrence?: number,
): ExprEditResult {
  if (!anchor) throw new Error('wrap: empty anchor');
  const offsets: number[] = [];
  let i = original.indexOf(anchor);
  while (i !== -1) { offsets.push(i); i = original.indexOf(anchor, i + 1); }
  if (offsets.length === 0) throw new Error(`wrap: expression ${JSON.stringify(anchor)} not found in ${file}`);
  let at: number;
  if (occurrence !== undefined) {
    if (occurrence < 1 || occurrence > offsets.length) throw new Error(`wrap: occurrence ${occurrence} out of range (found ${offsets.length})`);
    at = offsets[occurrence - 1];
  } else {
    if (offsets.length > 1) throw new Error(`wrap: ${JSON.stringify(anchor)} appears ${offsets.length} times; pass occurrence to disambiguate`);
    at = offsets[0];
  }
  const newText = original.slice(0, at) + prefix + anchor + suffix + original.slice(at + anchor.length);
  return { newText, validation: validate(file, original, newText), zones: computeZones(original, newText) };
}

/**
 * #7 — Extract a verbatim expression to a new local declaration and replace the
 * expression in place with the variable name. `const result = compute(a + b);` with
 * anchor `a + b`, name `sum` -> `const sum = a + b;\nconst result = compute(sum);`.
 * The declaration is inserted on its own line before the statement (inheriting indent).
 * JS/TS-family (keyword default `const`). Refuses ambiguity; validate() backstop.
 */
export function universalExtractToVariable(
  file: string,
  original: string,
  anchor: string,
  varName: string,
  occurrence?: number,
  keyword: string = 'const',
): ExprEditResult {
  if (!anchor) throw new Error('extract: empty anchor');
  if (!/^[A-Za-z_$][\w$]*$/.test(varName)) throw new Error(`extract: invalid variable name ${JSON.stringify(varName)}`);
  const offsets: number[] = [];
  let i = original.indexOf(anchor);
  while (i !== -1) { offsets.push(i); i = original.indexOf(anchor, i + 1); }
  if (offsets.length === 0) throw new Error(`extract: expression ${JSON.stringify(anchor)} not found in ${file}`);
  let at: number;
  if (occurrence !== undefined) {
    if (occurrence < 1 || occurrence > offsets.length) throw new Error(`extract: occurrence ${occurrence} out of range (found ${offsets.length})`);
    at = offsets[occurrence - 1];
  } else {
    if (offsets.length > 1) throw new Error(`extract: ${JSON.stringify(anchor)} appears ${offsets.length} times; pass occurrence to disambiguate`);
    at = offsets[0];
  }
  const lineStart = original.lastIndexOf('\n', at - 1) + 1;
  const indent = (/^[ \t]*/.exec(original.slice(lineStart, at)) ?? [''])[0];
  const decl = `${indent}${keyword} ${varName} = ${anchor};\n`;
  const newText =
    original.slice(0, lineStart) + decl + original.slice(lineStart, at) + varName + original.slice(at + anchor.length);
  return { newText, validation: validate(file, original, newText), zones: computeZones(original, newText) };
}

/** Strip ONE outer wrapper from an expression: `await X` -> `X`, or `name(INNER)` -> `INNER` (balanced). */
function stripOuterCall(expr: string): string | null {
  const t = expr.trim();
  const aw = /^await\s+([\s\S]+)$/.exec(t);
  if (aw) return aw[1];
  const m = /^[A-Za-z_$][\w$.]*\s*\(([\s\S]*)\)$/.exec(t);
  if (m) {
    let depth = 0;
    for (const ch of m[1]) {
      if (ch === '(') depth += 1;
      else if (ch === ')') { depth -= 1; if (depth < 0) return null; }
    }
    if (depth === 0) return m[1].trim();
  }
  return null;
}

/**
 * #6 — Unwrap a verbatim wrapped expression: `await foo()` -> `foo()`, `wrap(x.y)` -> `x.y`.
 * The anchor is the FULL wrapped form; the outer `await`/`name(...)` is stripped. Refuses
 * ambiguity + a non-wrapper anchor; validate() backstop.
 */
export function universalUnwrapExpression(
  file: string,
  original: string,
  anchor: string,
  occurrence?: number,
): ExprEditResult {
  const inner = stripOuterCall(anchor);
  if (inner === null) throw new Error(`unwrap: ${JSON.stringify(anchor)} is not a recognizable wrapper (expected \`await X\` or \`name(INNER)\`)`);
  const offsets: number[] = [];
  let i = original.indexOf(anchor);
  while (i !== -1) { offsets.push(i); i = original.indexOf(anchor, i + 1); }
  if (offsets.length === 0) throw new Error(`unwrap: ${JSON.stringify(anchor)} not found in ${file}`);
  let at: number;
  if (occurrence !== undefined) {
    if (occurrence < 1 || occurrence > offsets.length) throw new Error(`unwrap: occurrence ${occurrence} out of range (found ${offsets.length})`);
    at = offsets[occurrence - 1];
  } else {
    if (offsets.length > 1) throw new Error(`unwrap: ${JSON.stringify(anchor)} appears ${offsets.length} times; pass occurrence to disambiguate`);
    at = offsets[0];
  }
  const newText = original.slice(0, at) + inner + original.slice(at + anchor.length);
  return { newText, validation: validate(file, original, newText), zones: computeZones(original, newText) };
}

/**
 * #8 — Remove a property entry from an object literal / config map. Regex by style;
 * refuses ambiguity (multiple matches) and not-found. The atomicWrite/validate()
 * pipeline is the soundness backstop: if a removal produces invalid syntax (an exotic
 * value shape the bounded regex mishandles) it is refused, never persisted.
 */
export function universalRemoveProperty(file: string, original: string, property: string): PropertyEditResult {
  const ext = file.slice(file.lastIndexOf('.'));
  const style = detectPropertyStyle(ext);
  const key = escapeRegex(property);
  let pattern: RegExp;
  if (style === 'equals') {
    pattern = new RegExp(`[ \\t]*${key}[ \\t]*=[ \\t]*[^;,\\n}]+[ \\t]*,?`, 'g');
  } else if (style === 'yaml' || style === 'toml') {
    pattern = new RegExp(`^[ \\t]*${key}[ \\t]*[:=][ \\t]*.+\\n?`, 'gm');
  } else {
    pattern = new RegExp(`[ \\t]*['"]?${key}['"]?[ \\t]*:[ \\t]*[^,\\n;}]+[ \\t]*,?`, 'g');
  }
  pattern.lastIndex = 0;
  const match = pattern.exec(original);
  if (!match) throw new Error(`property "${property}" not found in ${file}`);
  if (pattern.exec(original)) {
    throw new Error(
      `ambiguous: property "${property}" appears multiple times. Use atomic_replace_range with exact coordinates.`,
    );
  }
  const start = match.index;
  const end = start + match[0].length;
  let newText = original.slice(0, start) + original.slice(end);
  // Repair separators the removal may have left dangling (trailing comma before }/], doubled commas).
  newText = newText.replace(/,(\s*[}\]])/g, '$1').replace(/,(\s*),/g, ',$1').replace(/\{\s*,/g, '{');
  return { newText, key: property, validation: validate(file, original, newText), zones: computeZones(original, newText) };
}

/**
 * #8 — Insert a new property into an object literal / config map. With `afterProperty`,
 * the entry is placed right after that property (inheriting its line indent); otherwise
 * it becomes the first entry of the first object literal. validate() is the soundness
 * backstop — a malformed insertion is refused, never written.
 */
export function universalInsertProperty(
  file: string,
  original: string,
  key: string,
  value: string,
  afterProperty?: string,
): PropertyEditResult {
  const ext = file.slice(file.lastIndexOf('.'));
  const style = detectPropertyStyle(ext);
  const sep = style === 'equals' ? ' = ' : ': ';
  const entry = `${key}${sep}${value}`;
  let newText: string;
  if (afterProperty) {
    const akey = escapeRegex(afterProperty);
    const anchorRe =
      style === 'equals'
        ? new RegExp(`${akey}[ \\t]*=[ \\t]*[^;,\\n}]+`)
        : new RegExp(`['"]?${akey}['"]?[ \\t]*:[ \\t]*[^,\\n;}]+`);
    const m = anchorRe.exec(original);
    if (!m) throw new Error(`anchor property "${afterProperty}" not found in ${file}`);
    const lineStart = original.lastIndexOf('\n', m.index) + 1;
    const indent = (original.slice(lineStart, m.index).match(/^[ \t]*/) ?? [''])[0];
    let insertAt = m.index + m[0].length;
    let tail = original.slice(insertAt);
    const hadComma = /^[ \t]*,/.test(tail);
    if (hadComma) tail = tail.replace(/^[ \t]*,/, '');
    newText = `${original.slice(0, insertAt)},\n${indent}${entry},${tail}`;
    if (!hadComma) newText = newText.replace(`${entry},${tail}`, `${entry}${tail}`);
  } else {
    const brace = original.indexOf('{');
    if (brace === -1) throw new Error(`no object literal ('{') found in ${file}`);
    newText = `${original.slice(0, brace + 1)}\n  ${entry},${original.slice(brace + 1)}`;
  }
  return { newText, key, newValue: value, validation: validate(file, original, newText), zones: computeZones(original, newText) };
}

/**
 * Rename a property key, preserving the value.
 * Matches: oldKey: value or oldKey = value based on style.
 */
export function universalRenamePropertyKey(
  file: string,
  original: string,
  property: string,
  newKey: string,
): PropertyEditResult {
  const style = detectPropertyStyle(file.slice(file.lastIndexOf('.')));

  let pattern: RegExp;
  let match: RegExpExecArray | null;

  if (style === 'colon') {
    pattern = new RegExp(`(['"]?)(${escapeRegex(property)})(['"]?)(\\s*:\\s*.+)`, 'g');
    match = pattern.exec(original);
  } else if (style === 'equals') {
    pattern = new RegExp(`(${escapeRegex(property)})(\\s*=\\s*.+)`, 'g');
    match = pattern.exec(original);
  } else if (style === 'yaml') {
    pattern = new RegExp(`(^[ \\t]*)(${escapeRegex(property)})(\\s*:\\s*.+)$`, 'gm');
    match = pattern.exec(original);
  } else {
    pattern = new RegExp(`(^[ \\t]*)(${escapeRegex(property)})(\\s*=\\s*.+)$`, 'gm');
    match = pattern.exec(original);
  }

  if (!match) throw new Error(`property "${property}" not found in ${file}`);
  if (pattern.exec(original)) throw new Error(`ambiguous: property "${property}" appears multiple times`);

  // The old key is in capture group 2 (the identifier itself)
  const before = original.slice(0, match.index);
  const after = original.slice(match.index + match[0].length);

  // Reconstruct with new key
  let result: string;
  if (style === 'colon') {
    const quote = match[1] || '';
    result = before + quote + newKey + quote + match[4] + after;
  } else if (style === 'equals') {
    result = before + newKey + match[2] + after;
  } else {
    // yaml/toml line-based
    result = before + (match[1] || '') + newKey + match[3] + after;
  }

  return {
    newText: result,
    key: property,
    newKey,
    validation: validate(file, original, result),
    zones: computeZones(original, result),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
