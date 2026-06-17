## 1. Domain types

- [x] 1.1 Add a JSDoc note on `OutcomeResult.count` in `src/types/index.ts` clarifying that it counts iterations whose match-set contains the outcome name (multi-label) (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 1.2 No structural type changes required — `OutcomeResult` and `SimResult` shapes stay the same.
- [x] 1.3 Add `OutcomeOverlap` interface (`{outcomes: [string, string]; count: number; probability: number}`) to `src/types/index.ts` and add an `overlaps: OutcomeOverlap[]` field to `SimResult` (implements outcomes `Outcome Overlap Reporting`).

## 2. Classify

- [x] 2.1 Rewrite `evaluateOutcomes` in `src/domain/classify.ts` to return `string[]`: iterate all outcomes, collect every name whose conditions match, return the list (order preserved). If a default outcome exists, append it to the list unconditionally (deduplicated) (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 2.2 Remove the `defaultOutcome` fallback that returned a single name when nothing matched — in multi-label mode an empty array means "no match" (implements outcomes `Independent Multi-Label Evaluation`).

## 3. Worker

- [x] 3.1 In `src/worker/sim.worker.ts`, change the per-iteration loop to call the new `evaluateOutcomes(env)` (returns `string[]`) and increment each matched outcome's counter instead of picking one (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 3.2 Ensure outcome counters are stored as a `Map<string, number>` keyed by outcome name so out-of-order matches are aggregated correctly (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 3.3 In `src/worker/sim.worker.ts`, track pairwise co-occurrence: for every iteration whose match-set has length > 1, increment a counter keyed by `"outcomeA||outcomeB"` (outcomes sorted alphabetically to avoid duplicates). Convert the counter map into `SimResult.overlaps` sorted by descending count (implements outcomes `Outcome Overlap Reporting`).

## 4. Validation

- [x] 4.1 Remove the "exactly one default" enforcement in `src/utils/validation.ts` — zero or more defaults are now allowed (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 4.2 Drop any ordering-based validation that assumed first-match-wins (implements outcomes `Independent Multi-Label Evaluation`).

## 5. Presets

- [x] 5.1 Update the Daggerheart preset in `src/domain/presets.ts` and `doc/ttrpg/daggerheart.yaml`: drop the two general outcomes (`Success when total_mod >= 15 or delta = 0`, `Failure when total_mod < 15`), keep the four compound outcomes, mark `Failure with Fear` as `(default)` (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 5.2 Other built-in presets do not need changes — their conditions are mutually exclusive so probabilities still sum to 100%.

## 6. UI

- [x] 6.1 In `src/components/ResultView.tsx`, render each outcome's independent probability and an overlap-sum hint when `Σ probability > 1` (informational only) (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 6.2 In `src/components/OddsTape.tsx`, render each outcome's probability as an independent segment (segments can overlap visually; accept that) (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 6.3 In `src/components/DistributionChart.tsx`, ensure the chart accepts the new per-iteration match-set shape — verify the chart source iterates `result.outcomes` correctly (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 6.4 In `src/components/ResultView.tsx`, when `result.overlaps` is non-empty, render a warning block below the outcomes table that names every overlapping pair with its co-occurrence probability and count (implements outcomes `Outcome Overlap Reporting`).

## 7. Spec update

- [x] 7.1 In `openspec/specs/outcomes/spec.md`, delete the `Exclusive Evaluation Order` requirement and its `First match wins` scenario (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 7.2 Add `Independent Multi-Label Evaluation` requirement with scenarios: (a) all matching outcomes recorded for a single roll, (b) roll matching no outcomes returns empty match-set, (c) default outcome matches every roll regardless of conditions (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 7.3 Add `Outcome Overlap Reporting` requirement to `openspec/specs/outcomes/spec.md` with scenarios for co-occurring pair recorded, UI lists overlapping pairs, and no-overlaps-no-warning (implements outcomes `Outcome Overlap Reporting`).

## 8. Tests

- [x] 8.1 Rewrite `tests/classify.test.ts` tests that asserted single-name return values to assert array return values (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 8.2 Add a test in `tests/classify.test.ts` for Daggerheart's four compound outcomes: a roll with `delta = 0, total_mod = 17` matches both `Critical Success` (if defined) and `Failure with Fear` (default); a roll with `delta = 2, total_mod = 17` matches `Success with Hope` and `Failure with Fear` (default) (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 8.3 Update `tests/integration.test.ts` worker tests to use the multi-label counter semantics (implements outcomes `Independent Multi-Label Evaluation`).
- [x] 8.4 Update `tests/validation.test.ts` to remove the "exactly one default" test and replace with a "zero or more defaults allowed" test (implements outcomes `Independent Multi-Label Evaluation`).
- [ ] 8.5 Add a test in `tests/integration.test.ts` that runs a worker simulation with overlapping outcomes (e.g. PbtA with two general outcomes) and asserts `result.overlaps` contains the expected pair with the right count and probability (implements outcomes `Outcome Overlap Reporting`).

## 9. Verification

- [ ] 9.1 Run `npm run typecheck`; resolve any new type errors.
- [ ] 9.2 Run `npm run lint`; resolve any new lint errors (no rule suppression).
- [ ] 9.3 Run `npm run test`; ensure all existing tests pass after updates.
- [ ] 9.4 Run `npm run build`; ensure the production build succeeds.
- [ ] 9.5 Manual smoke check: load Daggerheart preset, run simulation, confirm the four compound outcomes each show non-zero probability and the overlap-sum hint appears.
- [ ] 9.6 Manual smoke check: load PbtA or Blades preset (partition outcomes), run simulation, confirm `overlaps` is empty and the warning block is hidden.
