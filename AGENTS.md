# Dice Probability Calculator — Agent Instructions

## Project Overview

Single-page web application for calculating dice roll outcome probabilities in tabletop RPGs using Monte Carlo simulation (1,000,000 iterations). Built with **Vite + Preact + Tailwind CSS + Chart.js**, running simulation in a **Web Worker**.

- **Specification**: OpenSpec specs in `openspec/specs/` — the source of truth for all data models, algorithms, UI, and behavior. Use OpenSpec CLI commands and skills (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, etc.) to manage changes.
- **Architecture**: `doc/architecture.md` — technical architecture diagram (partially outdated, OpenSpec specs take precedence)

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
│   ├── spec.md             # Historical spec (superseded by OpenSpec specs)
│   ├── spec_draft.md       # Original draft (historical)
│   └── architecture.md     # Architecture (partially outdated)
├── src/
│   ├── main.tsx            # Entry point
│   ├── app.tsx             # Root component + Worker management
│   ├── style.css            # Tailwind imports
│   ├── vite-env.d.ts        # Vite type declarations
│   ├── types/
│   │   └── index.ts        # Domain types + compare()
│   ├── domain/
│   │   ├── roller.ts       # Dice rolling (rollPool, rollDie)
│   │   ├── matching.ts     # Shared: matchClause(), matchConditions(), findSides()
│   │   ├── reroll.ts       # applyRerollConditions()
│   │   ├── resolve.ts      # evaluatePipeline()
│   │   ├── classify.ts     # evaluateOutcome(), evaluateOutcomes()
│   │   └── presets.ts      # Preset configurations
│   ├── worker/
│   │   └── sim.worker.ts    # Web Worker simulation (imports from matching, resolve, classify)
│   ├── state/
│   │   ├── app-state.ts    # Preact Signals (global state)
│   │   └── persistence.ts  # localStorage save/load/migrate (v1→v3 migration)
│   ├── components/
│   │   ├── StepWizard.tsx
│   │   ├── DicePoolEditor.tsx
│   │   ├── RerollEditor.tsx
│   │   ├── PipelineEditor.tsx
│   │   ├── OutcomeEditor.tsx
│   │   ├── ParameterEditor.tsx
│   │   ├── ResultView.tsx
│   │   ├── PresetSelector.tsx
│   │   └── DistributionChart.tsx
│   └── utils/
│       ├── format.ts       # Number formatting
│       └── validation.ts   # validateConfig(), canRunSimulation()
├── tests/
│   ├── roller.test.ts
│   ├── reroll.test.ts
│   ├── resolve.test.ts
│   ├── classify.test.ts
│   ├── matching.test.ts
│   ├── presets.test.ts
│   ├── integration.test.ts
│   └── validation.test.ts
└── public/
    └── favicon.svg
```

## Design Decision: max/min vs keep_highest/keep_lowest

The original spec defined `keep_highest` and `keep_lowest` as **vector** operations (keeping N dice). The implementation replaces these with `max` and `min` as **scalar** operations returning a single value.

- **Old**: `kept = keep_highest rolled count=1` (two-step: vector→scalar)
- **New**: `best = max rolled` (one-step: directly scalar)

This is simpler for the common case ("roll 2d20, take the best"). The `keep_highest`/`keep_lowest` pattern of keeping N dice cannot be exactly replicated; `filter` conditions can approximate it for specific face-value conditions.

## Code Conventions

- **Language**: TypeScript with strict mode (`strict: true` in tsconfig)
- **Path aliases**: `@/` maps to `./src/`
- **State management**: Preact Signals (not React hooks). Use `signal()` for mutable state, `computed()` for derived values.
- **Component style**: Function components with Preact JSX. No class components.
- **CSS**: Tailwind utility classes only. No custom CSS files except `style.css` for Tailwind imports.
- **Types**: All domain types live in `src/types/index.ts`. Domain logic files should import from `@/types`.
- **Shared matching logic**: `matchClause()`, `matchConditions()`, and `findSides()` are centralized in `src/domain/matching.ts`. Domain modules (`reroll.ts`, `classify.ts`, `resolve.ts`) import from this shared module. The worker also imports from `matching.ts` since it has no Preact dependencies.
- **Worker**: The simulation worker imports `matchConditions` and `findSides` from `@/domain/matching`, and `evaluatePipeline`/`evaluateOutcomes` from domain modules. It inlines `rollDie`, `rollPool`, and `applyRerollConditions` since these need local implementations for the simulation loop.
- **Presets**: All UI strings must be in **English** (no Russian). Existing Russian strings are legacy and must be replaced during migration.
- **No comments** in code unless explicitly requested.

## Important Rules

1. **Use OpenSpec for spec-driven development.** Before making changes to data models, algorithms, or UI behavior, consult the specs in `openspec/specs/`. Use OpenSpec CLI (`openspec validate`, `openspec list --specs`) and skills (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`) to propose and manage changes. The OpenSpec specs are the source of truth.
2. **Never modify domain types** (`src/types/index.ts`) without updating the relevant OpenSpec spec first or confirming consistency with it. Use `/opsx:propose` to create a change for type modifications.
3. **Worker isolation**: Domain modules imported by the worker must not use Preact, DOM, or Node APIs. `matching.ts`, `resolve.ts`, and `classify.ts` are safe to import — they are pure functions with no side dependencies.
4. **Run `npm run typecheck`** after code changes to verify TypeScript compilation.
5. **Run `npm run test`** after changes to domain logic to verify existing tests pass.
6. **English only** in all UI strings and code comments.
7. **No comments** in code unless explicitly requested.
8. **Presets** must be updated when adding new features (reroll conditions, pipeline, outcome format) to maintain full preset coverage.
9. **`max` and `min` are scalar functions** — they return a single number from a vector, not a subset of dice. Do not confuse them with `keep_highest`/`keep_lowest`.