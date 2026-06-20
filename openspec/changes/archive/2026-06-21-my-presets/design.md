## Context

The current preset system has two categories:
1. **Built-in presets** (`PRESETS` in `src/domain/presets.ts`) — immutable at runtime, bundled with the app.
2. **User presets** (`userPresets` signal in `src/state/app-state.ts`) — in-memory only, populated by YAML import, lost on reload.

The `preset-compact-rail` change (active) introduces a featured-preset rail and a searchable Library Modal. This change builds on that UI and replaces the in-memory user presets with a fully persistent "My Presets" library.

The `lz-string` library (v1.5.0) is already a dependency in `package.json` — no new npm packages are needed.

## Goals / Non-Goals

**Goals:**
- Persist user presets across sessions with `localStorage` + `lz-string` compression
- Allow saving any configuration to My Presets with an optional name prompt
- Full CRUD on My Presets: Create (Save, Import), Read (display, load), Update (Rename), Delete
- Favorites across both standard and my-presets, persisted separately
- Enforce a hard limit of 100 My Presets with clear feedback
- Standard presets remain read-only; copying them creates a my-preset
- Compact UI: rail shows essentials (4 my-presets + standard featured), full management via modal

**Non-Goals:**
- Server-side storage, sync, or accounts
- Preset folders, tags, or categories beyond "My Presets" vs "Standard"
- Preset versioning or undo history
- Batch import/export of the entire My Presets library
- Drag-and-drop reordering
- Multi-select operations (batch delete, batch favorite)

## Decisions

### Decision 1: lz-string compression for localStorage

**Why:** Each `MyPreset` contains a full `PresetConfig` (pool, pipeline, outcomes, etc.). A typical preset like Vampire V5 serializes to ~2KB of JSON. With 100 presets and `lz-string.compressToBase64`, total storage stays well under `localStorage`'s 5MB limit (~60KB compressed vs ~200KB raw).

**Storage format:**
```
localStorage key: dice-calc-my-presets
Value: lz-string.compressToBase64(JSON.stringify({ version: 1, presets: MyPreset[] }))
```

The `version` field enables future migration. On load: decompress → parse → migrate if needed.

**Alternatives considered:**
- *Raw JSON* — predictable but wastes quota (100 presets ≈ 200KB vs ~60KB compressed).
- *IndexedDB* — overkill for key-value preset storage; adds async complexity.
- *Separate keys per preset* — complicates enumeration, quota tracking, atomic updates.

### Decision 2: MyPreset extends PresetConfig with metadata

```typescript
interface MyPreset extends PresetConfig {
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

**Why:** `isFavorite` is intentionally NOT embedded in `MyPreset` — favorites apply to both standard and my-presets. A separate `Set<string>` (`favoriteIds`) stored under `dice-calc-favorites` avoids mutating the immutable `PRESETS` array.

**Alternatives:**
- *isFavorite in MyPreset* — limits favorites to my-presets only. Rejected.
- *Wrapper interface for both types* — adds indirection without benefit.

### Decision 3: Save-to-app flow with inline name prompt

When the user clicks **Save** and `currentPresetName` is `null`/`""`, an inline dialog appears in the rail:

```
┌──────────────────────────────────────────────┐
│ Name: [________________________] [Save] [✕]  │
└──────────────────────────────────────────────┘
```

**Why:** A modal would be disruptive — the user just clicked Save; a small inline prompt keeps context. The pattern matches the existing name edit experience.

**Behavior:**
- Input is autofocused. Placeholder: "My Preset".
- `Enter` confirms, `Escape` cancels.
- If name matches an existing my-preset → prompt: "Overwrite `<name>`?" with [Overwrite] [Save as Copy] [Cancel].
- If name matches a standard preset → prompt: "`<name>` is a standard preset. Save as copy?" with [Save as Copy] [Cancel].
- If `currentPresetName` is already set, Save writes immediately without prompt.

### Decision 4: Standard preset protection via `lastAppliedPresetId`

```typescript
const lastAppliedPresetId = signal<string | null>(null);
```

When `applyPresetConfig` is called, it sets `lastAppliedPresetId` to the applied preset's `id`. On Save, the application checks:

```typescript
function isDirectlySaveable(): boolean {
  if (!lastAppliedPresetId.value) return true;
  const standard = PRESETS.find(p => p.id === lastAppliedPresetId.value);
  if (!standard) return true; // it's a my-preset or imported
  return currentPresetName.value !== standard.name; // renamed away from standard
}
```

**Why:** Simple tracking without deep comparison of the entire config. If the user applied a standard preset and hasn't renamed it, the save triggers "Save as Copy". Renaming it first (to anything different) allows direct save.

### Decision 5: Library Modal tabs

```
[ All ]  [ My Presets (N) ]  [ Favorites (M) ]
─────────────────────────────────────────────
[ Search: ___________________________ ]
─────────────────────────────────────────────
  ☆ Preset Name           … Copy to My Presets
  ⭐ My Preset            … ⋮
```

- **All** — all presets (my-presets first, then standard).
- **My Presets (N)** — only my-presets, sorted favorites first → `updatedAt` desc.
- **Favorites (M)** — only favorited presets (both types).
- Search filters within the active tab. Empty search shows all items in the tab.
- The counts N and M update reactively.

### Decision 6: Rail re-organization into zones

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Presets │ [⭐ Adv] [My: SR] │ [D&D d20] [PbtA] [BitD] │ All ▾              │
│         │ ← My Presets →    │ ← Featured Standard →                       │
├────────────────────────────────────────────────────────────────────────────┤
│ Name │ [Edit] │ [New] [Export] [Import] [Save]                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Why:** Three zones keep the rail compact. My Presets (up to 4 pills) are at the start — they are the user's most relevant presets. Featured standard presets follow. The "All ▾" trigger is at the right edge. The footer row holds actions.

On narrow viewports, the entire pill region scrolls horizontally (existing behavior preserved); My Presets are at the start of the scroll.

### Decision 7: New action behavior

"New" calls `resetToDefaults()` — clears pool, reroll, pipeline, outcomes, sweep, name, and sim results. It does NOT touch localStorage or My Presets. No confirmation is shown (same behavior as applying a different preset).

### Decision 8: Favorites — separate storage from presets

```typescript
// src/state/my-presets.ts
const FAVORITES_KEY = 'dice-calc-favorites';

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
```

**Why:** A flat `Set<string>` of IDs is minimal, supports both preset types, and is trivially mergeable if we ever add import/export.

### Decision 9: 100 preset limit — enforce at save time

```typescript
export function saveMyPreset(config: PresetConfig): 'ok' | 'limit_reached' {
  const presets = loadMyPresets();
  const existing = presets.find(p => p.id === config.id);
  if (!existing && presets.length >= 100) return 'limit_reached';
  // upsert...
}
```

**Why:** The limit only blocks *new* presets. Overwriting an existing one is always allowed. This prevents the user from being locked out of *editing* their existing library.

## Data flow

```
User Action              →  State Change              →  Persistence
─────────────────────────────────────────────────────────────────
YAML Import              →  myPresets add              →  saveMyPresets()
Save (with name)         →  myPresets add/upsert       →  saveMyPresets()
Save (no name → prompt)  →  myPresets add/upsert       →  saveMyPresets()
Rename                   →  myPresets update name      →  saveMyPresets()
Copy                     →  myPresets add duplicate    →  saveMyPresets()
Delete                   →  myPresets remove by id     →  saveMyPresets()
Toggle Favorite          →  favoriteIds add/remove     →  saveFavorites()
Export YAML              →  (no state change)          →  file download
New                      →  resetToDefaults()          →  (no persistence)
Apply preset (pill)      →  applyPresetConfig()        →  (no persistence)
```

All mutations to `myPresets` and `favoriteIds` are wrapped in `effect()` calls that debounce writes to localStorage by 300ms. This prevents rapid sequential operations (e.g., delete + save) from racing.

## File map

```
src/
├── types/
│   └── index.ts
│       └── ADD: MyPreset interface (extends PresetConfig)
├── state/
│   ├── app-state.ts
│   │   └── MODIFY: myPresets signal (was userPresets), favoriteIds signal, lastAppliedPresetId signal
│   └── my-presets.ts                           ★ NEW
│       ├── loadMyPresets() / saveMyPresets()
│       ├── addMyPreset() / updateMyPreset() / removeMyPreset()
│       ├── copyMyPreset() / copyStandardToMyPresets()
│       ├── loadFavorites() / saveFavorites() / toggleFavorite()
│       └── isStandardPreset()
├── components/
│   ├── PresetSelector.tsx
│   │   └── MODIFY: rail zones, New/Export/Import/Save buttons, name prompt dialog
│   ├── PresetLibraryModal.tsx
│   │   └── MODIFY: tabs, star toggle, context menu, Copy to My Presets
│   ├── PresetSaveDialog.tsx                    ★ NEW
│   │   └── inline name prompt component
│   └── MyPresetsContextMenu.tsx                ★ NEW
│       └── ellipsis menu with Rename/Copy/Delete
└── persistence.ts
    └── ADD: loadMyPresets/saveMyPresets, loadFavorites/saveFavorites
```

## Storage keys summary

| Key | Format | Compression | Purpose |
|---|---|---|---|
| `dice-calc-config` | `JSON.stringify(SavedConfig)` | None | Working config auto-save (unchanged) |
| `dice-calc-my-presets` | `lz-string(JSON.stringify({version, presets}))` | lz-string | My Presets library |
| `dice-calc-favorites` | `JSON.stringify(string[])` | None | Favorite preset IDs |
| `dice-calc-ui` | `JSON.stringify(UiPrefs)` | None | UI preferences (unchanged) |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `localStorage` quota exceeded | Caught on every write; shows toast; does not crash |
| lz-string decompression failure | Caught; falls back to empty array; silent error |
| 100 preset limit feels restrictive | Limit documented in tooltip; "Export All" can be added later |
| MyPreset schema changes (new fields) | `version` field enables migration function |
| Race conditions between rapid save/delete | 300ms debounced `effect` on `myPresets` writes |
| User closes tab before debounced write fires | `visibilitychange` and `pagehide` events flush pending writes (existing pattern in `app.tsx`) |

## Migration Plan

1. No existing data migration needed — `myPresets` is a new localStorage key.
2. Existing `dice-calc-config` (working config auto-save) is unaffected — it continues to function.
3. In-memory `userPresets` from previous sessions are NOT migrated (they were always ephemeral).
4. On first load after deployment, `loadMyPresets()` returns `[]` — the rail shows "No saved presets".
5. The `dice-calc-favorites` key is new — existing users start with an empty favorites set.
