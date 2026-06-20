# Simulation Specification (delta)

## MODIFIED Requirements

### Requirement: SimJob Structure (extended)
The `SimJob` interface SHALL include an optional `taskName` field for labeling simulation results with the source preset name.

```typescript
export interface SimJob {
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters?: Parameter[];
  iterations: number;
  taskName?: string;  // NEW: optional preset name for result labeling
}
```

#### Scenario: SimJob with taskName
- GIVEN a preset "D&D 5e — d20" is applied
- WHEN the simulation job is constructed
- THEN `job.taskName` is `"D&D 5e — d20"`

#### Scenario: SimJob without taskName
- GIVEN no preset is applied (default configuration)
- WHEN the simulation job is constructed
- THEN `job.taskName` is `undefined`

### Requirement: SimResult Label Semantics (extended)
The `SimResult.label` field SHALL be populated as follows:

- **Single simulation (no parameters)**: `label` is the `taskName` from the `SimJob`, or `""` if no `taskName` was provided.
- **Parameter sweep simulation**: `label` is `"PresetName · ParamLabel=Value"` if `taskName` was provided, or `"ParamLabel=Value"` if no `taskName` was provided.

#### Scenario: Single run with preset name
- GIVEN a `SimJob` with `taskName: "PbtA — 2d6"` and no parameters
- WHEN the simulation completes
- THEN the result has `label: "PbtA — 2d6"`

#### Scenario: Single run without preset name
- GIVEN a `SimJob` with `taskName: undefined` and no parameters
- WHEN the simulation completes
- THEN the result has `label: ""`

#### Scenario: Sweep run with preset name
- GIVEN a `SimJob` with `taskName: "D&D 5e — d20"` and a parameter "DC" with values [5, 10, 15, 20]
- WHEN the simulation completes
- THEN the results have labels:
  - `"D&D 5e — d20 · DC=5"`
  - `"D&D 5e — d20 · DC=10"`
  - `"D&D 5e — d20 · DC=15"`
  - `"D&D 5e — d20 · DC=20"`

#### Scenario: Sweep run without preset name
- GIVEN a `SimJob` with `taskName: undefined` and a parameter "DC" with values [5, 10]
- WHEN the simulation completes
- THEN the results have labels:
  - `"DC=5"`
  - `"DC=10"`

### Requirement: Worker Simulation Function Signature (extended)
The `runSimulation` function in the worker SHALL accept an optional `taskName` parameter and use it to populate the `SimResult.label` field.

```typescript
function runSimulation(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  iterations: number,
  taskName?: string  // NEW
): SimResult {
  // ... simulation logic ...
  return {
    label: taskName ?? '',  // CHANGED: was always ''
    outcomes: ...,
    totalRolls: iterations,
    distribution: ...,
  };
}
```

#### Scenario: Worker uses taskName for single run label
- GIVEN the worker receives a `SimJob` with `taskName: "Shadowrun — Xd6"`
- WHEN the worker runs a single simulation (no parameters)
- THEN the posted result has `label: "Shadowrun — Xd6"`

#### Scenario: Worker prepends taskName to sweep labels
- GIVEN the worker receives a `SimJob` with `taskName: "Vampire V5"` and a parameter "TN" with values [1, 2, 3]
- WHEN the worker runs the parameter sweep
- THEN the posted results have labels:
  - `"Vampire V5 · TN=1"`
  - `"Vampire V5 · TN=2"`
  - `"Vampire V5 · TN=3"`
