# Persistence Specification (delta)

## MODIFIED Requirements

### Requirement: Saved Config Version
The saved config version SHALL be 8. The `SavedConfig` shape MUST be:

```ts
interface SavedConfig {
  version: 8;
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  sweep: SweepParameters;
}
```

The legacy `parameters: Parameter[]` field SHALL be removed.

#### Scenario: Saving a config
- **WHEN** the application saves the current configuration to `localStorage`
- **THEN** the payload is `{ version: 8, pool, rerollConditions, pipeline, outcomes, sweep }` with no `parameters` field

### Requirement: v7 to v8 Migration
On load, a v7 config (with `parameters: Parameter[]` and numeric value cells) MUST be migrated in-memory to v8 as follows:

- For each old `Parameter` with `target = 'pool.count'` or `'pool.sides'`: locate the targeted term by `targetTermId` and rewrite its `count` / `sides` to `{ kind: 'ref', name: 'X' }`. Add the parameter's `values` to a temporary `sweep.x` accumulator (deduplicated, sorted ascending).
- For each old `Parameter` with `target = 'outcome.value'`: locate the targeted outcome by `targetOutcomeId` and rewrite its first condition's `value` to `{ kind: 'ref', name: 'X' }`. Add the parameter's `values` to `sweep.x`.
- For each old `Parameter` with `target = 'pipeline.literal'`: locate the targeted pipeline row by `targetPipelineId` and rewrite its `op.value` (when the op is a `ScalarLiteralOp`) to `{ kind: 'ref', name: 'X' }`. Add the parameter's `values` to `sweep.x`.
- After processing all old parameters, set `sweep.x` to the accumulated list. `sweep.y` SHALL be `null` for all v7 → v8 migrations.
- All numeric value cells in the pool, pipeline, and outcomes that were NOT rewritten MUST be wrapped as `{ kind: 'literal', value: <n> }`.

#### Scenario: Single DC sweep migration
- **GIVEN** a v7 config with one `Parameter` (label `DC`, values `[5, 10, 15, 20]`, target `outcome.value` on the `Hit` outcome)
- **WHEN** the application loads the config
- **THEN** the migrated config has `sweep = { x: [5, 10, 15, 20], y: null }`
- **AND** the `Hit` outcome's first condition value is `{ kind: 'ref', name: 'X' }`

#### Scenario: Multi-parameter migration
- **GIVEN** a v7 config with two `Parameter`s, one on dice count (values `[1..5]`) and one on a pipeline literal (values `[-2..2]`)
- **WHEN** the application loads the config
- **THEN** the migrated config has `sweep = { x: [-2, -1, 0, 1, 2, 1, 2, 3, 4, 5], y: null }` (sorted, deduplicated)
- **AND** the targeted dice term's `count` is `ref X` and the targeted pipeline literal's `value` is `ref X`

#### Scenario: Numeric value cells become literals
- **GIVEN** a v7 config where an outcome's condition value is `15` and is NOT swept
- **WHEN** the application loads the config
- **THEN** the migrated config has the condition value as `{ kind: 'literal', value: 15 }`

### Requirement: YAML Preset Format
The YAML preset format SHALL be updated to the v8 form. A `sweep:` mapping with optional `x:` and `y:` lists MUST be present: `sweep:\n  x: [1, 2, 3]\n  y: [10, 15]`. When the user has only an X sweep, `y` SHALL be omitted. Value cells in the pool, pipeline, and outcomes MUST serialize as their expression string. A literal `15` is written as `15`. A reference to X is written as `X`. A compound expression is written as `X+2`. The legacy `parameters:` block SHALL be removed.

#### Scenario: X-only preset
- **GIVEN** a preset with `sweep: { x: [5, 10, 15, 20] }` and a `Hit when total >= X` outcome
- **WHEN** the preset is serialized to YAML
- **THEN** the YAML contains `sweep:\n  x: [5, 10, 15, 20]` and the outcome line reads `Hit when total >= X`

#### Scenario: X and Y preset
- **GIVEN** a preset with `sweep: { x: [-2, -1, 0, 1, 2], y: [10, 15] }` and a pipeline row `total_mod = total + X` and an outcome `Hit when total_mod >= Y`
- **WHEN** the preset is serialized to YAML
- **THEN** the YAML contains `sweep:\n  x: [-2, -1, 0, 1, 2]\n  y: [10, 15]`, the pipeline row reads `total_mod = total + X`, and the outcome reads `Hit when total_mod >= Y`
