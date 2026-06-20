# vendor/aider-atomic

Complete salvage of the **AIDER atomic edit-format variant** from
`/Users/danielpenin/aider-official-submission/aider` (a fork of `Aider-AI/aider`,
origin `github.com/danielgonzagat/aider`, branch `bench/atomic-deepseek-polyglot-official`).

This supersedes the prior union's 13-file *diff* vendoring: it ships the **full file
copies** of every atomic-touched file plus the complete unified diff vs upstream, so the
aider integration is reconstructable in full (a diff alone loses surrounding context).

## What `atomic` is (the edit format)

`aider/coders/atomic_coder.py` defines `AtomicWholeFileCoder` (`edit_format = "atomic"`),
a `WholeFileCoder` subclass that adds **pre-write syntax validation + atomic replacement**:

- `validate_atomic_candidate()` — per-language candidate validation before any write:
  Python (`py_compile`), JS/MJS/CJS (`node --check`), Go (`gofmt`), Rust (`rustc --emit
  metadata`, or full `cargo check` in a copied crate when a `Cargo.toml` ancestor exists).
- `atomic_write_text()` — temp-file + `os.replace()` atomic swap (no torn writes).
- `AtomicWholeFilePrompts` — system/reminder prompts forcing complete file listings only,
  with explicit "atomic validation rejects syntax-invalid code; return corrected listings".
- `get_edits()` filters out listings for files not in chat (raises `AtomicIgnoredFileListings`).
- `apply_edits()` raises `AtomicValidationFailed` (with stdout/stderr tail) instead of
  persisting a syntactically-broken file.

## Files (full copies, complete integration)

| Path | Role |
|---|---|
| `aider/coders/atomic_coder.py` | The atomic edit-format implementation (net-new file) |
| `aider/coders/__init__.py` | Registers `AtomicWholeFileCoder` in the coder list |
| `aider/coders/wholefile_coder.py` | Base coder + atomic integration hooks (`_normalize_filename_from_chat_files`, fence/filename handling) |
| `aider/linter.py` | Linter changes used by the atomic validation path |
| `benchmark/modal_runner.py` | Modal cloud runner for the polyglot benchmark (net-new file; DeepSeek secret pulled from Modal secret, no key in source) |
| `benchmark/test_modal_runner.py` | Tests for the Modal runner (net-new file) |
| `benchmark/benchmark.py` | Benchmark harness with atomic-format wiring |
| `benchmark/Dockerfile` | Benchmark container (multi-language toolchains) |
| `tests/basic/test_wholefile.py` | Wholefile/atomic edit tests |
| `tests/basic/test_linter.py` | Linter tests |
| `aider/website/_data/polyglot_leaderboard.yml` | **Official-shaped result evidence** (see below) |

## Provenance / evidence

- `atomic-vs-upstream.full.diff` — the complete unified diff of the entire atomic
  changeset vs the upstream merge-base `5dc9490bb35f9729ef2c95d00a19ccd30c26339c`
  (13 files, +1413/-72). Ground-truth delta.
- `atomic-commit-log.txt` — the atomic commit history (oneline) from merge-base to HEAD.
- `official-aider-leaderboard-plan.md` — the submission plan (honest official PR path).

### Polyglot result row (in `polyglot_leaderboard.yml`)

```
dirname: 2026-06-18-22-03-54--atomic-deepseek-v4-pro-polyglot-context-c4d9f23-official-r11
model: DeepSeek V4 Pro   edit_format: atomic   test_cases: 225
pass_rate_2: 94.2   pass_num_2: 212   percent_cases_well_formed: 96.9
```

CAVEAT (per prior MEASURED finding): the 94.2% polyglot figure carries the known
HumanEval/polyglot oracle-leak artifact — real attributable lift is lower (~80% class).
The row is preserved verbatim as the official-shaped artifact, NOT as a validated claim.

## Skipped (regenerable / noise — not salvaged)

- `aider/.venv-py311/` (entire vendored venv), `__pycache__/`, `.git/`.
- ~30 `tmp.modal-*` / `tmp.benchmarks/` per-exercise run-dump dirs (regenerable benchmark
  output, hundreds of per-language scratch trees).
- `.serena/` (empty config; no project memories present).
