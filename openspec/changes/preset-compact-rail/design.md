## Context

The current PresetSelector renders every preset (built-in + user-imported) as a single horizontal row of `Pill` components, with `overflow-x-auto` for narrow viewports. Save/Load live in the page header next to the wordmark.

This change splits the surface into:

1. A compact rail that shows only user-loaded presets followed by a curated set of "featured" built-in presets.
2. A modal opened from the rail that lists every preset with a name search field.
3. A footer strip on the rail that hosts Save/Load and the load-error message.

The header is reduced to the logo lockup and wordmark.

## Goals / Non-Goals

**Goals:**
- Reduce visual noise in the rail by hiding the long tail of built-in presets behind a single click.
- Let users with many imported YAML presets see the ones they just loaded without horizontal scrolling.
- Co-locate Save/Load with the preset surface so the header stays focused on identity.
- Provide a fast name-filter for finding a preset among ~10+ options.

**Non-Goals:**
- Changing how presets are stored, parsed, or applied.
- Reordering or renaming existing built-in presets.
- Adding a server-side preset library, categories, or tags.
- Changing the visual treatment of the pills themselves.

## Decisions

### Decision: Featured set as a named list, not a numeric slice
`FEATURED_PRESET_IDS: string[]` is exported from `src/domain/presets.ts`. The rail renders `userPresets` first, then `PRESETS.filter(p => FEATURED_PRESET_IDS.includes(p.id))`. This keeps the selection order explicit and reviewable in code review; a numeric "first N" would entrench a non-obvious ordering.

#### Alternatives considered
- Numeric slice (`PRESETS.slice(0, 4)`) — implicit order, fragile to insertions.
- "Most recently used" — requires a new state slice and persistence field.

### Decision: User presets always render first in the rail
`userPresets.value` is rendered before the featured built-ins, preserving the most recently loaded presets at the visual start of the rail. This matches the user's expectation that "newly loaded presets show first".

### Decision: Search filter is a substring match against `name` (case-insensitive)
The modal's input trims whitespace and lowercases both query and name; presets whose name contains the query are kept. Empty query keeps the full list. This is the simplest filter that satisfies "filter by name on input".

#### Alternatives considered
- Fuzzy match (e.g., fuse.js) — adds a dependency for ~10 items.
- Token-based multi-field search — overkill for name-only filtering.

### Decision: Modal rendered in a `document.body` portal
Same pattern as `SweepPopover`: render via `createPortal` into a portal at `document.body`. This avoids z-index/overflow surprises from the rail's `overflow-x-auto` and matches the existing dialog convention.

### Decision: Save/Load moved to the rail footer, header kept
The header is reduced to the logo lockup and the "ODDSBOARD" wordmark/eyebrow. The hidden `<input type="file">` used by Load is co-located with the rail's Load button (the `useRef` and the `onChange` handler live in `PresetSelector`). `loadError` is rendered next to the rail's Save/Load buttons in the same `text-gold-soft` slot pattern.

### Decision: `handleSave` / `handleLoadFile` live in `PresetSelector`
To avoid prop-drilling through `App`, the file-input ref, the Save click handler, and the Load file handler are now owned by `PresetSelector`. `loadError` is exported from `app.tsx` and imported by `PresetSelector`. `mergeOrStagePreset` and `applyPresetConfig` are also called from `PresetSelector`'s load handler.

## Data flow

```
PresetSelector
  ├─ userPresets (signal)              ──► render first
  ├─ PRESETS ∩ FEATURED_PRESET_IDS     ──► render after
  ├─ "All Presets" button              ──► opens PresetLibraryModal (portal)
  │     └─ search input (local state)  ──► filters list
  │     └─ pill click                  ──► applyPreset + close modal
  └─ footer: [ Save ] [ Load ]         ──► file input ref + loadError
                                          (replaces header slot)
```

`App.tsx` keeps `simResults`, `simError`, `cancelSimulation`, `runSimulation`, and the worker lifecycle. Save/Load and the file input move out of `App.tsx` into `PresetSelector`.

## Risks / Trade-offs

- **More empty rail on first load** — when the user has no imported presets and 4 featured built-ins, the rail shows 4 pills. Acceptable; the "All Presets" button is always visible and the footer Save/Load is always visible.
- **Featured set drift** — adding a new built-in preset means deciding whether it is featured. The `FEATURED_PRESET_IDS` list is the explicit answer; new presets start as non-featured.
- **`loadError` placement** — moving it to the rail footer trades the header's right-side visibility for vertical stacking. The footer uses the same `font-mono text-[11px] text-gold-soft` styling and the same `hidden sm:inline` breakpoint, so the look is preserved.

## Migration Plan

No data migration. The only user-visible state change is the order of pills in the rail and the new modal. The header is reduced in interactive content but keeps the wordmark, eyebrow, and logo lockup.

## Open Questions

- Should the rail's "All Presets" button show a badge with the count of hidden presets? (Deferred — spec keeps it as plain text; can be added later.)
- Should the modal's search input autofocus when the modal opens? (Deferred to a separate UX change; current spec says it is a regular form input that can be tabbed to.)
