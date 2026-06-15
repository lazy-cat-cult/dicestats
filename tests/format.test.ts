import { describe, it, expect } from 'vitest';
import { formatSweepRange } from '@/utils/format';

describe('formatSweepRange', () => {
  it('returns empty string for empty array', () => {
    expect(formatSweepRange([])).toBe('');
  });

  it('returns the single value for a one-element array', () => {
    expect(formatSweepRange([7])).toBe('7');
  });

  it('renders a contiguous ascending range as n..m', () => {
    expect(formatSweepRange([1, 2, 3, 4, 5])).toBe('1..5');
    expect(formatSweepRange([10, 11, 12])).toBe('10..12');
  });

  it('renders a non-contiguous range as {v1, v2, ...}', () => {
    expect(formatSweepRange([5, 10, 15, 20])).toBe('{5, 10, 15, 20}');
  });

  it('truncates non-contiguous lists longer than 5 values with an ellipsis', () => {
    expect(formatSweepRange([1, 3, 5, 7, 9, 11, 13])).toBe('{1, 3, 5, 7, 9, \u2026}');
  });

  it('does not collapse descending sequences into a range', () => {
    expect(formatSweepRange([5, 4, 3])).toBe('{5, 4, 3}');
  });

  it('handles negative and zero values correctly', () => {
    expect(formatSweepRange([-2, -1, 0, 1, 2])).toBe('-2..2');
    expect(formatSweepRange([-5, 0, 5])).toBe('{-5, 0, 5}');
  });

  it('treats two consecutive values as a range', () => {
    expect(formatSweepRange([7, 8])).toBe('7..8');
  });
});
