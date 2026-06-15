# Proposal: parameter-visibility

## Why

In the current implementation, sweep parameters (Monte Carlo sweep variables) are configured exclusively inside the `ParameterEditor` (the only place in the UI where the user can add a parameter, see `src/app.tsx` and `src/components/ParameterEditor.tsx`). The editor sits at the bottom of Step 2 of the wizard, far away from the rows it actually mutates. A user configuring a "DC" sweep on a "Hit" outcome has no on-screen hint on the `Hit` outcome row that the threshold they typed will be overwritten five times during the run. The first-condition rule from `openspec/specs/parameters/spec.md` (line 42) explicitly says "The UI SHALL clearly indicate which condition is affected" — today nothing indicates that, and the corresponding `Outcome.value` target silently mutates whichever scalar condition happens to be first.

Two further gaps compound the problem:
1. **No cost-of-run visibility** — the only cost signal is a small 10M warning at the bottom of `ParameterEditor` (`src/components/ParameterEditor.tsx:162`); the 50M confirmation dialog required by `openspec/specs/parameters/spec.md:88-97` is not implemented.
2. **Stale-target failure mode is silent** — if a `Parameter` points at a row that was deleted, validation blocks the run but the parameter card looks normal; the user has no obvious next step.

This proposal addresses all three problems:
- **Inline indicator** on the swept row (dice term, outcome condition, pipeline literal) so the answer is at the user's eye-line.
- **Discoverability button** (`[+ Sweep]`) next to the swept value so a first-time user can create a sweep from the value they care about without first learning that "sweep" is a concept.
- **Persistent cost chip** in the wizard header showing the total iteration cost, with a 50M confirmation gate (closing the spec drift).
- **Validation tightening** to make the "first scalar condition" rule a blocking error, plus explicit handling of the `conditions.length === 0` and `pipeline.literal` function-change edge cases.

The intended outcome is that a user configuring a sweep can never be surprised by `applyParameter` mutating a different value than the one they thought, and that the cost of running a sweep is always visible.

## What Changes

- **Add** a `<SweepIndicator>` component rendered inline next to:
  - A swept `DiceTerm` `count` or `sides` input.
  - The first scalar condition of a swept `Outcome`.
  - The literal input of a swept binary-math-literal `NamedValue`.
- **Add** a `[+ Sweep]` button next to each sweepable value, opening a `<SweepPopover>` for label + values pre-fill, with a live "n sims · n×1M rolls" cost preview.
- **Add** a `<SweepCostChip>` rendered on the **Results** step, between the `ParameterEditor` and the Run button / results, showing the total iteration cost (yellow >10M, red >50M, with a `Confirm run` button at >50M).
- **Move** the `ParameterEditor` from the "Resolve & Outcomes" step to the **Results** step. Parameters are configuration that directly affects the run, so they live alongside the run controls.
- **Modify** the `ParameterEditor` so each parameter card has a "Jump to target" link (with `aria-live` announcement), a stale-target error state, and a "Retarget" affordance when the target no longer exists.
- **Modify** the `ResultView` so sweep tables are preceded by a group header `Sweep: {label} ∈ {values}`.
- **Modify** validation rule 11 to also require:
  - The targeted outcome's `conditions.length >= 1` (blocking if zero).
  - The targeted outcome's `conditions[0].op` is in `ConditionOperator` with a `number` value (reusing the existing `isScalarCondition` predicate at `src/components/OutcomeEditor.tsx:190-196`).
  - The targeted pipeline row's function is still a binary-math-literal variant.
- **Add** a `formatSweepRange(values: number[]): string` helper in `src/utils/format.ts` that renders contiguous ranges as `n..m` and non-contiguous lists as `{v1, v2, …, vk}` (truncated to 5 with `…`).
- **Add** a `hashIdToColor(id: string): string` named export in `src/state/app-state.ts` (extracted from `getTagColor`) so `SweepIndicator` can colour-code by parameter id using the existing tag palette.

## Impact

- Affected specs:
  - `openspec/specs/parameters/spec.md` — add `Inline Target Indicator`, `Inline Sweep Affordance`, `Jump to Target`, `Stale-Target Visibility`, `Sweep Cost Display`, `Pre-fill Defaults`, `Outcome Sweep Validation` requirements. Modify `Outcome Value Targeting`, `Pipeline Literal Targeting`, `Iteration Warning Thresholds`.
  - `openspec/specs/ui/spec.md` — modify `DicePoolEditor`, `PipelineEditor`, `OutcomeEditor`, `ParameterEditor`, `ResultView` requirements. Add `SweepCostChip` to the editor list.
  - `openspec/specs/validation/spec.md` — extend rule 11 with the three new sub-conditions.
- Affected code (implementation phase):
  - `src/components/SweepIndicator.tsx` (new).
  - `src/components/SweepPopover.tsx` (new).
  - `src/components/SweepCostChip.tsx` (new).
  - `src/components/ParameterEditor.tsx` (Jump to target, Retarget, stale state).
  - `src/components/DicePoolEditor.tsx`, `src/components/OutcomeEditor.tsx`, `src/components/PipelineEditor.tsx` (indicator + button slots).
  - `src/components/ResultView.tsx` (group header).
  - `src/app.tsx` (move `ParameterEditor` to Results step, place `SweepCostChip` between `ParameterEditor` and Run button, 50M gate).
  - `src/state/app-state.ts` (`activeSweepsByTarget`, `totalIterations`, `confirmedHighCost`, `hashIdToColor`).
  - `src/utils/validation.ts` (rule 11 extensions).
  - `src/utils/format.ts` (`formatSweepRange`).
  - `src/style.css` — no custom classes; use Tailwind utilities only.

## Non-Goals

- No change to the worker sweep algorithm (`src/worker/sim.worker.ts`).
- No change to the `Parameter` data model (`src/types/index.ts`).
- No migration of v4 saved configurations.
- No preset changes (the existing D&D 5e — d20 preset will automatically gain indicators).
- No drag-and-drop, no value-list editing on the source row (the popover is the only entry point; value lists remain editable in the `ParameterEditor` card).
