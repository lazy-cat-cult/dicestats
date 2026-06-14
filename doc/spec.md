# Dice Probability Calculator — Specification

**Version:** 1.1.0  
**Status:** Source of truth for development  
**Last updated:** 2026-06-14

---

## 1. Overview

A single-page web application for calculating dice roll outcome probabilities in tabletop RPGs using the Monte Carlo method (1,000,000 iterations by default). The user configures a dice pool with tags, reroll/explode conditions, a resolution pipeline of named values, and outcome conditions — then receives probabilities in the form of tables and charts.

### 1.1 Goals

- Enable TTRPG players to calculate exact probabilities for complex dice mechanics (Vampire V5, Shadowrun, D&D, PbtA, custom systems)
- Provide a step-by-step wizard that guides users through configuration
- Run simulation in a Web Worker to keep the UI responsive
- Support saving and sharing configurations

### 1.2 Non-goals

- Real-time calculation (Monte Carlo is inherently discrete)
- Exact combinatorial solutions (simulation only)
- Multi-user collaboration or server-side persistence
- Localization (English interface only)

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Build | Vite | 8.x | Dev server, bundler, HMR |
| UI | Preact | 10.x | Component rendering (~3 KB) |
| Reactivity | Preact Signals | 2.x | State management without providers |
| Styles | Tailwind CSS | 4.x | Utility-first CSS |
| Charts | Chart.js | 4.x | Histograms, line charts |
| Simulation | Web Worker | — | Background computation without blocking UI |
| Testing | Vitest | 4.x | Unit and integration tests |
| Language | TypeScript | 6.x | Static typing |

### 2.1 Constraints

- **No server requests.** All computation runs client-side.
- **No external runtime dependencies** beyond the stack above.
- **Mobile-first responsive design.** Must work on 360px-wide viewports.

---

## 3. Conceptual Model

The workflow follows five sequential steps. Each step's output feeds into the next:

```
┌──────-───┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Gather   │───>│ Reroll   │───>│ Resolve  │───>│ Outcome  │───>│ Run      │
│ Dice Pool│    │Condition │    │Pipeline  │    │Definition│    │Simulation│
└───────-──┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 4. Data Model

### 4.1. Dice Pool

A dice pool is a flat list of dice terms. Each term represents a group of identical dice. Modifiers and keep rules are expressed through the resolution pipeline (§4.3) rather than as pool-level properties.

```typescript
interface DiceTerm {
  id: string;            // crypto.randomUUID(), stable across reorderings
  count: number;         // 1..99, default 1
  sides: number;         // 4,6,8,10,12,20,100, or custom 1..999
  tag: string;           // user-defined label, max 30 chars, default ""
}

interface DicePool {
  terms: DiceTerm[];
}
```

Constraints:
- At least one term must exist at all times.
- `count` must be >= 1 and <= 99.
- `sides` must be >= 1 and <= 999.
- Standard die options in UI: d4, d6, d8, d10, d12, d20, d100. A "custom" option allows arbitrary sides.
- `tag` is a free-text label used to differentiate dice in resolution. Tags are **not** required to be unique. Multiple terms may share a tag; tag-based operations match all dice from all terms with that tag.
- Keep and modifier functionality is expressed through the resolution pipeline using `keep_highest`, `keep_lowest`, `sum`, and `add` operations rather than as pool-level properties.

### 4.2. Reroll Conditions

Reroll conditions modify dice values **before** the resolution pipeline. They are evaluated in order (row order matters). Up to 10 conditions allowed.

```typescript
type RerollAction = 'reroll' | 'explode';

type ConditionOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';

type ConditionClause =
  | { field: 'face'; operator: ConditionOperator; value: number }
  | { field: 'tag'; operator: '=' | '!='; value: string };

type ConditionChain = {
  clauses: ConditionClause[];   // 1..10 clauses
  connector: 'and' | 'or';      // how multiple clauses combine
};

interface RerollCondition {
  id: string;
  action: RerollAction;
  conditions: ConditionChain;
  repeat: number;               // 1..99
                                // For 'reroll': max number of re-roll attempts
                                // For 'explode': max cascade depth (1 = one level)
  comment: string;              // max 100 chars
}
```

**Semantics:**
- **reroll:** If a die matches the condition, discard its value and roll again. The initial roll does not count as an attempt; `repeat` is the number of **additional** re-rolls. After `repeat` re-rolls, if the last value still matches, keep it anyway.
  - Example: `repeat: 1` with condition `= 1` means: if you roll a 1, re-roll once. If the re-roll is also a 1, keep it.
  - Example: `repeat: 3` means: up to 3 re-roll attempts. Keep the first non-matching result, or the 3rd re-roll regardless.

- **explode:** If a die matches the condition, keep its value AND add another die of the same type (same `sides` and `tag`). The added die can itself trigger further explosions. `repeat` controls max cascade depth: 1 = explode once only (no cascading), N = allow up to N levels of cascading explosions.
  - Safety cap: a single die cannot generate more than 100 extra dice from explosions in one iteration.

- Conditions are checked **per die**. A condition with `field: 'tag'` and `operator: '='` matches when the die's `tag` equals `value`. Other operators are not applicable to tags.

- Multiple reroll conditions are evaluated **in sequence**: condition 1 processes all dice (potentially adding new dice from explosions), then condition 2 operates on the **full updated set** including any new dice added by condition 1.

- Exploded dice inherit the same `sides` and `tag` as the original die that triggered the explosion.

### 4.3. Resolution Pipeline

Named values form an ordered pipeline. Each row references the output of previous rows. The first row always receives `rolled`, the flat array of dice values after reroll/explode/keep processing.

```typescript
type ConditionChain = {
  clauses: ConditionClause[];   // 1..10 clauses (reuses §4.2 type)
  connector: 'and' | 'or';
};

type VectorFunction =
  | { fn: 'filter';   conditions: ConditionChain }
  | { fn: 'remove';   conditions: ConditionChain }
  | { fn: 'keep_highest'; count: number }    // keep N highest dice by face value
  | { fn: 'keep_lowest';  count: number };   // keep N lowest dice by face value

type ScalarBinaryOp = 'add' | 'subtract' | 'multiply' | 'divide';

type ScalarFunction =
  | 'count'                                              // vector → scalar (number of elements)
  | 'sum'                                                // vector → scalar (sum of face values)
  | { fn: ScalarBinaryOp; operand: 'literal'; value: number }    // scalar op literal → scalar
  | { fn: ScalarBinaryOp; operand: 'named'; source2: string }     // scalar op named scalar → scalar
  | { fn: 'ceil' }                                              // scalar → scalar
  | { fn: 'floor' };                                             // scalar → scalar

type NamedValue =
  | { id: string; name: string; source: string; op: VectorFunction; comment: string }
  | { id: string; name: string; source: string; op: ScalarFunction;  comment: string };
```

The output type is **derived** from the operation, not stored:
- `filter` and `remove` always produce a **vector**.
- `keep_highest` and `keep_lowest` always produce a **vector**.
- `count` always produces a **scalar**.
- `sum` always produces a **scalar**.
- Binary math functions (`add`, `subtract`, `multiply`, `divide`) always produce a **scalar**.
- `ceil` and `floor` always produce a **scalar**.

**Rules:**
- `source` must reference `rolled` (built-in) or a named value defined in a **prior** row.
- For `{ fn: 'add'|'subtract'|'multiply'|'divide'; operand: 'named'; source2: string }`, `source2` must reference `rolled` or a named value defined in a **prior** row. It must produce a **scalar** type.
- `source` and `source2` must not be the same named value for binary operations (use a literal instead, or restructure the pipeline).
- If a referenced `source` or `source2` is deleted or moved below the current row, the row becomes **invalid** and must be highlighted in the UI.
- A simulation **must not run** when any row is invalid.
- `divide` by zero produces `0` (not Infinity or NaN).
- Pipeline rows are limited to **20**.
- Pipeline names must be unique and match `/^[a-zA-Z_][a-zA-Z0-9_]*$/`.

**Built-in sources:**
- `rolled`: the flat array of all dice face values after reroll/explode processing and keep rule application. Each element carries `{ face: number, tag: string }`.

### 4.4. Outcomes

Outcomes define what constitutes success, failure, or any named result.

```typescript
type OutcomeCondition =
  | 'none?'                                        // vector is empty (length === 0)
  | 'any?'                                         // vector has at least one element
  | { op: 'all?'; subCondition: ConditionOperator; value: number }  // all elements satisfy condition
  | { op: ConditionOperator; value: number };      // scalar comparison

interface Outcome {
  id: string;
  name: string;
  source: string;              // references a named value ID or 'rolled'
  conditions: OutcomeCondition[];  // evaluated per conditions
  connector: 'and' | 'or';    // how conditions combine: ALL must match (and) or ANY must match (or)
  comment: string;
  isDefault: boolean;          // fallback outcome when no other outcome matches
}
```

**Rules:**
- Outcomes are evaluated **in order**. First matching outcome wins (exclusive by default).
- At most **one** outcome may be marked `isDefault`. It matches only when no other outcome matches. Validation must enforce this.
- `source` must reference a named value ID or `rolled`. If invalid, the outcome is highlighted and simulation is blocked.
- For vector sources, `none?`, `any?`, and `all?` are valid conditions.
- For scalar sources, `{ op: ConditionOperator; value: number }` conditions are valid.
- `none?` and `any?` on a scalar source is a validation warning (they are not meaningful for scalars).
- `all?` on a scalar source is a validation warning.
- Maximum **10 outcomes**.
- Maximum **5 conditions per outcome**.

### 4.5. Parameters (Parameter Sweep)

Parameters allow sweeping over a range of values to see how probability changes.

```typescript
interface Parameter {
  id: string;
  label: string;               // display name, e.g. "Modifier"
  values: number[];            // array of values to iterate over
  target: 'pool.count' | 'pool.sides' | 'outcome.value' | 'pipeline.literal';
  targetTermId?: string;       // which DiceTerm to modify (by stable id)
  targetOutcomeId?: string;   // which Outcome to modify (for outcome.value)
  targetPipelineId?: string;  // which NamedValue to modify (for pipeline.literal)
}
```

**For `outcome.value` targeting:** When an outcome has multiple conditions with numeric values, the parameter modifies the **first** condition's `value` field. The UI must clearly indicate which condition is affected.

Each parameter value triggers a **full independent simulation** (1 million iterations). Multiple parameters multiply the total runs. The UI must warn if total iterations exceed 10 million, and require confirmation if they exceed 50 million.

Maximum **3 parameters** per configuration.

### 4.6. Simulation Results

```typescript
interface OutcomeResult {
  label: string;
  probability: number;    // 0..1
  count: number;          // raw count out of totalRolls
}

interface SimResult {
  label: string;                        // "" for single, "X=5" for parameterized
  outcomes: OutcomeResult[];
  totalRolls: number;
  distribution: Record<number, number>;  // key is the final scalar/sum value → frequency
}
```

**Distribution key:** The histogram key is determined as follows:
- If any pipeline row exists, the distribution uses the **last scalar pipeline value**.
- If no pipeline exists, the distribution uses the sum of all dice face values.
- This ensures the histogram always shows a meaningful distribution of numeric results.
- This ensures the histogram always shows a meaningful distribution of numeric results.

```typescript
interface SimJob {
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters?: Parameter[];
  iterations: number;       // default 1_000_000
}
```

---

## 5. Simulation Algorithm

### 5.1. Single Iteration

```
1. Roll all dice:
   For each DiceTerm t:
     Roll t.count dice, each yielding 1..t.sides
     Each die carries { face: rollValue, tag: t.tag }

2. Apply reroll conditions (in order):
   For each RerollCondition rc (in row order):
     For each die in the current result set:
       If die matches rc.conditions:
         If rc.action == 'reroll':
           Roll a replacement die with same sides
           Repeat up to rc.repeat additional times
           If still matches after all attempts, keep last value
         If rc.action == 'explode':
           Keep original die, add new die with same sides and tag
           New die can trigger further explosions up to rc.repeat cascade levels
           Safety cap: max 100 extra dice per original die per iteration
     After each condition finishes processing all dice,
     the next condition operates on the full updated set

3. Flatten result into a single array: rolled = [d1, d2, ..., dN]
    Each element: { face: number, tag: string }

 4. Calculate base sum for distribution:
    sum = Σ(all_dice.face)

5. Evaluate resolution pipeline (in row order):
    For each NamedValue row:
      source_value = lookup(row.source)
      If row.op is VectorFunction:
        If 'filter': apply filter conditions to source_value (vector of {face, tag})
        If 'remove': remove matching elements from source_value
        If 'keep_highest': keep N highest dice by face value, preserving original order
        If 'keep_lowest': keep N lowest dice by face value, preserving original order
        Result is a vector
      If row.op is ScalarFunction:
        If 'count': result = source_value.length (if vector) or error (if scalar)
        If 'sum': result = Σ(dice.face) for each die in source_value (if vector)
        If binary op with literal: result = source_value op row.op.value
        If binary op with named: result = source_value op lookup(row.source2)
        If 'ceil'/'floor': result = Math.ceil/floor(source_value)
      Store result under row.name

 6. Evaluate outcomes (in order):
   For each Outcome:
     source_value = lookup(outcome.source)
     Check each condition against source_value
     Combine conditions per outcome.connector (AND/OR)
     If outcome matches → record it, skip remaining outcomes

7. Record:
    - Distribution key: the last scalar pipeline value if any pipeline rows exist,
      otherwise the sum of all dice faces from step 4.
      Pipeline values are for outcome evaluation; the distribution always reflects
      the final computed result.
    - Which outcomes matched (for probability table)
```

### 5.2. Full Simulation

```
runSimulation(job: SimJob) → SimResult[]
  If no parameters:
    Run iterations (default 1,000,000)
    Aggregate outcome counts and distribution
    Return [SimResult with label = ""]
  
  If parameters:
    For each parameter value:
      Clone job, apply parameter value
      Run iterations
      Aggregate
    Return SimResult[] with labels = "Label=Value"
    
  Progress: report every 10,000 iterations and after each parameter completion
```

### 5.3. Cancellation

- The main thread can send `{ type: 'cancel' }` to terminate the worker.
- The worker checks for cancellation every 10,000 iterations.
- When the user navigates away from the results step, the active worker must be terminated.
- To re-run, the old worker must be terminated and a new one created. A new `run` message must not be sent to an active worker.

---

## 6. UI Specification

### 6.1. Layout

Single-column, centered (max-width 640px), vertically scrolling page. Four-step wizard at the top, content area below.

### 6.2. Steps

| Step | Title | Content |
|---|---|---|
| 1 | Dice Pool | `DicePoolEditor` — add/remove/edit dice terms, set count, sides, tag |
| 2 | Reroll & Resolve | Reroll conditions editor + Resolution pipeline editor |
| 3 | Outcomes | Outcome editor — add/remove/edit outcomes with conditions |
| 4 | Results | Parameter editor + Run button + Result table + Charts |

Steps 1–3 must be valid before the Run button is enabled.

### 6.3. Dice Pool Editor

- List of dice term rows. Each row: `[count] d[sides] [tag_input]` with remove (×) button.
- "Add die" button appends a new term (default: 1d20, tag "").
- Standard die sizes in dropdown: d4, d6, d8, d10, d12, d20, d100. Custom option shows numeric input.
- Tag input: text field with autocomplete from existing tags. Tags are displayed with auto-assigned colors for visual differentiation. Colors are assigned in order from a fixed palette: `['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']`. Tags in the dice notation preview appear as colored dots (●) next to the die notation.
- Live dice notation preview (e.g. "2d20 ●red + 4d6 ●blue").
- Minimum one term always present (delete disabled when only one remains).
- Keep rules and flat modifiers are expressed through the resolution pipeline (§4.3) using `keep_highest`, `keep_lowest`, `sum`, and `add` operations.

### 6.4. Reroll Conditions Editor

- Expandable table of reroll rules.
- Each row: `[action] if [conditions] repeat [N] // comment`
- Action dropdown: reroll / explode
- Conditions: compound condition editor with up to 10 clauses, each `[field] [op] [value]`, connected by AND/OR selector
- `field` dropdown: face / tag. When `tag`, `value` is a select from existing dice tags, `op` is `=` or `!=`. When `face`, `value` is a number input, `op` is any `ConditionOperator`.
- `repeat` number input (1..99, default 1, label changes to "Max cascade" for explode action)
- Move up/down buttons, delete button
- "Add condition" button (maximum 10 rows)
- Rows evaluate top-to-bottom; order matters
- Empty state: "No reroll conditions. Click '+' to add one."

### 6.5. Resolution Pipeline Editor

- Expandable table of named values.
- Each row: `[name] = [function]([source], [args]) // comment`
- `name` is a text identifier (alphanumeric + underscore, must be unique, max 30 chars)
- `source` dropdown: `rolled` or any previously defined named value
- `function` dropdown adapts based on source type:
  - Vector source: filter, remove, keep_highest, keep_lowest, count, sum
  - Scalar source: add, subtract, multiply, divide, ceil, floor
- For vector functions: compound condition editor (same as reroll conditions) for filter/remove; count input for keep_highest/keep_lowest
- For binary math functions: toggle between "literal" (number input) and "named value" (dropdown of prior scalar named values)
- For ceil/floor: no additional arguments
- Move up/down buttons, delete button
- Invalid references highlighted in red with tooltip explaining the error
- Type mismatch errors (e.g. `count` on scalar source) highlighted in red
- "Add named value" button (maximum 20 rows)
- Empty state: "No pipeline steps. Outcomes will reference rolled values directly."

### 6.6. Outcome Editor

- Expandable table of outcomes.
- Each row: `[name] when [conditions]`
- `name`: text identifier (max 40 chars)
- `source` dropdown: `rolled` or any pipeline named value (grouped by type: vectors vs scalars)
- Conditions: add/remove list, each condition is:
  - For vector sources: `none?` / `any?` / `all? [op] [value]` / `[op] [value]`
  - For scalar sources: `[op] [value]` (comparison)
- Connector: AND/OR toggle between conditions
- Checkbox: "Default outcome" (at most one; validation prevents second default)
- Delete button
- "Add outcome" button (maximum 10)
- Empty state: "Add at least one outcome to define success/failure conditions."

### 6.7. Parameter Editor

- List of parameters. Each: `[label] sweep [target] over [values]`
- `target` dropdown: Dice count, Dice sides, Outcome threshold, Pipeline literal
- When target is "Dice count/sides": show dice term selector dropdown
- When target is "Outcome threshold": show outcome selector dropdown and condition selector (first numeric condition of that outcome)
- When target is "Pipeline literal": show pipeline step selector dropdown (must be a binary op with literal operand)
- `values`: comma-separated list of numbers, or range notation `1..5` (inclusive, step 1). Range `5..1` is treated as `1..5` (auto-reversed).
- "Add parameter" button (maximum 3)
- Warning badge if total iterations > 10,000,000
- Confirmation dialog if total iterations > 50,000,000

### 6.8. Results View

- Probability table: outcome name, probability (percentage to 2 decimal places), raw count
- Distribution chart (Chart.js bar chart) when single simulation — shows histogram of sum/scalar values
- Parameter chart (Chart.js line chart) when parameter sweep — one line per outcome showing probability vs parameter value
- "Re-run" button
- Iteration count display ("1,000,000 iterations")
- Progress bar during simulation with cancel button

### 6.9. Presets

Quick-start buttons that fill in all steps with pre-configured values:

| Preset | Dice Pool | Reroll | Pipeline | Outcomes | Parameters |
|---|---|---|---|---|---|
| D&D 5e — d20 | 1d20 | none | none | "Hit" when rolled >= DC | DC sweep 5,10,15,20 |
| D&D 5e — Advantage | 2d20 | none | kept=keep_highest rolled count=1 | "Hit" when kept >= DC | DC sweep 5,10,15,20 |
| PbtA — 2d6 | 2d6 | none | none | "Miss" ≤6, "Partial" 7-9, "Full" ≥10 | — |
| Shadowrun — Xd6 | 5d6 | none | hits=filter rolled >=5; hit_count=count hits | "1+ hits" hit_count >=1 | dice count 1..10 |
| Vampire V5 | 3d10 tag:normal + 2d10 tag:hunger | none | (see §9.4) | (see §9.4) | — |

### 6.10. Save/Load

- "Save" button in header writes current config to `localStorage` under key `dice-calc-config`.
- Config is auto-loaded on page mount.
- "Clear" button removes saved config and resets to defaults.
- Saved config includes a `version` field (currently `2`) for future migration. Old configs (version `1` or missing) must be migrated on load.

---

## 7. Worker Protocol

```typescript
type WorkerMessage =
  | { type: 'run'; job: SimJob }
  | { type: 'cancel' };

type WorkerResponse =
  | { type: 'progress'; completed: number; total: number }
  | { type: 'result'; results: SimResult[] }
  | { type: 'error'; message: string };
```

- Worker is created fresh for each simulation run and terminated on completion, cancellation, or error.
- Worker must not import from domain modules that use Preact or DOM APIs.

---

## 8. Persistence Schema

```typescript
interface SavedConfig {
  version: number;              // schema version, currently 3
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters: Parameter[];
}
```

- Stored in `localStorage` under key `dice-calc-config`.
- On load, invalid references (e.g., a named value referencing a deleted source) must be **preserved but marked invalid** — not silently dropped.
- If `version` is missing, `1`, or `2`, migrate from old format (see §17).

---

## 9. Preset Examples

### 9.1. D&D 5e — Straight d20

```
Pool: 1d20
Reroll: none
Pipeline: (none)
Outcomes:
  "Hit" when rolled >= DC
Parameter: DC sweep 5, 10, 15, 20
```

### 9.2. D&D 5e — Advantage

```
Pool: 2d20
Reroll: none
Pipeline:
  kept = keep_highest rolled count=1
Outcomes:
  "Hit" when kept >= DC
Parameter: DC sweep 5, 10, 15, 20
```

### 9.3. Shadowrun 6e

```
Pool: 5d6
Reroll: none
Pipeline:
  hits = filter rolled >= 5
  hit_count = count hits
Outcomes:
  "At least 1 hit"  when hit_count >= 1
  "Glitch"  when hit_count = 0
Parameter: dice count sweep 1..10
```

### 9.4. Vampire: The Masquerade 5e

```
Pool: 3d10 tag:normal + 2d10 tag:hunger
Reroll: none
Pipeline:
  successes = filter rolled >= 6
  success_count = count successes
  crit_faces = filter rolled = 10
  crit_count = count crit_faces
  half_crits = divide crit_count by 2         -- crit_count / 2
  rounded_crits = floor half_crits            -- floor(crit_count / 2)
  double_crits = multiply rounded_crits by 2  -- 2 * floor(crit_count / 2)
  total_successes = add success_count double_crits  -- success_count + 2*floor(crit_count/2)
  hunger_crits = filter rolled tag=hunger >= 10
  hunger_crit_count = count hunger_crits
  bestial_faces = filter rolled tag=hunger <= 1
  bestial_count = count bestial_faces
Outcomes:
  "Success"            when total_successes >= TN AND total_successes > 0
  "Critical Success"   when crit_count >= 2
  "Bestial Failure"    when bestial_count >= 1 AND total_successes = 0
  "Failure"            (default)
Parameter: TN sweep 1..5
```

**Note:** The `add` operation uses `operand: 'named'` with `source2: 'double_crits'` to add two pipeline values: `success_count` + `double_crits`. The `multiply` and `divide` operations use `operand: 'literal'` with numeric values.

---

## 10. Validation Rules

The following conditions must be validated before enabling the Run button:

| # | Rule | Impact |
|---|---|---|
| 1 | At least one dice term exists | Block |
| 2 | All dice terms have count >= 1 and sides >= 1 | Block |
| 3 | At least one outcome exists | Block |
| 4 | No invalid pipeline references (source pointing to undefined or later row) | Block |
| 5 | No duplicate pipeline names | Block |
| 6 | Pipeline names match `/^[a-zA-Z_][a-zA-Z0-9_]*$/` | Block |
| 7 | At least one condition per outcome | Warning (not block) |
| 8 | Reroll conditions: repeat >= 1 | Block |
| 9 | Tag references in reroll/resolve conditions reference existing tags | Warning |
| 10 | Pipeline type mismatch: `count` or `sum` applied to scalar source | Block |
| 11 | Pipeline type mismatch: binary op applied to vector source | Block |
| 12 | At most one outcome with `isDefault = true` | Block |
| 13 | `source2` in binary ops must reference a scalar named value | Block |
| 14 | `all?` condition on scalar source | Warning |
| 15 | `none?` or `any?` on scalar source | Warning |
| 16 | Parameter sweep targets a valid term/outcome/pipeline literal | Block |
| 17 | Divide by zero in pipeline (literal value = 0) | Warning |
| 18 | Maximum 20 pipeline rows, 10 outcomes, 10 reroll conditions, 3 parameters | Block |

---

## 11. Performance Requirements

| Metric | Requirement |
|---|---|
| Simulation (1M iterations, ≤ 10 dice) | < 5 seconds on modern desktop |
| Simulation (1M iterations, 100 dice) | < 30 seconds |
| UI responsiveness during simulation | No freezing; progress updated every 10K iterations |
| Config save/load | < 100ms |
| Initial page load | < 2 seconds on 3G |
| Parameter sweep with 5 values | Reasonable to run (5 × 1M = 5M iterations) |
| Parameter sweep producing > 50M total iterations | Show confirmation dialog |

**Performance note on tags:** Tag-based filtering requires string comparisons. For large dice pools (100+ dice) with tag conditions, consider numeric tag IDs mapped at simulation start rather than per-iteration string comparison.

---

## 12. Accessibility

- All form inputs have associated `<label>` elements
- Color is never the sole indicator of state (icons/text labels alongside color)
- Keyboard navigation through the wizard (Tab, Enter, arrow keys for reordering)
- ARIA labels on interactive charts (Chart.js accessibility plugin)
- Focus management on step change (focus moves to step heading)
- ARIA live region for simulation progress announcements (screen readers)
- High-contrast compatible: error state uses red border + icon + tooltip, not red color alone
- Drag-and-drop reordering (pipeline/reroll rows) must have keyboard-accessible move-up/move-down buttons as alternative
- Minimum 44px tap targets on all interactive elements

---

## 13. Error Handling

| Scenario | Behavior |
|---|---|
| Invalid pipeline reference | Highlight row in red with ✗ icon, show tooltip "References undefined value 'X'" |
| Type mismatch in pipeline | Highlight row in red, show tooltip "Cannot apply count to scalar value" |
| Zero dice in pool | Disable Run button, show "Add at least one die" |
| No outcomes defined | Disable Run button, show "Add at least one outcome" |
| Simulation worker error | Display error message in results area, allow re-run |
| localStorage full | Silently ignore save, show toast "Could not save configuration" |
| Browser doesn't support Web Workers | Show fallback: "Your browser does not support Web Workers. Simulation is unavailable." |
| Parameter sweep > 50M total iterations | Confirmation dialog: "This will run {N} million iterations. Continue?" |
| Division by zero in pipeline | Result is 0 (not NaN or Infinity). Validation warns if literal divisor is 0. |

---

## 14. Mobile Considerations

- No horizontal scroll on 360px viewports
- Reroll/resolve tables scroll horizontally if needed
- Collapsible sections for reroll conditions and pipeline rows
- Touch-friendly button heights (min 44px tap target)
- Step wizard collapses to step numbers on narrow screens (< 480px)
- Condition editors use stacked vertical layout on mobile
- Charts are responsive and scrollable horizontally when needed

---

## 15. File Structure

```
dev/dice/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── main.tsx
│   ├── app.tsx
│   ├── style.css
│   ├── vite-env.d.ts
│   ├── types/
│   │   └── index.ts              # All domain types + compare()
│   ├── domain/
│   │   ├── roller.ts             # rollPool(), rollDie()
│   │   ├── reroll.ts             # applyRerollConditions()
│   │   ├── resolve.ts            # evaluatePipeline()
│   │   ├── classify.ts           # evaluateOutcome()
│   │   └── presets.ts            # Preset configs
│   ├── worker/
│   │   └── sim.worker.ts         # Web Worker simulation
│   ├── state/
│   │   ├── app-state.ts          # Preact Signals
│   │   └── persistence.ts        # localStorage save/load/migrate
│   ├── components/
│   │   ├── StepWizard.tsx
│   │   ├── DicePoolEditor.tsx
│   │   ├── RerollEditor.tsx       # Reroll conditions UI
│   │   ├── PipelineEditor.tsx    # Resolution pipeline UI
│   │   ├── OutcomeEditor.tsx
│   │   ├── ParameterEditor.tsx
│   │   ├── ResultView.tsx
│   │   ├── PresetSelector.tsx
│   │   └── DistributionChart.tsx
│   └── utils/
│       ├── format.ts             # formatPercent, formatNumber, formatRatio
│       └── validation.ts         # validateConfig()
├── tests/
│   ├── roller.test.ts
│   ├── reroll.test.ts
│   ├── resolve.test.ts
│   ├── classify.test.ts
│   ├── presets.test.ts
│   ├── validation.test.ts
│   └── integration.test.ts
└── public/
    └── favicon.svg
```

---

## 16. Test Coverage Requirements

| Category | Tests |
|---|---|
| Dice rolling | Standard rolls, explode once, explode recursive, keep highest/lowest, mixed pools |
| Reroll conditions | Reroll matching, multiple conditions in sequence, tag-based conditions, cascade limits, safety cap |
| Resolution pipeline | Filter, remove, count, scalar math (literal and named operands), invalid references, chained operations |
| Outcome evaluation | Threshold, pool success, combined conditions (AND/OR), default outcome, `all?` with sub-condition |
| Validation | All rules from §10 |
| Integration | D&D advantage, PbtA 2d6, Shadowrun hits, Vampire V5 |
| Worker | Progress reporting, cancellation, parameter sweep |
| Persistence | Save, load, migration from v1 format |

---

## 17. Migration Notes (from current implementation)

The current implementation has the following significant differences from this spec:

### Key differences

| Aspect | Current (v1) | Spec (v2) |
|---|---|---|
| `DiceTerm` | No `id`, no `tag` | Has `id` (UUID), `tag` |
| `DicePool` | `keep?: KeepRule`, `explode?: ExplodeMode` | `keep?: KeepRule`, no `explode` (moved to `RerollCondition`) |
| Outcomes | `ThresholdOutcome \| PoolSuccessOutcome` | Unified `Outcome` with `source`, `conditions[]`, `connector` |
| Parameters | `applyTo: 'modifier' \| 'count' \| 'threshold_value'` | `target: 'pool.count' \| 'pool.modifier' \| 'pool.sides' \| 'outcome.value'` with ID references |
| Reroll/Explode | Pool-level `ExplodeMode` enum | Per-condition `RerollCondition[]` with compound conditions |
| Resolution | None | `NamedValue[]` pipeline with filter/remove/count/math |
| Comparison operators | `'=='` | `'='` (user-facing) |

### Known bugs in current implementation

- `roller.ts:57`: `allKept` pushes original `termRolls` instead of kept values — `rollPool` keep logic is buggy
- `app.tsx:17`: `configLoaded` flag via closure is not idiomatic Preact; should use `useEffect`
- `sim.worker.ts:29-38`: `keepHighest`/`keepLowest` sort by value, losing tag information on kept dice
- Russian-language strings in `presets.ts` and `app-state.ts` must be replaced with English

### Migration phases

**Phase 1: Dice tags** (low risk)
- Add `id` and `tag` fields to `DiceTerm`. Existing code creates terms without these; add defaults (`id: crypto.randomUUID()`, `tag: ""`).
- Update `DicePoolEditor` to include tag input with color indicator.
- Update roll logic to propagate `{ face, tag }` instead of plain `number`.

**Phase 2: Reroll conditions** (medium risk)
- Add `RerollCondition` type and `ConditionClause`/`ConditionChain` types.
- Create `RerollEditor` component.
- Add `domain/reroll.ts` with `applyRerollConditions()`.
- Replace `DicePool.explode` with `RerollCondition[]`. Presets using `ExplodeMode` must be converted.
- Integrate into simulation worker.

**Phase 3: Resolution pipeline** (high risk — combined with Phase 4)
- Add `NamedValue` type with `VectorFunction` and `ScalarFunction`.
- Create `PipelineEditor` component.
- Add `domain/resolve.ts` with `evaluatePipeline()`.
- Integrate into simulation worker.
- Wire outcomes to pipeline outputs.
- **Must be done together with Phase 4** because outcomes need to reference pipeline named values.

**Phase 4: Outcome refactor** (combined with Phase 3)
- Replace `ThresholdOutcome` and `PoolSuccessOutcome` with unified `Outcome` type.
- Update `OutcomeEditor` to reference pipeline values via `source` field.
- Validate outcome references against pipeline.
- Convert presets to new outcome format.

**Phase 5: Validation and UX polish**
- Add `validation.ts` with `validateConfig()`.
- Add inline validation highlighting with error tooltips.
- Add parameter sweep warnings.
- Mobile layout fixes.
- English localization of all UI strings.
- Fix `rollPool` keep bug.
- Add `version` field to saved configs and migration logic.

### Persistence migration

Old configs (version 1 or missing) must be converted on load:
- Add `id` and `tag` to each `DiceTerm`
- Convert `explode` to `RerollCondition` if present
- Convert `ThresholdOutcome` / `PoolSuccessOutcome` to unified `Outcome`
- Convert `Parameter.applyTo` to new `target` format
- Add empty `pipeline` and `rerollConditions` arrays

---

## 18. Open Questions

| # | Question | Resolution |
|---|---|---|
| 1 | Should `all?` require a sub-condition? | **Resolved**: Yes. `all?` includes a sub-condition: `{ op: 'all?'; subCondition: ConditionOperator; value: number }`. All dice in the vector must satisfy the sub-condition. |
| 2 | Should outcomes be exclusive by default? | **Resolved**: Yes. First matching outcome wins. Add `isDefault` for fallback. |
| 3 | Can the pipeline combine two named values? | **Resolved**: Yes. Binary scalar operations accept `operand: 'named'` with `source2` field. |
| 4 | Maximum pipeline rows? | **Resolved**: 20 rows. |
| 5 | Should presets store full configuration? | **Resolved**: Yes — pool, reroll, pipeline, outcomes, and parameters. |
| 6 | URL-based config sharing? | **Future**: Not in v2. Consider for v3. |
| 7 | Distribution histogram key after pipeline? | **Resolved**: Always use the sum of kept rolls + modifiers. Pipeline values are for outcomes, not distribution. |
| 8 | `Comparison` operator: `=` vs `==`? | **Resolved**: Use `=` in user-facing types (`ConditionOperator`). Convert to `===` at runtime. |

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| Dice pool | The complete set of dice to roll in a single iteration |
| Dice term | A group of identical dice (e.g. "3d6") |
| Tag | A user-assigned label on a dice term for differentiation in resolution |
| Reroll | Replace a matching die's value with a fresh roll |
| Explode | Keep matching die and add an extra die of the same type |
| Resolution pipeline | Ordered sequence of named transformations on roll results |
| Named value | An intermediate result in the pipeline, referenced by name |
| Outcome | A named condition on pipeline results that determines success/failure |
| Parameter sweep | Running simulation multiple times with varying input values |
| Keep rule | Select N highest or lowest dice from a pool (implemented via pipeline `keep_highest`/`keep_lowest`) |
| Condition chain | A compound condition with multiple clauses connected by AND/OR |

---

## Appendix B: Edge Cases

1. **Reroll + tag**: A reroll condition with `field: 'tag', value: 'hunger'` matches only dice tagged "hunger". Other dice are unaffected.
2. **Explode + keep**: Explosion adds dice **before** the resolution pipeline. Keep operations in the pipeline operate on the full post-explosion pool.
3. **Empty pipeline**: If no pipeline rows exist, outcomes reference `rolled` directly.
4. **Scalar type mismatch**: Using `count` on a named value that is already a scalar is a validation error (§10 rule 10).
5. **Explode safety cap**: A single original die cannot generate more than 100 extra dice from explosions in one iteration. This is per-original-die, not per-term.
6. **Parameter sweep multiplication**: If two parameters exist with 5 values each, total runs = 5 × 5 × 1,000,000 = 25,000,000. UI must warn at 10M and confirm at 50M.
7. **Divide by zero**: Pipeline `divide` operations with a literal `0` produce a validation warning. At runtime, division by zero returns `0`.
8. **Keep on empty pool**: If keep rule says "keep highest 3" but only 2 dice exist, keep all dice.
9. **Reroll on reroll**: After condition 1 rerolls a die, condition 2 sees the new value. Conditions cascade through the full list.
10. **Same source twice in binary op**: `source` and `source2` pointing to the same named value is allowed (e.g. `double_count = multiply count by 2` via literal, or `difference = subtract A from A` which is valid but produces 0).