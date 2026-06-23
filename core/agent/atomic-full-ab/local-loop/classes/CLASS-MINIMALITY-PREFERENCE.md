# CLASS-MINIMALITY-PREFERENCE

## Definition
When a task explicitly asks for a "minimal, correct change" (as all SWE-bench tasks do), the agent should prefer
the SMALLEST change that fixes the reported issue over more comprehensive fixes that address related edge cases.

## Problem Instance (psf__requests-1921 L01 v2)
The task explicitly states: "Make the minimal, correct change. When you are done, stop."

### Minimal (Native - 6 lines, 3+/3-)
```python
# Remove keys that are set to None.
none_keys = [k for k, v in merged_setting.items() if v is None]
for key in none_keys:
    del merged_setting[key]
```
This fixes the reported bug: when `session.headers['Accept-Encoding'] = None`, the header is removed.

### Over-Engineered (Atomic - 13 lines, 10+/3-)
```python
# Added edge case handling for request_setting=None
if request_setting is None:
    if not isinstance(session_setting, Mapping):
        return session_setting
    # Remove keys that are set to None in session defaults.
    result = dict_class(to_key_val_list(session_setting))
    for (k, v) in list(result.items()):
        if v is None:
            del result[k]
    return result

# Main fix
for (k, v) in list(merged_setting.items()):
    if v is None:
        del merged_setting[k]
```
This ALSO fixes the reported bug, but additionally handles the edge case where `request_setting is None`.
While semantically superior, it violates the "minimal" instruction.

## Why Minimality Matters
1. **SWE-bench scoring**: The official SWE-bench harness rewards MINIMAL changes that pass all tests
2. **Code review**: Human reviewers prefer focused, minimal changes
3. **Risk**: Larger changes have higher risk of introducing regressions
4. **Task fidelity**: The task explicitly asks for minimal change

## Atomic Capability Gap
The atomic agent is not respecting the "minimal" instruction because:
1. It doesn't have a cost function that penalizes larger diffs
2. It doesn't recognize when an edge case is outside the task scope
3. It over-optimizes for semantic completeness over task compliance

## Fix Strategy
1. **Add minimality scoring**: In the atomic governance loop, add a metric that penalizes larger diffs
2. **Scope detection**: Use the task description to determine what's in-scope vs out-of-scope
3. **Stop condition**: When the minimal fix is found, STOP exploring edge cases unless explicitly asked

## Test Case
```python
# Task: "Fix the bug where session.headers[key] = None sends 'None' as value"
# Minimal fix: change the loop to iterate over merged_setting
# Non-minimal: also handle request_setting=None edge case
```

## Verification
- Diff size: Minimal solution should have the smallest possible diff that passes tests
- Test coverage: Minimal solution should pass all tests that the non-minimal solution passes
- Scope: Minimal solution should not address issues not mentioned in the task

## Status
- **OPEN**: Identified in L01-R001 v2
- **Priority**: HIGH (blocks dominance claim on SWE-bench)
- **Impact**: Affects all SWE-bench tasks that expect minimal changes
- **Next**: Add minimality preference to atomic governance
