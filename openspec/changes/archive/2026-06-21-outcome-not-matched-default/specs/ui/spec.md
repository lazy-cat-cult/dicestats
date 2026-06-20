# UI Specification (delta)

## MODIFIED Requirements

### Requirement: OutcomeEditor
The OutcomeEditor SHALL display a list of outcome rows. Each row contains:

- A name `TextField` (max 40 chars).
- A delete button when more than one outcome exists.
- A list of conditions; each condition has a source `Select` (vector sources labelled `[ name ]`, scalar labelled `name`) and either a scalar condition (operator + value) or a dice condition (type `any`/`all`/`none` + sub-operator + value).
- An AND/OR connector select when more than one condition exists.
- A "+ condition" button (max 5 conditions per outcome).
- An optional comment field (toggled by the global "Show comments" checkbox).

Up to 10 outcomes are allowed. Empty state is a dashed-border card: "No outcomes. Add an outcome to define a probability bucket."

The "Default" checkbox and the "default" pill are REMOVED.

#### Scenario: OutcomeEditor without default controls
- GIVEN the OutcomeEditor is rendered
- WHEN the user views an outcome row
- THEN no "Default" checkbox is present
- AND no "default" pill is shown

## REMOVED Requirements

### Requirement: Outcome Default Pill
The "Outcome Default Pill" requirement is REMOVED. The `default` pill and the "Default" checkbox are no longer part of the UI.

### Scenario: Default outcome checkbox
The "Default outcome checkbox" scenario is REMOVED.

## ADDED Requirements

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
