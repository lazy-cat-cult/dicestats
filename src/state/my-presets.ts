import type { MyPreset, PresetConfig } from '@/types';
import { PRESETS } from '@/domain/presets';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

const MY_PRESETS_KEY = 'dice-calc-my-presets';
const FAVORITES_KEY = 'dice-calc-favorites';
const MAX_PRESETS = 100;

interface MyPresetsStorage {
  version: 1;
  presets: MyPreset[];
}

function nowISO(): string {
  return new Date().toISOString();
}

export function loadMyPresets(): MyPreset[] {
  try {
    const raw = localStorage.getItem(MY_PRESETS_KEY);
    if (!raw) return [];
    const json = decompressFromBase64(raw);
    if (!json) return [];
    const data = JSON.parse(json) as MyPresetsStorage;
    return data.presets ?? [];
  } catch {
    return [];
  }
}

export function saveMyPresets(presets: MyPreset[]): void {
  try {
    const data: MyPresetsStorage = { version: 1, presets };
    const compressed = compressToBase64(JSON.stringify(data));
    localStorage.setItem(MY_PRESETS_KEY, compressed);
  } catch {
    return;
  }
}

export function addOrUpdateMyPreset(config: PresetConfig): 'ok' | 'limit_reached' {
  const presets = loadMyPresets();
  const existingIdx = presets.findIndex((p) => p.id === config.id);
  if (existingIdx >= 0) {
    presets[existingIdx] = { ...config, createdAt: presets[existingIdx].createdAt, updatedAt: nowISO() } as MyPreset;
    saveMyPresets(presets);
    return 'ok';
  }
  if (presets.length >= MAX_PRESETS) return 'limit_reached';
  presets.unshift({ ...config, createdAt: nowISO(), updatedAt: nowISO() } as MyPreset);
  saveMyPresets(presets);
  return 'ok';
}

export function removeMyPreset(id: string): void {
  const presets = loadMyPresets().filter((p) => p.id !== id);
  saveMyPresets(presets);
}

export function renameMyPreset(id: string, newName: string): void {
  const presets = loadMyPresets();
  const p = presets.find((p) => p.id === id);
  if (!p) return;
  p.name = newName;
  p.updatedAt = nowISO();
  saveMyPresets(presets);
}

export function copyMyPreset(id: string): 'ok' | 'limit_reached' {
  const presets = loadMyPresets();
  const source = presets.find((p) => p.id === id);
  if (!source) return 'ok';
  if (presets.length >= MAX_PRESETS) return 'limit_reached';
  const copy: MyPreset = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (copy)`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  presets.unshift(copy);
  saveMyPresets(presets);
  return 'ok';
}

export function copyStandardToMyPresets(presetId: string): 'ok' | 'limit_reached' {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return 'ok';
  const presets = loadMyPresets();
  if (presets.length >= MAX_PRESETS) return 'limit_reached';
  const existingWithName = presets.find((p) => p.name === preset.name);
  const name = existingWithName ? `${preset.name} (copy)` : preset.name;
  const copy: MyPreset = {
    ...preset,
    id: crypto.randomUUID(),
    name,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  presets.unshift(copy);
  saveMyPresets(presets);
  return 'ok';
}

export function isStandardPreset(id: string): boolean {
  return PRESETS.some((p) => p.id === id);
}

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveFavorites(ids: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
  } catch {
    return;
  }
}

export function toggleFavorite(id: string, current: Set<string>): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
