## Context

Three authoring affordances for the Preset Rail are missing today:

1. There is no way to name a configuration that is not a built-in preset. `handleSave` in `src/components/PresetSelector.tsx:31-37` derives the name from `parameters.value[0]?.label` and falls back to `'Dice Roll'`. The user cannot override this.
2. The `currentPresetName` signal (added by the pending `preset-name-display` change in `src/state/app-state.ts:92`) is shown only in the `OddsTape` component (results panel). It is not surfaced above the configuration column where the user is editing the settings.
3. `Save` uses `downloadYamlFile` (`src/state/persistence.ts:153-164`), which triggers `<a download>` and writes the file to the browser's default downloads directory. There is no opportunity to pick a directory or rename the file beyond what the browser's "Save As" (only on `<a download>` is no such dialog) heuristic offers. On Chromium the File System Access API provides a real OS-native "Save As" dialog via `window.showSaveFilePicker`.

The change is scoped to the Preset Rail (`src/components/PresetSelector.tsx`), the persistence layer (`src/state/persistence.ts`), the configuration column heading in `src/app.tsx`, and the `currentPresetName` signal in `src/state/app-state.ts`. Domain types, simulation, the worker, and built-in presets in `src/domain/presets.ts` are unchanged.

## Goals / Non-Goals

**Goals:**
- Make the current configuration's name a first-class editable input in the Preset Rail.
- Surface the active name as a large heading above the first configuration section.
- Open a real OS-native "Save As" dialog on browsers that support the File System Access API, with a graceful fallback to the existing `<a download>` flow.
- Keep cancellation silent (no `loadError`, no `alert()`, no `console.error`).
- Keep the change small and well-isolated: no domain type changes, no new dependencies, no worker changes.

**Non-Goals:**
- No multi-file save (saving a bundle of presets). The YAML format already supports bundles via the `presets:` list, but the Save dialog writes a single preset.
- No "Save As Copy" or duplicate-preset flow.
- No permissions UI for the File System Access API (the picker grants per-handle permission implicitly).
- No persistence of `currentPresetName` to `localStorage` (it remains derived; same as the `preset-name-display` change).
- No change to the `OddsTape` name display (it is already wired by `preset-name-display`).
- No change to the built-in `PRESETS` array.

## Decisions

### D1. Reuse the existing `TextField` primitive for the editable name input

The `TextField` component in `src/components/ui.tsx` already implements the `font-mono tabular` form-control style required by the UI spec and supports the focus shadow. Reusing it keeps the rail visually consistent and avoids a new UI primitive. The `✕` clear button is rendered as a sibling element absolutely positioned inside the `TextField`'s wrapper.

**Alternatives considered:**
- New `PresetNameField` component. Rejected: too narrow; a single instance does not warrant a dedicated component.
- Unstyled `<input>` with manual Tailwind classes. Rejected: the existing primitive is already wired up and matches the design system.

### D2. Expose `setCurrentPresetName` as a thin setter on the signal module

Rather than wrap the signal in a Preact action or a custom hook, expose a plain function `setCurrentPresetName(name: string | null)` from `src/state/app-state.ts`. The function:
- Sets `currentPresetName.value = name === '' ? null : name` (coerces empty strings to `null`).
- Does not trim leading/trailing whitespace, since the user may want spaces in a name. Trimming happens at the YAML save time (`exportCurrentAsYaml` already falls back to `'Untitled'` when the name is empty).

**Alternatives considered:**
- A `batch` or `action` wrapping multiple signal updates. Rejected: only one signal is touched.
- A Preact `useSignal`-like hook. Rejected: state is module-level, not component-local.

### D3. Place the name display as the first child of the configuration column, not inside a `Section`

The name display is a heading row, not a `Section` (no editor, no description). Wrapping it in `Section` would force dummy props. Instead, render a small inline component `CurrentPresetNameHeading` that returns `null` when the name is empty, otherwise renders the eyebrow + heading markup with the same gold/30 hairline divider used by `Section`. The component is colocated with `App` in `src/app.tsx` to avoid a new file for a 10-line component.

**Alternatives considered:**
- New `Section` variant prop `isHeadingOnly`. Rejected: adds a non-orthogonal prop to a shared primitive.
- Render inside the `DicePoolEditor`'s first child. Rejected: couples the heading to a specific section.

### D4. Use the File System Access API with feature detection, not polyfill

`window.showSaveFilePicker` is a built-in browser API on Chromium. We feature-detect via `typeof window !== 'undefined' && 'showSaveFilePicker' in window`. On any other browser the code falls back to the existing `downloadYamlFile` path unchanged. No polyfill is added (no `browser-fs-access` or similar dependency).

**Alternatives considered:**
- `browser-fs-access` polyfill. Rejected: project rules forbid new runtime dependencies without strong justification, and the fallback is sufficient.
- Always use the anchor-download path. Rejected: the user explicitly asked for a directory + filename picker.

### D5. Cancellation is silent; non-AbortError falls back

In the `try { await window.showSaveFilePicker(...) } catch (err) { ... }` block:
- If `err.name === 'AbortError'`, return without doing anything.
- Otherwise (any other error, e.g. `SecurityError`, `InvalidStateError`), silently fall back to `downloadYamlFile`.

The `loadError` signal is NOT touched. The `console.error` rule (`no-console` in ESLint) means we must not log either; a silent fallback is the right call.

**Alternatives considered:**
- Show an inline error on non-AbortError failures. Rejected: the spec says cancellation is silent, and a failed native picker is rare; falling back to the proven download path is the best UX.

### D6. Suggested filename uses `filenameForName` from `src/utils/yaml.ts`

`filenameForName(name)` already slugifies a name and appends `.yaml`, falling back to `'dice-pool'`. We reuse it both for the `showSaveFilePicker` `suggestedName` and for the fallback `downloadYamlFile` `filename`. This keeps the filename rule in one place.

**Alternatives considered:**
- Inline slugification. Rejected: duplicates logic.

## Data Flow

### Editable name → currentPresetName → YAML save + name display

```
┌──────────────────────────────────────────────────────────────────────┐
│   PresetSelector (rail footer)                                       │
│   src/components/PresetSelector.tsx                                  │
│                                                                      │
│   <TextField                                                         │
│     value={currentPresetName.value ?? ''}                            │
│     placeholder="Preset name"                                        │
│     onInput={(e) => setCurrentPresetName(e.currentTarget.value)}     │
│   />                                                                 │
│   {currentPresetName.value && (                                      │
│     <button onClick={() => setCurrentPresetName(null)}>✕</button>     │
│   )}                                                                 │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │ setCurrentPresetName(...)
                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│   src/state/app-state.ts                                             │
│   export const currentPresetName = signal<string | null>(null);     │
│   export function setCurrentPresetName(name: string | null) {        │
│     currentPresetName.value = name === '' ? null : name;             │
│   }                                                                  │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────────┐
              ▼                        ▼                          ▼
   ┌────────────────────┐   ┌──────────────────────┐   ┌────────────────────┐
   │ CurrentPresetName  │   │ runSimulation()      │   │ saveCurrentAsYaml  │
   │ Heading (in app.tsx)│   │ src/app.tsx         │   │ src/state/         │
   │ renders when name  │   │ passes taskName to   │   │ persistence.ts     │
   │ is non-empty       │   │ SimJob               │   │ uses name for      │
   │                    │   │                      │   │ YAML header +      │
   │                    │   │                      │   │ filename           │
   └────────────────────┘   └──────────────────────┘   └────────────────────┘
```

### Save dialog flow

```
handleSave() in PresetSelector
  │
  ▼
saveCurrentAsYaml(currentPresetName.value ?? '')
  │
  ├── 'showSaveFilePicker' in window ?
  │     │
  │     ├── yes ─► showSaveFilePicker({ suggestedName, types: [...] })
  │     │            │
  │     │            ├── resolve ok → handle.createWritable() → write() → close()
  │     │            │
  │     │            └── throw AbortError → silent return
  │     │            │
  │     │            └── throw other    → fall through to fallback
  │     │
  │     └── no  ─► fallback path
  │
  └── fallback: downloadYamlFile(filename, text)
```

## Risks / Trade-offs

- **File System Access API is Chromium-only** → Mitigation: graceful fallback to the existing `<a download>` path on Firefox/Safari. The behavior change is "user can pick a directory" on Chromium, "user gets the default download path" elsewhere.
- **Silent cancellation may confuse users** → Mitigation: the native dialog gives immediate feedback when the user clicks Cancel (the dialog simply closes). There is no need for a toast. Spec explicitly requires silent cancellation.
- **Editable name diverging from the applied preset** → Mitigation: applying a preset overwrites the input (this is the existing `applyPresetConfig` behavior extended to the input). Spec covers this with the "Applying a preset overwrites the input" scenario.
- **Worker isolation** → Mitigation: `saveCurrentAsYaml` lives in `src/state/persistence.ts` and uses only browser globals (`window`, `document`). It is not imported by the worker. No domain module is touched.
- **Persistence of `currentPresetName`** → out of scope; the signal is in-memory and resets on page reload (matching the `preset-name-display` change's policy).

## Migration Plan

No migration is needed:
- No data model changes. `PresetConfig.name` already exists.
- No `SavedConfig` version bump.
- No backward-compatibility shim — the new behavior is purely additive.
- Rollback is a single `git revert` of the implementation commit; the spec delta in `openspec/changes/preset-name-and-save-dialog/` would be archived without being applied.

## Open Questions

- **Should the name display truncate with ellipsis on narrow viewports?** Current plan: no truncation. If long preset names overflow the column on mobile, the heading can wrap. If a future change requests truncation, the heading can get a `truncate` class.
- **Should the editable input be disabled while a simulation is running?** Current plan: no. The signal write is cheap and the simulation worker is decoupled. If this causes UX issues (e.g. the input loses focus mid-keystroke), a follow-up can add a `disabled={isSimulating.value}` binding.
- **Should "Reset" / "Clear" appear as a separate action in the rail?** Current plan: no. The `✕` clear button is the only clear affordance. The "reset to defaults" flow is unchanged.
