# Outcomes Specification

## Purpose

Outcomes define what constitutes success, failure, or any named result. Outcomes are evaluated independently per roll — every outcome whose conditions match is recorded in the roll's match-set. A single roll can match zero, one, or multiple outcomes. A default outcome is automatically added to every roll's match-set regardless of whether its conditions are satisfied.

## Requirements

### Requirement: Outcome Structure
Each outcome SHALL have:
- `id`: unique identifier
- `name`: display name, maximum 40 characters
- `source`: references a named value ID from the pipeline or `rolled`
- `conditions`: array of `OutcomeCondition`, maximum 5 conditions per outcome
- `connectors`: array of `'and' | 'or'` — per-condition-pair logical operators, length = conditions.length - 1
- `comment`: optional description, maximum 100 characters

```typescript
type DiceConditionType = 'any' | 'all' | 'none';

type OutcomeCondition =
  | { source: string; op: ConditionOperator; value: Expr }
  | { source: string; op: DiceConditionType; subCondition: ConditionOperator; value: Expr };

interface Outcome {
  id: string;
  name: string;
  conditions: OutcomeCondition[];
  connectors: ('and' | 'or')[];
  comment: string;
}
```

#### Scenario: Outcome without isDefault
- GIVEN an outcome defined in YAML or UI
- WHEN the outcome is parsed or created
- THEN the outcome object does NOT contain an `isDefault` field

### Requirement: Independent Multi-Label Evaluation
Outcomes SHALL be evaluated independently per roll. Every outcome whose conditions match SHALL be recorded in the roll's match-set. The probability of an outcome is the fraction of rolls whose match-set contains that outcome; the sum of outcome probabilities is NOT constrained to 100% and can exceed 100% when match-sets overlap.

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


### Requirement: Scalar Outcome Conditions
For scalar sources (numeric values like `sum`, `count`, `max`, `min`), conditions SHALL use `ConditionOperator` comparisons (`>`, `>=`, `<`, `<=`, `=`, `!=`) with a numeric `value`. Dice conditions (`any`, `all`, `none`) MUST NOT be used with scalar sources — they are meaningless on a single number.

#### Scenario: Threshold outcome
- GIVEN an outcome "Hit" with source `total` (scalar) and condition `{ op: '>='; value: 15 }`
- WHEN the total is 17
- THEN "Hit" matches

### Requirement: Dice Outcome Conditions
For vector (dice) sources (`rolled` or pipeline results of type `vector`), conditions SHALL use `DiceConditionType` quantifiers (`any`, `all`, `none`) with a `subCondition` operator and numeric `value`. Scalar comparison conditions MUST NOT be used with vector sources — they operate on a single number, not on individual dice.

Each quantifier checks whether the given comparison holds against individual die face values:
- `any`: true if at least one die face satisfies `subCondition value`
- `all`: true if every die face satisfies `subCondition value`
- `none`: true if no die face satisfies `subCondition value`

#### Scenario: Any dice condition
- GIVEN an outcome "Has crit" with source `rolled` (vector) and condition `{ op: 'any'; subCondition: '>='; value: 15 }`
- WHEN rolled dice are [{face: 17, tag: ''}, {face: 3, tag: ''}]
- THEN condition is true (at least one die >= 15)

#### Scenario: All dice condition
- GIVEN an outcome "All high" with source `rolled` (vector) and condition `{ op: 'all'; subCondition: '>='; value: 5 }`
- WHEN rolled dice are [{face: 6, tag: ''}, {face: 5, tag: ''}]
- THEN condition is true (all dice >= 5)

#### Scenario: None dice condition
- GIVEN an outcome "No hits" with source `successes` (vector) and condition `{ op: 'none'; subCondition: '>='; value: 6 }`
- WHEN `successes` is empty
- THEN condition is true (no die satisfies >= 6, vacuously true)

#### Scenario: None dice condition with non-empty vector
- GIVEN an outcome "No hits" with source `successes` (vector) and condition `{ op: 'none'; subCondition: '>='; value: 6 }`
- WHEN `successes` contains [{face: 4, tag: ''}]
- THEN condition is true (4 does not satisfy >= 6)

#### Scenario: None dice condition with matching element
- GIVEN an outcome "No hits" with source `successes` (vector) and condition `{ op: 'none'; subCondition: '>='; value: 6 }`
- WHEN `successes` contains [{face: 8, tag: ''}]
- THEN condition is false (8 satisfies >= 6)

### Requirement: Dice Conditions on Scalar Source
Using a `DiceConditionType` condition (`any`, `all`, `none`) on a scalar source SHALL produce a validation error (blocking). Using a scalar comparison condition on a vector source SHALL also produce a validation error (blocking).

#### Scenario: Dice condition on scalar is invalid
- GIVEN an outcome referencing a scalar pipeline value
- WHEN the user adds an `any` dice condition
- THEN a validation error is displayed and the simulation is blocked

#### Scenario: Scalar condition on vector is invalid
- GIVEN an outcome referencing a vector source (`rolled` or `filter`/`remove` pipeline result)
- WHEN the user adds a scalar comparison condition `{ op: '>='; value: 10 }`
- THEN a validation error is displayed and the simulation is blocked

### Requirement: Condition Connector Semantics
When `connectors[i]` is `'and'`, both `conditions[i]` and `conditions[i+1]` MUST match. When `connectors[i]` is `'or'`, either condition matching SHALL satisfy that pair.

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

### Requirement: Scalar-Vector Condition Mismatch Errors
Using `any`, `all`, or `none` dice conditions on a scalar source SHALL produce a validation error (blocking). Using a scalar comparison condition on a vector source without prior aggregation SHALL also produce a validation error (blocking).

#### Scenario: Dice condition on scalar produces error
- GIVEN an outcome referencing a scalar pipeline value
- WHEN the user adds an `any` dice condition
- THEN a validation error is displayed and the simulation is blocked

#### Scenario: Scalar condition on vector produces error
- GIVEN an outcome referencing a vector source
- WHEN the user adds a scalar comparison condition `{ op: '>='; value: 10 }`
- THEN a validation error is displayed and the simulation is blocked