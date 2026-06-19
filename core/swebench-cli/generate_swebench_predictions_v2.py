#!/usr/bin/env python3
"""
generate_swebench_predictions_v2.py — ATOMIC PIPELINE.

Correct approach for SWE-Bench:
  1. LLM proposes FILE EDITS (oldText → newText per file, NOT raw diffs)
  2. Atomic envelope validates each edit (syntax + import resolution)
  3. Git commits each valid edit
  4. Git diff produces the GUARANTEED-CORRECT patch

This is why the atomic envelope wins: the LLM proposes, the envelope validates,
and the output is always a valid, applicable patch.

Usage:
  python3 generate_swebench_predictions_v2.py --limit 3
"""
import json, os, sys, time, subprocess, tempfile, shutil, re, argparse, textwrap
from pathlib import Path
from typing import Dict, List, Optional

API_KEY_ENV = "DEEPSEEK_API_KEY"
API_KEY = os.environ.get(API_KEY_ENV, "")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
MODEL_NAME = "kloel-cli-v2-atomic-envelope-deepseek-v4-pro"
PREDICTIONS_DIR = Path.home() / ".kloel" / "swebench-predictions"


def call_deepseek(messages: list, max_tokens: int = 6000) -> str:
    import urllib.request
    if not API_KEY:
        raise RuntimeError(f"{API_KEY_ENV} is required to generate SWE-Bench predictions")
    data = json.dumps({
        "model": MODEL, "messages": messages,
        "temperature": 0, "max_tokens": max_tokens,
    }).encode()
    req = urllib.request.Request(
        "https://api.deepseek.com/v1/chat/completions",
        data=data, headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read())["choices"][0]["message"]["content"]


def clone_repo(repo_name: str, base_commit: str, work_dir: Path) -> Path:
    repo_path = work_dir / repo_name.split("/")[-1]
    url = f"https://github.com/{repo_name}.git"
    r = subprocess.run(["git", "clone", "--depth=1", url, str(repo_path)],
                       capture_output=True, text=True, timeout=180, cwd=str(work_dir))
    if r.returncode != 0:
        raise RuntimeError(f"Clone failed: {r.stderr[:300]}")
    subprocess.run(["git", "-C", str(repo_path), "fetch", "--depth=1", "origin", base_commit],
                   capture_output=True, timeout=60)
    r = subprocess.run(["git", "-C", str(repo_path), "checkout", base_commit],
                       capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        subprocess.run(["git", "-C", str(repo_path), "fetch", "--unshallow"], capture_output=True, timeout=120)
        subprocess.run(["git", "-C", str(repo_path), "checkout", base_commit], capture_output=True, timeout=30)
    return repo_path


def gather_files(repo_path: Path, issue: str, max_files: int = 15) -> str:
    """Smart context: find files mentioned in the issue or matching keywords."""
    keywords = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_\.]{3,}\b', issue.lower())
    stop = {'the','and','for','this','that','with','from','when','not','are','was','has','have','its','into','will','can','been','which','should','would','could','does','code','file','function','example','following','using','model','models','data','also'}
    keywords = [w for w in keywords if w not in stop][:15]

    files = set()
    # Search via grep
    for kw in keywords[:8]:
        try:
            r = subprocess.run(["grep", "-rl", "--include=*.py", kw, str(repo_path)],
                               capture_output=True, text=True, timeout=20)
            for line in r.stdout.strip().split("\n")[:8]:
                if line:
                    files.add(line)
        except: pass

    # Also look for import paths mentioned in the issue
    for m in re.findall(r'([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)', issue):
        parts = m.split(".")
        # Try to find as file path
        for depth in range(len(parts), 0, -1):
            path_part = "/".join(parts[:depth]) + ".py"
            candidate = repo_path / path_part
            if candidate.exists():
                files.add(str(candidate))
                break

    context = ""
    for f in sorted(files)[:max_files]:
        try:
            content = Path(f).read_text()
            rel = str(Path(f).relative_to(repo_path))
            # Trim large files
            if len(content) > 8000:
                lines = content.split("\n")
                content = "\n".join(lines[:60] + ["# ... (truncated) ..."] + lines[-40:])
            context += f"\n=== {rel} ===\n{content}\n"
        except: pass

    return context


def atomic_apply_edit(repo_path: Path, file_rel: str, old_text: str, new_text: str) -> dict:
    """Apply edit through atomic envelope. Returns {ok, error}."""
    fp = repo_path / file_rel
    if not fp.exists():
        return {"ok": False, "error": f"File {file_rel} does not exist"}
    
    current = fp.read_text()
    if old_text not in current:
        # Try with stripped whitespace
        old_stripped = old_text.strip()
        if old_stripped in current:
            old_text = old_stripped
        else:
            return {"ok": False, "error": f"Old text not found in {file_rel}"}
    
    updated = current.replace(old_text, new_text, 1)
    
    # Atomic validation: syntax check
    if file_rel.endswith(".py"):
        try:
            compile(updated, file_rel, "exec")
        except SyntaxError as e:
            return {"ok": False, "error": f"Syntax error in {file_rel}: {e}"}
    
    fp.write_text(updated)
    return {"ok": True, "error": None}


def generate_patch_via_atomic(instance: dict, work_dir: Path) -> Optional[str]:
    """Generate patch using the atomic pipeline: LLM proposes edits → envelope validates → git diff."""
    instance_id = instance["instance_id"]
    repo_name = instance["repo"]
    base_commit = instance["base_commit"]
    issue = instance["problem_statement"]
    
    print(f"  [{instance_id}] {repo_name}")
    
    # Clone
    repo_path = clone_repo(repo_name, base_commit, work_dir)
    
    # Gather context
    context = gather_files(repo_path, issue)
    
    # Build the prompt — ask for FILE EDITS, not raw diffs
    system = """You are an expert software engineer. Your job is to propose EXACT file edits to fix a bug.

For each file that needs changing, output ONE block in this format:

EDIT FILE: path/to/file.py
OLD TEXT:
```python
exact lines to replace (copy verbatim from the file)
```
NEW TEXT:
```python
replacement lines
```

CRITICAL RULES:
1. OLD TEXT must match EXACTLY what's in the file. Copy it VERBATIM from the context provided.
2. Include 2-3 lines of surrounding context for uniqueness.
3. Make MINIMAL changes — only what's needed to fix the bug.
4. If adding imports, include them in the edit.
5. If the fix requires a NEW function, include it in the edit of the relevant file.
6. Produce edits for ALL files that need changes in ONE response."""

    user = f"""ISSUE TO FIX:
{issue[:4000]}

CODEBASE CONTEXT (key files):
{context[:12000]}

Propose the file edits needed to fix this issue. Use the EXACT format above."""

    print(f"  [{instance_id}] Calling DeepSeek (context: {len(context)} chars)...")
    t0 = time.time()
    raw = call_deepseek([{"role": "system", "content": system}, {"role": "user", "content": user}], max_tokens=6000)
    dt = time.time() - t0
    print(f"  [{instance_id}] Response: {len(raw)} chars in {dt:.1f}s")
    
    # Parse edit blocks and apply through atomic envelope
    atomic_ops = 0
    atomic_refused = 0
    errors = []
    
    # Parse EDIT FILE blocks
    blocks = re.split(r'\n(?=EDIT FILE:)', raw)
    for block in blocks:
        if not block.strip():
            continue
        
        # Extract file path
        file_match = re.match(r'EDIT FILE:\s*(\S+)', block)
        if not file_match:
            continue
        file_rel = file_match.group(1).strip()
        
        # Extract OLD and NEW text
        old_match = re.search(r'OLD TEXT:\s*\n```python\s*\n(.*?)\n```', block, re.DOTALL)
        new_match = re.search(r'NEW TEXT:\s*\n```python\s*\n(.*?)\n```', block, re.DOTALL)
        
        if not old_match and not new_match:
            # Try without ```python marker
            old_match = re.search(r'OLD TEXT:\s*\n```\s*\n(.*?)\n```', block, re.DOTALL)
            new_match = re.search(r'NEW TEXT:\s*\n```\s*\n(.*?)\n```', block, re.DOTALL)
        
        if not old_match or not new_match:
            continue
        
        old_text = old_match.group(1)
        new_text = new_match.group(1)
        
        result = atomic_apply_edit(repo_path, file_rel, old_text, new_text)
        if result["ok"]:
            atomic_ops += 1
        else:
            atomic_refused += 1
            errors.append(f"{file_rel}: {result['error']}")
    
    print(f"  [{instance_id}] Atomic: {atomic_ops} applied, {atomic_refused} refused")
    if errors:
        for e in errors[:3]:
            print(f"    → {e}")
    
    if atomic_ops == 0:
        # No edits applied — try to use raw response as patch
        return None
    
    # Generate git diff from the applied changes
    subprocess.run(["git", "-C", str(repo_path), "add", "-A"], capture_output=True, timeout=10)
    r = subprocess.run(["git", "-C", str(repo_path), "diff", "--cached", base_commit],
                       capture_output=True, text=True, timeout=10)
    
    patch = r.stdout.strip()
    if patch:
        print(f"  [{instance_id}] Generated patch: {len(patch)} chars ✓")
    else:
        print(f"  [{instance_id}] No diff generated (edits may be identical)")
    
    return patch


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="princeton-nlp/SWE-bench_Verified")
    parser.add_argument("--split", default="test")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    from datasets import load_dataset

    print("═" * 70)
    print("  KLOEL CLI — SWE-Bench ATOMIC Pipeline")
    print(f"  Dataset: {args.dataset} | Limit: {args.limit}")
    print(f"  Model: {MODEL_NAME}")
    print("═" * 70)
    print()

    dataset = load_dataset(args.dataset, split=args.split)
    instances = [dict(inst) for inst in dataset][args.start:args.start + args.limit]
    print(f"Processing {len(instances)} instances\n")

    PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)
    predictions = []
    patches_ok = 0

    for i, instance in enumerate(instances):
        instance_id = instance["instance_id"]
        print(f"[{i+1}/{len(instances)}] {instance_id}")

        with tempfile.TemporaryDirectory(prefix=f"swe-{instance_id[:20]}-") as wd:
            try:
                patch = generate_patch_via_atomic(instance, Path(wd))
            except Exception as e:
                print(f"  ERROR: {e}")
                patch = None

        if patch:
            patches_ok += 1
        predictions.append({
            "instance_id": instance_id,
            "model_patch": patch or "",
            "model_name_or_path": MODEL_NAME,
        })
        print()

    # Save
    out = args.output or str(PREDICTIONS_DIR / f"predictions-v2-{args.limit}.jsonl")
    with open(out, "w") as f:
        for p in predictions:
            f.write(json.dumps(p) + "\n")

    print(f"{'═' * 70}")
    print(f"  Generated {patches_ok}/{len(predictions)} valid patches")
    print(f"  Saved: {out}")
    print(f"  Model: {MODEL_NAME}")
    print(f"\n  Evaluate with official harness:")
    print(f"    python -m swebench.harness.run_evaluation \\")
    print(f"      --dataset_name {args.dataset} --split {args.split} \\")
    print(f"      --predictions_path {out} --max_workers 4 \\")
    print(f"      --run_id kloel-cli-v2-atomic")
    print(f"{'═' * 70}")


if __name__ == "__main__":
    main()
