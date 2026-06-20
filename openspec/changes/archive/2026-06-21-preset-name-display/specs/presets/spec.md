# Presets Specification (delta)

## ADDED Requirements

### Requirement: Current Preset Name Tracking
The application SHALL maintain a `currentPresetName` signal (`signal<string | null>(null)`) that tracks the name of the currently applied preset.

#### Scenario: Applying a preset sets currentPresetName
- GIVEN `currentPresetName.value` is `null`
- WHEN the user applies a preset with name "D&D 5e — d20"
- THEN `currentPresetName.value` is set to `"D&D 5e — d20"`

#### Scenario: Applying a different preset updates currentPresetName
- GIVEN `currentPresetName.value` is `"D&D 5e — d20"`
- WHEN the user applies a preset with name "PbtA — 2d6"
- THEN `currentPresetName.value` is updated to `"PbtA — 2d6"`

#### Scenario: Resetting to defaults clears currentPresetName
- GIVEN `currentPresetName.value` is `"PbtA — 2d6"`
- WHEN the user resets to defaults (e.g., by loading a blank configuration)
- THEN `currentPresetName.value` is set to `null`

#### Scenario: Loading a YAML preset sets currentPresetName
- GIVEN `currentPresetName.value` is `null`
- WHEN the user loads a YAML file with `name: "My Custom Roll"`
- THEN `currentPresetName.value` is set to `"My Custom Roll"`

### Requirement: Preset Name Propagation to Simulation
When a simulation is run, the application SHALL pass the current preset name (if any) as the `taskName` field in the `SimJob` payload.

#### Scenario: Simulation job includes taskName
- GIVEN `currentPresetName.value` is `"Shadowrun — Xd6"`
- WHEN the user clicks "Roll the Dice"
- THEN the `SimJob` posted to the worker includes `taskName: "Shadowrun — Xd6"`

#### Scenario: Simulation job omits taskName when no preset
- GIVEN `currentPresetName.value` is `null`
- WHEN the user clicks "Roll the Dice"
- THEN the `SimJob` posted to the worker does not include a `taskName` field (or includes `taskName: undefined`)
