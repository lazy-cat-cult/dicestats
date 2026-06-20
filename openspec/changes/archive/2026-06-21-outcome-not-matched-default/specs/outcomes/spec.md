# Outcomes Specification (delta)

## MODIFIED Requirements

### Requirement: Outcome Structure
Each outcome SHALL have:
- `id`: unique identifier
- `name`: display name, maximum 40 characters
- `source`: references a named value ID from the pipeline or `rolled`
- `conditions`: array of `OutcomeCondition`, maximum 5 conditions per outcome
- `connector`: `and` or `or` — how multiple conditions combine
- `comment`: optional description, maximum 100 characters

The `isDefault` field is REMOVED.

```typescript
type DiceConditionType = 'any' | 'all' | 'none';

type OutcomeCondition =
  | { op: ConditionOperator; value: number }                                        // scalar comparison
  | { op: DiceConditionType; subCondition: ConditionOperator; value: number };      // dice quantifier
```

#### Scenario: Outcome without isDefault
- GIVEN an outcome defined in YAML or UI
- WHEN the outcome is parsed or created
- THEN the outcome object does NOT contain an `isDefault` field

### Requirement: Independent Multi-Label Evaluation
Outcomes SHALL be evaluated independently per roll. Every outcome whose conditions match SHALL be recorded in the roll's match-set. A single roll can match zero, one, or multiple outcomes. The probability of an outcome is the fraction of rolls whose match-set contains that outcome; the sum of outcome probabilities is NOT constrained to 100% and can exceed 100% when match-sets overlap.

When no user-defined outcome matches a roll, the implicit "Not matched" outcome SHALL be added to the match-set. The "Not matched" outcome is not a user-defined outcome — it has no conditions, no id, and is not stored in the `Outcome` type. It is a synthetic label added by the evaluation logic.

#### Scenario: All matching outcomes recorded
- GIVEN outcomes: ["A" when x >= 10, "B" when x >= 5, "C" when x <= 5]
- WHEN a simulation iteration produces x = 12
- THEN the match-set is ["A", "B"] (both "A" and "B" match; "C" does not)

#### Scenario: Roll matching no outcomes gets "Not matched"
- GIVEN outcomes: ["A" when x >= 10, "B" when x <= 3]
- WHEN a simulation iteration produces x = 7
- THEN the match-set is ["Not matched"]

#### Scenario: "Not matched" is not added when other outcomes match
- GIVEN outcomes: ["A" when x >= 10]
- WHEN a simulation iteration produces x = 12
- THEN the match-set is ["A"] (no "Not matched")

#### Scenario: Overlapping matches sum above 100%
- GIVEN outcomes: ["Big" when x >= 15, "Small" when x <= 5]
- WHEN the simulation runs 1000 iterations and every iteration has x >= 15 or x <= 5
- THEN "Big" probability + "Small" probability + "Not matched" probability = 100%
- AND the UI displays an informational hint that probabilities overlap (if applicable)

## REMOVED Requirements

### Requirement: Default outcome scenarios
The following scenarios are REMOVED:
- "Default outcome" (GIVEN outcomes with one marked `isDefault: true`)
- "Multiple defaults allowed" (GIVEN two outcomes both marked `isDefault: true`)
- "Default outcome matches every roll" (GIVEN outcomes: ["A" when x >= 10, "Catch" (default)])
