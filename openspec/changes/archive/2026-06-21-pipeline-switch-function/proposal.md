## Why

The current pipeline has no mechanism for conditional value selection — every row produces a single deterministic result from its source. Users need the ability to return different values based on runtime conditions, for example: "use `crithit` if `main_value = 10`, use `critmiss` if `main_value = 1`, use `-2` if `critmiss < 0`, otherwise return `main_value`". This is a common pattern in TTRPG resolution (critical hits, fumbles, conditional modifiers) that currently requires multiple pipeline rows and outcomes to approximate.

The `switch` function fills this gap: it takes a scalar source as the default and an ordered list of branches, each with a value and a condition. Branches are evaluated in order; the first matching branch's value is returned. If no branch matches, the source value is returned as the default.

## What Changes

- **New** `switch` scalar function added to `ScalarFunction` union in `src/types/index.ts`. Accepts an ordered `branches` array (1–10 branches). Each branch has:
  - `value`: a `ScalarBinaryTerm` — either a literal `Expr` or a reference to a named scalar value
  - `condition`: a `SwitchCondition` with `source` (named scalar value to compare), `op` (comparison operator from `ConditionOperator`), and `value` (`Expr` for comparison operators; absent for `is_even`/`is_odd`)
- **New** `SwitchBranch` and `SwitchCondition` types in `src/types/index.ts`
- **New** evaluation logic in `src/domain/resolve.ts`: `applySwitch(sourceVal, branches, env, vars)` iterates branches in order, resolves each condition's source and value, applies the comparison, and returns the first matching branch's resolved value. If no branch matches, returns `sourceVal`.
- **New** validation rules in `src/utils/validation.ts`: `switch` requires scalar source; each branch's `condition.source` must reference a defined prior scalar; each branch's `value` if `named` must reference a defined prior named value; `condition.source` and branch `value.source2` must appear before the current row
- **New** UI support: `PipelineEditor` gains a `switch` option in the function dropdown; selecting it shows a branch editor (similar to binary math terms but with condition fields)
- **Modified** `inferTypeFromOp` returns `'scalar'` for `switch`
- **Modified** YAML preset parser/serializer supports the `switch` syntax

## Capabilities

### New Capabilities
- `pipeline-switch`: conditional value selection in the resolution pipeline with ordered branches and default fallback

### Modified Capabilities
- `pipeline`: the `ScalarFunction` union gains the `switch` variant
- `validation`: new rules for switch branches (source ordering, type compatibility, branch count)

## Impact

- `src/types/index.ts`: add `SwitchBranch`, `SwitchCondition` types; add `{ fn: 'switch'; branches: SwitchBranch[] }` to `ScalarFunction`
- `src/domain/resolve.ts`: add `applySwitch()` function; add switch branch in `evaluatePipeline()`'s main loop
- `src/utils/validation.ts`: add switch-specific validation (scalar source check, branch.source ordering, branch count)
- `src/components/PipelineEditor.tsx`: add `switch` to function dropdown; render branch editor UI
- `src/utils/yaml.ts`: serialize/deserialize switch branches in pipeline YAML
- `src/domain/presets.ts`: no preset uses switch initially (feature is opt-in for user-created configs)
- `tests/resolve.test.ts`: add switch evaluation tests
- `tests/validation.test.ts`: add switch validation tests
- No new dependencies
