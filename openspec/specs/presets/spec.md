# Presets Specification

## Purpose

Presets provide quick-start configurations that fill in all steps with pre-configured values for common TTRPG scenarios. All UI strings SHALL be in English.

## Requirements

### Requirement: Preset Configurations
The application SHALL provide the following presets, each containing complete configuration for pool, reroll conditions, pipeline, outcomes, and sweep (where applicable):

#### Preset: D&D 5e — d20
```
Pool: 1d20
Reroll: none
Pipeline: total = sum rolled
Outcomes: "Hit" when total >= X
Sweep: X ∈ {5, 10, 15, 20}
```

#### Preset: D&D 5e — Advantage 2d20 best
```
Pool: 2d20
Reroll: none
Pipeline: best = max rolled
Outcomes: "Hit" when best >= X
Sweep: X ∈ {5, 10, 15, 20}
```

#### Preset: PbtA — 2d6
```
Pool: 2d6
Reroll: none
Pipeline:
  total = sum rolled
  total_mod = add total by X
Outcomes:
  "Success" when total_mod >= Y
  "Partial" when total_mod >= 7 AND total_mod <= 9
  "Failure" when total_mod <= 6
Sweep: X ∈ {-2, -1, 0, 1, 2}, Y ∈ {10, 15}
```

#### Preset: Shadowrun — Xd6
```
Pool: Xd6
Reroll: none
Pipeline: none
Outcomes:
  "1+ hits" when any rolled >= 5
  "No hits" when none rolled >= 5
Sweep: X ∈ {1..10}
```

#### Preset: Vampire V5
```
Pool: 3d10 tag:normal + 2d10 tag:hunger
Reroll: none
Pipeline:
  successes = filter rolled where face >= 6
  success_count = count successes
  crit_faces = filter rolled where face = 10
  crit_count = count crit_faces
  half_crits = divide crit_count by 2
  rounded_crits = floor half_crits
  double_crits = multiply rounded_crits by 2
  total_successes = add success_count by double_crits
Outcomes:
  "Success" when total_successes >= 1
  "Failure" when total_successes = 0
Sweep: none
```

#### Preset: Daggerheart — Duality (2d12)
```
Pool: 1d12 tag:hope + 1d12 tag:fear
Reroll: none
Pipeline:
  hope_face = filter rolled where tag = hope
  fear_face = filter rolled where tag = fear
  hope_value = max hope_face
  fear_value = max fear_face
  delta = subtract hope_value by fear_value
  total = sum rolled
  total_mod = add total by X
Outcomes:
  "Critical Success" when delta = 0
  "Success with Hope" when delta > 0 AND total_mod >= 15
  "Success with Fear" when delta < 0 AND total_mod >= 15
  "Failure with Hope" when delta > 0 AND total_mod < 15
  "Failure with Fear" when delta < 0 AND total_mod < 15
Sweep: X ∈ {-2, -1, 0, 1, 2, 3, 4, 5}
```

#### Preset: Daggerheart — Compound Outcomes (2d12)
```
Pool: 1d12 tag:hope + 1d12 tag:fear
Reroll: none
Pipeline:
  hope_face = filter rolled where tag = hope
  fear_face = filter rolled where tag = fear
  total = sum rolled
  hope_value = max hope_face
  fear_value = max fear_face
  delta = subtract hope_value by fear_value
Outcomes:
  "Critical Hit" when total >= 15 AND delta >= 0
  "Critical Miss" when total <= 5 AND delta < 0
  "Hope" when delta > 0
Sweep: none
```

#### Preset: Cyberpunk RED — d10 + Skill (2d10)
```
Pool: 2d10
Reroll: none
Pipeline: total = sum rolled
Outcomes: "Success" when total >= X
Sweep: X ∈ {10, 13, 15, 17, 20, 22, 25, 28, 30}
```

#### Preset: Blades in the Dark — Xd6 action
```
Pool: Xd6
Reroll: none
Pipeline:
  best = max rolled
  sixes = filter rolled where face is_max
  six_count = count sixes
Outcomes:
  "Critical" when six_count >= 2
  "Success" when best = 6
  "Partial" when best >= 4 AND best <= 5
  "Failure" when best <= 3
Sweep: X ∈ {1..8}
```

#### Preset: Savage Worlds — Trait (d8) + Wild (d6)
```
Pool: 1dX tag:trait (default d8) + 1d6 tag:wild
Reroll: explode when face is_max (both dice), repeat 5
Pipeline:
  trait_only = filter rolled where tag = trait
  wild_only = filter rolled where tag = wild
  trait_best = max trait_only
  wild_best = max wild_only
  effective = max trait_best by wild_best
Outcomes:
  "Raise" when effective >= 8
  "Success" when effective >= 4 AND effective <= 7
  "Failure" when effective < 4
Sweep: X ∈ {4, 6, 8, 10, 12} (trait sides)
```

#### Preset: World of Darkness — Xd10 explode
```
Pool: Xd10
Reroll: explode when face is_max, repeat 3
Pipeline: none
Outcomes:
  "Success" when any rolled >= 8
  "Failure" when none rolled >= 8
Sweep: X ∈ {1..10}
```

#### Scenario: Applying D&D preset
- GIVEN the user selects "D&D 5e — d20" preset
- WHEN the preset is applied
- THEN the pool is set to 1d20, the pipeline has `total = sum rolled`, outcomes include "Hit" with condition `total >= X`, and a sweep with X values [5, 10, 15, 20]

### Requirement: Preset Coverage
Presets MUST be updated when adding new features (reroll conditions, pipeline operations, outcome format) to maintain full coverage of all domain features. The following features SHALL be demonstrated across presets:
- `filter`/`remove` vector operations (Shadowrun, Vampire V5, Daggerheart, Savage Worlds)
- `count`, `sum`, `max`, `min` scalar ops (all presets)
- binary math add/subtract/multiply/divide (Vampire V5, Daggerheart)
- `ceil`/`floor` scalar ops (Vampire V5)
- `switch` pipeline operation — not yet covered in any preset
- exploding rerolls (Savage Worlds, World of Darkness)
- dice conditions (`any`/`all`/`none`) in outcomes (Shadowrun, World of Darkness)
- X/Y dual-axis sweep (PbtA)
- expression-based dice count and sides via X variable (Shadowrun, Blades, World of Darkness)

#### Scenario: New feature requires preset update
- GIVEN a new pipeline operation `switch` is added
- WHEN a preset is reviewed
- THEN at least one preset SHALL demonstrate the use of `switch`

### Requirement: English Only
All preset UI strings (names, descriptions, outcome labels) SHALL be in English. Existing non-English strings are legacy and MUST be replaced.

#### Scenario: Preset language
- GIVEN any preset configuration
- WHEN displayed in the UI
- THEN all text (names, labels, comments) is in English

### Requirement: Editable Preset Name (display + edit toggle)
The Preset Rail SHALL expose a single-line name control for the current configuration, bound to `currentPresetName`. The control has two states:

**Display state (default).** The control renders as a button containing:

- A `Name` eyebrow in `font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute` to the left of the name.
- The current preset name in `font-mono tabular text-[12px]` with `truncate`. When `currentPresetName.value` is a non-empty string, the text reads the name in `text-ink`; when it is `null` or `""`, the text reads the placeholder `"Preset name"` in `text-ink-mute`.
- A `✎` (pencil) glyph at the right edge in `text-ink-mute` that becomes `text-billiard` on hover.

Clicking the button (or pressing it via keyboard) opens the edit state. The button's `aria-label` is `Edit preset name: <name>` when a name is set, or `Set preset name` when it is not.

**Edit state.** The control renders as a row containing:

- The same `Name` eyebrow on the left.
- A single-line `<input type="text">` styled with `font-mono tabular text-[12px]`, `bg-paper`, `border-rule` border, and `focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)]` focus styling. The input is pre-filled with the current `currentPresetName.value` (or empty if `null`), uses `placeholder="Preset name"`, has `aria-label="Preset name"`, and is auto-focused + auto-selected when the edit state opens.
- A `✓` (check) button on the right edge of the input row with `aria-label="Save preset name"` and `title="Save (Enter)"`. Clicking it commits the draft to `currentPresetName` via `setCurrentPresetName(draft)` and exits edit state.
- A `✕` (cancel) button to the right of `✓` with `aria-label="Cancel preset name edit"` and `title="Cancel (Esc)"`. Clicking it discards the draft, restores the previous value, and exits edit state.
- Pressing `Enter` while the input is focused commits the draft and exits edit state.
- Pressing `Escape` while the input is focused discards the draft and exits edit state.

`setCurrentPresetName` (defined in `src/state/app-state.ts`) coerces an empty string to `null`, so committing an empty input clears the name.

The control SHALL exit edit state automatically whenever `currentPresetName.value` changes from outside (e.g. when the user applies a preset, loads a YAML, or resets to defaults). The active edit draft is discarded in that case.

The control SHALL NOT be rendered above the configuration sections; it lives entirely in the Preset Rail.

#### Scenario: Display state shows the current name
- **WHEN** `currentPresetName.value` is `"My Custom Roll"`
- **THEN** the rail shows `Name My Custom Roll ✎` as a clickable button
- **AND** no input or ✓/✕ buttons are visible
- **AND** the name appears with `text-ink` color

#### Scenario: Display state shows placeholder when no name
- **WHEN** `currentPresetName.value` is `null`
- **THEN** the rail shows `Name Preset name ✎` as a clickable button
- **AND** `"Preset name"` appears with `text-ink-mute` (placeholder styling)
- **AND** the button's `aria-label` is `Set preset name`

#### Scenario: Clicking the display opens edit state
- **WHEN** the user clicks the display button
- **THEN** the control switches to edit state
- **AND** the input is focused and its text is selected
- **AND** the input shows the current `currentPresetName.value` (or empty if `null`)
- **AND** `✓` and `✕` buttons appear on the right edge of the input

#### Scenario: Committing with ✓ updates the signal
- **WHEN** the user types `"My Custom Roll"` into the input and clicks ✓
- **THEN** `currentPresetName.value` becomes `"My Custom Roll"`
- **AND** the control returns to display state
- **AND** the display reads `Name My Custom Roll ✎`

#### Scenario: Committing with Enter updates the signal
- **WHEN** the user types `"My Custom Roll"` and presses Enter
- **THEN** `setCurrentPresetName("My Custom Roll")` is called
- **AND** the control returns to display state

#### Scenario: Cancelling with ✕ discards the draft
- **WHEN** the user types `"Draft"` in the input and clicks ✕
- **THEN** the input's draft is discarded
- **AND** `currentPresetName.value` is unchanged
- **AND** the control returns to display state

#### Scenario: Cancelling with Escape discards the draft
- **WHEN** the user types `"Draft"` and presses Escape
- **THEN** the input's draft is discarded
- **AND** `currentPresetName.value` is unchanged
- **AND** the control returns to display state

#### Scenario: Committing an empty string clears the name
- **WHEN** the user clears the input completely and clicks ✓ (or presses Enter)
- **THEN** `setCurrentPresetName("")` coerces the empty value to `null`
- **AND** `currentPresetName.value` is `null`
- **AND** the control returns to display state showing the `Preset name` placeholder

#### Scenario: Applying a preset exits edit state
- **WHEN** the control is in edit state with a draft of `"Draft"`
- **AND** the user applies the "D&D 5e — d20" preset (from a pill or the modal)
- **THEN** `applyPresetConfig` sets `currentPresetName.value` to `"D&D 5e — d20"`
- **AND** the edit state closes
- **AND** the display reads `Name D&D 5e — d20 ✎`
- **AND** the draft is discarded

#### Scenario: Loading a YAML exits edit state
- **WHEN** the control is in edit state
- **AND** the user loads a YAML whose `name:` is `"Imported"`
- **THEN** `applyPresetConfig` sets `currentPresetName.value` to `"Imported"`
- **AND** the edit state closes
- **AND** the display reads `Name Imported ✎`

#### Scenario: Resetting to defaults exits edit state
- **WHEN** the control is in edit state
- **AND** a reset to defaults is triggered
- **THEN** `currentPresetName.value` is set to `null`
- **AND** the edit state closes
- **AND** the display reads `Name Preset name ✎` (placeholder)

#### Scenario: Display state truncates long names
- **WHEN** the preset name is longer than the available rail width
- **THEN** the name truncates with an ellipsis
- **AND** the `title` attribute on the button shows the full name on hover

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

