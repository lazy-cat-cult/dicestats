# Parameters Specification (delta)

## REMOVED Requirements

### Requirement: Parameter Structure
The `Parameter` type and its per-cell `ParameterTarget` selector are removed. A single sweep variable list (`SweepParameters.x`) replaces the per-cell `Parameter` declaration. See the `sweep-parameters` capability for the new model.

**Reason:** Replaced by the X / Y sweep model — every swept cell is now a numeric expression containing `X` or `Y`, so the per-cell `Parameter` array is no longer needed.

**Migration:** v7 configs in `localStorage` and YAML presets are migrated to v8: each old `Parameter` is converted to `ref X` in its targeted cell and its `values` are merged into `sweep.x` (deduplicated, sorted). See the `persistence` spec for the full migration.

### Requirement: Outcome Value Targeting
A parameter no longer "targets" the first scalar condition of an outcome. Instead, the outcome's condition `value` is an `Expr` that may contain `X` / `Y` references.

**Reason:** Replaced by the expression model.

**Migration:** Old `outcome.value` parameters become `ref X` in the targeted outcome's first condition value; the parameter's `values` are merged into `sweep.x`.

### Requirement: Pipeline Literal Targeting
A parameter no longer "targets" a binary-math-literal pipeline row. Instead, the pipeline literal's `value` is an `Expr` that may contain `X` / `Y` references.

**Reason:** Replaced by the expression model.

**Migration:** Old `pipeline.literal` parameters become `ref X` in the targeted pipeline row's literal value; the parameter's `values` are merged into `sweep.x`.

### Requirement: Parameter Limit
The "maximum of 3 parameters" cap is removed. The new model has at most two parameter lists (X and Y), each capped at 10 values.

**Reason:** Replaced by the value-count cap (10 per parameter).

**Migration:** None — the old cap is gone; configs that had 3 parameters collapse to one X sweep.

### Requirement: Value Specification Format
The old "comma-separated or `a..b` range" format is moved to the `sweep-parameters` spec (X and Y value fields).

**Reason:** The format spec is now a property of the sweep variables, not of a generic `Parameter`.

**Migration:** None.

### Requirement: Iteration Warning Thresholds
The 10M warning and 50M confirmation thresholds are preserved in the `sweep-parameters` spec.

**Reason:** The thresholds still apply; the wording is now sweep-specific.

**Migration:** None.
