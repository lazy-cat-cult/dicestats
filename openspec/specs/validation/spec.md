# Validation Specification

## Purpose

Validation rules enforce configuration correctness before enabling the Run button. Block-level rules prevent simulation start; warning-level rules alert the user but allow running.

## Requirements

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
| 9 | At most one outcome with `isDefault = true` | Block |
| 10 | `source2` in binary ops references a scalar named value | Block |
| 11 | Parameter sweep targets a valid term/outcome/pipeline literal | Block |
| 12 | Maximum 20 pipeline rows, 10 outcomes, 10 reroll conditions, 3 parameters | Block |

#### Scenario: Empty pool blocks run
- GIVEN a configuration with no dice terms
- WHEN the user views step 4
- THEN the Run button is disabled with message "Add at least one die"

#### Scenario: Invalid pipeline reference blocks run
- GIVEN a pipeline row referencing a deleted named value
- WHEN validation runs
- THEN the row is highlighted in red with tooltip "References undefined value 'X'"
- AND the Run button is disabled

#### Scenario: Duplicate pipeline name blocks run
- GIVEN two pipeline rows both named "hits"
- WHEN validation runs
- THEN both rows are highlighted and the Run button is disabled

### Requirement: Warning-Level Validation Rules
The following conditions SHALL produce warnings but NOT block the simulation:

| # | Rule | Impact |
|---|---|---|
| 1 | At least one condition per outcome | Warning |
| 2 | Tag references in reroll/resolve conditions reference existing tags | Warning |
| 3 | `all?` condition on scalar source | Warning |
| 4 | `none?` or `any?` on scalar source | Warning |
| 5 | Divide by zero in pipeline (literal value = 0) | Warning |

#### Scenario: Scalar-vector misuse warning
- GIVEN an outcome with `any?` condition on a scalar source
- WHEN validation runs
- THEN a warning is displayed indicating the condition is not meaningful for scalar values
- AND the Run button remains enabled

#### Scenario: Divide by zero warning
- GIVEN a pipeline row: `average = divide total by 0` (literal operand)
- WHEN validation runs
- THEN a warning is displayed: "Division by zero will produce 0 at runtime"
- AND the Run button remains enabled