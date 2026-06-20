## 1. Expression core

- [ ] 1.1 Create `src/utils/expression.ts` with `Expr` type re-export, `parseExpr(text): { expr?: Expr; error?: string; pos?: number }`, `exprToString(expr): string`, `evalExpr(expr, vars: { x: number; y: number }): number`, `exprToInteger(expr, vars, { min, max }): number`, `literalExpr(n: number): Expr` (implements expressions `Expression AST`, `Expression Grammar`, `Parse Errors`, `Evaluator`, `Pretty-printer`, `Integer Coercion`).
- [ ] 1.2 Add unit tests in `tests/expression.test.ts` covering: literals, references, binops, precedence, parentheses, unary minus, decimals, empty input, unknown tokens, unmatched parens, division by zero, round-trip via `exprToString`, and integer coercion with clamping (implements expressions `Expression AST`, `Expression Grammar`, `Parse Errors`, `Evaluator`, `Pretty-printer`, `Integer Coercion`).

## 2. Domain types

- [ ] 2.1 In `src/types/index.ts`: add `Expr`, `ExprOp` types and the `SweepParameters` interface; add `sweepX?: number | null` and `sweepY?: number | null` to `SimResult`; remove `Parameter` and `ParameterTarget` (implements sweep-parameters `SweepParameters Type`, simulation `SimResult Structure`).
- [ ] 2.2 Change `DiceTerm.count` and `DiceTerm.sides` from `number` to `Expr` (implements sweep-parameters `Value Cell Reference`).
- [ ] 2.3 Change `ScalarLiteralOp.value` from `number` to `Expr` (implements sweep-parameters `Value Cell Reference`).
- [ ] 2.4 Change `ScalarCondition.value` and `DiceCondition.value` from `number` to `Expr` (implements sweep-parameters `Value Cell Reference`).
- [ ] 2.5 Update `SimJob`: replace `parameters?: Parameter[]` with `sweep: SweepParameters` (implements sweep-parameters `SweepParameters Type`).
- [ ] 2.6 Update `PresetConfig` and `SavedConfig`: replace `parameters?: Parameter[]` with `sweep: SweepParameters`; bump `SavedConfig.version` to 8 (implements persistence `Saved Config Version`).

## 3. Worker

- [ ] 3.1 In `src/worker/sim.worker.ts`, replace the `Parameter`-driven loop with a `Y → X` loop: for each `y in sweep.y` (or single outer pass when null), for each `x in sweep.x` (or single inner pass when empty), build a materialized `SimJob` by evaluating every `Expr` in the pool / pipeline / outcomes with `(x, y)`, then call the existing `runSimulation` against the materialized job (implements simulation `Parameter Sweep`, simulation `Expr Isolation`).
- [ ] 3.2 Set `sweepX = x` and `sweepY = y` on every emitted `SimResult`; set both to `null` when no sweep is active (implements simulation `SimResult Structure`).
- [ ] 3.3 Set the per-result `label` to `X=<x>` (X-only) or `Y=<y> · X=<x>` (both) (implements simulation `SimResult Structure`).
- [ ] 3.4 Import the evaluator from `@/utils/expression`; ensure the worker has no other Preact / DOM / Node imports beyond the existing list (implements simulation `Expr Isolation`).

## 4. State

- [ ] 4.1 In `src/state/app-state.ts`, replace the `parameters: Parameter[]` signal with `sweep: SweepParameters` (default `{ x: [], y: null }`) (implements sweep-parameters `SweepParameters Type`).
- [ ] 4.2 Rewrite `totalIterations` to compute `len(sweep.x) * (len(sweep.y) || 1) * 1_000_000` (implements sweep-parameters `Iteration Cost Calculation`).
- [ ] 4.3 Remove `activeSweepsByTarget`; it has no consumer in the new model.
- [ ] 4.4 Update `dicePoolNotation` to render expressions: for each term, render `exprToString(count) + 'd' + exprToString(sides) + (tag ? ' <' + tag + '>' : '')`. Drop the swept-range rendering — the expression is the indicator (implements ui `ExprInput`).
- [ ] 4.5 Update the `lastParamFingerprint` effect to key on `JSON.stringify(sweep.value)` (rename to `lastSweepFingerprint`); keep the high-cost reset behavior (implements ui `Sweep Cost Chip`).
- [ ] 4.6 Update `applyPresetConfig` and `resetToDefaults` to set / clear `sweep` (implements presets `Preset Application`).

## 5. ExprInput component

- [ ] 5.1 Create `src/components/ExprInput.tsx` exporting `ExprInput({ value: Expr, onChange, previewVars: { x?: number; y?: number }, label?, ariaLabel?, className? })`. Internally keep a `string` for the input, re-parse on commit, fall back to the previous valid string on parse failure, show a preview `= N` (or `= ?` if a referenced variable is unset) below the input, and an inline error message below the preview (implements ui `ExprInput`).
- [ ] 5.2 The component MUST NOT depend on Preact signals; it is a controlled input receiving `value` and `onChange` as props.

## 6. Sweep step

- [ ] 6.1 Create `src/components/SweepEditor.tsx` rendering the X and Y `TextField`s (placeholders `1, 2, 3, 4, 5` and `10, 15, 20`), the live readout, and the `SweepCostChip` below the readout. Disable the Y field when X is empty. Parse the field on commit, dedup and sort, cap at 10. When the user clears X, also clear Y (implements sweep-parameters `Sweep Step UI`, `Value Specification Format`).
- [ ] 6.2 Delete `src/components/ParameterEditor.tsx` and `src/components/SweepIndicator.tsx` and `src/components/SweepPopover.tsx`.
- [ ] 6.3 In `src/app.tsx`, import `SweepEditor` and pass `sweep.value` + an `onSweepChange` callback. Drop the `ParameterEditor` import and remove the `↻ Sweep` button / `SweepIndicator` imports from the DicePool, Pipeline, and Outcome editors (implements ui `ParameterEditor`, ui `Sweep Indicator`, ui `Sweep Popover`).

## 7. Editors

- [ ] 7.1 In `src/components/DicePoolEditor.tsx`: replace the `count` `TextField` and the `sides` `TextField` (custom sides field) with `ExprInput` (implements sweep-parameters `Value Cell Reference`). The notation preview uses `exprToString` for count and sides.
- [ ] 7.2 In `src/components/PipelineEditor.tsx`: replace the literal-value `TextField` in the binary-math-literal row with `ExprInput`. Drop the `↻ Sweep` button, the `SweepPopover`, the `SweepIndicator`, and the `parameters` / `activeSweepsByTarget` imports (implements sweep-parameters `Value Cell Reference`, ui `Sweep Popover`).
- [ ] 7.3 In `src/components/OutcomeEditor.tsx`: replace the value `TextField` in `OutcomeScalarCondition` and `OutcomeVectorCondition` with `ExprInput`. Drop the `↻ Sweep` button, the `SweepPopover`, the `SweepIndicator`, and the `parameters` / `activeSweepsByTarget` imports (implements sweep-parameters `Value Cell Reference`, ui `Sweep Popover`).

## 8. Cost chip

- [ ] 8.1 In `src/components/SweepCostChip.tsx`: change the cost computation to read `sweep` from app-state. Update the label to read `<Y> × <X> simulations · <N> rolls` when Y is set, `<X> simulations · <N> rolls` when Y is null, and `Single simulation · 1,000,000 rolls` when both are empty. Preserve the 50M confirmation button (implements sweep-parameters `Iteration Cost Calculation`, ui `Sweep Cost Chip`).
- [ ] 8.2 In `src/app.tsx`, update the run-button sub-label from `1M × <sweepCount>` to `1M × <lenX> · <lenY>` when Y is set, `1M × <lenX>` when Y is null (implements ui `Sticky Run Button`).

## 9. Result canvas

- [ ] 9.1 In `src/components/ResultView.tsx`: detect sweep via `sweepY` on the results. When all results have `sweepY = null`, render a single table + chart (today's behavior). Otherwise, group by `sweepY` and render one `Section` per Y with eyebrow `Y = <value>`, the probability table inside, and a `ParameterChart` per group. Drop the `Sweep <head> ∈ {values…}` caption (implements ui `Result Detail`, sweep-parameters `Result Grouping`).
- [ ] 9.2 In `src/components/DistributionChart.tsx`: `ParameterChart` accepts the new per-group results array; x-axis labels are derived from `r.sweepX` (falling back to `r.label`).
- [ ] 9.3 In `src/components/OddsTape.tsx`: when results have a Y sweep, the `OddsTape` shows the headline (top probability) for the first Y group's first X result. Add a `YGroupIndex` / `YValue` indicator under the preset name when Y is active.
- [ ] 9.4 In `src/components/ResultDetailsModal.tsx`: replace the per-result button bar with a Y-group selector (when Y is set) and an X-group selector (within the chosen Y). The "Sensitivity per Outcome" table and the "Sweep Value" header continue to work using the resolved X / Y values from `sweepX` / `sweepY`.

## 10. Validation

- [ ] 10.1 In `src/utils/validation.ts`: remove the `Parameter` validation block (max 3, target existence, etc.) and the `parameters.length > 3` check. Replace with sweep validation: X cap at 10 values, Y cap at 10 values, Y requires X (blocking). Add per-cell expression parse errors: any `Expr` in `DiceTerm.count`, `DiceTerm.sides`, `ScalarLiteralOp.value`, `ScalarCondition.value`, `DiceCondition.value` that fails to parse is a blocking error pointing at the cell (implements validation `Sweep Variable Validation`, `Expression Cell Validation`).
- [ ] 10.2 Update the `validateConfig` call in `src/app.tsx` to pass `sweep.value` instead of `parameters.value`.

## 11. YAML

- [ ] 11.1 In `src/utils/yaml.ts`: drop `parseParameterEntry` and `serializeParameterEntry`. Add `parseSweep(text): SweepParameters` accepting `x: [...]` and optional `y: [...]`. In `parsePool` / `parsePipelineEntry` / `parseOutcomeEntry` / `parseSingleOutcomeCondition`, parse the value cell as an expression string (e.g. `X+2`, `Y`, `15`) and return an `Expr` (implements persistence `YAML Preset Format`).
- [ ] 11.2 In `serializePool` / `serializePipelineEntry` / `serializeOutcomeEntry` / `parseOutcomeEntry`, write the value cell as the expression string via `exprToString`. The literal `15` is written as `15` (implements persistence `YAML Preset Format`).
- [ ] 11.3 In `astToPreset`, add a `sweep: parseSweep(ast['sweep'])` step and return `SweepParameters` in the `PresetConfig`. Remove the `parameters` parsing branch.
- [ ] 11.4 In `presetToAst`, emit `sweep: { x: config.sweep.x, y: config.sweep.y }` (omit `y` when null) and drop the `parameters` emit branch (implements persistence `YAML Preset Format`).

## 12. Persistence

- [ ] 12.1 In `src/state/persistence.ts`: bump `STORAGE_KEY` payload `version` to 8. Implement a v7 → v8 migration that:
  - Walks old `Parameter[]` and rewrites targeted cells to `ref X` (pool count/sides, outcome first-condition value, pipeline binary-literal value) and accumulates the parameters' `values` into a deduped, sorted `sweep.x`.
  - Wraps every other numeric value cell as `literalExpr(n)`.
  - Returns a fully v8 `SavedConfig` (implements persistence `v7 to v8 Migration`).
- [ ] 12.2 Ensure `loadConfig` falls back to defaults on a v8 parse error (preserves today's behavior).
- [ ] 12.3 Add a test in `tests/yaml.test.ts` (or a new `tests/persistence.test.ts`) that round-trips a v7 `SavedConfig` through the migration and asserts the resulting v8 config has the expected `sweep` and the expected `ref X` cells (implements persistence `v7 to v8 Migration`).

## 13. Presets

- [ ] 13.1 In `src/domain/presets.ts`, rewrite every preset to use `Expr` value cells and `SweepParameters`:
  - D&D 5e — d20: `sweep: { x: [5, 10, 15, 20], y: null }`, `Hit when total >= X`.
  - D&D 5e — Advantage 2d20: same, plus `best = max rolled` in the pipeline.
  - PbtA — 2d6: `sweep: { x: [-2, -1, 0, 1, 2], y: [10, 15] }`, `total_mod = total + X`, `Success when total_mod >= Y`. (Demo of Y.)
  - Shadowrun — Xd6: `sweep: { x: [1, ..., 10], y: null }`, `count: X`.
  - Cyberpunk RED — d10 + Skill: `sweep: { x: [10, 13, 15, 17, 20, 22, 25, 28, 30], y: null }`, `Success when total >= X`.
  - Blades in the Dark — Xd6: `sweep: { x: [1, ..., 8], y: null }`, `count: X`.
  - World of Darkness — Xd10 explode: `sweep: { x: [1, ..., 10], y: null }`, `count: X`.
  - Daggerheart — Duality (2d12): `sweep: { x: [-2, -1, 0, 1, 2, 3, 4, 5], y: null }`, `total_mod = total + X`.
  - Daggerheart — Compound: no sweep.
  - Vampire V5: no sweep.
  - Savage Worlds — Trait (d8) + Wild (d6): `sweep: { x: [4, 6, 8, 10, 12], y: null }`, the `trait` term's `sides: X`. The wild die sides is a literal `6`.
- [ ] 13.2 In `tests/presets.test.ts`, update assertions: every preset that previously checked `parameters` now checks `sweep`; literals in value cells are checked as `Expr` literals.

## 14. Specs

- [ ] 14.1 Update `openspec/specs/parameters/spec.md` to retire the old `Parameter` model and refer the reader to the `sweep-parameters` capability.
- [ ] 14.2 Update `openspec/specs/simulation/spec.md` to retire the old `Parameter Sweep` / `Parameter Application` / `SimResult` paragraphs and refer to the `sweep-parameters` and `expressions` deltas in the change set.
- [ ] 14.3 Update `openspec/specs/ui/spec.md` to retire the `SweepIndicator`, `SweepPopover`, `ParameterEditor`, `Stale Parameter Retarget` requirements and refer to the change-set deltas.
- [ ] 14.4 Update `openspec/specs/persistence/spec.md` to bump the saved-config version to 8 and document the `sweep` field.
- [ ] 14.5 Update `openspec/specs/presets/spec.md` to refer to the change-set delta for the v8 preset form.
- [ ] 14.6 Update `openspec/specs/validation/spec.md` to retire the old parameter rules and refer to the change-set deltas.
- [ ] 14.7 Promote the `expressions` and `sweep-parameters` deltas from `openspec/changes/sweep-parameters-redesign/specs/` into `openspec/specs/expressions/spec.md` and `openspec/specs/sweep-parameters/spec.md` at archive time.

## 15. Tests

- [ ] 15.1 Rewrite `tests/app-state.test.ts` to assert on `sweep` (X / Y) instead of `parameters` (implements sweep-parameters `SweepParameters Type`).
- [ ] 15.2 Rewrite `tests/validation.test.ts` to assert on the new sweep and expression validation rules (implements validation `Sweep Variable Validation`, `Expression Cell Validation`).
- [ ] 15.3 Update `tests/yaml.test.ts`: parameter parsing assertions become sweep + expression assertions; round-trip a v7-style preset (with `parameters:`) through the v8 parser to confirm the v7 form is rejected with a clear error (implements persistence `YAML Preset Format`).
- [ ] 15.4 Update `tests/presets.test.ts` to assert the v8 form of each preset (implements presets `Built-in Preset Format`).
- [ ] 15.5 Update `tests/integration.test.ts` worker tests to assert `sweepX` / `sweepY` on emitted results and to assert a 3 × 5 sweep produces 15 `SimResult` entries (implements simulation `Parameter Sweep`).

## 16. Verification

- [ ] 16.1 Run `npm run typecheck`; resolve any new type errors.
- [ ] 16.2 Run `npm run lint`; resolve any new lint errors (no rule suppression).
- [ ] 16.3 Run `npm run test`; ensure all existing tests pass after updates.
- [ ] 16.4 Run `npm run build`; ensure the production build succeeds.
- [ ] 16.5 Run `npx openspec validate --changes --strict`; resolve any spec errors.
- [ ] 16.6 Manual smoke check: load the PbtA preset, confirm the Sweep step shows `2 × 5 simulations · 10,000,000 rolls`, run the simulation, confirm two result sections appear (`Y = 10`, `Y = 15`) each with five rows for `X = -2 .. 2`.
- [ ] 16.7 Manual smoke check: load the D&D 5e — d20 preset, confirm a single result section with five rows for `X = 5, 10, 15, 20`.
- [ ] 16.8 Manual smoke check: edit a dice term's `count` to `X + 1`, confirm the notation preview reads `X+1 d 20` and the simulation runs the X sweep.
- [ ] 16.9 Manual smoke check: clear X in the Sweep step, confirm the Y field is disabled and clearing X clears Y.
- [ ] 16.10 Manual smoke check: type `X + foo` into a pipeline literal, confirm an inline parse error appears and the simulation does not run.
