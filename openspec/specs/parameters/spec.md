# Parameters Specification

## Purpose

Parameters allow sweeping over a range of values to observe how probability changes. Each parameter value triggers a full independent simulation, enabling charts that show probability trends across different configurations.

## Requirements

### Requirement: Parameter Structure
Each parameter SHALL have:
- `id`: unique identifier
- `label`: display name (e.g., "Modifier", "DC")
- `values`: array of numbers to iterate over
- `target`: one of `'pool.count'`, `'pool.sides'`, `'outcome.value'`, or `'pipeline.literal'`
- `targetTermId`: which DiceTerm to modify (for `pool.count` and `pool.sides`)
- `targetOutcomeId`: which Outcome to modify (for `outcome.value`)
- `targetPipelineId`: which NamedValue to modify (for `pipeline.literal`)

```typescript
interface Parameter {
  id: string;
  label: string;
  values: number[];
  target: 'pool.count' | 'pool.sides' | 'outcome.value' | 'pipeline.literal';
  targetTermId?: string;
  targetOutcomeId?: string;
  targetPipelineId?: string;
}
```

#### Scenario: Dice count sweep
- GIVEN a parameter with target `'pool.count'`, values [1..10], targeting a 6-sided die
- WHEN the simulation runs
- THEN 10 independent simulations execute, each with a different dice count (1 through 10)

#### Scenario: Outcome threshold sweep
- GIVEN a parameter with target `'outcome.value'`, values [5, 10, 15, 20], targeting outcome "Hit"
- WHEN the simulation runs
- THEN 4 independent simulations execute, each with a different DC threshold value

### Requirement: Outcome Value Targeting
When an outcome has multiple conditions with numeric values, the parameter SHALL modify the **first** condition's `value` field. The UI SHALL clearly indicate which condition is affected.

#### Scenario: First condition modification
- GIVEN an outcome with conditions `[total >= 15, total <= 25]`
- AND a parameter targeting that outcome's value
- WHEN the parameter applies value 10
- THEN only the first condition changes: `[total >= 10, total <= 25]`

### Requirement: Pipeline Literal Targeting
When `target` is `'pipeline.literal'`, the targeted pipeline row MUST be a binary math operation with `operand: 'literal'`. The parameter replaces the literal `value` field.

#### Scenario: Valid pipeline literal target
- GIVEN a pipeline row: `modified = add rolled by 5` (operand: 'literal')
- WHEN a parameter targets this pipeline row
- THEN the parameter replaces the literal value (5) with each sweep value

#### Scenario: Invalid pipeline literal target
- GIVEN a pipeline row: `total = count hits` (no literal operand)
- WHEN a parameter targets this pipeline row
- THEN validation blocks the simulation and highlights the invalid target

### Requirement: Parameter Limit
A configuration SHALL support a maximum of 3 parameters.

#### Scenario: Maximum parameters enforced
- GIVEN 3 parameters already defined
- WHEN the user attempts to add a 4th parameter
- THEN the "Add parameter" button is disabled or hidden

### Requirement: Value Specification Format
Parameter values SHALL be specified as:
- A comma-separated list of numbers: `1, 5, 10`
- A range notation: `1..5` (inclusive, step 1)
- Auto-reversed ranges: `5..1` treated as `1..5`

#### Scenario: Range notation
- GIVEN a parameter with values specified as `1..5`
- WHEN parsed
- THEN the values are [1, 2, 3, 4, 5]

#### Scenario: Reversed range
- GIVEN a parameter with values specified as `10..5`
- WHEN parsed
- THEN the values are [5, 6, 7, 8, 9, 10]

### Requirement: Iteration Warning Thresholds
Total iterations = (product of all parameter value counts) × 1,000,000. The UI SHALL display a warning badge if total iterations exceed 10,000,000. The UI SHALL require user confirmation if total iterations exceed 50,000,000.

#### Scenario: Warning badge
- GIVEN two parameters with 4 and 5 values respectively (total 20 × 1,000,000 = 20M)
- WHEN the user views the parameter editor
- THEN a warning badge is displayed

#### Scenario: Confirmation dialog
- GIVEN two parameters with 8 and 7 values respectively (total 56 × 1,000,000 = 56M)
- WHEN the user attempts to run the simulation
- THEN a confirmation dialog appears