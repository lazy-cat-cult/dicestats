## Why

The right-hand results panel currently shows only outcome probabilities, the overlap-sum hint, and a small chart. A TTRPG designer working with a sweep wants to see *why* probabilities look the way they do: distribution shape (mean, median, spread, tail percentiles), confidence in each estimate (Wilson 95% CI), the sensitivity of each outcome to the swept parameter (marginal effect per +1, break-even point), and — for multi-label systems — which outcomes co-occur and how strongly (top match-sets, Lift). A second pass over `SimResult` on the main thread is enough to derive all of this; the worker only needs to additionally emit the full match-set frequency table. Surfacing this in a dedicated "Details & Statistics" modal — opened by a button in the results section header — gives designers the analytical depth they need without crowding the at-a-glance result card.

## What Changes

- A new pure domain module `src/domain/stats.ts` exports statistical helpers — `wilsonCI`, `distributionStats`, `shannonEntropy`, `effectiveOutcomes`, `marginalEffect`, `breakEven`, `topMatchSets`, `lift` — all worker-safe (no Preact, DOM, or Node APIs). All of them are pure derivations of `SimResult` inputs (`outcomes[].count`, `totalRolls`, `distribution`, `overlaps`, plus the new `matchSets`).
- `SimResult` gains a new field `matchSets: MatchSetCount[]` — the full match-set frequency table (capped to the top 50 sets, sorted by descending count). Pairwise `overlaps` is unchanged and is still the source of truth for the pair co-occurrence probability used in `Lift`.
- The Web Worker per-iteration loop additionally accumulates a `Map<string, number>` keyed by the sorted-joined match-set label list, converts it into `MatchSetCount[]` (cap 50) and attaches it to `SimResult`. No new dependencies; no change to the message protocol.
- A new component `src/components/ResultDetailsModal.tsx` renders a large overlay containing: a full-width outcome bar chart at 480px tall, a distribution statistics grid (p05, p25, p50, p75, p95, σ, skewness), a per-outcome Wilson CI table, a sensitivity panel (marginal effect per +1 and break-even — sweep only), a multi-label co-occurrence panel (overlaps, top match-sets, Lift per pair, Shannon entropy + effective outcomes), and the full probability table. All text is sized up one step relative to the at-a-glance panel (body 14px, mono 13px, display headings 2.25rem, eyebrows 11px).
- The `Section` action slot in `app.tsx` for the results section gets a new `Details & Statistics` button (ghost variant, `md`) that toggles `detailsModalOpen`. The button is rendered only when `simResults.value.length > 0`.
- A new signal `detailsModalOpen: boolean` lives in `src/app.tsx`. The modal mounts when the signal is true. Modal close: × button, `Escape` key, click on backdrop. Body scroll is locked while the modal is open (`document.body.style.overflow = 'hidden'`). Focus is moved to the modal's close button on open; `prefers-reduced-motion` is respected (no entrance animation).
- A new `MatchSetCount` interface is added to `src/types/index.ts` (`{ outcomes: string[]; count: number; probability: number }`).
- `src/utils/format.ts` gains `formatRange([lo, hi])` for percentile read-outs and `formatDelta` for sensitivity deltas.
- `tests/stats.test.ts` covers the pure stats functions (Wilson CI known-value sanity checks, distribution stats on a hand-built distribution, entropy/effective outcomes, marginal effect, break-even, top match-sets, Lift).
- `tests/integration.test.ts` adds an assertion that the worker now emits `matchSets` with the expected top match-set for a PbtA-like run.

## Capabilities

### New Capabilities
- `result-statistics`: the "Details & Statistics" modal plus the pure statistics helpers that compute Wilson CI, distribution shape, sensitivity, co-occurrence (overlaps, top match-sets, Lift), and entropy. Covers the requirement that an opened modal renders these derived values and that a closed modal restores the body scroll.

### Modified Capabilities
- `simulation`: `SimResult` gains a `matchSets: MatchSetCount[]` field populated by the worker from the per-iteration match-set frequency map (top 50, descending count). The worker message protocol, iteration count, and per-iteration algorithm are unchanged.
- `outcomes`: extend `Outcome Overlap Reporting` with a `Match-Set Frequency` requirement — the worker SHALL emit a top-N frequency list of every distinct match-set observed, not only pairwise co-occurrences.

## Impact

- `src/types/index.ts`: add `MatchSetCount` interface and `matchSets: MatchSetCount[]` field on `SimResult`. No breaking change to `OutcomeResult`, `OutcomeOverlap`, or message types.
- `src/domain/stats.ts`: new file, pure functions only — safe to import from the worker in the future.
- `src/worker/sim.worker.ts`: add a `matchSetCounts: Map<string, number>` accumulator alongside the existing `overlapCounts`, convert to `MatchSetCount[]` (cap 50) and attach to the returned `SimResult`. No change to message protocol.
- `src/components/ResultDetailsModal.tsx`: new file, large overlay with focus management, Escape/backdrop close, body-scroll lock, `prefers-reduced-motion` respected, `aria-modal`, `role="dialog"`, labelled-by heading.
- `src/app.tsx`: add `detailsModalOpen` signal, render the `Details & Statistics` button in the `Section` `actions` slot, mount the modal, manage focus + body scroll + Escape.
- `src/utils/format.ts`: add `formatRange` and `formatDelta`.
- `src/components/ResultView.tsx`: unchanged (the modal reads the same `simResults` signal).
- `openspec/specs/simulation/spec.md` and `openspec/specs/outcomes/spec.md`: add the new requirement text in the change's `specs/` folder.
- Tests: new `tests/stats.test.ts`; additions to `tests/integration.test.ts` for `matchSets`.
- No new runtime dependencies.
