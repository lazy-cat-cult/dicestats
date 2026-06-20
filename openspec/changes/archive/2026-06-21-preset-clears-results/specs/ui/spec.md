# UI Specification (delta)

## MODIFIED Requirements

### Requirement: Presets (clarified — apply side effects)
The application SHALL provide quick-start preset buttons that fill all steps with pre-configured values. Presets MUST cover: D&D 5e — d20 (straight roll vs DC), D&D 5e — Advantage (2d20, max), PbtA — 2d6 (three outcomes), Shadowrun — Xd6 (hit counting), Vampire V5 (tagged dice, complex pipeline). All preset strings SHALL be in English.

Applying a preset SHALL:
1. Clear `simResults` to `[]`.
2. Set `simError` to `null`.
3. Terminate any in-flight simulation worker and set `isSimulating` to `false`.
4. Reset `currentStep` to `0` (Dice Pool & Reroll).
5. Reset `confirmedHighCost` to `false` (the >50M confirmation gate does not survive a preset change).
6. Reset `highlightTargetId` and `highlightTargetKind` to `null`.
7. Apply the preset values to the configuration signals (existing behaviour).

The teardown happens *before* the configuration signals are reassigned, so the UI never briefly renders a mix of old results and new pool values.

#### Scenario: Applying a preset clears stale results
- GIVEN the Results step is showing the outcome table from a previous run
- WHEN the user clicks any preset
- THEN the Results step is reset (no outcome table, no chart)
- AND the wizard returns to step 0 (Dice Pool & Reroll)

#### Scenario: Applying a preset cancels an in-flight simulation
- GIVEN a simulation is running (spinner visible, progress bar incrementing)
- WHEN the user clicks a preset
- THEN the worker is terminated and the spinner disappears
- AND the wizard returns to step 0

#### Scenario: Confirmation gate is reset on preset change
- GIVEN `confirmedHighCost` is `true` from a previous high-cost run
- WHEN the user clicks a preset
- THEN `confirmedHighCost` is reset to `false`
- AND the next Run click is re-evaluated against the new preset's total iterations
