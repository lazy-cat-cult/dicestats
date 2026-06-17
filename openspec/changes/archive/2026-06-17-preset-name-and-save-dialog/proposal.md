## Why

A configuration is "named" only implicitly today: `currentPresetName` is set when a preset is applied and otherwise derived from the first parameter's label. The user cannot label an in-progress configuration, see the active name above the settings rail, or pick a save destination other than the browser's default downloads folder.

The change adds three authoring affordances to the preset rail:

1. An **editable name input** whose value flows into YAML save and the `SimJob.taskName` label.
2. A **persistent name display** rendered above the first configuration section, hidden when the name is empty.
3. A **native "Save As" dialog** via the File System Access API (Chromium) with a graceful `<a download>` fallback.

## What Changes

- Add an **editable name input** in the Preset Rail (left of the Save/Load buttons). The input is a `TextField` styled with `font-mono tabular` and bound bidirectionally to `currentPresetName` via a small setter. Typing updates the signal immediately; pressing Enter blurs the field; an empty string is treated as `null`. The input's placeholder is `"Preset name"`. A small "✕" clear button is shown inside the input when the name is non-empty.
- Add a **name display** rendered in `src/app.tsx` directly above the `DicePoolEditor` Section (above `Step 01`). It is a single `font-display text-[2rem] leading-none text-ink tracking-wider` heading, rendered only when `currentPresetName.value` is a non-empty string. It is wrapped in a `Section`-like header that uses the same eyebrow/heading structure as the other sections but has no description and no editor below. When the name is `null` or `""`, the slot is not rendered (no whitespace).
- Add a **save dialog** in `src/state/persistence.ts` and the `handleSave` flow in `src/components/PresetSelector.tsx`:
  - When `typeof window !== 'undefined'` and `'showSaveFilePicker' in window` is true, call `window.showSaveFilePicker({ suggestedName, types: [{ description: 'YAML preset', accept: { 'text/yaml': ['.yaml'] } }] })`, write the YAML text to the returned `FileSystemFileHandle` via `createWritable()`, and close the handle.
  - On `AbortError` (user cancelled the dialog), silently return — no error message, no download.
  - On any other error from the picker, fall back to the existing `downloadYamlFile` flow.
  - When the API is unavailable, use the existing `downloadYamlFile` flow unchanged.
  - The `suggestedName` is derived from `filenameForName(currentPresetName.value)` (already exported from `src/utils/yaml.ts`).
- The `currentPresetName` setter is exposed as `setCurrentPresetName(name: string | null)` and is called from the editable input's `onInput` and from the `applyPresetConfig` function. `resetToDefaults` already sets it to `null`.
- The `handleSave` flow in `PresetSelector` is updated to read `currentPresetName.value` (instead of `parameters.value[0]?.label`) and to call the new save-dialog helper. If `currentPresetName.value` is `null` or empty, the suggested name is `dice-roll.yaml`.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `presets`: The `Current Preset Name Tracking` requirement is extended so that `currentPresetName` is user-editable (not only set by preset application). A new scenario covers typing a name; another covers clearing the name. A new requirement `Editable Preset Name Input` describes the rail input.
- `ui`: A new requirement `Current Preset Name Display` is added, covering the heading rendered above the first configuration section. The existing `Header` requirement is unchanged; the `Preset Rail` requirement is extended with the editable name input.
- `persistence`: The `Save and Load YAML Presets` requirement is extended. The `Save current config` scenario is replaced/extended with two scenarios: one covering the File System Access API path, one covering the fallback. A new scenario covers the user cancelling the picker (no error). The inline-error slot requirement is unchanged.

## Impact

- Affected code:
  - `src/state/app-state.ts`: export a `setCurrentPresetName` setter; add an effect that trims/coerces empty strings to `null` (optional polish).
  - `src/state/persistence.ts`: add a new `saveCurrentAsYaml(name: string): Promise<void>` function that wraps the File System Access API path with the existing `downloadYamlFile` fallback; export it. The existing `exportCurrentAsYaml` and `downloadYamlFile` are kept (the fallback path uses them).
  - `src/components/PresetSelector.tsx`: add the editable name `TextField` (left of Save/Load), wire it to `currentPresetName`/`setCurrentPresetName`; update `handleSave` to `await saveCurrentAsYaml(currentPresetName.value ?? '')`. The text input is a small inline control, not a modal.
  - `src/app.tsx`: import `currentPresetName`; render a `CurrentPresetNameHeading` component above the `DicePoolEditor` Section. The heading renders nothing when the name is null/empty.
  - `src/components/ui.tsx`: (no new primitive needed — the heading reuses the existing `Section` style with a custom eyebrow).
  - `src/types/index.ts`: (no type changes).
  - `src/utils/yaml.ts`: (no changes — `filenameForName` and `exportCurrentAsYaml` are reused).
  - `src/worker/sim.worker.ts`: (no changes — `taskName` propagation from the `preset-name-display` change is already in place; the editable name flows through the same `SimJob.taskName` field).
- Affected specs:
  - `openspec/specs/presets/spec.md` — add `Editable Preset Name` requirement with scenarios; extend `Current Preset Name Tracking` with editable-input scenarios.
  - `openspec/specs/ui/spec.md` — add `Current Preset Name Display` requirement; extend `Preset Rail` with the editable name input.
  - `openspec/specs/persistence/spec.md` — extend `Save and Load YAML Presets` with the File System Access API path and the cancellation scenario.
- No new runtime dependencies. The File System Access API is a built-in browser API; the types it relies on are added as a small ambient declaration in `src/vite-env.d.ts` (TypeScript's standard `lib.dom.d.ts` already includes `showSaveFilePicker` since TS 5.0).
- No breaking changes. The `currentPresetName` signal gains a public setter; the existing `currentPresetName` reader continues to work. The save flow degrades gracefully on browsers without the File System Access API.
- `max` and `min` semantics in `src/domain/resolve.ts` and the ScalarFunction union in `src/types/index.ts` are unchanged.
- Worker isolation: `saveCurrentAsYaml` lives in `src/state/persistence.ts` and uses only browser globals (`window.showSaveFilePicker`, `document.createElement`). The worker is not affected.
