# Parameters Specification (delta)

## ADDED Requirements

### Requirement: Inline Target Indicator
When a `Parameter` exists, the UI SHALL display a `<SweepIndicator>` at the location of the value being swept:
- On a swept `DiceTerm` row, next to the `count` or `sides` input.
- On a swept outcome's first scalar condition, next to that condition's value.
- On a swept pipeline literal, next to the literal input of the targeted binary-math-literal row.

The indicator SHALL render `↻ {label} {formatSweepRange(values)}`, styled with Tailwind utilities `italic underline decoration-dotted` and an inline `style={{ color: hashIdToColor(parameterId) }}`. The colour SHALL be drawn from the existing 8-color tag palette. On viewports narrower than 480px, the indicator SHALL collapse to the `↻` glyph with a `title` attribute tooltip showing the full label and value list.

The indicator SHALL be a `<span>` (non-interactive) by default, and a `<button>` (with the same text) when a "Jump to target" handler is provided. It SHALL expose `role="status"` and `aria-label="Swept by {label} over {formatSweepRange(values)}."`.

#### Scenario: Indicator on a swept dice count
- GIVEN a parameter `{ id: "p1", label: "Dice count", target: "pool.count", values: [1,2,3,4,5], targetTermId: "t1" }`
- AND a dice term with id `t1`
- WHEN the DicePoolEditor renders
- THEN a `<SweepIndicator>` showing `↻ Dice count 1..5` is rendered next to the `count` input of term `t1`
- AND the indicator's text colour is `hashIdToColor("p1")`

#### Scenario: Indicator collapses on mobile
- GIVEN a viewport narrower than 480px
- AND a parameter with label "DC" and values [5, 10, 15, 20]
- WHEN the OutcomeEditor renders
- THEN the indicator collapses to `↻` only
- AND the full text `DC {5, 10, 15, 20}` is available via the `title` attribute

### Requirement: Inline Sweep Affordance
The DicePoolEditor, OutcomeEditor, and PipelineEditor SHALL each provide a `[+ Sweep]` button next to:
- The `count` input of every `DiceTerm`.
- The value of the first scalar condition of every `Outcome`.
- The literal input of every binary-math-literal `NamedValue`.

Clicking the button SHALL open a `<SweepPopover>` pre-filled with a label and value list per the **Pre-fill Defaults** table. On confirm, a new `Parameter` is created that targets the clicked value, and the button is replaced by the `<SweepIndicator>` from the previous requirement.

The `[+ Sweep]` button SHALL be hidden when `parameters.length >= 3`. All buttons and the popover's interactive elements SHALL have a minimum tap target of 44×44px (per `openspec/specs/ui/spec.md:108`).

#### Scenario: Creating a sweep from a dice term
- GIVEN zero parameters and a 1d20 dice term
- WHEN the user clicks the `[+ Sweep]` button next to the term's `count` input
- THEN a `<SweepPopover>` opens pre-filled with `defaultLabel: "Count"`, `defaultValues: "1, 2, 3, 4, 5"`
- AND the popover shows a live cost line `→ 4 simulations · 4,000,000 rolls` (derived from `defaultValues.length` × 1,000,000)
- AND the popover's `Create` button creates a new `Parameter` with `target: "pool.count"`, `targetTermId: term.id`, label "Count", values [1, 2, 3, 4, 5]
- AND the `[+ Sweep]` button is replaced by the `<SweepIndicator>`

#### Scenario: Sweep button hidden at limit
- GIVEN three parameters already exist
- WHEN the editors render
- THEN no `[+ Sweep]` button is shown on any term, condition, or pipeline row

### Requirement: Sweep Cost Display
A `<SweepCostChip>` SHALL be rendered on the **Results** step, between the `ParameterEditor` and the Run button (or, after a run completes, between the `ParameterEditor` and the result table). The chip SHALL:
- Read `parameters.value` and compute `total = parameters.reduce((acc, p) => acc * p.values.length, 1) * 1_000_000`.
- Display `N simulations · N×1,000,000 rolls` (e.g. `5 simulations · 5,000,000 rolls`).
- Use `text-yellow-600` when total > 10,000,000.
- Use `text-red-600` and render a `Confirm run` button when total > 50,000,000 and `confirmedHighCost` is false.
- Display `text-red-600` (without the `Confirm run` button) when total > 50,000,000 and `confirmedHighCost` is true.
- Display `No sweeps. Run a single simulation.` when `parameters.length === 0`.

The chip SHALL be rendered with the cost text in `text-center` and SHALL be horizontally scrollable with the cost text centered on viewports narrower than 480px.

The chip SHALL NOT be rendered on the "Dice Pool & Reroll" or "Resolve & Outcomes" steps; it is visible only on the Results step where the Run button lives.

#### Scenario: Cost chip shows 0 sweeps
- GIVEN zero parameters
- WHEN the Results step renders
- THEN the chip displays `No sweeps. Run a single simulation.`

#### Scenario: Cost chip turns yellow
- GIVEN two parameters with 4 and 5 values respectively (total 20 × 1,000,000 = 20M)
- WHEN the Results step renders
- THEN the chip displays `20 simulations · 20,000,000 rolls` in `text-yellow-600`

#### Scenario: Cost chip is not shown on other steps
- GIVEN any number of parameters
- WHEN the user is on the "Dice Pool & Reroll" or "Resolve & Outcomes" step
- THEN the `<SweepCostChip>` is not rendered anywhere in the step body

### Requirement: Confirmation Dialog (50M)
If the user attempts to run a simulation whose total iteration count exceeds 50,000,000, the Run button SHALL be intercepted:
- A `confirmedHighCost` flag in `src/state/app-state.ts` SHALL be set when the user clicks the `Confirm run` button in `<SweepCostChip>` (or when the user clicks Run while the flag is false — in that case, the click sets the flag and does not dispatch the simulation).
- When the flag is true and total > 50,000,000, the next Run click dispatches the simulation normally.
- The flag SHALL be reset to `false` whenever any parameter is added, removed, or its `values` array changes.
- A tooltip SHALL appear near the Run button when the flag has just been set: `"This will run >50M simulations. Click Run again to proceed."`

#### Scenario: 50M gate
- GIVEN two parameters with 8 and 7 values (total 56 × 1,000,000 = 56M)
- WHEN the user clicks Run
- THEN the simulation is NOT dispatched
- AND `confirmedHighCost` is set to `true`
- AND the `<SweepCostChip>` shows a `Confirm run` button (highlighted with `ring-2 ring-red-600`)
- AND a tooltip appears near the Run button
- WHEN the user clicks Run a second time
- THEN the simulation is dispatched

#### Scenario: Confirmation reset on parameter change
- GIVEN `confirmedHighCost` is `true` and a DC sweep is active
- WHEN the user adds a new parameter (e.g. a dice count sweep)
- THEN `confirmedHighCost` is reset to `false`
- AND the next Run click is intercepted again

### Requirement: Jump to Target
Each `Parameter` card in the ParameterEditor SHALL provide a "Jump to target" link. Clicking the link SHALL:
1. Scroll the page to the affected source row using `scrollIntoView({ behavior: "smooth", block: "center" })`.
2. Apply a 500ms pulse highlight to the row using the Tailwind utilities `outline outline-2 outline-offset-2 outline-blue-500 animate-pulse`.
3. Post an `aria-live="polite"` announcement: `"Jumped to {label} on {target description}."` (e.g. `"Jumped to DC on Hit outcome."`).

The link SHALL be hidden when the parameter's target is stale (see "Stale-Target Visibility").

#### Scenario: Jump to a dice term
- GIVEN a parameter targeting the `count` of term `t1`
- WHEN the user clicks "Jump to target" on the parameter card
- THEN the page scrolls to term `t1` in the DicePoolEditor
- AND term `t1` is highlighted with a 500ms pulse animation
- AND an `aria-live` region announces `"Jumped to {label} on Dice term 1."`

### Requirement: Stale-Target Visibility
If a `Parameter`'s target is no longer valid (the targeted term/outcome/pipeline row was deleted, OR the targeted condition is no longer scalar, OR the targeted pipeline function is no longer binary-math-literal), the ParameterEditor SHALL render the parameter card in a distinct error state:
- Red border (`border-red-500`).
- Warning icon (`⚠` glyph or `AlertTriangle` from lucide-react).
- Tooltip with a specific message ("Target no longer exists", "Target is no longer a numeric condition", or "Target is no longer a binary-math-literal row").
- A "Retarget" link in place of "Jump to target". Clicking it opens a dropdown listing all valid sweep targets of the same kind.
- The Run button SHALL be disabled (per validation rule 11, extended below).

#### Scenario: Stale target after deletion
- GIVEN a parameter targeting the literal of pipeline row `p1`
- WHEN the user deletes pipeline row `p1`
- THEN the parameter card is rendered with a red border, a warning icon, and tooltip "Target no longer exists"
- AND a "Retarget" link is shown in place of "Jump to target"
- AND the Run button is disabled

#### Scenario: Stale target after function change
- GIVEN a parameter targeting the literal of pipeline row `p1` (function `add`, operand `literal`, value `5`)
- WHEN the user changes the row's function to `ceil`
- THEN the parameter card is rendered in the error state with tooltip "Target is no longer a binary-math-literal row"

### Requirement: Pre-fill Defaults
The `<SweepPopover>` SHALL be pre-filled according to the following table when opened from a `[+ Sweep]` button:

| Target | `defaultLabel` | `defaultValues` |
|---|---|---|
| `pool.count` | `Count` | `1, 2, 3, 4, 5` |
| `pool.sides` | `Sides` | `4, 6, 8, 10, 12, 20` |
| `outcome.value` (first scalar) | `DC` | `5, 10, 15, 20` |
| `pipeline.literal` (binary-math) | `Modifier` | `-2, -1, 0, 1, 2` |

These are pre-fills only; the user is free to edit before clicking Create.

#### Scenario: Popover pre-fills for dice count
- GIVEN zero parameters and a 1d20 term
- WHEN the user clicks the `[+ Sweep]` button next to the term's `count` input
- THEN the popover opens with `defaultLabel: "Count"` and `defaultValues: "1, 2, 3, 4, 5"`

## MODIFIED Requirements

### Requirement: Outcome Value Targeting (rewritten)
When an outcome is the target of a sweep, the parameter SHALL modify the **first scalar (numeric-value) condition** of the targeted outcome. A "scalar condition" is defined as an `OutcomeCondition` whose `op` is a `ConditionOperator` and whose `value` is a `number`, as determined by the existing `isScalarCondition` predicate.

If the targeted outcome has zero conditions, OR its `conditions[0]` does not pass `isScalarCondition`, validation SHALL emit a blocking error and the `<SweepIndicator>` SHALL NOT be rendered for that outcome. The error SHALL be surfaced on the parameter card (red border + "Retarget" affordance) and on the outcome row (red border).

#### Scenario: Scalar first condition modification
- GIVEN an outcome with conditions `[total >= 15, total <= 25]`
- AND a parameter targeting that outcome's value
- WHEN the parameter applies value 10
- THEN only the first scalar condition changes: `[total >= 10, total <= 25]`

#### Scenario: Empty conditions blocks sweep
- GIVEN an outcome with `conditions: []`
- AND a parameter targeting that outcome's value
- WHEN validation runs
- THEN a blocking error is emitted: "Sweep target outcome has no conditions. Add a condition first."
- AND the `<SweepIndicator>` is not rendered
- AND the Run button is disabled

#### Scenario: Non-scalar first condition blocks sweep
- GIVEN an outcome with `conditions: [any? rolled >= 5, total <= 10]`
- AND a parameter targeting that outcome's value
- WHEN validation runs
- THEN a blocking error is emitted: "Cannot sweep vector condition. Add a numeric condition first."
- AND the `<SweepIndicator>` is not rendered

### Requirement: Pipeline Literal Targeting (rewritten)
When a `Parameter` has `target: 'pipeline.literal'`, the targeted `NamedValue` MUST be `{ fn: ScalarBinaryOp; operand: 'val'; value: number }`. If the targeted row's function is changed to a non-binary-math variant (e.g. `ceil`, `floor`, or any vector function), validation SHALL emit a blocking error: "Pipeline literal target is not a binary-math-literal row. Change the function or pick a different target." The `<SweepIndicator>` SHALL be removed and the parameter card SHALL be rendered in the error state (per "Stale-Target Visibility").

#### Scenario: Valid pipeline literal target
- GIVEN a pipeline row `modified = add rolled by 5` (operand: 'val')
- WHEN a parameter targets this pipeline row
- THEN the parameter replaces the literal value (5) with each sweep value

#### Scenario: Function change to non-binary-math invalidates sweep
- GIVEN a parameter targeting the literal of pipeline row `p1` (function `add`)
- WHEN the user changes the row's function to `ceil`
- THEN the parameter card is rendered in the error state with tooltip "Target is no longer a binary-math-literal row"
- AND the Run button is disabled

### Requirement: Iteration Warning Thresholds (rewritten)
Total iterations = (product of all parameter value counts) × 1,000,000. The UI SHALL display a `<SweepCostChip>` on the Results step (see "Sweep Cost Display" requirement). The chip SHALL be `text-yellow-600` when total > 10,000,000. The UI SHALL require user confirmation if total > 50,000,000 (see "Confirmation Dialog (50M)" requirement above).

#### Scenario: Yellow cost chip
- GIVEN two parameters with 4 and 5 values respectively (total 20 × 1,000,000 = 20M)
- WHEN the user views the Results step
- THEN the `<SweepCostChip>` displays `20 simulations · 20,000,000 rolls` in `text-yellow-600`

#### Scenario: 50M confirmation gate
- GIVEN two parameters with 8 and 7 values respectively (total 56 × 1,000,000 = 56M)
- WHEN the user attempts to run the simulation
- THEN the confirmation flow is triggered (see "Confirmation Dialog (50M)")
