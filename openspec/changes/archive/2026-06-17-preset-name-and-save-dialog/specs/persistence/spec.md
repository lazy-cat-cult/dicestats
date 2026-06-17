# Persistence Specification (delta)

## ADDED Requirements

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
