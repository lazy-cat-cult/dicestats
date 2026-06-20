# Dice Probability Calculator

SPA for calculating dice roll outcome probabilities in tabletop RPGs via Monte Carlo simulation (1M iterations). Built with **Vite + Preact + Signals + Tailwind CSS + Chart.js**, simulation runs in a **Web Worker**.

## Tech Stack

| Layer | |
|---|---|
| Build | Vite 8.x |
| UI | Preact 10.x, Signals 2.x |
| Style | Tailwind CSS 4.x |
| Charts | Chart.js 4.x |
| Tests | Vitest 4.x |
| Lang | TypeScript 6.x (strict) |

## Commands

| `npm run` | |
|---|---|
| `dev` | Dev server with HMR |
| `build` | `tsc --noEmit && vite build` |
| `test` | Run tests once |
| `typecheck` | Type-check only |
| `lint` | ESLint (flat config) |

## Project Structure

```
src/
├── main.tsx                  # Entry point
├── app.tsx                   # Root + Worker management
├── types/index.ts            # Domain types + compare()
├── domain/                   # Core logic (roller, matching, reroll, resolve, classify, presets)
├── worker/sim.worker.ts      # Simulation loop
├── state/                    # Preact Signals (app-state, persistence)
├── components/               # UI (editors, chart, odds, preset, sweep)
└── utils/                    # format, validation, yaml
tests/                        # Vitest — 14 test suites
yaml/                         # RPG system presets (dnd_5e, pbta, daggerheart, blades)
openspec/specs/               # Spec-driven development — source of truth for data/behavior
```

## Key Conventions

- **Spec-first**: Consult `openspec/specs/` before modifying types, algorithms, or UI. Use `/opsx:propose` / `/opsx:apply` for changes.
- **`@/`** maps to `./src/`.
- **Pure domain**: `matching.ts`, `resolve.ts`, `classify.ts` are side-effect-free, shared with the Worker.
- **`max`/`min`** are scalar (single value), not vector (keep N dice).
- **English only** in UI. No code comments unless requested.
- **Run `typecheck` + `test` + `lint` after every change.**

## OpenSpec Specs

`openspec/specs/` — 11 spec directories covering dice-pool, reroll, pipeline, outcomes, parameters, presets, persistence, simulation, validation, UI, code-quality.
