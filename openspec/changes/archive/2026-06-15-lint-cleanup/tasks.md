# Tasks: lint-cleanup

## 1. Spec
- [ ] 1.1 Create `openspec/changes/lint-cleanup/specs/code-quality/spec.md` with the Lint Cleanliness and No Rule Suppression requirements
- [ ] 1.2 `npx openspec validate lint-cleanup --strict` passes

## 2. Inventory lint errors
- [ ] 2.1 Run `npm run lint -- --format json` (or `compact`) and dump the full per-file list into `openspec/changes/lint-cleanup/lint-baseline.txt` for traceability
- [ ] 2.2 Group errors by file and rule; record counts in `tasks.md` under this section

## 3. Fix `src/types/index.ts` and dependent domain modules
- [ ] 3.1 If new helper types are required to replace `any`, add them to `src/types/index.ts` (this is the **only** type-file change allowed in this change)
- [ ] 3.2 Update `src/types/index.ts` consumers to import the new types

## 4. Fix `src/domain/`
- [ ] 4.1 `src/domain/roller.ts` — remove unused imports, type-precise roll helpers
- [ ] 4.2 `src/domain/matching.ts` — remove unused type imports, replace `any` with `ConditionValue` / `TaggedDie` / `unknown` as appropriate
- [ ] 4.3 `src/domain/reroll.ts` — same
- [ ] 4.4 `src/domain/resolve.ts` — fix the `no-useless-assignment` at line 81, type-precise pipeline evaluation
- [ ] 4.5 `src/domain/classify.ts` — same
- [ ] 4.6 `src/domain/presets.ts` — same
- [ ] 4.7 Verify worker isolation still holds: `grep -nE "from ['\"]preact" src/domain/*.ts` returns nothing

## 5. Fix `src/state/`
- [ ] 5.1 `src/state/app-state.ts` — remove unused imports
- [ ] 5.2 `src/state/persistence.ts` — fix `no-empty` blocks at lines 18, 42 (replace empty blocks with explicit `// intentional fall-through` **comment-free** no-op, e.g. a `return` for early-out or restructuring to avoid the empty block); type-precise v1→v3 migration (replace `any` with `unknown` + narrowing, or with `Partial<PersistedConfigV1>`)

## 6. Fix `src/utils/`
- [ ] 6.1 `src/utils/validation.ts` — remove unused type imports (lines 1, 74–138), fix `no-useless-assignment` at line 212, type-precise validator signatures
- [ ] 6.2 `src/utils/format.ts` — same

## 7. Fix `src/components/`
- [ ] 7.1 Audit each editor component for unused imports, `any` in event handlers and props, `console.log` (convert to `console.warn` or remove)
- [ ] 7.2 Components in scope: `StepWizard`, `DicePoolEditor`, `RerollEditor`, `PipelineEditor`, `OutcomeEditor`, `ParameterEditor`, `ResultView`, `PresetSelector`, `DistributionChart`

## 8. Fix `src/worker/sim.worker.ts`
- [ ] 8.1 Type-precise simulation loop (replace `any` at line 179 with a concrete helper type from `src/types/`)
- [ ] 8.2 No `preact`/DOM/Node imports introduced

## 9. Fix `tests/`
- [ ] 9.1 Remove unused type imports flagged by lint
- [ ] 9.2 Replace `any` in test fixtures with concrete types or `unknown` + `as` cast at the assertion site
- [ ] 9.3 All test assertions preserved
- [ ] 9.4 Tests still pass (143/143, plus any new)

## 10. Final lint pass
- [ ] 10.1 `npm run lint` exits 0 with **0 problems**
- [ ] 10.2 `git grep -nE "eslint-disable" src/ tests/` returns nothing (no inline disables introduced)
- [ ] 10.3 `git diff eslint.config.js` is empty (no config change)

## 11. Verify gates
- [ ] 11.1 `npm run typecheck` exits 0
- [ ] 11.2 `npm run test` passes 143/143
- [ ] 11.3 `npm run build` exits 0
- [ ] 11.4 `npx openspec validate --all --strict` passes
- [ ] 11.5 Run `verification-loop` skill; `Overall: READY` with `Lint: PASS (0 errors, 0 warnings)`

## 12. Commit & archive
- [ ] 12.1 Commit the change with message referencing the spec change
- [ ] 12.2 `npx openspec archive lint-cleanup` after merge
