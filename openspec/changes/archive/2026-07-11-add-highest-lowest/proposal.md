## Why

The resolution pipeline supports filtering dice by conditions (face >= X, tag = Y), but has no way to select the N best or N worst dice from a pool. Use case: D&D ability score generation — roll 4d6, keep the 3 highest. Currently impossible with the available vector functions (filter/remove).

## What Changes

- Add `highest(N)` vector function: takes a vector, returns the N dice with the highest face values
- Add `lowest(N)` vector function: takes a vector, returns the N dice with the lowest face values
- N is an `Expr` (supports both literals like `3` and sweep variables like `N`, `X-1`)
- Vector → vector signature, chainable with other pipeline operations (filter, sum, etc.)
- YAML syntax: `best = highest rolled 3`, `worst = lowest rolled N`

## Capabilities

### New Capabilities

- `highest-lowest`: Vector functions to select N highest or N lowest dice from a vector

### Modified Capabilities

- `pipeline`: Add `highest` and `lowest` to `VectorFunction` type, execution, validation, and YAML serialization

## Impact

- **Types**: `src/types/index.ts` — `VectorFunction` union gains 2 variants
- **Resolution**: `src/domain/resolve.ts` — `applyVectorOp()` gains 2 branches
- **Validation**: `src/utils/validation.ts` — new vector op type checks, N ≥ 0 enforcement
- **YAML**: `src/utils/yaml.ts` — serialize/deserialize `highest`/`lowest`
- **UI**: `src/components/PipelineEditor.tsx` — new entries in vector function dropdown
- **Worker**: No changes needed — `sim-core.ts` uses `evaluatePipeline()` directly
- **Tests**: `tests/resolve.test.ts`, `tests/yaml.test.ts`, `tests/validation.test.ts`
- **Specs**: `openspec/specs/pipeline/spec.md` updated
