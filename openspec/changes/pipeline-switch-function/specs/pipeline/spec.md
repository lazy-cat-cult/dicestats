# Pipeline Specification — switch function

## ADDED Requirements

### Requirement: Switch Function Types

The pipeline SHALL support a `switch` scalar function that selects a value from ordered branches based on runtime conditions. The source value SHALL be returned when no branch condition matches (default fallback).

```typescript
type SwitchCondition = {
  source: string;
  op: '>' | '>=' | '<' | '<=' | '=' | '!=' | 'is_even' | 'is_odd';
  value?: Expr;
};

type SwitchBranch = {
  value: ScalarBinaryTerm;
  condition: SwitchCondition;
};

// Added to ScalarFunction union:
| { fn: 'switch'; branches: SwitchBranch[] }
```

`SwitchCondition.op` SHALL be restricted to comparison operators (`>`, `>=`, `<`, `<=`, `=`, `!=`) and unary scalar operators (`is_even`, `is_odd`). `is_min` and `is_max` SHALL NOT be valid for switch conditions.

`SwitchCondition.value` SHALL be required for comparison operators and SHALL be absent for `is_even` and `is_odd`.

`SwitchCondition.source` SHALL reference a named value defined in a prior pipeline row that produces a scalar type.

`SwitchBranch.value` SHALL use the existing `ScalarBinaryTerm` type: `{ operand: 'literal'; value: Expr }` or `{ operand: 'named'; source2: string }`. When `operand` is `'named'`, `source2` SHALL reference a named scalar value defined in a prior pipeline row.

#### Scenario: switch type structure
- GIVEN a pipeline row with `source: 'main_value'` and `op: { fn: 'switch', branches: [...] }`
- WHEN the row is validated
- THEN the type is recognized as a valid `ScalarFunction` variant

#### Scenario: invalid operator rejection
- GIVEN a switch branch with `condition.op: 'is_min'`
- WHEN validation runs
- THEN the branch is flagged with error "is_min is not valid for switch conditions"

### Requirement: Switch Evaluation

`switch` evaluation SHALL iterate branches in declaration order. For each branch:

1. Resolve `condition.source` from the pipeline environment to a scalar number
2. For comparison operators (`>`, `>=`, `<`, `<=`, `=`, `!=`): evaluate `condition.value` as an `Expr` and apply the comparison using the existing `compare()` function
3. For `is_even`: check if the resolved source is even (`value % 2 === 0`)
4. For `is_odd`: check if the resolved source is odd (`value % 2 !== 0`)
5. If the condition matches: resolve the branch's `value` and return it
6. If no branch matches: return the source value

The resolved source from `condition.source` SHALL be number-coerced for `is_even`/`is_odd` (works on floats, e.g. `3.5 % 2 === 1.5`, truthy).

#### Scenario: first matching branch wins
- GIVEN `total = main_value switch` with branches:
  - `crithit if main_value = 10`
  - `critmiss if main_value = 1`
  - `-2 if critmiss < 0`
- WHEN `main_value` is 10, `crithit` is 12, `critmiss` is 0
- THEN `total` is 12 (first branch matches)

#### Scenario: no branch matches — default to source
- GIVEN `total = main_value switch` with branches:
  - `crithit if main_value = 10`
  - `critmiss if main_value = 1`
- WHEN `main_value` is 5
- THEN `total` is 5 (source value returned as default)

#### Scenario: named branch value evaluation
- GIVEN `bonus = base switch` with branch `+5 if advantage > 0`
- WHEN `base` is 3 and `advantage` is 1
- THEN `bonus` is 5 (named literal resolves against Expr evaluator: `evalExpr({ kind: 'literal', value: 5 }, vars)`)

#### Scenario: literal branch value with named source2
- GIVEN `result = fallback switch` with branch `doubled if flag = 1` where branch value is `{ operand: 'named', source2: 'doubled' }`
- WHEN `fallback` is 0, `flag` is 1, `doubled` is 14
- THEN `result` is 14 (branch value resolves to named scalar)

#### Scenario: is_even condition
- GIVEN `label = base switch` with branch `1 if turns is_even`
- WHEN `base` is 0 and `turns` is 4
- THEN `label` is 1

#### Scenario: is_odd condition
- GIVEN `label = base switch` with branch `2 if turns is_odd`
- WHEN `base` is 0 and `turns` is 3
- THEN `label` is 2

#### Scenario: empty vector as condition source
- GIVEN a switch where `condition.source` resolves to a vector (not a scalar)
- WHEN the pipeline is evaluated
- THEN the condition is treated as not-matched and evaluation proceeds to the next branch

#### Scenario: missing condition source
- GIVEN a switch where `condition.source` is not found in the environment
- WHEN the pipeline is evaluated
- THEN the condition is treated as not-matched and evaluation proceeds to the next branch

### Requirement: Switch Branch Limits

A `switch` function SHALL accept 1 to 10 branches.

#### Scenario: minimum branches
- GIVEN a switch with 0 branches
- WHEN validation runs
- THEN the row is flagged with error "Switch requires at least 1 branch"

#### Scenario: maximum branches
- GIVEN a switch with 11 branches
- WHEN validation runs
- THEN the row is flagged with error "Switch supports at most 10 branches"

### Requirement: Switch Output Type

`switch` SHALL produce a scalar value. `inferTypeFromOp()` SHALL return `'scalar'` for `switch` functions.

#### Scenario: type derivation
- GIVEN a pipeline row with `op: { fn: 'switch', branches: [...] }`
- WHEN `inferTypeFromOp()` is called
- THEN it returns `'scalar'`
