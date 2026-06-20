## Why

Currently, user presets loaded from YAML files exist only in memory and vanish on page reload — there is no way to save a configuration inside the application, no means to rename, copy, delete presets, and no favorites system. The preset rail grows linearly with built-in presets and offers no way for users to build a personal library over time. As the app gains adoption, users need a persistent in-app preset collection ("My Presets") with full CRUD, favorites, and a compact UI that keeps standard presets quickly accessible for newcomers while letting power users manage their own library.

## What Changes

- **Save → Export (rename)** — saves current config as YAML file (no behavior change).
- **Load → Import (rename)** — loads a YAML file; imported presets are now persisted to My Presets.
- **New** — clears all configuration fields (pool, reroll, pipeline, outcomes, sweep, name).
- **Save** (new) — saves current configuration to My Presets in localStorage. If `currentPresetName` is empty, prompts for a name. Standard presets cannot be saved over — forces "Save as Copy".
- **Rename** — renames a my-preset via inline edit in Library Modal or rail name field.
- **Copy** — duplicates a my-preset (suffix " (copy)") or copies a standard preset to My Presets.
- **Delete** — removes a my-preset from localStorage with confirmation. Standard presets are not deletable.
- **Favorites** — ⭐ toggle on any preset (standard or my-preset), persisted in localStorage.
- **My Presets** — persistent collection of user-owned presets stored in localStorage, compressed via lz-string (already in dependencies). Limit 100 presets with metadata (`createdAt`, `updatedAt`).
- **Preset Rail reorganization** — three zones: My Presets (up to 4 pills, favorites first), Standard (featured built-in), and action buttons (New, Export, Import, Save).
- **Library Modal tabs** — "All", "My Presets (N)", "Favorites (M)" with search scoped to active tab.
- **Context menu** on my-presets in the modal (Rename, Copy, Delete).

## Capabilities

### New Capabilities
- `my-presets`: Persistent user preset storage with lz-string compression, CRUD operations, favorites, and 100-preset limit enforcement

### Modified Capabilities
- `presets`: In-memory `userPresets` replaced by persistent `MyPreset` type; added standard preset immutability rules, Save-in-app flow, name conflict handling
- `ui`: Preset rail restructured into My Presets zone + Standard zone; Library Modal gains tabs, favorites star, and context menu; action buttons renamed (Export/Import) and added (New, Save)
- `persistence`: Added My Presets localStorage schema with compression, Favorites storage, QuotaExceededError handling; YAML Import now persists to My Presets

## Impact

- **New files**: `src/state/my-presets.ts` (storage layer), `src/components/MyPresetsContextMenu.tsx` (context menu), `src/components/PresetSaveDialog.tsx` (inline name prompt)
- **Modified files**: `src/types/index.ts` (MyPreset type), `src/state/app-state.ts` (myPresets/favoriteIds signals), `src/state/persistence.ts` (new storage functions), `src/components/PresetSelector.tsx` (rail restructure), `src/components/PresetLibraryModal.tsx` (tabs, context menu, stars), `src/app.tsx` (New action wiring), `tests/presets.test.ts` (new storage tests)
- **No changes** to domain logic, worker, charts, or YAML parser
- **Dependencies**: `lz-string` already in `package.json` v1.5.0 — no new dependencies
