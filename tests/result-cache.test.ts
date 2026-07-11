import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveResult, loadResult, removeResult, clearAllResults, clearMemoryStore } from '@/state/result-cache';
import { compressToBase64 } from 'lz-string';

const mockResult = { label: '', outcomes: [{ label: 'Hit', probability: 0.5, count: 500000 }], overlaps: [], matchSets: [], totalRolls: 1000000, distribution: { 10: 500000 }, sweepX: null, sweepY: null };

describe('result-cache', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryStore();
  });

  afterEach(() => {
    localStorage.clear();
    clearMemoryStore();
  });

  describe('saveResult and loadResult', () => {
    it('saves and loads a result by fingerprint', () => {
      saveResult('fp-1', [mockResult]);
      const loaded = loadResult('fp-1');
      expect(loaded).toEqual([mockResult]);
    });

    it('returns null for unknown fingerprint', () => {
      const loaded = loadResult('nonexistent');
      expect(loaded).toBeNull();
    });

    it('overwrites existing entry with same fingerprint', () => {
      saveResult('fp-1', [mockResult]);
      const updated = { ...mockResult, label: 'updated', totalRolls: 2000000 };
      saveResult('fp-1', [updated]);
      const loaded = loadResult('fp-1');
      expect(loaded).toEqual([updated]);
    });

    it('stores multiple entries with different fingerprints', () => {
      saveResult('fp-1', [mockResult]);
      saveResult('fp-2', [{ ...mockResult, label: 'fp-2' }]);
      expect(loadResult('fp-1')).toEqual([mockResult]);
      expect(loadResult('fp-2')).toEqual([{ ...mockResult, label: 'fp-2' }]);
    });
  });

  describe('removeResult', () => {
    it('removes a single entry by fingerprint', () => {
      saveResult('fp-1', [mockResult]);
      saveResult('fp-2', [mockResult]);
      removeResult('fp-1');
      expect(loadResult('fp-1')).toBeNull();
      expect(loadResult('fp-2')).toEqual([mockResult]);
    });

    it('does nothing when removing non-existent fingerprint', () => {
      saveResult('fp-1', [mockResult]);
      removeResult('fp-nonexistent');
      expect(loadResult('fp-1')).toEqual([mockResult]);
    });
  });

  describe('clearAllResults', () => {
    it('clears all cached results', () => {
      saveResult('fp-1', [mockResult]);
      saveResult('fp-2', [mockResult]);
      clearAllResults();
      expect(loadResult('fp-1')).toBeNull();
      expect(loadResult('fp-2')).toBeNull();
    });
  });

  describe('corrupted data', () => {
    it('returns null for garbage localStorage data', () => {
      const garbage = compressToBase64('not-json');
      localStorage.setItem('dice-calc-results', garbage);
      const loaded = loadResult('any-fp');
      expect(loaded).toBeNull();
    });

    it('returns empty for raw non-compressed string', () => {
      localStorage.setItem('dice-calc-results', 'raw-garbage');
      const loaded = loadResult('any-fp');
      expect(loaded).toBeNull();
    });

    it('loads entries regardless of store version (forward-compat)', () => {
      const futureStore = compressToBase64(JSON.stringify({ version: 99, entries: [{ fp: 'fp-1', timestamp: 1, results: [mockResult] }] }));
      localStorage.setItem('dice-calc-results', futureStore);
      const loaded = loadResult('fp-1');
      expect(loaded).toEqual([mockResult]);
    });

    it('does not throw on missing JSON in store', () => {
      const badStore = compressToBase64(JSON.stringify({ version: 1, entries: 'not-an-array' }));
      localStorage.setItem('dice-calc-results', badStore);
      expect(() => loadResult('fp-1')).not.toThrow();
    });
  });
});
