# Proposal: pipeline-tag-dropdown

## Why

In `src/components/PipelineEditor.tsx:439-454` and `src/components/RerollEditor.tsx:220-237`, a `ConditionClause` with `field: 'tag'` is rendered with a free-text `<input type="text">` for the tag value. Free text is fragile: a user can type `"Hunger"` (capital H) and the clause will not match a die tagged `"hunger"` (lowercase h), because `matchClause` in `src/domain/matching.ts` uses a strict `===` comparison (`die.tag === clause.value`).

Replacing the free-text input with a `<select>` populated from the existing dice pool tags (`dicePool.terms[].tag`) eliminates the typo class of bugs entirely. The same dropdown is also used for the matching logic, so the values rendered to the user are exactly the values the matcher will compare against.

A new `existingTags` computed signal in `src/state/app-state.ts` produces the unique sorted list of non-empty tag values from the current dice pool. Both editors consume it. The `DicePoolEditor` already uses `getTagColor(tag)` to colorize the tag input border (`DicePoolEditor.tsx:159`), and the same color signal is reused in the dropdown options for visual consistency.

## What Changes

- **Add** `existingTags` computed signal in `src/state/app-state.ts` (unique sorted tags from `dicePool.terms[].tag`).
- **Modify** `src/components/PipelineEditor.tsx`: in the `clause.field === 'tag'` branch, replace the `<input type="text">` with a `<select>` populated from `existingTags.value`. Default value: the first existing tag, or "Select tag…" placeholder when the list is empty. Operator stays `=` / `!=`.
- **Modify** `src/components/RerollEditor.tsx`: same change in its `clause.field === 'tag'` branch.
- **Modify** `src/utils/validation.ts`: when a tag clause references a tag that is not in the existing pool, emit a non-blocking warning ("Tag clause references tag 'X' that is not defined in the pool"). The simulation is still allowed to run.
- **Modify** `openspec/specs/pipeline/spec.md` and `openspec/specs/reroll/spec.md`: the `value` of a tag clause MUST be one of the existing dice pool tags; free text is not allowed.
- **Modify** `openspec/specs/ui/spec.md`: add the dropdown requirement to both editors.

## Impact

- Affected specs:
  - `openspec/specs/pipeline/spec.md` — `ConditionChain` / `ConditionClause` requirement.
  - `openspec/specs/reroll/spec.md` — `ConditionChain` / `ConditionClause` requirement.
  - `openspec/specs/ui/spec.md` — PipelineEditor and RerollEditor.
- Affected code:
  - `src/state/app-state.ts` (new computed).
  - `src/components/PipelineEditor.tsx` (tag-clause UI).
  - `src/components/RerollEditor.tsx` (tag-clause UI).
  - `src/utils/validation.ts` (non-blocking warning for missing tag).
  - `tests/validation.test.ts` (new warning case).
- No change to the matcher; `matchClause` is unchanged.

## Non-Goals

- No change to the matcher algorithm.
- No change to the dice pool tag input — the `DicePoolEditor` already has a free-text tag input with autocomplete. A future change can convert that to a tag-only model; not part of this scope.
- No migration of saved configs; tag clauses continue to store the tag as a string, and validation only warns if the stored tag is not in the current pool.
- No enforcement of case-insensitive matching. The matcher is strict; the dropdown ensures the user can only pick a value that is byte-identical to a pool tag.
