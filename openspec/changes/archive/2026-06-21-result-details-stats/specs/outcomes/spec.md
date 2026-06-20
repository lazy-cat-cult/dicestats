# Outcomes Specification (delta)

## ADDED Requirements

### Requirement: Match-Set Frequency Reporting
In addition to pairwise overlap counts, the simulation SHALL track the full match-set frequency table. The worker SHALL maintain a `Map<string, number>` keyed by the sorted-joined label list of the per-iteration match-set. At the end of the run, the map SHALL be converted into a `MatchSetCount[]` array, capped at the top 50 entries by descending count, and exposed as `SimResult.matchSets`. Pairwise `overlaps` remain the source of truth for the pair co-occurrence probability used to compute Lift.

#### Scenario: Match-set counted per iteration
- GIVEN outcomes: ["A" when x >= 10, "B" when x >= 5, "C" (default)]
- WHEN an iteration produces match-set `["A", "C"]`
- THEN the worker increments the counter keyed by `"A||C"` (sorted) by 1

#### Scenario: Top-50 cap
- GIVEN a simulation that produces 200 distinct match-sets
- WHEN the simulation completes
- THEN `result.matchSets` has at most 50 entries, sorted by descending count

#### Scenario: No match-set key collision
- GIVEN outcomes named "A" and "B||C"
- WHEN the worker joins match-set labels
- **THEN** the join uses a separator that cannot appear in an outcome name (a control character) so labels like `"A"` and `"B||C"` cannot collide
