# Pipeline Specification (delta)

## MODIFIED Requirements

### Requirement: ConditionChain and Clauses (clarified — tag value source)
Each pipeline condition SHALL contain a `ConditionChain` with 1–10 clauses and a connector (`and` or `or`). A `ConditionClause` SHALL be one of:
- `{ field: 'face'; operator: ConditionOperator; value: number | FaceValueSpecial }` — matches a die's face value
- `{ field: 'tag'; operator: '=' | '!='; value: string }` — matches a die's tag

The `value` of a tag clause MUST be selected from the existing dice pool tags at edit time. The UI SHALL render a `<select>` for tag-clause values populated from the unique non-empty values of `dicePool.terms[].tag`. A stored tag value that is no longer in the current pool SHALL produce a non-blocking warning at validation time; the simulation SHALL still be allowed to run.

#### Scenario: Tag dropdown reflects pool
- GIVEN a pool with terms tagged `"normal"` and `"hunger"`
- WHEN the user opens a tag clause in the PipelineEditor
- THEN the dropdown options are `normal` and `hunger`
- AND no free-text input is offered

#### Scenario: Tag clause for removed tag warns
- GIVEN a saved configuration with a tag clause for `"hunger"`
- WHEN the user removes the `"hunger"` tag from the pool
- THEN validation emits a non-blocking warning: "Tag clause references tag 'hunger' that is not defined in the pool"
- AND the Run button is still enabled
