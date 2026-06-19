import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from '@/utils/share';
import type { SavedConfig } from '@/types';

const mockConfig: SavedConfig = {
  version: 9,
  pool: {
    terms: [
      { id: 't1', count: { kind: 'literal', value: 1 }, sides: { kind: 'literal', value: 20 }, tag: '', comment: '' },
    ],
  },
  rerollConditions: [],
  pipeline: [],
  outcomes: [
    { id: 'o1', name: 'Hit', conditions: [{ source: 'rolled', op: '>=', value: { kind: 'literal', value: 10 } }], connectors: [], comment: '' },
  ],
  sweep: { x: [], y: null },
};

describe('share URL encode/decode', () => {
  it('round-trips a config', () => {
    const encoded = encodeShareUrl(mockConfig);
    const decoded = decodeShareUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.version).toBe(9);
    expect(decoded!.pool.terms).toHaveLength(1);
    expect(decoded!.outcomes).toHaveLength(1);
    expect(decoded!.outcomes[0]!.name).toBe('Hit');
  });

  it('returns null for empty hash', () => {
    expect(decodeShareUrl('')).toBeNull();
  });

  it('returns null for invalid hash', () => {
    expect(decodeShareUrl('not-valid-lz-string')).toBeNull();
  });

  it('returns null for corrupted data', () => {
    const encoded = encodeShareUrl(mockConfig);
    const corrupted = encoded.slice(0, -5);
    expect(decodeShareUrl(corrupted)).toBeNull();
  });

  it('produces URL-hash-safe output (no illegal URI chars)', () => {
    const encoded = encodeShareUrl(mockConfig);

    expect(encoded).not.toContain(' ');
    expect(encoded).not.toContain('#');
  });

  it('handles config with all fields populated', () => {
    const fullConfig: SavedConfig = {
      version: 9,
      pool: {
        terms: [
          { id: 't1', count: { kind: 'literal', value: 2 }, sides: { kind: 'literal', value: 10 }, tag: 'atk', comment: 'attack dice' },
          { id: 't2', count: { kind: 'literal', value: 1 }, sides: { kind: 'literal', value: 6 }, tag: 'dmg', comment: '' },
        ],
      },
      rerollConditions: [
        { id: 'r1', action: 'explode', conditions: { clauses: [{ field: 'face', operator: 'is_max' }], connectors: [] }, repeat: 5, comment: 'explode on max', tagAs: '' },
      ],
      pipeline: [
        { id: 'p1', name: 'best', source: 'rolled', op: 'max', comment: '' },
      ],
      outcomes: [
        { id: 'o1', name: 'Crit', conditions: [{ source: 'best', op: '>=', value: { kind: 'literal', value: 18 } }], connectors: [], comment: '' },
        { id: 'o2', name: 'Miss', conditions: [{ source: 'best', op: '<', value: { kind: 'literal', value: 10 } }], connectors: [], comment: '' },
      ],
      sweep: { x: [1, 2, 3], y: [10, 20] },
    };
    const encoded = encodeShareUrl(fullConfig);
    const decoded = decodeShareUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.pipeline).toHaveLength(1);
    expect(decoded!.rerollConditions).toHaveLength(1);
    expect(decoded!.sweep.x).toEqual([1, 2, 3]);
    expect(decoded!.sweep.y).toEqual([10, 20]);
  });
});
