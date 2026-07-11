## 1. Types

- [ ] 1.1 Add `highest` and `lowest` variants to `VectorFunction` in `src/types/index.ts`

## 2. Core Resolution

- [ ] 2.1 Implement `highest` branch in `applyVectorOp()` in `src/domain/resolve.ts` (spec: highest-lowest "Highest N vector function")
- [ ] 2.2 Implement `lowest` branch in `applyVectorOp()` in `src/domain/resolve.ts` (spec: highest-lowest "Lowest N vector function")

## 3. Validation

- [ ] 3.1 Add `highest`/`lowest` to type derivation in `inferTypeFromOp()` — return `'vector'` (spec: pipeline "Type Derivation")
- [ ] 3.2 Add N ≥ 0 validation for `highest`/`lowest` ops (spec: highest-lowest "Highest/Lowest are Vector Functions")
- [ ] 3.3 Add validation that `highest`/`lowest` source is a vector type (spec: pipeline "Type Derivation")

## 4. YAML Serialization

- [ ] 4.1 Add parsing for `highest <source> <n>` and `lowest <source> <n>` in `src/utils/yaml.ts`
- [ ] 4.2 Add serialization for `highest`/`lowest` NamedValue in `src/utils/yaml.ts`

## 5. UI

- [ ] 5.1 Add "Highest N" and "Lowest N" options to vector function dropdown in `src/components/PipelineEditor.tsx`
- [ ] 5.2 Add N input field UI for highest/lowest operations in PipelineEditor

## 6. Tests

- [ ] 6.1 Add tests for `highest` in `tests/resolve.test.ts`: basic, N > length, N = 0, tie-breaking, sweep variable
- [ ] 6.2 Add tests for `lowest` in `tests/resolve.test.ts`: basic, N = 0, chain with sum
- [ ] 6.3 Add YAML round-trip tests for highest/lowest in `tests/yaml.test.ts`
- [ ] 6.4 Add validation tests for highest/lowest in `tests/validation.test.ts`: type mismatch, N < 0

## 7. Verification

- [ ] 7.1 Run verification-loop skill: `npm run typecheck`, `npm run test`, `npm run lint` — all pass
- [ ] 7.2 Run `openspec validate add-highest-lowest` and fix any issues
