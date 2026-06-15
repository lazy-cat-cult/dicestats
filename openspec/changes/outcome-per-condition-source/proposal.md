# Proposal: outcome-per-condition-source

## Why

Today every `Outcome` in `src/types/index.ts:75-83` has a single `source: string` at the outcome level, and all `conditions[]` are evaluated against that one source. This is fine for outcomes like "Hit when total >= 15", but it blocks whole categories of real game mechanics where a single outcome must combine conditions against different named values.

A concrete example is the Daggerheart Duality system already shipped as a preset (`openspec/specs/presets/spec.md:80-95` and `src/domain/presets.ts:263-351`). The system models Hope vs Fear: the GM awards "Hope" if `hope_value > fear_value`, "Fear" if `hope_value < fear_value`, and "Critical Success" on a tie. Because each side compares `delta` against zero, the existing model is sufficient. But many Daggerheart adventures require a *compound* outcome such as "Critical Hit when total >= 15 AND Delta >= 0" — a hit on the damage roll *and* an advantage on the hope/fear check. With per-condition source, this becomes trivial: `{ source: 'total', op: '>=', value: 15 } AND { source: 'delta', op: '>=', value: 0 }`. With the current model it is impossible — both conditions are forced to evaluate against the same source.

The second motivation is the **typecheck / linting cost** of the current `OutcomeCondition` union (`src/types/index.ts:71-73`): the union has no `source` field and is discriminated only by `op`, which means consumers must re-derive the source from the outcome and re-derive the type (scalar vs vector) from the pipeline at every read site (`src/components/OutcomeEditor.tsx:34-39`, `src/utils/validation.ts:163-167`). Moving `source` into the condition collapses that logic into a single lookup and lets the validation rule be local to the condition rather than spread across the outcome loop.

## What Changes

- **Modify** `src/types/index.ts`:
  - Remove `source: string` from `Outcome`.
  - Define `ScalarCondition = { source: string; op: ConditionOperator; value: number }`.
  - Define `DiceCondition = { source: string; op: DiceConditionType; subCondition: ConditionOperator; value: number }`.
  - `OutcomeCondition = ScalarCondition | DiceCondition`, discriminated by `op` (a `DiceConditionType` is a `DiceCondition`, anything else is a `ScalarCondition`).
- **Modify** `src/domain/classify.ts`:
  - `evaluateCondition(cond, env)` reads `cond.source`, looks the value up in `env`, and applies the scalar / dice rule. The scalar-vs-dice split is decided by the resolved pipeline type, exactly as today.
  - `evaluateOutcome` and `evaluateOutcomes` iterate `outcome.conditions` and combine with `connector`; the function signatures otherwise do not change.
- **Modify** `src/worker/sim.worker.ts`:
  - The worker already imports `evaluateOutcomes` from `@/domain/classify` (the existing pattern, see AGENTS.md "Worker isolation"). No inlining is required; the import still satisfies the boundary because `classify.ts` is pure.
- **Modify** `src/utils/validation.ts`:
  - Replace the per-outcome `isScalar` derivation with a per-condition `inferConditionType(cond, pipeline)` call.
  - Emit blocking errors: scalar condition on vector source, dice condition on scalar source, and undefined source per condition.
- **Modify** `src/components/OutcomeEditor.tsx`:
  - Remove the outcome-level source `<select>`.
  - Each condition row shows a per-condition source `<select>` (label = `name (num|vec)`) populated from `rolled` and all named pipeline values. Outcomes can reference any pipeline value (the "prior row" rule is intentionally relaxed — see Risks).
  - The scalar vs dice sub-editor is chosen by the resolved type of the selected source. When the user switches a condition's source and the type changes, the component auto-converts the condition shape (e.g. switching from a scalar `>=` source to `rolled` converts `{op: '>=', value: N}` to `{op: 'any', subCondition: '>=', value: N}`). This mirrors the existing auto-conversion at `src/components/PipelineEditor.tsx:146-160`.
  - The `+ condition` button creates a default condition using the first valid scalar source (`sum`/`count`/etc.) or `rolled` if none.
  - Connector select and AND/OR semantics are unchanged.
- **Modify** `src/state/persistence.ts`:
  - Bump `SavedConfig.version` to `6`. (`5` is the current shipped version after the existing v1/v3→v5 migrations.)
  - Add `migrateV5ToV6` that, for every outcome, copies `outcome.source` into every `condition` that does not already carry a `source` field. Default missing values to `'rolled'`.
- **Modify** `src/domain/presets.ts`:
  - Add a new "Daggerheart — Compound Outcomes (2d12)" preset that exercises the new feature: outcomes that AND/OR conditions against two different pipeline values. (See "Impact" for the exact shape.)
  - Existing presets keep their `outcome.source` field for `resetToPreset` but are converted at write time (see "Migration" above and "Implementation Notes" below).

## Impact

- Affected specs:
  - `openspec/specs/outcomes/spec.md` — `Outcome Structure`, `Scalar Outcome Conditions`, `Dice Outcome Conditions`, `Invalid Source Reference`, `Condition Connector Semantics` all need updates because the per-condition source is now part of the condition shape.
  - `openspec/specs/persistence/spec.md` — `SavedConfig Schema` (version → 6), `Migration from Older Versions` (add v5 → v6 step).
  - `openspec/specs/presets/spec.md` — add the new Daggerheart compound-outcome preset and note the v6 schema change.
  - `openspec/specs/validation/spec.md` — rules 9 and 13 (Scalar-Vector Condition Mismatch) rewrite to act per condition.
- Affected code (implementation phase):
  - `src/types/index.ts` — `OutcomeCondition` and `Outcome` types.
  - `src/domain/classify.ts` — `evaluateCondition` signature.
  - `src/worker/sim.worker.ts` — `applyParameter` (`outcome.value` target) needs to write the new condition shape.
  - `src/utils/validation.ts` — per-condition source/type checks.
  - `src/components/OutcomeEditor.tsx` — per-condition source, comment toggle (handled in the `ui-comment-collapsible` change, but the data shape is required here).
  - `src/state/persistence.ts` — `migrateV5ToV6`, version bump.
  - `src/domain/presets.ts` — new preset.
  - `tests/classify.test.ts`, `tests/validation.test.ts`, `tests/integration.test.ts` — new cases.

## Non-Goals

- No change to pipeline validation, reroll validation, or parameter sweep behaviour.
- No change to `PipelineEditor`, `RerollEditor`, or `DicePoolEditor`.
- No change to the worker algorithm — only the `applyParameter` condition-shape write.
- No removal of the `connector` field. AND/OR stays at the outcome level.
- No enforcement that an outcome's `conditions` must all reference the same source — that is the whole point of this change.
