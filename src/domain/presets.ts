import type { PresetConfig } from '@/types';
import { parsePreset } from '@/utils/yaml';

type PresetModules = Record<string, string>;

const presetModules: PresetModules = import.meta.glob('../../presets/*.yaml', { query: '?raw', import: 'default', eager: true }) as PresetModules;

const loadedPresets: PresetConfig[] = [];
for (const [path, raw] of Object.entries(presetModules)) {
  try {
    loadedPresets.push(parsePreset(raw));
  } catch (e) {
    console.warn(`Failed to parse preset ${path}:`, e);
  }
}
loadedPresets.sort((a, b) => a.id.localeCompare(b.id));

export const PRESETS: readonly PresetConfig[] = loadedPresets;

export const FEATURED_PRESET_IDS: readonly string[] = [
  'dnd-d20',
  'pbta-2d6',
  'blades-in-the-dark',
  'daggerheart-duality',
];

export function getPreset(id: string): PresetConfig | undefined {
  return PRESETS.find((p) => p.id === id);
}
