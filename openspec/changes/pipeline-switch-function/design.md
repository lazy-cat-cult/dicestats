## Context

The pipeline currently supports deterministic scalar functions (`count`, `sum`, `max`, `min`, `sub`, binary math, `ceil`, `floor`) and vector functions (`filter`, `remove`). All produce a single result from their source — there is no branching based on runtime conditions. Users need conditional value selection for common TTRPG patterns: critical hit modifiers, fumble penalties, threshold-based bonuses.

The `switch` function introduces conditional branching: an ordered list of (value, condition) pairs evaluated against named scalar values from prior pipeline rows. The source value acts as the default when no condition matches.

The simulation core remains unchanged — `switch` evaluation happens once per pipeline row during `evaluatePipeline()`, just like any other scalar function. No condition evaluation happens inside the Monte Carlo loop beyond the existing pipeline evaluation.

## Goals / Non-Goals

**Goals:**
- A `switch` scalar function that selects a value from ordered branches based on runtime conditions
- Source value is the implicit default when no branch matches
- Branches support the full `ConditionOperator` set: `>`, `>=`, `<`, `<=`, `=`, `!=`, `is_even`, `is_odd`
- Branch values support both literal `Expr` and named scalar references (same `ScalarBinaryTerm` type used by binary math)
- Conditions compare a named scalar value against a literal `Expr` or apply a unary operator (`is_even`, `is_odd`)
- 1–10 branches per switch
- Clean YAML serialization for presets
- Backward-compatible: existing configs and presets are unaffected

**Non-Goals:**
- No vector-to-vector switching (switch is scalar-only)
- No nested switch expressions
- No `is_min`/`is_max` in switch conditions (they are dice-pool-relative operators, meaningless for scalars)
- No boolean combinator conditions (`and`/`or` within a single branch condition) — each branch has exactly one atomic condition
- No switch on the source value itself as an implicit comparison target — conditions always specify explicit `condition.source`
- No new presets using switch (feature is opt-in for user configurations)

## Decisions

### 1. Branch value reuses `ScalarBinaryTerm`

**Decision:** Each branch's `value` is a `ScalarBinaryTerm` — `{ operand: 'literal'; value: Expr }` or `{ operand: 'named'; source2: string }`. This is the exact same type used by `add`/`subtract`/`multiply`/`divide` terms.

**Rationale:** No new type needed. The runtime resolves `named` terms against the pipeline environment and `literal` terms against the expression evaluator — exactly the same path. The UI can reuse the existing term editor components.

**Alternatives:** Create a separate `SwitchValue` type — rejected, duplicates logic with no benefit.

### 2. Condition is a separate `SwitchCondition` type, not a `ConditionClause`

**Decision:** `SwitchCondition` has `{ source: string; op: ConditionOperator; value?: Expr }`. Unlike `ConditionClause` (which has `field: 'face' | 'tag'`), switch conditions always operate on a named scalar value, not on dice fields.

**Rationale:** `ConditionClause` is tied to dice inspection (`field: 'face'`, `field: 'tag'`). Switch conditions inspect pipeline scalars — a different domain. Overloading `ConditionClause` would create an awkward union with `field: 'value'` and muddy the type. A clean separate type keeps validation and evaluation straightforward.

**Alternatives:** Extend `ConditionClause` with a new `field: 'scalar'` variant — rejected, `ConditionClause` is already complex enough and adding another field variant would require cascading changes in `matching.ts`.

### 3. `is_min` and `is_max` are excluded from switch conditions

**Decision:** Switch conditions support `>`, `>=`, `<`, `<=`, `=`, `!=`, `is_even`, `is_odd`. They do NOT support `is_min` or `is_max`.

**Rationale:** `is_min`/`is_max` are meaningless for a standalone scalar — "is this scalar the minimum?" requires a dice pool context to compare against. `is_even`/`is_odd` work on any integer scalar independently.

**Alternatives:** Support all 10 `ConditionOperator` values — rejected, validation would need to detect and reject `is_min`/`is_max` anyway since the condition has no dice pool context. Explicitly excluding them in the type is cleaner.

### 4. No implicit comparison against source

**Decision:** `condition.source` is always an explicit named value. The switch does NOT implicitly compare `condition.source` against the row's `source`.

**Rationale:** The user's example uses `main_value` in both the source and conditions (`total = main_value switch: crithit if main_value = 10`), but other use cases may compare against different values (`bonus = base switch: +5 if advantage_count > 0`). Making the comparison target explicit avoids ambiguity.

**Alternatives:** Implicitly compare against the row's source — rejected, limits expressiveness. Allow both implicit (source default) and explicit — rejected, adds complexity.

### 5. Condition evaluation uses `compare()` from types

**Decision:** Switch condition evaluation uses the existing `compare(a, op, b)` function for `>`, `>=`, `<`, `<=`, `=`, `!=` operators, and direct `% 2` checks for `is_even`/`is_odd`.

**Rationale:** `compare()` is already tested, handles all 6 comparison operators, and lives in `src/types/index.ts` — the domain layer already imports it. No new comparison logic.

### 6. YAML syntax uses inline `if` keyword

**Decision:** The short-form YAML syntax for presets is:
```yaml
- total = main_value switch:
    - crithit if main_value = 10
    - critmiss if main_value = 1
    - -2 if critmiss < 0
```

**Rationale:** Matches the user's proposed syntax. The `if` keyword clearly separates the value from the condition. Named values are referenced by name (no quotes needed for simple names). Literal numbers are bare. The structured YAML form mirrors the structured type.

**Alternatives:** Use `when`/`then` syntax — rejected, `if` is more familiar and shorter. Use a pipe-delimited single line — rejected, multi-line is more readable for presets.

### 7. Default fallback is the source value

**Decision:** When no branch condition matches, `switch` returns the source value. There is no explicit `else`/`default` branch.

**Rationale:** The source is already a concrete value in the pipeline environment. Using it as the default is the most intuitive behavior and matches the user's example where `main_value` is the fallback. Adding an explicit `else` branch would be redundant (the user can make the last branch's condition always-true if they want a different default).

**Alternatives:** Require an explicit `else` branch — rejected, adds mandatory UI friction for the common case. Return 0 on no match — rejected, surprising behavior.

## Risks / Trade-offs

- **Risk:** Users may create circular conditions (e.g., `switch` on `a` with condition source `b` where `b` depends on `a`). → **Mitigation:** Validation enforces that `condition.source` and branch `value.source2` must reference values defined in prior rows. The existing source-ordering validation catches forward references.
- **Risk:** The branch editor UI for `PipelineEditor` adds complexity to an already complex component. → **Mitigation:** Reuse the existing `ScalarBinaryTerm` editor patterns (literal vs. named toggle) and add a condition row with source dropdown + operator dropdown + value input. The UI complexity is bounded — 1–10 branches, each with 2–3 controls.
- **Risk:** `is_even`/`is_odd` on non-integer scalars produce confusing results. → **Mitigation:** `is_even`/`is_odd` apply to the numeric value directly (`value % 2 === 0`). Float values like `3.5 % 2 === 1.5` are truthy but odd in behavior — validation can add a non-blocking warning for float condition sources (out of scope, future enhancement).
- **Risk:** Branch evaluation order matters (first match wins), but the UI might reorder branches. → **Mitigation:** Branches are displayed in declaration order. Drag-and-drop reordering is a future enhancement; the spec guarantees first-match-wins evaluation.

## Open Questions

- Should `condition.value` support references to named values (e.g., `if main_value > threshold` where `threshold` is another named value), or only literal `Expr`? Resolved for now: literal `Expr` only (which includes `X`/`Y` references for sweep). Named reference support can be added in a follow-up if needed.
- Should the switch function be limited to 10 branches? Resolved: yes, 10 branches, matching the existing 10-clause limit for `ConditionChain` and 10-outcome limit. This keeps the UI manageable and the spec consistent.
