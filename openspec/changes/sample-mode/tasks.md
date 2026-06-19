## 1. Domain types

- [ ] 1.1 In `src/types/index.ts`, add `SampleDiceRoll`, `SampleRerollEvent`, `SamplePipelineValue`, `SampleOutcomeMatch`, and `SampleTrace` types. Do not modify any existing types (implements sample `SampleTrace Type`).

## 2. Worker

- [ ] 2.1 In `src/worker/sim.worker.ts`, add `sampleOnce(job: SimJob, x?: number, y?: number, overrides?: { termIndex: number; face: number }[]): SampleTrace` function. The function SHALL:
  - Materialize Exprs to numbers using `x`, `y` (same as the sweep loop's materialization).
  - For terms without overrides, call `rollPool` normally; for terms with overrides, use the provided face values. Record each die as `SampleDiceRoll` with `termIndex`, `originalFace`, `tag`, and `rerollEvents: []`.
  - Apply reroll conditions in order. For each reroll or explode, append a `SampleRerollEvent` to the affected die's `rerollEvents` array, then update `originalFace` to the new face.
  - Evaluate the pipeline: record each named value as `SamplePipelineValue` with `name`, `value`, and `type`.
  - Evaluate outcomes: record each as `SampleOutcomeMatch` with `name` and `matched`.
  - Return the assembled `SampleTrace` (implements sample `Sample Worker Protocol`, `SampleTrace Type`).
- [ ] 2.2 Add `sample` message handler in the worker's `onmessage`: parse `{ type: 'sample'; job; x?; y?; overrides? }`, call `sampleOnce`, post `{ type: 'sampleResult'; trace }`. Catch errors and post `{ type: 'sampleError'; message }` (implements sample `Sample Worker Protocol`).
- [ ] 2.3 Ensure the `sample` handler terminates the worker on completion (same lifecycle as `run` — terminate after result/error) (implements sample `Sample Worker Protocol`).

## 3. State

- [ ] 3.1 In `src/state/app-state.ts`, add signals:
  - `sampleMode: Signal<'idle' | 'sampling' | 'result'>` (default `'idle'`)
  - `sampleTrace: Signal<SampleTrace | null>` (default `null`)
  - `sampleX: Signal<number | null>` (default `null`)
  - `sampleY: Signal<number | null>` (default `null`)
  (implements sample `Sample Button`, `Sweep X/Y in Sample Mode`).
- [ ] 3.2 Add `resetSampleMode()` function that sets `sampleMode` to `'idle'`, `sampleTrace` to `null`, `sampleX` to `null`, `sampleY` to `null` (implements sample `Sample Button`).

## 4. SampleView component

- [ ] 4.1 Create `src/components/SampleView.tsx` rendering the full SampleView layout as specified in `SampleView Layout` (design.md) and `SampleView Layout` (spec):
  - Header with "SAMPLE" eyebrow and "Roll Again" ghost button.
  - Dice Pool section: one row per dice term; each die has an editable `<input type="number" min=1 max=<sides>>` with `font-mono tabular`; tag color left border; reroll events or "no rerolls" text below.
  - Sweep section: shown when `sampleTrace.sweepX !== null`; editable X and Y inputs.
  - Resolution Pipeline section: one row per pipeline step; `rolled` as first row; scalar values as numbers, vector values as face lists with tags.
  - Outcomes section: one row per outcome; matched indicator (✓/✗); "Not matched" shown when no outcomes matched.
  (implements sample `SampleView Layout`, `SampleView Empty and Error States`).
- [ ] 4.2 Implement `onFaceChange(termIndex, dieIndex, newFace)` callback: builds `overrides` array from current dice faces (excluding the changed face, using current face values for all other dice), adds the changed face, and posts a new `sample` message to the worker with `overrides`. Updates `sampleTrace` on result (implements sample `SampleView Layout`).
- [ ] 4.3 Implement `onSweepChange(x?, y?)` callback: posts a new `sample` message with the new `x`, `y` and current dice overrides (implements sample `Sweep X/Y in Sample Mode`).
- [ ] 4.4 Implement "Roll Again" button: posts a fresh `sample` message without overrides, with randomly selected X/Y from sweep lists (implements sample `SampleView Layout`).
- [ ] 4.5 The component MUST NOT depend on Preact signals for its props; it receives `trace`, `onFaceChange`, `onSweepChange`, `onRollAgain`, `diceTerms` (for sides constraints), and `hasSweep` as props.

## 5. App integration

- [ ] 5.1 In `src/app.tsx`, add the "Sample" ghost button to the sticky run strip, to the left of "Roll the Dice". Wire it to a `runSample()` function (implements sample `Sample Button`).
- [ ] 5.2 Implement `runSample()`:
  - If a simulation is running, cancel it (terminate worker, set `isSimulating = false`).
  - Set `simResults.value = []`.
  - Set `sampleMode.value = 'sampling'`.
  - If `sweep.value.x.length > 0`, select random `sampleX` from `sweep.value.x` and random `sampleY` from `sweep.value.y` (if non-null).
  - Create a fresh worker, post `{ type: 'sample'; job; x: sampleX; y: sampleY }`.
  - On `sampleResult`: set `sampleTrace.value = trace`, `sampleMode.value = 'result'`.
  - On `sampleError`: set `sampleMode.value = 'idle'`, show error.
  (implements sample `Sample Button`).
- [ ] 5.3 Modify the `runSimulation()` function to call `resetSampleMode()` at the start (clears sample state before Monte Carlo run) (implements sample `Sample Button`).
- [ ] 5.4 In the right panel rendering logic:
  - When `sampleMode.value === 'result'` and `sampleTrace.value !== null`, render `SampleView` instead of `OddsTape` + `ResultView` + `DistributionChart`.
  - When `sampleMode.value === 'sampling'`, render `RunningPanel` with "SAMPLING" eyebrow and "Running one throw…" message.
  - Otherwise, render the standard result canvas (implements sample `SampleView Layout`, `SampleView Empty and Error States`).

## 6. Tests

- [ ] 6.1 Add `tests/sample.test.ts` covering:
  - `sampleOnce` returns correct trace for simple config (no rerolls, no pipeline).
  - `sampleOnce` returns correct trace with reroll events.
  - `sampleOnce` returns correct trace with explode events and cascading.
  - `sampleOnce` returns correct trace with pipeline values (vector and scalar).
  - `sampleOnce` returns correct trace with outcome matches.
  - `sampleOnce` with overrides uses the provided faces instead of rolling.
  - `sampleOnce` with X/Y evaluates expressions correctly.
  (implements sample `SampleTrace Type`, `Sample Worker Protocol`).
- [ ] 6.2 Ensure existing tests pass without modification (`npm run test`).

## 7. Verification

- [ ] 7.1 Run `npm run typecheck`; resolve any new type errors.
- [ ] 7.2 Run `npm run lint`; resolve any new lint errors (no rule suppression).
- [ ] 7.3 Run `npm run test`; ensure all tests pass.
- [ ] 7.4 Run `npm run build`; ensure the production build succeeds.
- [ ] 7.5 Manual smoke check: load a preset (e.g., D&D 5e — d20), click "Sample", verify the trace shows one d20 result, pipeline values, and outcome matches.
- [ ] 7.6 Manual smoke check: edit a die face in the SampleView, verify the pipeline and outcomes recalculate.
- [ ] 7.7 Manual smoke check: click "Roll Again", verify fresh random dice values appear.
- [ ] 7.8 Manual smoke check: load PbtA preset with sweep X/Y, click "Sample", verify random X/Y are selected and editable, verify expression-based values change when X/Y is edited.
- [ ] 7.9 Manual smoke check: click "Sample" while Monte Carlo results are displayed, verify results are cleared and SampleView appears.
- [ ] 7.10 Manual smoke check: click "Roll the Dice" while SampleView is displayed, verify sample trace is cleared and Monte Carlo simulation starts.
