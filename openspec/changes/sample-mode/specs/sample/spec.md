# Sample Mode Specification

## Purpose

Sample mode provides a single-throw debug view of the full dice resolution pipeline. Instead of running 1,000,000 Monte Carlo iterations, it rolls the dice once, captures every intermediate value (rolled dice, reroll/explode events, pipeline values, outcome matches), and renders them in an editable trace view. The user can modify initial dice faces and sweep X/Y values to test specific scenarios.

## Requirements

### Requirement: SampleTrace Type

The sample trace SHALL be represented by the following TypeScript types:

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
  value: number | { face: number; tag: string }[];
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

`SampleDiceRoll.originalFace` SHALL be the face value after all reroll/explode processing is complete. The original pre-reroll face can be derived from the first `SampleRerollEvent.oldFace` (if `rerollEvents` is non-empty) or equals `originalFace` (if no events).

#### Scenario: Trace with no rerolls
- GIVEN a pool of 2d6 with no reroll conditions
- WHEN a sample is taken and the dice roll [3, 5]
- THEN `diceRolls` contains two entries, each with `originalFace` 3 and 5, and empty `rerollEvents`
- AND `pipeline` contains `[ rolled ]` with the dice array `[{face:3, tag:""}, {face:5, tag:""}]`

#### Scenario: Trace with explode event
- GIVEN a pool of 1d6 with an explode condition on face=6
- WHEN a sample is taken and the die rolls 6, then explodes to 4
- THEN `diceRolls[0].rerollEvents` contains `{ conditionIndex: 0, action: 'explode', oldFace: 6, newFace: 4 }`
- AND `diceRolls[0].originalFace` is 4

### Requirement: Sample Worker Protocol

The main thread SHALL communicate sample requests to the worker via typed messages:

- Request: `{ type: 'sample'; job: SimJob; x?: number; y?: number; overrides?: { termIndex: number; face: number }[] }`
- Response: `{ type: 'sampleResult'; trace: SampleTrace }`
- Error: `{ type: 'sampleError'; message: string }`

The `overrides` field SHALL contain pre-set dice face values that replace the random roll for the specified term indices. When `overrides` is present, the worker SHALL skip `rollPool` for those terms and use the provided faces directly. The reroll, pipeline, and outcome evaluation SHALL proceed normally on the overridden values.

The `x` and `y` fields SHALL contain the sweep variable values used for expression evaluation in this sample. They default to `null` when no sweep is active.

#### Scenario: Sample with overrides
- GIVEN the user changes a die face from 14 to 20 in the SampleView
- WHEN the sample request is sent
- THEN `overrides` contains `[{ termIndex: 0, face: 20 }]`
- AND the worker uses face 20 for the first term's die instead of rolling randomly

#### Scenario: Sample error handling
- GIVEN the worker encounters an error during sample computation
- WHEN the error is caught
- THEN a `sampleError` message is sent with the error description
- AND the main thread shows the `ErrorPanel` with the error message

### Requirement: Sample Button

A "Sample" button SHALL be rendered as a `ghost` button (outline style) to the left of the primary "Roll the Dice" button in the sticky run strip. The button SHALL be disabled when the configuration is invalid (same validation rules as the run button).

The button label SHALL be:
- "Sample" when `sampleMode` is `'idle'`
- "Sampling…" (disabled) when `sampleMode` is `'sampling'`
- "Sample" when `sampleMode` is `'result'` and the user can re-sample

Pressing the Sample button SHALL:
1. Terminate any running Monte Carlo simulation.
2. Clear `simResults` (set to `[]`).
3. Set `sampleMode` to `'sampling'`.
4. If `sweep.x` is non-empty, select a random value from `sweep.x` for `sampleX` and a random value from `sweep.y` (if present) for `sampleY`.
5. Post a `{ type: 'sample'; job; x: sampleX; y: sampleY }` message to a fresh worker.
6. On `sampleResult`, set `sampleTrace` to the trace and `sampleMode` to `'result'`.
7. On `sampleError`, set `sampleMode` to `'idle'` and show the error.

#### Scenario: Sample button clears Monte Carlo results
- GIVEN Monte Carlo results are displayed in the right panel
- WHEN the user clicks "Sample"
- THEN `simResults` is set to `[]`
- AND the result canvas is replaced by the SampleView

#### Scenario: Roll the Dice clears sample trace
- GIVEN sample mode is active with a trace displayed
- WHEN the user clicks "Roll the Dice"
- THEN `sampleTrace` is set to `null`
- AND `sampleMode` is set to `'idle'`
- AND the simulation starts normally

### Requirement: SampleView Layout

The `SampleView` component SHALL render in the right panel, replacing `OddsTape`, `ResultView`, and `DistributionChart` when `sampleMode` is `'result'` and `sampleTrace` is non-null.

The component SHALL contain the following sections, rendered as cards on `bg-paper` with `border border-rule`:

1. **Header**: an eyebrow "SAMPLE" in `font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep`, and a ghost "Roll Again" button on the right that re-samples with new random values (sends a fresh `sample` message without overrides).

2. **Dice Pool**: one row per dice term. Each row SHALL show:
   - The term label (e.g., `d20` or `2d6`) in `font-mono text-[12px] text-ink`.
   - One editable face input per die, rendered as an `<input type="number">` with `min=1` and `max=<term.sides>` in `font-mono tabular`. The input SHALL commit on blur and on Enter, triggering a re-sample with overrides.
   - The tag in `font-mono text-[11px] text-ink-soft` with the tag color left border.
   - Reroll/explode events below each die, rendered in `font-mono text-[11px] text-ink-soft`: `↳ reroll (cond #N): <oldFace> → <newFace>` or `↳ explode (cond #N): <oldFace> → <newFace>`. An empty `rerollEvents` array shows `↳ no rerolls`.

3. **Sweep**: shown only when `sampleTrace.sweepX` is not null. Two editable number inputs for X and Y, each in `font-mono tabular`. Editing and committing triggers a re-sample with the new X/Y values and preserves any dice face overrides.

4. **Resolution Pipeline**: one row per pipeline step. Each row SHALL show:
   - The name in `font-mono text-[12px] text-ink` (with brackets for vector sources: `[ hits ]`).
   - The value: for scalars, the number in `font-mono tabular text-[13px] text-ink`; for vectors, a comma-separated list of faces with tags in `font-mono text-[11px] text-ink-soft`. Vector values SHALL be rendered as `[14 (adv), 4, 5]`.
   - The implicit `rolled` source SHALL always appear as the first pipeline row, even when the pipeline is empty.

5. **Outcomes**: one row per outcome. Each row SHALL show:
   - The outcome name in `font-mono text-[12px]` (uppercase tracking).
   - A match indicator: `✓ matched` in `text-billiard` for matched outcomes, `✗ not matched` in `text-ink-mute` for unmatched outcomes.
   - The implicit "Not matched" outcome SHALL appear only when no user-defined outcomes matched.
   - Each outcome row's left border is `border-billiard` when matched, `border-rule` when not.

#### Scenario: SampleView renders the full trace
- GIVEN a sample trace with 2 dice, 3 pipeline values, and 2 outcomes (1 matched)
- WHEN SampleView renders
- THEN the Dice Pool section shows 2 dice with face inputs
- AND the Pipeline section shows 4 rows (`rolled` + 3 named values)
- AND the Outcomes section shows 2 outcomes with match indicators

#### Scenario: Editing a die face recalculates
- GIVEN SampleView displays a d20 with face 14
- WHEN the user changes the face input to 18 and presses Enter
- THEN a sample request is sent with `overrides: [{ termIndex: 0, face: 18 }]`
- AND the trace updates with new pipeline values and outcome matches based on face 18

#### Scenario: Roll Again generates fresh values
- GIVEN SampleView is displayed with a trace
- WHEN the user clicks "Roll Again"
- THEN a sample request is sent WITHOUT overrides
- AND new random dice values are generated
- AND new random X/Y values are selected (if sweep is active)

### Requirement: Sweep X/Y in Sample Mode

When `sweep.x` is non-empty at the time the Sample button is pressed, the Sample mode SHALL:
1. Randomly select a value from `sweep.x` and store it in `sampleX`.
2. If `sweep.y` is non-null, randomly select a value from `sweep.y` and store it in `sampleY`.
3. Display these values as editable number inputs in the SampleView Sweep section.
4. Pass them to the worker as `x` and `y` in the sample request.
5. Include them in `sampleTrace.sweepX` and `sampleTrace.sweepY`.

When the user edits the X or Y field and commits, a re-sample SHALL be triggered with the new X/Y values, preserving any dice face overrides.

#### Scenario: Random X/Y on first sample
- GIVEN `sweep.x = [1, 2, 3, 4, 5]` and `sweep.y = [10, 15]`
- WHEN the user clicks "Sample"
- THEN `sampleX` is randomly selected from [1..5]
- AND `sampleY` is randomly selected from [10, 15]
- AND the trace is computed with those values

#### Scenario: Editing X recalculates
- GIVEN SampleView shows `sampleX = 2`, `sampleY = 15`
- WHEN the user changes X to 5 and commits
- THEN a re-sample is sent with `x: 5, y: 15`
- AND the trace updates with expressions evaluated at X=5, Y=15

### Requirement: SampleView Empty and Error States

When `sampleMode` is `'sampling'` and no trace is yet available, the right panel SHALL show the `RunningPanel` with "SAMPLING" eyebrow (instead of "ROLLING") and the message "Running one throw…".

When a `sampleError` is received, the right panel SHALL show the `ErrorPanel` with the error message. The Sample button remains enabled for a retry.

#### Scenario: Sampling running state
- GIVEN the user has clicked "Sample" and the worker is processing
- WHEN `sampleMode` is `'sampling'`
- THEN the RunningPanel shows "SAMPLING" and "Running one throw…"

### Requirement: Sample Mode Isolation

Sample mode SHALL NOT modify any existing domain types (`SimResult`, `SimJob`, `Outcome`, `NamedValue`, `DiceTerm`, `RerollCondition`, `Parameter`). Sample mode SHALL NOT affect the persistence layer, the YAML import/export, or the preset system.

The `simResults` signal and `sampleTrace` signal SHALL be mutually exclusive in the UI: when one is displayed, the other is hidden. Both signals MAY coexist in state (e.g., after running Monte Carlo and then sampling, the old `simResults` remain in memory but are not rendered).

#### Scenario: Sample mode does not affect saved config
- GIVEN the user runs a sample and edits dice faces
- WHEN the user reloads the page
- THEN the sample trace is NOT restored
- AND no sample-related data is in localStorage under `dice-calc-config`
