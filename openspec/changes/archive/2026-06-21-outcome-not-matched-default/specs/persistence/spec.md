# Persistence Specification (delta)

## MODIFIED Requirements

### Requirement: SavedConfig Schema
The saved configuration SHALL follow this structure with a `version` field (currently `7`) for future migration:

```typescript
interface SavedConfig {
  version: number;              // schema version, currently 7
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];          // Outcome no longer has isDefault field
  parameters: Parameter[];
}
```

#### Scenario: SavedConfig version 7
- GIVEN a configuration saved with version 7
- WHEN the config is loaded
- THEN the version is 7 and no migration is needed
- AND outcomes do NOT contain `isDefault` field

### Requirement: Migration from Older Versions
If `version` is missing, `1`, `2`, `3`, `4`, `5`, or `6`, the loader SHALL migrate from the old format:
- v7: No structural migration needed; `Outcome` no longer has `isDefault` field — old data with `isDefault` is stripped during migration.
- v6: Strip `isDefault` from all outcomes.
- v5: Strip `isDefault` from all outcomes after existing v5→v6 migration.
- v4: Strip `isDefault` from all outcomes after existing v4→v5 migration.
- v3: Converts `keep_highest`/`keep_lowest` pipeline ops to `max`/`min`, then strip `isDefault`.
- v1/v2: Converts `pool.keep` to pipeline `max`/`min`, modifiers to pipeline math, old outcome types to unified `Outcome`, parameter `applyTo` to `target` with ID references, then strip `isDefault`.
- Adds `id` and `tag` to each `DiceTerm` where missing
- Converts `explode` to `RerollCondition` if present
- Adds empty `pipeline` and `rerollConditions` arrays

#### Scenario: V6 migration (strip isDefault)
- GIVEN a saved config with version 6 (outcomes have `isDefault` field)
- WHEN the config is loaded
- THEN all outcomes have `isDefault` stripped
- AND the config is treated as version 7 format

#### Scenario: V5 migration (strip isDefault)
- GIVEN a saved config with version 5
- WHEN the config is loaded
- THEN existing v5→v6 migration is applied
- THEN `isDefault` is stripped from all outcomes
- AND the config is treated as version 7 format
