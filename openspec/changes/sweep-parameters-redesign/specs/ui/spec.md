# UI Specification (delta)

## REMOVED Requirements

### Requirement: Sweep Indicator
**Reason:** The `SweepIndicator` component is removed from the application. Swept cells now show their expression text (e.g. `X + 2`) inside an `ExprInput`, which serves as the visible affordance. The per-cell indicator becomes redundant with the X / Y model.
**Migration:** No code-level migration. Any reference to `SweepIndicator` in the editors is dropped; the cell's `Expr` is the indicator.

### Requirement: Sweep Popover
**Reason:** The `SweepPopover` modal is removed. Creating a sweep no longer requires a modal: the user types `X` / `Y` directly into the value cell.
**Migration:** No code-level migration. The `SweepPopover` import in the editors is dropped.

### Requirement: Stale Parameter Retarget
**Reason:** The stale-parameter UI (billiard border, "⚠ Target no longer exists" pill, Retarget button, retarget select) is removed. The X / Y model has no per-cell target to become stale.
**Migration:** None.

## MODIFIED Requirements

### Requirement: ParameterEditor
The "Sweep Parameters" step SHALL render, in order: a description sentence; an "X values" `TextField` (placeholder `1, 2, 3, 4, 5`); a "Y values" `TextField` (placeholder `10, 15, 20`, disabled when X is empty); a live cost readout; the `SweepCostChip` below the readout. There MUST be no parameter rows, no Add parameter button, no per-cell `SweepIndicator`, no `SweepPopover`, and no stale-target / retarget UI.

#### Scenario: X-only sweep step
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: null }`
- **WHEN** the Sweep step renders
- **THEN** the X field is populated, the Y field is disabled, and the readout reads `5 simulations · 5,000,000 rolls`

#### Scenario: X and Y sweep step
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: [10, 15, 20] }`
- **WHEN** the Sweep step renders
- **THEN** both fields are populated and the readout reads `3 × 5 simulations · 15,000,000 rolls`

### Requirement: Sweep Cost Chip
The `SweepCostChip` label MUST read `<Y> × <X> simulations · <N> rolls` when Y is set, or `<X> simulations · <N> rolls` when Y is null. The 50M confirm gate MUST be preserved.

#### Scenario: Cost chip with Y
- **GIVEN** `sweep = { x: [1, ..., 5], y: [10, 15, 20] }`
- **WHEN** the cost chip renders
- **THEN** it reads `3 × 5 simulations · 15,000,000 rolls`

#### Scenario: Cost chip X-only
- **GIVEN** `sweep = { x: [1, 2, 3, 4, 5], y: null }`
- **WHEN** the cost chip renders
- **THEN** it reads `5 simulations · 5,000,000 rolls`

### Requirement: Result Detail
The result canvas MUST group `SimResult[]` by `sweepY`. When Y is null, a single section SHALL be rendered (today's behavior). When Y is set, one section SHALL be rendered per Y value, in ascending Y order, each titled `Y = <value>` and containing its own probability table and line chart.

#### Scenario: Y-grouped result sections
- **GIVEN** a sweep with `y = [10, 20]` and `x = [1, 2, 3]`
- **WHEN** the results render
- **THEN** two sections appear in order: `Y = 10` (rows `X = 1, 2, 3`) and `Y = 20` (rows `X = 1, 2, 3`), each with a line chart whose x-axis is labelled by X

#### Scenario: Single section
- **GIVEN** a sweep with `y = null` and `x = [1, 2, 3]`
- **WHEN** the results render
- **THEN** a single section appears, identical to today's single-sweep result

## ADDED Requirements

### Requirement: ExprInput
A new `ExprInput` component SHALL render a numeric value cell as a `TextField` whose input accepts an arithmetic expression (see the `expressions` spec). Below the input, a small monospaced preview SHALL show `= <evaluated value>` (using the first X and Y values as preview inputs) or an inline parse error if the input is unparseable.

#### Scenario: Valid expression
- **GIVEN** the cell stores `X + 2` and the preview X is `5`
- **WHEN** the input renders
- **THEN** the input shows `X+2` and the preview reads `= 7`

#### Scenario: Parse error
- **GIVEN** the cell stores `X + foo`
- **WHEN** the input renders
- **THEN** the input shows `X + foo` and an inline error reads `Unexpected token "foo"`

#### Scenario: Missing X
- **GIVEN** the cell stores `X + 2` and `sweep.x = []`
- **WHEN** the input renders
- **THEN** the preview reads `= ?` (a placeholder, not a number)
