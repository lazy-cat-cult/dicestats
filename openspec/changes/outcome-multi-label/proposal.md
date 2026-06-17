## Why

Outcomes are currently evaluated with first-match-wins semantics: a roll is classified into exactly one outcome and remaining outcomes are not checked. This makes it impossible to express "compound" results like Daggerheart's `Success with Hope` / `Success with Fear` / `Failure with Hope` / `Failure with Fear`, where one roll simultaneously carries information about the outcome tier (Success/Failure, set by `total_mod`) and the alignment (Hope/Fear, set by `delta`). With exclusive evaluation, the last four Daggerheart outcomes always evaluate to 0% because the general `Success`/`Failure` outcomes swallow every roll before they are checked.

The change is to switch outcome evaluation from single-label (first match wins) to multi-label (every outcome evaluated independently per roll, a roll can match zero or more outcomes). This turns outcomes from a partition into a set of independent tags, which is the right model for systems that cross-classify results along multiple axes.

## What Changes

- `evaluateOutcomes` returns the array of matching outcome names instead of a single string. If no outcome matches, an empty array is returned.
- The `isDefault` flag on `Outcome` is repurposed: a default outcome is one that automatically matches when its conditions are not satisfied by the named value (semantics become "always-on fallback tag" rather than "catch-all partition").
- `SimResult.outcomes` becomes a list of `OutcomeResult` where each `count` is the number of iterations whose match-set includes the outcome name. `probability` is `count / totalRolls`. The sum of probabilities is no longer constrained to 100% — it can exceed it because of overlapping matches.
- The Web Worker per-iteration loop accumulates the match set with a `Set<string>` and increments each matched outcome's counter.
- The outcomes spec removes the `Exclusive Evaluation Order` requirement and replaces it with an `Independent Multi-Label Evaluation` requirement.
- Built-in presets keep their current shape; because most built-ins were written as a partition (Critical → Success → Partial → Failure) and their conditions are mutually exclusive, the displayed probabilities will still sum to 100% for them. Daggerheart's YAML is updated to drop the general `Success`/`Failure` outcomes and rely on the four compound outcomes plus a default `Failure` catch-all.
- The `ResultView`, `OddsTape`, and `DistributionChart` components display each outcome's independent probability and show a hint when the sum exceeds 100% (informational only, not a validation error).
- `validateConfig` no longer enforces "exactly one default" — zero or more defaults are allowed, and defaults are added to every roll's match set.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `outcomes`: Remove `Exclusive Evaluation Order` requirement and its `First match wins` scenario. Add `Independent Multi-Label Evaluation` requirement with scenarios covering: all-matching outcomes recorded, no-matching roll returns empty set, default outcome matches every roll, overlapping matches sum to >100%.

## Impact

- `src/types/index.ts`: `OutcomeResult` is unchanged structurally, but the contract of `count` changes from "iterations whose result is this outcome" to "iterations whose match-set contains this outcome". `SimResult` is unchanged. No new fields.
- `src/domain/classify.ts`: `evaluateOutcomes` rewritten to return `string[]`. `evaluateOutcome` stays as-is.
- `src/worker/sim.worker.ts`: per-iteration loop uses `evaluateOutcomes` and increments a counter for every matched name.
- `src/utils/validation.ts`: remove the "exactly one default" check and the "first match wins" ordering validation.
- `src/components/ResultView.tsx`, `src/components/OddsTape.tsx`, `src/components/DistributionChart.tsx`: render independent probabilities and an optional overlap hint.
- `src/domain/presets.ts`: Daggerheart preset updated to four compound outcomes with default `Failure`.
- `tests/classify.test.ts`, `tests/integration.test.ts`, `tests/validation.test.ts`: rewrite tests that assumed exclusive evaluation.
- `doc/ttrpg/daggerheart.yaml`: drop `Success when total_mod >= 15 or delta = 0` and `Failure when total_mod < 15`, keep the four compound outcomes and mark `Failure with Fear` as default.
- No new dependencies.
