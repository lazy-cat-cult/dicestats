import LZString from 'lz-string';
import type { SavedConfig } from '@/types';
import { buildSavedConfig } from '@/state/app-state';

export function encodeShareUrl(config: SavedConfig): string {
  const json = JSON.stringify(config);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeShareUrl(hash: string): SavedConfig | null {
  if (!hash) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    const config = JSON.parse(json) as SavedConfig;
    if (typeof config !== 'object' || config === null || config.version < 9) {
      return null;
    }
    if (!config.pool || typeof config.pool !== 'object' || !Array.isArray(config.pool.terms)) {
      return null;
    }
    if (!Array.isArray(config.outcomes)) {
      return null;
    }
    if (!Array.isArray(config.rerollConditions)) {
      config.rerollConditions = [];
    }
    if (!Array.isArray(config.pipeline)) {
      config.pipeline = [];
    }
    if (!config.sweep || typeof config.sweep !== 'object') {
      config.sweep = { x: [], y: null, xName: '', yName: '' };
    }
    if (config.sweep.xName == null) config.sweep.xName = '';
    if (config.sweep.yName == null) config.sweep.yName = '';
    return config;
  } catch {
    return null;
  }
}

export function buildShareUrl(): string {
  const config = buildSavedConfig();
  const encoded = encodeShareUrl(config);
  return `${window.location.origin}${window.location.pathname}#${encoded}`;
}
