# Presets Specification (delta)

## MODIFIED Requirements

### Requirement: Built-in Preset Format
Every built-in preset in `src/domain/presets.ts` SHALL be rewritten to the v8 form. Numeric value cells in the pool, pipeline, and outcomes MUST be `Expr` cells. A literal `15` SHALL be `{ kind: 'literal', value: 15 }`. A reference to X SHALL be `{ kind: 'ref', name: 'X' }`. A compound expression SHALL be the corresponding binop tree. The `parameters` field SHALL be removed and replaced by a `sweep` field. Presets that previously swept a single value MUST use `sweep: { x: [...], y: null }`. Presets that demonstrate Y MUST use `sweep: { x: [...], y: [...] }`.

#### Scenario: D&D 5e d20 preset
- **GIVEN** the `D&D 5e — d20` preset
- **WHEN** the preset is applied
- **THEN** the configuration has `pool: 1d20`, `pipeline: total = sum rolled`, `outcomes: [Hit when total >= X]`, `sweep: { x: [5, 10, 15, 20], y: null }`
- **AND** the outcome's first condition value is `{ kind: 'ref', name: 'X' }`

#### Scenario: PbtA preset with Y
- **GIVEN** the `PbtA — 2d6` preset
- **WHEN** the preset is applied
- **THEN** the configuration has `pool: 2d6`, `pipeline: [total = sum rolled, total_mod = total + X]`, `outcomes: [Success when total_mod >= Y, ...]`, `sweep: { x: [-2, -1, 0, 1, 2], y: [10, 15] }`
- **AND** the pipeline literal's value is `{ kind: 'ref', name: 'X' }` and the `Success` outcome's first condition value is `{ kind: 'ref', name: 'Y' }`

### Requirement: Preset Application
When a preset is applied, the application MUST copy the preset's `sweep` into the global state (replacing any previous sweep), evaluate the preset's value cells against the sweep's first X and Y values for the dice-notation preview, and clear the previous results.

#### Scenario: Applying the PbtA preset
- **GIVEN** the user clicks the PbtA preset pill
- **WHEN** the application applies it
- **THEN** `sweep` is replaced with `{ x: [-2, -1, 0, 1, 2], y: [10, 15] }`
- **AND** the dice pool notation reads `2d6` (the dice count is a literal `2`, not an expression)
- **AND** the simulation results are cleared
