## ADDED Requirements

### Requirement: User Presets (in-memory)
The application SHALL maintain a list of user presets for the current session. User presets are added when a YAML file is loaded whose `name:` does not match any built-in preset. They are cleared on page reload.

#### Scenario: Loading a new preset stages it
- GIVEN a YAML file with `name: My Custom Roll`
- WHEN the user loads it
- THEN a new user preset appears in the PresetSelector
- AND clicking it applies the loaded configuration

#### Scenario: Built-in overrides do not become user presets
- GIVEN a YAML file with `name: D&D 5e — d20`
- WHEN the user loads it
- THEN no new user preset is created
- AND the built-in preset is updated in place
