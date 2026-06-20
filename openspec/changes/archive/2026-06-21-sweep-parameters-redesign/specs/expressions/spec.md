# Expressions Specification

## Purpose

Numeric value cells in the dice configuration (dice term count, dice term sides, pipeline literal, outcome condition value) are not just constants — they can be arithmetic expressions over two sweep variables `X` and `Y` and literal numbers. The expression language is small, total, and round-trippable through serialization (YAML, localStorage).

## ADDED Requirements

### Requirement: Expression AST

The expression language SHALL be represented as a recursive AST type `Expr` defined in `src/types/index.ts`:

```ts
type Expr =
  | { kind: 'literal'; value: number }
  | { kind: 'ref'; name: 'X' | 'Y' }
  | { kind: 'binop'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr };
```

#### Scenario: Literal expression
- **WHEN** the user enters `42` in a value cell
- **THEN** the cell stores `{ kind: 'literal', value: 42 }`

#### Scenario: Reference expression
- **WHEN** the user enters `X` in a value cell
- **THEN** the cell stores `{ kind: 'ref', name: 'X' }`

#### Scenario: Binary expression
- **WHEN** the user enters `X + 2` in a value cell
- **THEN** the cell stores `{ kind: 'binop', op: '+', left: { kind: 'ref', name: 'X' }, right: { kind: 'literal', value: 2 } }`

### Requirement: Expression Grammar

The parser SHALL accept the following grammar over the input characters:

- `expr := term (('+' | '-') term)*`
- `term := factor (('*' | '/') factor)*`
- `factor := number | 'X' | 'Y' | '(' expr ')' | ('-' | '+') factor`
- `number := -?\d+(\.\d+)?`

Whitespace between tokens SHALL be ignored. `X` and `Y` are case-sensitive and reserved names; they MUST NOT collide with numeric literals.

#### Scenario: Operator precedence
- **WHEN** the user enters `2 + 3 * 4`
- **THEN** the parser produces `2 + (3 * 4)` (the binop tree is `(2 + (3 * 4))`, evaluating to `14`)

#### Scenario: Parentheses
- **WHEN** the user enters `(2 + 3) * 4`
- **THEN** the parser produces `((2 + 3) * 4)`, evaluating to `20`

#### Scenario: Unary minus
- **WHEN** the user enters `-X + 1`
- **THEN** the parser produces `((-X) + 1)`

#### Scenario: Decimal numbers
- **WHEN** the user enters `1.5 * X`
- **THEN** the parser accepts and produces `{ kind: 'binop', op: '*', left: { kind: 'literal', value: 1.5 }, right: { kind: 'ref', name: 'X' } }`

### Requirement: Parse Errors

The parser SHALL return a discriminated result on bad input. A `string` that does not fully consume to a valid expression (unknown token, unmatched parenthesis, empty input, trailing characters) MUST yield a parse error containing the character position of the first unparseable token.

#### Scenario: Empty input
- **WHEN** the user clears a value cell to an empty string
- **THEN** the parser returns an error and the cell shows an inline message `Empty expression`

#### Scenario: Unknown token
- **WHEN** the user enters `X + foo` in a value cell
- **THEN** the parser returns an error pointing at `foo` and the cell shows `Unexpected token "foo"`

#### Scenario: Unmatched parenthesis
- **WHEN** the user enters `(X + 2` in a value cell
- **THEN** the parser returns an error `Missing ")"` and the cell shows the error inline

### Requirement: Evaluator

The evaluator SHALL take an `Expr` and a pair of variable values `{ x: number; y: number }` and return a single `number`. Division by zero SHALL return `0` (mirroring the existing `divide` semantics in `applyScalarBinary`). Evaluation is pure and side-effect-free.

#### Scenario: Literal evaluation
- **WHEN** the evaluator is given `{ kind: 'literal', value: 5 }` and `{ x: 0, y: 0 }`
- **THEN** it returns `5`

#### Scenario: Reference evaluation
- **WHEN** the evaluator is given `{ kind: 'ref', name: 'X' }` and `{ x: 7, y: 0 }`
- **THEN** it returns `7`

#### Scenario: Binop evaluation
- **WHEN** the evaluator is given `X + 2` and `{ x: 5, y: 0 }`
- **THEN** it returns `7`

#### Scenario: Division by zero
- **WHEN** the evaluator is given `X / 0` and `{ x: 5, y: 0 }`
- **THEN** it returns `0` (no exception thrown)

### Requirement: Pretty-printer

The pretty-printer SHALL round-trip: `parseExpr(exprToString(e))` equals `e` for every `Expr e`. The printer MUST NOT emit unnecessary parentheses around literal or reference subexpressions, MUST emit parentheses only when the precedence of the parent binop is lower than the precedence of the child binop, and MUST NOT emit whitespace inside the expression.

#### Scenario: Minimal parentheses
- **WHEN** `exprToString` is given `2 + 3 * 4`
- **THEN** it returns `2+3*4` (no parens around `3*4`)

#### Scenario: Required parentheses
- **WHEN** `exprToString` is given `(2 + 3) * 4`
- **THEN** it returns `(2+3)*4`

#### Scenario: Round-trip
- **WHEN** the pretty-printer is given `{ kind: 'binop', op: '-', left: { kind: 'ref', name: 'X' }, right: { kind: 'binop', op: '+', left: { kind: 'literal', value: 1 }, right: { kind: 'ref', name: 'Y' } } }`
- **THEN** it returns `X-(1+Y)` and `parseExpr('X-(1+Y)')` equals the input

### Requirement: Integer Coercion

A helper `exprToInteger(expr, { x, y }, { min: number; max: number })` SHALL evaluate the expression and coerce the result to an integer via `Math.round`, clamping to `[min, max]`. The function is used by the worker to materialize dice term counts and sides.

#### Scenario: Round and clamp
- **WHEN** `exprToInteger({ kind: 'ref', name: 'X' }, { x: 0.4, y: 0 }, { min: 1, max: 99 })` is called
- **THEN** it returns `1` (rounds to `0`, clamps to `1`)

#### Scenario: Clamp upper bound
- **WHEN** `exprToInteger({ kind: 'ref', name: 'X' }, { x: 250, y: 0 }, { min: 1, max: 99 })` is called
- **THEN** it returns `99`
