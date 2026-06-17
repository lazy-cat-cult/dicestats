# Validation Specification (delta)

## MODIFIED Requirements

### Requirement: Block-Level Validation Rules
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
| 9 | `source2` in binary ops references a scalar named value | Block |
| 10 | Parameter sweep targets a valid term/outcome/pipeline literal | Block |
| 11 | Maximum 20 pipeline rows, 10 outcomes, 10 reroll conditions, 3 parameters | Block |

Rule 9 ("At most one outcome with `isDefault = true`") is REMOVED.

## MODIFIED Requirements

### Requirement: Warning-Level Validation Rules
The following conditions SHALL produce warnings but NOT block the simulation:

| # | Rule | Impact |
|---|---|---|
| 1 | At least one condition per outcome | Warning |
| 2 | Tag references in reroll/resolve conditions reference existing tags | Warning |
| 3 | `all?` condition on scalar source | Warning |
| 4 | `none?` or `any?` on scalar source | Warning |
| 5 | Divide by zero in pipeline (literal value = 0) | Warning |

The warning "outcome with no conditions and not default" is REMOVED. All outcomes with no conditions now produce a warning regardless of any default flag.

#### Scenario: Outcome with no conditions produces warning
- GIVEN an outcome with zero conditions
- WHEN validation runs
- THEN a warning is produced: "Outcome '<name>' has no conditions"
- AND the simulation is NOT blocked
