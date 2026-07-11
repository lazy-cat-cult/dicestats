# Simulation Specification

## Purpose

The simulation engine runs Monte Carlo iterations in a Web Worker, producing probability distributions and outcome counts. It supports parameter sweeps that multiply the total number of iterations.

## Requirements

### Requirement: Default Iteration Count
The default iteration count SHALL be 1,000,000 per simulation run. The iteration count is part of the `SimJob` and MAY be overridden.

#### Scenario: Default iteration count
- GIVEN a SimJob without explicit iterations
- WHEN the simulation runs
- THEN 1,000,000 iterations are executed

### Requirement: Single Iteration Algorithm
Each simulation iteration SHALL follow this ordered process:
1. Roll all dice: for each DiceTerm, roll `count` dice each yielding 1..sides, each carrying `{ face: number, tag: string }`
2. Apply reroll conditions in order (reroll or explode per condition)
3. Flatten result into the `rolled` array of `{ face, tag }` objects
4. Calculate base sum: `Σ(all_dice.face)`
5. Evaluate the resolution pipeline in row order, producing named values
6. Evaluate outcomes in order; if no user-defined outcome matches, the implicit "Not matched" outcome is recorded
7. Record: distribution key and which outcome matched

#### Scenario: Simple d20 threshold
- GIVEN pool: 1d20, no reroll, no pipeline, outcome "Hit" when rolled >= 15
- WHEN an iteration produces face value 17
- THEN distribution records key 17, outcome "Hit" matches

#### Scenario: Pipeline affecting distribution key
- GIVEN pool: 2d20, pipeline: `best = max rolled`, outcome "Hit" when best >= 10
- WHEN an iteration produces rolled values [14, 18]
- THEN distribution key is 18 (last scalar pipeline value)
- AND outcome "Hit" matches (18 >= 10)

### Requirement: Distribution Key Selection
The distribution histogram key SHALL be determined as follows:
- If any pipeline row exists, use the **last scalar pipeline value**
- If no pipeline exists, use the **sum of all dice face values** from step 4

#### Scenario: Distribution with pipeline
- GIVEN pipeline rows `hits = count(filtered)` and `total = add hits by 3`
- WHEN an iteration completes
- THEN the distribution key is the value of `total` (the last scalar)

#### Scenario: Distribution without pipeline
- GIVEN no pipeline rows
- WHEN an iteration produces dice values [3, 5, 2]
- THEN the distribution key is 10 (sum of all faces)

### Requirement: Parameter Sweep
When parameters are defined, each parameter value triggers a full independent simulation (1,000,000 iterations by default). Multiple parameters multiply total iterations. Each `SimResult` SHALL have a label in the format `"Label=Value"`.

#### Scenario: Single parameter sweep
- GIVEN a parameter "Modifier" with values [0, 1, 2, 3]
- WHEN the simulation runs
- THEN 4 independent simulations execute (4 × 1,000,000 = 4,000,000 iterations)
- AND results include 4 SimResult entries with labels "Modifier=0" through "Modifier=3"

#### Scenario: Multiple parameters multiplication
- GIVEN two parameters with 5 values each
- WHEN the simulation runs
- THEN total iterations = 5 × 5 × 1,000,000 = 25,000,000

### Requirement: Iteration Warning Thresholds
The UI SHALL display a warning badge if total iterations exceed 10,000,000. The UI SHALL require user confirmation if total iterations exceed 50,000,000.

#### Scenario: Warning at 10M iterations
- GIVEN parameters producing 15,000,000 total iterations
- WHEN the user views the parameter editor
- THEN a warning badge is displayed

#### Scenario: Confirmation at 50M iterations
- GIVEN parameters producing 60,000,000 total iterations
- WHEN the user attempts to run the simulation
- THEN a confirmation dialog appears: "This will run 60 million iterations. Continue?"

### Requirement: Web Worker Protocol
The main thread SHALL communicate with the worker via typed messages:
- `WorkerMessage`: `{ type: 'run'; job: SimJob }` or `{ type: 'cancel' }`
- `WorkerResponse`: `{ type: 'progress'; completed: number; total: number }` or `{ type: 'result'; results: SimResult[] }` or `{ type: 'error'; message: string }`

Progress SHALL be reported every 10,000 iterations and after each parameter completion.

#### Scenario: Progress reporting
- GIVEN a simulation with 1,000,000 iterations and no parameters
- WHEN 10,000 iterations complete
- THEN a progress message is sent with `{ completed: 10000, total: 1000000 }`

#### Scenario: Cancellation
- GIVEN a running simulation
- WHEN the main thread sends `{ type: 'cancel' }`
- THEN the worker stops processing and does not send a result message

### Requirement: Worker Lifecycle
A worker SHALL be created fresh for each simulation run. The worker SHALL be terminated on completion, cancellation, or error. A new `run` message SHALL NOT be sent to an active worker.

#### Scenario: Worker creation and termination
- GIVEN the user clicks "Run"
- WHEN a new worker is created and sent a `run` message
- THEN upon receiving the result, the worker is terminated

#### Scenario: Cancel and re-run
- GIVEN a running simulation
- WHEN the user cancels and then re-runs
- THEN the old worker is terminated and a new worker is created for the new run

### Requirement: Worker Isolation
Domain modules imported by the worker SHALL NOT use Preact, DOM, or Node APIs. The worker SHALL import from `matching.ts`, `resolve.ts`, and `classify.ts` (pure functions with no side dependencies). The worker SHALL inline `rollDie`, `rollPool`, and `applyRerollConditions` for the simulation loop.

#### Scenario: Worker purity
- GIVEN the worker source file
- WHEN built by Vite
- THEN it imports from matching.ts, resolve.ts, and classify.ts
- AND it does NOT import from any Preact or DOM module

### Requirement: SimResult Structure
The simulation result SHALL conform to the following TypeScript types:

```typescript
interface OutcomeResult {
  label: string;
  probability: number;    // 0..1
  count: number;          // raw count out of totalRolls
}

interface SimResult {
  label: string;                        // "" for single, "Label=Value" for parameterized
  outcomes: OutcomeResult[];
  totalRolls: number;
  distribution: Record<number, number>; // distribution key → frequency
}
```

#### Scenario: Single simulation result
- GIVEN a simulation with no parameters and 1,000,000 iterations
- WHEN the simulation completes
- THEN the result contains `label: ""`, `totalRolls: 1000000`, and outcome probabilities

### Requirement: Parameter Application
For `pool.count`, the parameter SHALL replace the targeted DiceTerm's `count` field. For `pool.sides`, the parameter SHALL replace the `sides` field. For `outcome.value`, the parameter SHALL replace the first numeric condition's `value`. For `pipeline.literal`, the parameter SHALL replace the literal value in the targeted binary operation.

#### Scenario: Pool count parameter
- GIVEN a parameter targeting `pool.count` of a dice term with values [1, 2, 3]
- WHEN each simulation runs
- THEN the targeted term's count is replaced with 1, 2, or 3 respectively

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