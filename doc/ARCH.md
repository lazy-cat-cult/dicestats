# Architecture

## Overview

Single-page Monte Carlo dice probability calculator. UI runs in the main thread; the 1M-iteration simulation runs in a **Web Worker** to keep the interface responsive.

## Data Flow

```
User edits config  →  Preact Signals (app-state)  →  validateConfig()
                                                          ↓
                                              Worker: sim.worker.ts
                                              ┌─────────────────────┐
                                              │ rollPool()          │ ← pure random
                                              │ applyRerollConditions│
                                              │ evaluatePipeline()  │ ← pure function
                                              │ evaluateOutcomes()  │ ← pure function
                                              └─────────┬───────────┘
                                                        ↓
                                              SimResult[] → Components (charts, odds, table)
```

The **Worker** receives a `SimJob` message, runs the simulation loop, and posts `SimResult` messages back. The main thread manages the Worker lifecycle (`app.tsx`: `runSimulation`, `runSample`, `cancelSimulation`).

## Module Map

```
src/
├── main.tsx                     — Vite entry point, renders <App/>
├── app.tsx                      — Root component: Worker lifecycle, top-level layout
├── state/
│   ├── app-state.ts             — Preact Signals: dicePool, pipeline, outcomes, sweep, etc.
│   ├── persistence.ts           — localStorage save/load/migrate (v1→v9)
│   └── my-presets.ts            — User preset management
├── domain/                      — Pure functions, no DOM/Preact dependencies
│   ├── roller.ts                — rollDie(), rollPool() — random dice generation
│   ├── matching.ts              — matchClause(), matchConditions(), findSides()
│   ├── reroll.ts                — applyRerollConditions() — reroll/explode logic
│   ├── resolve.ts               — evaluatePipeline() — vector→scalar pipeline
│   ├── classify.ts              — evaluateOutcome(), evaluateOutcomes()
│   └── presets.ts               — Built-in RPG system presets
├── worker/
│   └── sim.worker.ts            — Simulation loop, inlines roller+reroll, imports matching/resolve/classify
├── components/                  — Preact UI components
│   ├── ui.tsx                   — Shared primitives (Section, Button, TextField, Select, Pill, etc.)
│   ├── DicePoolEditor.tsx       — Step 1: dice terms
│   ├── RerollEditor.tsx         — Step 2: reroll/explode conditions
│   ├── PipelineEditor.tsx       — Step 3: resolution pipeline
│   ├── OutcomeEditor.tsx        — Step 4: outcome conditions
│   ├── SweepEditor.tsx          — Step 5: sweep (X/Y) parameters
│   ├── ResultView.tsx           — Probability table
│   ├── DistributionChart.tsx    — OutcomeChart + ParameterChart (Chart.js)
│   ├── OddsTape.tsx             — Compact odds display
│   ├── PresetSelector.tsx       — Preset dropdown
│   ├── PresetLibraryModal.tsx   — Preset management modal
│   ├── SampleView.tsx           — Single-throw trace with face overrides
│   ├── ConditionChainEditor.tsx  — Shared condition chain UI
│   ├── ExprInput.tsx             — Expression input with X/Y sweep variables
│   ├── SweepCostChip.tsx         — Computational cost indicator
│   ├── PresetSaveDialog.tsx      — Save preset prompt dialog
│   ├── MyPresetsContextMenu.tsx  — Context menu for user presets
│   └── ResultDetailsModal.tsx    — Detailed statistics modal
└── utils/
    ├── expression.ts            — Expr AST: parse, eval, format, sweep range parsing
    ├── format.ts                — Number formatting
    ├── validation.ts            — validateConfig(), canRunSimulation()
    ├── yaml.ts                  — YAML serialize/deserialize for presets
    ├── share.ts                 — URL share encoding (LZ-String)
    └── sample.ts                — buildSampleTrace() — single-throw trace
```

## Key Architectural Decisions

### 1. Web Worker Isolation
The Worker imports only pure modules (`matching.ts`, `resolve.ts`, `classify.ts`, `expression.ts`). It **inlines** `rollDie`, `rollPool`, and `applyRerollConditions` (duplicated from `roller.ts`/`reroll.ts`) to avoid any DOM dependency. The Worker never touches Preact, signals, or `localStorage`.

### 2. Preact Signals for State
All mutable state lives in `app-state.ts` as `signal<T>()`. Computed values use `computed()`. Effects persist to `localStorage` on change. The config is serialized on visibility change / pagehide to avoid data loss.

### 3. Sweep (X/Y Variables)
Sweep parameters feed into every expression cell via vars `{ x: number, y: number }`. The Worker loops `for y in yList: for x in xList: runSimulation(1M)`, producing one `SimResult` per (x,y) pair. Each result is independently charted.

### 4. Resolution Pipeline (Vector + Scalar)
Rolled dice form a `TaggedDie[]` in an environment map. The pipeline chains named values:
- **Vector ops**: filter, remove (produce `TaggedDie[]`)
- **Scalar ops**: count, sum, max, min, sub, binary arithmetic, switch/case (produce `number`)

Outcomes then evaluate scalar/dice conditions against the environment.

### 5. Pure Domain Functions
`matching.ts`, `resolve.ts`, `classify.ts` are side-effect-free functions receiving `(dice, config, vars) => result`. This makes them testable independently and safe for the Worker to import.

### 6. Configuration as Data
The entire simulation config (`DicePool + RerollCondition[] + NamedValue[] + Outcome[] + SweepParameters`) is a serializable `SimJob`. It is:
- Persisted in `localStorage` as `SavedConfig` (versioned)
- Shared via URL hash (LZ-String compressed)
- Exported/imported as YAML presets

### 7. Spec-Driven Development
All data models, algorithms, and UI behavior are defined in `openspec/specs/` (11 spec directories). Changes must follow the OpenSpec process: propose → apply → archive.

### 8. Worker Isolation
Worker (`src/worker/sim.worker.ts`) imports only pure domain functions.

## Communication Protocol

```
Main Thread                          Worker
    │                                   │
    ├── postMessage({type:'run', job})──┤
    │                                   ├── progress messages (every 10K iterations)
    │   ◄── {type:'progress', ...} ─────┤
    │                                   │
    │   ◄── {type:'result', results} ───┤  — or —
    │   ◄── {type:'error', message} ────┤
    │                                   │
    ├── postMessage({type:'cancel'}) ───┤ → sets cancelled flag → loop exits
```

## Test Strategy

- **Unit tests** for each domain module (`roller`, `matching`, `reroll`, `resolve`, `classify`)
- **Integration tests** for full end-to-end simulation
- **Validation tests** for config validation
- **Format tests** for number/string formatting
- **YAML tests** for preset serialization
- **State tests** for app-state and persistence

All tests run via Vitest 4.x with `@testing-library/preact` for component tests.
