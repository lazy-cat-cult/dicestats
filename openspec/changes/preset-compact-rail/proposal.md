## Why

The preset rail currently shows every available preset (built-in and user-loaded) as a horizontally scrollable list of pills, and the YAML Save/Load buttons live in the page header. As the built-in preset list grows and users accumulate imported YAML presets, the rail becomes a long scroller and the header buttons compete with the wordmark and logo for attention. The change is to surface only a curated set of "featured" presets in the rail, push the full library behind a searchable modal opened from the rail, and move Save/Load to the rail footer so the header stays focused on identity and the rail becomes the single entry point for preset management.

## What Changes

- The Preset Rail renders only a fixed list of "featured" built-in presets plus any user-loaded presets, in that order (user presets first, then featured built-ins).
- A "All Presets" button in the rail opens a modal that lists **every** preset (built-in + user) with a text input that filters the list by name (case-insensitive substring match). Picking a preset from the modal applies it and closes the modal.
- The YAML "Save" and "Load" buttons are removed from the header and re-rendered at the bottom of the Preset Rail, styled the same way. The header's `loadError` message slot is replaced by a slot in the rail.
- Applying a preset from the modal follows the same apply-rail behavior (replace config, clear results, cancel in-flight simulation).
- The set of "featured" built-in preset ids is declared in `src/domain/presets.ts` as `FEATURED_PRESET_IDS`; built-in presets that are not in this list are reachable only via the modal.
- The header no longer contains the Save/Load buttons; the only interactive elements left in the header are the logo lockup. The hidden file input used by Load is co-located with the rail's Load button.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `ui`: The `Header` requirement and the `Preset Rail` requirement change — the header loses its Save/Load buttons, the rail is reshaped into a featured + user block with a "All Presets" modal trigger, Save/Load move into the rail footer, and a new `Preset Library Modal` requirement is added describing the modal's search/apply behavior.
- `presets`: A new requirement `Featured Preset Subset` declares that a named list of built-in preset ids is exposed as the featured set surfaced in the rail.

## Impact

- `src/components/PresetSelector.tsx`: restructured to render featured + user pills, an "All Presets" button, and a footer with Save/Load + load-error slot. Hosts the `PresetLibraryModal` and the file input.
- `src/components/PresetLibraryModal.tsx` (new): Preact component rendered in a `document.body` portal; lists every preset, has a search field, applies the selected preset.
- `src/app.tsx`: drops the Save/Load handlers and the file-input ref from the header; the `handleSave` / `handleLoadFile` callbacks and the `loadError` signal are passed into `PresetSelector` instead. The header markup loses the right-side button group and the load-error slot.
- `src/domain/presets.ts`: exports `FEATURED_PRESET_IDS: string[]` in addition to `PRESETS`.
- No changes to domain types, simulation, persistence, or the worker. No new dependencies.
