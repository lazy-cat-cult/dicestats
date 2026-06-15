# UI Specification

## Purpose

The UI is a single-page web application with a step-by-step wizard for configuring dice probability calculations. It MUST work on 360px-wide viewports (mobile-first) and keep the main thread responsive by running simulation in a Web Worker.

## Requirements

### Requirement: Layout Structure
The application SHALL use a single-column, centered layout with a max-width of 640px. The four-step wizard SHALL appear at the top with content area below.

#### Scenario: Mobile viewport
- GIVEN a viewport 360px wide
- WHEN the application renders
- THEN no horizontal scroll occurs and all controls are usable

### Requirement: Step Wizard Navigation
The wizard SHALL have four steps: (1) Dice Pool, (2) Reroll & Resolve, (3) Outcomes, (4) Results. Steps 1–3 MUST be valid before the Run button is enabled. The wizard SHALL collapse to step numbers on screens narrower than 480px. Focus SHALL move to the step heading on step change.

#### Scenario: Invalid step blocks running
- GIVEN step 2 has an invalid pipeline reference
- WHEN the user views step 4
- THEN the Run button is disabled

#### Scenario: Step collapse on mobile
- GIVEN a viewport narrower than 480px
- WHEN the wizard renders
- THEN step titles are hidden and only step numbers are shown

### Requirement: DicePoolEditor
The DicePoolEditor SHALL display a list of dice term rows, each showing `[count] d[sides] [tag_input]` with a remove button. An "Add die" button SHALL append a new term (default: 1d20, tag ""). Standard die sizes (d4, d6, d8, d10, d12, d20, d100) SHALL appear in a dropdown with a "custom" option for numeric input. Tag input SHALL provide autocomplete from existing tags. Tags SHALL display with colored dots from palette `['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']`. A live dice notation preview (e.g. "2d20 ●red + 4d6 ●blue") SHALL be shown. One term SHALL always remain (delete disabled when only one exists).

#### Scenario: Tag autocomplete
- GIVEN existing tags ["normal", "hunger"]
- WHEN the user types "hu" in the tag field
- THEN "hunger" appears as an autocomplete suggestion

#### Scenario: Cannot delete last term
- GIVEN a dice pool with one term
- WHEN the user attempts to delete it
- THEN the delete button is disabled

### Requirement: RerollEditor
The RerollEditor SHALL display an expandable table of reroll rules. Each row SHALL show `[action] if [conditions] repeat [N] // comment`. Action SHALL be a dropdown with "reroll" / "explode". Conditions SHALL use a compound editor with up to 10 clauses. Field dropdown SHALL offer "face" (any ConditionOperator) or "tag" (only = or !=). The `repeat` number input (1..99) label SHALL change to "Max cascade" when action is "explode". Move up/down and delete buttons SHALL be provided. "Add condition" button (max 10 rows). Empty state: "No reroll conditions. Click '+' to add one."

#### Scenario: Explode action label
- GIVEN the user selects "explode" as the action
- WHEN the row renders
- THEN the "repeat" label changes to "Max cascade"

#### Scenario: Maximum conditions
- GIVEN 10 reroll conditions already defined
- WHEN the user views the editor
- THEN the "Add condition" button is disabled or hidden

### Requirement: PipelineEditor
The PipelineEditor SHALL display an expandable table of named values. Each row: `[name] = [function]([source], [args]) // comment`. Name SHALL be alphanumeric + underscore, unique, max 30 chars. Source dropdown SHALL offer `rolled` or any previously defined named value. Function dropdown SHALL adapt to source type: vector source offers filter, remove, count, sum, max, min; scalar source offers add, subtract, multiply, divide, ceil, floor. For filter/remove, a condition editor SHALL be shown. For binary math, a toggle between "literal" (number input) and "named value" (dropdown of prior scalars) SHALL be provided. Invalid references SHALL be highlighted in red with a tooltip. Type mismatch errors SHALL be highlighted in red. "Add named value" button (max 20 rows). Empty state: "No pipeline steps. Outcomes will reference rolled values directly."

#### Scenario: Vector source functions
- GIVEN the user selects a vector source
- WHEN the function dropdown appears
- THEN it shows filter, remove, count, sum, max, min

#### Scenario: Invalid reference tooltip
- GIVEN a pipeline row referencing a deleted named value
- WHEN validation runs
- THEN the row is highlighted in red with tooltip "References undefined value 'X'"

### Requirement: OutcomeEditor
The OutcomeEditor SHALL display an expandable table of outcomes. Each row: `[name] when [conditions]`. Name max 40 chars. Source dropdown SHALL offer `rolled` or any pipeline named value (grouped by vector vs scalar). Conditions SHALL vary by source type: vector sources offer none?/any?/all?/comparison; scalar sources offer comparison only. Connector: AND/OR toggle. A "Default outcome" checkbox (at most one) SHALL be provided. Delete button. "Add outcome" button (max 10). Empty state: "Add at least one outcome to define success/failure conditions."

#### Scenario: Default outcome checkbox
- GIVEN one outcome already marked as default
- WHEN the user checks "Default outcome" on another outcome
- THEN validation prevents the second default and highlights it as invalid

### Requirement: ParameterEditor
The ParameterEditor SHALL display a list of parameters. Each: `[label] sweep [target] over [values]`. Target dropdown: Dice count, Dice sides, Outcome threshold, Pipeline literal. Contextual selectors: dice term selector (pool.count/sides), outcome + condition selector (outcome.value), pipeline step selector (pipeline.literal). Values: comma-separated or range notation `1..5`. "Add parameter" button (max 3). Warning badge if total iterations > 10M. Confirmation dialog if > 50M.

#### Scenario: Parameter target for pipeline literal
- GIVEN the user selects "Pipeline literal" as target
- WHEN the dropdown shows available pipeline steps
- THEN only steps with binary math operations and literal operand are listed

### Requirement: ResultView
The ResultView SHALL display a probability table (outcome name, percentage to 2 decimal places, raw count). For single simulation, a Chart.js bar chart SHALL show the distribution histogram. For parameter sweep, a Chart.js line chart SHALL show one line per outcome (probability vs parameter value). A "Re-run" button, iteration count display, and progress bar with cancel button SHALL be provided.

#### Scenario: Single simulation results
- GIVEN a simulation completes without parameters
- WHEN results are displayed
- THEN a bar chart shows distribution of sum/scalar values
- AND a probability table shows each outcome's percentage and count

#### Scenario: Parameter sweep results
- GIVEN a parameter sweep completes
- WHEN results are displayed
- THEN a line chart shows probability vs parameter value for each outcome

### Requirement: Presets
The application SHALL provide quick-start preset buttons that fill all steps with pre-configured values. Presets MUST cover: D&D 5e — d20 (straight roll vs DC), D&D 5e — Advantage (2d20, max), PbtA — 2d6 (three outcomes), Shadowrun — Xd6 (hit counting), Vampire V5 (tagged dice, complex pipeline). All preset strings SHALL be in English.

#### Scenario: Applying D&D preset
- GIVEN the user selects "D&D 5e — d20" preset
- WHEN the preset is applied
- THEN the pool is set to 1d20, outcomes include "Hit" with condition rolled >= DC, and a DC parameter with values [5, 10, 15, 20]

### Requirement: Accessibility
All form inputs SHALL have associated `<label>` elements. Color SHALL NOT be the sole indicator of state. Keyboard navigation through the wizard (Tab, Enter, arrow keys) SHALL be supported. ARIA labels SHALL be on interactive charts. An ARIA live region SHALL announce simulation progress. Error states SHALL use red border + icon + tooltip. Drag-and-drop reordering SHALL have keyboard-accessible move-up/move-down buttons. All interactive elements SHALL have minimum 44px tap targets.

#### Scenario: Error state accessibility
- GIVEN a pipeline row with an invalid reference
- WHEN the error is displayed
- THEN it shows a red border, an icon, and a tooltip — not just red color

#### Scenario: Keyboard reordering
- GIVEN a reroll condition row
- WHEN the user presses the move-up button
- THEN the row moves up in the list

### Requirement: Persistence
The application SHALL provide "Save" and "Clear" buttons in the header. "Save" SHALL write config to localStorage under key `dice-calc-config`. Config SHALL auto-load on page mount. "Clear" SHALL remove saved config and reset to defaults. Saved config SHALL include a `version` field (currently `3`) for migration.

#### Scenario: Auto-load on mount
- GIVEN a previously saved configuration in localStorage
- WHEN the page loads
- THEN the configuration is restored from localStorage

#### Scenario: localStorage full
- GIVEN localStorage is at capacity
- WHEN the user clicks "Save"
- THEN a toast message "Could not save configuration" is displayed