# Simulation Specification (delta)

## MODIFIED Requirements

### Requirement: Parameter Sweep
The sweep iteration SHALL be driven by the `SweepParameters` value on the `SimJob`. The worker MUST iterate over `y ∈ Y` (or a single outer pass when Y is null), then over `x ∈ X` (or a single inner pass when X is empty), materializing every `Expr` in the configuration for each `(x, y)` to produce a fully numeric single-shot config, and running the existing 1,000,000-iteration simulation against that config. Total iterations MUST equal `len(Y) * len(X) * 1_000_000` (or `len(X) * 1_000_000` when Y is null).

#### Scenario: X-only sweep
- **GIVEN** `SimJob.sweep = { x: [0, 1, 2, 3], y: null }`
- **WHEN** the worker runs the simulation
- **THEN** 4 independent simulations execute (4 × 1,000,000 iterations)
- **AND** the worker emits 4 `SimResult` entries with labels `X=0` through `X=3` and `sweepX = 0..3`, `sweepY = null`

#### Scenario: X and Y sweep
- **GIVEN** `SimJob.sweep = { x: [1, 2, 3, 4, 5], y: [10, 15, 20] }`
- **WHEN** the worker runs the simulation
- **THEN** 15 independent simulations execute (3 × 5 × 1,000,000 = 15,000,000 iterations)
- **AND** the worker emits 15 `SimResult` entries; the first five have `sweepY = 10`, the next five have `sweepY = 15`, the last five have `sweepY = 20`

#### Scenario: Expr materialization per (x, y)
- **GIVEN** `SimJob.sweep = { x: [1, 2], y: [10] }` and a pipeline row `total_mod = total + X`
- **WHEN** the worker runs the simulation at the `(x = 2, y = 10)` step
- **THEN** the pipeline literal `X` is evaluated to `2` and the materialized pipeline row is `total_mod = total + 2`

### Requirement: SimResult Structure
`SimResult` MUST gain two optional fields `sweepX: number | null` and `sweepY: number | null`. The worker SHALL set `sweepX = x` and `sweepY = y` for every sweep step; both MUST be `null` when no sweep is active. The `label` SHALL be `X=<x>` (X-only) or `Y=<y> · X=<x>` (both).

#### Scenario: SimResult metadata for X-only sweep
- **GIVEN** a worker sweep step at `x = 5`
- **WHEN** the worker emits the SimResult
- **THEN** the result has `label = "X=5"`, `sweepX = 5`, `sweepY = null`

#### Scenario: SimResult metadata for X and Y sweep
- **GIVEN** a worker sweep step at `x = 3, y = 20`
- **WHEN** the worker emits the SimResult
- **THEN** the result has `label = "Y=20 · X=3"`, `sweepX = 3`, `sweepY = 20`

### Requirement: Parameter Application
The old "replace targeted value with sweep value" rule is removed. Materialization MUST happen once per `(x, y)` sweep step: every `Expr` in the pool, pipeline, and outcomes is evaluated with the current `(x, y)` to produce a fully numeric config, and the existing single-shot simulation is run against that config without further mutation.

#### Scenario: No more applyParameter
- **GIVEN** a sweep step at `x = 7`
- **WHEN** the worker is about to run the simulation
- **THEN** the worker produces a materialized config (every Expr evaluated with `x = 7`) and calls the existing `runSimulation` once against that materialized config

## ADDED Requirements

### Requirement: Expr Isolation
The worker SHALL import the expression evaluator from `src/utils/expression.ts`. The evaluator MUST NOT import from Preact, the DOM, or Node APIs. The existing `src/domain/matching.ts`, `src/domain/resolve.ts`, and `src/domain/classify.ts` modules SHALL remain unchanged and remain number-only.

#### Scenario: Worker purity
- **GIVEN** the worker source after the change
- **WHEN** built by Vite
- **THEN** it imports from `src/utils/expression.ts` (parser / evaluator) and from the unchanged domain modules
- **AND** it does NOT import from any Preact or DOM module
