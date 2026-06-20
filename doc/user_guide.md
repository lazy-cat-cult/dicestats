# User Guide — Dice Probability Calculator

## Overview

A single-page Monte Carlo probability calculator for tabletop RPG dice. It simulates one million dice pool rolls (and more via sweep), runs them through a resolution pipeline, and outputs probabilities for user-defined outcomes. The simulation runs in a Web Worker — the UI stays responsive.

## Quick Start

1. Open the page.
2. Pick a preset from the top bar (e.g., "D&D 5e — d20") or configure manually.
3. Click **Roll the Dice** — probabilities appear in seconds.
4. To vary difficulty, enter sweep X values in the Sweep section (Step 05).
5. For deeper analysis, click **Details & Statistics**.

## Interface — Step by Step

### Preset Bar (top panel)

Quickly switch between configurations.

- **Featured presets** — quick access to popular RPG systems (D&D, PbtA, BitD, Daggerheart).
- **My Presets** — saved user configurations (up to 100). Favorites are marked with ⭐.
- **All** — opens the preset library with search, tab filters (All / My Presets / Favorites), and management actions (rename, copy, delete).
- **Name** — click to edit the current configuration's name. Enter saves, Esc cancels.
- **New** — resets all fields to defaults.
- **Export** — downloads the current config as a YAML file.
- **Import** — loads a configuration from a YAML file.
- **Save** — saves the current config to My Presets. If it matches a built-in preset, you'll be prompted to save a copy instead.
- **Share URL** — copies a link with the compressed configuration (LZ-String). Opening such a link loads the config automatically.

### Step 01 — Dice Pool

Defines which dice are rolled, how many, and their tags.

- **Count** — number of dice. Accepts a literal number (1, 2, ...) or an expression using X/Y (see Sweep).
- **d (sides)** — number of faces. Choose from standard dice (d4, d6, d8, d10, d12, d20, d100) or select `custom` for arbitrary values / X/Y expressions.
- **Tag** — grouping label for dice. Tags are used later for filtering. Dice with the same tag share a border color.
- **Comment** (toggled by the Comments checkbox) — free-text note.

Pool notation is displayed above the editor (e.g., `2d20, 1d6 <bonus>`).

Limits: count 1–99, sides 1–999.

### Step 02 — Reroll Conditions

Rules that modify individual die results after rolling. Optional.

Each condition consists of:

- **if** — condition chain (see Condition Chain below): which dice are affected.
- **then** — action:
  - **Reroll** — re-roll the die up to N times, stopping when it no longer matches the condition.
  - **Explode** — add an extra die (and continue as long as the condition is met).
- **max times** — maximum rerolls / explosions (1–99).
- **tag as** — re-tag affected dice. If empty, the original tag is inherited.

Conditions are applied in sequence order. Use the up/down arrows to reorder.

Limit: maximum 10 conditions.

### Step 03 — Resolution Pipeline

Transforms rolled dice (`rolled`) into named values — either scalars (numbers) or vectors (die arrays). Each step references the previous step by name.

A pipeline is a sequence of rows:

```
[name] = source.function(params)
```

**Source** is either `rolled` (the original dice) or the name of a previous step.

**Functions (vector → vector):**

| Function | Description |
|---|---|
| `filter` | Keep dice matching a condition chain |
| `remove` | Remove dice matching a condition chain |

**Functions (vector → scalar):**

| Function | Description |
|---|---|
| `count` | Number of dice |
| `sum` | Sum of all face values |
| `max` | Maximum face value |
| `min` | Minimum face value |
| `sub` | Sequential subtraction (first die minus the rest) |

**Functions (scalar → scalar):**

| Function | Description |
|---|---|
| `add`, `subtract`, `multiply`, `divide` | Binary operation with literals or references to other scalars. Multiple terms can be added. |
| `ceil` | Round up |
| `floor` | Round down |
| `switch` | Conditional branching: each branch checks a condition on a scalar and returns a corresponding value. |

**Name rules:** alphanumeric + underscore only, must start with a letter or `_`. Duplicates are forbidden.

**Validation:** the editor highlights errors inline (invalid name, unknown source, cyclic reference).

### Step 04 — Outcomes

Defines the categories each roll is sorted into.

Each outcome consists of:

- **Name** — displayed in the results table.
- **Conditions (1–5)** — a set of checks joined by AND / OR connectors.

**Scalar condition** (for scalar sources):

```
when {source} {operator} {value}
```

Operators: `>=`, `>`, `<=`, `<`, `=`, `!=`.

**Dice condition** (for vector sources, e.g., `rolled`):

```
when {source} {any/all/none} dice {operator} {value}
```

- `any` — at least one die satisfies the condition.
- `all` — every die satisfies the condition.
- `none` — no die satisfies the condition.

If a roll does not match any outcome, it falls into the special **Not matched** bucket (its probability is non-zero only if the outcomes don't fully cover the space).

Limit: 10 outcomes, 5 conditions per outcome.

### Step 05 — Sweep Parameters

Vary X and Y values to see how probabilities change. If sweep is not configured, a single run (1M rolls) is performed.

- **Sweep X values** — comma-separated list of values. Range notation is supported: `1..10` expands to `1,2,3,4,5,6,7,8,9,10`.
- **Sweep Y values (optional)** — same for Y. When set, results are grouped: each Y value gets its own section with the full X sweep inside.

X and Y can be used in any expression field (count, sides, thresholds, pipeline). When an expression contains `X` or `Y`, a **num/var** toggle appears — click to switch between numeric input and variable reference.

**Important:** each sweep value runs 1M rolls. 10 X values = 10M rolls. A 5x5 sweep = 25M rolls. If total rolls exceed 10M, a warning is shown. If they exceed 50M, the button requires explicit confirmation.

Both X and Y are capped at 10 values each.

## Condition Chain Editor

Used in Reroll Conditions (Step 02) and Pipeline filter/remove (Step 03). A set of clauses joined by AND / OR.

Each clause:

- **field**: `face` (die face value) or `tag` (die tag).
- **operator**: for face — `>=`, `>`, `<=`, `<`, `=`, `!=`, `is_min`, `is_max`, `is_even`, `is_odd`. For tag — `=`, `!=`.
- **value**: number/expression for face, or tag name from the dropdown for tag.

Special operators (`is_min`, `is_max`, `is_even`, `is_odd`) do not require a value.

## Expressions (Expr)

You can enter mathematical expressions in Count, Sides, threshold values, and pipeline numeric fields:

- **Literals:** `1`, `42`, `3.14`
- **Variables:** `X`, `Y` (referencing sweep values)
- **Binary operators:** `+`, `-`, `*`, `/`
- **Parentheses:** `(2 + X) * 3`

Invalid expressions show an inline error below the field.

## Running the Simulation

Once all steps are configured:

1. Check for blocking errors below the button.
2. Click **Roll the Dice**.
3. An animated progress indicator appears.
4. Results show up in the right panel.

The button label cycles: `Roll the Dice` → `Running…` → `Roll the Dice Again`.

**Sample button** — performs one roll and displays a detailed trace (see Sample View).

**Cancel** — stops the simulation (terminates the Worker).

## Results

### Probability Table

For a single run — a table with outcome name, probability, and roll count.

If probabilities sum to > 100%, outcomes overlap — this is noted under the table.

For X-sweep — a table with X rows and outcome columns. For X+Y sweep — grouped by Y: each Y section contains an X table.

### Odds Tape

Compact view listing all outcomes sorted by probability (highest first). The top outcome's probability is shown in large type. Bar widths show relative probabilities.

### Distribution Chart

- **Single run:** bar chart of outcome probabilities.
- **Sweep:** line chart of probabilities across X values.

## Sample View

The **Sample** button runs exactly one roll and shows:

- **Dice Pool** — each die with its face value (editable — change a value and re-run the trace).
- **Reroll Events** — the reroll/explode chain for each die.
- **Sweep** — current X/Y values (editable when sweep is active).
- **Resolution Pipeline** — intermediate values at each step.
- **Outcomes** — matched (✓) and unmatched (✗) outcomes.

Useful for debugging complex pipelines and understanding reroll behavior.

## Details & Statistics (modal)

Opened via the **Details & Statistics** button under the results. Contains:

### Y / X Selector

If a sweep is active — buttons to pick a specific Y and X value.

### Outcome Chart

A larger bar chart of the outcome distribution.

### Distribution Shape

Statistics of the last scalar value in the pipeline:

- Percentiles: P05, P25, P50 (median), P75, P95
- Mean, Std Dev, Skewness

### Outcome Probabilities with 95% Wilson CI

A table with each outcome's probability and a Wilson confidence interval. Example: `12.34% (12.28% – 12.40%)`.

### Sensitivity (only when sweep X > 1)

- **Marginal Effect / +1** — the average probability change when X increases by 1.
- **Break-Even (P = 50%)** — the X value at which the outcome's probability reaches 50%.

### Multi-Label Co-occurrence

- **Shannon Entropy** (bits) — a measure of distribution uniformity. Higher values mean more evenly spread probabilities.
- **Effective Outcomes** — 2^H (the number of "effective" categories). Close to the true outcome count means categories are well separated. Close to 1 means nearly all rolls land in one category.
- **Pairwise Overlaps** — outcome pairs that occurred together, with probability and LIFT (how many times more likely the pair is than chance). LIFT > 1 indicates positive correlation.
- **Top Match-Sets** — combinations of outcomes that occurred in the same roll, sorted by frequency.

## Working with Presets

### Built-in Presets

Shipped with the app:

- D&D 5e — d20, Advantage, Savage Worlds, Blades in the Dark, PbtA 2d6, Daggerheart, Cyberpunk RED, World of Darkness, Shadowrun, Vampire V5.

### My Presets

- Stored in `localStorage`.
- Up to 100 presets.
- Management: rename, copy, delete (via the ⋮ menu or the Copy button on standard presets).
- Favorites (⭐) — starred presets appear first in the library and on the top bar.
- Saving a built-in preset under the same name prompts you to save a copy.

### Export / Import (YAML)

- **Export** — downloads the current config as a `.yaml` file.
- **Import** — loads a `.yaml` file. If a preset with the same name already exists, fields are merged (updated). Otherwise it is added to My Presets.

### Share URL

- **Share URL** copies a link of the form `https://…/#<LZ-compressed config>`.
- Opening such a link restores the config without saving it to presets.
- Version (`version: 9`) is validated on decode.

## Auto-save

The current configuration is automatically saved to `localStorage` on changes (debounced at 2 seconds) and on page hide / close. On load, the last config is restored — unless a Share URL hash is present.

## Limits

| Parameter | Maximum |
|---|---|
| Dice terms in pool | Unlimited (practical UI limit applies) |
| Count per die | 1–99 |
| Sides per die | 1–999 |
| Reroll conditions | 10 |
| Reroll repeat | 1–99 |
| Pipeline steps | 20 |
| Outcomes | 10 |
| Conditions per outcome | 5 |
| Sweep X | 10 values |
| Sweep Y | 10 values |
| My Presets | 100 |
| Rolls per run | 1,000,000 (fixed) |
| Total (with sweep) | Unlimited, but > 50M requires confirmation |

## Technical Notes

- Random numbers use `Math.random()` — not cryptographically secure, but sufficient for Monte Carlo simulation.
- Result animations use CSS `animation-delay` for sequential appearance.
- Outcome probabilities are displayed with two decimal places by default.
