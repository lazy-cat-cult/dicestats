## ADDED Requirements

### Requirement: Cache-Hit Result Path
When simulation results are restored from the result cache (config fingerprint match), the application SHALL set `simResults.value` to the cached `SimResult[]` without spawning a Web Worker or invoking `runSimulation()`. The `isSimulating` signal SHALL remain false throughout the cache-hit path.

#### Scenario: Cache hit skips worker
- **GIVEN** cached results exist for the current config fingerprint
- **WHEN** the config changes to match that fingerprint
- **THEN** `simResults.value` is set to the cached results
- **AND** `isSimulating.value` remains false
- **AND** no `Worker` constructor is called

#### Scenario: Cache hit preserves simProgress
- **GIVEN** cached results exist for the current config fingerprint
- **WHEN** results are restored from cache
- **THEN** `simProgress.value` is not modified (retains its previous value)

### Requirement: Recalculate Flag
A `recalculate` signal SHALL track whether the next simulation run is a forced recalculation (bypassing cache). When true, the cache entry for the current config fingerprint SHALL be removed before the simulation starts, and the fingerprint SHALL NOT be restored from cache during the simulation lifecycle.

#### Scenario: Recalculate clears cache and runs
- **GIVEN** cached results are displayed and the user clicks "Recalculate"
- **WHEN** the recalculate action triggers
- **THEN** the cache entry for the current fingerprint is removed
- **AND** `runSimulation()` is called
- **AND** on completion, new results are saved to cache normally

#### Scenario: Cache not restored during recalculation
- **GIVEN** a recalculation is in progress
- **WHEN** the config fingerprint changes (e.g., user edits while simulating)
- **THEN** cached results for the new fingerprint are NOT auto-restored
- **AND** `isSimulating.value` is true, blocking any cache restore
