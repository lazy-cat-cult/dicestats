# Outcomes Specification (delta)

## REMOVED Requirements

### Requirement: Exclusive Evaluation Order
Outcomes were evaluated in order, with the first matching outcome winning.

## MODIFIED Requirements

### Requirement: Outcome Structure
Each outcome SHALL have:
- `id`: unique identifier
- `name`: display name, maximum 40 characters
- `conditions`: array of `OutcomeCondition`, maximum 5 conditions per outcome
- `connector`: `and` or `or` — how multiple conditions combine
- `comment`: optional description, maximum 100 characters
- `isDefault`: boolean. If `true`, the outcome is automatically added to every roll's match-set regardless of whether its conditions are satisfied.

#### Scenario: Default outcome
- GIVEN outcomes with one marked `isDefault: true`
- WHEN a simulation iteration runs
- THEN the default outcome is added to the match-set in addition to any outcomes whose conditions match

#### Scenario: Multiple defaults allowed
- GIVEN two outcomes both marked `isDefault: true`
- WHEN validation runs
- THEN both defaults are accepted and both are added to every roll's match-set

## ADDED Requirements

### Requirement: Independent Multi-Label Evaluation
Outcomes SHALL be evaluated independently per roll. Every outcome whose conditions match SHALL be recorded in the roll's match-set. A single roll can match zero, one, or multiple outcomes. The probability of an outcome is the fraction of rolls whose match-set contains that outcome; the sum of outcome probabilities is NOT constrained to 100% and can exceed 100% when match-sets overlap.

#### Scenario: All matching outcomes recorded
- GIVEN outcomes: ["A" when x >= 10, "B" when x >= 5, "C" when x <= 5]
- WHEN a simulation iteration produces x = 12
- THEN the match-set is ["A", "B"] (both "A" and "B" match; "C" does not)

#### Scenario: Roll matching no outcomes
- GIVEN outcomes: ["A" when x >= 10, "B" when x <= 3] with no default
- WHEN a simulation iteration produces x = 7
- THEN the match-set is empty

#### Scenario: Default outcome matches every roll
- GIVEN outcomes: ["A" when x >= 10, "Catch" (default)]
- WHEN a simulation iteration produces x = 3
- THEN the match-set is ["Catch"]
- WHEN a simulation iteration produces x = 12
- THEN the match-set is ["A", "Catch"]

#### Scenario: Overlapping matches sum above 100%
- GIVEN outcomes: ["Always" (default), "Big" when x >= 15]
- WHEN the simulation runs 1000 iterations and every iteration has x >= 15
- THEN "Always" probability is 100% and "Big" probability is 100% (sum = 200%)
- AND the UI displays an informational hint that probabilities overlap

### Requirement: Outcome Overlap Reporting
When two or more outcomes match the same iteration, the simulation SHALL record the pairwise co-occurrence and expose it in `SimResult.overlaps`. The UI SHALL display a warning when overlaps exist, naming every overlapping pair with its co-occurrence probability and count, so users can see exactly which outcomes are not mutually exclusive.

#### Scenario: Co-occurring pair recorded
- GIVEN outcomes: ["Hope" when x > 0, "Strong" when x >= 10]
- WHEN the simulation runs and an iteration produces x = 12
- THEN both outcomes match and the overlap ["Hope", "Strong"] is incremented by 1

#### Scenario: UI lists overlapping pairs
- GIVEN a `SimResult` whose `overlaps` contains `[{outcomes: ["Hope", "Strong"], count: 320, probability: 0.32}, {outcomes: ["Fear", "Failure"], count: 110, probability: 0.11}]`
- WHEN the results are rendered
- THEN a warning block is shown above the overlap list naming both pairs with their co-occurrence probability and count

#### Scenario: No overlaps — no warning
- GIVEN outcomes whose conditions are mutually exclusive (every iteration matches at most one outcome)
- WHEN the simulation runs
- THEN `SimResult.overlaps` is empty and the UI does not render an overlap warning
