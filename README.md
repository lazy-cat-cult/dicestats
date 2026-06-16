# Oddsboard — Dice Probability Calculator

A Monte Carlo dice probability calculator for tabletop RPGs. Runs 1,000,000 simulations per sweep in a Web Worker.

## Features

- **Dice pool**: arbitrary NdN combinations (d4, d6, d8, d10, d12, d20, d100) with tags
- **Reroll conditions**: reroll or explode on face value or tag match, with configurable repeat count
- **Resolution pipeline**: named-value pipeline with filter, remove, count, sum, max, min, binary math, ceil, floor
- **Outcomes**: scalar comparisons and dice conditions (any/all/none), AND/OR connectors, default fallback
- **Parameter sweep**: vary modifier, dice count, dice sides, or threshold — with dependency charts
- **Presets**: D&D 5e, PbtA, Shadowrun, Vampire V5, Daggerheart, Cyberpunk RED, Blades in the Dark, Savage Worlds, WoD
- **YAML import/export**: save and share presets as human-readable YAML files
- **Persistence**: configuration auto-saved to localStorage

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 8 |
| UI | Preact 10 + Signals |
| Styles | Tailwind CSS 4 |
| Charts | Chart.js 4 |
| Simulation | Web Worker |
| Tests | Vitest |
| Language | TypeScript 6 |

## Setup

```bash
cd dev/dice
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build (tsc + vite build) |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | Type checking |
| `npm run lint` | ESLint |

## Usage Scenarios

### D&D 5e: d20 vs difficulty class

1. Select "D&D 5e — d20" preset
2. Adjust modifier and DC threshold
3. Run simulation → get success probability

### D&D 5e: advantage with modifier

1. Select "D&D 5e — Advantage 2d20 best" preset
2. Add "DC" parameter with values 5–20
3. Run → get probability curve by DC

### PbtA: 2d6 miss / partial / full success

1. Select "PbtA — 2d6" preset
2. Run → three outcome probabilities

### Shadowrun: Xd6 pool

1. Select "Shadowrun — Xd6" preset
2. "Dice count" parameter with values 1–10
3. Run → probability of at least 1 hit per pool size

## Architecture

See [doc/architecture.md](doc/architecture.md) for the full architecture diagram.

```
UI (Preact Signals) → SimJob → Web Worker → SimResult[] → UI
     ↑                                    ↓
  localStorage ← persistence ← simResults
```

Domain types: `src/types/index.ts`
Rolling & classification: `src/domain/`
Web Worker: `src/worker/sim.worker.ts`
Components: `src/components/`

## Tests

183 tests across 11 test files covering:

- Dice rolling (1d20, 2d6, modifiers, explode, reroll)
- Condition matching (face, tag, compound clauses)
- Pipeline resolution (filter, remove, count, sum, max, min, binary math)
- Outcome classification (scalar, dice conditions, AND/OR, default)
- Presets (validation, application, YAML round-trip)
- Integration scenarios (D&D, PbtA, Shadowrun, Vampire V5 — probabilities within expected ranges)
- Validation rules
- Format utilities
- App state management
