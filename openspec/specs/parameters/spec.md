# Sweep Parameters Specification

## Purpose

Sweep parameters (X and Y variables) allow sweeping over ranges of values to observe how probability changes across different configurations. Each (x,y) pair triggers a full independent simulation, enabling charts that show probability trends.

Expression cells in the Dice Pool, Pipeline, and Outcomes steps can reference `X` and `Y` as variables. The sweep step defines the value lists for X and Y, and the Worker iterates over their cartesian product.

## Requirements

### Requirement: Sweep Structure
The sweep configuration SHALL have:
- `x`: array of numbers for the primary sweep axis
- `y`: array of numbers for the secondary sweep axis (empty when unused)

```typescript
interface SweepParameters {
  x: number[];
  y: number[];
}
```

#### Scenario: Single-axis sweep
- GIVEN a sweep with x = [1, 2, 3] and y = []
- WHEN the simulation runs
- THEN 3 independent simulations execute, each with x = 1, 2, 3 respectively

#### Scenario: Dual-axis sweep
- GIVEN a sweep with x = [1, 2, 3] and y = [10, 20]
- WHEN the simulation runs
- THEN 6 independent simulations execute (cartesian product: 3 × 2)

### Requirement: Expression References
Expression cells (`ExprInput`) in the Dice Pool (count, sides), Pipeline (literal values), and Outcomes (scalar threshold values) SHALL accept expressions referencing `X` and `Y` variables. The Worker SHALL evaluate expressions with the current `{ x, y }` vars for each iteration.

```typescript
type ExprOp = '+' | '-' | '*' | '/' | '%';
type Expr = number | 'X' | 'Y' | { op: ExprOp; a: Expr; b: Expr };
```

#### Scenario: Expression with sweep variable
- GIVEN a dice pool term with sides = `X + 2`
- AND sweep x = [4, 6, 8]
- WHEN the simulation runs
- THEN the dice sides are 6, 8, 10 for x = 4, 6, 8 respectively

### Requirement: Sweep Limit
Each sweep axis SHALL support a maximum of 10 values.

#### Scenario: Maximum values enforced
- GIVEN sweep x has 10 values
- WHEN the user attempts to add an 11th value
- THEN a validation warning is shown recommending the user reduce the sweep size

### Requirement: Value Specification Format
Sweep values SHALL be specified as a comma-separated list of numbers: `1, 2, 3, 4, 5`. Range notation (`1..5`) SHALL also be accepted and expanded.

#### Scenario: Comma-separated values
- GIVEN an X values input with text `1, 3, 5`
- WHEN the field commits
- THEN sweep x is set to [1, 3, 5]

#### Scenario: Range notation
- GIVEN an X values input with text `1..5`
- WHEN the field commits
- THEN sweep x is set to [1, 2, 3, 4, 5]

### Requirement: Iteration Warning Thresholds
Total iterations = (|x| × |y| when y is non-empty, else |x|) × 1,000,000. The SweepCostChip SHALL display the total iteration count. When total iterations exceed 50,000,000, the chip SHALL display a warning style AND require explicit user confirmation via a "Confirm run" button before the simulation starts. There is no warning at the 10M threshold.

#### Scenario: Warning and confirmation gate
- GIVEN x has 8 values, y has 7 values (total 56 × 1M = 56M iterations)
- WHEN the user views the sweep editor
- THEN the SweepCostChip displays an accent (gold) warning style
- AND a "Confirm run" button is shown
