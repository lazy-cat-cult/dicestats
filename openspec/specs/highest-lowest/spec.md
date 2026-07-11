# Highest and Lowest Vector Functions Specification

## Requirements

### Requirement: Highest N vector function
The pipeline SHALL support a `highest` vector function that selects N dice with the highest face values from a source vector, sorted in descending order by face value.

The function SHALL accept:
- `fn: 'highest'`
- `n: Expr` — number of dice to select, evaluated at simulation time

When N > vector length, the entire vector SHALL be returned. When N = 0, an empty vector SHALL be returned. N < 0 SHALL be caught by validation.

Tie-breaking SHALL be by original `index` (earlier dice preferred), ensuring deterministic results.

```typescript
| { fn: 'highest'; n: Expr }
```

#### Scenario: Basic highest selection
- **WHEN** `kept = highest rolled 3` and rolled values are [{ face: 3, index: 0 }, { face: 6, index: 1 }, { face: 2, index: 2 }, { face: 5, index: 3 }]
- **THEN** `kept` contains [{ face: 6, index: 1 }, { face: 5, index: 3 }, { face: 3, index: 0 }] (descending order)

#### Scenario: Highest with N larger than vector
- **WHEN** `kept = highest rolled 10` and rolled vector has 3 elements
- **THEN** `kept` contains all 3 elements, sorted descending

#### Scenario: Highest with N = 0
- **WHEN** `kept = highest rolled 0` and rolled vector has 5 elements
- **THEN** `kept` is empty

#### Scenario: Highest tie-breaking by index
- **WHEN** `kept = highest rolled 2` and rolled values are [{ face: 5, index: 0 }, { face: 5, index: 1 }, { face: 3, index: 2 }]
- **THEN** `kept` contains [{ face: 5, index: 0 }, { face: 5, index: 1 }] (index 0 beats index 1)

#### Scenario: Highest with sweep variable N
- **WHEN** `kept = highest rolled N` and N = 2, rolled values are [{ face: 4 }, { face: 6 }, { face: 1 }]
- **THEN** `kept` contains [{ face: 6 }, { face: 4 }]

### Requirement: Lowest N vector function
The pipeline SHALL support a `lowest` vector function that selects N dice with the lowest face values from a source vector, sorted in ascending order by face value.

The function SHALL accept:
- `fn: 'lowest'`
- `n: Expr` — number of dice to select, evaluated at simulation time

When N > vector length, the entire vector SHALL be returned. When N = 0, an empty vector SHALL be returned. N < 0 SHALL be caught by validation.

Tie-breaking SHALL be by original `index` (earlier dice preferred), ensuring deterministic results.

```typescript
| { fn: 'lowest'; n: Expr }
```

#### Scenario: Basic lowest selection
- **WHEN** `worst = lowest rolled 3` and rolled values are [{ face: 3, index: 0 }, { face: 6, index: 1 }, { face: 2, index: 2 }, { face: 5, index: 3 }]
- **THEN** `worst` contains [{ face: 2, index: 2 }, { face: 3, index: 0 }, { face: 5, index: 3 }] (ascending order)

#### Scenario: Lowest with N = 0
- **WHEN** `worst = lowest rolled 0` and rolled vector has 5 elements
- **THEN** `worst` is empty

### Requirement: Highest/Lowest are Vector Functions
`highest` and `lowest` SHALL be classified as vector functions. They SHALL accept a vector source and produce a vector result. They SHALL be chainable with other vector functions and scalar functions.

#### Scenario: Chain highest with sum (D&D attribute)
- **WHEN** pipeline is `best = highest rolled 3`, `total = sum best` and rolled is [1, 4, 6, 3]
- **THEN** `best` is [{ face: 6 }, { face: 4 }, { face: 3 }] and `total` is 13

#### Scenario: Chain filter then highest
- **WHEN** pipeline is `success = filter rolled where face >= 5`, `top = highest success 2` and rolled is [{ face: 6 }, { face: 4 }, { face: 5 }, { face: 3 }, { face: 6 }]
- **THEN** `success` contains [{ face: 6 }, { face: 5 }, { face: 6 }] and `top` contains [{ face: 6 }, { face: 6 }]
