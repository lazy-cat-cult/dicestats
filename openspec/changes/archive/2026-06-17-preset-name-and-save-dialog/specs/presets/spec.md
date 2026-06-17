# Presets Specification (delta)

## ADDED Requirements

### Requirement: Editable Preset Name
The Preset Rail SHALL expose an editable name input bound to `currentPresetName`. The input is a single-line text field, pre-filled with `currentPresetName.value` when non-null, or empty when `currentPresetName.value` is `null`. Typing into the input updates `currentPresetName.value` immediately (debounced to ~16ms for keystroke coalescing). The placeholder text is `"Preset name"`. The input has an `aria-label` of `"Preset name"`. A small inline `✕` clear button is rendered inside the input's right edge when the value is non-empty; clicking it sets `currentPresetName.value` to `null` and refocuses the input.

The input is styled with `font-mono tabular text-[13px]` to match the rest of the configuration rail's form controls and uses a `border-rule` 1px hairline border, `bg-paper` background, and `focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-billiard)]` on focus. Its `min-h-[36px]` matches the existing `TextField` primitive in `src/components/ui.tsx`. The input's width is `min-w-[200px] max-w-[280px]`.

#### Scenario: Typing a name updates the signal
- **WHEN** the user types `"My Custom Roll"` into the editable name input
- **THEN** `currentPresetName.value` becomes `"My Custom Roll"`
- **AND** the OddsTape heading (when a result is rendered) shows `"My Custom Roll"` as the `taskName`
- **AND** the name display above the first configuration section shows `"My Custom Roll"`

#### Scenario: Applying a preset overwrites the input
- **WHEN** `currentPresetName.value` is `"My Custom Roll"` and the user applies the "D&D 5e — d20" preset
- **THEN** the editable name input shows `"D&D 5e — d20"`
- **AND** `currentPresetName.value` is `"D&D 5e — d20"`

#### Scenario: Clearing the name with the ✕ button
- **WHEN** `currentPresetName.value` is `"My Custom Roll"` and the user clicks the `✕` clear button
- **THEN** the input becomes empty
- **AND** `currentPresetName.value` is `null`
- **AND** the name display above the first configuration section is hidden

#### Scenario: Empty string is coerced to null
- **WHEN** the user clears the input by deleting all characters (without clicking the `✕` button)
- **THEN** `currentPresetName.value` is set to `null` once the value is empty
- **AND** the input remains focused so the user can type a new name

#### Scenario: Resetting to defaults clears the input
- **WHEN** `currentPresetName.value` is `"My Custom Roll"` and a reset to defaults is triggered
- **THEN** the editable name input is empty
- **AND** `currentPresetName.value` is `null`

### Requirement: Preset Name Used in YAML Save
When the user clicks "Save" in the Preset Rail, the YAML file SHALL be produced with `name:` set to `currentPresetName.value` when non-null and non-empty, and to `"Dice Roll"` when `currentPresetName.value` is `null` or empty. The `name:` value flows into the `PresetConfig` object that is serialized to YAML by `exportCurrentAsYaml` in `src/state/persistence.ts`.

#### Scenario: Save uses typed name
- **WHEN** `currentPresetName.value` is `"My Custom Roll"` and the user clicks Save
- **THEN** the YAML header line reads `name: My Custom Roll`
- **AND** the suggested filename is `my-custom-roll.yaml`

#### Scenario: Save uses default name when input is empty
- **WHEN** `currentPresetName.value` is `null` and the user clicks Save
- **THEN** the YAML header line reads `name: Dice Roll`
- **AND** the suggested filename is `dice-roll.yaml`
