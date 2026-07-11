## Why

Monte Carlo simulation runs 1M iterations per sweep combination, and complex configurations can take noticeable time. Users frequently return to the same parameter combinations — especially when comparing presets or tweaking outcomes. Storing results in localStorage eliminates redundant computation and delivers instant feedback for previously-run configurations.

## What Changes

- New `result-cache` module that stores `SimResult[]` in localStorage, keyed by a deterministic fingerprint of the simulation parameters (pool, reroll, pipeline, outcomes, sweep).
- On simulation completion, results are automatically persisted to the cache.
- On configuration change, the app checks the cache: if a matching fingerprint exists, results are restored instantly without re-running the simulation.
- A "Recalculate" button is available when cached results are displayed, allowing the user to bypass the cache and re-run the simulation.
- A "Clear cache" button clears all cached simulation results from localStorage.
- Cache uses lz-string compression (consistent with my-presets persistence).

## Capabilities

### New Capabilities
- `result-cache`: localStorage-based result caching with config fingerprinting, auto-save on simulation completion, auto-restore on config change, recalculate bypass, and cache clearing.

### Modified Capabilities
- `simulation`: add cache-hit path — when results are restored from cache, no worker is spawned and no simulation runs. Add cache-bypass flag for recalculate.
- `ui`: add "Recalculate" button label/states alongside primary "Roll the Dice" button; add "Clear cache" button accessible from result area; add cache-hit indicator ("Restored from cache") in result display.

## Impact

- New file: `src/state/result-cache.ts` — cache read/write/clear logic
- Modified: `src/app.tsx` — integrate cache into simulation lifecycle (save on complete, check on config change, bypass on recalculate, clear action)
- Modified: `src/state/app-state.ts` — expose config fingerprint as a computed signal
- Modified: `src/components/ResultView.tsx` or `src/components/OddsTape.tsx` — cache-hit indicator
- New localStorage key: `dice-calc-results` (lz-string compressed)
- No type changes needed — `SimResult[]`, `SavedConfig` fingerprint all exist
