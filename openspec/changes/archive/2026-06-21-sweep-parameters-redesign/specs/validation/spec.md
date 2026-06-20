# Validation Specification (delta)

## REMOVED Requirements

### Requirement: Parameter Validation
The v7 parameter validation rules (max 3 parameters; per-cell target existence; outcome target must have a scalar first condition; pipeline target must be a binary-math-literal) are removed. The new model has no per-cell `Parameter`; validation now operates on the value cells directly.

**Reason:** The per-cell `Parameter` and its target checks are obsolete.

**Migration:** The cell-shape validations are preserved under the new names below.

## ADDED Requirements

### Requirement: Sweep Variable Validation
The validator SHALL enforce the following rules on `SweepParameters`:

- `sweep.x` and `sweep.y` MUST contain at most 10 entries (after deduplication and sorting). A longer list is a blocking error.
- `sweep.y` MUST be `null` (or an empty array) whenever `sweep.x` is empty. A Y value with an empty X is a blocking error: `Sweep Y is set but Sweep X is empty`.
- X and Y values MUST be finite numbers. `NaN` and `Infinity` are a blocking error.

#### Scenario: X over 10 values
- **GIVEN** `sweep = { x: [1, 2, ..., 11], y: null }` (11 values)
- **WHEN** validation runs
- **THEN** a blocking error reads `Sweep X has 11 values (max 10)`

#### Scenario: Y without X
- **GIVEN** `sweep = { x: [], y: [10, 15] }`
- **WHEN** validation runs
- **THEN** a blocking error reads `Sweep Y is set but Sweep X is empty`

### Requirement: Expression Cell Validation
The validator SHALL attempt to parse every `Expr` in the configuration. An unparseable expression in any of the value cell locations (`DiceTerm.count`, `DiceTerm.sides`, `ScalarLiteralOp.value`, `ScalarCondition.value`, `DiceCondition.value`) is a blocking error pointing at the cell.

#### Scenario: Unparseable expression in pipeline literal
- **GIVEN** a pipeline row `total_mod = total + foo`
- **WHEN** validation runs
- **THEN** a blocking error reads `Pipeline row "total_mod": could not parse expression "foo"`

#### Scenario: Unparseable expression in outcome value
- **GIVEN** an outcome `Hit when total >= bar`
- **WHEN** validation runs
- **THEN** a blocking error reads `Outcome "Hit": could not parse expression "bar"`
