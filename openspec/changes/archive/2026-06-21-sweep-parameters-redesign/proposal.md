## Why

The current "Sweep Parameters" model lets the user declare up to three named `Parameter` objects, each pinning a single target (`pool.count`, `pool.sides`, `outcome.value`, `pipeline.literal`) to a value list. This forces the user to wire a sweep into exactly one value cell at a time, and the per-cell "↻ Sweep" affordance has to be repeated for every swept cell. The result is a workflow that scales poorly to compound questions (e.g. "how does the success curve change when both the modifier and the DC vary?") and that hides the swept value behind a popover far from the value it overwrites.

The change replaces the parameter array with **two top-level sweep variables, X and Y**, that can be referenced *inside any numeric value cell* (dice count, dice sides, pipeline literal, outcome condition value) using a small arithmetic expression language. X is required for a sweep; Y is optional and only meaningful with X. When Y is unset the model collapses to today's behavior bit-for-bit. When Y is set the result canvas renders `len(Y)` independent tables and line charts, one per Y value, each showing the full X sweep at that Y.

## What Changes

- **BREAKING** Replace `Parameter[]` (with `target` / `targetTermId` / `targetOutcomeId` / `targetPipelineId`) with a single `SweepParameters { x: number[]; y: number[] | null }` value. X and Y are plain lists of numbers (0–10 entries each). Y is null when unset.
- **BREAKING** Change every numeric value cell in the configuration to an `Expr` (expression) instead of a plain `number`:
  - `DiceTerm.count` and `DiceTerm.sides` become `Expr`.
  - `ScalarLiteralOp.value` (binary-math literal in the pipeline) becomes `Expr`.
  - `ScalarCondition.value` and `DiceCondition.value` (outcome checks) become `Expr`.
  - `Expr` is a small AST: literal number, reference to `X` / `Y`, or a binary op `+ - * /` over two `Expr`s. A hand-rolled recursive-descent parser and pretty-printer live in `src/utils/expression.ts`.
- **New** A shared `ExprInput` component renders a numeric value cell as a text input that accepts expressions like `X`, `X + 2`, `Y * 2 - 1`, `(X + Y) / 2`, and shows a live preview of the evaluated value (`= 7`) when X / Y have preview values.
- **New** The "Sweep Parameters" step (renamed in place) is two stacked text fields — **X values** and **Y values** — above a live readout `<len(Y)> × <len(X)> simulations · <N> rolls`. The first field is enabled by default with the placeholder `1, 2, 3, 4, 5`. The second field is enabled only when X is non-empty; clearing X also clears Y.
- **Removed** The `SweepIndicator`, `SweepPopover`, and the per-cell "↻ Sweep" buttons. With X / Y living in the Sweep section, swept cells now show their expression text (e.g. `X + 2`) in the `ExprInput` and the user can see the sweep at a glance.
- **New** The result canvas groups results by Y. When Y is unset, a single probability table + line chart is shown (today's behavior). When Y is set, the canvas renders `len(Y)` distinct result sections in order, each titled `Y = <value>`, each containing its own probability table and its own line chart (`Probability by X for Y = <value>`).
- **Modified** The simulation worker: for each `y in Y` (or one outer pass when Y is null), for each `x in X`, evaluate every `Expr` in the configuration with `(x, y)` to produce a materialized `SimJob` (numbers in all value cells), run the existing 1,000,000-iteration simulation, and emit a `SimResult` with label `X=<x>` (no Y) or `Y=<y> · X=<x>`. `SimResult` gains two optional fields, `sweepX?: number | null` and `sweepY?: number | null`, that the UI uses for grouping and x-axis labelling.
- **Modified** The total iteration cost is `len(Y) * len(X) * 1_000_000` (or `len(X) * 1_000_000` when Y is null). The 50M confirm gate in `SweepCostChip` is preserved.
- **BREAKING** Persistence version bumps to 8. Saved v7 configs migrate as follows: every old `Parameter` that targeted `pool.count`, `pool.sides`, `outcome.value`, or `pipeline.literal` rewrites the targeted cell's numeric value to `ref X` and contributes its `values` to a single deduplicated sorted `sweep.x`; Y is always `null` from v7. Numeric value cells in pool / pipeline / outcomes that were not swept become `{ kind: 'literal', value: <n> }`.
- **BREAKING** Built-in presets are rewritten. The `parameter` / `applyTo` form is replaced with a `sweep` mapping (`x: [...]`, optional `y: [...]`) and the swept cells are encoded as `X` / `Y` references in the expression syntax. The PbtA preset becomes the canonical example: X is the modifier added to the roll, Y is the DC threshold.

## Capabilities

### New Capabilities
- `expressions`: a small expression language for numeric value cells, with parser, evaluator, and pretty-printer. The `Expr` AST is the wire format; the parser is a recursive-descent parser over the grammar `expr := term (('+' | '-') term)*; term := factor (('*' | '/') factor)*; factor := number | 'X' | 'Y' | '(' expr ')' | ('-' | '+') factor`.
- `sweep-parameters`: the X / Y sweep model, its UI, its cost calculation, and the worker iteration algorithm.

### Modified Capabilities
- `parameters`: the entire `Parameter` / `ParameterTarget` model is removed. The old spec is rewritten under the new X / Y model (its `requirements/` directory is replaced by the `sweep-parameters` capability above; the file is kept for delta purposes and the old `Parameter Structure`, `Outcome Value Targeting`, `Pipeline Literal Targeting`, `Parameter Limit`, `Iteration Warning Thresholds` requirements are retired).
- `simulation`: the `Parameter Sweep` and `Parameter Application` requirements are rewritten to describe X / Y iteration and the per-`(x, y)` Expr materialization.
- `ui`: the `ParameterEditor`, `Sweep Indicator`, `Sweep Popover`, `Sweep Cost Chip` requirements are rewritten for the X / Y form (no popovers, no per-cell indicators, cost chip shows Y × X sims).
- `persistence`: the saved-config schema gains a `sweep: SweepParameters` field; the v7 → v8 migration is documented.
- `presets`: built-in presets are restructured to use `sweep` + `Expr` value cells.
- `validation`: rules 11 (parameters) and the value-cell rules are updated to the new model.

## Impact

- `src/types/index.ts`: remove `Parameter`, `ParameterTarget`; add `Expr`, `SweepParameters`; change `DiceTerm.count`, `DiceTerm.sides`, `ScalarLiteralOp.value`, `ScalarCondition.value`, `DiceCondition.value` to `Expr`; add `sweepX?` and `sweepY?` to `SimResult`; bump `SavedConfig.version` to 8.
- `src/utils/expression.ts` (new): `parseExpr`, `exprToString`, `evalExpr`, `exprToNumber` (clamped integer coercion), `literalExpr(n)`.
- `src/components/ExprInput.tsx` (new): text input with live preview and parse-error display.
- `src/components/SweepEditor.tsx` (new, replaces `ParameterEditor.tsx`): X and Y value lists + cost readout.
- `src/components/DicePoolEditor.tsx`, `src/components/PipelineEditor.tsx`, `src/components/OutcomeEditor.tsx`: switch the value cells to `ExprInput`; drop the `↻ Sweep` button, the `SweepPopover` import, and the `SweepIndicator` import.
- `src/components/SweepIndicator.tsx` and `src/components/SweepPopover.tsx`: deleted.
- `src/components/SweepCostChip.tsx`: read `totalIterations` from the new model; label changes to `<Y> × <X> simulations · <rolls> rolls`.
- `src/components/ResultView.tsx`, `src/components/DistributionChart.tsx`, `src/components/ResultDetailsModal.tsx`, `src/components/OddsTape.tsx`: group `SimResult[]` by `sweepY`; when Y is set, render one section per Y with its own table and chart.
- `src/app.tsx`: replace `parameters.value` with `sweep.value`; update the run sub-label to `1M × <X> · <Y>`.
- `src/worker/sim.worker.ts`: replace the parameter-application loop with a `Y → X` loop that materializes Exprs to numbers per `(x, y)` and runs the existing single-shot `runSimulation` against the materialized config. Populate `sweepX` and `sweepY` on each `SimResult`.
- `src/state/app-state.ts`: replace the `parameters` signal with `sweep: SweepParameters`; recompute `totalIterations`; remove `activeSweepsByTarget`; update `dicePoolNotation` to render expressions (e.g. `(X+2)d(20)` → `X+2 d 20`); update the `lastParamFingerprint` effect to key on `sweep`.
- `src/utils/validation.ts`: replace parameter validation with sweep validation (X required for sweep, Y requires X, max 10 values per parameter, no duplicate values, no invalid cell reference).
- `src/utils/yaml.ts`: the preset format gains `sweep: { x: [...], y: [...] }`; outcome / pipeline / pool value cells serialize as their expression string (so the user sees `X + 2` not a JSON tree); parameter parsing is removed.
- `src/state/persistence.ts`: bump to v8; the migration walks old `Parameter[]` entries and converts them to `sweep.x` and `ref X` cells.
- `src/domain/presets.ts`: every preset rewritten to use `Expr` cells and `SweepParameters`. The PbtA preset becomes `sweep: { x: [-2, -1, 0, 1, 2], y: [10, 15] }` with `total_mod = total + X` and `Hit when total_mod >= Y`.
- `doc/ttrpg/*.yaml`: mirror the preset changes (D&D 5e, PbtA, Cyberpunk RED, Blades, Shadowrun, Savage Worlds, World of Darkness, Daggerheart) — the `parameters:` block becomes `sweep:` and the swept cells use `X` / `Y` in the inline value syntax.
- Tests: rewrite `tests/app-state.test.ts`, `tests/validation.test.ts`, `tests/yaml.test.ts`, `tests/presets.test.ts`, `tests/integration.test.ts` to the new model. Add `tests/expression.test.ts` for the parser / evaluator.
- No new dependencies.
