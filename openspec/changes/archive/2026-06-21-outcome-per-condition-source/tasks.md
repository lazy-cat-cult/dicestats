# Tasks: outcome-per-condition-source

## 1. Specs
- [ ] 1.1 Update `openspec/specs/outcomes/spec.md`: rewrite `Outcome Structure`, `Scalar Outcome Conditions`, `Dice Outcome Conditions`, `Invalid Source Reference`, `Condition Connector Semantics`, `Scalar-Vector Condition Mismatch Errors` so each condition carries its own `source`.
- [ ] 1.2 Update `openspec/specs/persistence/spec.md`: bump `SavedConfig.version` to `6`; add the v5 → v6 migration step in `Migration from Older Versions`.
- [ ] 1.3 Update `openspec/specs/presets/spec.md`: add the `Daggerheart — Compound Outcomes (2d12)` preset.
- [ ] 1.4 Update `openspec/specs/validation/spec.md`: rewrite the scalar/vector mismatch rules to be per-condition.

## 2. Types
- [ ] 2.1 In `src/types/index.ts`, define `ScalarCondition` and `DiceCondition` discriminated unions; `OutcomeCondition` becomes their union.
- [ ] 2.2 Remove `source` from `Outcome`.

## 3. classify.ts
- [ ] 3.1 Rewrite `evaluateCondition(cond, env)` to read `cond.source` from `env` and apply the scalar vs dice rule.
- [ ] 3.2 Update `evaluateOutcome` to iterate `outcome.conditions` (no outcome-level source lookup) and combine with `connector` as before.
- [ ] 3.3 Keep `evaluateOutcomes` shape unchanged.

## 4. worker
- [ ] 4.1 In `src/worker/sim.worker.ts`, update `applyParameter` so the `outcome.value` target writes `{ ...conditions[0], value }` (preserving `source` and `op`) instead of the current `{ ...cond, value }` shape.
- [ ] 4.2 Confirm the worker still imports `evaluateOutcomes` from `@/domain/classify` (no inlining needed; `classify.ts` is pure).

## 5. validation.ts
- [ ] 5.1 Remove the outcome-level `isScalar` derivation and the `if (outcome.source !== 'rolled')` block.
- [ ] 5.2 For each `outcome.conditions[i]`, emit blocking errors for: undefined source, scalar-on-vector, dice-on-scalar. Use the existing `inferType` helper.
- [ ] 5.3 Update `isScalarCondition` to be a pure type predicate (it already is) and ensure it still works on the new shape.

## 6. OutcomeEditor
- [ ] 6.1 Remove the outcome-level source `<select>`.
- [ ] 6.2 In each condition row, add a per-condition source `<select>` populated from `rolled` + all named pipeline values, label = `name (num|vec)`.
- [ ] 6.3 When the user changes a condition's source, look up the new source's type. If the type changes, auto-convert the condition shape (scalar ↔ dice) preserving `value`.
- [ ] 6.4 The `+ condition` button creates a default condition: scalar source if any scalar pipeline value exists, otherwise `rolled`.
- [ ] 6.5 The empty-default outcome still works: zero conditions + `isDefault: true` is the fallback.

## 7. persistence.ts
- [ ] 7.1 Bump `SavedConfig.version` to `6` in `saveConfig`.
- [ ] 7.2 Add a `v5 → v6` branch at the top of `migrateConfig` that copies `outcome.source` (or `'rolled'`) into every `condition` lacking a `source` field, then returns the new shape with `version: 6`.
- [ ] 7.3 Bump the `interface V3Config` and `V1Config` types if needed; the new `V5Config` and `V6Config` are added for clarity.

## 8. Presets
- [ ] 8.1 Convert the existing presets in `src/domain/presets.ts` to the new shape (move `source` into each condition).
- [ ] 8.2 Add the new `daggerheart-compound` preset as defined in the design doc.
- [ ] 8.3 Convert at write time: `resetToPreset` and `applyPreset` already deep-copy, so no extra conversion is needed once the presets are in the new shape.

## 9. Tests
- [ ] 9.1 Update `tests/classify.test.ts`: every `Outcome` literal that has `source` at the outcome level must add `source` to each `conditions[i]`.
- [ ] 9.2 Add a `tests/classify.test.ts` case for `total >= 15 AND delta >= 0` against a small in-test pipeline with a literal subtract step.
- [ ] 9.3 Update `tests/validation.test.ts`: every `makeOutcome` and `Outcome` literal must add `source` to each condition; replace the outcome-level `source: 'rolled'` patterns.
- [ ] 9.4 Add `tests/validation.test.ts` cases: scalar condition on vector source per condition, dice condition on scalar source per condition, undefined source per condition.
- [ ] 9.5 Add `tests/integration.test.ts` case: Daggerheart compound-outcome preset exercise.
- [ ] 9.6 Run `npm run typecheck`, `npm run lint`, `npm run test` — all green.

## 10. Verification
- [ ] 10.1 Run `verification-loop` skill and confirm `Overall: READY for PR`.
