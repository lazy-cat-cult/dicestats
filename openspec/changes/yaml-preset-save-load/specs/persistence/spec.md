## ADDED Requirements

### Requirement: YAML Export
A "Save" button in the header SHALL export the current configuration to a YAML file downloaded by the browser. The YAML uses a human-readable pseudolanguage grammar.

#### Scenario: Save to YAML file
- GIVEN a configured dice pool, pipeline, and outcomes
- WHEN the user clicks "Save"
- THEN the browser downloads a file named `<slugified-name>.yaml` (or `dice-pool.yaml` if no name)
- AND the file content is a YAML representation of the current `PresetConfig`

#### Scenario: YAML file is human-readable
- GIVEN the downloaded YAML file
- WHEN a human opens it in a text editor
- THEN they can identify the dice rolled, the pipeline steps, and the outcome conditions without running the app

### Requirement: YAML Import
A "Load" button in the header SHALL open a file picker. Selecting a `.yaml` or `.yml` file SHALL parse it and apply the resulting configuration to the running app.

#### Scenario: Load YAML file
- GIVEN a valid YAML preset file
- WHEN the user picks it via the Load button
- THEN the configuration is parsed
- AND applied to the dice pool, pipeline, outcomes, and parameters
- AND sim results are cleared
- AND the wizard returns to step 0

#### Scenario: Load error is visible
- GIVEN a YAML file with a syntax error or an unresolvable reference
- WHEN the user picks it via the Load button
- THEN an inline error message appears next to the Load button
- AND the current configuration is unchanged
- AND no uncaught exception is thrown

#### Scenario: Bundle file is accepted
- GIVEN a YAML file with a top-level `presets:` list containing multiple presets
- WHEN the user picks it via the Load button
- THEN the first preset in the list is applied (bundles are accepted but only the first preset is used)

### Requirement: Preset Merge by Name
When a loaded YAML has a `name:` matching a built-in preset, the built-in preset SHALL be updated in place (same `id`, new content). Otherwise the preset is staged as an in-memory user preset for the current session.

#### Scenario: Override built-in by name
- GIVEN a YAML file with `name: D&D 5e — d20` and a different dice pool
- WHEN the user loads it
- THEN the built-in "D&D 5e — d20" preset is updated with the new content
- AND the preset appears in the PresetSelector with its new content

#### Scenario: Stage as user preset
- GIVEN a YAML file with `name: My Custom Roll`
- WHEN the user loads it
- THEN a new user preset is added to the PresetSelector for the current session
- AND applying the preset restores the loaded configuration
