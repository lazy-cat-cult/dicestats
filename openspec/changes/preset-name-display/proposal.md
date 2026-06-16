# Proposal: preset-name-display

## Why

When a user applies a preset and runs a simulation, the results panel shows outcome probabilities but does not indicate which preset produced them. This becomes confusing when:

1. The user applies multiple presets in sequence and forgets which one is active.
2. The user loads a custom YAML preset and wants to see its name in the results.
3. The user shares a screenshot of the results — the preset context is lost.

Currently, `applyPresetConfig` in `src/state/app-state.ts:92-98` mutates the configuration signals but does not track which preset was applied. The `SimJob` type in `src/types/index.ts:121-128` has no field for a task name, and the worker in `src/worker/sim.worker.ts:99-144` always returns `SimResult.label = ''` for single runs.

## What Changes

- **Add** `currentPresetName: signal<string | null>(null)` to `src/state/app-state.ts`. This signal tracks the name of the currently applied preset.
- **Modify** `applyPresetConfig` in `src/state/app-state.ts` to set `currentPresetName.value = preset.name` when a preset is applied.
- **Modify** `resetToDefaults` in `src/state/app-state.ts` to set `currentPresetName.value = null`.
- **Add** `taskName?: string` field to `SimJob` interface in `src/types/index.ts`.
- **Modify** `runSimulation` in `src/app.tsx:85-137` to pass `taskName: currentPresetName.value ?? undefined` in the `SimJob`.
- **Modify** `runSimulation` function in `src/worker/sim.worker.ts:99-144` to accept an optional `taskName` parameter and use it as the `SimResult.label` for single runs.
- **Modify** the parameter sweep loop in `src/worker/sim.worker.ts:216-238` to prepend the task name to sweep labels when present (e.g., `"D&D 5e — d20 · DC=15"`).
- **Modify** `OddsTape` component in `src/components/OddsTape.tsx` to display the preset name above the "Top Probability" eyebrow when `currentPresetName.value` is not null.

## Impact

- Affected specs:
  - `openspec/specs/presets/spec.md` — add requirement for tracking current preset name.
  - `openspec/specs/simulation/spec.md` — add `taskName` field to `SimJob` and update `SimResult.label` semantics.
  - `openspec/specs/ui/spec.md` — add preset name display to `OddsTape` requirement.
- Affected code:
  - `src/types/index.ts` (SimJob type).
  - `src/state/app-state.ts` (currentPresetName signal, applyPresetConfig, resetToDefaults).
  - `src/app.tsx` (pass taskName in SimJob).
  - `src/worker/sim.worker.ts` (use taskName in result labels).
  - `src/components/OddsTape.tsx` (display preset name).

## Non-Goals

- No persistence of `currentPresetName` to localStorage. The signal is derived from the applied preset and resets on page reload (matching the behavior of other UI state).
- No change to the preset rail UI — the preset name is shown in the results panel, not in the rail.
- No change to the YAML save/load format — `taskName` is not serialized; it is inferred from the preset name on load.
- No change to the `ResultView` table or chart components — they already display `r.label` which will now include the preset name for sweep runs.
