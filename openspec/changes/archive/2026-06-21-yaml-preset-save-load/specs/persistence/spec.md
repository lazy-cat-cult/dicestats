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
When a loaded YAML has a `name:` matching a built-in preset, the built-in preset SHALL be updated in place (same `id`, new content). When the `name:` matches a previously loaded user preset, that user preset SHALL be updated in place (same `id`, new content). Otherwise the preset is staged as a new in-memory user preset for the current session.

#### Scenario: Override built-in by name
- GIVEN a YAML file with `name: D&D 5e — d20` and a different dice pool
- WHEN the user loads it
- THEN the built-in "D&D 5e — d20" preset is updated with the new content
- AND the preset appears in the PresetSelector with its new content

#### Scenario: Refresh a previously loaded user preset
- GIVEN a user previously loaded a YAML named "My Custom Roll" and then edited the file on disk
- WHEN the user loads the edited file again
- THEN the existing user preset is updated in place (same id)
- AND no duplicate "My Custom Roll" appears in the PresetSelector

#### Scenario: Stage as user preset
- GIVEN a YAML file with `name: My Custom Roll` and no prior user preset of that name
- WHEN the user loads it
- THEN a new user preset is added to the PresetSelector for the current session
- AND applying the preset restores the loaded configuration

### Requirement: YAML Pseudolanguage Grammar
The exported YAML SHALL use a human-readable pseudolanguage grammar.

The grammar is:
- Top level: `name:` string, `pool:` list of die terms, `reroll:` list, `pipeline:` list, `outcomes:` list, `parameters:` list, all optional except `name` and `pool`.
- Die term: `NdS` or `NdS<tag>`. `N` and `S` are positive integers. `tag` is `[A-Za-z][A-Za-z0-9_]*`.
- Reroll: `- {reroll|explode} when <clauses> [up to N times]`.
- Pipeline: `- <name> = <expr>` where `<name>` is a valid identifier and `<expr>` is a unary (`sum`/`max`/`min`/`count`/`ceil`/`floor` source), binary (`<src> <op> <src-or-literal>`, `<op>` is `+`/`-`/`*`/`/`), two-arg (`max(a, b)` / `min(a, b)`), or filter/remove form.
- Outcome: `- <name> when <conditions> (default)`. `(default)` is optional; at most one outcome MAY be marked default.
- Parameter: `- <label> = [<v1>, <v2>, ...] over <target> [on <name>]`. `<target>` is `pool.count`/`pool.sides`/`outcome.value`/`pipeline.literal`.
- Inline comments: `# <text>` at the end of a line attaches to the parsed element and is round-tripped into the `comment` field of the corresponding domain object (DiceTerm, RerollCondition, NamedValue, Outcome).

#### Scenario: Pool uses YAML list
- GIVEN a preset with a multi-term pool
- WHEN exported
- THEN the YAML uses a block list:
  ```yaml
  pool:
    - 3d10<normal>
    - 2d10<hunger>
  ```
- AND the round-trip produces an identical `DicePool`

#### Scenario: Parameter syntax uses equals
- GIVEN a preset with parameters
- WHEN exported
- THEN the YAML uses `- <label> = [v1, v2, ...] over <target> [on <name>]` syntax
- AND the round-trip produces an identical Parameter

#### Scenario: Inline comments round-trip
- GIVEN a YAML file with `# <text>` comments on pool terms, reroll, pipeline, and outcomes
- WHEN parsed
- THEN each comment is stored in the `comment` field of the corresponding domain object
- AND when re-exported, the comments appear at the end of the same lines

#### Scenario: Backward-compat string pool
- GIVEN a YAML file with the legacy `pool: 1d20 + 2d6` string form
- WHEN parsed
- THEN it is accepted as a single-term pool (1d20) and a single-term pool (2d6)
