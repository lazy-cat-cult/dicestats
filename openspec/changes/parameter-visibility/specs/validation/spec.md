# Validation Specification (delta)

## MODIFIED Requirements

### Requirement: Block-Level Validation Rules (rule 11 extended)
Rule 11 (parameter sweep targets a valid term/outcome/pipeline literal) is extended as follows. The parameter's target object MUST exist. If `target` is `'outcome.value'`, the targeted outcome's `conditions.length` MUST be ≥1, and the targeted outcome's `conditions[0]` MUST pass the `isScalarCondition` predicate (an `OutcomeCondition` whose `op` is a `ConditionOperator` and whose `value` is a `number`). Vector quantifiers as the first condition SHALL emit a blocking error: "Cannot sweep vector condition. Add a numeric condition first." An empty conditions list SHALL emit a blocking error: "Sweep target outcome has no conditions. Add a condition first."

If `target` is `'pipeline.literal'`, the targeted `NamedValue` MUST be `{ fn: ScalarBinaryOp; operand: 'literal'; value: number }`. If the function is changed to a non-binary-math variant, validation SHALL emit a blocking error: "Pipeline literal target is not a binary-math-literal row. Change the function or pick a different target."

#### Scenario: Target exists (current behaviour)
- GIVEN a parameter with `targetTermId: "t1"` and term `t1` exists
- WHEN validation runs
- THEN no error is emitted for the target's existence

#### Scenario: Outcome sweep requires ≥1 condition
- GIVEN a parameter with `target: "outcome.value", targetOutcomeId: "o1"`
- AND `o1.conditions.length === 0`
- WHEN validation runs
- THEN a blocking error is emitted: "Sweep target outcome has no conditions. Add a condition first."

#### Scenario: Outcome sweep requires scalar first condition
- GIVEN a parameter with `target: "outcome.value", targetOutcomeId: "o1"`
- AND `o1.conditions[0].op` is a `DiceConditionType` (e.g. `any`)
- WHEN validation runs
- THEN a blocking error is emitted: "Cannot sweep vector condition. Add a numeric condition first."

#### Scenario: Pipeline literal sweep requires binary-math-literal function
- GIVEN a parameter with `target: "pipeline.literal", targetPipelineId: "p1"`
- AND `p1.fn` is a `ScalarBinaryOp` and `p1.operand === 'literal'`
- WHEN validation runs
- THEN no error is emitted

#### Scenario: Pipeline literal sweep invalidated by function change
- GIVEN a parameter with `target: "pipeline.literal", targetPipelineId: "p1"`
- AND `p1.fn` has been changed to `ceil` (a `ScalarFunction` but not binary-math)
- WHEN validation runs
- THEN a blocking error is emitted: "Pipeline literal target is not a binary-math-literal row. Change the function or pick a different target."
