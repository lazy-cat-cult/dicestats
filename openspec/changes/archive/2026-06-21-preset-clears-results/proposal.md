# Proposal: preset-clears-results

## Why

Today, applying a preset (`src/components/PresetSelector.tsx:5-13`) only mutates the configuration signals. Three things stay stale and visible to the user:

1. **`simResults`** — the previously-run results are still rendered on the Results step. They reference the old pool and outcome names, so the table and chart are misleading until the user re-runs.
2. **The in-flight Web Worker** — if a simulation is currently running, the new preset values are dispatched to a still-active worker. The current code does not terminate the worker; the next click on Run may race with the running job. The existing worker-cancellation pattern is at `src/app.tsx:58-87`.
3. **`currentStep`** — if the user is on the Results step and switches to a smaller preset (e.g. PbtA → Shadowrun), the wizard stays on the Results step showing empty state, which is confusing. Going back to step 0 (Dice Pool & Reroll) is the natural read of "preset applied".

Fixing this means `PresetSelector.applyPreset` does the same kind of teardown that `runSimulation` does at the end of a run, plus a `currentStep.value = 0` reset and a `confirmedHighCost.value = false` reset (the >50M confirmation gate should not survive a preset change).

## What Changes

- **Modify** `src/components/PresetSelector.tsx`: in `applyPreset`, before mutating the configuration signals:
  1. `simResults.value = []`.
  2. `simError.value = null`.
  3. `isSimulating.value = false`.
  4. Terminate any in-flight worker (mirror `src/app.tsx:58-87`).
  5. `currentStep.value = 0`.
  6. `confirmedHighCost.value = false`.
- **Reset** `activeSweepsByTarget` and `highlightTargetId`/`highlightTargetKind` to their initial values, so any sweep or highlight tied to the previous configuration does not bleed through to the new one.

## Impact

- Affected specs: `openspec/specs/ui/spec.md` (Presets requirement).
- Affected code:
  - `src/components/PresetSelector.tsx` (extended `applyPreset`).
  - `src/app.tsx` (optionally expose a `resetSimulation()` helper to avoid duplicating the worker-cancellation idiom; the plan calls this out as optional).

## Non-Goals

- No change to the `resetToPreset` function in `app-state.ts` (used by the auto-save flow). It is a pure data reset; the teardown happens in `PresetSelector` only.
- No new confirmation dialog. Preset application is silent, matching the current behaviour.
- No change to the `ParameterEditor` or sweep indicators — those are computed from the configuration signals and update reactively once the signals are reassigned.
