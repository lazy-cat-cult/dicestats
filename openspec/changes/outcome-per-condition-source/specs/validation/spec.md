# Validation Specification (delta)

## MODIFIED Requirements

### Requirement: Block-Level Validation Rules (rewritten for per-condition source)
The following conditions MUST be satisfied before the Run button is enabled:

| # | Rule | Impact |
|---|---|---|
| 1 | At least one dice term exists | Block |
| 2 | All dice terms have count >= 1 and sides >= 1 | Block |
| 3 | At least one outcome exists | Block |
| 4 | No invalid pipeline references (source pointing to undefined or later row) | Block |
| 5 | No duplicate pipeline names | Block |
| 6 | Pipeline names match `/^[a-zA-Z_][a-zA-Z0-9_]*$/` | Block |
| 7 | Pipeline type mismatch: count/sum/max/min applied to scalar source | Block |
| 8 | Pipeline type mismatch: binary math applied to vector source | Block |
| 9 | At most one outcome with `isDefault = true` | Block |
| 10 | `source2` in binary ops references a scalar named value | Block |
| 11 | Parameter sweep targets a valid term/outcome/pipeline literal | Block |
| 12 | Maximum 20 pipeline rows, 10 outcomes, 10 reroll conditions, 3 parameters | Block |
| 13 | Per condition: `source` resolves to a known pipeline value or `'rolled'`; scalar condition references a scalar source; dice condition references a vector source | Block |

Rule 13 is the per-condition replacement for the old outcome-level "scalar comparison on vector source" check. It applies to every `OutcomeCondition` independently.

#### Scenario: Per-condition type mismatch
- GIVEN an outcome with two conditions: `[{source: 'total', op: 'any', subCondition: '>=', value: 5}, {source: 'delta', op: '>=', value: 0}]`
- WHERE `total` is scalar and `delta` is scalar
- WHEN validation runs
- THEN a blocking error is emitted for the first condition (dice on scalar), independent of the second

#### Scenario: Per-condition undefined source
- GIVEN an outcome with a condition `{source: 'nonexistent', op: '>=', value: 5}`
- WHEN validation runs
- THEN a blocking error is emitted: `Outcome "X" condition references undefined source "nonexistent"`
