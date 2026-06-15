# Design: preset-clears-results

## Goals

- Switching presets tears down any in-flight simulation cleanly, with no race between the old worker and the new configuration.
- The Results step never shows stale data from a previous preset.
- The wizard returns to step 0 (Dice Pool & Reroll) so the user sees the new pool first.
- The `>50M` confirmation gate (`confirmedHighCost`) does not survive a preset change — the new preset might be cheap.

## Non-Goals

- No change to the `resetToPreset` helper in `app-state.ts`.
- No change to the worker message protocol; the worker is just terminated.
- No undo / confirmation prompt.

## Apply order

The order of operations in `PresetSelector.applyPreset` is significant. Clear, then assign:

```ts
function applyPreset(id: string) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;

  simResults.value = [];
  simError.value = null;
  isSimulating.value = false;
  cancelWorkerIfAny();   // see "Worker cancellation" below
  currentStep.value = 0;
  confirmedHighCost.value = false;
  highlightTargetId.value = null;
  highlightTargetKind.value = null;

  dicePool.value = { ...preset.pool, terms: preset.pool.terms.map((t) => ({ ...t })) };
  rerollConditions.value = preset.rerollConditions.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } }));
  pipeline.value = preset.pipeline.map((p) => ({ ...p }));
  outcomes.value = preset.outcomes.map((o) => ({ ...o, conditions: [...o.conditions] }));
  parameters.value = preset.parameters?.map((p) => ({ ...p })) ?? [];
}
```

Clearing `simResults` *before* assigning the new pool/pipeline ensures that any effect watching these signals sees a clean intermediate state, not a mix of old results and new pool.

## Worker cancellation

The existing pattern in `src/app.tsx` keeps the `Worker` instance in a module-local variable:

```ts
let worker: Worker | null = null;
// ... inside runSimulation:
worker = new Worker(...);
// onmessage on result/error terminates the worker.
function cancelSimulation() {
  worker?.terminate();
  worker = null;
  isSimulating.value = false;
}
```

The simplest path is to expose `cancelSimulation` from `app.tsx` and call it from `PresetSelector.applyPreset`. This avoids duplicating the worker reference. The plan's optional step "expose a `resetSimulation()` helper from `app.tsx`" makes this a one-line change.

```ts
// src/app.tsx
export function cancelSimulation() {
  worker?.terminate();
  worker = null;
  isSimulating.value = false;
}
```

```ts
// src/components/PresetSelector.tsx
import { cancelSimulation, simResults, simError } from '@/app';
import { isSimulating, confirmedHighCost, highlightTargetId, highlightTargetKind } from '@/state/app-state';
import { currentStep } from '@/components/StepWizard';
```

## Risks

- **Worker reference is in `app.tsx` module scope** — exporting `cancelSimulation` exposes a function that mutates module state, but the worker is also accessed from `runSimulation` in the same file, so the encapsulation is unchanged.
- **Reactive `effect` for `confirmedHighCost` reset on parameter change** — already in `app-state.ts:77-83`. We do not need to replicate it; we just clear the flag explicitly because `applyPreset` may not change `parameters`.
- **`activeSweepsByTarget` is computed from `parameters`** — when `parameters.value` is reassigned, the computed updates automatically. No explicit reset is needed.
