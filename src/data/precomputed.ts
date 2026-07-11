import type { SimResult } from '@/types';

interface PrecomputedEntry {
  sourceHash: string;
  timestamp: string;
  configFingerprint: string;
  results: SimResult[];
}

const modules = import.meta.glob<{ default: PrecomputedEntry }>(['./precomputed/*.json'], { eager: false });

export async function loadPrecomputedMap(): Promise<Map<string, SimResult[]>> {
  const map = new Map<string, SimResult[]>();
  const results = await Promise.all(
    Object.values(modules).map(async (loader) => {
      const module = await loader();
      return module.default;
    })
  );
  for (const entry of results) {
    if (entry && entry.configFingerprint && entry.results) {
      map.set(entry.configFingerprint, entry.results);
    }
  }
  return map;
}
