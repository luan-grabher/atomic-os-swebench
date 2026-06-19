/**
 * Language-server registry — universal LSP routing for 24 languages.
 *
 * For operations that genuinely need TYPE resolution (cross-file rename,
 * overload-safe refactors, semantic diagnostics), atomic routes through
 * the appropriate LSP via the lsp-mesh gateway.
 *
 * Vendored LSPs (npm packages in atomic's own node_modules) are preferred
 * over external PATH binaries — zero install, zero PATH dependency.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LspInfo {
  lsp: string;
  bin: string;
  install: string;
  /** true when this LSP is vendored in atomic's node_modules */
  vendored?: boolean;
}

const LSP_BY_GRAMMAR: Record<string, LspInfo> = {
  typescript: { lsp: 'typescript-language-server', bin: 'typescript-language-server', install: 'npm i -g typescript-language-server typescript' },
  python: { lsp: 'pyright', bin: 'pyright-langserver', install: 'vendored in atomic', vendored: true },
  go: { lsp: 'gopls', bin: 'gopls', install: 'go install golang.org/x/tools/gopls@latest' },
  rust: { lsp: 'rust-analyzer', bin: 'rust-analyzer', install: 'brew install rust-analyzer' },
  c: { lsp: 'clangd', bin: 'clangd', install: 'brew install llvm' },
  cpp: { lsp: 'clangd', bin: 'clangd', install: 'brew install llvm' },
  java: { lsp: 'jdtls', bin: 'jdtls', install: 'brew install jdtls' },
  kotlin: { lsp: 'kotlin-language-server', bin: 'kotlin-language-server', install: 'brew install kotlin-language-server' },
  php: { lsp: 'intelephense', bin: 'intelephense', install: 'vendored in atomic', vendored: true },
  swift: { lsp: 'sourcekit-lsp', bin: 'sourcekit-lsp', install: 'built-in macOS' },
  csharp: { lsp: 'csharp-ls-vs', bin: 'csharp-ls-vs', install: 'dotnet tool install -g csharp-ls-vs' },
  ruby: { lsp: 'ruby-lsp', bin: 'ruby-lsp', install: 'gem install ruby-lsp (Ruby >= 3.0)' },
  elixir: { lsp: 'elixir-ls', bin: 'elixir-ls', install: 'brew install elixir-ls' },
  zig: { lsp: 'zls', bin: 'zls', install: 'brew install zls' },
  haskell: { lsp: 'haskell-language-server', bin: 'haskell-language-server', install: 'brew install haskell-language-server && brew install ghc' },
  lua: { lsp: 'lua-language-server', bin: 'lua-language-server', install: 'brew install lua-language-server' },
  graphql: { lsp: 'graphql-lsp', bin: 'graphql-lsp', install: 'vendored in atomic', vendored: true },
  bash: { lsp: 'bash-language-server', bin: 'bash-language-server', install: 'vendored in atomic', vendored: true },
  dockerfile: { lsp: 'docker-langserver', bin: 'docker-langserver', install: 'vendored in atomic', vendored: true },
  json: { lsp: 'vscode-json-language-server', bin: 'vscode-json-language-server', install: 'vendored in atomic', vendored: true },
  yaml: { lsp: 'yaml-language-server', bin: 'yaml-language-server', install: 'vendored in atomic', vendored: true },
  toml: { lsp: 'taplo', bin: 'taplo', install: 'brew install taplo' },
  markdown: { lsp: 'marksman', bin: 'marksman', install: 'brew install marksman' },
};

function atomicNodeModulesBin(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', '.bin');
}

export function lspFor(grammar: string): LspInfo | null {
  return LSP_BY_GRAMMAR[grammar] ?? null;
}

export function lspOnPath(bin: string): boolean {
  // Check vendored in atomic's own node_modules first
  const nmBin = path.join(atomicNodeModulesBin(), bin);
  try { if (fs.existsSync(nmBin)) return true; } catch {}
  // Fall back to system PATH
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const d of dirs) {
    try { if (fs.existsSync(path.join(d, bin))) return true; } catch {}
  }
  return false;
}

export function lspLanguages(): string[] {
  return Object.keys(LSP_BY_GRAMMAR);
}

export interface LspStatus extends LspInfo {
  grammar: string;
  installed: boolean;
}

export function lspStatusFor(grammar: string): LspStatus | null {
  const info = lspFor(grammar);
  if (!info) return null;
  return { grammar, ...info, installed: lspOnPath(info.bin) };
}

export function allLspStatus(): LspStatus[] {
  return Object.keys(LSP_BY_GRAMMAR)
    .map((g) => lspStatusFor(g)!)
    .filter(Boolean)
    .sort((a, b) => a.grammar.localeCompare(b.grammar));
}

export function lspRequirementMessage(grammar: string, op: string): string {
  const info = lspFor(grammar);
  if (!info) {
    return `${op} needs type resolution for "${grammar}" — no LSP configured. Use single-file ops.`;
  }
  const installed = lspOnPath(info.bin);
  if (installed) {
    const source = info.vendored ? 'vendored in atomic node_modules' : 'DETECTED on PATH';
    return `${op} on ${grammar}: "${info.bin}" ${source} — connect via lsp-mesh.`;
  }
  return `${op} on ${grammar}: "${info.bin}" MISSING. INSTALL → ${info.install}`;
}

/** Vendored grammars that ship inside atomic's node_modules (zero external install). */
export function vendoredGrammars(): string[] {
  return Object.entries(LSP_BY_GRAMMAR)
    .filter(([, info]) => info.vendored)
    .map(([g]) => g);
}

export function isLspVendored(grammar: string): boolean {
  return LSP_BY_GRAMMAR[grammar]?.vendored === true;
}
