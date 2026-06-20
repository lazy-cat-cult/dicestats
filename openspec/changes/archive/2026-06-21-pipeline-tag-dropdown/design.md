# Design: pipeline-tag-dropdown

## Goals

- Tag-clause values are selected from the existing dice pool tags, not typed.
- The matcher sees exactly the same strings the user can pick.
- A tag that is removed from the pool but still referenced by a clause produces a non-blocking warning; the simulation can still run.
- The visual style of the dropdown is consistent with the `DicePoolEditor`'s tag input (color-coded border, where applicable).

## Non-Goals

- No change to the matcher.
- No change to the dice pool tag input.

## State

```ts
// src/state/app-state.ts
export const existingTags = computed<string[]>(() => {
  const set = new Set<string>();
  for (const t of dicePool.value.terms) {
    if (t.tag) set.add(t.tag);
  }
  return Array.from(set).sort();
});
```

## UI

In `PipelineEditor.tsx:439-454` and `RerollEditor.tsx:220-237`, the `clause.field === 'tag'` branch becomes:

```tsx
<>
  <select
    value={clause.operator}
    class="px-1 py-0.5 border rounded text-xs"
    onChange={(e) => updateClause(ci, { operator: (e.target as HTMLSelectElement).value as '=' | '!=' })}
  >
    {TAG_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
  </select>
  <select
    value={clause.value as string}
    class="px-1 py-0.5 border rounded text-xs"
    style={typeof clause.value === 'string' && clause.value ? { borderColor: getTagColor(clause.value) } : {}}
    onChange={(e) => updateClause(ci, { value: (e.target as HTMLSelectElement).value })}
  >
    {existingTags.value.length === 0 && <option value="">Select tag…</option>}
    {existingTags.value.map((tag) => (
      <option key={tag} value={tag}>{tag}</option>
    ))}
  </select>
</>
```

The dropdown's border color uses `getTagColor(value)` to keep consistency with the `DicePoolEditor` tag input. When `existingTags.value` is empty, the only option is the placeholder `Select tag…` (value `""`); the simulation still runs but the clause will not match anything until the user adds a tag to the pool.

## Validation

`src/utils/validation.ts` adds a new non-blocking rule under the existing warning section:

```ts
for (const nv of pipeline) {
  // ... existing checks
  if (isFilterOrRemoveOp(nv.op)) {
    for (const clause of nv.op.conditions.clauses) {
      if (clause.field === 'tag' && typeof clause.value === 'string' && clause.value && !existingPoolTags.has(clause.value)) {
        errors.push({ id: nextId(), message: `Tag clause references tag "${clause.value}" that is not defined in the pool`, blocking: false });
      }
    }
  }
}
```

Equivalent for reroll conditions.

`existingPoolTags` is computed inside `validateConfig` from the current `pool.terms[].tag` values (no need to thread the existing-tags signal in).

## Specs

`openspec/specs/pipeline/spec.md` and `openspec/specs/reroll/spec.md` add the requirement that tag-clause values are restricted to existing tags at edit time, with a non-blocking warning if a previously stored tag is no longer in the pool.

`openspec/specs/ui/spec.md` adds the dropdown UI requirement to both editors.

## Risks

- **Empty pool** — when the pool has no tags, the dropdown shows only `Select tag…`. Adding the first tag to the pool immediately populates the dropdown. The user can still create a tag clause (with empty value) and the simulation runs (it just matches nothing). Validation does not block.
- **Tag removed after a clause references it** — the loaded `SavedConfig` may contain a tag clause for a tag that the user later removes from the pool. The dropdown cannot represent that value (it is not in the list), but the underlying clause still exists; the validation warning fires to alert the user.
- **Color signal reuse** — `getTagColor` is hash-based; the same input always yields the same color, so dropdown options are color-stable. Removing a tag and re-adding it (with the same string) preserves the color.
