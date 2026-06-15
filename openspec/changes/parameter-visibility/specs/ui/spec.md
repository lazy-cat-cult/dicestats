# UI Specification (delta)

## ADDED Requirements

### Requirement: SweepCostChip
A `<SweepCostChip>` SHALL be rendered on the **Results** step, between the `ParameterEditor` and the Run button (or, after a run completes, between the `ParameterEditor` and the result table). The chip SHALL display:
- `No sweeps. Run a single simulation.` when no parameters exist.
- `N simulations · N×1,000,000 rolls` when at least one parameter exists, color-coded yellow for total > 10M and red for total > 50M.
- A `Confirm run` button when total > 50M and `confirmedHighCost` is false.

The chip SHALL NOT be rendered on the "Dice Pool & Reroll" or "Resolve & Outcomes" steps.

#### Scenario: Chip shows cost on Results step
- GIVEN one parameter with 4 values
- WHEN the user is on the Results step
- THEN the `<SweepCostChip>` is visible below the `ParameterEditor` and displays `4 simulations · 4,000,000 rolls`

#### Scenario: Chip is not rendered on earlier steps
- GIVEN one parameter with 4 values
- WHEN the user is on the "Resolve & Outcomes" step
- THEN the `<SweepCostChip>` is not rendered anywhere in the step body

## MODIFIED Requirements

### Requirement: DicePoolEditor (clarified)
The DicePoolEditor SHALL display a list of dice term rows, each showing `[count] d[sides] [tag_input] [sweep_indicator?] [+ Sweep button] [remove]`. For each term, when it is the target of an active `Parameter`, a `<SweepIndicator>` SHALL be rendered next to the `count` or `sides` input. A `[+ Sweep]` button SHALL be rendered next to the `count` input (and next to the `sides` input) when the term is NOT currently a sweep target. The `[+ Sweep]` button SHALL be hidden when `parameters.length >= 3`. All interactive elements SHALL have a minimum tap target of 44×44px (per `openspec/specs/ui/spec.md:108`).

#### Scenario: Indicator and button placement
- GIVEN a 1d20 term with a count sweep active
- WHEN the DicePoolEditor renders
- THEN a `<SweepIndicator>` is rendered next to the `count` input
- AND a `[+ Sweep]` button is rendered next to the `sides` input (the count sweep does not block the sides sweep affordance)

### Requirement: PipelineEditor (clarified)
The PipelineEditor SHALL display an expandable table of named values. Each row: `[name] = [function]([source], [args]) [sweep_indicator?] [+ Sweep button] // comment`. For binary-math-literal rows targeted by an active sweep, a `<SweepIndicator>` SHALL be rendered next to the literal input. A `[+ Sweep]` button SHALL be rendered next to the literal input of every binary-math-literal row that is NOT currently a sweep target. The button SHALL be hidden when `parameters.length >= 3`.

#### Scenario: Non-literal row has no sweep control
- GIVEN a pipeline row `total = sum rolled` (no literal operand)
- WHEN the PipelineEditor renders
- THEN no `<SweepIndicator>` or `[+ Sweep]` button is shown on that row

### Requirement: OutcomeEditor (clarified)
The OutcomeEditor SHALL display an expandable table of outcomes. Each row: `[name] when [conditions with sweep_indicator_and_+_Sweep_button_on_first_scalar_condition]`. For outcomes targeted by an active sweep, a `<SweepIndicator>` SHALL be rendered next to the first scalar condition's value. A `[+ Sweep]` button SHALL be rendered next to the first scalar condition's value of every outcome that is NOT currently a sweep target. The button SHALL be hidden when `parameters.length >= 3`. Non-scalar conditions SHALL NOT show the button.

#### Scenario: Vector first condition has no sweep affordance
- GIVEN an outcome whose first condition is `any? rolled >= 5`
- WHEN the OutcomeEditor renders
- THEN no `<SweepIndicator>` or `[+ Sweep]` button is shown on the first condition
- AND the outcome row is flagged as invalid (red border) because a sweep targeting it cannot succeed

### Requirement: ParameterEditor (rewritten)
The ParameterEditor SHALL be rendered on the **Results** step, above the `<SweepCostChip>` and the Run button. It SHALL NOT be rendered on the "Dice Pool & Reroll" or "Resolve & Outcomes" steps. The reason: parameters are run-level configuration that directly affects the simulation output, so they live alongside the Run button and the result view.

The ParameterEditor SHALL display a list of parameter cards. Each card shows: `[label] sweep [target] over [values] [Jump to target] [Retarget_if_stale] [Delete]`. Contextual selectors: dice term selector (pool.count/sides), outcome selector (outcome.value), pipeline step selector (pipeline.literal). Values: comma-separated or range notation `1..5`. "Add parameter" button (max 3) SHALL be available alongside the inline `[+ Sweep]` affordances on the source rows.

The inline `[+ Sweep]` affordances on the source rows (in `DicePoolEditor`, `OutcomeEditor`, `PipelineEditor`) SHALL remain on the earlier steps; they are the discoverability entry point for creating a sweep. After a parameter is created, it appears as a `<SweepIndicator>` on its target row (which is visible only when the user navigates to the step that owns that row) and as a card in the `ParameterEditor` on the Results step.

When a parameter's target is stale, the card SHALL be rendered in the error state (see parameters spec, "Stale-Target Visibility") with a "Retarget" link in place of "Jump to target".

#### Scenario: ParameterEditor on Results step
- GIVEN one parameter exists
- WHEN the user navigates to the Results step
- THEN the ParameterEditor is rendered above the `<SweepCostChip>` and the Run button

#### Scenario: ParameterEditor not on earlier steps
- GIVEN one parameter exists
- WHEN the user is on the "Resolve & Outcomes" step
- THEN the ParameterEditor is not rendered in the step body

#### Scenario: Jump to target from parameter card
- GIVEN a parameter targeting the `count` of a 1d20 term
- WHEN the user clicks "Jump to target" on the parameter card
- THEN the page scrolls to the term in the DicePoolEditor and highlights it with a 500ms pulse animation
- AND an `aria-live` region announces the jump

#### Scenario: Retarget on stale parameter
- GIVEN a parameter in the error state (target deleted)
- WHEN the user clicks "Retarget"
- THEN a dropdown appears listing all current dice terms / outcomes / pipeline literals of the same kind
- AND selecting one updates the parameter's target fields

### Requirement: ResultView (clarified)
The ResultView SHALL display a probability table (outcome name, percentage to 2 decimal places, raw count). For a parameter sweep, the table SHALL be preceded by a group header `Sweep: {label} ∈ {values}` (e.g. `Sweep: DC ∈ {5, 10, 15, 20}`) above the per-value rows. For multiple parameters, one header per parameter SHALL be rendered in the order the parameters were defined. For single simulation, a Chart.js bar chart SHALL show the distribution histogram. For parameter sweep, a Chart.js line chart SHALL show one line per outcome (probability vs parameter value). A "Re-run" button, iteration count display, and progress bar with cancel button SHALL be provided.

#### Scenario: Sweep header above table
- GIVEN a DC sweep with values [5, 10, 15, 20] that has completed
- WHEN the ResultView renders
- THEN a header `Sweep: DC ∈ {5, 10, 15, 20}` is displayed above the per-value probability table
