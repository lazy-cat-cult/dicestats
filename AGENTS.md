# dice — Agent Instructions

Monte Carlo dice probability calculator (Vite + Preact + Tailwind + Chart.js, 1M iterations in a Web Worker).

## Spec-Driven Development

- **OpenSpec** (`openspec/specs/`) is the source of truth for models, algorithms, UI, and behavior.
- Use `/opsx:propose` before changing types (`src/types/index.ts`), data models, or algorithms.
- `doc/ARCH.md` — architecture reference.

## Mandatory Process

1. After every code change, run **`verification-loop`** skill until `Overall: READY for PR`.
2. `npm run typecheck && npm run test && npm run lint` — zero new errors.
3. **English only** in UI strings and comments.
4. **No comments** in code unless explicitly requested.
5. When adding features (reroll, pipeline, outcomes), update YAML presets in `yaml/` to maintain coverage.
