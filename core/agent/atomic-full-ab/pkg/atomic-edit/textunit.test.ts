import { describe, it, expect } from 'vitest';
import { graphemes, codepoints, utf8Length, utf16Length, codepointLength, graphemeLength, measure, graphemeDiff } from './textunit.js';

describe('textunit', () => {
  it('graphemes splits ASCII', () => { expect(graphemes('abc')).toEqual(['a','b','c']); });
  it('graphemes does not split emoji', () => { expect(graphemes('\u{1F600}')).toHaveLength(1); });
  it('graphemes handles empty', () => { expect(graphemes('')).toEqual([]); });
  it('codepoints splits ASCII', () => { expect(codepoints('ab')).toEqual(['a','b']); });
  it('utf8Length ASCII', () => { expect(utf8Length('a')).toBe(1); });
  it('utf8Length emoji', () => { expect(utf8Length('\u{1F600}')).toBe(4); });
  it('utf16Length ASCII', () => { expect(utf16Length('a')).toBe(1); });
  it('utf16Length emoji', () => { expect(utf16Length('\u{1F600}')).toBe(2); });
  it('codepointLength ASCII', () => { expect(codepointLength('a')).toBe(1); });
  it('codepointLength emoji', () => { expect(codepointLength('\u{1F600}')).toBe(1); });
  it('graphemeLength ASCII', () => { expect(graphemeLength('a')).toBe(1); });
  it('measure ascii:true', () => { expect(measure('hello').ascii).toBe(true); });
  it('measure ascii:false', () => { expect(measure('\u{1F600}').ascii).toBe(false); });
  it('graphemeDiff identical', () => {
    const P = { del: (s: string) => '[-'+s+'-]', add: (s: string) => '{+'+s+'}' };
    expect(graphemeDiff('abc','abc',P)).toBe('abc');
  });
  it('graphemeDiff deletion', () => {
    const P = { del: (s: string) => '[-'+s+'-]', add: (s: string) => '{+'+s+'}' };
    expect(graphemeDiff('abc','ac',P)).toBe('a[-b-]c');
  });
  it('graphemeDiff addition', () => {
    const P = { del: (s: string) => '[-'+s+'-]', add: (s: string) => '{+'+s+'}' };
    expect(graphemeDiff('ac','abc',P)).toBe('a{+b}c');
  });
});
