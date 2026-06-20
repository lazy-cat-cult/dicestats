## Context

The current results surface lives in the right-hand aside of `app.tsx` (`ResultView`, `OutcomeChart`, `ParameterChart`, `OddsTape`). It is compact on purpose: a designer only needs a glance to compare presets. But when the designer is tuning a sweep — picking a target DC, calibrating a modifier, deciding whether a "Critical" outcome is too rare or too common — the glance is not enough. They need distribution shape, confidence, sensitivity, and co-occurrence, all in one place.

All of those numbers are derivable from data the worker already collects: per-iteration outcome counts (already in `SimResult.outcomes[].count`), the distribution histogram (`SimResult.distribution`), and pairwise overlap counts (`SimResult.overlaps`). The only missing piece is the full match-set frequency table — the worker tracks per-pair co-occurrences but discards the rest of the match-set after each iteration. Adding that one new accumulator is cheap (a `Map<string, number>` whose key is the sorted-joined label list, capped to top 50 at the end) and unlocks top-K match-sets and per-set Lift.

The modal is a pure Preact component reading the existing `simResults` signal. No new state machine, no new worker protocol fields, no new dependencies.

## Goals / Non-Goals

**Goals**
- One button in the results `Section` header (`Details & Statistics`) opens an overlay that renders all Tier 1 + Tier 2 statistics plus multi-label co-occurrence for the current results.
- All numbers come from pure functions over `SimResult`; no second pass through the simulation is ever needed.
- The overlay follows the existing billiard / gold / paper palette; the only typographic change is a one-step font-size increase.
- The overlay is dismissible by × button, `Escape` key, or backdrop click; body scroll is locked while open; focus is moved into the overlay on open.
- `prefers-reduced-motion` disables the entrance animation; Chart.js already respects it internally.

**Non-Goals**
- No new simulation iterations, no worker protocol changes, no new dependencies.
- No exporting / CSV / print — only on-screen rendering for v1.
- No persistence of the modal's open/closed state across reloads.
- No per-tag face distribution (Vampire hunger / Daggerheart hope/fear) — that needs per-die face counts which the worker does not currently collect; out of scope, noted for a follow-up.
- No editing of the configuration from inside the modal.

## Decisions

**D1 — Compute stats on the main thread, not in the worker.**
- *Rationale:* The worker already has 1,000,000 iterations of work; doing 1M-row reductions in the worker would slow down result delivery with no benefit. The raw inputs (counts, distribution histogram, overlap map) are tiny — single-digit kilobytes per `SimResult` — and the derived stats (Wilson CI, percentiles, entropy) are O(outcomes) or O(unique-keys). Moving them to the main thread also lets us add a new metric in a follow-up without re-running any simulation.
- *Alternative considered:* compute in the worker and ship the derived values. Rejected because it couples simulation time to presentation time and prevents cheap re-derivation.

**D2 — Worker emits `matchSets: MatchSetCount[]` (top 50, descending count).**
- *Rationale:* A 1M-iteration run can in principle have 2^K unique match-sets where K is the outcome count; K is capped at 10, so 1024 in the absolute worst case. In practice presets have < 20 unique match-sets. Capping at 50 with a final top-N pass keeps the result small and bounded.
- *Alternative considered:* emit the full map and let the UI cap. Rejected because the result type would be `Record<string, number>` (opaque keys) instead of a typed `MatchSetCount[]` and the wire size would be unbounded.

**D3 — Stats live in `src/domain/stats.ts`, not next to the modal.**
- *Rationale:* The stats functions are pure number-in / number-out, have no Preact / DOM / Node dependencies, and are easy to unit-test in isolation. The verification-loop worker-isolation check (`grep -nE "from ['\"]preact" src/domain/*.ts`) will keep them honest.
- *Alternative considered:* inline the stats in the modal. Rejected because it would couple a presentation component to testable logic and make the modal harder to read.

**D4 — One modal for both single-run and sweep.**
- *Rationale:* The "Sensitivity" panel (marginal effect per +1, break-even) only makes sense for sweeps; it is hidden when `simResults.length === 1`. Everything else renders for both. Keeping a single component avoids duplicated layout code and a brittle `if (isSweep)` branch tree in JSX.
- *Alternative considered:* two components. Rejected for the duplication cost.

**D5 — Body-scroll lock via `document.body.style.overflow = 'hidden'`, restored on close.**
- *Rationale:* The overlay is `position: fixed inset-0`, but the underlying page is still scrollable if its content exceeds the viewport on a short window. Locking body scroll is the standard fix and is one line of code.
- *Alternative considered:* `overscroll-behavior: contain` on the overlay only. Insufficient on mobile Safari and for tall pages where the user can still scroll the page *behind* the overlay by reaching past it.

**D6 — The modal mounts/unmounts on signal change (not always-rendered with `hidden`).**
- *Rationale:* Mounting on demand means Chart.js only instantiates one big chart when the user actually wants it. Always-rendered with `hidden` would re-create the chart on every results update, which is wasteful for the at-a-glance panel.
- *Alternative considered:* render with `display: none` and lazy-init. Rejected because Chart.js still constructs the chart instance even when its canvas has zero size, which produces a blank chart flicker on first open.

**D7 — Use the existing `OutcomeChart` component for the large chart, not a new component.**
- *Rationale:* It already handles the outcome-bar visual with the right palette and tooltip styling. Wrapping it in a 480px-tall container is the only change. A new component would mean duplicating Chart.js options.
- *Alternative considered:* a dedicated `LargeOutcomeChart` with thicker bars and bigger fonts. The bigger fonts inside the canvas would require rescaling every text element in Chart.js options; not worth the duplication. The modal's larger surrounding type is enough.

## Risks / Trade-offs

- [Modal is a new surface, so focus trap is a real risk] → Implementation restricts tab to the overlay's close button + scrollable content (a single focus stop is acceptable for a non-form dialog). A `tabindex="-1"` on the dialog container and an `autoFocus` on the close button keep focus inside. Full focus trap is not implemented in v1 (no third-party focus-trap dependency allowed); documented as a follow-up if keyboard users report escapes.
- [Body-scroll lock can clash with `overscroll-behavior: contain` on iOS] → Mitigation: also set `position: fixed` and `top: -scrollY` on `body` while open, restore on close. This is the well-known iOS Safari fix.
- [Chart.js animation on a 480px canvas may feel slow on low-end devices] → Already handled: `prefers-reduced-motion` disables the animation; the existing `animation.duration: 320` is short.
- [Wilson CI for p = 0 or p = 1 uses the standard formula which is fine; for N = 1M the lower bound is not exactly 0 — display "(<0.01%)" if both bounds round to the same percentage] → Trivial guard inside `wilsonCI`.
- [Adding `matchSets` to `SimResult` is a structural change to a type the worker emits] → Mitigated by the OpenSpec spec delta in `openspec/changes/result-details-stats/specs/simulation/spec.md` and the matching `outcomes` delta for the match-set frequency requirement.
- [Top-50 cap may hide a long tail of rare match-sets] → Acceptable for v1; the cap is documented in the spec. A future "show all" toggle can read the full table if needed (would require re-running the simulation with a larger cap or no cap).
- [Per-tag face distribution (Vampire hunger, Daggerheart hope/fear) is a Tier 2 metric that would also fit this modal] → Deferred. Would need the worker to track per-tag face counts. Noted as a follow-up in the proposal; does not block v1.

## Migration Plan

- No data migration; `SimResult.matchSets` is a new additive field.
- No persistence-version bump needed (`localStorage` does not store `SimResult`).
- Rollback: revert the single commit; the modal disappears, the worker stops emitting `matchSets`, and the at-a-glance panel is unchanged.
- Verification: full `verification-loop` (build, lint, test, openspec, worker isolation, conventions, diff review) after implementation; manual smoke check that opening/closing the modal works, that `Escape` closes it, that body scroll is locked while open, and that sweep results show the Sensitivity panel while single-run results hide it.

## Open Questions

- None blocking. The two non-blocking items (per-tag face distribution, full focus trap) are noted as follow-ups.
