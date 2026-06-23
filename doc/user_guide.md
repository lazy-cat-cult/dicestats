# User Guide — Dice Probability Calculator

## Overview

A single-page probability calculator for tabletop RPG dice. Simulates one million dice pool rolls (and more via sweep), runs them through a resolution pipeline, and shows probabilities for user-defined outcomes. The simulation runs in the background — the UI stays responsive throughout.

## Quick Start

1. Open the page.
2. Pick a preset from the top bar (e.g., "D&D 5e") or configure manually.
3. Click **Roll the Dice** — probabilities appear in seconds.
4. To see how probabilities change with different parameters, set up a sweep in Step 01 (e.g., vary a bonus from +0 to +5).
5. For deeper analysis, click **Details & Statistics**.

---

## Interface — Step by Step

### Preset Rail (top area)

Manages presets and the current configuration.

- **Preset pills** — up to 4 quick-access shortcuts. On first visit these are randomly selected built-in presets. After you use the app they show your favorites, recent presets, and recently updated My Presets. Click a pill to load that preset.
- **All ▾** — opens the preset library with search, tab filters (All / My Presets / Favorites), and management actions (rename, copy, delete).
- **Name** — the current configuration's name. Click to edit; Enter saves, Esc cancels.
- **New** — resets all fields to defaults.
- **Export** — downloads the current config as a YAML file.
- **Import** — loads a configuration from a `.yaml` / `.yml` file.
- **Save** — saves the current config to My Presets. If it matches a built-in preset, you'll be prompted to save a copy instead.
- **Share URL** — copies a link with the compressed configuration. Opening such a link loads the config automatically.

### Step 01 — Sweep Parameters

Two independent variables, X and Y. Type a number or expression containing X or Y in any value cell below. Y produces one result section per value; each section contains the full X sweep.

- **Name fields** — custom identifiers for X and Y (letters, numbers, underscores only).
- **Value fields** — comma-separated list of numbers. Range notation supported: `1..10` expands to `1,2,3,4,5,6,7,8,9,10`.
- **Clear buttons** — clear an axis.
- **Cost display** — shows total number of rolls (highlighted when exceeding 1M).

**Important:** each sweep value runs 1M rolls. 10 X values = 10M rolls. A 5×5 sweep = 25M rolls. If total rolls exceed 10M, a warning is shown. If they exceed 50M, the button requires explicit confirmation.

Both X and Y are capped at 10 values each.

### Step 02 — Dice Pool

Defines which dice are rolled, how many, and their tags.

- **Count** — number of dice. Accepts a literal number or an expression using X/Y.
- **d (sides)** — number of faces. Choose from standard dice (d4, d6, d8, d10, d12, d20, d100) or select `custom` for arbitrary values / X/Y expressions.
- **Tag** — grouping label (max 30 chars). Dice with the same tag share a border color.
- **Comment** (toggled by the Comments checkbox) — free-text note.
- **Add / Remove** — add or remove dice terms. The remove button is hidden when only one term remains.

A live dice notation preview is displayed above the editor (e.g., `2d20, 1d6 <bonus>`).

Limits: count 1–99, sides 1–999.

### Step 03 — Additional Dice Rolls

Rules that modify individual die results after rolling. Optional.

Each condition consists of:

- **if** — a [condition chain](#condition-chain-editor): which dice are affected.
- **then** — action:
  - **Reroll** — re-roll the die up to N times, stopping when it no longer matches the condition.
  - **Explode** — add an extra die and continue as long as the condition is met. The repeat field label changes to "Max cascade depth".
- **max times / Max cascade depth** — 1–99. For explode, capped at 100 extra dice per original die.
- **tag as** — re-tag affected dice (max 30 chars). If empty, the original tag is kept.
- **Comment** (toggled by the Comments checkbox) — free-text note.

Conditions apply in order. Use up/down arrows to reorder. Maximum 10 conditions.

### Step 04 — Resolution Pipeline

Transforms dice into named values — either numbers (scalars) or die arrays (vectors). Each step builds on the previous one.

Syntax:

```
[name] = source.function(params)
```

**Source** is either `rolled` (the original dice) or the name of a previous step.

**Name rules:** letters, numbers, and underscores only. Must start with a letter or underscore. Duplicate names are not allowed.

**Comment** — each step has an optional comment field (toggled by the Comments checkbox).

**Vector → vector:**

| Function | Description |
|---|---|
| `filter` | Keep dice matching a [condition chain](#condition-chain-editor) |
| `remove` | Remove dice matching a condition chain |

**Vector → scalar:**

| Function | Description |
|---|---|
| `count` | Number of dice |
| `sum` | Sum of all face values |
| `max` | Maximum face value |
| `min` | Minimum face value |
| `sub` | Sequential subtraction (first die minus the rest) |

**Scalar → scalar:**

| Function | Description |
|---|---|
| `add`, `subtract`, `multiply`, `divide` | Binary operation with literals or references to other scalars. Add multiple terms with the "+ term" button. |
| `max` | Larger of two scalars |
| `min` | Smaller of two scalars |
| `ceil` | Round up |
| `floor` | Round down |
| `switch` | Conditional branching (max 10 branches). Each branch checks a condition on a scalar and returns a value. Supported operators: `>`, `>=`, `<`, `<=`, `=`, `!=`, `is_even`, `is_odd`. |

**Validation:** the editor highlights errors inline (invalid name, unknown source, circular reference, type mismatch).

**Limit:** maximum 20 rows.

### Step 05 — Outcomes

Defines the categories each roll is sorted into.

Each outcome:

- **Name** — shown in results (max 40 chars).
- **Conditions (1–5)** — checks joined by AND / OR connectors.
- **Comment** (toggled by the Comments checkbox) — free-text note.

**Scalar condition** (for numeric sources):

```
when {source} {operator} {value}
```

Operators: `>=`, `>`, `<=`, `<`, `=`, `!=`.

**Dice condition** (for die-array sources like `rolled`):

```
when {source} {any/all/none} dice {operator} {value}
```

- `any` — at least one die satisfies the condition.
- `all` — every die satisfies.
- `none` — no die satisfies.

If a roll matches none of the outcomes, it falls into **Not matched** (its probability is non-zero only when outcomes don't cover all cases).

Limit: 10 outcomes, 5 conditions per outcome.

---

## Condition Chain Editor

Used in Additional Dice Rolls (Step 03) and Pipeline filter/remove (Step 04). A set of clauses joined by AND / OR.

Each clause:

- **field**: `face` (die face value) or `tag` (die tag).
- **operator**: for face — `>=`, `>`, `<=`, `<`, `=`, `!=`, `is_min`, `is_max`, `is_even`, `is_odd`. For tag — `=`, `!=`.
- **value**: number/expression for face, or a tag name from the dropdown for tag.

Operators `is_min`, `is_max`, `is_even`, `is_odd` don't need a value.

Limit: maximum 10 clauses.

---

## Expressions

You can enter mathematical expressions in Count, Sides, threshold values, and pipeline numeric fields:

- **Literals:** `1`, `42`, `3.14`
- **Variables:** `X`, `Y` (referencing sweep values; variable names match what you set in sweep name fields)
- **Operators:** `+`, `-`, `*`, `/`
- **Parentheses:** `(2 + X) * 3`

A **num/var toggle** lets you switch between entering a number and referencing a sweep variable.

Invalid expressions show an inline error below the field.

---

## Running the Simulation

Once all steps are configured:

1. Check for blocking errors below the button.
2. Click **Roll the Dice**.
3. A progress indicator shows the simulation status.
4. Results appear in the right panel.

The **sticky bottom bar** works like this:

- `Roll the Dice` — initial state (sub-label shows total iteration count).
- `Running…` — during the simulation.
- `Roll the Dice Again` — after results are available.
- **Sample** — runs a single roll and shows a detailed trace (see below). Available when config is valid.
- **Cancel** — stops the simulation. Only visible while running.

---

## Results

### Odds Tape (compact view)

Shown immediately after a single-run simulation:

- The preset name (if any).
- **Top Probability** displayed in large type.
- All outcomes sorted by probability, each with a proportional bar.
- Outcome count and roll count.

### Probability Table

- **Single run:** outcome name, probability, and count.
- **X-sweep:** horizontally scrollable table with X values as rows and outcomes as columns.
- **X+Y sweep:** grouped by Y — each Y section contains a full X table.

If outcomes overlap (a roll matches more than one), their probabilities sum to over 100% — noted under the table.

### Distribution Chart

- **Single run:** bar chart of outcome probabilities.
- **Sweep with X only:** line chart of probabilities across X values.

---

## Sample View

The **Sample** button runs one roll and shows:

- **Dice Pool** — each die with its face value (editable — change and press Enter / blur to re-trace).
- **Reroll Events** — the reroll/explode chain for each die.
- **Sweep** — current X/Y values (editable when sweep is active).
- **Resolution Pipeline** — intermediate values at each step.
- **Outcomes** — matched (✓) and unmatched (✗) outcomes.

Useful for debugging complex pipelines and understanding reroll behavior.

The **Roll Again** button generates a new random sample.

---

## Details & Statistics (modal)

Opened via the **Details & Statistics** button under the results.

### Y / X Selector

If a sweep is active — buttons to pick a specific Y and X value.

### Outcome Chart

A larger bar chart of the outcome distribution.

### Distribution Shape

Statistics of the last scalar value in the pipeline:

- Percentiles: P05, P25, P50 (median), P75, P95
- Mean, Std Dev, Skewness

### Outcome Probabilities with 95% Wilson CI

A table with Outcome, Probability, Count, and 95% CI columns.

### Sensitivity (when sweep X has more than one value)

- **Marginal Effect / +1** — average probability change when the sweep X variable increases by 1.
- **Break-Even (P = 50%)** — the sweep X value where the outcome's probability reaches 50%.

### Multi-Label Co-occurrence

- **Shannon Entropy** (bits) — how evenly probabilities are spread. Higher = more uniform.
- **Effective Outcomes** — 2^H. Close to outcome count = well-separated categories. Close to 1 = nearly all rolls land in one category.
- **Pairwise Overlaps** — outcome pairs that occurred together, with probability and LIFT. LIFT > 1 indicates positive correlation.
- **Top Match-Sets** — most frequent outcome combinations, sorted by frequency.

---

## Working with Presets

### Built-in Presets

Shipped with the app (10 presets):

- D&D 5e
- D&D 5e - Additional Die
- PbtA
- Blades in the Dark
- Savage Worlds
- Daggerheart
- Cyberpunk RED
- Shadowrun 6
- Fate
- Year Zero - Push

### Preset Pills on the Rail

The top rail shows up to 4 presets as clickable pills. The selection logic:

1. Starred favorites appear first.
2. Recently opened presets follow.
3. Recently updated My Presets follow.
4. If nothing from the above exists (first visit), 4 built-in presets are randomly selected.

### My Presets

- Saved in your browser. Up to 100 presets.
- Management: rename, copy, delete (via the ⋮ menu or the Copy button on standard presets).
- Favorites (⭐) — starred presets appear first in the library and on the top bar.
- Saving a built-in preset under the same name prompts you to save a copy.

### Export / Import (YAML)

- **Export** — downloads the current config as a `.yaml` file.
- **Import** — loads a `.yaml` / `.yml` file. If a preset with the same name already exists, its configuration is replaced with the imported values. Otherwise it's added to My Presets.

Example YAML file (`D&D 5e`):

```yaml
id: dnd-d20
name: D&D 5e
pool:
  - 1d20
pipeline:
  - rolled_value = sum rolled
  - total_bonus = rolled_value + {Bonus}
outcomes:
  - Hit when total_bonus >= {DC} or rolled_value = 20 and rolled_value != 1
  - Miss when total_bonus < {DC} or rolled_value = 1 and rolled_value != 20
sweep:
  x:
    - 2
    - 5
    - 7
    - 10
    - 12
    - 15
  xName: Bonus
  yName: DC
  y:
    - 10
    - 15
    - 20
```

### Share URL

- **Share URL** copies a link with the compressed configuration.
- Opening such a link restores the config without saving it to presets.

---

## Auto-save

The current configuration is automatically saved to your browser on every change. On load, the last config is restored — unless a Share URL hash is present.

UI preferences (which comment sections are visible) are also auto-saved.

---

## Limits

| Parameter | Maximum |
|---|---|
| Dice terms in pool | Unlimited (practical UI limit applies) |
| Count per die | 1–99 |
| Sides per die | 1–999 |
| Reroll / Explode conditions | 10 |
| Reroll / Explode repeat | 1–99 |
| Explode safety cap | 100 extra dice per original die |
| Pipeline steps | 20 |
| Outcomes | 10 |
| Conditions per outcome | 5 |
| Condition chain clauses | 10 |
| Sweep X | 10 values |
| Sweep Y | 10 values |
| My Presets | 100 |
| Rolls per run | 1,000,000 |
| Total (with sweep) | Unlimited, but > 50M requires confirmation |
| Switch branches | 10 |
