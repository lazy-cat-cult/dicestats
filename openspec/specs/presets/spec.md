# Presets Specification

## Purpose

Presets provide quick-start configurations that fill in all steps with pre-configured values for common TTRPG scenarios. All UI strings SHALL be in English.

## Requirements

### Requirement: Preset Configurations
The application SHALL provide the following presets, each containing complete configuration for pool, reroll conditions, pipeline, outcomes, and parameters (where applicable):

#### Preset: D&D 5e — d20
```
Pool: 1d20
Reroll: none
Pipeline: (none)
Outcomes: "Hit" when rolled >= DC
Parameters: DC sweep 5, 10, 15, 20
```

#### Preset: D&D 5e — Advantage
```
Pool: 2d20
Reroll: none
Pipeline: best = max rolled
Outcomes: "Hit" when best >= DC
Parameters: DC sweep 5, 10, 15, 20
```

#### Preset: PbtA — 2d6
```
Pool: 2d6
Reroll: none
Pipeline: (none)
Outcomes:
  "Miss" when rolled <= 6
  "Partial" when rolled >= 7 AND rolled <= 9
  "Full" when rolled >= 10
Parameters: (none)
```

#### Preset: Shadowrun — Xd6
```
Pool: 5d6
Reroll: none
Pipeline:
  hits = filter rolled where face >= 5
  hit_count = count hits
Outcomes:
  "1+ hits" when hit_count >= 1
  "Glitch" when hit_count = 0
Parameters: dice count sweep 1..10
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
  hunger_crits = filter rolled where tag = hunger AND face >= 10
  hunger_crit_count = count hunger_crits
  bestial_faces = filter rolled where tag = hunger AND face <= 1
  bestial_count = count bestial_faces
Outcomes:
  "Success" when total_successes >= TN AND total_successes > 0
  "Critical Success" when crit_count >= 2
  "Bestial Failure" when bestial_count >= 1 AND total_successes = 0
Parameters: TN sweep 1..5
```

#### Preset: Daggerheart — Duality
```
Pool: 1d12 tag:hope + 1d12 tag:fear
Reroll: none
Pipeline:
  hope_face = filter rolled where tag = hope
  fear_face = filter rolled where tag = fear
  hope_value = max hope_face
  fear_value = max fear_face
  delta = subtract hope_value by fear_value
Outcomes:
  "Hope" when delta > 0
  "Fear" when delta < 0
  "Critical Success" when delta = 0
Parameters: (none)
```

#### Preset: Cyberpunk RED — d10 + Skill (2d10)
```
Pool: 2d10
Reroll: none
Pipeline: (none)
Outcomes: "Success" when rolled >= DV
Parameters: DV sweep 10, 13, 15, 17, 20, 22, 25, 28, 30
```

#### Preset: Blades in the Dark — Xd6 action
```
Pool: 2d6 (default), sweeps 1..8
Reroll: none
Pipeline:
  best = max rolled
  six_count = filter rolled where face = 6
Outcomes:
  "Critical" when six_count >= 2
  "Success" when best >= 4
  "Partial" when best in 1..3
Parameters: dice count sweep 1..8
```

#### Preset: Savage Worlds — Trait + Wild die
```
Pool: 1dN tag:trait (default d8) + 1d6 tag:wild
Reroll: explode when face = max_value (both dice), repeat 5
Pipeline:
  trait_only = filter rolled where tag = trait
  wild_only = filter rolled where tag = wild
  trait_best = max trait_only
  wild_best = max wild_only
  effective = max trait_best by wild_best
Outcomes:
  "Raise" when effective >= 8
  "Success" when effective in 4..7
Parameters: trait die sides sweep 4, 6, 8, 10, 12
```

#### Scenario: Applying D&D preset
- GIVEN the user selects "D&D 5e — d20" preset
- WHEN the preset is applied
- THEN the pool is set to 1d20, outcomes include "Hit" with condition rolled >= DC, and a DC parameter with values [5, 10, 15, 20]

### Requirement: Preset Coverage
Presets MUST be updated when adding new features (reroll conditions, pipeline operations, outcome format) to maintain full coverage of all domain features.

#### Scenario: New feature requires preset update
- GIVEN a new pipeline operation "ceil" is added
- WHEN a preset is reviewed
- THEN at least one preset SHALL demonstrate the use of "ceil"

### Requirement: English Only
All preset UI strings (names, descriptions, outcome labels) SHALL be in English. Existing non-English strings are legacy and MUST be replaced.

#### Scenario: Preset language
- GIVEN any preset configuration
- WHEN displayed in the UI
- THEN all text (names, labels, comments) is in English