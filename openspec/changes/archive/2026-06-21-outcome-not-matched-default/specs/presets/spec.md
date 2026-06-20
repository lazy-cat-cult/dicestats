# Presets Specification (delta)

## MODIFIED Requirements

### Requirement: Preset Configurations
All preset definitions SHALL be updated to remove `(default)` markers and remove catch-all outcomes that were previously marked as default. Presets MUST NOT contain any `(default)` syntax in YAML or `isDefault: true` in TypeScript.

#### Preset: PbtA — 2d6
```
Pool: 2d6
Reroll: none
Pipeline: total_mod = total + 0
Outcomes:
  "Success" when total_mod >= 10
  "Partial" when total_mod >= 7 AND total_mod <= 9
  "Failure" when total_mod <= 6
Parameters: (none)
```
Note: "Failure" is kept because it has a meaningful condition (`total_mod <= 6`), not because it was a catch-all.

#### Preset: Shadowrun — Xd6
```
Pool: 5d6
Reroll: none
Pipeline:
  hits = filter rolled where face >= 5
  hit_count = count hits
Outcomes:
  "1+ hits" when hit_count >= 1
Parameters: dice count sweep 1..10
```
"Glitch" / "No hits" catch-all outcome is REMOVED. Rolls with 0 hits will be classified as "Not matched".

#### Preset: Vampire V5
```
Pool: 3d10 tag:normal + 2d10 tag:hunger
Reroll: none
Pipeline: ...
Outcomes:
  "Success" when total_successes >= TN AND total_successes > 0
  "Critical Success" when crit_count >= 2
  "Bestial Failure" when bestial_count >= 1 AND total_successes = 0
Parameters: TN sweep 1..5
```
"Failure" catch-all outcome is REMOVED. Rolls with no success and no bestial failure will be classified as "Not matched".

#### Preset: Daggerheart — Duality
```
Pool: 1d12 tag:hope + 1d12 tag:fear
Reroll: none
Pipeline:
  ...
  delta = subtract hope_value by fear_value
Outcomes:
  "Hope" when delta > 0
  "Fear" when delta < 0
  "Critical Success" when delta = 0
Parameters: (none)
```
"Critical Success" is no longer marked `(default)`. It has a meaningful condition (`delta = 0`).

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
"Failure" catch-all outcome is REMOVED. Rolls with best <= 3 AND six_count < 2 that don't match "Partial" will be classified as "Not matched".

Note: "Partial" covers best in 4..5, not 1..3. The conditions are: Critical (six_count >= 2), Success (best = 6), Partial (best >= 4 AND best <= 5). Rolls with best <= 3 will be "Not matched".

#### Preset: Savage Worlds — Trait + Wild die
```
Pool: 1dN tag:trait (default d8) + 1d6 tag:wild
Reroll: explode when face = max_value (both dice), repeat 5
Pipeline:
  ...
  effective = max trait_best by wild_best
Outcomes:
  "Raise" when effective >= 8
  "Success" when effective in 4..7
Parameters: trait die sides sweep 4, 6, 8, 10, 12
```
"Failure" catch-all outcome is REMOVED. Rolls with effective < 4 will be classified as "Not matched".

#### Preset: World of Darkness — Xd10 explode
```
Pool: 5d10
Reroll: explode when face = max_value, repeat 3
Pipeline: (none)
Outcomes:
  "Success" when any rolled >= 8
Parameters: dice count sweep 1..10
```
"Failure" catch-all outcome is REMOVED. Rolls with no die >= 8 will be classified as "Not matched".
