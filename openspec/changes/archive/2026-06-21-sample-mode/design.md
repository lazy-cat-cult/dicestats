## Context

The application runs 1,000,000 Monte Carlo iterations in a Web Worker, aggregates results into probability distributions, and displays them as charts and tables. The worker's `simulateOnce()` function runs one iteration and returns `{ distributionKey, outcomeName }`. The domain functions (`rollPool`, `applyRerollConditions`, `evaluatePipeline`, `evaluateOutcomes`) already produce all the intermediate values — they are just discarded after recording the outcome and distribution key.

Sample mode captures those intermediate values into a trace. The trace is then rendered in a read-only view with editable fields for the initial dice face values and sweep X/Y values. Editing triggers a live recalculation.

## Goals / Non-Goals

**Goals:**
- Run a single dice throw and display the full resolution trace.
- Show every die rolled (face + tag), every reroll/explode event (which die, which condition triggered it, what it became), every pipeline value (name + value), and every matched outcome.
- Allow the user to edit initial dice face values and X/Y values inline, then recalculate.
- Keep the sample code path isolated from the Monte Carlo code path — no changes to the existing `runSimulation` function.
- Reuse existing domain functions (roller, reroll, resolve, classify) for the trace computation.

**Non-Goals:**
- No persistence of sample mode state (the trace is ephemeral, not saved to localStorage).
- No chart output for sample mode (it's a single data point, not a distribution).
- No batch sample mode (running N=100 samples and showing all traces).
- No undo/redo on dice face edits.
- No modification of the existing `SimResult` / `SimJob` types or the `runSimulation` function.
- No changes to the presets, YAML, or validation modules.

## Decisions

### 1. Worker runs the sample, not the main thread

**Decision:** The sample trace is computed in the Web Worker via a new `sample` message type, even though it's a single iteration. The main thread never imports domain modules.

**Rationale:** The worker boundary is already in place. Domain modules (`matching.ts`, `resolve.ts`, `classify.ts`) are pure functions imported by the worker. Running the sample on the main thread would require importing `roller.ts`, `reroll.ts`, etc. into the UI bundle, which breaks the worker isolation contract and pulls domain code into the Preact/Vite bundle. The worker path costs one round-trip (~1ms) for a single iteration, which is imperceptible.

**Alternatives:** Run on the main thread — rejected, violates worker isolation. Create a separate worker — rejected, duplicates the worker instantiation logic for no benefit.

### 2. `sampleOnce` is a new function in the worker, not a modified `simulateOnce`

**Decision:** A separate `sampleOnce(job: SimJob, x?: number, y?: number): SampleTrace` function is added to the worker. It duplicates the single-iteration logic from `simulateOnce` but returns a `SampleTrace` instead of `{ distributionKey, outcomeName }`. The existing `simulateOnce` is untouched.

**Rationale:** `simulateOnce` is the hot path — it runs 1,000,000 times per simulation. Adding trace collection to it would add overhead (array allocations, object spreads) to every iteration. The sample path is a cold path (one call per button press); it can afford the allocations. Two separate functions keep the hot path fast and the cold path clear.

**Alternatives:** Add an optional `trace?: boolean` parameter to `simulateOnce` — rejected, adds a branch to the hot loop for a feature that runs once. Use a Proxy or callback to collect trace data — rejected, over-engineering for a simple function.

### 3. Editable fields are in the SampleView, recalculated via worker

**Decision:** The `SampleView` renders the initial dice pool as editable number inputs (one per die). When the user changes a face value, the component posts a new `sample` message to the worker with the modified dice values (passed as a pre-rolled `DicePoolOverride` in the sample request), including the current X/Y values from the editable X/Y fields. The returned `SampleTrace` replaces the displayed trace.

**Rationale:** The user edits dice *face values*, not dice *definitions*. The dice pool configuration (count, sides, tags) is unchanged — only the specific roll outcome is edited. The simplest protocol is to pass the overridden faces to the worker as part of the sample request. The worker then skips `rollPool` and uses the provided faces directly, then continues through reroll → pipeline → outcomes normally.

**Alternatives:** Run reroll/pipeline/outcomes on the main thread — rejected, see Decision 1. Store the trace entirely in signals and recompute via Preact computed — rejected, domain functions need to run in isolation.

### 4. X/Y values are selected randomly on first sample, editable afterward

**Decision:** When a sweep is active (`sweep.x` is non-empty), the first sample press selects a random `x` from `sweep.x` and (if Y is set) a random `y` from `sweep.y`. These values are stored in `sampleX` / `sampleY` signals and shown as editable number inputs in the SampleView. Subsequent edits to these fields recompute the trace with the new values.

**Rationale:** The user wants to see "a random pair from the sweep lists" but also wants to edit them to test specific sweep values. Random selection on first click gives the "sample" feel; editable fields give the debugging power.

**Alternatives:** Always use the first sweep value — rejected, not "random". Always require the user to type X/Y — rejected, extra friction for the common case.

### 5. Sample mode and Monte Carlo results are mutually exclusive in the right panel

**Decision:** When `sampleMode` is `'result'` and `sampleTrace` is non-null, the right panel shows `SampleView` and hides `OddsTape`, `ResultView`, and `DistributionChart`. Clicking "Roll the Dice" clears the sample trace and shows Monte Carlo results. Clicking "Sample" clears Monte Carlo results and enters sample mode. The two modes never share the right panel.

**Rationale:** The right panel is a single sticky aside. Showing both a trace and a probability chart would overflow the viewport on typical screens. The sample trace is a debug view; the Monte Carlo results are the primary output. They serve different purposes and the user toggles between them.

**Alternatives:** Show both stacked — rejected, cramped on typical 1920×1080 screens. Show sample in a modal — rejected, the user wants to see it alongside the configuration while editing.

### 6. SampleTrace types are flat and explicit

**Decision:**
```typescript
interface SampleDiceRoll {
  termIndex: number;
  originalFace: number;
  tag: string;
  rerollEvents: SampleRerollEvent[];
}

interface SampleRerollEvent {
  conditionIndex: number;
  action: 'reroll' | 'explode';
  oldFace: number;
  newFace: number;
}

interface SamplePipelineValue {
  name: string;
  value: number | SampleDiceRoll[];  // scalar → number, vector → dice array
  type: 'scalar' | 'vector';
}

interface SampleOutcomeMatch {
  name: string;
  matched: boolean;
}

interface SampleTrace {
  diceRolls: SampleDiceRoll[];
  pipeline: SamplePipelineValue[];
  outcomes: SampleOutcomeMatch[];
  sweepX: number | null;
  sweepY: number | null;
}
```

**Rationale:** Flat types are easy to serialize across the worker boundary, easy to render in Preact, and easy to test. The `rerollEvents` array on each die tells the full story of what happened to that die. Pipeline values carry their type so the UI can render vectors as dice lists and scalars as numbers.

### 7. Sample button is a ghost button, not primary

**Decision:** The "Sample" button is rendered as a `ghost` button (outline style, `border-gold/50 text-gold hover:border-gold hover:text-gold`) to the left of the primary "Roll the Dice" button in the sticky run strip. During sampling, it shows "Sampling…" and is disabled.

**Rationale:** The primary action is "Roll the Dice" (Monte Carlo). Sample is a secondary debug action. The ghost treatment matches the "Cancel" button style in the run strip, keeping visual hierarchy clear.

## Risks / Trade-offs

- **Risk:** The `sampleOnce` function duplicates logic from `simulateOnce` and could drift. → **Mitigation:** Both functions call the same domain modules; the only difference is the return type. A test asserts that `sampleOnce` and `simulateOnce` produce the same outcome for the same random seed.
- **Risk:** Editing dice faces could produce states that `rollPool` would never generate (e.g., a face value of 7 on a d6). → **Mitigation:** The face input has `min=1` and `max=sides` constraints from the dice term definition. The input clamps to the valid range.
- **Risk:** The worker must handle a `sample` message while also handling `run` — but the existing lifecycle (one worker at a time, terminate on new action) already prevents concurrent messages. → **Mitigation:** No change needed; the existing `cancel` + terminate logic applies to sample messages as well.

## Open Questions

- Should the SampleView show a "Roll Again" (re-sample) button to get a fresh random throw? → **Resolved:** Yes — a "Roll Again" ghost button in the SampleView header re-requests a sample with new random dice values and new random X/Y.

## Sample View Layout

The SampleView replaces the entire right panel content. Layout from top to bottom:

```
┌─────────────────────────────────────────┐
│ SAMPLE                      [Roll Again]│  ← eyebrow + ghost button
│ Dice Pool                               │
│ ┌─────────────────────────────────────┐ │
│ │ d20          face: [14▾]  tag: adv  │ │  ← editable face input
│ │   ↳ no rerolls                      │ │  ← reroll events (if any)
│ ├─────────────────────────────────────┤ │
│ │ d6           face: [ 3▾]  tag: —    │ │
│ │   ↳ explode (cond #1): 6 → 4        │ │  ← reroll/explode events
│ ├─────────────────────────────────────┤ │
│ │ d6           face: [ 5▾]  tag: —    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Sweep                                   │
│ ┌─────────────────────────────────────┐ │
│ │ X: [2▾]    Y: [15▾]                │ │  ← editable X/Y (hidden if none)
│ └─────────────────────────────────────┘ │
│                                         │
│ Resolution Pipeline                     │
│ ┌─────────────────────────────────────┐ │
│ │ [ rolled ]    [14 (adv), 4, 5]      │ │  ← vector shown as face list
│ │ hits          count = 2             │ │  ← scalar shown as number
│ │ total_mod     add 2 by 2 = 4        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Outcomes                                │
│ ┌─────────────────────────────────────┐ │
│ │ Success        ✓ matched            │ │  ← green check
│ │ Partial        ✗ not matched        │ │  ← red/grey cross
│ │ Failure        ✗ not matched        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

All numeric values use `font-mono tabular`. Matched outcomes get `text-billiard` ✓; unmatched get `text-ink-mute` ✗. The dice pool section shows dice grouped by term, each with its tag color left border (same palette as the DicePoolEditor).
