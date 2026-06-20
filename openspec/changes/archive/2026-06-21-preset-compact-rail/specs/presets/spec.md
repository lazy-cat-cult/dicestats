## ADDED Requirements

### Requirement: Featured Preset Subset
The application SHALL export a `FEATURED_PRESET_IDS: readonly string[]` constant from `src/domain/presets.ts` declaring the subset of built-in preset ids surfaced in the Preset Rail's pills region. The Preset Rail renders the user-loaded presets followed by `PRESETS.filter(p => FEATURED_PRESET_IDS.includes(p.id))` in the order declared by `FEATURED_PRESET_IDS`. Built-in presets whose ids are not in the list are reachable only through the Preset Library Modal. The initial list SHALL contain the ids: `dnd-d20`, `pbta-2d6`, `blades-in-the-dark`, `daggerheart-duality`.

#### Scenario: Featured list is exported
- GIVEN `src/domain/presets.ts`
- WHEN the file is imported
- THEN `FEATURED_PRESET_IDS` is a non-empty `readonly string[]`
- AND every id in the list exists in `PRESETS`

#### Scenario: Only featured built-ins appear in the rail
- GIVEN a built-in preset whose id is not in `FEATURED_PRESET_IDS`
- WHEN the Preset Rail renders
- THEN the preset is not present in the rail
- AND it is present in the Preset Library Modal's full list

#### Scenario: Featured order is preserved
- GIVEN `FEATURED_PRESET_IDS = ['pbta-2d6', 'dnd-d20']` and the user has no loaded presets
- WHEN the Preset Rail renders
- THEN the first pill is the preset whose id is `pbta-2d6`
- AND the second pill is the preset whose id is `dnd-d20`
