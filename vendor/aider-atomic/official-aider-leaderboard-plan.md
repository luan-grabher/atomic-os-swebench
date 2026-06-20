# Atomic Aider Leaderboard Submission Plan

Goal: produce the strongest honest official Aider leaderboard submission path for Atomic + DeepSeek, using the upstream Aider benchmark harness and a fork that can open a PR to `Aider-AI/aider`.

Architecture: work in a clean fork of `Aider-AI/aider`; first inspect and test the existing benchmark and edit-format machinery; then choose the smallest integration that produces official-shaped `benchmark.py` stats without hiding that Atomic is the editing layer.

Tasks:
- Inspect `benchmark/benchmark.py`, `aider/coders/*`, `aider/args.py`, and `aider/website/_data/polyglot_leaderboard.yml`.
- Add tests before any new behavior if a new edit format or benchmark conversion helper is needed.
- Implement the minimal `atomic` edit format or official-stats bridge that remains reproducible and reviewable.
- Run focused unit tests, then smoke benchmark against a tiny Polyglot subset.
- Run or resume the full official benchmark when environment/API/runtime is ready.
- Edit `aider/website/_data/polyglot_leaderboard.yml` only from generated official stats and open a PR from the fork.

Non-goal: promise maintainer acceptance. Acceptance is external; the controlled target is a truthful PR with reproducible evidence.
