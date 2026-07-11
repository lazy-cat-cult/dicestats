## ADDED Requirements

### Requirement: Restored from Cache Indicator
When simulation results are restored from the cache (not freshly computed), the result aside SHALL display a "Restored from cache" indicator. This indicator SHALL be a `font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute` line placed directly above the OddsTape or the result section.

#### Scenario: Cache indicator shown on restore
- **GIVEN** results are restored from the cache
- **WHEN** the result canvas renders
- **THEN** a "Restored from cache" text is visible above the result content
- **AND** the text uses `text-ink-mute` for subdued appearance

#### Scenario: Cache indicator hidden on fresh run
- **GIVEN** a fresh simulation has just completed
- **WHEN** the result canvas renders
- **THEN** no "Restored from cache" indicator is shown

### Requirement: Recalculate Button
When results are displayed from cache, the primary run button SHALL change its label to "Recalculate" instead of "Roll the Dice Again". The sub-label SHALL remain unchanged. Clicking "Recalculate" SHALL clear the cache entry for the current fingerprint and run a fresh simulation.

#### Scenario: Recalculate label when cached
- **GIVEN** cached results are displayed for the current configuration
- **WHEN** the sticky run strip renders
- **THEN** the primary button label is "Recalculate"
- **AND** the sub-label shows the sweep count (e.g., `1M × 1`)

#### Scenario: Roll the Dice Again label when fresh
- **GIVEN** results are from a fresh simulation (not cached)
- **WHEN** the sticky run strip renders
- **THEN** the primary button label is "Roll the Dice Again"

#### Scenario: Roll the Dice label when no results
- **GIVEN** no simulation has been run for the current configuration
- **WHEN** the sticky run strip renders
- **THEN** the primary button label is "Roll the Dice"

### Requirement: Clear Cache Button
A "Clear cache" ghost button SHALL be available in the result aside header, to the right of "Details & Statistics", when cached results are displayed. The button SHALL use `variant="ghost" size="sm"` and `ariaLabel="Clear all cached simulation results"`.

#### Scenario: Clear cache button visible when cached
- **GIVEN** results are restored from cache
- **WHEN** the result aside renders
- **THEN** a "Clear cache" ghost button is visible in the result section header actions area

#### Scenario: Clear cache button hidden when fresh results
- **GIVEN** results are from a fresh simulation
- **WHEN** the result aside renders
- **THEN** no "Clear cache" button is shown

#### Scenario: Clear cache action
- **GIVEN** the user clicks "Clear cache"
- **WHEN** the action triggers
- **THEN** all cached results are removed from localStorage
- **AND** the "Restored from cache" indicator disappears
- **AND** the primary button label changes from "Recalculate" to "Roll the Dice Again"
- **AND** the "Clear cache" button disappears
- **AND** the currently displayed results remain visible

## MODIFIED Requirements

### Requirement: Sticky Run Button
The primary "Roll the Dice" button SHALL be pinned to the bottom of the viewport at all viewport sizes via `sticky bottom-0` on its container, with a `bg-paper/95 backdrop-blur` background and a `border-t-2 border-gold` top edge so it remains visible while the configuration rail scrolls. The button label cycles through four states:

- "Roll the Dice" plus a `1M × 1` sub-label when no results are present.
- "Recalculate" plus a `1M × <sweepCount>` sub-label when results are displayed from cache.
- "Roll the Dice Again" plus a `1M × <sweepCount>` sub-label when results are displayed from a fresh simulation.
- "Running…" (no sub-label) when `isSimulating` is true.

When a simulation is running, a ghost "Cancel" button is shown to the right of the primary button. When validation produces blocking errors, the errors are listed in `font-mono text-[11px] text-billiard-deep` directly below the button row.

#### Scenario: Cancel running simulation
- GIVEN a simulation is in progress
- WHEN the user clicks "Cancel"
- THEN the worker is terminated, `isSimulating` becomes false, and the result canvas returns to its prior state

#### Scenario: Recalculate label shown for cached results
- GIVEN results are displayed from cache
- WHEN the sticky run strip renders
- THEN the primary button label is "Recalculate"
- AND clicking it removes the cache entry and runs a fresh simulation
