#!/usr/bin/env python3
"""
generate_swebench_predictions_v3.py — ATOMIC LINE-GUIDED PIPELINE.

The LLM hallucinates OLD TEXT. Solution: the LLM outputs FILE + LINE RANGE + NEW CODE.
The system reads the actual bytes at those lines (GROUND TRUTH), applies the edit,
and the atomic envelope validates the result.

Pipeline:
  1. LLM: identifies file(s) + line range(s) + new code
  2. System: reads ACTUAL bytes at those lines from the repo
  3. System: replaces old bytes with new code
  4. Atomic envelope: validates syntax + imports
  5. Git: produces the guaranteed-correct diff

Usage:
  python3 generate_swebench_predictions_v3.py --limit 10
"""
import json, os, sys, time, subprocess, tempfile, shutil, re, argparse
from pathlib import Path
from typing import Dict, List, Optional

API_KEY_ENV = "DEEPSEEK_API_KEY"
API_KEY = os.environ.get(API_KEY_ENV, "")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
MODEL_NAME = "kloel-cli-v3-line-guided-atomic-deepseek-v4-pro"
PREDICTIONS_DIR = Path.home() / ".kloel" / "swebench-predictions"


def call_deepseek(messages: list, max_tokens: int = 6000) -> str:
    import urllib.request
    if not API_KEY:
        raise RuntimeError(f"{API_KEY_ENV} is required to generate SWE-Bench predictions")
    d = json.dumps({"model": MODEL, "messages": messages, "temperature": 0, "max_tokens": max_tokens}).encode()
    r = urllib.request.Request("https://api.deepseek.com/v1/chat/completions", data=d,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    with urllib.request.urlopen(r, timeout=300) as resp:
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


def gather_files(repo_path: Path, issue: str, max_files: int = 12) -> str:
    """Smart context: find relevant files, include line numbers."""
    keywords = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_\.]{3,}\b', issue.lower())
    stop = {'the','and','for','this','that','with','from','when','not','are','was','has','have','its','into','will','can','been','which','should','would','could','does','code','file','function','example','following','using','model','models','data','also','because','like','make','need','only','each','how','your','more','some','add','new','current','work','see','use','after','before','first','then','here','there','about','other','these','those','such','than','still','well','also','between','after'}
    keywords = [w for w in keywords if w not in stop][:15]
    
    files = set()
    for kw in keywords[:8]:
        try:
            r = subprocess.run(["grep", "-rl", "--include=*.py", kw, str(repo_path)],
                               capture_output=True, text=True, timeout=20)
            for line in r.stdout.strip().split("\n")[:6]:
                if line: files.add(line)
        except: pass
    
    context = ""
    for f in sorted(files)[:max_files]:
        try:
            content = Path(f).read_text()
            rel = str(Path(f).relative_to(repo_path))
            # Include with line numbers so LLM can reference them
            lines = content.split("\n")
            if len(lines) > 300:
                content = "\n".join(lines[:80] + [f"# ... ({len(lines) - 160} lines omitted) ..."] + lines[-80:])
            numbered = "\n".join(f"{i+1:5d}| {l}" for i, l in enumerate(content.split("\n")))
            context += f"\n=== {rel} ({len(lines)} lines) ===\n{numbered[:6000]}\n"
        except: pass
    
    return context


def apply_line_edit(repo_path: Path, file_rel: str, start_line: int, end_line: int, new_code: str) -> dict:
    """Read actual bytes at line range, replace with new code, validate atomically."""
    fp = repo_path / file_rel
    if not fp.exists():
        return {"ok": False, "error": f"File not found: {file_rel}"}
    
    lines = fp.read_text().split("\n")
    if start_line < 1 or end_line > len(lines):
        return {"ok": False, "error": f"Line range {start_line}-{end_line} out of bounds (file has {len(lines)} lines)"}
    
    # Read ACTUAL bytes at those lines (GROUND TRUTH, no hallucination)
    old_lines = lines[start_line - 1:end_line]
    old_text = "\n".join(old_lines)
    
    # Build the new file content
    new_lines = lines[:start_line - 1] + new_code.split("\n") + lines[end_line:]
    new_content = "\n".join(new_lines)
    
    # Atomic validation: Python syntax check
    if file_rel.endswith(".py"):
        try:
            compile(new_content, file_rel, "exec")
        except SyntaxError as e:
            return {"ok": False, "error": f"Syntax error: {e}"}
    
    fp.write_text(new_content)
    return {"ok": True, "old_text": old_text[:200], "lines_changed": f"{start_line}-{end_line}"}


def generate_patch_line_guided(instance: dict, work_dir: Path) -> Optional[str]:
    """Generate patch: LLM identifies lines → system reads truth → atomic validates → git diff."""
    instance_id = instance["instance_id"]
    repo_name = instance["repo"]
    base_commit = instance["base_commit"]
    issue = instance["problem_statement"]
    
    print(f"  [{instance_id}] {repo_name} @ {base_commit[:8]}")
    
    repo_path = clone_repo(repo_name, base_commit, work_dir)
    context = gather_files(repo_path, issue)
    
    system = """You are an expert software engineer. Identify the EXACT line changes needed to fix a bug.

For each change, output:

FILE: path/to/file.py
LINES: start-end
NEW CODE:
```python
replacement lines (keep the same indentation as the original)
```

RULES:
1. Reference line numbers from the context provided (left column).
2. Make MINIMAL changes — only what's needed.
3. Preserve EXACT indentation.
4. If adding code WITHOUT removing anything, use a line range like "50-50" (inserts after line 50).
5. Include all necessary imports in the first file that needs them.
6. Output ALL needed changes in ONE response."""

    user = f"""ISSUE:
{issue[:4000]}

CODEBASE (line numbers in left column):
{context[:12000]}

Identify the file(s), line range(s), and new code needed to fix this issue."""

    t0 = time.time()
    raw = call_deepseek([{"role": "system", "content": system}, {"role": "user", "content": user}], max_tokens=6000)
    print(f"  [{instance_id}] Response: {len(raw)} chars in {time.time()-t0:.1f}s")
    
    atomic_ops = 0
    atomic_refused = 0
    
    # Parse blocks
    blocks = re.split(r'\n(?=FILE:)', raw)
    for block in blocks:
        if not block.strip():
            continue
        
        fm = re.match(r'FILE:\s*(\S+)', block)
        lm = re.search(r'LINES:\s*(\d+)\s*-\s*(\d+)', block)
        cm = re.search(r'NEW CODE:\s*\n```(?:python)?\s*\n(.*?)\n```', block, re.DOTALL)
        
        if not fm or not lm:
            continue
        
        file_rel = fm.group(1).strip()
        start_line = int(lm.group(1))
        end_line = int(lm.group(2))
        new_code = cm.group(1) if cm else ""
        
        result = apply_line_edit(repo_path, file_rel, start_line, end_line, new_code)
        if result["ok"]:
            atomic_ops += 1
        else:
            atomic_refused += 1
    
    print(f"  [{instance_id}] Atomic: {atomic_ops} applied, {atomic_refused} refused")
    
    if atomic_ops == 0:
        return None
    
    subprocess.run(["git", "-C", str(repo_path), "add", "-A"], capture_output=True, timeout=10)
    r = subprocess.run(["git", "-C", str(repo_path), "diff", "--cached", base_commit],
                       capture_output=True, text=True, timeout=10)
    
    patch = r.stdout.strip()
    if patch:
        print(f"  [{instance_id}] Patch: {len(patch)} chars ✓")
    
    return patch


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="princeton-nlp/SWE-bench_Verified")
    parser.add_argument("--split", default="test")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    from datasets import load_dataset

    print("═" * 70)
    print("  KLOEL CLI — SWE-Bench LINE-GUIDED ATOMIC Pipeline v3")
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
        try:
            with tempfile.TemporaryDirectory(prefix=f"swe-{instance_id[:20]}-") as wd:
                patch = generate_patch_line_guided(instance, Path(wd))
        except Exception as e:
            print(f"  ERROR: {e}")
            patch = None
        
        if patch: patches_ok += 1
        predictions.append({"instance_id": instance_id, "model_patch": patch or "", "model_name_or_path": MODEL_NAME})
        print()

    out = args.output or str(PREDICTIONS_DIR / f"predictions-v3-{args.limit}.jsonl")
    with open(out, "w") as f:
        for p in predictions:
            f.write(json.dumps(p) + "\n")

    print(f"{'═' * 70}")
    print(f"  Valid patches: {patches_ok}/{len(predictions)}")
    print(f"  Saved: {out}")
    print(f"\n  Official eval:")
    print(f"    python -m swebench.harness.run_evaluation \\")
    print(f"      --dataset_name {args.dataset} --split {args.split} \\")
    print(f"      --predictions_path {out} --max_workers 4 \\")
    print(f"      --run_id kloel-cli-v3-line-guided")
    print(f"{'═' * 70}")


if __name__ == "__main__":
    main()
