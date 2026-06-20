# Design: YAML pseudolanguage for presets

## File layout

A file holds **one or many presets**. The bare form (single preset) is a flat mapping. The bundled form wraps a list under `presets:`.

Single preset (always what Save writes):

```yaml
name: D&D 5e — d20
pool: 1d20
reroll: []
pipeline:
  - total = sum rolled
outcomes:
  - Hit when total >= 15
parameters:
  - DC: [5, 10, 15, 20] over outcome.value on Hit
```

Bundle (accepted on Load):

```yaml
presets:
  - name: Preset A
    pool: 1d20
    ...
  - name: Preset B
    pool: 2d6
    ...
```

If the file has a top-level `name:` key → single-preset bare form. If it has a top-level `presets:` list → bundle. Mixing both at the same level is a parse error.

## Grammar (informal)

### `pool`

A die term is `NdS` or `NdS<tag>`. `N` and `S` are positive integers. `tag` is `[A-Za-z][A-Za-z0-9_]*`. Multiple terms are joined by ` + ` (with surrounding spaces). Empty tag → no `<>`.

Examples:

```yaml
pool: 1d20
pool: 2d6
pool: 1d12<hope> + 1d12<fear>
pool: 3d10<normal> + 2d10<hunger>
```

### `reroll`

A list of `action when clauses [up to N times]`. `action` ∈ `reroll` | `explode`. Clauses are one or more `field op value` joined by ` and ` / ` or `. `field` ∈ `face` | `tag`. `op` ∈ `>=` `>` `<=` `<` `=` `!=`. `value` is a number or the special tokens `max` / `min` (mapped to `max_value` / `min_value` for `face` field). `up to N times` is optional; default 1.

```yaml
reroll:
  - explode when face = max up to 5 times
  - reroll when tag = hunger and face <= 1
```

### `pipeline`

A list of `name = expr`. Each entry is one named step; the order in the list is the evaluation order (steps may only reference earlier steps or `rolled`).

`expr` forms:

| Form | Maps to |
|---|---|
| `sum X` | `op: 'sum'` |
| `max X` | `op: 'max'` |
| `min X` | `op: 'min'` |
| `count X` | `op: 'count'` |
| `filter X where clauses` | `op: { fn: 'filter', conditions }` |
| `remove X where clauses` | `op: { fn: 'remove', conditions }` |
| `ceil X` | `op: { fn: 'ceil' }` |
| `floor X` | `op: { fn: 'floor' }` |
| `A + B` / `A - B` / `A * B` / `A / B` | `op: { fn: add|subtract|multiply|divide, operand: 'ref', source2: B }` |
| `max(A, B)` / `min(A, B)` | `op: { fn: 'max'\|'min', operand: 'ref', source2: B }` |

Scalar literals are not currently expressible in pseudolanguage; if a preset needs `+5` it should be split into a step. This keeps the pseudolanguage declarative (no expression eval).

### `outcomes`

A list of `Name when clauses [default]`. `default` is a trailing keyword; marks the outcome as the catch-all. Clauses use the same grammar as reroll/pipeline clauses. For dice-pool conditions (`any`/`all`/`none`):

```yaml
- 1+ hits when any rolled >= 5
- No hits when none rolled >= 5   # default
```

For scalar conditions:

```yaml
- Hit when total >= 15
- Miss when 7 <= total <= 9
```

### `parameters`

A list of `Label: [v1, v2, ...] over target [on Name]`. `target` ∈ `pool.count` | `pool.sides` | `outcome.value` | `pipeline.literal`. `on Name` is required when there is more than one term/outcome/step with the same role (disambiguates by name or tag).

Examples:

```yaml
parameters:
  - DC: [5, 10, 15, 20] over outcome.value on Hit
  - Dice count: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] over pool.count
  - Trait die: [4, 6, 8, 10, 12] over pool.sides on trait
```

## Implementation

### `src/utils/yaml.ts`

A small hand-rolled YAML parser/serializer. Supports only what we need:

- Scalars: numbers, booleans, strings (unquoted or double-quoted)
- Lists: `- ...` block style
- Mappings: `key: value` block style
- Comments: `# ...` to end of line
- Multiline strings: not needed

Public surface:

```ts
export function serializePreset(config: PresetConfig): string;
export function parsePreset(text: string): PresetConfig;   // single or bundle, throws on error
export function parsePresetFile(text: string): PresetConfig[];  // always returns array
```

Internal helpers (not exported): `tokenize`, `parseMapping`, `parseList`, `parseScalar`, `serializeMapping`, `serializeList`.

### `src/state/persistence.ts` (additions)

- `exportPresetToYaml(): string` — wraps `serializePreset` of the current state.
- `importPresetFromYaml(text: string): PresetConfig` — calls `parsePreset`, resolves references, throws on error. The resolver is the only place where `name → id` lookups happen.
- `triggerDownload(filename: string, text: string, mime: string)` — small DOM helper.

### `src/app.tsx` (changes)

Replace the `Save` button block with:

```tsx
<button onClick={handleSave}>Save</button>
<button onClick={() => fileInputRef.current?.click()}>Load</button>
<input ref={fileInputRef} type="file" accept=".yaml,.yml" class="hidden" onChange={handleLoad} />
{loadError.value && <span class="text-red-600 text-xs">{loadError.value}</span>}
```

`handleLoad`:

1. Read file as text.
2. Parse.
3. If a built-in `PRESETS` entry has the same `name`, replace that entry's fields in place (keep `id`).
4. Otherwise add to a new in-memory `userPresets` signal; surface via `PresetSelector`.
5. Apply the preset to all signals (same as `applyPreset` in `PresetSelector.tsx`).
6. Clear sim results, reset `currentStep` to 0, etc.

### `src/state/app-state.ts` (additions)

- `export const userPresets = signal<PresetConfig[]>([]);`
- `export const allPresets = computed<PresetConfig[]>(() => [...PRESETS, ...userPresets.value]);`
- Modify `resetToPreset` to also accept an in-memory preset (it already does — it looks up by id, so we just need to add the user preset with a unique id before applying).

### `src/components/PresetSelector.tsx` (change)

Read from `allPresets` instead of `PRESETS`. Add a small visual marker for user presets (e.g. a `·` dot) — keep it minimal.

## Error handling

- **Parse error** → `loadError.value = "YAML parse error: <line>:<col> <message>"`. No throw.
- **Resolution error** (e.g. outcome references unknown step) → `loadError.value = "Preset error: <message>"`. No throw.
- **I/O error** (file read fails) → `loadError.value = "Could not read file"`. No throw.
- Clear `loadError.value = null` on every new attempt and on `handleSave`.

## Tests

`tests/yaml.test.ts` covers:

1. Round-trip every built-in preset: serialize → parse → assert deep-equal (after ID normalization).
2. Each grammar construct in isolation: pool, reroll, pipeline (all `expr` forms), outcome (scalar and dice-pool), parameter (each `target`).
3. Error cases: unknown step reference, ambiguous `pool.count` without `on`, malformed die notation, mixed top-level `name` + `presets:`.
4. Bundle parse: `presets: [ ... ]` returns array of two.
5. Snake_case / kebab-case freedom: `pool.count` vs `pool.count` (we use dotted form throughout).
