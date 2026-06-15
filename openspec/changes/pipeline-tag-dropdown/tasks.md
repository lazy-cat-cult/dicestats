# Tasks: pipeline-tag-dropdown

## 1. Specs
- [ ] 1.1 Update `openspec/specs/pipeline/spec.md`: add a requirement that tag-clause `value` MUST be selected from existing pool tags.
- [ ] 1.2 Update `openspec/specs/reroll/spec.md`: same requirement for reroll tag clauses.
- [ ] 1.3 Update `openspec/specs/ui/spec.md`: add the dropdown requirement to both editors.

## 2. State
- [ ] 2.1 In `src/state/app-state.ts`, add `export const existingTags = computed<string[]>(...)` that returns the unique sorted non-empty tags from `dicePool.value.terms`.

## 3. UI — PipelineEditor
- [ ] 3.1 In `src/components/PipelineEditor.tsx`, in the `ConditionChainEditor` `clause.field === 'tag'` branch, replace the free-text `<input>` with a `<select>` populated from `existingTags.value`. Default value: first existing tag, or empty placeholder when none exist.
- [ ] 3.2 Import `getTagColor` and `existingTags` from `app-state`. Apply `getTagColor(value)` to the dropdown's border color for visual consistency with `DicePoolEditor`.

## 4. UI — RerollEditor
- [ ] 4.1 In `src/components/RerollEditor.tsx`, apply the same change to its `clause.field === 'tag'` branch.

## 5. Validation
- [ ] 5.1 In `src/utils/validation.ts`, for each filter/remove op in the pipeline and for each reroll condition, emit a non-blocking warning when a tag clause references a tag that is not in the current pool.
- [ ] 5.2 Add a test in `tests/validation.test.ts` covering the warning case.

## 6. Verification
- [ ] 6.1 Run `verification-loop` skill and confirm `Overall: READY for PR`.
