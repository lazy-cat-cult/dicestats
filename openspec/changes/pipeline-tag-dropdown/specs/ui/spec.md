# UI Specification (delta)

## MODIFIED Requirements

### Requirement: PipelineEditor (clarified — tag dropdown)
The PipelineEditor SHALL display an expandable table of named values. Each row: `[name] = [function]([source], [args]) // comment`. The filter/remove condition editor SHALL render a `<select>` for tag-clause values populated from the existing dice pool tags (see `openspec/specs/pipeline/spec.md` "ConditionChain and Clauses"). The dropdown options SHALL be color-coded using `getTagColor` for consistency with the `DicePoolEditor` tag input.

#### Scenario: Tag dropdown is color-coded
- GIVEN a pool with tags `"normal"` (red) and `"hunger"` (blue)
- WHEN the user opens a tag clause
- THEN the dropdown options are `normal` (red border) and `hunger` (blue border)

### Requirement: RerollEditor (clarified — tag dropdown)
The RerollEditor SHALL display an expandable table of reroll rules. The condition editor SHALL render a `<select>` for tag-clause values populated from the existing dice pool tags. The dropdown options SHALL be color-coded using `getTagColor`.

#### Scenario: Tag dropdown is shared with the pool
- GIVEN a pool with tags `"normal"` and `"hunger"`
- WHEN the user opens a tag clause in a reroll condition
- THEN the dropdown options are `normal` and `hunger`
