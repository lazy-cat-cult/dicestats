## Context

The current "Sweep Parameters" design uses an array of `Parameter` objects, each a `target` + `values` pair that mutates a single value cell (`pool.count`, `pool.sides`, `outcome.value`, `pipeline.literal`) once per value. The `SweepPopover` modal and the per-cell "↻ Sweep" button live in three different editors and have to be repeated for every cell. The sweep cost is hidden in a `SweepCostChip` below the `ParameterEditor`, and the 50M confirm gate is a separate button.

The new design replaces all of that with two top-level sweep variables X and Y and a small expression language embedded directly in the value cells. The implementation is large but mechanical: a new `Expr` AST and parser, replacement of `number` with `Expr` in five type locations, a new `ExprInput` component, a new `SweepEditor` step, and a rewritten worker iteration loop that materializes Exprs to numbers per `(x, y)` and runs the existing single-shot simulation unchanged.

The simulation core (`rollDie`, `rollPool`, `applyRerollConditions`, `evaluatePipeline`, `evaluateOutcomes`) is not touched. The hot path remains the same 1,000,000-iteration Monte Carlo loop on plain numbers; Expr evaluation happens once per `(x, y)` outside the loop.

## Goals / Non-Goals

**Goals:**
- Sweep any combination of value cells (dice count, dice sides, pipeline literal, outcome value) using X and Y as variables.
- A single `ExprInput` for every numeric value cell; the input accepts expressions like `X`, `X + 2`, `Y * 2 - 1`, `(X + Y) / 2`.
- Y is optional; when unset, the result canvas is bit-for-bit equivalent to today's single-sweep result.
- When Y is set, the result canvas renders `len(Y)` independent result sections (table + line chart), each titled `Y = <value>` and each containing a full X sweep.
- Live cost readout in the Sweep step (`<Y> × <X> simulations · <N> rolls`); the 50M confirm gate is preserved.
- v7 → v8 persistence migration: rewrite the first swept cell to `ref X` per old `Parameter` and merge values into `sweep.x`; numeric value cells become literal Exprs.
- No new runtime dependencies.

**Non-Goals:**
- No change to the single-shot simulation algorithm.
- No expression variables other than X and Y.
- No expression functions (sin, log, mod, etc.) — only `+ - * /` and parentheses over literals and the two variables.
- No live in-canvas preview of the sweep curve as the user edits — charts appear after the run, exactly as today.
- No drag-and-drop reordering of X / Y.
- No new presets — existing presets are rewritten to the new format. A demo Y preset is added to the PbtA entry.

## Decisions

### 1. Expr lives in value cells as an AST, not a string
**Decision:** `Expr` is `{ kind: 'literal'; value: number } | { kind: 'ref'; name: 'X' | 'Y' } | { kind: 'binop'; op: '+'|'-'|'*'|'/'; left: Expr; right: Expr }`. The `ExprInput` keeps a `string` for editing and the parsed `Expr` (or last parse error) in state; the rest of the app stores and reasons about the AST.
**Rationale:** A string would be cheaper to type-check but requires parsing on every read (in the worker, in the dice notation, in the cost chip). The AST is a small, total, free-of-surprises data structure and the parser is ~80 LOC. Strings live only inside the input component, so the rest of the codebase never has to think about syntax.
**Alternatives:** Keep a string everywhere and parse lazily — rejected, because the worker and the dice notation need to evaluate per cell on every sweep step. Store as a precompiled closure — rejected, prevents serialization (YAML, localStorage) and is not necessary given the simple grammar.

### 2. Materialize Exprs once per (x, y), not per Monte Carlo iteration
**Decision:** The worker evaluates every Expr in the configuration (pool counts, sides, pipeline literals, outcome condition values) for each `(x, y)` combination to produce a fully numeric config. It then calls the existing `runSimulation(pool, reroll, pipeline, outcomes, iterations, taskName)` against that materialized config. Expr evaluation never happens inside the 1M-iteration loop.
**Rationale:** The simulation core is already well-tested and fast. Re-evaluating 5+ expressions per iteration across 1M iterations × `len(Y) * len(X)` sweep steps would be wasteful and would force us to thread the Expr evaluator into the domain layer (which would break worker isolation if the parser pulled in any helpers). The materialize-then-simulate split keeps the domain layer number-only and the parser/evaluator confined to `src/utils/expression.ts`.
**Alternatives:** Pass the Expr evaluator into `evaluatePipeline` / `evaluateOutcomes` so the simulation is "sweep-aware" — rejected, spreads sweep logic into the domain and complicates the worker boundary. Pre-compute dice counts / sides / literals only and leave outcome values symbolic — rejected, outcomes are evaluated per roll so they would still need materialization.

### 3. SimResult gains `sweepX?` and `sweepY?`
**Decision:** Each `SimResult` carries optional `sweepX: number | null` and `sweepY: number | null`. The worker sets them when a sweep is active (`sweepX = x`, `sweepY = y` for that step; `null` when the sweep is not active for that axis). The UI groups by `sweepY` and labels the x-axis with `sweepX`.
**Rationale:** Parsing the X / Y values out of `result.label` is brittle (labels are user-visible strings; localization or a rename would break the grouping). Carrying the numeric values on the result is the same shape used for `totalRolls` / `outcomes` — typed, parse-free, and easy to test.
**Alternatives:** Derive from `label` — rejected for the reasons above. Wrap results in a `SweepResult { y: number | null; results: SimResult[] }` — rejected, doubles the number of types the UI has to know about and complicates the worker protocol.

### 4. Expression grammar is minimal
**Decision:** Grammar is `expr := term (('+' | '-') term)*; term := factor (('*' | '/') factor)*; factor := number | 'X' | 'Y' | '(' expr ')' | ('-' | '+') factor; number := /-?\d+(\.\d+)?/`. No functions, no comparisons, no booleans. Division by zero returns 0 in the evaluator (mirroring the existing `divide` semantics in `applyScalarBinary`).
**Rationale:** The user's example only needs `total + X` and `total_mod >= Y`. A comparison operator lives in the outcome condition (`>=`, `=`, etc.), not in the value cell — the value cell produces a single number. A minimal grammar keeps the parser tiny, the error messages obvious, and the input affordance honest. If the user later wants `sin(X)` or comparisons, the AST can be extended; nothing here forecloses that.
**Alternatives:** Reuse the pipeline parser (which already parses `name = source + literal`) — rejected, that parser is single-pass per pipeline row and not designed for the standalone use we need here. Use a library (e.g. mathjs) — rejected, adds a dependency for a 30-line feature.

### 5. Sweep step is two text fields + a cost readout
**Decision:** The "Sweep Parameters" step renders, in order: a short description; an X values `TextField` (`1, 2, 3, 4, 5` placeholder); a Y values `TextField` (`10, 15, 20` placeholder, disabled when X is empty); a live cost chip below the two fields. There is no `Add parameter` button, no parameter list, no parameter cards, no per-cell sweep indicators. The cost chip is the same `SweepCostChip` component as today (with its label updated to `Y × X simulations · N rolls`).
**Rationale:** Two text fields is the minimum that meets the spec ("Y cannot be set without X", "X is set first, Y second", "Y is rendered as `len(Y)` tables and charts"). Removing the parameter array and the per-cell affordances collapses three editors (DicePool / Pipeline / Outcome) of "↻ Sweep" plumbing into zero. The cost chip is the single source of truth for "what will this run cost", which is what the spec demands.
**Alternatives:** Keep the parameter list but rename it to "X" / "Y" — rejected, leaves the per-cell sweep wiring in place for no benefit. Put X / Y in a modal — rejected, the user wants to *see* the values at all times while they edit expressions in the value cells.

### 6. Value-cell coercion is clamping
**Decision:** When the worker materializes an Expr for `(x, y)`, integer cells (dice count, dice sides) are coerced via `Math.max(1, Math.round(value))`. Float cells (pipeline literal, outcome condition value) keep their natural float. The dice-notation preview in the UI uses the same coercion for display only.
**Rationale:** A user writing `X - 1` for a dice count expects the simulation to do something sensible when `X = 0`; clamping to 1 is the only behavior that keeps the dice loop valid. Pipeline literals and outcome values are floats by construction (the existing divide-by-zero path returns 0), so no coercion is needed there.
**Alternatives:** Reject Exprs that don't evaluate to an integer — rejected, it would block common cases like `X / 2` used as a modifier. Throw on negative / zero — rejected, makes the input UX hostile; clamping is forgiving and the worker can warn via a non-blocking validation message if desired (out of scope for this change).

### 7. Migration rewrites swept cells, keeps the rest
**Decision:** v7 → v8 migration walks old `Parameter[]`:
- For each old `Parameter` with a numeric target, the targeted cell's `value` is rewritten to `{ kind: 'ref', name: 'X' }` and the parameter's `values` are added to a single `sweep.x` (deduplicated, sorted ascending).
- Y is always `null` from v7.
- All other numeric value cells in pool / pipeline / outcomes are wrapped as `{ kind: 'literal', value: n }`.
- Old `Parameter.targetOutcomeId` / `targetTermId` / `targetPipelineId` (UUIDs) are used to locate the targeted cell by id.

**Rationale:** The user expects "radical change" but localStorage is a developer's playground during this transition. The migration is best-effort: it preserves the *intent* of the old sweep (X overrides the swept value) even though the concrete layout is different. Local configs from v7 still load and still run.
**Alternatives:** Drop the migration entirely and start every v8 load with empty sweep — rejected, would be more disruptive than the proposed migration and is not what a "radical change" needs to do (the data, not the user's sweep, is what changes).

### 8. No new dependencies
**Decision:** The expression parser is hand-rolled (~80 LOC). The preact / chart.js / vite / vitest / tailwind stack is unchanged. No npm additions.
**Rationale:** A 30-line grammar does not justify a math-expression library. The project rule "no new dependencies unless necessary" applies.

## Risks / Trade-offs

- **Risk:** Users may type expressions that don't make sense (e.g. `Y / 0` in a dice count). → **Mitigation:** The `ExprInput` shows a parse error inline; the worker clamps to 1 with no error; validation surfaces a non-blocking warning when an Expr evaluates to 0 or negative for a count/sides cell (out of scope; can be added later if it becomes a problem).
- **Risk:** The `SweepIndicator` / `SweepPopover` are removed, breaking the "see sweep at a glance" affordance users have now. → **Mitigation:** The `ExprInput` shows the expression text (e.g. `X + 2`), which is itself the indicator. A future iteration can add a small "🔁 swept" pill next to the input driven by `SweepParameters.x` / `y` membership if the affordance is missed.
- **Risk:** The PbtA preset's new Y axis raises the canonical run to 10M rolls, which is at the 10M-warning threshold. → **Mitigation:** The 10M warning is informational; 50M confirmation is the blocking gate, and 10M is well under it. Users who want a lighter run can clear Y.
- **Risk:** `dicePoolNotation` rendering expressions (e.g. `(X+2)d20`) is less compact than today's `1..5d20`. → **Mitigation:** The expression string is shown verbatim; if it gets noisy the user can hover for a `= <evaluated>` tooltip (out of scope).
- **Risk:** YAML presets that use the old `parameter` block will fail to parse. → **Mitigation:** The v8 YAML parser is forward-only; users with old YAML files will see a parse error pointing at the `parameter:` line. Doc migration (`doc/ttrpg/*.yaml`) is part of the change.
- **Risk:** `SweepIndicator` and `SweepPopover` are deleted; any other code that imports them breaks the build. → **Mitigation:** Search-and-remove all imports in the same PR (DicePoolEditor, PipelineEditor, OutcomeEditor, app.tsx). The TypeScript compiler will catch any that is missed.
- **Risk:** Tests that exercise `Parameter` directly (validation, yaml, app-state) need to be rewritten. → **Mitigation:** New `tests/expression.test.ts` covers the new core; the old tests are replaced with equivalent sweep / Expr tests.

## Migration Plan

1. Land the OpenSpec change (this change set) on a feature branch.
2. Ship in a single PR. The PR removes `Parameter` from the public type surface and bumps the persistence version; old `localStorage` entries are migrated on load by `persistence.ts`.
3. The worker's `parameters` field is removed; there is no runtime fallback for v6-style jobs (the worker only ever receives v8 jobs from the v8 app). Old v7-vintage presets opened in v8 trigger the v7 → v8 migration in `astToPreset` / `resolveReferences` (see `src/utils/yaml.ts`).
4. Rollback: revert the PR. The v8 `localStorage` entries are forward-incompatible with v7, so users who down-migrate will lose their saved config; `loadConfig` returns `false` on a parse error and the app falls back to defaults. This is the same fallback behavior as a v6 → v7 bump.

## Open Questions

- Should the Sweep step's Y field render a "Y axis" hint near each result section (e.g. a "Y axis" eyebrow above the line-chart x-axis label)? Resolved: yes, the line chart's existing x-axis title is replaced with `X = <value>` per section, and the section header carries `Y = <value>`.
- Should the migration of v7 presets in YAML rewrite the swept cell to `ref X` automatically, or warn the user and ask? Resolved: rewrite silently — the OpenSpec rules say the YAML format is the source of truth for v8; old YAMLs are migrated to the v8 form when saved back.
