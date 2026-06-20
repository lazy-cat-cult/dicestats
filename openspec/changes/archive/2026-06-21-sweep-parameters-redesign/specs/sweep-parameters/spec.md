# Sweep Parameters Specification

## Purpose

The sweep model lets the user re-run the same Monte Carlo simulation across a range of values for one or two independent variables, `X` and `Y`, by referencing them inside any numeric value cell of the configuration. The variables are configured at the top of the Sweep Parameters step; the value cells accept an expression language (see `expressions` spec) that can include `X` / `Y` references. When Y is unset, the model collapses to a single-variable sweep. When Y is set, the result canvas renders one result section per Y value, each containing a full X sweep.

## ADDED Requirements

### Requirement: SweepParameters Type

The sweep state SHALL be a single value of type `SweepParameters` defined in `src/types/index.ts`:

```ts
interface SweepParameters {
  x: number[];
  y: number[] | null;
}
```

`x` is the list of X values; `y` is the list of Y values, or `null` when Y is not active. Both lists are deduplicated and sorted in ascending order at parse time. Each list accepts between 0 and 10 values inclusive.

#### Scenario: X-only sweep
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: null }`
- **WHEN** the simulation runs
- **THEN** 5 simulations are scheduled (5 × 1,000,000 iterations)

#### Scenario: X and Y sweep
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: [10, 15, 20] }`
- **WHEN** the simulation runs
- **THEN** 15 simulations are scheduled (3 × 5 × 1,000,000 iterations)

#### Scenario: Empty X — no sweep
- **GIVEN** `sweep = { x: [], y: null }`
- **WHEN** the simulation runs
- **THEN** exactly 1 simulation is scheduled (a single-shot run, no parameter sweep)

### Requirement: Value Cell Reference

Any numeric value cell in the configuration MAY contain an expression that references `X` and / or `Y`. The valid cell locations MUST be:

- `DiceTerm.count` (dice count)
- `DiceTerm.sides` (dice sides)
- `ScalarLiteralOp.value` (pipeline literal operand)
- `ScalarCondition.value` (outcome scalar condition threshold)
- `DiceCondition.value` (outcome dice condition threshold)

A cell containing only a number evaluates to that number regardless of X / Y. A cell containing `X + 2` evaluates to the current X value plus 2 for every (x, y) sweep step.

#### Scenario: Reference X in dice count
- **GIVEN** a dice term with `count` = `X` and `sweep.x = [1, 2, 3]`
- **WHEN** the simulation runs
- **THEN** three independent simulations execute with `count` materialized to 1, 2, 3 respectively

#### Scenario: Reference Y in outcome threshold
- **GIVEN** an outcome with `Hit when total_mod >= Y` and `sweep.x = [0, 5]`, `sweep.y = [10, 15]`
- **WHEN** the simulation runs
- **THEN** 2 × 2 = 4 simulations execute; for each, `Y` is replaced with the current Y value at that step

#### Scenario: Reference both X and Y in pipeline literal
- **GIVEN** pipeline row `total_mod = total + X` and `sweep.x = [1, 2]`, `sweep.y = [10, 20]`
- **WHEN** the simulation runs at `(x = 1, y = 10)`
- **THEN** the pipeline literal evaluates to `1` and `total_mod = total + 1` for that simulation

### Requirement: Y Requires X

`y` MUST be `null` (or an empty array) whenever `x` is empty. If the user types Y values into the input while X is empty, the application SHALL ignore the Y values and treat Y as null. If the user clears X after setting Y, the Y values SHALL be cleared as well.

#### Scenario: Y set before X
- **GIVEN** `sweep = { x: [], y: [10, 15] }`
- **WHEN** validation runs
- **THEN** Y is treated as `null` and only the X-empty branch is considered

#### Scenario: Clearing X clears Y
- **GIVEN** `sweep = { x: [1, 2, 3], y: [10, 15] }`
- **WHEN** the user clears the X field
- **THEN** `sweep.y` is also cleared (becomes `null`)

### Requirement: Value Specification Format

X and Y values SHALL be specified as a comma-separated list of numbers: `1, 2, 3, 4, 5`. A range notation `1..5` MAY be used and is inclusive on both ends; a reversed range `5..1` is accepted and expanded in ascending order. Duplicate values are deduplicated; values are sorted ascending. Up to 10 values are accepted per parameter; the 11th value is rejected and the input shows an inline error.

#### Scenario: Range notation
- **GIVEN** the user types `1..5` in the X field
- **WHEN** the field commits
- **THEN** `sweep.x` is `[1, 2, 3, 4, 5]`

#### Scenario: Reversed range
- **GIVEN** the user types `10..5` in the X field
- **WHEN** the field commits
- **THEN** `sweep.x` is `[5, 6, 7, 8, 9, 10]`

#### Scenario: Mixed list
- **GIVEN** the user types `1, 3, 5, 2, 4` in the X field
- **WHEN** the field commits
- **THEN** `sweep.x` is `[1, 2, 3, 4, 5]`

#### Scenario: Max 10 values enforced
- **GIVEN** the user types `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11` in the X field
- **WHEN** the field commits
- **THEN** `sweep.x` is `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` and the input shows an inline message `Maximum 10 values`

### Requirement: Sweep Step UI

The Sweep Parameters step SHALL render, in this vertical order:

- A description sentence explaining X and Y.
- An "X values" `TextField` with placeholder `1, 2, 3, 4, 5`.
- A "Y values" `TextField` with placeholder `10, 15, 20`; the field is visually disabled (greyed out) when X is empty.
- A live readout `<len(Y)> × <len(X)> simulations · <N> rolls` where `N = len(Y) * len(X) * 1_000_000` (or `len(X) * 1_000,000` when Y is null).
- The `SweepCostChip` below the readout, using the same component as today but with its label updated to show Y × X sims.

There SHALL be no per-cell "↻ Sweep" button, no per-cell `SweepIndicator`, no `SweepPopover` modal, and no parameter list / parameter cards.

#### Scenario: X-only readout
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: null }`
- **WHEN** the Sweep step renders
- **THEN** the readout reads `5 simulations · 5,000,000 rolls` and Y is disabled

#### Scenario: X and Y readout
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: [10, 15, 20] }`
- **WHEN** the Sweep step renders
- **THEN** the readout reads `3 × 5 simulations · 15,000,000 rolls`

#### Scenario: Empty readout
- **GIVEN** `sweep = { x: [], y: null }`
- **WHEN** the Sweep step renders
- **THEN** the readout reads `Single simulation · 1,000,000 rolls` and the Y field is disabled

### Requirement: Iteration Cost Calculation

The total iteration count SHALL be `len(sweep.x) * (len(sweep.y) || 1) * 1_000_000`. The 50M confirmation gate (today's behavior, in `SweepCostChip`) is preserved. The 10M informational warning is preserved.

#### Scenario: 50M confirm gate
- **GIVEN** `sweep = { x: [1, ..., 10], y: [1, ..., 6] }` (60 simulations)
- **WHEN** the user clicks "Roll the Dice"
- **THEN** the run does not start, the chip's "Confirm run" button is shown, and on the next click the simulation begins

### Requirement: Result Grouping

When `sweep.y` is non-null, the result canvas SHALL render one result section per Y value, in ascending Y order. Each section is titled `Y = <value>` and contains its own probability table (rows = X values, columns = outcome labels) and its own line chart (x-axis = X values, one line per outcome). When `sweep.y` is null, the result canvas renders a single probability table and line chart (today's behavior).

#### Scenario: Y-grouped result sections
- **GIVEN** `sweep = { x: [1, 2, 3], y: [10, 20] }` and two outcomes
- **WHEN** the simulation completes
- **THEN** the result canvas shows two sections: `Y = 10` (with three rows for `X = 1, 2, 3`) and `Y = 20` (with three rows for `X = 1, 2, 3`)

#### Scenario: Single section for X-only
- **GIVEN** `sweep = { x: [1, 2, 3], y: null }`
- **WHEN** the simulation completes
- **THEN** the result canvas shows a single probability table and a single line chart, identical to today's single-sweep result

### Requirement: Per-Result Sweep Metadata

Each `SimResult` SHALL carry two optional fields: `sweepX: number | null` and `sweepY: number | null`. The worker sets `sweepX = x` and `sweepY = y` for every sweep step; both are `null` when no sweep is active. The UI uses these fields for grouping and x-axis labels and SHALL NOT parse the values out of `result.label`.

#### Scenario: Sweep metadata populated
- **GIVEN** `sweep = { x: [1, 2], y: [10] }`
- **WHEN** the worker emits a SimResult for the (x=2, y=10) step
- **THEN** that result has `sweepX = 2` and `sweepY = 10`

#### Scenario: No sweep — null metadata
- **GIVEN** `sweep = { x: [], y: null }`
- **WHEN** the worker emits a SimResult
- **THEN** the result has `sweepX = null` and `sweepY = null`
