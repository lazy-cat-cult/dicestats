# Result Statistics Specification (delta)

## ADDED Requirements

### Requirement: Wilson Confidence Interval
The system SHALL provide a pure function `wilsonCI(count, total, z = 1.96)` that returns a 95% (default) confidence interval `[lo, hi]` for a binomial proportion using the Wilson score method. The lower bound SHALL be `0` when `count === 0`; the upper bound SHALL be `1` when `count === total`. The function SHALL be worker-safe (no Preact, DOM, or Node APIs).

#### Scenario: Known-value sanity check
- **WHEN** `wilsonCI(500, 1000)` is called
- **THEN** the returned interval is approximately `[0.469, 0.531]` (tolerance 1e-3)

#### Scenario: Zero count
- **WHEN** `wilsonCI(0, 1000)` is called
- **THEN** the returned lower bound is `0`

#### Scenario: Total count
- **WHEN** `wilsonCI(1000, 1000)` is called
- **THEN** the returned upper bound is `1`

### Requirement: Distribution Statistics
The system SHALL provide a pure function `distributionStats(distribution: Record<number, number>)` that returns `{ p05, p25, p50, p75, p95, mean, stdDev, skewness }` for the distribution's discrete key. Percentiles SHALL be computed by the nearest-rank method on a sorted array of keys weighted by frequency. The function SHALL be worker-safe.

#### Scenario: Uniform d6 distribution
- **WHEN** `distributionStats` is called with each face 1..6 appearing 1000 times
- **THEN** `p50` is `3` or `4`, `p25` is `2` or `3`, `p75` is `4` or `5`

#### Scenario: Single-value distribution
- **WHEN** `distributionStats` is called with `{17: 1000000}`
- **THEN** `mean`, `p05`, `p25`, `p50`, `p75`, `p95`, `stdDev` are all `17`, `skewness` is `0`

### Requirement: Outcome Entropy
The system SHALL provide pure functions `shannonEntropy(probabilities: number[])` and `effectiveOutcomes(probabilities: number[])` returning the Shannon entropy (base 2) and the perplexity `2^H` respectively. Both SHALL be worker-safe.

#### Scenario: Uniform 4-outcome distribution
- **WHEN** `shannonEntropy([0.25, 0.25, 0.25, 0.25])` is called
- **THEN** the result is `2`

#### Scenario: Single-outcome distribution
- **WHEN** `shannonEntropy([1, 0, 0, 0])` is called
- **THEN** the result is `0` and `effectiveOutcomes` returns `1`

### Requirement: Sensitivity Metrics
The system SHALL provide pure functions `marginalEffect(results: SimResult[], outcomeLabel: string, paramValues: number[])` returning the average per-unit change in the outcome's probability across consecutive parameter values, and `breakEven(results, outcomeLabel, threshold = 0.5)` returning the interpolated parameter value at which the outcome's probability first crosses `threshold`, or `null` if it does not. Both SHALL be worker-safe.

#### Scenario: Linear sweep
- **WHEN** `marginalEffect` is called on a sweep with `paramValues = [0, 1, 2, 3, 4]` and outcome probabilities `[0.30, 0.40, 0.50, 0.60, 0.70]`
- **THEN** the result is `0.10` (tolerance 1e-6)

#### Scenario: Break-even interpolation
- **WHEN** `breakEven` is called on a sweep with `paramValues = [0, 1, 2]` and outcome probabilities `[0.40, 0.50, 0.60]`
- **THEN** the result is `1` (exact crossing at the second value)

#### Scenario: No crossing
- **WHEN** `breakEven` is called on a sweep where the outcome never crosses `0.5`
- **THEN** the result is `null`

### Requirement: Top Match-Sets
The system SHALL provide a pure function `topMatchSets(matchSets: MatchSetCount[], n = 10): MatchSetCount[]` returning the top `n` match-sets by descending `count`, preserving the original `count` and `probability` values.

#### Scenario: Capped output
- **WHEN** `topMatchSets` is called with 50 match-sets and `n = 10`
- **THEN** the result has 10 entries, sorted by descending `count`

### Requirement: Lift Between Outcomes
The system SHALL provide a pure function `lift(outcomeA: OutcomeResult, outcomeB: OutcomeResult, coCount: number, total: number): number` returning the lift of the pair, defined as `P(A∧B) / (P(A) · P(B))`. The result SHALL be `null` when `P(A) = 0` or `P(B) = 0`. The function SHALL be worker-safe.

#### Scenario: Independent outcomes
- **WHEN** `lift({probability: 0.5, count: 500000, label: 'A'}, {probability: 0.5, count: 500000, label: 'B'}, 250000, 1000000)` is called
- **THEN** the result is `1` (tolerance 1e-6)

#### Scenario: Strongly co-occurring outcomes
- **WHEN** `lift({probability: 0.5, count: 500000, label: 'A'}, {probability: 0.5, count: 500000, label: 'B'}, 500000, 1000000)` is called
- **THEN** the result is `2`

### Requirement: Details & Statistics Modal
The system SHALL provide a `ResultDetailsModal` component that opens over the current page and renders, for each `SimResult` (one panel per sweep value when a sweep is present), a full-width outcome bar chart, a distribution statistics grid, a per-outcome Wilson 95% CI table, a probability table, and a multi-label co-occurrence panel listing overlaps, top match-sets, and per-pair Lift. The modal SHALL be openable from a `Details & Statistics` button rendered in the results `Section` `actions` slot. The modal SHALL close on × button click, `Escape` key, or backdrop click. While open, the document body SHALL NOT scroll. The modal SHALL be a `role="dialog"` element with `aria-modal="true"` and `aria-labelledby` pointing at its heading.

#### Scenario: Open the modal
- **WHEN** the user clicks the `Details & Statistics` button in the results section header
- **THEN** the modal mounts over the page, body scroll is locked, and the close button receives focus

#### Scenario: Close on Escape
- **WHEN** the modal is open and the user presses `Escape`
- **THEN** the modal unmounts and body scroll is restored

#### Scenario: Close on backdrop click
- **WHEN** the modal is open and the user clicks the backdrop (outside the modal card)
- **THEN** the modal unmounts and body scroll is restored

#### Scenario: Sensitivity panel hidden for single run
- **WHEN** the modal is opened on a single-result run (no parameters)
- **THEN** the Sensitivity panel is not rendered

#### Scenario: Sensitivity panel rendered for sweep
- **WHEN** the modal is opened on a sweep run with more than one result
- **THEN** a Sensitivity panel renders marginal effect per +1 and break-even for every visible outcome

#### Scenario: Larger type in the modal
- **WHEN** the modal is open
- **THEN** body text inside the modal is at least 14px, monospace at least 13px, and display headings at least 2rem

#### Scenario: Reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the modal renders without an entrance animation
