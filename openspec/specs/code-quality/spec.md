# code-quality Specification

## Purpose
TBD - created by archiving change lint-cleanup. Update Purpose after archive.
## Requirements
### Requirement: Lint Cleanliness

The command `npm run lint` SHALL exit with code 0 on `main` at all times, and its output SHALL contain zero errors and zero warnings.

#### Scenario: Lint exits 0 on a clean tree

- GIVEN a working tree that matches `main`
- WHEN `npm run lint` is run
- THEN the exit code is 0
- AND the output contains 0 errors and 0 warnings

#### Scenario: New lint errors block READY

- GIVEN a change that adds a new file with one unused import
- WHEN the `verification-loop` skill runs
- THEN `Lint:` reports `FAIL (1 new error)`
- AND `Overall:` is `NOT READY`

### Requirement: No Rule Suppression

The ESLint configuration SHALL NOT lower the severity of any enforced rule. The source tree SHALL NOT contain `eslint-disable` comments in `src/` or `tests/`.

#### Scenario: No severity downgrade

- GIVEN `eslint.config.js` in the repository
- WHEN the file is inspected
- THEN the enforced rules (`@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `no-console`, `no-debugger`) have severity `error` or `off` (turned off entirely, never downgraded to `warn`)

#### Scenario: No inline disables

- GIVEN the source tree
- WHEN `git grep -nE "eslint-disable" src/ tests/` is run
- THEN no matches are returned

### Requirement: Type Safety

The `any` type SHALL NOT appear in `src/` or `tests/`. Public function signatures SHALL use precise types from `src/types/index.ts` or other domain modules.

#### Scenario: No any in source

- GIVEN the source tree
- WHEN `git grep -nE ": any\\b" src/ tests/` (and the equivalent for `as any`, `<any>`, `Array<any>`) is run
- THEN no matches are returned, with the exception of internal generic helpers that use `unknown` and narrow at the call site

#### Scenario: Test fixtures are typed

- GIVEN a test file with a fixture object
- WHEN the fixture is defined
- THEN it uses `as const` or a concrete type from `src/types/`, not `any`

### Requirement: No Debug Code in Production

The `console` API in `src/` SHALL be limited to `console.warn` and `console.error`. The `debugger` statement SHALL NOT appear in `src/` or `tests/`.

#### Scenario: No console.log in src

- GIVEN the source tree
- WHEN `git grep -nE "console\\.log" src/` is run
- THEN no matches are returned

#### Scenario: No debugger statements

- GIVEN the source tree
- WHEN `git grep -nE "\\bdebugger\\b" src/ tests/` is run
- THEN no matches are returned

### Requirement: Lint as a Gate

The `verification-loop` skill (`.kilocode/skills/verification-loop/SKILL.md`) SHALL treat a non-zero `npm run lint` exit code as `NOT READY`.

#### Scenario: Lint failure surfaces in the verification report

- GIVEN a change that breaks lint
- WHEN the `verification-loop` skill runs
- THEN the produced `VERIFICATION REPORT` shows `Lint: FAIL` and `Overall: NOT READY`

#### Scenario: AGENTS.md rule 11 is part of the spec

- GIVEN `AGENTS.md` rule 11 ("ESLint is strict — do not suppress rules")
- WHEN the rule is read
- THEN it is consistent with this specification and shall not be weakened by future changes without amending this spec

