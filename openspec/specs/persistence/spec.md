# Persistence Specification

## Purpose

Configuration persistence allows users to save and restore their dice probability configurations across page reloads, using localStorage as the storage backend.

## Requirements

### Requirement: Save and Load
A "Save" button in the header SHALL write the current configuration to localStorage under the key `dice-calc-config`. Config SHALL auto-load on page mount. A "Clear" button SHALL remove the saved config and reset to defaults.

#### Scenario: Save configuration
- GIVEN a configured dice pool, pipeline, and outcomes
- WHEN the user clicks "Save"
- THEN the configuration is written to localStorage under key `dice-calc-config`

#### Scenario: Auto-load on mount
- GIVEN a previously saved configuration in localStorage
- WHEN the page loads
- THEN the configuration is restored from localStorage

#### Scenario: Clear configuration
- GIVEN a saved configuration in localStorage
- WHEN the user clicks "Clear"
- THEN the localStorage entry is removed
- AND the UI resets to default values

### Requirement: SavedConfig Schema
The saved configuration SHALL follow this structure with a `version` field (currently `4`) for future migration:

```typescript
interface SavedConfig {
  version: number;              // schema version, currently 4
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters: Parameter[];
}
```

#### Scenario: Version field presence
- GIVEN a configuration saved with version 4
- WHEN the config is loaded
- THEN the version is checked and if it differs from 4, migration is applied

### Requirement: Invalid Reference Preservation
On load, invalid references (e.g., a named value referencing a deleted source) SHALL be preserved but marked as invalid — NOT silently dropped.

#### Scenario: Preserved invalid reference
- GIVEN a saved config where outcome references a deleted pipeline value
- WHEN the config is loaded
- THEN the outcome still references the deleted value
- AND the UI highlights it as invalid
- AND the Run button is disabled

### Requirement: Migration from Older Versions
If `version` is missing, `1`, `2`, or `3`, the loader SHALL migrate from the old format:
- v4: No structural migration needed; `ConditionClause.value` now accepts `number | FaceValueSpecial` — old data with `number` values is compatible as-is
- v3: Converts `keep_highest`/`keep_lowest` pipeline ops to `max`/`min`
- v1/v2: Converts `pool.keep` to pipeline `max`/`min`, modifiers to pipeline math, old outcome types to unified `Outcome`, parameter `applyTo` to `target` with ID references
- Adds `id` and `tag` to each `DiceTerm` where missing
- Converts `explode` to `RerollCondition` if present
- Adds empty `pipeline` and `rerollConditions` arrays

#### Scenario: V3 migration (no data change needed)
- GIVEN a saved config with version 3 (ConditionClause.value is always number)
- WHEN the config is loaded
- THEN it is treated as version 4 format since `number` is a valid subset of `number | FaceValueSpecial`

#### Scenario: V1 migration
- GIVEN a saved config with version 1 (no tags, no pipeline, old outcome types)
- WHEN the config is loaded
- THEN it is migrated to version 3 format with tags, pipeline, and unified outcomes

### Requirement: localStorage Full Handling
If localStorage is full or unavailable, the save operation SHALL silently fail and display a toast message "Could not save configuration".

#### Scenario: localStorage full
- GIVEN localStorage is at capacity
- WHEN the user clicks "Save"
- THEN a toast message "Could not save configuration" is displayed
- AND no error is thrown