# UI Specification

## Purpose

The UI is a single-page web application for configuring and running dice probability simulations. It MUST work on 360px-wide viewports (mobile-first), keep the main thread responsive by running the simulation in a Web Worker, and present results in a format readable at a glance.

The application uses a "billiard scoreboard" visual identity: a light paper background with billiard-green and gold accents, monospaced numerics for all probability and dice data, and a high-contrast top-probability display modelled on a craps table / sportsbook odds board.
## Requirements
### Requirement: Color Tokens
The application SHALL use a fixed color token system defined as Tailwind v4 `@theme` values in `src/style.css`. The tokens are:

- `paper` `#FAF8F2` — page background
- `paper-soft` `#F0EBDA` — card surface
- `paper-deep` `#E6DFC8` — deepest card surface
- `ink` `#16241C` — primary text (deep forest, not pure black)
- `ink-soft` `#5A6B5E` — secondary text
- `ink-mute` `#8A978D` — tertiary / placeholder text
- `rule` `#D6CFB6` — hairline borders and dividers
- `rule-soft` `#E8E2CC` — softer dividers
- `billiard` `#2F7A4D` — primary action accent (roll button, primary highlight, top-probability number)
- `billiard-deep` `#1F5836` — pressed/active state for billiard
- `billiard-soft` `#C6DCCD` — soft tint for error/empty states
- `gold` `#C9A646` — decorative accent (step indices, section dividers, eyebrow labels, decorative ornaments)
- `gold-deep` `#9C7F30` — gold text on light backgrounds
- `gold-soft` `#E8D99A` — soft gold for warm hover states

Chart.js datasets SHALL pick from the palette in this order: `billiard`, `gold`, `ink`, then five supplementary tones (`#A86A3D`, `#3F6FA0`, `#7A4A8B`, `#B86A4D`, `#3D7A6F`).

#### Scenario: Color token availability
- GIVEN any component in the application
- WHEN it needs a color
- THEN it MUST use one of the above tokens via Tailwind class names (`bg-billiard`, `text-gold-deep`, etc.)
- AND hardcoded hex literals are limited to the Chart.js constants in `src/components/DistributionChart.tsx`

### Requirement: Typography
The application SHALL use three font families:

- Display: **Bebas Neue** (tall, narrow, all-caps) — applied via Tailwind class `font-display`, used for the page logo wordmark, step headings, the top-probability headline number, and modal/empty-state display text.
- Body: **Space Grotesk** — applied via Tailwind class `font-body`, used for prose, descriptions, and the empty-state panel.
- Mono: **JetBrains Mono** — applied via Tailwind class `font-mono`, used for all numeric and code content (probabilities, counts, dice notation, source names, form labels, table headers, and all `<input>` / `<select>` values).

All `<input>` and `<select>` elements SHALL use the JetBrains Mono stack with `font-variant-numeric: tabular-nums` (Tailwind class `tabular`) so numeric columns align. There SHALL be no font-mixing between fields — the same `font-mono tabular` class is used for every form control in the configuration rail. The `TextField` and `Select` components in `src/components/ui.tsx` MUST NOT expose a font-toggle prop; the mono face is the only one used.

#### Scenario: Consistent form font
- GIVEN the configuration rail
- WHEN any input or select renders
- THEN it SHALL use the JetBrains Mono stack with tabular numerals
- AND it SHALL NOT use the body font

### Requirement: Layout Structure
The application SHALL use a two-column layout on viewports `lg` and wider (1024px+), and a single-column layout below. The page SHALL be capped at `max-width: 1400px` and centered with horizontal padding.

On `lg` and wider:
- The left column contains the configuration sections (Dice Pool, Reroll, Pipeline, Outcomes, Sweep Parameters) in vertical order.
- The right column is a sticky aside containing the result canvas (OddsTape + tables + charts). The aside sticks to the top of the viewport with `top: 1.5rem`.

On viewports below `lg`:
- A single column shows the configuration sections in order, followed by the result canvas below.
- The primary run button is sticky to the bottom of the viewport at all viewport sizes.

#### Scenario: Mobile single-column
- GIVEN a viewport 360px wide
- WHEN the application renders
- THEN a single column is shown
- AND no horizontal scroll occurs

#### Scenario: Desktop two-column with sticky result aside
- GIVEN a viewport 1280px wide
- WHEN the application renders
- THEN the configuration rail is on the left and the result aside is on the right
- AND scrolling the page keeps the result aside visible

### Requirement: Header
The application SHALL have a full-width header with solid `bg-billiard` background and the following elements:

- A square logo lockup on the left: a 12×12 unit (`w-12 h-12`) square with a gold 2px border on `bg-billiard-deep` background and a `shadow-[0_2px_0_0_var(--color-gold)]`, containing a white d5 (pentagon) outline with five pips arranged in a 1-2-2 layout. The fifth (bottom-right) pip is filled gold.
- Next to the logo, the wordmark "DICESTATS" in `font-display text-[30px] text-paper` with letter-spacing `0.06em` and `leading-none`.
- Below the wordmark, a `font-mono text-[9px] uppercase tracking-[0.28em] text-gold mt-1.5` eyebrow line "Dice Probability · v1".
- On the right, two ghost buttons with `border-gold/50 text-paper hover:border-gold hover:text-gold`: "Save" and "Load" (each loading/saving the YAML preset format). "Load" opens a hidden `<input type="file">` accepting `.yaml`/`.yml`.
- To the left of the Save/Load buttons, an inline `font-mono text-[11px] text-gold-soft` message slot showing a `loadError` (file read / parse / preset errors) when present; the slot is hidden when there is no error and is suppressed below the `sm` breakpoint.

The header background MUST be solid `billiard`. There is no bottom border; a `border-b border-rule` separator appears on the preset rail pinned below it, not on the header.

#### Scenario: Header renders on every page state
- GIVEN any application state (idle, running, results, error)
- WHEN the page renders
- THEN the header is present and unchanged
- AND the wordmark, logo, and Save/Load buttons are all visible

#### Scenario: Load error surfaced in header
- GIVEN the user has selected a malformed YAML file via Load
- WHEN the file fails to parse
- THEN a short error message appears to the left of the Save/Load buttons in `text-gold-soft`
- AND the message is hidden once the user performs the next action that clears `loadError`

### Requirement: Preset Rail
A horizontal pill rail pinned directly under the header SHALL show all available presets (built-in and user-imported). Each preset is rendered as a `Pill` component in the default variant (no active highlight is used). The rail:

- SHALL have a "Presets" eyebrow label in `font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute` on the left.
- SHALL be horizontally scrollable on narrow viewports (`overflow-x-auto` with negative horizontal margins so pills can scroll under the eyebrow).
- A user-loaded preset (from a YAML file) is marked with a small `text-billiard` middot (`·`) appended to its name. The middot is `aria-hidden`.
- The rail has a `border-b border-rule` hairline separator on its bottom edge.
- SHALL expose an **editable preset name input** to the left of the Save/Load buttons, bound to `currentPresetName`. The input is described in detail in `openspec/specs/presets/spec.md` (requirement: `Editable Preset Name`). The "All Presets ▾" trigger SHALL sit between the pill list and the editable name input.

#### Scenario: Apply preset
- GIVEN the user clicks a preset pill
- WHEN the click registers
- THEN the dice pool, reroll conditions, pipeline, outcomes, parameters, and current results are replaced with the preset's configuration
- AND the current results are cleared
- AND any in-flight simulation is cancelled
- AND `currentPresetName.value` is set to the applied preset's `name` (the editable name input updates to match)

#### Scenario: User preset indicator
- GIVEN a preset that was loaded from a YAML file (i.e. not a built-in)
- WHEN the preset rail renders
- THEN the pill shows the preset name followed by a `·` in `text-billiard`

#### Scenario: Editable name input is visible in the rail
- GIVEN the application is rendered
- WHEN the Preset Rail is shown
- THEN the editable name input is visible to the left of the Save/Load buttons
- AND the input shows `currentPresetName.value` (or is empty when `currentPresetName.value` is `null`)
- AND the input has `placeholder="Preset name"` and `aria-label="Preset name"`

#### Scenario: Editable name input updates the simulation label
- GIVEN the user typed `"My Custom Roll"` into the editable name input
- WHEN the user runs a simulation
- THEN the `SimJob` posted to the worker includes `taskName: "My Custom Roll"`
- AND the result's `label` is `"My Custom Roll"`

### Requirement: Section Layout
Each of the five configuration sections (Dice Pool, Reroll Conditions, Resolution Pipeline, Outcomes, Sweep Parameters) SHALL be rendered by the `Section` component from `src/components/ui.tsx` with:

- A 1px hairline divider in `bg-gold/30` above the section (hidden for the first section via `first:hidden`).
- An eyebrow line in `font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep` showing the step number alone, e.g. "Step 01" (the section name is shown in the h2 below, not concatenated into the eyebrow).
- A `font-display` heading in `text-[2rem] leading-none text-ink tracking-wider` showing the section name only (e.g. "Dice Pool"). The step number is NOT rendered inside the heading.
- A description sentence in `text-[13px] text-ink-soft mt-2 leading-relaxed` directly under the heading, occupying the full width of the column (no `max-width` cap).
- The editor card(s) below the heading, spanning the full column width.
- An optional `actions` slot aligned to the right of the section header row (used, for example, by each section's "Comments" checkbox).

#### Scenario: Section spacing
- GIVEN any configuration section
- WHEN it renders
- THEN the eyebrow, heading, description, and editor card are vertically stacked with consistent spacing
- AND the description fills the full column width

#### Scenario: Section actions slot
      - GIVEN a section that passes an `actions` node (e.g. the "Comments" checkbox present on every section)
- WHEN the section header renders
- THEN the action is right-aligned in the header row and the section title remains on the left

### Requirement: Comments Toggle Per Section
Each of the four configuration sections (Dice Pool, Reroll Conditions, Resolution Pipeline, Outcomes) SHALL expose its own independent "Comments" checkbox in the section header's `actions` slot. Show/hide state is persisted per-section in `UiPrefs` via `localStorage`. All comment fields default to hidden.

#### Scenario: Dice Pool comments hidden by default
- GIVEN a fresh application load
- WHEN the Dice Pool section renders
- THEN no comment fields are visible on dice term rows
- AND the section header shows an unchecked "Comments" checkbox

#### Scenario: Toggle Dice Pool comments
- GIVEN the user checks the "Comments" checkbox in the Dice Pool section
- WHEN the dice term rows re-render
- THEN each term row shows a comment `TextField` after the tag input
- AND the checkbox state is persisted across page reloads

### Requirement: DicePoolEditor
The DicePoolEditor SHALL display a list of dice term rows, each showing a count input, a "d" label, a sides select, an optional tag input, an optional comment field (gated by the per-section "Comments" checkbox), a sweep indicator when swept, and a remove button. Standard die sizes (4, 6, 8, 10, 12, 20, 100) SHALL appear in a select with a "custom" option (the option's user-visible label is `…`) for numeric input. An "Add die" button SHALL append a new term (default: 1d6, tag ""). One term SHALL always remain (delete button hidden when only one exists). Each row's left border is colored according to its tag (when present), using the `getTagColor(tag)` palette (see Tag Color Palette requirement).

A live dice notation preview SHALL be shown above the rows in `font-mono tabular text-[13px] text-ink` inside a `code` element with `px-2 py-1 border border-rule bg-paper-deep/40`. The notation format is:

- Each term is rendered as `[count]d[sides]`.
- If the term has a sweep on count or sides, the swept value is rendered as a range (e.g. `1..5`) using the same notation as YAML values.
- If the term has a tag, it is rendered as ` <tag>` with angle brackets (no bullet/dot prefix).
- Multiple terms are joined with `, ` (comma + space).

Example output: `2d8 <red>, 1d6 <blue>`.

#### Scenario: Notation format
- GIVEN the pool is `2d8` tagged "red" and `1d6` tagged "blue"
- WHEN the notation preview renders
- THEN it reads `2d8 <red>, 1d6 <blue>`

#### Scenario: Cannot delete last term
- GIVEN a dice pool with one term
- WHEN the user views the editor
- THEN the delete button is hidden (not just disabled)

### Requirement: RerollEditor
The RerollEditor SHALL display a list of reroll rows, each rendered as a card on `bg-paper-deep/30` with:

- A `Select` for the action ("reroll" / "explode"), default "reroll".
- A `ConditionChainEditor` for the conditions, now in vertical layout. Each clause line is prefixed with `| when` (first clause) or `|` (subsequent clauses). The connector Select appears on subsequent clauses. The operator Select includes `is_min`, `is_max`, `is_even`, `is_odd`. For is_* operators the value input is hidden; for other operators an `ExprInput` replaces the numeric input.
- A "repeat" number input (1..99) with a label that changes to "Max cascade depth" when the action is "explode".
- A "tag as" `TextField` (max 30 chars, placeholder "inherit") for overriding the tag on rerolled/exploded dice.
- An optional comment field (`font-mono`, 100 chars max), gated by the per-section "Comments" checkbox.
- Move up / move down / delete icon buttons aligned to the right.

Up to 10 reroll rows are allowed. Empty state is a dashed-border card: "No reroll conditions. Add a condition to replace or explode dice that meet a face or tag rule."

#### Scenario: Explode action label
- GIVEN the user selects "explode" as the action
- WHEN the row renders
- THEN the "repeat" label changes to "Max cascade depth"

#### Scenario: Maximum conditions
- GIVEN 10 reroll rows already defined
- WHEN the user views the editor
- THEN the "Add condition" button is hidden

### Requirement: PipelineEditor
The PipelineEditor SHALL display a list of named-value rows, each rendered as a card on `bg-paper-deep/30`. Each row contains:

- A name field rendered by `BracketedNameInput`. When the row's output type is `vector` (a list of dice), the name field is visually wrapped in non-editable grey square brackets: the value `total` is displayed as `[ total ]`. The brackets are `aria-hidden` spans with `user-select: none` so backspace at the bracket positions cannot delete them. When the output type is `scalar`, no brackets are shown.
- A "=" label.
- A source `Select` showing all prior named values plus the implicit `rolled` source. Vector sources are labelled `[ name ]` in the dropdown; scalar sources are labelled `name` plain.
- A function `Select` whose options depend on the source's type: vector source offers `filter`, `remove`, `count`, `sum`, `max`, `min`, `sub`; scalar source offers `add`, `subtract`, `multiply`, `divide`, `ceil`, `floor`.
- For `filter` / `remove`, a nested `ConditionChainEditor` in vertical layout.
- For binary math (`add`/`subtract`/`multiply`/`divide`), a multi-term editor: each term has an operand toggle (`literal` vs `named`) and either an `ExprInput` (literal) or a scalar-name `Select` (named). Terms are applied sequentially (first to source, subsequent to accumulated result). A "+ term" button adds terms; remove icon on each term when count > 1.
- An optional comment field (toggled by the per-section "Comments" checkbox).
- Validation errors (invalid name pattern, duplicate name, invalid source) are listed in `text-billiard font-mono text-[11px]` at the bottom of the row.
- Up to 20 named values are allowed.

Empty state is a dashed-border card: "No pipeline steps. Outcomes will reference rolled values directly."

#### Scenario: Vector name is bracketed
- GIVEN a pipeline row whose output is a vector
- WHEN the name field renders
- THEN the value is shown inside grey `[` `]` brackets
- AND the brackets are inert (not part of the editable value)

#### Scenario: Scalar name is not bracketed
- GIVEN a pipeline row whose output is a scalar
- WHEN the name field renders
- THEN no brackets are shown around the value

#### Scenario: Dropdown shows bracketed vector sources
- GIVEN the user opens the source select of a row
- WHEN the options render
- THEN vector sources are labelled `[ name ]`
- AND scalar sources are labelled `name`

#### Scenario: Invalid reference highlight
- GIVEN a pipeline row referencing a deleted named value
- WHEN validation runs
- THEN the row gets a billiard border on `bg-paper-deep/30`
- AND an error message is listed at the bottom of the row

### Requirement: OutcomeEditor
The OutcomeEditor SHALL display a list of outcome rows. Each row contains:

- A name `TextField` (max 40 chars).
- A delete button when more than one outcome exists.
- A list of conditions; each condition has a source `Select` (vector sources labelled `[ name ]`, scalar labelled `name`) and either a scalar condition (operator + value) or a dice condition (type `any`/`all`/`none` + sub-operator + value).
- An AND/OR connector select when more than one condition exists.
- A "+ condition" button (max 5 conditions per outcome).
- An optional comment field (toggled by the per-section "Comments" checkbox).

Up to 10 outcomes are allowed. Empty state is a dashed-border card: "No outcomes. Add an outcome to define a probability bucket."

#### Scenario: OutcomeEditor without default controls
- GIVEN the OutcomeEditor is rendered
- WHEN the user views an outcome row
- THEN no "Default" checkbox is present
- AND no "default" pill is shown

### Requirement: SweepEditor
The SweepEditor SHALL display the sweep configuration as a simple form (Step 5 of the wizard), not a parameter card list. The form contains:

- An "X values" field accepting comma-separated numbers or `start..end` range notation (e.g. `1..5`).
- A "Y values" field accepting the same notation (disabled when X is empty; enables dual-axis sweep).

A `SweepCostChip` below the form shows the total simulation count and emits a warning at >50M rolls, requiring explicit user confirmation via a "Confirm run" button before the simulation starts. There is no warning at the 10M threshold.

Empty state is a dashed-border card: "No sweep values. Enter X and optionally Y to run the same setup across a range."

#### Scenario: Range values
- GIVEN the user enters `1..5` in the X values field
- WHEN the field commits
- THEN the sweep X is set to values `[1, 2, 3, 4, 5]`

### Requirement: OddsTape
The result canvas SHALL include a signature "OddsTape" component rendered as the primary result display for single simulations. The OddsTape is a `bg-paper` panel with a 2px gold drop shadow and a 1px billiard top edge. It contains:

- A "Top Probability" eyebrow in `font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep`, prefixed by a short gold rule.
- A large `font-display` headline showing the top outcome's probability as a percentage with two decimals, in `text-billiard` at `text-[4.5rem]` (mobile) or `text-[5.5rem]` (sm+).
- The top outcome's label in `font-mono text-[12px] text-ink` under the headline.
- A row of stats on the right (`Outcomes`, `Rolls`, optionally `Progress`).
- A sorted ranking of all outcomes with: a `N°NN` index in `text-gold-deep` (or `text-ink-mute` for non-head), the outcome label, a hairline fill bar in `bg-billiard` (head) or `bg-ink/35` (others), the probability on the right, and the count below it. Bars animate in on first render via a `transform: scaleX` keyframe.

#### Scenario: OddsTape renders top outcome
- GIVEN a single-simulation result with at least one outcome
- WHEN the OddsTape renders
- THEN the highest-probability outcome is displayed as the headline
- AND all outcomes are listed below in descending probability order
- AND each row's bar length is proportional to the outcome's probability relative to the top

### Requirement: Result Detail
Below the OddsTape, the result canvas SHALL include:

- A `Section` with `eyebrow="Detail"` and `title="Roll Count"` for a single-result run, or `title="Probability Table"` for a sweep run. The body is `ResultView`, which renders either:
  - A three-column table (Outcome, Probability, Count) with the outcome label in `font-mono text-[12px] uppercase tracking-[0.06em] text-ink`, the probability in `font-mono tabular text-[13px] text-ink text-right` formatted to two decimal places, and the count in `font-mono tabular text-[12px] text-ink-mute text-right`.
  - For a sweep run, a horizontally scrollable table whose rows are the parameter values (`r.label` of the form `Head=Value`) and whose columns are the outcome labels; each cell shows the probability percentage for that outcome at that parameter value. A muted `Sweep <head> ∈ {values…}` caption appears above the table when sweep headers are detected.
- Above the table, a `font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute` line reading `Simulation · <N> rolls` where `<N>` is `result.totalRolls.toLocaleString()`.
- A chart section with its own eyebrow (`"Distribution"` for a single run, `"Probability by Sweep"` for a sweep run) in `font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep`, followed by the chart.
- A `primary` "Roll the Dice Again" button (matches the OddsTape's `bg-billiard` accent) is provided in the sticky run strip in the configuration column, not in the result aside.

#### Scenario: Parameter sweep chart
- GIVEN a parameter sweep result with multiple `SimResult` entries
- WHEN the result canvas renders
- THEN a line chart is shown with one line per outcome (legend at the bottom)
- AND the x-axis shows the parameter values
- AND the y-axis shows probabilities as percentages (0–100% scale, formatted with no decimals)

#### Scenario: Single-run chart
- GIVEN a single-result run
- WHEN the result canvas renders
- THEN a bar chart shows each outcome's probability with one colour per bar from the Chart.js palette
- AND the legend is hidden
- AND the y-axis is capped at 1.0 (100%)

### Requirement: Empty Result State
When no simulation has been run yet, the result canvas SHALL show a dashed-border panel with a gold accent, containing:

- A "Result Canvas" eyebrow in `font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep`, prefixed by a short gold rule.
- A `font-display text-[2.25rem] text-ink` headline reading "No roll yet."
- A body sentence explaining the workflow: define at least one die set and one outcome, press "Roll the Dice", and the simulation runs 1,000,000 rolls in a background worker.

#### Scenario: First-load state
- **GIVEN** the page has just loaded with no prior results
- **WHEN** the result canvas renders
- **THEN** it shows the empty state with "No roll yet." and the workflow description
- **AND** the OddsTape and any chart are not shown

### Requirement: Save and Load YAML Presets
The application SHALL provide "Save" and "Load" buttons. Save SHALL serialize the current configuration to a YAML file. When the browser supports the File System Access API (Chromium-based), Save SHALL open the OS-native "Save As" dialog via `window.showSaveFilePicker` so the user can pick both a directory and a filename; otherwise Save SHALL fall back to the `Blob` + `<a download>` path. The suggested filename SHALL be `filenameForName(currentPresetName.value ?? 'dice-roll')`. Load SHALL open a file picker accepting `.yaml`/`.yml` files, parse them with the hand-rolled YAML parser, and apply the configuration to the editor. Loading a preset whose `name` matches a built-in preset updates the built-in; otherwise the preset is added to the user preset list. Loading a YAML file SHALL also set `currentPresetName.value` to the loaded preset's `name`.

The configuration SHALL also auto-save to `localStorage` under key `dice-calc-config` on every change (debounced to every 2s while the tab is visible, and immediately on `visibilitychange: hidden` and `pagehide`). The localStorage payload includes a `version` field (currently `9`) for forward migration.

#### Scenario: Save uses native dialog when API is available
- **WHEN** `window.showSaveFilePicker` is available
- **AND** the user clicks "Save"
- **THEN** the OS-native "Save As" dialog is opened
- **AND** the suggested filename is `<filename>.yaml` derived from `currentPresetName.value` (or `dice-roll.yaml` when the name is empty)
- **AND** the file filter shows `YAML preset` accepting `.yaml`
- **AND** on confirmation, the YAML text is written to the chosen path

#### Scenario: Save falls back when API is unavailable
- **WHEN** `window.showSaveFilePicker` is not available (e.g. Firefox, Safari)
- **AND** the user clicks "Save"
- **THEN** the `Blob` + anchor download path is used
- **AND** a `.yaml` file is downloaded with the same `<filename>.yaml` derived from `currentPresetName.value`
- **AND** the YAML serializes the full configuration (pool, reroll, pipeline, outcomes, parameters)

#### Scenario: Save cancellation is silent
- **WHEN** the native "Save As" dialog is open
- **AND** the user clicks Cancel or closes the dialog
- **THEN** no error is shown
- **AND** the `loadError` signal is not set
- **AND** no `console.error` is emitted
- **AND** the application returns to its previous state

#### Scenario: Save uses default name when name is empty
- **WHEN** `currentPresetName.value` is `null` or empty
- **AND** the user clicks "Save"
- **THEN** the suggested filename is `dice-roll.yaml`
- **AND** the YAML header line reads `name: Dice Roll`

#### Scenario: Load existing YAML
- **WHEN** a previously saved `.yaml` file is loaded
- **THEN** the editor state is replaced with the parsed configuration
- **AND** the result canvas is cleared
- **AND** `currentPresetName.value` is set to the loaded preset's `name`

#### Scenario: Auto-save on tab hide
- **WHEN** the user has unsaved changes
- **AND** the browser tab is hidden or closed
- **THEN** the current configuration is written to `localStorage` immediately
- **AND** the YAML "Save" path is NOT triggered (localStorage is the auto-save target, not the YAML file)

### Requirement: Form Controls Accessibility
Every form control SHALL have either a visible `<label>` (for labelled fields) or an `aria-label` (for icon-only buttons and bare inputs). All inputs use `font-mono tabular` so numeric values are readable and aligned.

#### Scenario: Icon button aria-label
- GIVEN a row's delete icon button
- WHEN it renders
- THEN it has an `aria-label` describing the action (e.g. "Remove this die", "Delete outcome")

### Requirement: Live Region
A single `sr-only` element with `role="status" aria-live="polite"` SHALL announce the simulation lifecycle: "Simulation running.", "Simulation complete.", or "Simulation error: …".

#### Scenario: Lifecycle announcement
- GIVEN the app is in any state
- WHEN the simulation lifecycle changes
- THEN the live region's text updates to "Simulation running.", "Simulation complete.", or "Simulation error: <message>" to match the current state

### Requirement: Keyboard Support
All interactive elements (buttons, selects, inputs) SHALL be reachable and operable via keyboard. Pressing Enter in any form field SHALL focus the next logical control, and the simulation run SHALL be triggerable via keyboard.

#### Scenario: Tab order is linear through the rail
- GIVEN the configuration rail is in view
- WHEN the user presses Tab repeatedly
- THEN focus moves through all interactive controls in reading order
- AND no control is unreachable via keyboard

### Requirement: Tag Color Palette
Dice-pool tags and any other tag-derived swatch (left border on a dice term row, outline on a condition chain's tag value select, sweep indicator text) SHALL be coloured from a fixed 8-colour palette defined in `src/state/app-state.ts` as `TAG_COLORS`:

- `red` `#EF4444`
- `blue` `#3B82F6`
- `green` `#22C55E`
- `amber` `#F59E0B`
- `violet` `#8B5CF6`
- `pink` `#EC4899`
- `teal` `#14B8A6`
- `orange` `#F97316`

A tag's colour is its index in the list of distinct non-empty pool tags in first-appearance order, modulo the palette length. An unknown / empty tag falls back to neutral grey `#6B7280`. The palette is consulted only for visual styling; the underlying tag string is the source of truth.

#### Scenario: Tag colour stability
- GIVEN two distinct tags "red" and "blue" are used in the pool (in that order)
- WHEN each tag is rendered with its swatch
- THEN "red" maps to `#EF4444` and "blue" maps to `#3B82F6`
- AND the mapping is stable across re-renders

### Requirement: Sweep Editor
The SweepEditor SHALL replace the old ParameterEditor, SweepPopover, and SweepIndicator components. Swept cells show their expression text (e.g. `X + 2`) inside an `ExprInput`, which serves as the visible sweep affordance. There SHALL be no per-cell "↻ Sweep" button, no `SweepPopover` modal, and no parameter card list.

The "Sweep Parameters" step SHALL render, in order:
- A description sentence explaining X and Y variables.
- An "X values" `TextField` with placeholder `1, 2, 3, 4, 5`.
- A "Y values" `TextField` with placeholder `10, 15, 20` (disabled when X is empty).
- A live cost readout showing the total simulation count.
- A `SweepCostChip` below the readout.

Expression cells (`ExprInput`) in the DicePool (count, sides), Pipeline (binary math literal value), and Outcomes (scalar condition value) SHALL accept expressions referencing `X` and `Y` as variables. The cell's text (e.g. `X + 2`, `Y * 2`) is the sweep indicator — there is no separate pill or badge on the cell.

#### Scenario: Sweep via ExprInput
- GIVEN a dice term with count = `X`
- AND sweep X ∈ {1, 2, 3, 4, 5}
- WHEN the simulation runs
- THEN 5 independent simulations run with count = 1, 2, 3, 4, 5 respectively
- AND the count input shows the expression text `X`

### Requirement: Sweep Cost Chip
In the Sweep Editor and on the Results Step, a `SweepCostChip` SHALL display the total computational cost of the current sweep configuration:

- When neither X nor Y values are defined, the chip reads `Single simulation · 1,000,000 rolls` in `font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute`.
- When one or both axes have values, the chip shows a `Pill` reading `<N> simulation(s) · <total rolls> rolls` (e.g. `4 simulations · 4,000,000 rolls`) preceded by a `⚠` glyph and rendered in the `accent` (gold) variant when `totalRolls > 50,000,000`. A muted `Total computational cost` label sits to the right of the pill.
- When `totalRolls > 50,000,000` AND the high-cost run has not yet been confirmed, a `primary` "Confirm run" button is shown on the right of the chip. Pressing it sets the `confirmedHighCost` flag; the next click on the primary run button will then start the simulation. The `SweepCostChip` border switches to `border-billiard` while awaiting confirmation. As soon as `confirmedHighCost` is set, the chip's "Confirm run" button is hidden (the chip is now in the "confirmed, awaiting run" state); the simulation only starts on a subsequent click of the primary run button.
- A sweep change after confirmation clears `confirmedHighCost` (the simulation count must be re-confirmed).

#### Scenario: Confirm 50M run (via primary run button)
- GIVEN the configuration totals more than 50,000,000 rolls and `confirmedHighCost` is false
- WHEN the user clicks the primary run button
- THEN the run does NOT start
- AND the chip's "Confirm run" button becomes hidden (because `confirmedHighCost` is now true)
- AND a 4-second tooltip is shown next to the primary run button
- AND only on a subsequent click of the primary run button does the simulation actually start

#### Scenario: Confirm 50M run (via chip's Confirm run button)
- GIVEN the configuration totals more than 50,000,000 rolls and `confirmedHighCost` is false
- WHEN the user clicks the chip's "Confirm run" button
- THEN `confirmedHighCost` becomes true and the chip's "Confirm run" button is hidden
- AND on the next click of the primary run button, the simulation actually starts

### Requirement: Sticky Run Button
The primary "Roll the Dice" button SHALL be pinned to the bottom of the viewport at all viewport sizes via `sticky bottom-0` on its container, with a `bg-paper/95 backdrop-blur` background and a `border-t-2 border-gold` top edge so it remains visible while the configuration rail scrolls. The button label cycles through three states:

- "Roll the Dice" plus a `1M × 1` sub-label when no results are present.
- "Roll the Dice Again" plus a `1M × <sweepCount>` sub-label when results are present.
- "Running…" (no sub-label) when `isSimulating` is true.

When a simulation is running, a ghost "Cancel" button is shown to the right of the primary button. When validation produces blocking errors, the errors are listed in `font-mono text-[11px] text-billiard-deep` directly below the button row.

#### Scenario: Cancel running simulation
- GIVEN a simulation is in progress
- WHEN the user clicks "Cancel"
- THEN the worker is terminated, `isSimulating` becomes false, and the result canvas returns to its prior state

### Requirement: Running Panel
While `isSimulating` is true and no result is yet available, the result aside SHALL show a `RunningPanel` styled as a `border-2 border-billiard bg-paper` card with `shadow-[0_3px_0_0_var(--color-billiard)]`. The panel contains:

- A "ROLLING" eyebrow in `font-display text-billiard text-[15px] tracking-[0.18em]` prefixed by a `w-2 h-2 bg-billiard rounded-full` dot.
- A right-aligned `font-mono tabular text-[11px]` progress counter `<completed> / <total>` (total shown as `…` when not yet known).
- A `font-display text-[3.5rem] text-ink tabular leading-none` percentage with a smaller `text-ink-soft` `%` suffix.
- A 1.5-unit-tall `bg-paper-soft` track with a `bg-billiard` fill whose width matches the current percentage.
- A muted "Shaking 1,000,000 outcomes in worker…" footer line.

#### Scenario: Running panel updates with progress
- GIVEN a simulation is in progress
- WHEN the worker posts a `progress` message
- THEN the percentage, the `completed / total` counter, and the fill bar all update to reflect the new values
- AND the "ROLLING" eyebrow remains visible throughout

### Requirement: Error Panel
When the worker reports an error or throws, the result aside SHALL show an `ErrorPanel` instead of (or in addition to) the OddsTape. The panel uses `border-2 border-billiard bg-billiard-soft/40` and contains:

- A "Snake Eyes — Simulation Failed" headline in `font-display text-billiard-deep text-[15px] tracking-[0.18em]`.
- The error message body in `font-mono text-[12px] text-ink`.

#### Scenario: Simulation error
- GIVEN a worker emits a `type: 'error'` message
- WHEN the result aside renders
- THEN the ErrorPanel replaces (or accompanies) the result content with the error headline and message
- AND the live region announces `Simulation error: <message>`

### Requirement: Footer
The application SHALL render a full-width footer with `border-t border-rule mt-auto`. Inside the `max-w-[1400px]` container, a single row shows two strings in `font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft`:

- Left: `Created by <a href="https://lazycatcult.com">Lazy Cat Cult</a> 2026` (the year SHALL be `2026` alone when the current year is 2026, otherwise `2026-<currentYear>`).
- Right: `Help us make this site better: <a href="https://github.com/lazy-cat-cult/dicestats/issues">lazy-cat-cult.github.io/dicestats</a>`

Both links SHALL use `class="underline hover:text-gold-deep transition-colors"` and open in a new tab with `target="_blank" rel="noopener noreferrer".

#### Scenario: Footer always visible
- GIVEN any application state
- WHEN the page renders
- THEN the footer is present at the bottom of the document with the two link-containing strings described above

### Requirement: "Not matched" Outcome Display
The implicit "Not matched" outcome SHALL NOT appear in the OutcomeEditor UI. It SHALL appear in the results table, OddsTape, and charts only when its probability is greater than zero. When its probability is zero, it SHALL be filtered out of all result displays.

#### Scenario: "Not matched" hidden when zero
- GIVEN a simulation where every roll matches at least one user-defined outcome
- WHEN the results render
- THEN "Not matched" does not appear in the table, OddsTape, or chart

#### Scenario: "Not matched" shown when non-zero
- GIVEN a simulation where some rolls match no user-defined outcome
- WHEN the results render
- THEN "Not matched" appears in the table, OddsTape, and chart with its probability

### Requirement: Stale Parameter Retarget
A parameter whose target no longer exists (the term, outcome, or pipeline literal was deleted) or whose target is no longer the right shape (the outcome's first condition is no longer scalar, the pipeline row is no longer a binary-math-literal, or the outcome has zero conditions) SHALL be marked `stale`. The row SHALL get `border-billiard` and a `Pill` with the `accent` variant reading `⚠ <reason>`. While stale, a "Retarget" ghost button SHALL appear below the values field; clicking it SHALL reveal a `Select` populated with the valid targets of the same kind (e.g. for `pool.count`, the remaining dice terms) and choosing one SHALL update the parameter's `targetTermId` / `targetOutcomeId` / `targetPipelineId` and clear the stale state.

#### Scenario: Stale after deleting target term
- GIVEN a parameter sweeps a dice term that the user then deletes
- WHEN the parameter row renders
- THEN the row is outlined in billiard and shows `⚠ Target no longer exists`
- AND clicking "Retarget" lets the user bind the parameter to a different term

### Requirement: No Outdated UI Patterns
The following behaviors from earlier specs are NO LONGER part of the UI and SHALL NOT be reintroduced:

- A four-step wizard with top navigation and "next/back" buttons. The application shows all five sections in a single scrolling column.
- A `max-width: 640px` single-column layout. The current cap is 1400px on `lg+`.
- A "Clear" button in the header. The header has only "Save" and "Load".
- Colored-dot tag indicators (`●red`) in the dice pool notation. Tags are shown as ` <name>` in angle brackets.
- A "+" / "−" joining dice terms in the notation. Multiple terms are joined with `, `.
- Type pills or labels rendered as the literal words "dice" or "value" anywhere in the UI. The vector type is marked only by brackets in the name field and brackets in source dropdowns; the scalar type is unmarked. The words "dice" and "value" are reserved for the underlying type discriminator in `src/types/index.ts` and shall not appear as user-visible labels.
- Per-row "Cannot delete" text on the dice pool. The delete button is hidden (not disabled with explanatory text) when only one term remains.
- A standalone type label rendered after the pipeline row's name (e.g. "vec" or "num" pill). The bracketed name field and bracketed dropdown sources are the only type indicators in the UI.

#### Scenario: No type labels in the UI
- **GIVEN** any rendered output of the application
- **WHEN** inspecting user-visible text
- **THEN** the literal words "dice" and "value" SHALL NOT appear as type indicators
- **AND** vector/scalar types SHALL be expressed only through brackets in the pipeline name field and in source-option dropdowns

### Requirement: Form Controls Accessibility (extended — editable name input)
The preset name control in the Preset Rail SHALL be operable via keyboard and have descriptive `aria-label`s:

- The display-state button SHALL have `aria-label="Edit preset name: <name>"` when a name is set, or `aria-label="Set preset name"` when `currentPresetName.value` is `null`.
- The edit-state `<input>` SHALL have `aria-label="Preset name"`.
- The `✓` (save) button SHALL have `aria-label="Save preset name"`.
- The `✕` (cancel) button SHALL have `aria-label="Cancel preset name edit"`.
- The `All Presets ▾` trigger SHALL have `aria-label="Open all presets library"`.

#### Scenario: Display button has descriptive aria-label
- **WHEN** `currentPresetName.value` is `"My Custom Roll"`
- **THEN** the display button has `aria-label="Edit preset name: My Custom Roll"`

#### Scenario: Display button has set-preset-name aria-label
- **WHEN** `currentPresetName.value` is `null`
- **THEN** the display button has `aria-label="Set preset name"`

#### Scenario: Save and cancel buttons have aria-labels
- **WHEN** the control is in edit state
- **THEN** `✓` has `aria-label="Save preset name"`
- **AND** `✕` has `aria-label="Cancel preset name edit"`

