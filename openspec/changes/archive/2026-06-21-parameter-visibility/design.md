# Design: parameter-visibility

## Goals

- A user configuring a sweep sees, at the location of the value being swept, a clear indicator that the value is swept, by which parameter, and over which values.
- A user discovering a value they want to sweep can initiate the sweep creation from that exact location, with one click.
- The total iteration cost is visible on the **Results** step, immediately above the Run button, and a 50M confirmation gate is implemented (closing the spec gap at `openspec/specs/parameters/spec.md:88-97`).
- The `ParameterEditor` lives on the **Results** step (since parameters are run-level configuration that directly affects the simulation output), but the inline `[+ Sweep]` affordances remain on the source rows of the earlier steps as the discoverability entry point.

## Non-Goals

- No new data model. `Parameter` shape is unchanged.
- No new sweep algorithm. The worker's `applyParameter` is untouched.
- No migration of existing saved configurations (the `Parameter` shape is unchanged, so localStorage v4 configs continue to load).
- No new persistent UI region in the wizard header — the cost chip lives inside the Results step body, not the header.

## Architecture

### New components

#### `<SweepIndicator>` (`src/components/SweepIndicator.tsx`)

Props:

```ts
interface SweepIndicatorProps {
  parameterId: string;
  label: string;
  values: number[];
  onJump?: () => void;
}
```

Renders a compact inline element: `↻ {label} {formatSweepRange(values)}` styled with Tailwind utilities `italic underline decoration-dotted` and `style={{ color: hashIdToColor(parameterId) }}`. No custom CSS class. On viewports narrower than 480px, the indicator collapses to just the `↻` glyph with a `title` attribute tooltip showing the full label and value list.

Accessibility: `role="status"`, `aria-label="Swept by {label} over {formatSweepRange(values)}."`. The element is a `<span>` (not interactive) by default. When `onJump` is provided, the indicator is wrapped in a `<button>` for keyboard activation.

#### `<SweepPopover>` (`src/components/SweepPopover.tsx`)

Controlled component (parent owns `open` state). Props:

```ts
interface SweepPopoverProps {
  open: boolean;
  originRef: HTMLElement;
  defaultLabel: string;
  defaultValues: string; // e.g. "1, 2, 3, 4, 5" or "1..5"
  onCreate: (label: string, values: number[]) => void;
  onCancel: () => void;
  maxSimulations: number; // remaining capacity before hitting 3-parameter cap; 0 disables
}
```

The popover contains:
- A `label` text input (pre-filled with `defaultLabel`).
- A `values` text input (pre-filled with `defaultValues`).
- A live-derivation line: `→ N simulations · N×1,000,000 rolls` updated as the user types.
- A `Create` button (disabled when `maxSimulations === 0`).
- A `Cancel` button.

Focus trap with return-focus-to-origin on close. Escape closes. Click-outside closes. On viewports narrower than 480px, the popover becomes a bottom sheet anchored to the viewport bottom (CSS only, no library).

Accessibility: `role="dialog"`, `aria-label="Add sweep"`, focus trap implemented via the same `useSignalEffect` + `useRef` pattern used in the rest of the codebase. Tap targets are 44px or larger (per `openspec/specs/ui/spec.md:108`).

#### `<SweepCostChip>` (`src/components/SweepCostChip.tsx`)

Reads `parameters` and `confirmedHighCost` signals. Renders:

- If `parameters.length === 0`: `No sweeps. Run a single simulation.` (plain text, centered).
- If `parameters.length > 0` and total ≤ 10M: `N simulations · N×1,000,000 rolls`.
- If total > 10M and ≤ 50M: same text, but with `text-yellow-600`.
- If total > 50M and `!confirmedHighCost`: same text, but with `text-red-600` and a `Confirm run` button next to it.
- If total > 50M and `confirmedHighCost`: same text in `text-red-600` (confirmation is sticky for the next Run click).

The chip is rendered **only on the Results step**, between the `ParameterEditor` and the Run button (or, after a run completes, between the `ParameterEditor` and the result table). It is NOT in the wizard header. The chip uses a centered layout (`text-center`, `justify-center` for the inner row) and the `·` middle-dot character is a literal Unicode character, not a `\u00B7` escape (JSX text nodes do not interpret backslash escapes).

### Reactive derivations (`src/state/app-state.ts`)

```ts
export const activeSweepsByTarget = computed<Map<string, Parameter>>(() => {
  const m = new Map<string, Parameter>();
  for (const p of parameters.value) {
    const key = `${p.target}:${p.targetTermId ?? p.targetOutcomeId ?? p.targetPipelineId}`;
    m.set(key, p);
  }
  return m;
});

export const totalIterations = computed<number>(() => {
  const n = parameters.value.reduce((acc, p) => acc * Math.max(1, p.values.length), 1);
  return n * 1_000_000;
});

export const confirmedHighCost = signal<boolean>(false);
// Reset whenever a parameter is added, removed, or its values change
// (enforced by app.tsx in the run handler or by a useSignalEffect)
```

#### `hashIdToColor` (named export)

Extract the existing hash-to-palette function from `getTagColor` (lines 39-44) and export it as a named function. `SweepIndicator` and the existing `getTagColor` both use it, ensuring parameter colour and tag colour share the same algorithm.

### Editor integration

- **`src/components/DicePoolEditor.tsx`**: for each term, render the existing row + an optional `<SweepIndicator>` (when the term is swept) + a `[+ Sweep]` button next to `count` and `sides` inputs. The button is hidden when `parameters.length >= 3`. Clicking opens a `<SweepPopover>` with `defaultLabel`/`defaultValues` from the **pre-fill table** below.
- **`src/components/OutcomeEditor.tsx`**: for the first scalar condition of each outcome, render an optional `<SweepIndicator>` and a `[+ Sweep]` button. Non-scalar conditions do not show the button. The button is hidden when `parameters.length >= 3`.
- **`src/components/PipelineEditor.tsx`**: for the literal input of every binary-math-literal row, render an optional `<SweepIndicator>` and a `[+ Sweep]` button. Non-literal rows do not show the button.

### Pre-fill table (from `parameter-visibility-inline` design §5, promoted to a spec table)

| Target | `defaultLabel` | `defaultValues` |
|---|---|---|
| `pool.count` | `Count` | `1, 2, 3, 4, 5` |
| `pool.sides` | `Sides` | `4, 6, 8, 10, 12, 20` |
| `outcome.value` (first scalar) | `DC` | `5, 10, 15, 20` |
| `pipeline.literal` (binary-math) | `Modifier` | `-2, -1, 0, 1, 2` |

These are pre-fills only; the user is free to edit before clicking Create.

### 50M confirmation flow

In `src/app.tsx`, the Run click handler:

1. Computes `totalIterations` from `totalIterations.value`.
2. If `totalIterations > 50_000_000 && !confirmedHighCost.value`:
   - Sets `confirmedHighCost.value = true` (the "Confirm run" button in `<SweepCostChip>` is the user-facing surface for this — clicking it has the same effect).
   - Highlights the `<SweepCostChip>` (`ring-2 ring-red-600`) and shows a tooltip near the Run button: "This will run >50M simulations. Click Run again to proceed."
   - Does **not** dispatch the simulation to the worker.
3. Otherwise, dispatches the simulation and (at the end of the run or on parameter change) resets `confirmedHighCost.value = false`.

### `formatSweepRange` (helper)

In `src/utils/format.ts`:

```ts
export function formatSweepRange(values: number[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return String(values[0]);
  const isContiguous = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
  if (isContiguous) return `${values[0]}..${values[values.length - 1]}`;
  if (values.length <= 5) return `{${values.join(', ')}}`;
  return `{${values.slice(0, 5).join(', ')}, …}`;
}
```

Used in:
- `<SweepIndicator>` for the badge text.
- `<SweepPopover>` for the live cost preview (no direct use, but available).
- `<SweepCostChip>` for the value-list preview in the chip.
- The dice notation preview (replaces the existing `1d20` notation; this is a small extension of `dicePoolNotation` — a swept `count` renders as `formatSweepRange(values)`).

### Validation tightening (`src/utils/validation.ts`)

Extend rule 11 with three sub-conditions. Each emits a blocking error with a distinct message:

1. **Target must exist**: `targetTermId` / `targetOutcomeId` / `targetPipelineId` references an existing entity. *(Current behaviour, unchanged wording.)*
2. **Outcome sweep requires ≥1 condition**: if `target === 'outcome.value'`, the outcome's `conditions.length` MUST be ≥1. If zero, blocking error: "Sweep target outcome has no conditions. Add a condition first."
3. **Outcome sweep requires scalar first condition**: if `target === 'outcome.value'`, `conditions[0]` MUST pass the existing `isScalarCondition` predicate (an `OutcomeCondition` whose `op` is a `ConditionOperator` and whose `value` is a `number`). Otherwise, blocking error: "Cannot sweep vector condition. Add a numeric condition first."
4. **Pipeline literal sweep requires binary-math-literal function**: if `target === 'pipeline.literal'`, the targeted `NamedValue` MUST be `{ fn: ScalarBinaryOp; operand: 'val'; value: number }`. Otherwise, blocking error: "Pipeline literal target is not a binary-math-literal row. Change the function or pick a different target."

The `isScalarCondition` predicate is extracted from `src/components/OutcomeEditor.tsx:190-196` into `src/utils/validation.ts` (or `src/domain/matching.ts` if a domain-level predicate is preferred — see "Open questions"). It is reused by the new validation rule and remains available to the outcome editor.

### Stale-target handling

The `<SweepIndicator>` is rendered for a parameter only if the target still exists and still passes the validation rules above. Otherwise, the `ParameterEditor` card shows:

- Red border (`border-red-500`).
- Warning icon (lucide-react `AlertTriangle` or a `⚠` glyph).
- Tooltip: "Target no longer exists" (deleted) or "Target is no longer sweepable" (function/condition type changed).
- A "Retarget" link in place of "Jump to target". Clicking opens a small dropdown listing all valid sweep targets of the same kind (e.g. for a `pool.count` target, lists all current dice terms).

### `Jump to target`

Each `Parameter` card has a `Jump to target` link. Clicking:

1. Computes the target element (the relevant row in the appropriate editor).
2. Calls `target.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
3. Adds a CSS class `pulse-highlight` to the row for 500ms (the class is a single Tailwind utility combination: `outline outline-2 outline-offset-2 outline-blue-500 animate-pulse`).
4. Posts an `aria-live="polite"` announcement: `Jumped to {label} on {target description}.`

The "target element" lookup is implemented via a small `signal<string | null>(null)` "highlight-target" in `app-state.ts`. The editors observe this signal and apply the pulse to themselves when their id matches. This avoids prop-drilling refs across sibling editors.

### ResultView

For sweep results, the `<ResultView>` prepends a group header `Sweep: {label} ∈ {values}` above the per-value table. For multiple parameters, one header per parameter is rendered, in the order the parameters were defined. The existing per-row `DC=15` labels are unchanged.

### Persistence

No changes to `src/state/persistence.ts`. The `Parameter` shape is unchanged, so v4 saved configs continue to load. `confirmedHighCost` is session-only.

## Risks

- **Crowding on outcome rows** — the `Hit` outcome row already has `[name] [source] [Default] [×]`; adding a badge and a `[+ Sweep]` button may wrap on 360px. Mitigated by the design's explicit layout (badge immediately adjacent to value, no other input between them; 44px tap targets verified).
- **First-condition reorder trap** — if a user reorders conditions so that a different scalar condition is now first, the worker mutates the new first condition. The spec requires validation to be re-run on every render (handled by the reactive `activeSweepsByTarget` and the validation pipeline); if the user drags a vector condition above the swept scalar, the sweep becomes invalid and the badge is removed.
- **Multiple parameters targeting the same row** — the model allows it (up to 3 parameters). The design renders up to two indicators; a third collapses to `+N more` with a tooltip listing all.
- **50M gate UX** — the two-click pattern (Confirm → Run) is the explicit choice to avoid a one-time modal. The `confirmedHighCost` flag is reset on parameter change so the user cannot accidentally run a different config under stale confirmation.
- **Custom CSS** — `.swept` is not added. All new styling uses Tailwind utilities and inline `style` attributes, honouring AGENTS.md rule 6.

## Open questions

- Should the `isScalarCondition` predicate be moved from `OutcomeEditor.tsx` to `src/utils/validation.ts` (or `src/domain/matching.ts`)? The apply phase will make this call; the design recommends `src/utils/validation.ts` because the predicate is only used by validation and outcome-editor rendering, and `matching.ts` should remain pure.
- Should the `formatSweepRange` curly-brace syntax be reserved for *pipeline literals only* and a square-bracket syntax `[v1, v2, …, vk]` be used for *outcome values*? The proposal currently uses `{}` uniformly. Resolving this in the apply phase.
