## 1. Domain types

- [ ] 1.1 In `src/types/index.ts`, add `MatchSetCount` interface (`outcomes: string[]; count: number; probability: number`) (implements simulation `SimResult Structure`).
- [ ] 1.2 In `src/types/index.ts`, add `matchSets: MatchSetCount[]` field to `SimResult` (implements simulation `SimResult Structure`).

## 2. Domain statistics module

- [ ] 2.1 Create `src/domain/stats.ts` with `wilsonCI(count, total, z = 1.96): { lo: number; hi: number }` (implements result-statistics `Wilson Confidence Interval`).
- [ ] 2.2 In `src/domain/stats.ts`, add `distributionStats(distribution: Record<number, number>)` returning `{ p05, p25, p50, p75, p95, mean, stdDev, skewness }` (implements result-statistics `Distribution Statistics`).
- [ ] 2.3 In `src/domain/stats.ts`, add `shannonEntropy(probs: number[]): number` and `effectiveOutcomes(probs: number[]): number` (implements result-statistics `Outcome Entropy`).
- [ ] 2.4 In `src/domain/stats.ts`, add `marginalEffect(results: SimResult[], outcomeLabel: string, paramValues: number[]): number` and `breakEven(results: SimResult[], outcomeLabel: string, threshold = 0.5): number | null` (implements result-statistics `Sensitivity Metrics`).
- [ ] 2.5 In `src/domain/stats.ts`, add `topMatchSets(matchSets: MatchSetCount[], n = 10): MatchSetCount[]` (implements result-statistics `Top Match-Sets`).
- [ ] 2.6 In `src/domain/stats.ts`, add `lift(outcomeA: OutcomeResult, outcomeB: OutcomeResult, coCount: number, total: number): number | null` (implements result-statistics `Lift Between Outcomes`).

## 3. Worker

- [ ] 3.1 In `src/worker/sim.worker.ts`, accumulate a `matchSetCounts: Map<string, number>` per iteration keyed by the sorted-joined match-set label list (implements outcomes `Match-Set Frequency Reporting`).
- [ ] 3.2 Use a separator that cannot appear in an outcome name (a control character `\u0001`) to join labels so `"A"` and `"B\u0001C"` cannot collide (implements outcomes `Match-Set Frequency Reporting`).
- [ ] 3.3 After the iteration loop, convert `matchSetCounts` into a `MatchSetCount[]` sorted by descending count and capped at 50, attach to the returned `SimResult.matchSets` (implements simulation `SimResult Structure`).

## 4. Format utilities

- [ ] 4.1 In `src/utils/format.ts`, add `formatRange([lo, hi], decimals = 2)` returning `"{lo%}–{hi%}"` and `formatDelta(value, decimals = 2)` returning `"{signed delta%}"` (supports result-statistics components).

## 5. Modal component

- [ ] 5.1 Create `src/components/ResultDetailsModal.tsx` exporting `ResultDetailsModal` (default export not used) (implements result-statistics `Details & Statistics Modal`).
- [ ] 5.2 The modal renders a fixed-position overlay: `inset-0`, `bg-ink/70`, `backdrop-blur-sm`, with a centered card `max-w-5xl`, `max-h-[90vh]`, `bg-paper`, `border-2 border-billiard`, scrollable inner content. The card root has `role="dialog"`, `aria-modal="true"`, `aria-labelledby="details-modal-title"` (implements result-statistics `Details & Statistics Modal`).
- [ ] 5.3 The modal includes a header with the title, a close (×) button (icon button with `aria-label="Close details"`), and a footer with the simulation meta line (implements result-statistics `Details & Statistics Modal`).
- [ ] 5.4 The modal renders the following sections per selected sweep value: (a) full-width outcome bar chart in a `480px` container, (b) distribution statistics grid (p05, p25, p50, p75, p95, mean, σ, skewness), (c) per-outcome Wilson 95% CI table, (d) full probability table, (e) multi-label co-occurrence panel with overlaps, top match-sets, and per-pair Lift, (f) Shannon entropy + effective outcomes (implements result-statistics `Details & Statistics Modal`).
- [ ] 5.5 The Sensitivity panel (marginal effect per +1 + break-even) renders only when `results.length > 1` (implements result-statistics `Details & Statistics Modal`).
- [ ] 5.6 All text inside the modal is sized up one step (body 14px, mono 13px, display headings 2.25rem, eyebrows 11px) (implements result-statistics `Larger type in the modal`).
- [ ] 5.7 On open: lock body scroll (`document.body.style.overflow = 'hidden'`, also set `position: fixed; top: -scrollY`), focus the close button, mount the component. On close: restore body styles, restore scroll position, unmount. Use `useEffect` for the lifecycle (implements result-statistics `Open the modal`, `Close on Escape`, `Close on backdrop click`).
- [ ] 5.8 Close on `Escape` key (window `keydown` listener) and on backdrop click (click outside the card) (implements result-statistics `Close on Escape`, `Close on backdrop click`).
- [ ] 5.9 Respect `prefers-reduced-motion`: no entrance animation when the user prefers reduced motion (implements result-statistics `Reduced motion`).

## 6. App integration

- [ ] 6.1 In `src/app.tsx`, add a `detailsModalOpen = signal<boolean>(false)` and a `closeDetails()` function (implements result-statistics `Details & Statistics Modal`).
- [ ] 6.2 In the results `Section` `actions` slot, render a ghost-variant `Button` labeled "Details & Statistics" that toggles `detailsModalOpen.value = true`. The button renders only when `simResults.value.length > 0` (implements result-statistics `Details & Statistics Modal`).
- [ ] 6.3 After the main `</main>`, render `{detailsModalOpen.value && simResults.value.length > 0 && <ResultDetailsModal results={simResults.value} onClose={closeDetails} />}` (implements result-statistics `Details & Statistics Modal`).

## 7. Tests

- [ ] 7.1 Create `tests/stats.test.ts` with tests for: `wilsonCI` (known-value, zero count, total count), `distributionStats` (uniform, single-value), `shannonEntropy` and `effectiveOutcomes` (uniform 4-way, single outcome), `marginalEffect` (linear sweep), `breakEven` (interpolation, no crossing), `topMatchSets` (cap), `lift` (independent, strongly co-occurring) (implements result-statistics `Wilson Confidence Interval`, `Distribution Statistics`, `Outcome Entropy`, `Sensitivity Metrics`, `Top Match-Sets`, `Lift Between Outcomes`).
- [ ] 7.2 In `tests/integration.test.ts`, add a test that runs a worker simulation on a PbtA-like config and asserts `result.matchSets` contains the expected top match-set with the right `count` and `probability` (tolerance 0.01) (implements outcomes `Match-Set Frequency Reporting`, simulation `SimResult Structure`).

## 8. Verification

- [ ] 8.1 Run `npm run typecheck`; resolve any new type errors.
- [ ] 8.2 Run `npm run lint`; resolve any new lint errors (no rule suppression).
- [ ] 8.3 Run `npm run test`; ensure all existing tests pass after additions.
- [ ] 8.4 Run `npm run build`; ensure the production build succeeds.
- [ ] 8.5 Run `npx openspec validate --strict`; resolve any spec validation issues.
- [ ] 8.6 Run the worker isolation check from `verification-loop`; ensure `src/domain/stats.ts` has no Preact/DOM/Node imports.
- [ ] 8.7 Run the conventions spot-checks (no Russian strings, no comments in code, no `keep_highest`/`keep_lowest`).
- [ ] 8.8 Manual smoke check: load Daggerheart preset, run simulation, open the modal, confirm all sections render and the modal closes on Escape and on backdrop click. Load a sweep preset (e.g. PbtA with modifier sweep), confirm the Sensitivity panel renders.
