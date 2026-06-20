# SWE-bench-Verified: pallets__flask-5014

repo: pallets/flask  base_commit: 7ee9ceb71e868944a46e1ff00b506772a53a4f1d

## Problem statement

Require a non-empty name for Blueprints
Things do not work correctly if a Blueprint is given an empty name (e.g. #4944).
It would be helpful if a `ValueError` was raised when trying to do that.


## Instructions (identical for every solver)
- Modify ONLY source files (under `src/`) to fix the issue.
- Do NOT add, modify, or delete any test files — the grader supplies its own tests.
- Make the minimal, correct change. When you are done, stop.
