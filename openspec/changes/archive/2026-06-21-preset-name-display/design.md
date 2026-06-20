# Design: preset-name-display

## Goals

- The user can see which preset produced the current simulation results.
- The preset name appears in the OddsTape component above the "Top Probability" eyebrow.
- For parameter sweep runs, the preset name is prepended to each sweep label (e.g., `"D&D 5e — d20 · DC=15"`).
- The preset name is tracked as a signal and updates reactively when a preset is applied.
- Resetting to defaults clears the preset name.

## Non-Goals

- No persistence of `currentPresetName` to localStorage.
- No change to the preset rail UI.
- No change to the YAML save/load format.
- No change to the `ResultView` table or chart components (they already display `r.label`).

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Action                              │
│  (click preset pill, load YAML, or reset to defaults)           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    applyPresetConfig(preset)                     │
│  src/state/app-state.ts:92-98                                    │
│                                                                  │
│  • dicePool.value = ...                                          │
│  • rerollConditions.value = ...                                  │
│  • pipeline.value = ...                                          │
│  • outcomes.value = ...                                          │
│  • parameters.value = ...                                        │
│  • currentPresetName.value = preset.name  ← NEW                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    runSimulation()                               │
│  src/app.tsx:85-137                                              │
│                                                                  │
│  const job: SimJob = {                                           │
│    pool: ...,                                                    │
│    rerollConditions: ...,                                        │
│    pipeline: ...,                                                │
│    outcomes: ...,                                                │
│    parameters: ...,                                              │
│    iterations: 1_000_000,                                        │
│    taskName: currentPresetName.value ?? undefined  ← NEW         │
│  };                                                              │
│                                                                  │
│  worker.postMessage({ type: 'run', job });                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Worker: runSimulation()                       │
│  src/worker/sim.worker.ts:99-144                                 │
│                                                                  │
│  function runSimulation(                                         │
│    pool, rerollConditions, pipeline, outcomes,                   │
│    iterations,                                                   │
│    taskName?: string  ← NEW                                      │
│  ): SimResult {                                                  │
│    // ... simulation logic ...                                   │
│    return {                                                      │
│      label: taskName ?? '',  ← CHANGED (was always '')           │
│      outcomes: ...,                                              │
│      totalRolls: iterations,                                     │
│      distribution: ...,                                          │
│    };                                                            │
│  }                                                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Worker: Parameter Sweep Loop                  │
│  src/worker/sim.worker.ts:216-238                                │
│                                                                  │
│  for (const sweep of paramSweeps) {                              │
│    const result = runSimulation(..., taskName);                  │
│    result.label = taskName                                       │
│      ? `${taskName} · ${param.label}=${sweep.value}`  ← NEW     │
│      : `${param.label}=${sweep.value}`;                          │
│    results.push(result);                                         │
│  }                                                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OddsTape Component                            │
│  src/components/OddsTape.tsx                                     │
│                                                                  │
│  const presetName = currentPresetName.value;                     │
│                                                                  │
│  return (                                                        │
│    <div>                                                         │
│      {presetName && (                                            │
│        <p class="font-display text-[13px] ...">                  │
│          {presetName}                                            │
│        </p>                                                      │
│      )}                                                          │
│      <div class="flex items-center gap-2 mb-2">                  │
│        <span class="h-px w-6 bg-gold" />                         │
│        <p>Top Probability</p>                                    │
│      </div>                                                      │
│      {/* ... rest of OddsTape ... */}                            │
│    </div>                                                        │
│  );                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Type Changes

### SimJob (src/types/index.ts)

```typescript
export interface SimJob {
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters?: Parameter[];
  iterations: number;
  taskName?: string;  // NEW: optional preset name for result labeling
}
```

### SimResult (src/types/index.ts)

No change to the type definition. The `label` field already exists and is used for parameter sweep labels. This change extends its semantics:
- For single runs: `label` is now the preset name (or `''` if no preset).
- For sweep runs: `label` is `"PresetName · ParamLabel=Value"` (or `"ParamLabel=Value"` if no preset).

## Signal Changes

### currentPresetName (src/state/app-state.ts)

```typescript
export const currentPresetName = signal<string | null>(null);
```

- Set to `preset.name` in `applyPresetConfig`.
- Set to `null` in `resetToDefaults`.
- Not persisted to localStorage (derived state).

## Worker Message Protocol

No change to the `WorkerMessage` or `WorkerResponse` types. The `taskName` is passed as part of the existing `SimJob` payload.

## Risks

- **Worker isolation**: The worker already receives `SimJob` via `postMessage`. Adding an optional `taskName` field does not violate worker isolation — it is a plain string, not a Preact/DOM/Node object.
- **Backward compatibility**: Existing `SimJob` payloads without `taskName` will work correctly (the field is optional). The worker handles `taskName ?? ''` gracefully.
- **Reactive updates**: `currentPresetName` is a signal, so the OddsTape component will re-render automatically when the preset changes. No manual subscription is needed.
- **Sweep label format**: The `"PresetName · ParamLabel=Value"` format uses a middle dot (`·`) as a separator, matching the existing convention in the preset rail (user presets are marked with `·`).

## Testing Strategy

- **Unit test**: Add a test in `tests/app-state.test.ts` to verify that `applyPresetConfig` sets `currentPresetName.value` and `resetToDefaults` clears it.
- **Integration test**: Verify that the OddsTape component renders the preset name when `currentPresetName.value` is not null.
- **Manual test**: Apply a preset, run a simulation, and verify the preset name appears in the OddsTape. Apply a parameter sweep and verify the sweep labels include the preset name.
