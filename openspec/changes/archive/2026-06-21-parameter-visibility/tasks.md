# Tasks: parameter-visibility

## 1. Spec & types
- [ ] 1.1 Confirm the deltas in `openspec/changes/parameter-visibility/specs/` (parameters, ui, validation) are complete
- [ ] 1.2 No new types are added; verify with `npm run typecheck`

## 2. State: derived signals and helpers
- [ ] 2.1 Add `activeSweepsByTarget` `computed` signal in `src/state/app-state.ts` keyed by `target:targetId`
- [ ] 2.2 Add `totalIterations` `computed` signal in `src/state/app-state.ts` (`parameters.reduce((a, p) => a * p.values.length, 1) * 1_000_000`)
- [ ] 2.3 Add `confirmedHighCost` `signal<boolean>` in `src/state/app-state.ts`; add a `useSignalEffect` (or equivalent) that resets it to `false` whenever `parameters` mutates (add / remove / values change)
- [ ] 2.4 Extract `hashIdToColor(id: string): string` from `getTagColor` (lines 39-44) and export it as a named function. `getTagColor` is reimplemented in terms of `hashIdToColor` for backwards compatibility
- [ ] 2.5 Add unit tests in `tests/app-state.test.ts` for `activeSweepsByTarget`, `totalIterations`, `confirmedHighCost` reset behaviour, and `hashIdToColor` (colour-stable across renders, distinct for distinct ids)

## 3. Utility: formatSweepRange
- [ ] 3.1 Add `formatSweepRange(values: number[]): string` to `src/utils/format.ts` with the rule: contiguous integer range → `"n..m"`; single value → `String(v)`; 2-5 non-contiguous → `"{v1, v2, …, vk}"`; 6+ non-contiguous → `"{v1, …, v5, …}"`; empty → `""`
- [ ] 3.2 Add unit tests in `tests/format.test.ts` covering: empty, single, contiguous [1,2,3,4,5] → `"1..5"`, non-contiguous [5,10,15,20] → `"{5, 10, 15, 20}"`, 6+ non-contiguous → truncated with `…`, descending [5,4,3] → `"{5, 4, 3}"` (not contiguous because it decreases)

## 4. New component: SweepIndicator
- [ ] 4.1 Create `src/components/SweepIndicator.tsx` with props `{ parameterId, label, values, onJump? }`
- [ ] 4.2 Render `↻ {label} {formatSweepRange(values)}` with Tailwind utilities `italic underline decoration-dotted` and inline `style={{ color: hashIdToColor(parameterId) }}`
- [ ] 4.3 On <480px viewports, render only the `↻` glyph with a `title` attribute tooltip showing the full label and value list
- [ ] 4.4 When `onJump` is provided, render the indicator inside a `<button>` for keyboard activation
- [ ] 4.5 Add `role="status"` and `aria-label="Swept by {label} over {formatSweepRange(values)}."`
- [ ] 4.6 No custom CSS class is added to `src/style.css`; use Tailwind utilities only (per AGENTS.md)

## 5. New component: SweepPopover
- [ ] 5.1 Create `src/components/SweepPopover.tsx` as a controlled component with props `{ open, originRef, defaultLabel, defaultValues, onCreate, onCancel, maxSimulations }`
- [ ] 5.2 Render label input, values input, live cost preview (`→ N simulations · N×1,000,000 rolls`), Create button, Cancel button
- [ ] 5.3 Trap focus and return focus to `originRef` on close; Escape closes; click-outside closes
- [ ] 5.4 On <480px, render the popover as a bottom sheet (CSS only, no library)
- [ ] 5.5 Ensure all interactive elements have 44×44px tap targets
- [ ] 5.6 Add `role="dialog"`, `aria-label="Add sweep"`, and a `useSignalEffect` for the focus trap
- [ ] 5.7 No custom CSS class is added; use Tailwind utilities only

## 6. New component: SweepCostChip
- [ ] 6.1 Create `src/components/SweepCostChip.tsx` that reads `parameters`, `totalIterations`, and `confirmedHighCost` signals
- [ ] 6.2 Render the four states per the spec (no sweeps / ≤10M / >10M yellow / >50M red with Confirm run)
- [ ] 6.3 Use a centered layout with the literal `·` character (not `\u00B7` — JSX text nodes do not interpret backslash escapes)
- [ ] 6.4 The `Confirm run` button calls a `onConfirm` callback that sets `confirmedHighCost.value = true` in the parent (`src/app.tsx`)

## 7. Inline indicator integration
- [ ] 7.1 In `src/components/DicePoolEditor.tsx`, render `<SweepIndicator>` next to `count` and `sides` when a parameter targets them; render `[+ Sweep]` button otherwise. Hide the button when `parameters.length >= 3`
- [ ] 7.2 In `src/components/OutcomeEditor.tsx`, render indicator + `[+ Sweep]` on the first scalar condition of each outcome. Hide the button when `parameters.length >= 3`. Do not show the button on non-scalar conditions
- [ ] 7.3 In `src/components/PipelineEditor.tsx`, render indicator + `[+ Sweep]` on the literal input of every binary-math-literal row. Hide the button when `parameters.length >= 3`. Do not show the button on non-literal rows

## 8. Popover wiring
- [ ] 8.1 Wire `<SweepPopover>` into DicePoolEditor, OutcomeEditor, and PipelineEditor with the **pre-fill table** from the spec (pool.count → "Count" / "1, 2, 3, 4, 5"; pool.sides → "Sides" / "4, 6, 8, 10, 12, 20"; outcome.value → "DC" / "5, 10, 15, 20"; pipeline.literal → "Modifier" / "-2, -1, 0, 1, 2")
- [ ] 8.2 The `onCreate` callback appends a new `Parameter` to the `parameters` signal with the chosen label and parsed values

## 9. Wizard integration: SweepCostChip, ParameterEditor placement, 50M gate
- [ ] 9.1 Move `<ParameterEditor>` from the "Resolve & Outcomes" step body to the **Results** step body. The "Resolve & Outcomes" step now shows only `PipelineEditor` and `OutcomeEditor`
- [ ] 9.2 Render `<SweepCostChip>` in `src/app.tsx`, on the Results step only, between the `ParameterEditor` and the Run button. Do NOT render the chip in the wizard header. On the pre-run view, after the chip, render the Run button. On the running view, after the chip, render the progress bar. On the post-run view, after the chip, render the result table
- [ ] 9.3 Implement the 50M gate: intercept the Run click when `totalIterations > 50_000_000 && !confirmedHighCost`. Set `confirmedHighCost = true`, highlight the chip with `ring-2 ring-red-600`, show a tooltip near the Run button
- [ ] 9.4 On the second Run click (with `confirmedHighCost = true`), dispatch the simulation normally and reset `confirmedHighCost = false`

## 10. ParameterEditor: Jump to target, stale state, Retarget
- [ ] 10.1 Add a "Jump to target" link on every parameter card. Clicking scrolls into view and applies a 500ms pulse highlight to the affected row
- [ ] 10.2 Use a `signal<string | null>(null)` "highlight-target" in `app-state.ts` to coordinate the pulse across sibling editors. The editors observe this signal and apply the pulse to themselves when their id matches. Avoid prop-drilling refs
- [ ] 10.3 Add an `aria-live="polite"` region in the wizard root that announces `"Jumped to {label} on {target description}."` when the signal fires
- [ ] 10.4 When the parameter's target is stale, render the card with a red border (`border-red-500`), a warning icon, and a tooltip with a specific message ("Target no longer exists" / "Target is no longer a numeric condition" / "Target is no longer a binary-math-literal row")
- [ ] 10.5 Replace "Jump to target" with a "Retarget" link in the stale state. Clicking opens a dropdown listing all valid sweep targets of the same kind

## 11. Validation tightening
- [ ] 11.1 Extract the `isScalarCondition` predicate from `src/components/OutcomeEditor.tsx:190-196` into `src/utils/validation.ts` (or `src/domain/matching.ts`, decided at apply time) and re-export it for the outcome editor
- [ ] 11.2 Extend rule 11 in `src/utils/validation.ts` to emit blocking errors for: empty conditions list on `outcome.value` target; non-scalar first condition on `outcome.value` target; non-binary-math-literal function on `pipeline.literal` target
- [ ] 11.3 Add tests in `tests/validation.test.ts` covering each of the three new error cases plus the existing target-exists case
- [ ] 11.4 The `parameter-visibility` change does NOT remove the existing `outcome.value` "first condition" rule; it only makes the "scalar" check explicit

## 12. ResultView header
- [ ] 12.1 In `src/components/ResultView.tsx`, when results are from a sweep, render `Sweep: {label} ∈ {values}` above the table
- [ ] 12.2 For multiple parameters, render one header per parameter in the order the parameters were defined

## 13. Dice notation preview
- [ ] 13.1 Extend the `dicePoolNotation` `computed` signal in `src/state/app-state.ts` so that a swept `count` renders as `formatSweepRange(values)` (e.g. `1..5d20`)
- [ ] 13.2 Add a unit test in `tests/app-state.test.ts` that pushes a `pool.count` parameter and asserts the next read of `dicePoolNotation.value` contains the swept substring

## 14. Multiple parameters on the same target
- [ ] 14.1 The DicePoolEditor, OutcomeEditor, and PipelineEditor SHALL render up to two `<SweepIndicator>` instances per row; a third SHALL collapse to `+N more` with a tooltip listing all parameter labels
- [ ] 14.2 Add a test in `tests/integration.test.ts` that creates three parameters all targeting `pool.count` of the same term and asserts the rendered output

## 15. Tests, lint, manual
- [ ] 15.1 `npm run typecheck` passes
- [ ] 15.2 `npm run test` passes (all new + existing)
- [ ] 15.3 Manual: load D&D 5e — d20 preset, verify the `<SweepIndicator>` for the DC sweep is rendered on the "Hit" outcome's first condition; click `[+ Sweep]` on a dice term, create a new sweep, verify the indicator appears; verify the `<SweepCostChip>` updates; create a sweep that pushes total >50M, verify the gate; run, verify the result header

## 16. Persistence
- [ ] 16.1 No changes to `src/state/persistence.ts`; existing v4 saved configs continue to load

## 17. Presets
- [ ] 17.1 No preset changes in this change; presets already include sweep examples and they will automatically gain indicators after this change is implemented
