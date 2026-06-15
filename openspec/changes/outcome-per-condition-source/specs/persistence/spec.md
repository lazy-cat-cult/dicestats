# Persistence Specification (delta)

## MODIFIED Requirements

### Requirement: SavedConfig Schema (bumped to v6)
The saved configuration SHALL follow this structure with a `version` field (currently `6`) for future migration:

```typescript
interface SavedConfig {
  version: number;              // schema version, currently 6
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];          // Outcome.source was removed in v6
  parameters: Parameter[];
}
```

#### Scenario: Version field presence
- GIVEN a configuration saved with version 6
- WHEN the config is loaded
- THEN the version is checked and if it differs from 6, migration is applied

### Requirement: Migration from Older Versions (added v5 → v6)
If `version` is missing, `1`, `2`, `3`, `4`, or `5`, the loader SHALL migrate from the old format:
- v6: No structural migration needed (current schema; each `OutcomeCondition` carries its own `source`).
- v5: For every outcome, copy `outcome.source` (or `'rolled'` if missing) into every `condition` that does not already carry a `source` field. The outcome-level `source` is dropped.
- v4: No structural migration needed; `ConditionClause.value` accepts `number | FaceValueSpecial` — old data with `number` values is compatible as-is
- v3: Converts `keep_highest`/`keep_lowest` pipeline ops to `max`/`min`
- v1/v2: Converts `pool.keep` to pipeline `max`/`min`, modifiers to pipeline math, old outcome types to unified `Outcome`, parameter `applyTo` to `target` with ID references
- Adds `id` and `tag` to each `DiceTerm` where missing
- Converts `explode` to `RerollCondition` if present
- Adds empty `pipeline` and `rerollConditions` arrays

#### Scenario: V5 migration
- GIVEN a saved config with version 5 where each outcome has a single top-level `source` and a flat list of `conditions`
- WHEN the config is loaded
- THEN each condition is rewritten to carry a `source` field equal to the outcome's source
- AND the outcome-level `source` is dropped from the loaded shape
