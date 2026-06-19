#!/usr/bin/env python3
import json
import os
import pathlib
import subprocess
import time

import modal

HERE = pathlib.Path(__file__).resolve().parent
APP_NAME = "atomic-aider-polyglot"
DEFAULT_MODEL = "deepseek/deepseek-v4-pro"
DEFAULT_EDIT_FORMAT = "whole"
DEFAULT_RUN_NAME = "atomic-deepseek-v4-pro"

app = modal.App(APP_NAME)
image = modal.Image.from_dockerfile(HERE / "aider-polyglot-modal.Dockerfile", context_dir=HERE)
secret = modal.Secret.from_name("atomic-deepseek")


def run_command(args, cwd="/aider", env=None, timeout=None):
    started = time.time()
    proc = subprocess.run(
        args,
        cwd=cwd,
        env=env,
        text=True,
        capture_output=True,
        timeout=timeout,
    )
    return {
        "args": args,
        "cwd": cwd,
        "status": proc.returncode,
        "elapsedSec": round(time.time() - started, 3),
        "stdoutTail": proc.stdout[-6000:],
        "stderrTail": proc.stderr[-6000:],
    }


@app.function(image=image, secrets=[secret], timeout=1800, cpu=2, memory=4096)
def environment_smoke():
    checks = [
        run_command(["python3", "--version"]),
        run_command(["python3", "-c", "import aider; print(aider.__version__)"]),
        run_command(["git", "-C", "/aider", "rev-parse", "--short", "HEAD"]),
        run_command(["python3", "benchmark/benchmark.py", "--help"]),
    ]
    return {
        "ok": all(check["status"] == 0 for check in checks) and bool(os.getenv("DEEPSEEK_API_KEY")),
        "mode": "smoke",
        "provider": "deepseek",
        "model": DEFAULT_MODEL,
        "deepseekKeyPresent": bool(os.getenv("DEEPSEEK_API_KEY")),
        "checks": checks,
    }


@app.function(image=image, secrets=[secret], timeout=21600, cpu=4, memory=16384)
def run_benchmark(
    num_tests: int = 1,
    threads: int = 1,
    model: str = DEFAULT_MODEL,
    edit_format: str = DEFAULT_EDIT_FORMAT,
    run_name: str = DEFAULT_RUN_NAME,
    tries: int = 1,
    keywords: str = "",
):
    if not os.getenv("DEEPSEEK_API_KEY"):
        return {"ok": False, "mode": "benchmark", "blockers": ["DEEPSEEK_API_KEY missing in Modal secret atomic-deepseek"]}

    env = os.environ.copy()
    env.update({
        "AIDER_ANALYTICS_DISABLE": "true",
        "AIDER_DOCKER": "1",
        "AIDER_BENCHMARK_DIR": "/benchmarks",
        "HISTFILE": "/tmp/.aider-benchmark-history",
    })

    command = [
        "python3",
        "benchmark/benchmark.py",
        run_name,
        "--model",
        model,
        "--edit-format",
        edit_format,
        "--threads",
        str(threads),
        "--tries",
        str(tries),
        "--exercises-dir",
        "polyglot-benchmark",
    ]
    if num_tests > 0:
        command.extend(["--num-tests", str(num_tests)])
    if keywords:
        command.extend(["--keywords", keywords])

    bench = run_command(command, env=env, timeout=21000)
    result_dirs = sorted(pathlib.Path("/benchmarks").glob(f"*--{run_name}*"), key=lambda p: p.stat().st_mtime)
    latest = result_dirs[-1] if result_dirs else None
    stats = None
    if latest:
        stats = run_command(["python3", "benchmark/benchmark.py", "--stats", str(latest)], env=env, timeout=600)

    return {
        "ok": bench["status"] == 0 and (stats is None or stats["status"] == 0),
        "mode": "benchmark",
        "provider": "deepseek",
        "model": model,
        "editFormat": edit_format,
        "numTests": num_tests,
        "threads": threads,
        "tries": tries,
        "keywords": keywords,
        "resultDir": str(latest) if latest else None,
        "benchmark": bench,
        "stats": stats,
    }


@app.local_entrypoint()
def main(
    mode: str = "smoke",
    num_tests: int = 1,
    threads: int = 1,
    model: str = DEFAULT_MODEL,
    edit_format: str = DEFAULT_EDIT_FORMAT,
    run_name: str = DEFAULT_RUN_NAME,
    tries: int = 1,
    keywords: str = "",
):
    if mode == "smoke":
        result = environment_smoke.remote()
    elif mode == "benchmark":
        result = run_benchmark.remote(num_tests, threads, model, edit_format, run_name, tries, keywords)
    else:
        result = {"ok": False, "mode": mode, "blockers": ["mode must be smoke or benchmark"]}
    print(json.dumps(result, indent=2))
