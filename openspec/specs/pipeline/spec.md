# Resolution Pipeline Specification

## Purpose

The resolution pipeline transforms rolled dice results into named intermediate values. Each row takes a source (the `rolled` vector or a prior named value) and applies a function to produce a new named value. Pipeline results are referenced by outcomes and by subsequent pipeline rows.

## Requirements

### Requirement: NamedValue Types and Structure
The pipeline SHALL consist of an ordered list of `NamedValue` entries. Each entry SHALL have:
- `id`: unique identifier
- `name`: identifier matching `/^[a-zA-Z_][a-zA-Z0-9_]*$/`, max 30 chars, unique within the pipeline
- `source`: references `rolled` or a named value defined in a prior row
- `op`: a VectorFunction or ScalarFunction
- `comment`: optional description, max 100 chars

There are two categories:
- **VectorFunction**: `filter`, `remove`, `highest`, or `lowest` — each produces a vector
- **ScalarFunction**: `count`, `sum`, `max`, `min`, `sub`, binary math (`add`/`subtract`/`multiply`/`divide` with terms array), `ceil`, `floor`, `switch` — produces a scalar

```typescript
type VectorFunction =
  | { fn: 'filter'; conditions: ConditionChain }
  | { fn: 'remove'; conditions: ConditionChain }
  | { fn: 'highest'; n: Expr }
  | { fn: 'lowest'; n: Expr };

type ScalarBinaryOp = 'add' | 'subtract' | 'multiply' | 'divide';

type ScalarBinaryTerm =
  | { operand: 'val'; value: Expr }
  | { operand: 'ref'; source2: string };

type ScalarFunction =
  | 'count'
  | 'sum'
  | 'max'
  | 'min'
  | 'sub'
  | { fn: ScalarBinaryOp; terms: ScalarBinaryTerm[] }
  | { fn: 'ceil' }
  | { fn: 'floor' }
  | { fn: 'max'; operand: 'ref'; source2: string }
  | { fn: 'min'; operand: 'ref'; source2: string }
  | { fn: 'switch'; branches: SwitchBranch[] };

type SwitchCondition = {
  source: string;
  op: '>' | '>=' | '<' | '<=' | '=' | '!=' | 'is_even' | 'is_odd';
  value?: Expr;
};

type SwitchBranch = {
  value: ScalarBinaryTerm;
  condition: SwitchCondition;
};

type NamedValue =
  | { id: string; name: string; source: string; op: VectorFunction; comment: string }
  | { id: string; name: string; source: string; op: ScalarFunction; comment: string };
```

#### Scenario: Pipeline row naming
- GIVEN a pipeline row where the user enters "2fast" as a name
- WHEN the name is validated
- THEN it SHALL be rejected (names must start with a letter or underscore per `/^[a-zA-Z_][a-zA-Z0-9_]*$/`)

#### Scenario: Duplicate name rejection
- GIVEN a pipeline with a row named `hits`
- WHEN the user adds another row named `hits`
- THEN validation SHALL block the simulation and highlight the duplicate name

### Requirement: Built-in Source `rolled`
The built-in source `rolled` SHALL refer to the flat array of all dice face values after reroll/explode processing. Each element carries `{ face: number; tag: string }`.

#### Scenario: Referencing rolled values
- GIVEN a pipeline row with `source: 'rolled'`
- WHEN the pipeline is evaluated in an iteration
- THEN the row receives the full vector of `{ face, tag }` objects

### Requirement: Vector Functions (filter/remove)
The pipeline SHALL support two vector functions:
- `filter` SHALL keep elements matching conditions and produce a vector
- `remove` SHALL remove elements matching conditions and produce a vector

Both SHALL use a `ConditionChain` (same type as in reroll conditions) with 1–10 clauses connected by `and`/`or`. The `ConditionClause` for `face` field supports both numeric expression values and `is_*` operators (`is_min` | `is_max` | `is_even` | `is_odd`).

#### Scenario: Filter operation
- GIVEN `hits = filter rolled where face >= 5`
- WHEN rolled values are [{ face: 3, tag: "" }, { face: 6, tag: "" }, { face: 2, tag: "" }]
- THEN `hits` contains [{ face: 6, tag: "" }]

#### Scenario: Filter with is_max
- GIVEN `crits = filter rolled where face is_max` on a d6 pool
- WHEN rolled values are [{ face: 4, tag: "" }, { face: 6, tag: "" }]
- THEN `crits` contains [{ face: 6, tag: "" }] (is_max matches face 6 for d6)

#### Scenario: Remove operation
- GIVEN `no_ones = remove rolled where face = 1`
- WHEN rolled values are [{ face: 1, tag: "" }, { face: 4, tag: "" }]
- THEN `no_ones` contains [{ face: 4, tag: "" }]

### Requirement: Scalar Functions (count/sum/max/min/sub)
The pipeline SHALL support scalar functions that operate on a vector or scalar and always produce a single number:
- `count` SHALL return the number of elements in a vector
- `sum` SHALL return the sum of face values in a vector
- `max` SHALL return the maximum face value in a vector (a single number, NOT a subset of dice)
- `min` SHALL return the minimum face value in a vector (a single number, NOT a subset of dice)
- `sub` SHALL return the first element's face minus all remaining elements' faces: `arr.slice(1).reduce((s, d) => s - d.face, arr[0]!.face)`. Empty vector returns 0.

`max` and `min` MUST be understood as scalar functions. They are NOT equivalent to `keep_highest`/`keep_lowest` which returned a vector of N dice.

#### Scenario: Max as scalar
- GIVEN `best = max rolled` with rolled values [{ face: 14 }, { face: 18 }]
- THEN `best` is 18 (a single number)

#### Scenario: Count of filtered vector
- GIVEN `hit_count = count hits` where `hits` is a vector of 3 elements
- THEN `hit_count` is 3

#### Scenario: Sum operation
- GIVEN `total = sum rolled` with rolled faces [3, 5, 2]
- THEN `total` is 10

### Requirement: Scalar Binary Math Operations
Binary math operations (`add`, `subtract`, `multiply`, `divide`) SHALL accept a `terms` array of `ScalarBinaryTerm` entries:
- `{ operand: 'val'; value: Expr }` SHALL operate with a constant expression
- `{ operand: 'ref'; source2: string }` SHALL operate with another named scalar

The first term is applied to the source value, and each subsequent term is applied to the accumulated result. For `named` terms, `source2` MUST reference `rolled` or a named value defined in a prior row that produces a **scalar** type.

#### Scenario: Add with named source
- GIVEN `total_successes = add success_count by double_crits`
- WHEN `success_count` is 4 and `double_crits` is 2
- THEN `total_successes` is 6

#### Scenario: Multiply with literal
- GIVEN `doubled = multiply base by 2`
- WHEN `base` is 3
- THEN `doubled` is 6

### Requirement: Ceil and Floor
`ceil` and `floor` SHALL round a scalar value up or down to the nearest integer respectively.

#### Scenario: Floor operation
- GIVEN `rounded = floor half_crits`
- WHEN `half_crits` is 1.5
- THEN `rounded` is 1

### Requirement: Max and Min of Two Scalars
`max` and `min` SHALL also accept a named scalar operand (in addition to operating on a vector), producing the larger or smaller of the two scalars respectively.

```typescript
| { fn: 'max'; operand: 'ref'; source2: string }
| { fn: 'min'; operand: 'ref'; source2: string }
```

`source2` MUST reference a prior named scalar.

#### Scenario: Max of two scalars
- GIVEN `effective = max trait_best by wild_best`
- WHEN `trait_best` is 5 and `wild_best` is 6
- THEN `effective` is 6

### Requirement: Source Ordering and Self-Reference
A pipeline row's `source` and `source2` (for named operand) SHALL reference `rolled` or a named value defined in a **prior** row. Binary operations SHALL NOT use the same named value for both `source` and `source2`.

#### Scenario: Invalid forward reference
- GIVEN a pipeline where row 2 references row 5 as its source
- WHEN validation runs
- THEN row 2 is highlighted as invalid with tooltip "References undefined value 'X'"

#### Scenario: Self-reference prohibited for binary ops
- GIVEN a pipeline row `result = add result by result`
- WHEN validation runs
- THEN the row is flagged as invalid

### Requirement: Type Derivation
The output type of each pipeline row SHALL be derived from the operation:
- `filter`, `remove`, `highest`, `lowest` → **vector**
- `count`, `sum`, `max`, `min`, `sub`, binary math, `ceil`, `floor`, `switch` → **scalar**

#### Scenario: Type mismatch — count on scalar
- GIVEN a pipeline row referencing a scalar named value as source with `op: 'count'`
- WHEN validation runs
- THEN the row is highlighted with error "Cannot apply count to scalar value"

#### Scenario: Type mismatch — binary op on vector
- GIVEN a pipeline row referencing a vector named value as source with a binary math operation
- WHEN validation runs
- THEN the row is highlighted as a type mismatch error

#### Scenario: Highest produces vector type
- GIVEN a pipeline row `best = highest rolled 3`
- WHEN validation runs
- THEN `best` is typed as vector, and scalar operations on `best` require explicit conversion

### Requirement: Highest and Lowest Vector Functions
The pipeline SHALL support `highest` and `lowest` vector functions as defined in the highest-lowest capability spec. Their execution SHALL follow the same evaluation path as `filter`/`remove` through `applyVectorOp()`.

### Requirement: divide-by-zero
A `divide` operation where the divisor is zero SHALL produce 0 (not Infinity or NaN). If a literal divisor of 0 is detected at configuration time, a validation warning SHALL be shown.

#### Scenario: Runtime divide by zero
- GIVEN `average = divide total by count` where `count` is 0
- THEN `average` is 0

### Requirement: Switch Function
The pipeline SHALL support a `switch` function that evaluates a source scalar against ordered branches and returns the first matching branch's value. Each branch defines a `SwitchCondition` and a `value`. If no branch matches, the source value is returned unchanged.

Supported `SwitchCondition` operators are `>`, `>=`, `<`, `<=`, `=`, `!=`, `is_even`, `is_odd`. The `value` field is optional (not used for `is_even`/`is_odd`). The branch `value` follows the same `ScalarBinaryTerm` format as binary math (supports `val` with expression or `ref` to a prior scalar).

#### Scenario: Switch with inequality conditions
- GIVEN a pipeline with `category = switch total: if > 15 value 'crit', if > 10 value 'hit', if > 5 value 'partial'`
- WHEN `total` is 12
- THEN `category` is `hit` (second branch matches first)
- WHEN `total` is 3
- THEN `category` is 3 (no branch matches, source returned)

#### Scenario: Switch with is_even
- GIVEN a pipeline with `parity = switch total: if is_even value 1`
- WHEN `total` is 4
- THEN `parity` is 1

### Requirement: Max/Min on Empty Vector
When `max`, `min`, or `sub` is applied to an empty vector, the result SHALL be `0`.

#### Scenario: Max on empty vector
- GIVEN a filter that removes all dice, followed by `max`
- WHEN the filter yields an empty vector
- THEN `max` returns `0`

### Requirement: Pipeline Row Limit
The pipeline SHALL support a maximum of 20 rows.

#### Scenario: Maximum rows enforced
- GIVEN 20 pipeline rows defined
- WHEN the user attempts to add a 21st row
- THEN the "Add named value" button is disabled or hidden