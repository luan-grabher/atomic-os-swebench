import { describe, it, expect } from 'vitest';
import { runSynthetic, TASK_FAMILIES, runLiveLLM } from '../../vendor/mcp-siblings/atomic-edit-evolution/emergence-benchmark.mjs';
import { runSyntheticFourArm } from '../../vendor/mcp-siblings/atomic-edit-evolution/four-arm-benchmark.mjs';
import { SWEET_SPOT_POOL, selectSweetSpot } from '../../vendor/mcp-siblings/atomic-edit-evolution/sweet-spot-calibrator.mjs';
import { LANG_TASKS, CREATIVE_TASKS } from '../../vendor/mcp-siblings/atomic-edit-evolution/multi-domain-emergence.mjs';

describe('emergence-benchmark', () => {
  it('exports task families', () => {
    expect(TASK_FAMILIES).toBeDefined();
    expect(TASK_FAMILIES.math).toBeDefined();
    expect(TASK_FAMILIES.math.units.length).toBeGreaterThan(0);
    expect(TASK_FAMILIES.programming).toBeDefined();
  });

  it('math verify works', () => {
    const v = TASK_FAMILIES.math.verify;
    expect(v('m1', 270270)).toBe(true);
    expect(v('m1', 999)).toBe(false);
  });

  it('programming verify rejects bad code', () => {
    const v = TASK_FAMILIES.programming.verify;
    expect(v('p8', 'function climbStairs(n){return n}')).toBe(false);
  });

  it('runSynthetic produces results', () => {
    const results = runSynthetic(5); // 5 trials for speed
    expect(results.length).toBe(4); // 4 configs
    expect(results.every(r => typeof r.blindRate === 'number')).toBe(true);
  });
});

describe('four-arm-benchmark', () => {
  it('produces 4-arm results', () => {
    const results = runSyntheticFourArm(5);
    expect(results.length).toBe(4);
    for (const r of results) {
      expect(r).toHaveProperty('raw');
      expect(r).toHaveProperty('funnel');
      expect(r).toHaveProperty('routing');
      expect(r).toHaveProperty('fusion');
    }
  });
});

describe('sweet-spot-calibrator', () => {
  it('has task pool', () => {
    expect(SWEET_SPOT_POOL.math.length).toBeGreaterThan(5);
  });

  it('selectSweetSpot filters correctly', () => {
    const calibration = {
      tasks: [
        { id: 'a', p: 0.5, status: 'sweet' },
        { id: 'b', p: 1.0, status: 'trivial' },
        { id: 'c', p: 0.3, status: 'sweet' },
      ],
    };
    const selected = selectSweetSpot(calibration);
    expect(selected).toEqual(['a', 'c']);
  });
});

describe('multi-domain-emergence', () => {
  it('has Python tasks', () => {
    expect(LANG_TASKS.python.length).toBe(5);
    expect(LANG_TASKS.python[0]).toHaveProperty('id');
    expect(LANG_TASKS.python[0]).toHaveProperty('prompt');
  });

  it('has Go tasks', () => {
    expect(LANG_TASKS.go.length).toBe(3);
  });

  it('has Rust tasks', () => {
    expect(LANG_TASKS.rust.length).toBe(2);
  });

  it('has creative tasks with verifiers', () => {
    expect(CREATIVE_TASKS.length).toBe(3);
    for (const t of CREATIVE_TASKS) {
      expect(typeof t.verify).toBe('function');
    }
  });

  it('haiku verifier counts syllables', () => {
    const haiku = CREATIVE_TASKS.find(t => t.id === 'haiku');
    expect(haiku.verify(['The sun rises bright', 'Over the mountain peaks slowly', 'Birds sing in the dawn'])).toBe(true);
    expect(haiku.verify(['short', 'also short', 'short'])).toBe(false);
  });

  it('acrostic verifier checks first letters', () => {
    const acrostic = CREATIVE_TASKS.find(t => t.id === 'acrostic');
    expect(acrostic.verify(['Always moving', 'Toward the future', 'Only forward', 'Making progress'])).toBe(true);
    expect(acrostic.verify(['Bad', 'Test', 'Other', 'Match'])).toBe(false);
  });
});
