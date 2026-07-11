## ADDED Requirements

### Requirement: Result Cache Storage
The application SHALL store completed simulation results in localStorage under the key `dice-calc-results`, compressed with lz-string `compressToBase64`. The stored data SHALL be an array of `ResultCacheEntry` objects, each containing the config fingerprint, a timestamp, and the full `SimResult[]`.

```typescript
interface ResultCacheEntry {
  fp: string;
  timestamp: number;
  results: SimResult[];
}

interface ResultCacheStore {
  version: 1;
  entries: ResultCacheEntry[];
}
```

#### Scenario: Cache save on simulation completion
- **GIVEN** a simulation completes and produces `SimResult[]`
- **WHEN** the worker posts a `type: 'result'` message
- **THEN** the results are stored in the cache keyed by the current config fingerprint
- **AND** the cache entry includes a `timestamp` of `Date.now()`

#### Scenario: Cache save uses lz-string compression
- **GIVEN** a set of simulation results to cache
- **WHEN** the cache is written to localStorage
- **THEN** the stored value under `dice-calc-results` is a lz-string compressed base64 payload

#### Scenario: Cache save on localStorage full
- **GIVEN** localStorage is at capacity
- **WHEN** a cache save is attempted
- **THEN** the save silently fails with no error thrown and no user-visible message

### Requirement: Config Fingerprint as Cache Key
The cache key SHALL be the deterministic `JSON.stringify` of the simulation parameters: `{ pool, reroll, pipeline, outcomes, sweep }`. The fingerprint SHALL match exactly the fingerprint computed in the `configDirty` effect in `src/state/app-state.ts`.

#### Scenario: Identical configs share cache entry
- **GIVEN** the user configures pool: 1d20, outcome: "Hit" (rolled >= 10)
- **WHEN** the simulation runs and completes
- **AND** the user later reconfigures to the exact same parameters
- **THEN** the cached results are restored without running a new simulation

#### Scenario: Different sweep values produce different cache entries
- **GIVEN** the user runs a configuration with sweep X ∈ [1, 2, 3]
- **WHEN** the user changes sweep to X ∈ [1, 2, 3, 4]
- **THEN** a new cache entry is created (different fingerprint)
- **AND** the previous entry remains in the cache

### Requirement: Automatic Cache Restore
On every config fingerprint change, the application SHALL check the result cache. If a matching fingerprint entry exists, the cached `SimResult[]` SHALL be restored into `simResults.value` immediately, without spawning a Web Worker or running a simulation.

#### Scenario: Cache hit on config change
- **GIVEN** a cached result for pool: 2d6, outcome: "Success" (rolled >= 7)
- **WHEN** the user applies a preset that sets pool to 2d6 and outcome to "Success" (rolled >= 7)
- **THEN** `simResults.value` is set to the cached `SimResult[]`
- **AND** no Web Worker is spawned
- **AND** the result canvas displays the cached results

#### Scenario: Cache miss on new config
- **GIVEN** no cached result for pool: 3d6
- **WHEN** the user configures pool: 3d6 (new parameters)
- **THEN** `simResults.value` remains empty
- **AND** the user must click "Roll the Dice" to run a simulation

#### Scenario: No cache restore during active simulation
- **GIVEN** a simulation is currently running (`isSimulating.value` is true)
- **WHEN** a config fingerprint change would normally trigger a cache restore
- **THEN** no cache restore occurs
- **AND** the simulation continues normally

### Requirement: Recalculate Bypass
The user SHALL be able to trigger a fresh simulation for a cached configuration via a "Recalculate" action. This action SHALL remove the cache entry for the current fingerprint and run a new simulation from scratch. On completion, the new results SHALL be saved to the cache, overwriting any previous entry for the same fingerprint.

#### Scenario: Recalculate removes cache and re-runs
- **GIVEN** cached results are displayed for the current configuration
- **WHEN** the user clicks "Recalculate"
- **THEN** the cache entry for the current fingerprint is removed
- **AND** a fresh simulation is started in a Web Worker
- **AND** on completion, the new results replace the previous cache entry

#### Scenario: Recalculate produces different results from cache
- **GIVEN** cached results for a configuration
- **WHEN** the user recalculates
- **THEN** the displayed results come from the new simulation (different random seed)
- **AND** the new results are saved to cache

### Requirement: Clear All Cached Results
The application SHALL provide a "Clear cache" action that removes all cached simulation results from localStorage.

#### Scenario: Clear cache removes all entries
- **GIVEN** the cache contains 5 entries from different configurations
- **WHEN** the user clicks "Clear cache"
- **THEN** all 5 entries are removed from localStorage
- **AND** `restoredFromCache` is set to false

#### Scenario: Clear cache does not remove current displayed results
- **GIVEN** cached results are currently displayed on screen
- **WHEN** the user clicks "Clear cache"
- **THEN** the currently displayed results remain visible
- **AND** the next config change will NOT restore from cache (cache is empty)
