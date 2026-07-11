## Context

The resolution pipeline transforms dice vectors through a series of operations. Currently only `filter`/`remove` exist as vector functions. Adding `highest`/`lowest` follows the existing vector function pattern: both have the same `VectorFunction` signature (vector → vector) and share the same `NamedValue` infrastructure (source, name, id, op).

The key design constraint: `max`/`min` are already taken as scalar functions. The names `highest`/`lowest` are unambiguous and match the RPG community terminology ("keep highest N").

## Goals / Non-Goals

**Goals:**
- `highest(N)`: select N dice with highest face values from a vector
- `lowest(N)`: select N dice with lowest face values from a vector
- N is an `Expr` supporting literals, sweep variables, and arithmetic
- Deterministic tie-breaking (by original index)
- YAML round-trip serialization
- Full test coverage (resolve, validation, YAML)

**Non-Goals:**
- Keep/drop at the dice pool level (explicitly forbidden by dice-pool spec)
- Percentage-based N ("top 50%")
- Combined highest+lowest in one operation

## Decisions

**Decision 1: N as `Expr` (not `number`)**
Using `Expr` matches the project convention — `DiceTerm.count` and `DiceTerm.sides` both use `Expr`. This naturally supports sweep variables (`N`, `X-1`) without special syntax.

*Alternative considered:* Plain `number` with only literal support. Rejected because sweep variables are essential for parameter exploration.

**Decision 2: Tie-breaking by original `index`**
When multiple dice show the same face value and N falls between them, the result must be deterministic. Original index (`TaggedDie.index`) provides stable ordering — dice earlier in the roll are preferred.

*Alternative considered:* Random tie-breaking. Rejected because deterministic outcomes are required for reproducible simulation results.

**Decision 3: N clamped to `[0, arr.length]`**
If N exceeds the vector length, return all elements (not an error). If N is 0, return empty vector. This matches the principle of least surprise — users think "give me the best 3" not "give me exactly 3 or fail."

*Alternative considered:* Error on N > length. Rejected because it breaks sweep scenarios where N varies across parameter values.

**Decision 4: No changes to sim-core.ts**
The simulation core calls `evaluatePipeline()` directly. Since `highest`/`lowest` are implemented inside `applyVectorOp()` which is called by `evaluatePipeline()`, no changes to the worker are needed.

## Risks / Trade-offs

- **Sort creates a stable order dependency** → Mitigation: `index` in `TaggedDie` is always assigned sequentially, making tie-breaking deterministic and reproducible
- **N as Expr means runtime evaluation** → Mitigation: `exprToInteger()` already exists and handles all edge cases (min/max clamping, variable resolution)
- **YAML syntax ambiguity with source names** → Mitigation: the parser reads `highest <source> <n>` where source is always a single identifier and n is always the last token
