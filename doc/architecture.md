# Dicestats — Architecture

## 1. Overview

Single-page web application for calculating dice roll outcome probabilities in tabletop RPGs using Monte Carlo simulation (1,000,000 iterations). The user configures a dice pool with tags, reroll/explode conditions, a resolution pipeline of named values, and outcome conditions — then receives probabilities as tables and charts.

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Build | Vite | 8.x | Dev server, bundler, HMR |
| UI | Preact | 10.x | Component rendering (~3 KB) |
| Reactivity | Preact Signals | 2.x | State management without providers |
| Styles | Tailwind CSS | 4.x | Utility-first CSS |
| Charts | Chart.js | 4.x | Histograms, line charts |
| Simulation | Web Worker | — | Background computation without blocking UI |
| Testing | Vitest | 4.x | Unit and integration tests |
| Language | TypeScript | 6.x | Static typing |

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        UI (Preact)                          │
│                                                              │
│  App                                                         │
│   ├── PresetSelector ─── PresetLibraryModal                 │
│   ├── DicePoolEditor ─── SweepIndicator ─── SweepPopover    │
│   ├── RerollEditor                                           │
│   ├── PipelineEditor ─── SweepIndicator                     │
│   ├── OutcomeEditor ─── SweepIndicator                      │
│   ├── ParameterEditor ─── SweepPopover                      │
│   ├── SweepCostChip                                          │
│   ├── ResultView                                             │
│   ├── OddsTape                                               │
│   ├── OutcomeChart / ParameterChart (DistributionChart)     │
│   └── ui.tsx (Section, Button, TextField, Select, Pill,     │
│               Checkbox, IconButton, BracketedNameInput,      │
│               Hairline, Stat)                                │
├─────────────────────────────────────────────────────────────┤
│                   State Layer (Signals)                      │
│                                                              │
│  dicePool ──────────── DicePool                             │
│  rerollConditions ──── RerollCondition[]                    │
│  pipeline ──────────── NamedValue[]                         │
│  outcomes ──────────── Outcome[]                            │
│  parameters ────────── Parameter[]                          │
│  simResults ────────── SimResult[]                          │
│  isSimulating ──────── boolean                              │
│  simProgress ───────── { completed, total }                 │
│  dicePoolNotation ──── computed string                      │
│  userPresets ───────── PresetConfig[]                       │
│  allPresets ────────── computed PresetConfig[]              │
│  showComments ──────── boolean                              │
│  configDirty ───────── boolean                              │
├─────────────────────────────────────────────────────────────┤
│                     Domain Layer                             │
│                                                              │
│  types/index.ts ──── all types + compare()                  │
│  domain/roller.ts ── rollDie(), rollPool()                  │
│  domain/matching.ts ─ matchClause(), matchConditions(),     │
│                       findSides()                            │
│  domain/reroll.ts ── applyRerollConditions()                │
│  domain/resolve.ts ─ evaluatePipeline()                     │
│  domain/classify.ts ─ evaluateOutcome(), evaluateOutcomes() │
│  domain/presets.ts ─ PRESETS[], FEATURED_PRESET_IDS,        │
│                       getPreset()                            │
├─────────────────────────────────────────────────────────────┤
│                   Engine (Web Worker)                        │
│                                                              │
│  worker/sim.worker.ts                                        │
│  ├── rollDie(), rollPool() (inlined for isolation)          │
│  ├── applyRerollConditions() (inlined)                      │
│  ├── simulateOnce() → { distributionKey, outcomeName }      │
│  ├── runSimulation() → SimResult                            │
│  ├── applyParameter() → modified SimJob                     │
│  └── onmessage: run | cancel → progress | result | error   │
├─────────────────────────────────────────────────────────────┤
│                      Utilities                               │
│                                                              │
│  utils/format.ts ─── formatPercent, formatNumber,           │
│                      formatRatio, formatSweepRange           │
│  utils/validation.ts ─ validateConfig(), canRunSimulation(),│
│                        inferType(), isScalarCondition()      │
│  utils/yaml.ts ───── parsePreset(), serializePreset(),      │
│                      exportConfigAsYaml()                    │
├─────────────────────────────────────────────────────────────┤
│                     Persistence                              │
│  state/persistence.ts ─ localStorage (v1→v6 migration)     │
│  saveConfig() / loadConfig() / clearConfig()                │
│  exportCurrentAsYaml() / importPresetFromYamlText()         │
│  loadUiPrefs() / saveUiPrefs()                              │
└─────────────────────────────────────────────────────────────┘
```

## 4. Domain Model

### 4.1. Dice Pool

```typescript
interface DiceTerm {
  id: string;          // crypto.randomUUID()
  count: number;       // 1..99
  sides: number;       // 1..999
  tag: string;         // user-defined label for differentiation
  comment: string;     // optional annotation
}

interface DicePool {
  terms: DiceTerm[];
}
```

### 4.2. Reroll Conditions

```typescript
type RerollAction = 'reroll' | 'explode';

type ConditionClause =
  | { field: 'face'; operator: ConditionOperator; value: number | FaceValueSpecial }
  | { field: 'tag'; operator: '=' | '!='; value: string };

type ConditionChain = {
  clauses: ConditionClause[];
  connector: 'and' | 'or';
};

interface RerollCondition {
  id: string;
  action: RerollAction;
  conditions: ConditionChain;
  repeat: number;       // reroll: max attempts; explode: max cascade depth
  comment: string;
}
```

### 4.3. Resolution Pipeline

```typescript
type VectorFunction =
  | { fn: 'filter'; conditions: ConditionChain }
  | { fn: 'remove'; conditions: ConditionChain };

type ScalarFunction =
  | 'count' | 'sum' | 'max' | 'min'
  | { fn: ScalarBinaryOp; operand: 'literal'; value: number }
  | { fn: ScalarBinaryOp; operand: 'named'; source2: string }
  | { fn: 'ceil' } | { fn: 'floor' }
  | { fn: 'max'; operand: 'named'; source2: string }
  | { fn: 'min'; operand: 'named'; source2: string };

interface NamedValue {
  id: string;
  name: string;
  source: string;
  op: VectorFunction | ScalarFunction;
  comment: string;
}
```

### 4.4. Outcomes

```typescript
type ScalarCondition = { source: string; op: ConditionOperator; value: number };
type DiceCondition = { source: string; op: 'any' | 'all' | 'none'; subCondition: ConditionOperator; value: number };
type OutcomeCondition = ScalarCondition | DiceCondition;

interface Outcome {
  id: string;
  name: string;
  conditions: OutcomeCondition[];
  connector: 'and' | 'or';
  comment: string;
  isDefault: boolean;
}
```

### 4.5. Parameters

```typescript
type ParameterTarget = 'pool.count' | 'pool.sides' | 'outcome.value' | 'pipeline.literal';

interface Parameter {
  id: string;
  label: string;
  values: number[];
  target: ParameterTarget;
  targetTermId?: string;
  targetOutcomeId?: string;
  targetPipelineId?: string;
}
```

### 4.6. Results

```typescript
interface SimResult {
  label: string;                              // "" for single, "DC=15" for parameterized
  outcomes: OutcomeResult[];
  totalRolls: number;
  distribution: Record<number, number>;       // final scalar value → frequency
}
```

## 5. Key Algorithms

### 5.1. Single Simulation Iteration

```
1. Roll all dice → TaggedDie[] (face + tag)
2. Apply reroll conditions in order (reroll or explode)
3. Evaluate resolution pipeline → Map<name, PipelineValue>
4. Evaluate outcomes in order → first match wins
5. Record distribution key (last scalar pipeline value or dice sum)
```

### 5.2. Parameter Sweep

```
For each parameter value:
  Clone job, apply parameter value to target
  Run full simulation (1M iterations)
  Collect SimResult with label = "ParamName=value"
Return SimResult[]
```

### 5.3. Worker Isolation

The worker inlines `rollDie`, `rollPool`, and `applyRerollConditions` because Web Workers cannot share modules with the main thread without bundling. It imports pure domain functions from `matching.ts`, `resolve.ts`, and `classify.ts` which have no Preact/DOM dependencies.

## 6. UI Components

| Component | Purpose |
|---|---|
| `App` | Root component, Worker management, persistence, validation |
| `PresetSelector` | Featured preset pills + Save/Load YAML buttons |
| `PresetLibraryModal` | Searchable modal with all presets |
| `DicePoolEditor` | Add/remove/edit dice terms with tag colors |
| `RerollEditor` | Reroll/explode condition rows |
| `PipelineEditor` | Named-value pipeline rows |
| `OutcomeEditor` | Outcome rows with condition editors |
| `ParameterEditor` | Parameter sweep configuration |
| `SweepCostChip` | Shows total simulation cost, confirm button for >50M |
| `SweepIndicator` | Inline pill showing active sweep on a target |
| `SweepPopover` | Modal for creating sweep parameters |
| `ResultView` | Probability table |
| `OddsTape` | Top-probability highlight with bar visualization |
| `OutcomeChart` | Chart.js bar chart for single-result distributions |
| `ParameterChart` | Chart.js line chart for parameter sweep probabilities |
| `ui.tsx` | Shared primitives: Section, Button, TextField, Select, Pill, Checkbox, IconButton, etc. |

## 7. Data Flow

```
User → DicePoolEditor → dicePool (signal)
User → RerollEditor → rerollConditions (signal)
User → PipelineEditor → pipeline (signal)
User → OutcomeEditor → outcomes (signal)
User → ParameterEditor → parameters (signal)
User → PresetSelector → applyPresetConfig()

User → "Roll the Dice" → App.runSimulation()
  ├ construct SimJob from signals
  ├ new Worker(sim.worker.ts)
  ├ worker.postMessage({type:'run', job})
  ├ on progress → simProgress signal
  └ on result → simResults signal

simResults → OddsTape (top probability)
simResults → ResultView (table)
simResults → OutcomeChart (bar) or ParameterChart (line)

Auto-save: configDirty signal → 2s interval → saveConfig()
App mount → loadConfig() → migrate if needed
```

## 8. File Structure

```
dev/dice/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── src/
│   ├── main.tsx                  # Entry point
│   ├── app.tsx                   # Root component + Worker management
│   ├── style.css                 # Tailwind imports + theme + fonts
│   ├── vite-env.d.ts             # Vite type declarations
│   ├── types/
│   │   └── index.ts              # All domain types + compare()
│   ├── domain/
│   │   ├── roller.ts             # rollDie(), rollPool()
│   │   ├── matching.ts           # matchClause(), matchConditions(), findSides()
│   │   ├── reroll.ts             # applyRerollConditions()
│   │   ├── resolve.ts            # evaluatePipeline()
│   │   ├── classify.ts           # evaluateOutcome(), evaluateOutcomes()
│   │   └── presets.ts            # PRESETS[], FEATURED_PRESET_IDS, getPreset()
│   ├── worker/
│   │   └── sim.worker.ts         # Web Worker simulation
│   ├── state/
│   │   ├── app-state.ts          # Preact Signals (global state)
│   │   └── persistence.ts        # localStorage save/load/migrate (v1→v6)
│   ├── components/
│   │   ├── ui.tsx                # Shared UI primitives
│   │   ├── DicePoolEditor.tsx
│   │   ├── RerollEditor.tsx
│   │   ├── PipelineEditor.tsx
│   │   ├── OutcomeEditor.tsx
│   │   ├── ParameterEditor.tsx
│   │   ├── ResultView.tsx
│   │   ├── PresetSelector.tsx
│   │   ├── PresetLibraryModal.tsx
│   │   ├── DistributionChart.tsx  # OutcomeChart + ParameterChart
│   │   ├── OddsTape.tsx
│   │   ├── SweepCostChip.tsx
│   │   ├── SweepIndicator.tsx
│   │   └── SweepPopover.tsx
│   └── utils/
│       ├── format.ts             # Number formatting
│       ├── validation.ts         # validateConfig(), inferType()
│       └── yaml.ts               # YAML parse/serialize for presets
├── tests/
│   ├── roller.test.ts
│   ├── reroll.test.ts
│   ├── resolve.test.ts
│   ├── classify.test.ts
│   ├── matching.test.ts
│   ├── presets.test.ts
│   ├── integration.test.ts
│   ├── validation.test.ts
│   ├── app-state.test.ts
│   ├── format.test.ts
│   └── yaml.test.ts
└── public/
    └── favicon.svg
```

## 9. Known Technical Debt

1. **Worker code duplication**: `rollDie`, `rollPool`, `applyRerollConditions` are inlined in `sim.worker.ts` for worker isolation. This is by design — the worker cannot import from modules that may reference Preact/DOM.

2. **doc/spec.md is partially outdated**: The spec describes an older Outcome model with `source` on the Outcome itself. The code moved `source` to each `OutcomeCondition`. OpenSpec specs in `openspec/specs/` take precedence.

3. **Persistence version**: Currently at v6. Migration chain: v1→v3→v4→v5→v6.
