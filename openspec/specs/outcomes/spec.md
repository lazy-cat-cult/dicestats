# Outcomes Specification

## Purpose

Outcomes define what constitutes success, failure, or any named result. Outcomes are evaluated in order — the first matching outcome wins (exclusive by default). A default outcome acts as a fallback when no other outcome matches.

## Requirements

### Requirement: Outcome Structure
Each outcome SHALL have:
- `id`: unique identifier
- `name`: display name, maximum 40 characters
- `source`: references a named value ID from the pipeline or `rolled`
- `conditions`: array of `OutcomeCondition`, maximum 5 conditions per outcome
- `connector`: `and` or `or` — how multiple conditions combine
- `comment`: optional description, maximum 100 characters
- `isDefault`: boolean, at most one outcome MAY be marked as default

```typescript
type OutcomeCondition =
  | 'none?'                                         // vector is empty
  | 'any?'                                          // vector has at least one element
  | { op: 'all?'; subCondition: ConditionOperator; value: number }  // all elements satisfy condition
  | { op: ConditionOperator; value: number };        // scalar comparison

interface Outcome {
  id: string;
  name: string;
  source: string;
  conditions: OutcomeCondition[];
  connector: 'and' | 'or';
  comment: string;
  isDefault: boolean;
}
```

#### Scenario: Default outcome
- GIVEN outcomes with one marked `isDefault: true`
- WHEN no other outcome matches in a simulation iteration
- THEN the default outcome is recorded as the match

#### Scenario: Multiple defaults rejected
- GIVEN two outcomes both marked `isDefault: true`
- WHEN validation runs
- THEN the second default outcome is flagged as invalid

### Requirement: Exclusive Evaluation Order
Outcomes SHALL be evaluated in order. The first matching outcome wins — subsequent outcomes are not checked for that iteration.

#### Scenario: First match wins
- GIVEN outcomes: ["Critical" when total >= 15, "Success" when total >= 10, "Failure" (default)]
- WHEN a simulation iteration produces total = 17
- THEN "Critical" is recorded (even though total >= 10 would also match "Success")

### Requirement: Scalar Outcome Conditions
For scalar sources, conditions SHALL use `ConditionOperator` comparisons (`>`, `>=`, `<`, `<=`, `=`, `!=`) with a numeric `value`. A scalar source MUST only use comparison-based conditions.

#### Scenario: Threshold outcome
- GIVEN an outcome "Hit" with source `rolled` and condition `{ op: '>='; value: 15 }`
- WHEN the rolled sum is 17
- THEN "Hit" matches

### Requirement: Vector Outcome Conditions
For vector sources, conditions SHALL support four forms: noneQ (matches if vector is empty), anyQ (matches if vector has at least one element), allQ with a subCondition operator and value (matches if ALL elements satisfy the sub-condition), and scalar comparison operators with a numeric value (compares a scalar aggregate of the vector).

#### Scenario: Any condition on vector
- GIVEN an outcome "Has hits" with source `hits` (vector) and condition `any?`
- WHEN `hits` contains at least one element
- THEN "Has hits" matches

#### Scenario: None condition on vector
- GIVEN an outcome "No hits" with source `hits` (vector) and condition `none?`
- WHEN `hits` is empty
- THEN "No hits" matches

#### Scenario: All condition with sub-condition
- GIVEN an outcome "All high" with source `hits` and condition `{ op: 'all?'; subCondition: '>='; value: 5 }`
- WHEN every element in `hits` has face >= 5
- THEN "All high" matches

### Requirement: Condition Connector Semantics
When the connector is `and`, ALL conditions MUST match for the outcome to match. When the connector is `or`, ANY condition matching SHALL cause the outcome to match.

#### Scenario: AND connector
- GIVEN an outcome "Critical Success" with conditions `[total_successes >= 5, crit_count >= 2]` connected by `and`
- WHEN total_successes = 5 but crit_count = 1
- THEN "Critical Success" does NOT match (not all conditions satisfied)

#### Scenario: OR connector
- GIVEN an outcome "Lucky" with conditions `[total >= 15, crit_count >= 2]` connected by `or`
- WHEN total = 16 and crit_count = 0
- THEN "Lucky" matches (first condition satisfied)

### Requirement: Invalid Source Reference
If an outcome's `source` references a deleted or undefined named value, the outcome SHALL be highlighted as invalid and the simulation SHALL be blocked from running.

#### Scenario: Reference to deleted pipeline value
- GIVEN an outcome referencing pipeline value `hits`
- WHEN the user deletes the `hits` pipeline row
- THEN the outcome is highlighted in red with a tooltip explaining the invalid reference
- AND the Run button is disabled

### Requirement: Outcome Limit
A configuration SHALL support a maximum of 10 outcomes.

#### Scenario: Maximum outcomes enforced
- GIVEN 10 outcomes already defined
- WHEN the user attempts to add an 11th outcome
- THEN the "Add outcome" button is disabled or hidden

### Requirement: Scalar-Vector Mismatch Warnings
Using `none?`, `any?`, or `all?` conditions on a scalar source SHALL produce a validation warning (not a block). Using a scalar comparison on a vector source without aggregation is also a potential mismatch.

#### Scenario: Any on scalar produces warning
- GIVEN an outcome referencing a scalar pipeline value
- WHEN the user adds an `any?` condition
- THEN a warning is displayed indicating the condition is not meaningful for scalar values