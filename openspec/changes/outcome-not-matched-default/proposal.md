## Why

The current `isDefault` flag on outcomes is confusing and error-prone. Users must manually mark one outcome as "default" (catch-all), and the flag has dual semantics: in multi-label mode it is both an "always-on tag" and a "fallback when nothing else matches". The checkbox is visible in the UI, but the behavior is implicit and hard to reason about. Most TTRPG systems don't have an explicit "default" concept — they have a set of outcomes, and anything that doesn't match is simply "not matched".

The change replaces the explicit `isDefault` flag with an implicit "Not matched" outcome that is automatically added to a roll's match-set when no user-defined outcomes match. This outcome:
- Does NOT appear in the OutcomeEditor UI (users cannot edit or delete it)
- DOES appear in the results table, OddsTape, and charts — but only when its probability is greater than zero
- Is not stored in the `Outcome` type or serialized to YAML/presets/localStorage

This simplifies the data model (one less field on `Outcome`), removes a confusing UI control, and makes the "catch-all" behavior explicit and predictable.

## What Changes

- The `isDefault` field is removed from the `Outcome` interface in `src/types/index.ts`.
- `evaluateOutcomes` in `src/domain/classify.ts` is updated: after evaluating all user-defined outcomes, if the match-set is empty, the implicit "Not matched" label is added.
- The Web Worker in `src/worker/sim.worker.ts` tracks "Not matched" counts like any other outcome name.
- The YAML parser/serializer in `src/utils/yaml.ts` removes all `(default)` syntax parsing and serialization. The multi-default validation error is removed.
- `validateConfig` in `src/utils/validation.ts` removes the `isDefault`-related checks (outcome with no conditions and not default, etc.).
- The OutcomeEditor UI in `src/components/OutcomeEditor.tsx` removes the "Default" checkbox and the "default" pill.
- Result display components (`ResultView`, `OddsTape`, `DistributionChart`) filter out "Not matched" from display when its probability is zero.
- All built-in presets in `src/domain/presets.ts` have `isDefault` removed from all outcomes. Outcomes that were previously marked `isDefault: true` with explicit catch-all conditions are either kept (if they have meaningful conditions) or removed (if they were pure catch-alls with no conditions or trivial conditions).
- YAML preset files in `doc/ttrpg/*.yaml` have `(default)` markers and catch-all outcomes removed.
- Persistence migration bumps to v7 and strips `isDefault` from all stored outcomes.
- The outcomes spec removes all references to `isDefault` and the "default outcome" concept, replacing them with the implicit "Not matched" behavior.
- The UI spec removes the "Default outcome checkbox" scenario and the "Outcome Default Pill" requirement, replacing them with the "Not matched Outcome Display" requirement.
- The validation spec removes the "At most one outcome with isDefault = true" rule.
- The presets spec removes `(default)` markers from all preset definitions.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `outcomes`: Remove `isDefault` field from Outcome structure. Remove all default-related scenarios. Add implicit "Not matched" outcome behavior: when no user-defined outcomes match, "Not matched" is added to the match-set.
- `ui`: Remove "Default outcome checkbox" scenario and "Outcome Default Pill" requirement. Add "Not matched Outcome Display" requirement: hidden in editor, shown in results only when probability > 0.
- `validation`: Remove "At most one outcome with isDefault = true" block-level rule. Remove the "outcome with no conditions and not default" warning.
- `presets`: Remove `(default)` markers and catch-all default outcomes from all preset definitions.
- `persistence`: Bump SavedConfig version to 7. Migration strips `isDefault` from all outcomes.

## Impact

- `src/types/index.ts`: Remove `isDefault: boolean` from `Outcome` interface. Add `NOT_MATCHED_LABEL` constant.
- `src/domain/classify.ts`: `evaluateOutcomes` adds "Not matched" to match-set when empty. `evaluateOutcome` no longer checks `isDefault`.
- `src/worker/sim.worker.ts`: No structural changes — "Not matched" is tracked as a regular outcome name in the counter map.
- `src/utils/yaml.ts`: Remove `(default)` parsing in `parseOutcomeEntry`. Remove `(default)` serialization in `serializeOutcomeEntry`. Remove multi-default validation in `astToPreset`. Remove `# default` special case.
- `src/utils/validation.ts`: Remove `isDefault`-related checks (no-conditions-and-not-default warning, etc.).
- `src/components/OutcomeEditor.tsx`: Remove the "Default" checkbox and the "default" pill rendering.
- `src/components/ResultView.tsx`: Filter out "Not matched" from display when probability is 0.
- `src/components/OddsTape.tsx`: Filter out "Not matched" from display when probability is 0.
- `src/components/DistributionChart.tsx`: Filter out "Not matched" from chart when probability is 0.
- `src/domain/presets.ts`: Remove `isDefault: false/true` from all outcomes. Remove pure catch-all outcomes that were marked `isDefault: true` (e.g., PbtA "Failure", Shadowrun "No hits", Vampire V5 "Failure", Blades "Failure", Savage Worlds "Failure", WoD "Failure"). Keep outcomes that have meaningful conditions even if they were marked default (e.g., PbtA "Failure" has `total_mod <= 6` — keep it).
- `doc/ttrpg/*.yaml`: Remove `(default)` markers and catch-all outcomes.
- `src/state/persistence.ts`: Bump version to 7. Migration strips `isDefault` from all outcomes.
- `tests/classify.test.ts`: Remove tests for `isDefault` behavior. Add tests for implicit "Not matched".
- `tests/yaml.test.ts`: Remove tests for `(default)` parsing and multi-default validation. Update round-trip tests.
- `tests/validation.test.ts`: Remove `isDefault`-related tests.
- `openspec/specs/outcomes/spec.md`: Remove `isDefault` from Outcome structure. Remove default-related scenarios. Add "Not matched" behavior.
- `openspec/specs/ui/spec.md`: Remove "Default outcome checkbox" scenario and "Outcome Default Pill" requirement. Add "Not matched Outcome Display" requirement.
- `openspec/specs/validation/spec.md`: Remove "At most one outcome with isDefault = true" rule.
- `openspec/specs/presets/spec.md`: Remove `(default)` markers from all preset definitions.
- No new dependencies.
