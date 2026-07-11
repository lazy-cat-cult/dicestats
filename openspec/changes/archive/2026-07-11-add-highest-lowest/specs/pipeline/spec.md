## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Highest and Lowest Vector Functions
The pipeline SHALL support `highest` and `lowest` vector functions as defined in the highest-lowest capability spec. Their execution SHALL follow the same evaluation path as `filter`/`remove` through `applyVectorOp()`.

## MODIFIED Requirements

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
