# Reroll Conditions Specification

## Purpose

Reroll conditions modify dice values **before** the resolution pipeline. They support two actions: `reroll` (replace a matching die's value) and `explode` (keep the value and add an extra die). Conditions are evaluated in row order, and each condition operates on the full updated set including dice added by prior explosions.

## Requirements

### Requirement: RerollAction Types
A reroll condition SHALL have an `action` of either `reroll` or `explode`:
- **reroll**: If a die matches the condition, discard its value and roll again. The `repeat` field specifies the maximum number of additional re-roll attempts. After all attempts, if the last value still matches, keep it.
- **explode**: If a die matches the condition, keep its value AND add a new die of the same type (same `sides` and `tag`). The `repeat` field specifies the maximum cascade depth (1 = one level only, no further cascading from the added die).

#### Scenario: Simple reroll
- GIVEN a reroll condition with action `reroll`, condition `face = 1`, repeat 1
- AND a d6 die showing 1
- WHEN the condition is applied
- THEN the die SHALL be re-rolled once
- AND if the re-roll is also 1, the value 1 is kept

#### Scenario: Explode with cascading
- GIVEN a reroll condition with action `explode`, condition `face = 6`, repeat 3
- AND a d6 die showing 6
- WHEN the condition is applied
- THEN the original 6 is kept and a new d6 is rolled
- AND if the new d6 also shows 6, it too explodes (up to 3 cascade levels deep)

### Requirement: ConditionChain and Clauses
Each reroll condition SHALL contain a `ConditionChain` with 1–10 clauses and a connector (`and` or `or`). A `ConditionClause` SHALL be one of:
- `{ field: 'face'; operator: ConditionOperator; value: number | FaceValueSpecial }` — matches a die's face value
- `{ field: 'tag'; operator: '=' | '!='; value: string }` — matches a die's tag

`ConditionOperator` for face: `>`, `>=`, `<`, `<=`, `=`, `!=`.

`FaceValueSpecial` defines symbolic face values that resolve at match time based on the die's `sides`:
- `'max_value'` — resolves to the die's maximum possible face value (equal to `sides`)
- `'min_value'` — resolves to the die's minimum possible face value (always 1)

When a clause uses `FaceValueSpecial`, the matching function resolves it using the die's tag to look up the correct `sides` from the pool terms (same logic as `findSides`). For an empty tag, the first term's `sides` is used.

#### Scenario: Face clause with operator
- GIVEN a clause `{ field: 'face'; operator: '>='; value: 5 }`
- WHEN evaluated against a die showing 6
- THEN the clause matches

#### Scenario: Face clause with max_value
- GIVEN a clause `{ field: 'face'; operator: '='; value: 'max_value' }`
- WHEN evaluated against a d6 die showing 6
- THEN the clause matches (max_value resolves to 6)

#### Scenario: Face clause with max_value on non-matching value
- GIVEN a clause `{ field: 'face'; operator: '='; value: 'max_value' }`
- WHEN evaluated against a d6 die showing 4
- THEN the clause does NOT match (max_value resolves to 6, 4 ≠ 6)

#### Scenario: Face clause with max_value on tagged die
- GIVEN a clause `{ field: 'face'; operator: '='; value: 'max_value' }`
- AND a pool with terms [{ sides: 20, tag: '' }, { sides: 6, tag: 'skill' }]
- WHEN evaluated against a die showing 6 with tag 'skill'
- THEN the clause matches (max_value resolves to 6 for that die's sides)

#### Scenario: Face clause with min_value
- GIVEN a clause `{ field: 'face'; operator: '='; value: 'min_value' }`
- WHEN evaluated against a die showing 1
- THEN the clause matches (min_value resolves to 1)

#### Scenario: Face clause with max_value and >= operator
- GIVEN a clause `{ field: 'face'; operator: '>='; value: 'max_value' }`
- AND a d20 die
- WHEN evaluated against a die showing 20
- THEN the clause matches (max_value resolves to 20, 20 >= 20)

#### Scenario: Explode on max face value
- GIVEN a reroll condition with action `explode`, condition `face = max_value`, repeat 3
- AND a d6 die showing 6
- WHEN the condition is applied
- THEN the die explodes (max_value resolves to 6, matching the face value)

#### Scenario: Tag clause
- GIVEN a clause `{ field: 'tag'; operator: '='; value: 'hunger' }`
- WHEN evaluated against a die tagged "hunger"
- THEN the clause matches

#### Scenario: AND chain
- GIVEN a condition chain with clauses `[face >= 5, tag = "hunger"]` connected by `and`
- WHEN evaluated against a die showing 6 with tag "hunger"
- THEN the chain matches (both clauses satisfied)

#### Scenario: OR chain
- GIVEN a condition chain with clauses `[face = 1, face = 20]` connected by `or`
- WHEN evaluated against a die showing 20
- THEN the chain matches (at least one clause satisfied)

### Requirement: RerollCondition Structure
The `RerollCondition` type SHALL define the data structure for reroll and explode rules:

```typescript
type RerollAction = 'reroll' | 'explode';
type ConditionOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';
type FaceValueSpecial = 'max_value' | 'min_value';
type ConditionClause =
  | { field: 'face'; operator: ConditionOperator; value: number | FaceValueSpecial }
  | { field: 'tag'; operator: '=' | '!='; value: string };

type ConditionChain = {
  clauses: ConditionClause[];
  connector: 'and' | 'or';
};

interface RerollCondition {
  id: string;
  action: RerollAction;
  conditions: ConditionChain;
  repeat: number;      // 1..99; reroll: max re-roll attempts; explode: max cascade depth
  comment: string;     // max 100 chars
}
```

#### Scenario: Full type structure
- GIVEN a RerollCondition with action `explode`, conditions chaining `face >= 6` via `or`, repeat 2
- WHEN applied to a d10 pool with tag "normal"
- THEN any die showing 6+ explodes, adding another d10 tagged "normal", up to 2 cascade levels

### Requirement: Repeat Field Semantics
For the `reroll` action, `repeat` SHALL specify the number of additional re-roll attempts (the initial roll does not count as an attempt). For the `explode` action, `repeat` SHALL specify the maximum cascade depth (1 = explode once only, no cascading). The `repeat` value SHALL be >= 1.

#### Scenario: Reroll repeat = 3
- GIVEN a reroll condition with `repeat: 3`
- WHEN a die matches the condition
- THEN up to 3 re-roll attempts are made
- AND the first non-matching result is kept, or the 3rd re-roll regardless

### Requirement: Explode Safety Cap
A single original die SHALL NOT generate more than 100 extra dice from explosions in one iteration, regardless of the `repeat` value.

#### Scenario: Explosion safety cap
- GIVEN a d1 with explode condition (always matches) and repeat 999
- WHEN the simulation processes this die
- THEN at most 100 extra dice are generated from this original die

### Requirement: Sequential Condition Evaluation
Multiple reroll conditions SHALL be evaluated in order. After each condition finishes processing all dice (potentially adding new dice from explosions), the next condition operates on the full updated set.

#### Scenario: Explosion followed by reroll
- GIVEN condition 1: `explode` on `face = 6`, and condition 2: `reroll` on `face = 1`
- WHEN a die rolls 6 (condition 1 adds a new die)
- AND the new die rolls 1 (condition 2 processes the updated set)
- THEN condition 2 rerolls the die that rolled 1

### Requirement: Exploded Dice Inheritance
Dice added by explosion SHALL inherit the same `sides` and `tag` as the original die that triggered the explosion.

#### Scenario: Tag inheritance
- GIVEN a die with `{ sides: 10, tag: 'hunger' }` that explodes on face 10
- WHEN the explosion adds a new die
- THEN the new die has `sides: 10` and `tag: 'hunger'`

### Requirement: Maximum Reroll Conditions
A configuration SHALL support at most 10 reroll conditions.

#### Scenario: Adding 11th condition blocked
- GIVEN 10 reroll conditions already defined
- WHEN the user attempts to add an 11th condition
- THEN the "Add condition" button SHALL be disabled or hidden