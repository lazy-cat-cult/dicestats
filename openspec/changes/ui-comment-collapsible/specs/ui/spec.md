# UI Specification (delta)

## MODIFIED Requirements

### Requirement: PipelineEditor (clarified — collapsible comments)
The PipelineEditor SHALL display an expandable table of named values. Each row: `[name] = [function]([source], [args]) // comment`. Name SHALL be alphanumeric + underscore, unique, max 30 chars. Source dropdown SHALL offer `rolled` or any previously defined named value. Function dropdown SHALL adapt to source type: vector source offers filter, remove, count, sum, max, min; scalar source offers add, subtract, multiply, divide, ceil, floor. For filter/remove, a condition editor SHALL be shown. For binary math, a toggle between "literal" (number input) and "named value" (dropdown of prior scalars) SHALL be provided. Invalid references SHALL be highlighted in red with a tooltip. Type mismatch errors SHALL be highlighted in red. "Add named value" button (max 20 rows). Empty state: "No pipeline steps. Outcomes will reference rolled values directly."

The editor heading row SHALL include a "Show comments" `<label>` + `<input type="checkbox">`. When unchecked (default), the per-row comment `<input>` SHALL be hidden for every pipeline row. When checked, every per-row comment input SHALL be visible. The toggle state is shared with `OutcomeEditor` and persists across page reloads.

#### Scenario: Comments hidden by default
- GIVEN a fresh page load (no prior toggle state in localStorage)
- WHEN the PipelineEditor renders
- THEN the per-row comment inputs are NOT visible
- AND the "Show comments" checkbox is unchecked

#### Scenario: Toggle reveals comments
- GIVEN comments are hidden
- WHEN the user checks "Show comments"
- THEN every per-row comment `<input>` becomes visible
- AND the change is persisted to localStorage under `dice-calc-ui`

### Requirement: OutcomeEditor (clarified — collapsible comments)
The OutcomeEditor SHALL display an expandable table of outcomes. Each row: `[name] when [conditions]`. Name max 40 chars. Each condition carries its own source `<select>`. Conditions SHALL vary by the resolved type of the selected source: vector sources offer none?/any?/all?/comparison; scalar sources offer comparison only. Connector: AND/OR toggle. A "Default outcome" checkbox (at most one) SHALL be provided. Delete button. "Add outcome" button (max 10). Empty state: "Add at least one outcome to define success/failure conditions."

The editor heading row SHALL include a "Show comments" `<label>` + `<input type="checkbox">` shared with the PipelineEditor. When unchecked (default), the per-row comment `<input>` SHALL be hidden for every outcome row. When checked, every per-row comment input SHALL be visible.

#### Scenario: Comments toggle is shared between editors
- GIVEN comments are hidden in the PipelineEditor
- WHEN the user navigates to the OutcomeEditor
- THEN comments are also hidden in the OutcomeEditor
- AND toggling the checkbox in either editor updates the other
