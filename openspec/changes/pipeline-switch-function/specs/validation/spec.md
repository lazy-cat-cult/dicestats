# Validation Specification — switch function

## ADDED Requirements

### Requirement: Switch Source Must Be Scalar

A pipeline row with `op.fn === 'switch'` SHALL require a scalar source. If the source is a vector, validation SHALL flag the row as a type mismatch error.

#### Scenario: switch on scalar source — valid
- GIVEN a pipeline where `max_val = max rolled` produces a scalar, then `result = max_val switch` with valid branches
- WHEN validation runs
- THEN no error is raised for the switch row

#### Scenario: switch on vector source — invalid
- GIVEN a pipeline where `hits = filter rolled where face >= 5` produces a vector, then `result = hits switch` with branches
- WHEN validation runs
- THEN the row is flagged with error "Cannot apply switch to vector source 'hits'"

### Requirement: Condition Source Ordering

Each branch's `condition.source` SHALL reference `rolled` or a named value defined in a pipeline row that appears **before** the current `switch` row. Forward references SHALL be flagged as errors.

#### Scenario: valid condition source reference
- GIVEN a pipeline with `a = sum rolled` at row 1, then `result = a switch` with branch condition `source: 'a'` at row 2
- WHEN validation runs
- THEN no error is raised

#### Scenario: forward reference in condition source
- GIVEN a pipeline with `result = base switch` at row 1 with branch condition `source: 'later_val'`, and `later_val = max rolled` at row 2
- WHEN validation runs
- THEN the branch is flagged with error "Condition source 'later_val' references a value defined after this row"

#### Scenario: undefined condition source
- GIVEN a pipeline with `result = base switch` and branch condition `source: 'nonexistent'`
- WHEN validation runs and 'nonexistent' is not defined anywhere in the pipeline
- THEN the branch is flagged with error "Condition source 'nonexistent' is not defined"

### Requirement: Condition Source Must Be Scalar

Each branch's `condition.source` SHALL reference a named value that produces a scalar type. If the referenced value produces a vector, validation SHALL flag the branch.

#### Scenario: condition source is scalar
- GIVEN `max_val = max rolled` (produces scalar), then `result = base switch` with branch condition `source: 'max_val'`
- WHEN validation runs
- THEN no error is raised for the condition source type

#### Scenario: condition source is vector
- GIVEN `hits = filter rolled where face >= 5` (produces vector), then `result = base switch` with branch condition `source: 'hits'`
- WHEN validation runs
- THEN the branch is flagged with error "Condition source 'hits' must be a scalar value"

### Requirement: Branch Named Value Ordering

When a branch's `value` has `operand: 'named'`, its `source2` SHALL reference a named value defined in a pipeline row that appears **before** the current `switch` row. Self-references SHALL be rejected.

#### Scenario: valid named value reference
- GIVEN `bonus = sum rolled` at row 1, then `result = base switch` at row 2 with branch value `{ operand: 'named', source2: 'bonus' }`
- WHEN validation runs
- THEN no error is raised

#### Scenario: self-reference in branch value
- GIVEN `result = base switch` with branch value `{ operand: 'named', source2: 'result' }`
- WHEN validation runs
- THEN the branch is flagged with error "Switch branch cannot reference itself"

#### Scenario: forward reference in branch value
- GIVEN `result = base switch` at row 1 with branch value `{ operand: 'named', source2: 'later_val' }`, and `later_val = max rolled` at row 2
- WHEN validation runs
- THEN the branch is flagged with error "Branch value source 'later_val' references a value defined after this row"

### Requirement: Condition Value Expression Validation

For comparison operators, `condition.value` SHALL be a valid `Expr`. If the expression evaluates to a non-finite value at validation time, a non-blocking warning SHALL be raised.

#### Scenario: valid condition value expression
- GIVEN a switch branch with `condition: { source: 'a', op: '=', value: { kind: 'literal', value: 10 } }`
- WHEN validation runs
- THEN no error is raised for the condition value

#### Scenario: non-finite condition value
- GIVEN a switch branch with `condition: { source: 'a', op: '=', value: { kind: 'binop', op: '/', left: { kind: 'literal', value: 1 }, right: { kind: 'literal', value: 0 } } }`
- WHEN validation evaluates with test vars `{ x: 1, y: 1 }`
- THEN a warning is raised: "Switch condition value evaluates to non-finite value"

### Requirement: Invalid Operators Rejected

`condition.op` values of `is_min` and `is_max` SHALL be rejected for switch conditions. These operators are dice-pool-relative and meaningless for scalar comparisons.

#### Scenario: is_min rejected
- GIVEN a switch branch with `condition.op: 'is_min'`
- WHEN validation runs
- THEN the branch is flagged with error "is_min is not valid for switch conditions"

#### Scenario: is_max rejected
- GIVEN a switch branch with `condition.op: 'is_max'`
- WHEN validation runs
- THEN the branch is flagged with error "is_max is not valid for switch conditions"

### Requirement: Branch Count Limits

A switch function SHALL have 1 to 10 branches. Zero branches or more than 10 SHALL be rejected.

#### Scenario: zero branches
- GIVEN a switch row with `branches: []`
- WHEN validation runs
- THEN the row is flagged with error "Switch requires at least 1 branch"

#### Scenario: eleven branches
- GIVEN a switch row with 11 branches
- WHEN validation runs
- THEN the row is flagged with error "Switch supports at most 10 branches"
