# Outcomes Specification (delta)

## MODIFIED Requirements

### Requirement: Outcome Structure (rewritten)
Each outcome SHALL have:
- `id`: unique identifier
- `name`: display name, maximum 40 characters
- `conditions`: array of `OutcomeCondition`, maximum 5 conditions per outcome. **Each condition carries its own `source`**; the outcome does NOT have a top-level `source`.
- `connector`: `and` or `or` — how multiple conditions combine
- `comment`: optional description, maximum 100 characters
- `isDefault`: boolean, at most one outcome MAY be marked as default

```typescript
type DiceConditionType = 'any' | 'all' | 'none';

type ScalarCondition = {
  source: string;                 // 'rolled' or a named pipeline value
  op: ConditionOperator;
  value: number;
};

type DiceCondition = {
  source: string;                 // 'rolled' or a named pipeline value
  op: DiceConditionType;
  subCondition: ConditionOperator;
  value: number;
};

type OutcomeCondition = ScalarCondition | DiceCondition;
```

A condition is a `DiceCondition` iff `op` is in `DICE_CONDITION_TYPES`; otherwise it is a `ScalarCondition`. The resolved type of `source` MUST match the condition kind: scalar sources for `ScalarCondition`, vector sources (`'rolled'` or any vector pipeline result) for `DiceCondition`.

#### Scenario: Compound outcome with two sources
- GIVEN an outcome named "Critical Hit" with conditions `[{source: 'total', op: '>=', value: 15}, {source: 'delta', op: '>=', value: 0}]` connected by `and`
- WHEN `total = 17` and `delta = -1`
- THEN the outcome does NOT match (the second condition fails)
- WHEN `total = 17` and `delta = 1`
- THEN the outcome matches (both conditions satisfied)

#### Scenario: Default outcome
- GIVEN outcomes with one marked `isDefault: true`
- WHEN no other outcome matches in a simulation iteration
- THEN the default outcome is recorded as the match

#### Scenario: Multiple defaults rejected
- GIVEN two outcomes both marked `isDefault: true`
- WHEN validation runs
- THEN the second default outcome is flagged as invalid

### Requirement: Scalar Outcome Conditions (per condition)
For scalar sources (numeric values like `sum`, `count`, `max`, `min`, or a literal/named binary op), the corresponding `ScalarCondition` SHALL use `ConditionOperator` comparisons (`>`, `>=`, `<`, `<=`, `=`, `!=`) with a numeric `value`. Dice conditions (`any`, `all`, `none`) MUST NOT be used with scalar sources — they are meaningless on a single number.

#### Scenario: Threshold outcome
- GIVEN an outcome "Hit" with a condition `{source: 'total', op: '>=', value: 15}` where `total` is scalar
- WHEN the total is 17
- THEN "Hit" matches

### Requirement: Dice Outcome Conditions (per condition)
For vector (dice) sources (`rolled` or any vector pipeline result), the corresponding `DiceCondition` SHALL use `DiceConditionType` quantifiers (`any`, `all`, `none`) with a `subCondition` operator and numeric `value`. Scalar comparison conditions MUST NOT be used with vector sources — they operate on a single number, not on individual dice.

Each quantifier checks whether the given comparison holds against individual die face values:
- `any`: true if at least one die face satisfies `subCondition value`
- `all`: true if every die face satisfies `subCondition value`
- `none`: true if no die face satisfies `subCondition value`

#### Scenario: Any dice condition
- GIVEN an outcome "Has crit" with a condition `{source: 'rolled', op: 'any', subCondition: '>=', value: 15}`
- WHEN rolled dice are [{face: 17, tag: ''}, {face: 3, tag: ''}]
- THEN condition is true (at least one die >= 15)

#### Scenario: None dice condition with non-empty vector
- GIVEN an outcome "No hits" with a condition `{source: 'successes', op: 'none', subCondition: '>=', value: 6}`
- WHEN `successes` contains [{face: 4, tag: ''}]
- THEN condition is true (4 does not satisfy >= 6)

### Requirement: Condition Connector Semantics
When the connector is `and`, ALL conditions MUST match for the outcome to match. When the connector is `or`, ANY condition matching SHALL cause the outcome to match. Conditions may reference different sources.

#### Scenario: AND connector with mixed sources
- GIVEN an outcome "Critical Success" with conditions `[{source: 'total', op: '>=', value: 5}, {source: 'crit_count', op: '>=', value: 2}]` connected by `and`
- WHEN `total = 5` but `crit_count = 1`
- THEN "Critical Success" does NOT match (not all conditions satisfied)

#### Scenario: OR connector
- GIVEN an outcome "Lucky" with conditions `[{source: 'total', op: '>=', value: 15}, {source: 'crit_count', op: '>=', value: 2}]` connected by `or`
- WHEN `total = 16` and `crit_count = 0`
- THEN "Lucky" matches (first condition satisfied)

### Requirement: Invalid Source Reference (per condition)
If any `condition.source` references a deleted or undefined named value, the corresponding condition SHALL be flagged as invalid and the simulation SHALL be blocked from running.

#### Scenario: Reference to deleted pipeline value
- GIVEN an outcome containing a condition with `source: 'hits'`
- WHEN the user deletes the `hits` pipeline row
- THEN the outcome is highlighted in red with a tooltip explaining the invalid reference
- AND the Run button is disabled

### Requirement: Scalar-Vector Condition Mismatch Errors (per condition)
Using a `DiceConditionType` condition (`any`, `all`, `none`) on a scalar source SHALL produce a blocking validation error. Using a scalar comparison condition on a vector source SHALL also produce a blocking validation error. The check is per condition, not per outcome.

#### Scenario: Dice condition on scalar source produces error
- GIVEN an outcome with a condition `{source: 'total', op: 'any', subCondition: '>=', value: 5}` where `total` is scalar
- WHEN validation runs
- THEN a blocking error is displayed and the simulation is blocked

#### Scenario: Scalar condition on vector source produces error
- GIVEN an outcome with a condition `{source: 'rolled', op: '>=', value: 10}` where `rolled` is a vector
- WHEN validation runs
- THEN a blocking error is displayed and the simulation is blocked
