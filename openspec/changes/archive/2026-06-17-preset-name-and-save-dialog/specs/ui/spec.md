# UI Specification (delta)

## MODIFIED Requirements

### Requirement: Save and Load YAML Presets
The application SHALL provide "Save" and "Load" buttons. Save SHALL serialize the current configuration to a YAML file. When the browser supports the File System Access API (Chromium-based), Save SHALL open the OS-native "Save As" dialog via `window.showSaveFilePicker` so the user can pick both a directory and a filename; otherwise Save SHALL fall back to the `Blob` + `<a download>` path. The suggested filename SHALL be `filenameForName(currentPresetName.value ?? 'dice-roll')`. Load SHALL open a file picker accepting `.yaml`/`.yml` files, parse them with the hand-rolled YAML parser, and apply the configuration to the editor. Loading a preset whose `name` matches a built-in preset updates the built-in; otherwise the preset is added to the user preset list. Loading a YAML file SHALL also set `currentPresetName.value` to the loaded preset's `name`.

The configuration SHALL also auto-save to `localStorage` under key `dice-calc-config` on every change (debounced to every 2s while the tab is visible, and immediately on `visibilitychange: hidden` and `pagehide`). The localStorage payload includes a `version` field (currently `7`) for forward migration.

#### Scenario: Save uses native dialog when API is available
- **WHEN** `window.showSaveFilePicker` is available
- **AND** the user clicks "Save"
- **THEN** the OS-native "Save As" dialog is opened
- **AND** the suggested filename is `<filename>.yaml` derived from `currentPresetName.value` (or `dice-roll.yaml` when the name is empty)
- **AND** the file filter shows `YAML preset` accepting `.yaml`
- **AND** on confirmation, the YAML text is written to the chosen path

#### Scenario: Save falls back when API is unavailable
- **WHEN** `window.showSaveFilePicker` is not available (e.g. Firefox, Safari)
- **AND** the user clicks "Save"
- **THEN** the `Blob` + anchor download path is used
- **AND** a `.yaml` file is downloaded with the same `<filename>.yaml` derived from `currentPresetName.value`
- **AND** the YAML serializes the full configuration (pool, reroll, pipeline, outcomes, parameters)

#### Scenario: Save cancellation is silent
- **WHEN** the native "Save As" dialog is open
- **AND** the user clicks Cancel or closes the dialog
- **THEN** no error is shown
- **AND** the `loadError` signal is not set
- **AND** no `console.error` is emitted
- **AND** the application returns to its previous state

#### Scenario: Save uses default name when name is empty
- **WHEN** `currentPresetName.value` is `null` or empty
- **AND** the user clicks "Save"
- **THEN** the suggested filename is `dice-roll.yaml`
- **AND** the YAML header line reads `name: Dice Roll`

#### Scenario: Load existing YAML
- **WHEN** a previously saved `.yaml` file is loaded
- **THEN** the editor state is replaced with the parsed configuration
- **AND** the result canvas is cleared
- **AND** `currentPresetName.value` is set to the loaded preset's `name`

#### Scenario: Auto-save on tab hide
- **WHEN** the user has unsaved changes
- **AND** the browser tab is hidden or closed
- **THEN** the current configuration is written to `localStorage` immediately
- **AND** the YAML "Save" path is NOT triggered (localStorage is the auto-save target, not the YAML file)

### Requirement: Preset Rail
A horizontal pill rail pinned directly under the header SHALL show all available presets (built-in and user-imported). Each preset is rendered as a `Pill` component in the default variant (no active highlight is used). The rail:

- SHALL have a "Presets" eyebrow label in `font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute` on the left.
- SHALL be horizontally scrollable on narrow viewports (`overflow-x-auto` with negative horizontal margins so pills can scroll under the eyebrow).
- A user-loaded preset (from a YAML file) is marked with a small `text-billiard` middot (`·`) appended to its name. The middot is `aria-hidden`.
- The rail has a `border-b border-rule` hairline separator on its bottom edge.
- SHALL expose an **editable preset name input** to the left of the Save/Load buttons, bound to `currentPresetName`. The input is described in detail in `openspec/specs/presets/spec.md` (requirement: `Editable Preset Name`). The "All Presets ▾" trigger SHALL sit between the pill list and the editable name input.

#### Scenario: Apply preset
- GIVEN the user clicks a preset pill
- WHEN the click registers
- THEN the dice pool, reroll conditions, pipeline, outcomes, parameters, and current results are replaced with the preset's configuration
- AND the current results are cleared
- AND any in-flight simulation is cancelled
- AND `currentPresetName.value` is set to the applied preset's `name` (the editable name input updates to match)

#### Scenario: User preset indicator
- GIVEN a preset that was loaded from a YAML file (i.e. not a built-in)
- WHEN the preset rail renders
- THEN the pill shows the preset name followed by a `·` in `text-billiard`

#### Scenario: Editable name input is visible in the rail
- GIVEN the application is rendered
- WHEN the Preset Rail is shown
- THEN the editable name input is visible to the left of the Save/Load buttons
- AND the input shows `currentPresetName.value` (or is empty when `currentPresetName.value` is `null`)
- AND the input has `placeholder="Preset name"` and `aria-label="Preset name"`

#### Scenario: Editable name input updates the simulation label
- GIVEN the user typed `"My Custom Roll"` into the editable name input
- WHEN the user runs a simulation
- THEN the `SimJob` posted to the worker includes `taskName: "My Custom Roll"`
- AND the result's `label` is `"My Custom Roll"`

## ADDED Requirements

### Requirement: Current Preset Name Display
The configuration column SHALL render a heading directly above the "Step 01 — Dice Pool" section when `currentPresetName.value` is a non-empty string. The heading is:

- A `Section`-style row with a top hairline divider (matching the other sections' gold/30 border) and an eyebrow line that reads `"Preset"` in `font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep`.
- A `font-display text-[2rem] leading-none text-ink tracking-wider` heading showing `currentPresetName.value`. The heading is the actual preset name, in English, with no truncation suffix.
- No description, no editor, and no `actions` slot. The row's only purpose is to display the current preset name as the title of the configuration column.

When `currentPresetName.value` is `null` or `""`, the entire row is omitted (no border, no eyebrow, no heading) so the "Step 01" section is the first element in the column.

The heading re-renders reactively whenever `currentPresetName.value` changes (e.g. when the user types into the editable name input, applies a preset, loads a YAML, or resets to defaults).

#### Scenario: Name display is hidden when no name is set
- **WHEN** `currentPresetName.value` is `null`
- **THEN** no preset name row is rendered
- **AND** the "Step 01 — Dice Pool" section is the first element in the configuration column

#### Scenario: Name display shows typed name above settings
- **WHEN** the user types `"My Custom Roll"` into the editable name input
- **THEN** a heading row is rendered above the "Step 01" section
- **AND** the heading reads `"My Custom Roll"`
- **AND** the eyebrow reads `"Preset"`

#### Scenario: Name display shows applied preset name
- **WHEN** the user applies the "D&D 5e — d20" preset
- **THEN** a heading row is rendered above the "Step 01" section
- **AND** the heading reads `"D&D 5e — d20"`

#### Scenario: Name display hides on reset to defaults
- **WHEN** `currentPresetName.value` is `"My Custom Roll"` and a reset to defaults is triggered
- **THEN** the heading row is removed
- **AND** the "Step 01" section is again the first element in the column

#### Scenario: Name display updates without reload
- **WHEN** the user types a new value into the editable name input
- **THEN** the heading updates in place without a page reload
- **AND** no re-mount of the configuration column occurs (other sections keep their state)

### Requirement: Form Controls Accessibility (extended — editable name input)
The editable preset name input in the Preset Rail SHALL have a visible label or `aria-label`. The `✕` clear button SHALL have `aria-label="Clear preset name"`. The `All Presets ▾` trigger SHALL have `aria-label="Open all presets library"`.

#### Scenario: Clear button has aria-label
- **WHEN** the editable name input is non-empty
- **THEN** the `✕` clear button is rendered
- **AND** the button has `aria-label="Clear preset name"`
