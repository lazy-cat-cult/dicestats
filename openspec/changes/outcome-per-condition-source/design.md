# Design: outcome-per-condition-source

## Goals

- A single `Outcome` can AND/OR conditions evaluated against different named values.
- The "scalar vs vector" check is local to the condition, not derived from an outcome-level source.
- A configuration with the existing outcome-level `source` is migrated forward with no user action.
- The worker continues to import `evaluateOutcomes` from `classify.ts` (no inlining), preserving the existing isolation pattern.

## Non-Goals

- No new data model on the pipeline side. The pipeline already produces both scalar and vector values keyed by name in `env`.
- No new connector semantics. AND/OR is unchanged.
- No enforcement that all conditions in an outcome must share a source (intentional: it is now possible to mix).

## Data model

```ts
export type ScalarCondition = { source: string; op: ConditionOperator; value: number };
export type DiceCondition = { source: string; op: DiceConditionType; subCondition: ConditionOperator; value: number };
export type OutcomeCondition = ScalarCondition | DiceCondition;

export interface Outcome {
  id: string;
  name: string;
  conditions: OutcomeCondition[];
  connector: 'and' | 'or';
  comment: string;
  isDefault: boolean;
}
```

Discrimination is unchanged: a condition is a `DiceCondition` if `cond.op` is in `DICE_CONDITION_TYPES`; otherwise it is a `ScalarCondition`. The new `source` field is present on both.

## evaluateCondition

```ts
function evaluateCondition(cond: OutcomeCondition, env: Map<string, PipelineValue>): boolean {
  const sourceValue = env.get(cond.source);
  if (sourceValue === undefined) return false;

  if (DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType)) {
    const diceCond = cond as DiceCondition;
    if (!Array.isArray(sourceValue)) return false;
    const results = (sourceValue as TaggedDie[]).map((d) => compare(d.face, diceCond.subCondition, diceCond.value));
    if (diceCond.op === 'any') return results.some(Boolean);
    if (diceCond.op === 'all') return results.every(Boolean);
    return !results.some(Boolean);
  }

  if (typeof sourceValue === 'number') {
    const sc = cond as ScalarCondition;
    return compare(sourceValue, sc.op, sc.value);
  }
  return false;
}
```

The function is pure (it reads from a `Map` passed in), so the worker can continue to import it from `@/domain/classify`. No inlining is needed.

## evaluateOutcome

The outer loop iterates `outcome.conditions` and combines with `connector`; it no longer reads `outcome.source`. The empty-conditions → `isDefault` fallback is preserved.

## Validation

`validateConfig` changes:

1. For each outcome, the `if (outcome.source !== 'rolled') { ... }` block is removed.
2. For each `outcome.conditions[i]`:
   - Look up `cond.source` in `pipeline` names or check for `'rolled'`.
   - If not found → blocking error: `Outcome "{name}" condition references undefined source "{source}"`.
   - Resolve the type of `cond.source` (scalar / vector) using the same `inferType` already in the file (`src/utils/validation.ts:228-241`).
   - If `cond.op` is a `DiceConditionType` and the source is scalar → blocking error: `Outcome "{name}" dice condition cannot be used on scalar source "{source}"`.
   - If `cond.op` is a `ConditionOperator` and the source is vector → blocking error: `Outcome "{name}" scalar condition cannot be used on vector source "{source}"`.

The "first condition must be scalar" rule used by the parameter sweep still works because the worker's `applyParameter` (in `sim.worker.ts`) writes to the **first** condition regardless of which source it references, and validation already restricts that first condition to a scalar shape (rule 11 in the validation spec).

## OutcomeEditor

- The outcome-level source `<select>` is removed.
- Each condition row gains a per-condition source `<select>` (label = `name (num|vec)`) populated from `rolled` + all named pipeline values. The default selection when a new condition is created is the first scalar in the pipeline, or `'rolled'` if there is no scalar yet.
- When the user changes a condition's source and the type changes, the component auto-converts the condition shape (e.g. switching from a scalar source to `rolled` converts `{source, op: '>=', value: N}` to `{source: 'rolled', op: 'any', subCondition: '>=', value: N}`; switching from `rolled` to a scalar source converts `{op: 'any', subCondition, value: N}` to `{source, op: '>=', value: N}`). The existing `OutcomeScalarCondition` / `OutcomeVectorCondition` sub-components are kept; only the parent wiring changes.
- The `+ condition` button (max 5) creates a default condition using the first scalar source it can find (or `rolled`). The auto-conversion in the next change ensures the UI never displays a scalar sub-editor next to a vector source.
- The connector select and AND/OR semantics are unchanged.

## Persistence

- `SavedConfig.version` is bumped from `5` to `6`.
- `migrateV5ToV6` walks every outcome and copies `outcome.source` (or `'rolled'` if missing) into each condition that does not already carry a `source` field. After migration, every condition has a `source` and the outcome-level `source` is dropped.
- The current "v4 → v5" and "v3 → v4" branches are unchanged; the new branch slots in at the top of the chain (v6 → v5 → v4 → v3 → …).

## applyParameter (worker)

`src/worker/sim.worker.ts:165-175` currently writes a scalar value to `outcome.conditions[0].value`. With the new shape, the write must include `source: outcome.conditions[0].source, op: outcome.conditions[0].op, value` (or a safe default if `conditions[0]` is a dice condition — but validation already blocks that case, so the worker can simply preserve `op` and `source` and overwrite `value`).

## Preset

A new preset is added to `src/domain/presets.ts`:

```
id: 'daggerheart-compound'
name: 'Daggerheart — Compound Outcomes (2d12)'
pool: 1d12 tag:hope + 1d12 tag:fear
pipeline:
  hope_face = filter rolled where tag = hope
  fear_face = filter rolled where tag = fear
  total = sum rolled
  hope_value = max hope_face
  fear_value = max fear_face
  delta = subtract hope_value by fear_value
outcomes:
  "Critical Hit"   when total >= 15 AND delta >= 0
  "Critical Miss"  when total <= 5  AND delta < 0
  "Hope"           when delta > 0 (default)
```

This exercises the new feature directly: the two "Critical" outcomes each have one condition per source.

Existing presets are converted at write time by `resetToPreset` (in `app-state.ts`) and `applyPreset` (in `PresetSelector.tsx`): for every outcome in a preset, each condition is materialised with `source: outcome.source` before the signal is assigned. The on-disk `Outcome` shape in `PresetConfig` is updated to the new shape in the same edit (so we don't carry the v5 shape in code).

## Risks

- **Per-condition source allows referencing "later" pipeline values** — outcomes already reference pipeline values, but the prior model used a single source and the validation rule in `src/utils/validation.ts:156-161` was outcome-level. The new validation rule is per condition. We are intentionally NOT enforcing "prior row" ordering on outcome conditions (outcomes can reference any pipeline value by name). The `inferType` helper in `validation.ts:228-241` resolves types transitively, so a forward reference is technically resolvable but will yield `undefined` at run time. This is the same behaviour as a typo today.
- **Existing tests will need updates** — every test in `tests/classify.test.ts`, `tests/validation.test.ts`, and `tests/integration.test.ts` that constructs an `Outcome` with `source: 'x'` and a flat condition list must add `source` to each condition. The migration is mechanical.
- **The worker import is still safe** — `classify.ts` is pure (only imports from `@/types`); no Preact, DOM, or Node APIs. AGENTS.md's "Worker isolation" rule is satisfied without inlining.
