import type { SimResult } from '@/types';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

const CACHE_KEY = 'dice-calc-results';
const MAX_ENTRIES = 50;

interface ResultCacheEntry {
  fp: string;
  results: SimResult[];
}

interface ResultCacheStore {
  version: 1;
  entries: ResultCacheEntry[];
}

let memoryStore: ResultCacheStore | null = null;

function isValidSimResult(r: unknown): r is SimResult {
  return (
    !!r &&
    typeof r === 'object' &&
    'label' in (r as Record<string, unknown>) &&
    Array.isArray((r as Record<string, unknown>).outcomes) &&
    'totalRolls' in (r as Record<string, unknown>) &&
    typeof (r as Record<string, unknown>).distribution === 'object'
  );
}

function loadStore(): ResultCacheStore {
  if (memoryStore) return memoryStore;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { version: 1, entries: [] };
    const json = decompressFromBase64(raw);
    if (!json) return { version: 1, entries: [] };
    const data = JSON.parse(json);
    if (!Array.isArray(data?.entries)) return { version: 1, entries: [] };
    memoryStore = { version: data.version ?? 1, entries: data.entries };
    return memoryStore;
  } catch {
    return { version: 1, entries: [] };
  }
}

function saveStore(store: ResultCacheStore): void {
  memoryStore = store;
  try {
    const compressed = compressToBase64(JSON.stringify(store));
    localStorage.setItem(CACHE_KEY, compressed);
  } catch {
    return;
  }
}

export function saveResult(fp: string, results: SimResult[]): void {
  if (!results.every(isValidSimResult)) return;
  const store = loadStore();
  const existingIdx = store.entries.findIndex((e) => e.fp === fp);
  const entry: ResultCacheEntry = { fp, results };
  if (existingIdx >= 0) {
    store.entries[existingIdx] = entry;
  } else {
    store.entries.push(entry);
    if (store.entries.length > MAX_ENTRIES) {
      store.entries = store.entries.slice(store.entries.length - MAX_ENTRIES);
    }
  }
  saveStore(store);
}

export function loadResult(fp: string): SimResult[] | null {
  const store = loadStore();
  const entry = store.entries.find((e) => e.fp === fp);
  return entry ? entry.results : null;
}

export function removeResult(fp: string): void {
  const store = loadStore();
  store.entries = store.entries.filter((e) => e.fp !== fp);
  saveStore(store);
}

export function clearAllResults(): void {
  saveStore({ version: 1, entries: [] });
}

export function hasResult(fp: string): boolean {
  return loadResult(fp) !== null;
}

export function seedEntries(toSeed: Map<string, SimResult[]>): void {
  const store = loadStore();
  let changed = false;
  for (const [fp, results] of toSeed) {
    if (store.entries.some((e) => e.fp === fp)) continue;
    if (!results.every(isValidSimResult)) continue;
    store.entries.push({ fp, results });
    changed = true;
  }
  if (store.entries.length > MAX_ENTRIES) {
    store.entries = store.entries.slice(store.entries.length - MAX_ENTRIES);
  }
  if (changed) saveStore(store);
}

export function clearMemoryStore(): void {
  memoryStore = null;
}
