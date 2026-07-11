## Context

The dice calculator runs Monte Carlo simulations (1M iterations per sweep combination) in a Web Worker. Complex configurations — multi-term dice pools, reroll chains, pipeline resolvers, sweep ranges — can produce noticeable waiting times (seconds to minutes). Users who iteratively fine-tune outcomes or compare slight parameter changes frequently re-run the same configurations.

Currently, `src/state/app-state.ts` already computes a JSON-stringified fingerprint of the full parameter set (pool, reroll, pipeline, outcomes, sweep) to detect when the config has changed (`configDirty`). This fingerprint is a natural cache key.

The project already uses localStorage for three stores: `dice-calc-config` (auto-save), `dice-calc-my-presets` (lz-string compressed), and `dice-calc-favorites`. Cache entries will add a fourth key: `dice-calc-results`.

## Goals / Non-Goals

**Goals:**
- Auto-persist `SimResult[]` to localStorage immediately after a simulation completes, keyed by config fingerprint.
- Auto-restore results from cache when the user sets parameters matching a previously-run configuration — no Web Worker spawn, instant feedback.
- Allow the user to force a fresh simulation ("Recalculate") even when cached results exist.
- Allow the user to clear all cached results with a single action.

**Non-Goals:**
- Cache sample (single-throw) results.
- Cache across devices or sessions with explicit manual save/load.
- Define a cache eviction policy (e.g., LRU, max entries) — the initial version stores all results. LocalStorage capacity will be handled via existing full-storage error patterns (silent failure).
- Cache invalidation on app version changes — config fingerprints are version-independent (they capture the actual parameter values, not UUIDs or indices).

## Decisions

### 1. Cache key: JSON fingerprint of parameters

The fingerprint already computed in `app-state.ts:195-202`:

```ts
const fp = JSON.stringify({
  pool: dicePool.value,
  reroll: rerollConditions.value,
  pipeline: pipeline.value,
  outcomes: outcomes.value,
  sweep: sweep.value,
});
```

**Rationale**: Already exists, deterministic, structural-equality-based (order of terms/conditions/outcomes matters — same as application logic), version-independent. JSON.stringify of deep objects (Expr trees, condition chains) is well-defined since all types are constrained and serializable. No need for a separate hashing step — the JSON string IS the key.

**Alternative considered**: Using a shorter hash (SHA-256, djb2). Rejected because: (a) adds dependency or custom code, (b) JSON.stringify is already used in configDirty tracking and is fast enough for these object sizes, (c) fingerprint is only used as a localStorage key lookup, not transmitted or compared across sessions.

### 2. Storage format: lz-string compressed array of entries

```ts
interface ResultCacheEntry {
  fp: string;           // config fingerprint
  timestamp: number;    // Date.now() when saved
  results: SimResult[]; // the full result set
}

interface ResultCacheStore {
  version: 1;
  entries: ResultCacheEntry[];
}
```

Stored under `localStorage` key `dice-calc-results`, compressed with `lz-string` `compressToBase64` (same pattern as `dice-calc-my-presets`).

**Rationale**: `SimResult[]` can be large (distributions are `Record<number, number>` with hundreds of keys). Compression reduces storage footprint and makes the 5-10MB localStorage limit less likely to be reached. The wrapper structure (`{ version, entries }`) enables future migration.

**Alternative considered**: One localStorage key per fingerprint. Rejected because: (a) localStorage keyspace pollution, (b) listing/counting entries requires iterating all keys, (c) clearing requires enumerate-then-delete vs single removeItem.

### 3. Cache hit check: on config change effect

Add an `effect()` in `app.tsx` or `app-state.ts` that, on every config fingerprint change:
1. Compute current fingerprint
2. Look up in cache store
3. If found and not currently simulating → restore `simResults.value` from cache
4. Set a `restoredFromCache` signal to true

**Rationale**: Reactive, automatic, no user action needed. The configDirty effect already runs on every parameter change — we piggyback on the same trigger.

**Trade-off**: If the user is typing in a text field, the cache check fires on every keystroke (via the fingerprint effect). Mitigation: the effect only triggers meaningful work — a localStorage read of the compressed store + JSON.parse on hits. This is within frame budget. No debounce needed because we're reading (not writing) and we want instant restoration.

### 4. Recalculate: bypass cache flag

When the user clicks "Recalculate" (label change from "Roll the Dice Again" when cached):
- Clear the cache entry for the current fingerprint
- Set `isRecalculating = true`
- Run simulation normally
- On completion, save to cache normally

The recalculate button replaces the "Roll the Dice Again" label when `restoredFromCache` is true.

### 5. Clear cache: separate action

A "Clear cache" button in the result aside (next to "Details & Statistics") that:
- Removes `dice-calc-results` from localStorage
- Sets `restoredFromCache = false`
- Does NOT clear current `simResults` — displayed results remain visible

### 6. No cache for sample results

Sample (single-throw) results are generated per-run and are not part of the cache. The cache only stores full simulation `SimResult[]` from `sim.worker.ts`.

## Risks / Trade-offs

- **[localStorage full]** → Cache save silently fails, same pattern as `persistence.ts`. Cache read on next config change will miss and trigger a fresh simulation — user experience degrades gracefully.
- **[Stale cache after app update]** → Config fingerprints are version-independent (they capture the actual parameter structure). If the app changes how results are displayed but the fingerprint matches, cached results will be shown. Accepted: the Monte Carlo results are forward-compatible — `SimResult` is a stable output format.
- **[Large sweep ranges]** → Multiple sweep results × distributions = large payload per entry. Mitigation: lz-string compression. In practice, a full 10×10 sweep (100 results) with 100+ bucket distributions compresses to <500KB per entry. LocalStorage 5MB limit accommodates ~10-20 complex entries.
- **[Memory: reading entire cache on every config change]** → The entire compressed store (all entries) is read from localStorage on each config fingerprint change. Mitigation: the fingerprint-matched entry is the only one deserialized from the array (O(n) scan). For <50 entries this is negligible.

## Open Questions

None — all decisions are resolved above.
