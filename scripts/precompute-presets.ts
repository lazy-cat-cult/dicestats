/* eslint-disable no-console */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { SimResult, DicePool, RerollCondition, NamedValue, Outcome } from '../src/types';
import { parsePreset } from '../src/utils/yaml';
import { runPresetSimulation } from './sim-runner';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_DIR = path.resolve(__dirname, '..', 'presets');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'src', 'data', 'precomputed');

interface PrecomputedEntry {
  sourceHash: string;
  timestamp: string;
  configFingerprint: string;
  results: SimResult[];
}

function computeSourceHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function computeConfigFingerprint(pool: DicePool, reroll: RerollCondition[], pipeline: NamedValue[], outcomes: Outcome[], sweep: { x: number[]; y: number[] | null; xName: string; yName: string }): string {
  return JSON.stringify({ pool, reroll, pipeline, outcomes, sweep }, (_key, value) => {
    if (_key === 'id' && typeof value === 'string') return undefined;
    return value;
  });
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const yamlFiles = fs.readdirSync(PRESETS_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  console.log(`Found ${yamlFiles.length} preset(s)\n`);

  for (const filename of yamlFiles) {
    const filePath = path.join(PRESETS_DIR, filename);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const sourceHash = computeSourceHash(rawContent);
    const presetId = filename.replace(/\.(yaml|yml)$/, '');
    if (!/^[a-zA-Z0-9_-]+$/.test(presetId)) {
      console.error(`  SKIP: invalid preset filename "${filename}" (must be alphanumeric + _-)`);
      continue;
    }

    const outputPath = path.join(OUTPUT_DIR, `${presetId}.json`);

    const existing = fs.existsSync(outputPath)
      ? JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as PrecomputedEntry
      : null;

    if (existing && existing.sourceHash === sourceHash && existing.results && existing.results.length > 0) {
      console.log(`${presetId}: up to date (hash ${sourceHash})`);
      continue;
    }

    console.log(`${presetId}: computing...`);
    const startTime = Date.now();

    try {
      const config = parsePreset(rawContent, filePath);
      const fp = computeConfigFingerprint(config.pool, config.rerollConditions, config.pipeline, config.outcomes, config.sweep);
      const simResults = runPresetSimulation(
        config.pool, config.rerollConditions, config.pipeline, config.outcomes, config.sweep, config.name
      );

      const entry: PrecomputedEntry = {
        sourceHash,
        timestamp: new Date().toISOString(),
        configFingerprint: fp,
        results: simResults,
      };

      fs.writeFileSync(outputPath, JSON.stringify(entry, null, 2), 'utf-8');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  done in ${elapsed}s — ${simResults.length} result(s), ${simResults.length * 1_000_000} total iterations`);
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\nPrecompute complete.');
}

main();
