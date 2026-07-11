## 1. Result Cache Module

- [ ] 1.1 Create `src/state/result-cache.ts` with `ResultCacheEntry` and `ResultCacheStore` types
- [ ] 1.2 Implement `saveResult(fp: string, results: SimResult[]): void` — append entry to compressed localStorage store (spec: `result-cache` — Cache save on simulation completion)
- [ ] 1.3 Implement `loadResult(fp: string): SimResult[] | null` — lookup by fingerprint in compressed store (spec: `result-cache` — Cache hit on config change)
- [ ] 1.4 Implement `removeResult(fp: string): void` — remove single entry by fingerprint (spec: `result-cache` — Recalculate removes cache and re-runs)
- [ ] 1.5 Implement `clearAllResults(): void` — remove entire `dice-calc-results` key (spec: `result-cache` — Clear cache removes all entries)
- [ ] 1.6 Implement `getCacheSize(): number` — return count of cached entries (for optional UI badge)

## 2. Config Fingerprint Export

- [ ] 2.1 Expose `configFingerprint` as a computed signal from `src/state/app-state.ts` using the same `JSON.stringify` pattern as `configDirty` effect (spec: `result-cache` — Config fingerprint as cache key)
- [ ] 2.2 Export `configFingerprint` from `src/state/app-state.ts` for use in `app.tsx`

## 3. Cache-Result Integration in App

- [ ] 3.1 Add `restoredFromCache` signal to `src/app.tsx` (initially `false`) (spec: `ui` — Restored from cache indicator)
- [ ] 3.2 On simulation completion (`type: 'result'` in worker onmessage handler), call `saveResult(configFingerprint.value, msg.results)` (spec: `result-cache` — Cache save on simulation completion)
- [ ] 3.3 Add `configFingerprint` effect: on fingerprint change, check cache, restore `simResults.value` if match found and `!isSimulating.value`; set `restoredFromCache.value = true` (spec: `result-cache` — Automatic cache restore, Cache hit skips worker)

## 4. Recalculate and Clear Cache Actions

- [ ] 4.1 Implement `recalculate()` function: call `removeResult(configFingerprint.value)`, set `restoredFromCache.value = false`, then call `runSimulation()` (spec: `simulation` — Recalculate clears cache and runs)
- [ ] 4.2 Implement `clearCache()` function: call `clearAllResults()`, set `restoredFromCache.value = false`; keep current `simResults.value` intact (spec: `result-cache` — Clear cache does not remove current displayed results)

## 5. UI Changes

- [ ] 5.1 Update primary run button label logic: show "Recalculate" when `hasResults && restoredFromCache.value`; keep "Roll the Dice Again" when `hasResults && !restoredFromCache.value`; keep "Roll the Dice" when no results (spec: `ui` — Recalculate label when cached)
- [ ] 5.2 Wire primary run button `onClick` to `recalculate()` when `restoredFromCache.value` is true; otherwise keep `runSimulation` (spec: `ui` — Recalculate Button)
- [ ] 5.3 Add "Restored from cache" indicator line in result aside, directly above OddsTape/result section, shown only when `restoredFromCache.value` is true (spec: `ui` — Cache indicator shown on restore)
- [ ] 5.4 Add "Clear cache" ghost button in the result section header actions area (next to "Details & Statistics"), shown only when `restoredFromCache.value` is true; `onClick` calls `clearCache()` (spec: `ui` — Clear cache button visible when cached)

## 6. Tests

- [ ] 6.1 Write unit tests for `result-cache.ts`: save, load, remove, clear, empty store, localStorage full fallback
- [ ] 6.2 Write integration test: run simulation → check cache saved → change config fingerprint → check cache restored → recalculate → check cache entry replaced → clear cache → check empty
- [ ] 6.3 Run `npm run typecheck` and `npm run test` — ensure zero new errors

## 7. Verification

- [ ] 7.1 Run full verification loop (`verification-loop` skill) until `Overall: READY for PR`
