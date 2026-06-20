/**
 * gates/py-undef-name.ts — PY-UNDEF-NAME: sound undefined-free-name detector (pyflakes-style, conservative).
 *
 * Catches a decidable NameError class (sympy-13480 shape: a typo'd name like `cothm` for `cotm`): a free
 * name that is USED but never bound anywhere, is not a builtin, and is not imported — a guaranteed
 * NameError at runtime.
 *
 * SOUNDNESS over completeness (L06 — a write-gate that false-positives REFUSES valid Python). Two pillars
 * make this zero-false-positive:
 *  1. ESCAPE HATCHES: the file is SKIPPED (green) whenever it uses any construct that could introduce a
 *     name this gate cannot track — star imports, global/nonlocal, del, exec/eval/globals/locals/vars/
 *     __import__/compile, match/case capture patterns, TYPE_CHECKING blocks.
 *  2. OVER-COLLECTED BINDINGS: every binding form (def/class names, params, every LHS identifier of every
 *     assignment/aug-assign/walrus, for/with/except targets, comprehension targets, import names) is
 *     collected GLOBALLY across all scopes. Over-collection only ever biases toward GREEN — a name bound
 *     ANYWHERE is never flagged — so the only thing left to flag is a name bound NOWHERE.
 * Attribute accesses (`obj.x`), keyword-argument names (`f(x=…)`), and import module paths are excluded
 * from "uses". Cross-scope leakage, class-vs-function scoping, comprehension non-leak → named MISSES
 * (false negatives), never false alarms. Engine: tree-sitter-python.
 */
import type { GateContext, GateModule, GateRed, GateResult } from './contract.js';
import { astNodes } from '../native-bridge.js';
import { langOf } from './perception.js';

const PYTHON_RE = /\.py$/;
// any of these → the file's name resolution is not statically trackable → SKIP (green).
const ESCAPE_HATCH = /\bimport\s+\*|\bglobal\b|\bnonlocal\b|(?:^|\s)del\s|\bexec\s*\(|\beval\s*\(|\bglobals\s*\(|\blocals\s*\(|\bvars\s*\(|__import__|\bcompile\s*\(|^\s*match\b.*:\s*$|^\s*case\b|TYPE_CHECKING/m;

const PY_BUILTINS = new Set([
  'abs','aiter','all','anext','any','ascii','bin','bool','breakpoint','bytearray','bytes','callable','chr',
  'classmethod','compile','complex','copyright','credits','delattr','dict','dir','divmod','enumerate','eval',
  'exec','exit','filter','float','format','frozenset','getattr','globals','hasattr','hash','help','hex','id',
  'input','int','isinstance','issubclass','iter','len','license','list','locals','map','max','memoryview','min',
  'next','object','oct','open','ord','pow','print','property','quit','range','repr','reversed','round','set',
  'setattr','slice','sorted','staticmethod','str','sum','super','tuple','type','vars','zip','__import__',
  // constants / module dunders
  'True','False','None','NotImplemented','Ellipsis','__debug__','__name__','__file__','__doc__','__builtins__',
  '__spec__','__loader__','__package__','__path__','__all__','__dict__','__class__','self','cls',
  // common exceptions
  'BaseException','Exception','ArithmeticError','AssertionError','AttributeError','BlockingIOError','BrokenPipeError',
  'BufferError','BytesWarning','ChildProcessError','ConnectionAbortedError','ConnectionError','ConnectionRefusedError',
  'ConnectionResetError','DeprecationWarning','EOFError','EnvironmentError','FileExistsError','FileNotFoundError',
  'FloatingPointError','FutureWarning','GeneratorExit','IOError','ImportError','ImportWarning','IndentationError',
  'IndexError','InterruptedError','IsADirectoryError','KeyError','KeyboardInterrupt','LookupError','MemoryError',
  'ModuleNotFoundError','NameError','NotADirectoryError','NotImplementedError','OSError','OverflowError',
  'PendingDeprecationWarning','PermissionError','ProcessLookupError','RecursionError','ReferenceError','ResourceWarning',
  'RuntimeError','RuntimeWarning','StopAsyncIteration','StopIteration','SyntaxError','SyntaxWarning','SystemError',
  'SystemExit','TabError','TimeoutError','TypeError','UnboundLocalError','UnicodeDecodeError','UnicodeEncodeError',
  'UnicodeError','UnicodeTranslateError','UnicodeWarning','UserWarning','ValueError','Warning','ZeroDivisionError',
  'WindowsError','BaseExceptionGroup','ExceptionGroup','EncodingWarning',
]);

interface N { type: string; text: string; byteStart: number; byteEnd: number; line: number; column: number; name?: string; }
const idRe = /[A-Za-z_]\w*/g;

const pyUndefNameGate: GateModule = {
  name: 'py-undef-name',
  kind: 'static',

  appliesTo(rel: string): boolean {
    return PYTHON_RE.test(rel) && langOf(rel) === 'python';
  },

  async run(ctx: GateContext): Promise<GateResult> {
    const reds: GateRed[] = [];
    const files = ctx.changedFiles.length > 0 ? ctx.changedFiles : Array.from(ctx.overlay.keys());
    let applicable = false;

    for (const rel of files) {
      if (!this.appliesTo(rel)) continue;
      applicable = true;
      const content = ctx.overlay.get(rel) ?? ctx.readFile(rel);
      if (!content) continue;
      if (ESCAPE_HATCH.test(content)) continue; // not statically trackable → abstain (green)

      const nodes = (await astNodes(content, 'python')) as N[] | null;
      if (!nodes || nodes.length === 0) {
        return { gate: this.name, green: false, reds: [], unjudged: true, unjudgedReason: 'tree-sitter-python grammar not available' };
      }

      // ── over-collect every binding (global across scopes → only biases GREEN) ──
      const bound = new Set<string>();
      const add = (s: string | undefined) => { if (s) bound.add(s); };
      for (const n of nodes) {
        if (n.type === 'function_definition' || n.type === 'class_definition') add(n.name);
      }
      // params (every identifier inside a parameters / lambda_parameters node)
      const paramRanges = nodes.filter((n) => n.type === 'parameters' || n.type === 'lambda_parameters');
      for (const id of nodes) {
        if (id.type !== 'identifier') continue;
        if (paramRanges.some((p) => id.byteStart >= p.byteStart && id.byteEnd <= p.byteEnd)) add(id.text);
      }
      // assignment / augmented_assignment / named_expression: identifiers on the LHS (before the top-level op)
      for (const n of nodes) {
        if (n.type === 'assignment' || n.type === 'augmented_assignment' || n.type === 'named_expression') {
          const opIdx = n.text.search(/[+\-*/%&|^@]?=(?!=)|:=/);
          const lhs = opIdx > 0 ? n.text.slice(0, opIdx) : '';
          for (const m of lhs.matchAll(idRe)) add(m[0]);
        }
      }
      // for / comprehension targets, with-as, except-as, import names (text-level, over-collect)
      for (const m of content.matchAll(/\bfor\s+([A-Za-z_][\w\s,()*]*?)\s+in\b/g)) for (const t of m[1].matchAll(idRe)) add(t[0]);
      for (const m of content.matchAll(/\bas\s+([A-Za-z_]\w*)/g)) add(m[1]);
      const imported = new Set<string>();
      for (const n of nodes) {
        if (n.type === 'import_statement' || n.type === 'import_from_statement') {
          // names brought into scope: each `x`/`x as y` after `import`, or dotted top segment
          const afterImport = n.text.replace(/^[\s\S]*?\bimport\b/, '');
          for (const part of afterImport.split(',')) {
            const mm = /([A-Za-z_][\w.]*)(?:\s+as\s+([A-Za-z_]\w*))?/.exec(part.trim());
            if (mm) { const nm = mm[2] ?? mm[1].split('.')[0]; imported.add(nm); add(nm); }
          }
        }
      }

      // ── free uses: identifiers that are neither attributes nor kwarg-names nor binding-only ──
      const importRanges = nodes.filter((n) => n.type === 'import_statement' || n.type === 'import_from_statement');
      const seen = new Set<string>();
      for (const id of nodes) {
        if (id.type !== 'identifier') continue;
        const nm = id.text;
        if (bound.has(nm) || PY_BUILTINS.has(nm) || imported.has(nm)) continue;
        if (content[id.byteStart - 1] === '.') continue; // attribute access — not a free name
        if (/^\s*=(?!=)/.test(content.slice(id.byteEnd))) continue; // kwarg name or assignment target
        if (importRanges.some((p) => id.byteStart >= p.byteStart && id.byteEnd <= p.byteEnd)) continue; // module path
        if (nm.startsWith('__') && nm.endsWith('__')) continue; // dunder — assume runtime-provided
        const key = `${nm}@${id.line}:${id.column}`;
        if (seen.has(key)) continue;
        seen.add(key);
        reds.push({ file: rel, locus: `L${id.line}:${id.column}`, fact: `name \`${nm}\` is used but never defined, imported, or a builtin (NameError at runtime — typo?)` });
      }
    }

    return {
      gate: this.name,
      green: reds.length === 0,
      reds,
      note: reds.length > 0 ? `${reds.length} undefined name(s)` : 'no undefined names',
      notApplicable: !applicable,
    };
  },
};

export default pyUndefNameGate;
