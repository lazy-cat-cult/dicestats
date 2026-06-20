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
The saved configuration SHALL follow this structure with a `version` field (currently `9`) for future migration:

```typescript
interface SavedConfig {
  version: number;              // schema version, currently 9
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  sweep: SweepParameters;
}
```

#### Scenario: Version field presence
- GIVEN a configuration saved with version 9
- WHEN the config is loaded
- THEN the version is checked and if it differs from 9, migration is applied

### Requirement: Invalid Reference Preservation
On load, invalid references (e.g., a named value referencing a deleted source) SHALL be preserved but marked as invalid — NOT silently dropped.

#### Scenario: Preserved invalid reference
- GIVEN a saved config where outcome references a deleted pipeline value
- WHEN the config is loaded
- THEN the outcome still references the deleted value
- AND the UI highlights it as invalid
- AND the Run button is disabled

### Requirement: Migration from Older Versions
If `version` is missing, `1`–`8`, the loader SHALL migrate from the old format:
- v9: Converts `ConditionClause` face values from `'max_value'`/`'min_value'` to `is_max`/`is_min` operators with `undefined` value; wraps bare `number` condition values in `literalExpr()`; adds `tagAs: ''` to all `RerollCondition`; wraps old single-operand binary ops (`{ fn, operand, value/source2 }`) into `{ fn, terms: [{ operand, value/source2 }] }`.
- v8: Strips `isDefault` from outcomes; converts `parameters[]` array to `sweep.x`/`sweep.y`.
- v7: No structural migration needed.
- v6: Strip `isDefault` from all outcomes.
- v5-1: Progressive migration maintaining compatibility.

#### Scenario: Migration from v8 to v9
- GIVEN a saved config with version 8 containing `parameters[]`
- WHEN the config is loaded
- THEN the `parameters[]` array is converted to `sweep.x`/`sweep.y`
- AND the version is updated to 9

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

