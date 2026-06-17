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
The saved configuration SHALL follow this structure with a `version` field (currently `7`) for future migration:

```typescript
interface SavedConfig {
  version: number;              // schema version, currently 7
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters: Parameter[];
}
```

#### Scenario: Version field presence
- GIVEN a configuration saved with version 7
- WHEN the config is loaded
- THEN the version is checked and if it differs from 7, migration is applied

### Requirement: Invalid Reference Preservation
On load, invalid references (e.g., a named value referencing a deleted source) SHALL be preserved but marked as invalid — NOT silently dropped.

#### Scenario: Preserved invalid reference
- GIVEN a saved config where outcome references a deleted pipeline value
- WHEN the config is loaded
- THEN the outcome still references the deleted value
- AND the UI highlights it as invalid
- AND the Run button is disabled

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

#### Scenario: V3 migration (no data change needed)
- GIVEN a saved config with version 3 (ConditionClause.value is always number)
- WHEN the config is loaded
- THEN it is migrated through v4→v5→v6→v7, stripping `isDefault` at each stage

### Requirement: localStorage Full Handling
If localStorage is full or unavailable, the save operation SHALL silently fail and display a toast message "Could not save configuration".

#### Scenario: localStorage full
- GIVEN localStorage is at capacity
- WHEN the user clicks "Save"
- THEN a toast message "Could not save configuration" is displayed
- AND no error is thrown

### Requirement: Native Save As Dialog
When the user triggers a "Save" action and `window.showSaveFilePicker` is available (Chromium-based browsers: Chrome, Edge, Opera, Brave), the application SHALL call `window.showSaveFilePicker({ suggestedName, types: [{ description: 'YAML preset', accept: { 'text/yaml': ['.yaml'] } }] })`, write the YAML text to the returned `FileSystemFileHandle` via `createWritable()`, and close the handle. The `suggestedName` SHALL be `filenameForName(currentPresetName.value ?? 'dice-roll')`. This opens the OS-native "Save As" dialog that lets the user pick both a directory and a filename.

When `showSaveFilePicker` is not available, the application SHALL fall back to the `Blob` + `<a download>` path.

On `AbortError` (the user cancelled the picker), the application SHALL silently return — no `loadError` message, no `alert()`, no `console.error`. On any other error from the picker (e.g. `SecurityError` in a sandboxed iframe), the application SHALL silently fall back to the `Blob` path. The user SHALL NOT be shown any error UI for a cancellation.

The application SHALL NOT touch the `loadError` signal or call `console.error` from the save path. The `loadError` slot is reserved for YAML Load failures.

#### Scenario: Save uses native dialog when API is available
- **WHEN** `window.showSaveFilePicker` is available
- **AND** the user triggers a Save action
- **THEN** the OS-native "Save As" dialog is opened
- **AND** the suggested filename is `<filename>.yaml` derived from `currentPresetName.value` (or `dice-roll.yaml` when the name is empty)
- **AND** the file filter shows `YAML preset` accepting `.yaml`
- **AND** on confirmation, the YAML text is written to the chosen path

#### Scenario: Save falls back when API is unavailable
- **WHEN** `window.showSaveFilePicker` is not available (e.g. Firefox, Safari)
- **AND** the user triggers a Save action
- **THEN** the `Blob` + anchor download path is used
- **AND** a `.yaml` file is downloaded with the same `<filename>.yaml` derived from `currentPresetName.value`

#### Scenario: Save cancellation is silent
- **WHEN** the native "Save As" dialog is open
- **AND** the user clicks Cancel or closes the dialog
- **THEN** no error is shown
- **AND** the `loadError` signal is not set
- **AND** no `console.error` is emitted
- **AND** the application returns to its previous state

