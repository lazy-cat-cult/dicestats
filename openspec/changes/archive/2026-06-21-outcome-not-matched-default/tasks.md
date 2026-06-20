## 1. Domain types

- [x] 1.1 Remove `isDefault: boolean` from `Outcome` interface in `src/types/index.ts` (implements outcomes `Outcome Structure`).
- [x] 1.2 Add `NOT_MATCHED_LABEL = 'Not matched'` constant to `src/types/index.ts` (implements outcomes `Independent Multi-Label Evaluation`).

## 2. Classify

- [x] 2.1 Update `evaluateOutcome` in `src/domain/classify.ts`: remove the `isDefault` check. An outcome with empty conditions returns `false` (implements outcomes `Outcome Structure`).
- [x] 2.2 Update `evaluateOutcomes` in `src/domain/classify.ts`: after evaluating all user-defined outcomes, if the match-set is empty, add `NOT_MATCHED_LABEL` to the result (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 2.3 Remove the second loop in `evaluateOutcomes` that unconditionally added default outcomes (implements outcomes `Independent Multi-Label Evaluation`).

## 3. Worker

- [x] 3.1 In `src/worker/sim.worker.ts`, ensure the outcome counter map is initialized with `NOT_MATCHED_LABEL` set to 0 so it appears in `SimResult.outcomes` even when count is 0 (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 3.2 In `src/worker/sim.worker.ts`, when building `SimResult.outcomes`, include "Not matched" in the output array (implements outcomes `Independent Multi-Label Evaluation`).

## 4. YAML parser/serializer

- [x] 4.1 In `src/utils/yaml.ts`, `parseOutcomeEntry`: remove `(default)` regex parsing. Remove `isDefault` field from returned `Outcome`. Remove `# default` special case (implements outcomes `Outcome Structure`).
- [x] 4.2 In `src/utils/yaml.ts`, `serializeOutcomeEntry`: remove `(default)` suffix output. Remove the `when (always) (default)` special case (implements outcomes `Outcome Structure`).
- [x] 4.3 In `src/utils/yaml.ts`, `astToPreset`: remove the multi-default validation check (`defaultCount > 1`) (implements outcomes `Outcome Structure`).

## 5. Validation

- [x] 5.1 In `src/utils/validation.ts`, remove the `isDefault`-related check: `outcome.conditions.length === 0 && !outcome.isDefault`. Replace with: `outcome.conditions.length === 0` always produces a warning (implements validation `Warning-Level Validation Rules`).

## 6. OutcomeEditor UI

- [x] 6.1 In `src/components/OutcomeEditor.tsx`, remove the "Default" checkbox rendering (implements ui `OutcomeEditor`).
- [x] 6.2 In `src/components/OutcomeEditor.tsx`, remove the "default" pill rendering (implements ui `OutcomeEditor`).
- [x] 6.3 In `src/components/OutcomeEditor.tsx`, `emptyOutcome`: remove `isDefault: false` from the returned object (implements outcomes `Outcome Structure`).

## 7. Result display components

- [x] 7.1 In `src/components/ResultView.tsx`, filter out "Not matched" from `result.outcomes` when its probability is 0 (implements ui `"Not matched" Outcome Display`).
- [x] 7.2 In `src/components/OddsTape.tsx`, filter out "Not matched" from `sorted` when its probability is 0 (implements ui `"Not matched" Outcome Display`).
- [x] 7.3 In `src/components/DistributionChart.tsx`, filter out "Not matched" from chart data when its probability is 0 (implements ui `"Not matched" Outcome Display`).

## 8. Presets

- [x] 8.1 In `src/domain/presets.ts`, remove `isDefault` from all outcomes in all presets (implements presets `Preset Configurations`).
- [x] 8.2 In `src/domain/presets.ts`, all catch-all outcomes with meaningful conditions are KEPT — only `isDefault` is stripped.
- [x] 8.3 In `src/domain/presets.ts`, for the Daggerheart compound preset, remove `isDefault: true` from "Hope" outcome.

## 9. YAML preset files

- [x] 9.1 In `doc/ttrpg/blades_in_the_dark.yaml`, remove `(default)` from "Failure" outcome (implements presets `Preset Configurations`).

## 10. Persistence

- [x] 10.1 In `src/state/persistence.ts`, bump `SavedConfig.version` from 6 to 7 (implements persistence `SavedConfig Schema`).
- [x] 10.2 In `src/state/persistence.ts`, update `migrateConfig` to handle v6→v7: strip `isDefault` from all outcomes (implements persistence `Migration from Older Versions`).
- [x] 10.3 In `src/state/persistence.ts`, update all earlier migration paths (v5, v4, v3, v1/v2) to strip `isDefault` from outcomes as the final step before returning (implements persistence `Migration from Older Versions`).
- [x] 10.4 In `src/state/persistence.ts`, remove `isDefault` from V1Outcome, V5Outcome, and v4Outcomes type definitions (implements persistence `SavedConfig Schema`).

## 11. Tests

- [x] 11.1 In `tests/classify.test.ts`, remove `isDefault: false` from all test outcome fixtures (implements outcomes `Outcome Structure`).
- [x] 11.2 In `tests/classify.test.ts`, update the "evaluates default outcome when no other matches" test: replace with a test that verifies "Not matched" is returned when no outcomes match (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 11.3 In `tests/classify.test.ts`, update the "default outcome is added to match-set unconditionally" test: replace with a test that verifies "Not matched" is only added when match-set is empty (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 11.4 In `tests/validation.test.ts`, remove `isDefault: false` from all test outcome fixtures (implements outcomes `Outcome Structure`).
- [x] 11.5 In `tests/validation.test.ts`, update the "allows multiple default outcomes" test: remove it (no longer relevant) (implements validation `Block-Level Validation Rules`).
- [x] 11.6 In `tests/validation.test.ts`, update the "reports error for outcome with no conditions and not default" test: change to verify warning for any outcome with no conditions (implements validation `Warning-Level Validation Rules`).
- [x] 11.7 In `tests/yaml.test.ts`, remove the "yaml multi-default validation" describe block entirely (implements outcomes `Outcome Structure`).
- [x] 11.8 In `tests/yaml.test.ts`, update the "parses dice-pool condition" test: remove `(default)` from the YAML input and remove the `isDefault` assertion (implements outcomes `Outcome Structure`).
- [x] 11.9 In `tests/yaml.test.ts`, update the "yaml inline comments" test: remove `(default)` from "Miss" outcome and remove the `isDefault` assertion (implements outcomes `Outcome Structure`).
- [x] 11.10 In `tests/integration.test.ts`, remove `isDefault: false` from all test outcome fixtures (implements outcomes `Outcome Structure`).

## 12. Spec updates (apply deltas to main specs)

- [x] 12.1 Apply `specs/outcomes/spec.md` delta to `openspec/specs/outcomes/spec.md` (implements outcomes all).
- [x] 12.2 Apply `specs/ui/spec.md` delta to `openspec/specs/ui/spec.md` (implements ui all).
- [x] 12.3 Apply `specs/validation/spec.md` delta to `openspec/specs/validation/spec.md` (implements validation all).
- [x] 12.4 Apply `specs/presets/spec.md` delta to `openspec/specs/presets/spec.md` (implements presets all).
- [x] 12.5 Apply `specs/persistence/spec.md` delta to `openspec/specs/persistence/spec.md` (implements persistence all).

## 13. Verification

- [x] 13.1 Run `npm run typecheck`; resolve any new type errors.
- [x] 13.2 Run `npm run lint`; resolve any new lint errors (no rule suppression).
- [x] 13.3 Run `npm run test`; ensure all existing tests pass after updates.
- [x] 13.4 Run `npm run build`; ensure the production build succeeds.
- [x] 13.5 Fixed code review findings: extracted `filterOutcomes` to `src/utils/outcomes.ts`, removed duplicate "Simulation · X rolls" from `SingleResult`.
