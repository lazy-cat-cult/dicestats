## 1. Presets domain

- [x] 1.1 Export `FEATURED_PRESET_IDS: readonly string[]` from `src/domain/presets.ts` with the initial ids `dnd-d20`, `pbta-2d6`, `blades-in-the-dark`, `daggerheart-duality` (implements presets `Featured Preset Subset`).

## 2. State

- [x] 2.1 Change `mergeOrStagePreset` in `src/state/app-state.ts` so a newly staged user preset is **prepended** to `userPresets.value` (matches the rail ordering requirement) (implements ui `Save and Load YAML Presets`).
- [x] 2.2 Export `loadError` from `src/app.tsx` (already a module-level signal) so `PresetSelector` can read it; verify it is not re-imported into a circular graph (implements ui `Preset Rail` and `Header`).

## 3. Preset Library Modal component

- [x] 3.1 Create `src/components/PresetLibraryModal.tsx` exporting a `PresetLibraryModal` Preact component that renders via `createPortal` to `document.body`; props: `open: boolean`, `onClose: () => void`, `onApply: (presetId: string) => void`. The component owns a local `query: string` signal and derives a filtered list from `allPresets` (implements ui `Preset Library Modal`).
- [x] 3.2 In `PresetLibraryModal`, render the header (title + close), a labelled search input, a scrollable list of rows, and a "No presets match" empty state. Each row is a button with the preset name, a `·` for user presets, and the pool notation as a subtitle (implements ui `Preset Library Modal`).
- [x] 3.3 In `PresetLibraryModal`, handle Escape to close, click-on-backdrop to close, and Tab focus trapping between the first and last focusable element. Restore focus to the trigger element on close (implements ui `Preset Library Modal`).

## 4. PresetSelector component

- [x] 4.1 In `src/components/PresetSelector.tsx`, add the `loadError` and `handleSave`/`handleLoadFile` props (or import the signal and helpers from `app.tsx` / `state/persistence.ts`). The component becomes the owner of the file input ref (implements ui `Preset Rail` and `Save and Load YAML Presets`).
- [x] 4.2 Replace the rail markup with two stacked regions inside one bordered container: a pills region that renders `userPresets` then `PRESETS.filter(p => FEATURED_PRESET_IDS.includes(p.id))`, followed by an "All Presets" trigger button, and a footer region with Save/Load + `loadError` slot separated by a `bg-rule-soft` hairline (implements ui `Preset Rail`).
- [x] 4.3 In `PresetSelector`, mount `PresetLibraryModal` and wire the "All Presets" trigger to open it and the modal's `onApply` callback to the same `applyPreset(id)` flow used by the rail pills (implements ui `Preset Library Modal`).

## 5. App component

- [x] 5.1 In `src/app.tsx`, remove the Save/Load buttons, the `loadError` slot, and the hidden file input from the header markup (implements ui `Header`).
- [x] 5.2 In `src/app.tsx`, remove the unused `handleSave`, `handleLoadFile`, `fileInputRef`, and the related `Button`/`Pill`/file-input imports no longer used in the header (implements ui `Header`).
- [x] 5.3 In `src/app.tsx`, do not delete the `loadError` signal — leave it exported so `PresetSelector` can read it (implements ui `Preset Rail`).

## 6. Verification

- [x] 6.1 Run `npm run typecheck`; resolve any new type errors.
- [x] 6.2 Run `npm run lint`; resolve any new lint errors (no rule suppression).
- [x] 6.3 Run `npm run test`; ensure all existing tests pass.
- [x] 6.4 Run `npm run build`; ensure the production build succeeds.
- [x] 6.5 Manual smoke check: header has no Save/Load; rail shows featured presets + user presets in order; "All Presets" opens the modal; search filters the modal list; clicking a row applies the preset and closes the modal; Save/Load in the rail footer work and surface `loadError` in the rail.
