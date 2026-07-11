## Why

The sweep parameters X and Y are currently hardcoded names. When a preset uses X for "modifier" and Y for "DC" (Difficulty Class), the user sees the generic labels "X" and "Y" everywhere — in the Sweep Editor, in expression inputs, in result tables, and in the result chart. Renaming them to domain-meaningful names (e.g. "modifier", "DC") makes the tool more intuitive and reduces cognitive load when interpreting sweep results.

Additionally, the YAML preset format currently uses bare identifiers (`X`, `Y`) for variable references, which is ambiguous when arbitrary variable names are allowed. Moving to `{name}` curly-brace syntax in YAML makes sweep variable references unambiguous and visually distinct from pipeline references.

## What Changes

- **BREAKING** `SweepParameters` gains two string fields: `xName: string` (default `"X"`) and `yName: string` (default `"Y"`). The names MUST match the identifier pattern `/^[a-zA-Z_][a-zA-Z0-9_]*$/`.
- **BREAKING** The `Expr` ref kind changes from `{ kind: 'ref'; name: 'X' | 'Y' }` to `{ kind: 'ref'; name: string }` in `src/utils/expression.ts`. The name is a sweep parameter identifier matching the configured `xName` or `yName`.
- **BREAKING** YAML preset format: sweep variable references use `{name}` curly-brace syntax instead of bare identifiers. Examples: `{Modifier}d6`, `total + {DC}`, `total_mod >= {DC}`. The expression parser accepts both bare identifiers (UI input) and `{name}` (YAML input).
- **New** Two text fields in the Sweep Editor for naming X and Y, with defaults "X" and "Y".
- **Modified** `ExprInput` shows the configured parameter name in the variable dropdown instead of hardcoded "X" / "Y".
- **Modified** Result tables and chart axes use the configured parameter names instead of hardcoded "X" / "Y".
- **Modified** `SweepCostChip` readout uses parameter names.
- **Modified** `exprToString()` gains a `format` parameter (`'display'` / `'yaml'`). In `'yaml'` format, refs output as `{name}`. In `'display'` format (UI), refs output as bare name.
- **Modified** YAML serialization uses `exprToString(expr, 'yaml')` so refs appear as `{name}`.
- **Modified** YAML parsing (`parseExprFromText`) strips `{...}` from `{name}` patterns before calling `parseExpr`, so `{Modifier}` becomes a `ref` node with name `"Modifier"`.
- **Modified** Persistence: `SavedConfig.version` bumps to 10 (was 9). The v9→v10 migration adds `xName: "X"` and `yName: "Y"` to existing saved configs.
- **Modified** Built-in presets all gain `xName` and `yName` fields on their `sweep` object.

## Capabilities

### New Capabilities
- `named-sweep-parameters`: the ability to name X and Y sweep variables arbitrarily and reference them in expressions using those names.

### Modified Capabilities
- `sweep-parameters`: `SweepParameters` gains `xName` and `yName`; the UI shows those names; the result tables use them.
- `expressions`: `Expr` ref accepts any string; the parser accepts both bare identifiers and `{name}` syntax; `exprToString` supports YAML format.
- `persistence`: `SavedConfig` version 10 adds `xName`/`yName` to the sweep field.
- `presets`: all built-in presets include sweep parameter names.

## Impact

- `src/types/index.ts`: `SweepParameters` gains `xName: string`, `yName: string`.
- `src/utils/expression.ts`: `Expr` ref `name` changes from `'X' | 'Y'` to `string`; parser accepts identifiers and `{name}`; `exprToString` gains format param; `evalExpr` vars keyed by lowercased sweep name for backward compat.
- `src/utils/yaml.ts`: `parseSweep`/`serializeSweep` handle names; `parseExprFromText` strips `{...}`; YAML serialization uses `'yaml'` format.
- `src/components/SweepEditor.tsx`: adds two name text fields.
- `src/components/ExprInput.tsx`: dropdown shows dynamic parameter names.
- `src/components/ResultView.tsx`: uses sweep.param names instead of hardcoded "X" / "Y".
- `src/components/SweepCostChip.tsx`: uses parameter names.
- `src/state/app-state.ts`: `defaultSweep()`, `applyPresetConfig()`, `formatExprForNotation()` updated.
- `src/state/persistence.ts`: version bump to 10; v9→v10 migration adds names.
- `src/utils/validation.ts`: validate sweep parameter names.
- `src/domain/presets.ts`: all presets gain `xName`/`yName`.
- `doc/ttrpg/*.yaml`: update sweep variable references to `{name}` syntax.
- Tests: update all affected tests.
