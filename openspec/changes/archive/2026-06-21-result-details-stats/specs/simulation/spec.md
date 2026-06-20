# Simulation Specification (delta)

## MODIFIED Requirements

### Requirement: SimResult Structure
The simulation result SHALL conform to the following TypeScript types:

```typescript
interface OutcomeResult {
  label: string;
  probability: number;    // 0..1
  count: number;          // raw count out of totalRolls
}

interface OutcomeOverlap {
  outcomes: [string, string];
  count: number;
  probability: number;
}

interface MatchSetCount {
  outcomes: string[];      // ordered alphabetically
  count: number;
  probability: number;     // count / totalRolls
}

interface SimResult {
  label: string;                        // "" for single, "Label=Value" for parameterized
  outcomes: OutcomeResult[];
  overlaps: OutcomeOverlap[];
  matchSets: MatchSetCount[];           // top 50 match-sets by descending count
  totalRolls: number;
  distribution: Record<number, number>; // distribution key → frequency
}
```

#### Scenario: Single simulation result
- GIVEN a simulation with no parameters and 1,000,000 iterations
- WHEN the simulation completes
- THEN the result contains `label: ""`, `totalRolls: 1000000`, outcome probabilities, and `matchSets` capped at 50 entries

#### Scenario: Match-set frequency in result
- GIVEN outcomes: ["A" when x >= 10, "B" when x >= 5, "C" (default)]
- WHEN the simulation runs and 60% of iterations match exactly `{A, C}`, 30% match exactly `{B, C}`, 10% match exactly `{C}`
- THEN `result.matchSets` contains at least one entry `{outcomes: ["A", "C"], count: 600000, probability: 0.6}` (tolerance 0.01)
