---
name: verification-loop
description: >
  Verification gates for the dice probability calculator (Vite + Preact + TypeScript + Vitest + OpenSpec). Runs build, type-check, lint, tests, OpenSpec validation, worker isolation check, and diff review after every code change, and produces a structured VERIFICATION REPORT.
metadata:
  origin: ECC (adapted to dice project)
---

# Verification Loop Skill

A verification system tailored to **dev/dice**: Vite + Preact + TypeScript 6 + Vitest 4 + OpenSpec.

## When to Use

Invoke this skill:
- After completing a feature, refactor, or any non-trivial code change
- After editing domain logic (`src/domain/`, `src/worker/`) or domain types (`src/types/`)
- After changing OpenSpec specs or applying an OpenSpec change
- Before considering work done

Skip only for: typo-only edits, single-line cosmetic changes, or pure docs/comments changes.

## Project Commands

```bash
npm run build        # tsc --noEmit + vite build
npm run typecheck    # tsc --noEmit only
npm run test         # vitest run
npm run lint         # eslint .
npx openspec validate --strict   # when OpenSpec specs/changes are touched
```

## Verification Phases

Run phases in order. Stop and fix on first FAIL in Phases 1–3.

### Phase 1: Type Check + Build

```bash
npm run build 2>&1 | tail -30
```

`build` runs `tsc --noEmit` (strict) then `vite build`. Either failure is a FAIL.

### Phase 2: Lint

```bash
npm run lint 2>&1 | tail -30
```

The project runs ESLint with **strict** settings: `no-unused-vars`, `no-explicit-any`, `no-console` (allow `warn`/`error` only), `no-debugger` are errors.

- **Zero new lint errors** introduced by the change is required for PASS.
- Pre-existing lint errors are tracked tech debt and reported in the report, but do not block `READY` until the change has touched that file.
- **Do not lower rule severity** to make lint pass. If a rule is wrong, fix the code.

### Phase 3: Test Suite

```bash
npm run test 2>&1 | tail -60
```

If `@vitest/coverage-v8` is installed, also run coverage; otherwise omit.

Report: total / passed / failed. Any failed test is FAIL.

### Phase 4: OpenSpec Validation

Run when an OpenSpec change is in progress, or when `src/types/`, `src/domain/`, or any spec file was modified.

```bash
npx openspec validate --strict
```

If no `openspec/` change is active and specs were not modified, report `SKIP`.

### Phase 5: Worker Isolation Check

When touching `src/domain/` or `src/worker/`, the worker imports domain modules. They must remain free of Preact, DOM, and Node APIs.

```bash
grep -nE "from ['\"]preact" src/domain/*.ts 2>/dev/null
grep -nE "(window|document|navigator|localStorage|fetch|process\\.)" src/domain/*.ts 2>/dev/null
```

Any hit is a FAIL. Move the offending code into a non-worker module (e.g. `src/state/`, `src/components/`).

### Phase 6: Domain Convention Spot-Checks

```bash
# Russian strings in source (must be empty — UI is English-only)
grep -rnP "[Ѐ-ӿ]" src/ 2>/dev/null

# Code comments (only allowed if explicitly requested by the user)
grep -rnE "^\s*//" src/ 2>/dev/null | head -20

# Disallowed legacy names
grep -rnE "keep_(highest|lowest)" src/ 2>/dev/null
```

### Phase 7: Diff Review

```bash
git status
git diff --stat
git diff
```

Check for:
- Unintended files (stray editor files, build artefacts)
- Missing error handling in `resolve.ts` / `classify.ts` / `reroll.ts`
- Violations of AGENTS.md conventions
- **Preset coverage**: if a new feature was added (new reroll kind, pipeline step, outcome shape), `src/domain/presets.ts` must be updated

## Output Format

Produce a `VERIFICATION REPORT` in this exact shape:

```
VERIFICATION REPORT
===================

Build:       [PASS/FAIL]
Lint:        [PASS/FAIL] (X new errors, Y pre-existing errors, Z warnings)
Tests:       [PASS/FAIL] (X/Y passed)
OpenSpec:    [PASS/FAIL/SKIP]
Worker:      [PASS/FAIL/SKIP]
Conventions: [PASS/FAIL]
Diff:        [X files changed]

Overall:     [READY / NOT READY]

Issues to Fix:
1. ...
2. ...
```

`READY` requires every applicable phase to be `PASS` (or `SKIP` for OpenSpec/Worker when not relevant).

## Continuous Mode

For long sessions, run verification after every meaningful unit of work, not only at the end:
- After finishing a domain function
- After applying an OpenSpec change
- Before moving to the next task

Re-run any phase that touches its area; a full re-run is only needed before declaring work done.
