# Proposal: lint-cleanup

## Why

ESLint was added to the project in commit `6d13d1b` (eslint.config.js + `npm run lint` + verification-loop skill). The configuration runs with strict rules (`@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `no-console`, `no-debugger` as **errors**) and a verification gate that blocks `READY` on new lint errors (per `AGENTS.md` rule 11 and the verification-loop skill Phase 2).

However, the existing source code predates the linter and produces **57 lint errors and 9 warnings** on first run. This is a blocker for the verification gate and must be fixed before the linter can usefully gate new code.

Per `AGENTS.md` rule 11 ("Do not lower rule severity to make lint pass. If a rule is wrong, fix the code."), the fix is to refactor the offending code, not to weaken rules.

## What Changes

- **Remove all unused imports and variables** flagged by `@typescript-eslint/no-unused-vars` across `src/` and `tests/`.
- **Eliminate `any` types** flagged by `@typescript-eslint/no-explicit-any`. Replace with:
  - `unknown` when the value is genuinely untyped (paired with a narrowing check or `satisfies`).
  - Concrete types from `src/types/` when the shape is known.
  - Typed test fixtures (`as const` arrays, generic helper signatures) in `tests/`.
- **Remove empty block statements** (`no-empty`) in `src/state/persistence.ts:18,42` (legacy v1→v3 migration fall-throughs).
- **Remove useless assignments** (`no-useless-assignment`) in `src/domain/resolve.ts:81` and `src/utils/validation.ts:212`.
- **Remove or convert `console.log` calls** in `src/` to `console.warn`/`console.error` (only those are allowed) or remove them entirely.
- **No rule is weakened or disabled** in `eslint.config.js`.
- **No source-level `eslint-disable` comments** are added. (Inline disables are a code smell and contradict rule 11; if a file has a legitimate need, the spec must be amended in a follow-up change.)
- **No public API change**. All public function signatures stay backwards compatible; internal `any`-typed helpers gain types but their runtime behaviour does not change.
- **No test change is allowed to weaken assertions.** Tests may be re-typed (e.g. `as Foo` → `satisfies Foo`), but the assertions themselves remain the same.

## Impact

- Affected specs (new spec created by this change):
  - `openspec/specs/code-quality/spec.md` — define the lint-cleanliness requirement and the "no rule suppression" invariant.
- Affected code (all under `src/` and `tests/`):
  - `src/components/*` (unused imports, `any` in event handlers).
  - `src/domain/resolve.ts`, `src/domain/classify.ts`, `src/domain/matching.ts`, `src/domain/reroll.ts`, `src/domain/roller.ts`, `src/domain/presets.ts` (unused type imports, `any` in matcher helpers).
  - `src/state/app-state.ts`, `src/state/persistence.ts` (empty blocks in migration, `any` casts in v1→v3 parser, possible `console.log` calls).
  - `src/utils/validation.ts`, `src/utils/format.ts` (unused type imports, `any` casts, useless assignment).
  - `src/worker/sim.worker.ts` (`any` in simulation loop hot path).
  - `src/types/index.ts` — possible new helper types introduced to replace `any`; **must remain spec-consistent** (per AGENTS.md rule 2, this triggers the spec-first workflow).
  - `tests/*` (unused type-only imports, `any` in test fixtures).
- Verification:
  - `npm run lint` exits 0 with 0 errors and 0 warnings.
  - `npm run typecheck` still passes.
  - `npm run test` still passes (143/143, plus any tests added by this change).
  - `npm run build` still passes.

## Non-Goals

- No change to runtime behaviour, algorithms, data models, or UI.
- No change to OpenSpec specs other than creating the new `code-quality` spec.
- No change to ESLint configuration (`eslint.config.js`).
- No new dependencies.
- No addition of `eslint-disable` comments.
- No migration of v3/v4 saved configurations.
- No preset changes.
