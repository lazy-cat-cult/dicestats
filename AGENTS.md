# Dice Probability Calculator — Agent Instructions

## Project Overview

Single-page web application for calculating dice roll outcome probabilities in tabletop RPGs using Monte Carlo simulation (1,000,000 iterations). Built with **Vite + Preact + Tailwind CSS + Chart.js**, running simulation in a **Web Worker**.

- **Specification**: `doc/spec.md` — the source of truth for all data models, algorithms, UI, and behavior
- **Architecture**: `doc/architecture.md` — technical architecture diagram (partially outdated, spec.md takes precedence)

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 8.x |
| UI | Preact 10.x |
| Reactivity | Preact Signals 2.x |
| Styles | Tailwind CSS 4.x |
| Charts | Chart.js 4.x |
| Simulation | Web Worker |
| Tests | Vitest 4.x |
| Language | TypeScript 6.x |

## Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Type-check (tsc --noEmit) and build
npm run preview      # Preview production build
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run typecheck    # Type-check only (tsc --noEmit)
```

## Project Structure

```
dev/dice/
├── doc/
│   ├── spec.md             # SOURCE OF TRUTH — read this first
│   ├── spec_draft.md       # Original draft (historical)
│   └── architecture.md     # Architecture (partially outdated)
├── src/
│   ├── main.tsx            # Entry point
│   ├── app.tsx             # Root component + Worker management
│   ├── style.css            # Tailwind imports
│   ├── types/
│   │   └── index.ts        # Domain types + compare()
│   ├── domain/
│   │   ├── roller.ts       # Dice rolling (rollPool, rollDie)
│   │   ├── reroll.ts       # (TODO) applyRerollConditions()
│   │   ├── resolve.ts      # (TODO) evaluatePipeline()
│   │   ├── classify.ts     # Outcome evaluation
│   │   └── presets.ts      # Preset configurations
│   ├── worker/
│   │   └── sim.worker.ts    # Web Worker simulation engine
│   ├── state/
│   │   ├── app-state.ts    # Preact Signals (global state)
│   │   └── persistence.ts  # localStorage save/load
│   ├── components/
│   │   ├── StepWizard.tsx
│   │   ├── DicePoolEditor.tsx
│   │   ├── RerollEditor.tsx    # (TODO)
│   │   ├── PipelineEditor.tsx  # (TODO)
│   │   ├── OutcomeEditor.tsx
│   │   ├── ParameterEditor.tsx
│   │   ├── ResultView.tsx
│   │   ├── PresetSelector.tsx
│   │   └── DistributionChart.tsx
│   └── utils/
│       ├── format.ts       # Number formatting
│       └── validation.ts   # (TODO) validateConfig()
├── tests/
│   ├── roller.test.ts
│   ├── reroll.test.ts       # (TODO)
│   ├── resolve.test.ts      # (TODO)
│   ├── classify.test.ts
│   ├── presets.test.ts
│   ├── validation.test.ts   # (TODO)
│   └── integration.test.ts
└── public/
    └── favicon.svg
```

## Code Conventions

- **Language**: TypeScript with strict mode (`strict: true` in tsconfig)
- **Path aliases**: `@/` maps to `./src/`
- **State management**: Preact Signals (not React hooks). Use `signal()` for mutable state, `computed()` for derived values.
- **Component style**: Function components with Preact JSX. No class components.
- **CSS**: Tailwind utility classes only. No custom CSS files except `style.css` for Tailwind imports.
- **Types**: All domain types live in `src/types/index.ts`. Domain logic files should import from `@/types`.
- **Worker**: The simulation worker cannot import Preact or DOM APIs. Domain logic must be worker-safe (no `document`, `window`, Preact imports).
- **Presets**: All UI strings must be in **English** (no Russian). Existing Russian strings are legacy and must be replaced during migration.

## Current Migration Status

The project is migrating from v1 (current implementation) to v2 (as specified in `doc/spec.md`). The key differences:

| Feature | v1 (Current) | v2 (Target) |
|---|---|---|
| Dice tags | Not supported | `DiceTerm.tag` for differentiation |
| Reroll/Explode | Pool-level `ExplodeMode` | Per-condition `RerollCondition[]` |
| Resolution pipeline | Not supported | `NamedValue[]` with filter/remove/count/math |
| Outcomes | Two separate types | Unified `Outcome` with `source` + `conditions[]` |
| Parameters | `applyTo` enum | `target` with ID references |
| Comparison operator | `==` | `=` (user-facing) |

Migration phases are documented in `doc/spec.md` §17. Work through them incrementally: tags first, then reroll, then pipeline+outcomes together, then validation polish.

## Known Bugs (v1)

- `roller.ts:57`: `allKept` pushes original `termRolls` instead of kept values — keep logic bug
- `app.tsx:17`: `configLoaded` via closure is not idiomatic Preact
- `sim.worker.ts:29-38`: `keepHighest`/`keepLowest` lose tag information (currently operating on `number[]`)
- `classify.ts:82-141`: `evaluateOutcomeSimple` is unused dead code

## Important Rules

1. **Always read `doc/spec.md`** before making changes to data models, algorithms, or UI behavior. The spec is the source of truth.
2. **Never modify domain types** (`src/types/index.ts`) without updating `doc/spec.md` first or confirming consistency with it.
3. **Worker isolation**: Domain modules imported by the worker must not use Preact, DOM, or Node APIs.
4. **Run `npm run typecheck`** after code changes to verify TypeScript compilation.
5. **Run `npm run test`** after changes to domain logic to verify existing tests pass.
6. **English only** in all UI strings and code comments.
7. **No comments** in code unless explicitly requested.
8. **Presets** must be updated when adding new features (reroll conditions, pipeline, outcome format) to maintain full preset coverage.