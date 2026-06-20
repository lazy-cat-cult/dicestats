## MODIFIED Requirements

### Requirement: Header
The application SHALL have a full-width header with solid `bg-billiard` background and the following elements:

- A square logo lockup on the left: a 12×12 unit (`w-12 h-12`) square with a gold 2px border on `bg-billiard-deep` background and a `shadow-[0_2px_0_0_var(--color-gold)]`, containing a white d5 (pentagon) outline with five pips arranged in a 1-2-2 layout. The fifth (bottom-right) pip is filled gold.
- Next to the logo, the wordmark "DICESTATS" in `font-display text-[30px] text-paper` with letter-spacing `0.06em` and `leading-none`.
- Below the wordmark, a `font-mono text-[9px] uppercase tracking-[0.28em] text-gold mt-1.5` eyebrow line "Dice Probability · v1".

The header background MUST be solid `billiard`. There is no bottom border; a `border-b border-rule` separator appears on the preset rail pinned below it, not on the header. The header SHALL NOT contain any Save, Load, Clear, or other configuration buttons; configuration actions are exposed by the Preset Rail (see Preset Rail and Save and Load YAML Presets requirements).

#### Scenario: Header renders on every page state
- GIVEN any application state (idle, running, results, error)
- WHEN the page renders
- THEN the header is present and unchanged
- AND the wordmark and logo are visible
- AND no configuration buttons (Save, Load, Clear) are present in the header

#### Scenario: No load error surfaced in header
- GIVEN the user has selected a malformed YAML file via Load
- WHEN the file fails to parse
- THEN a short error message appears in the Preset Rail on the same line as the Save/Load buttons in `text-gold-soft`
- AND the header does not show any error text

### Requirement: Preset Rail
A horizontal pill rail pinned directly under the header SHALL show a compact selection of presets. The rail is a single horizontal row with three regions:

- **Eyebrow** (left): the "Presets" label in `font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute`, `shrink-0`.
- **Scrollable pills** (center, `flex-1 overflow-x-auto`): pills rendered in this exact order — every user-loaded preset first (in their `userPresets` signal order), followed by the built-in presets whose `id` appears in `FEATURED_PRESET_IDS` (exported from `src/domain/presets.ts`), in the order declared by that list. Each pill is rendered as a `Pill` component in the default variant. A user-loaded preset (from a YAML file) is marked with a small `text-billiard` middot (`·`) appended to its name. The middot is `aria-hidden`. After the last pill, an "All Presets ▾" trigger rendered as a `Pill` with the `accent` variant (gold border + gold tint) opens the Preset Library Modal (see Preset Library Modal requirement).
- **Actions** (right, `shrink-0`): when present, a `text-gold-soft` `font-mono text-[11px]` message slot for `loadError` (hidden when there is no error; suppressed below the `sm` breakpoint), followed by the YAML "Save" and "Load" buttons (see Save and Load YAML Presets requirement). The actions region is always visible and does not scroll.

The whole rail has a `border-b border-rule` hairline separator on its bottom edge.

#### Scenario: Apply preset from rail
- GIVEN the user clicks a preset pill in the pills region
- WHEN the click registers
- THEN the dice pool, reroll conditions, pipeline, outcomes, parameters, and current results are replaced with the preset's configuration
- AND the current results are cleared
- AND any in-flight simulation is cancelled

#### Scenario: User presets appear first in the rail
- GIVEN the user has loaded two user presets and there are four featured built-in presets
- WHEN the rail renders
- THEN the two user pills render in `userPresets` order
- AND the four featured built-in pills render in `FEATURED_PRESET_IDS` order
- AND no non-featured built-in presets are visible in the rail

#### Scenario: Non-featured built-in is hidden from the rail
- GIVEN a built-in preset whose `id` is not in `FEATURED_PRESET_IDS`
- WHEN the rail renders
- THEN that preset is not present in the pills region
- AND it is reachable only through the Preset Library Modal

#### Scenario: User preset indicator
- GIVEN a preset that was loaded from a YAML file (i.e. not a built-in)
- WHEN the preset rail renders
- THEN the pill shows the preset name followed by a `·` in `text-billiard`

#### Scenario: Open Preset Library Modal
- GIVEN the rail is rendered
- WHEN the user clicks the "All Presets" trigger
- THEN the Preset Library Modal opens
- AND the rail remains in place underneath

### Requirement: Preset Library Modal
A modal dialog (rendered in a Preact portal at `document.body`) opened from the Preset Rail's "All Presets" trigger SHALL list every preset (user-loaded + built-in) and allow the user to apply any one of them. The modal contains:

- A header with the title "All Presets" in `font-display text-ink` and a close (×) button aligned to the right.
- A search text input labelled "Search presets" (`font-mono tabular`, `aria-label="Search presets"`) below the header. The list filters live as the user types: the filter is a case-insensitive substring match of the trimmed query against the preset `name`. An empty query shows the full list. Built-in and user presets are both searchable.
- A scrollable list of rows, one row per preset, in the order: user presets first (in `userPresets` order), then built-in presets in `PRESETS` order. Each row shows the preset name, a small `·` in `text-billiard` for user presets, and a short description of what the preset rolls (derived from the pool notation). Clicking a row applies the preset (same behavior as clicking a rail pill) and closes the modal.
- A "No presets match" empty state when the filter eliminates every row.
- The modal has `role="dialog"`, `aria-label="All Presets"`, traps Tab focus between its first and last focusable elements, closes on Escape, and restores focus to the "All Presets" trigger on close.
- On viewports narrower than 480px the modal docks to the bottom of the viewport (full width, `top: auto`); otherwise it is centred with a `transform: translate(-50%, -50%)`.
- A gold accent shadow (`shadow-[6px_6px_0_0_var(--color-gold)]`) and a backdrop with `bg-paper-deep/40 backdrop-blur-[2px]` distinguishes the modal from the page; clicking the backdrop closes the modal without applying a preset.

#### Scenario: Open modal from rail
- GIVEN the rail is rendered
- WHEN the user clicks "All Presets"
- THEN the Preset Library Modal opens
- AND the full list of presets is shown

#### Scenario: Filter presets by name
- GIVEN the Preset Library Modal is open
- WHEN the user types "shadow" into the search input
- THEN only presets whose name contains "shadow" (case-insensitive) remain visible
- AND presets whose name does not contain "shadow" are hidden

#### Scenario: Apply preset from modal
- GIVEN the Preset Library Modal is open with a filter applied
- WHEN the user clicks a visible preset row
- THEN the preset is applied (same as clicking a rail pill)
- AND the modal closes
- AND focus is restored to the "All Presets" trigger in the rail

#### Scenario: Close modal with Escape
- GIVEN the Preset Library Modal is open
- WHEN the user presses Escape
- THEN the modal closes
- AND no preset is applied

#### Scenario: Empty search state
- GIVEN the Preset Library Modal is open
- WHEN the user types a query that matches no preset
- THEN the list region shows "No presets match"
- AND the modal does not close

### Requirement: Save and Load YAML Presets
The application SHALL provide "Save" and "Load" controls in the Preset Rail footer. Save SHALL serialize the current configuration to a YAML file in the browser and trigger a download. Load SHALL open a file picker accepting `.yaml`/`.yml` files, parse them with the hand-rolled YAML parser, and apply the configuration to the editor. Loading a preset whose `name` matches a built-in preset updates the built-in; otherwise the preset is added to the user preset list. The new user preset is inserted at the start of `userPresets` so it appears first in the rail and at the top of the Preset Library Modal.

The configuration SHALL also auto-save to `localStorage` under key `dice-calc-config` on every change (debounced to every 2s while the tab is visible, and immediately on `visibilitychange: hidden` and `pagehide`). The localStorage payload includes a `version` field (currently `3`) for forward migration.

#### Scenario: Save current config
- GIVEN the user has configured dice pool, outcomes, and a parameter
- WHEN they click "Save" in the Preset Rail
- THEN a `.yaml` file is downloaded with a filename derived from the first parameter's label (or `Dice Roll` if no parameters)
- AND the YAML serializes the full configuration (pool, reroll, pipeline, outcomes, parameters)

#### Scenario: Load existing YAML
- GIVEN a previously saved `.yaml` file
- WHEN the user clicks "Load" in the Preset Rail and selects the file
- THEN the editor state is replaced with the parsed configuration
- AND the result canvas is cleared
- AND the loaded preset is added to the start of `userPresets` (or merges into a matching built-in)
- AND the rail re-renders with the new user preset appearing first

#### Scenario: Load error surfaced in rail
- GIVEN the user has selected a malformed YAML file via Load
- WHEN the file fails to parse
- THEN a short error message appears in the rail next to the Save/Load buttons in `text-gold-soft`
- AND the message is hidden once the user performs the next action that clears `loadError`

#### Scenario: Auto-save on tab hide
- GIVEN the user has unsaved changes
- WHEN the browser tab is hidden or closed
- THEN the current configuration is written to `localStorage` immediately
