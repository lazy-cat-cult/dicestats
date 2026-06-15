# Presets Specification (delta)

## ADDED Requirements

### Requirement: Daggerheart — Compound Outcomes (2d12) preset
The application SHALL provide a "Daggerheart — Compound Outcomes (2d12)" preset that exercises the per-condition `source` feature. The preset SHALL define:

```
Pool: 1d12 tag:hope + 1d12 tag:fear
Reroll: none
Pipeline:
  hope_face = filter rolled where tag = hope
  fear_face = filter rolled where tag = fear
  total = sum rolled
  hope_value = max hope_face
  fear_value = max fear_face
  delta = subtract hope_value by fear_value
Outcomes:
  "Critical Hit"  when total >= 15 AND delta >= 0
  "Critical Miss" when total <= 5 AND delta < 0
  "Hope"          when delta > 0  (default)
Parameters: (none)
```

The two "Critical" outcomes each have one condition with `source: 'total'` and one with `source: 'delta'`, demonstrating the AND connector across two different pipeline values.

#### Scenario: Daggerheart compound preset
- GIVEN the user selects "Daggerheart — Compound Outcomes (2d12)"
- WHEN the preset is applied
- THEN the pool is set to 1d12 hope + 1d12 fear
- AND the outcomes include "Critical Hit" with conditions `[{source: 'total', op: '>=', value: 15}, {source: 'delta', op: '>=', value: 0}]`
- AND "Hope" is the default outcome
