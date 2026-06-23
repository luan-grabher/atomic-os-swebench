# CLASS-MERGE-FINAL-VALUE-CANONICALITY

## Definition
When merging two dictionaries (or dictionary-like structures) where `None` values should be treated as "remove this key",
the CANONICAL solution is to remove keys whose FINAL MERGED value is `None`, not keys that are `None` in either input source.

## Problem Instance (psf__requests-1921)
The `merge_setting` function in `requests/sessions.py` merges `request_setting` and `session_setting`. When a value is `None`,
it should be treated as "don't include this key in the result".

### Non-Canonical (Atomic R022)
```python
# Remove keys that are set to None.
for (k, v) in request_setting.items():
    if v is None:
        del merged_setting[k]
for (k, v) in session_setting.items():
    if v is None:
        del merged_setting[k]
```
**Issue**: This removes keys if EITHER source has `None`, which can incorrectly remove a key that was explicitly set
to a non-None value in one source when the other source has None.

### Canonical (Native R022)
```python
# Remove keys that are set to None.
none_keys = [k for (k, v) in merged_setting.items() if v is None]
for key in none_keys:
    del merged_setting[key]
```
**Correctness**: This removes keys only if their FINAL value in the merged result is `None`. This better preserves
explicit overrides: if request_setting sets key X to "value" and session_setting has X=None, the merged result
will have X="value" (not None), so it won't be removed.

## General Pattern
This class applies to any merge/dict-update operation where:
1. Two or more dictionary-like inputs are merged
2. `None` values should result in key removal
3. The merge may have override semantics (later inputs override earlier ones)

**Canonical Solution**: After merging all inputs, remove all keys where the final value is `None`.

**Pattern Matching**:
- Function name contains: merge, update, combine, join
- Parameter names contain: setting, dict, map, config, options
- Contains loop that checks for `None` values

## Atomic Capability Gap
The atomic agent needs to understand that checking the FINAL merged value is more canonical than checking
individual input sources. This requires:

1. **Structural perception**: Recognize merge patterns with None-value removal
2. **Semantic understanding**: Understand that final value > input source for canonicity
3. **Edit preference**: Prefer the canonical pattern over source-specific checks

## Fix Strategy
1. Add perception compaction rule: when reading merge functions, highlight the merged result variable
2. Add edit template: for merge functions with None removal, prefer checking the merged dict
3. Add proof gate: verify that the edit preserves request_setting overrides over session_setting

## Test Case
```python
# Setup
a = {'x': 1, 'y': None}
b = {'y': 2, 'z': None}

# Canonical merge
def merge(a, b):
    result = {**a, **b}
    # Canonical: remove based on final value
    none_keys = [k for k, v in result.items() if v is None]
    for k in none_keys:
        del result[k]
    return result

# Expected: {'x': 1, 'y': 2}  (z removed because final value is None)
# Note: a['y']=None is overridden by b['y']=2, so y stays
```

## Verification
- Semantic equivalence: The canonical solution produces the same result for all valid inputs
- Better preservation: Explicit non-None values from any source are preserved
- Simpler: Single check on merged result vs dual checks on both sources

## Status
- **OPEN**: Identified in R022
- **Priority**: HIGH (blocks dominance claim)
- **Impact**: Affects all merge-style tasks with None semantics
- **Next**: Implement canonical pattern recognition in atomic perception layer
