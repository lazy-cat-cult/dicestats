# Tasks: preset-clears-results

## 1. Specs
- [ ] 1.1 Update `openspec/specs/ui/spec.md`: extend the `Presets` requirement to add the "applying a preset clears results / cancels worker / resets wizard" rule.

## 2. Worker cancel export
- [ ] 2.1 In `src/app.tsx`, add `export` to the existing `cancelSimulation` function so `PresetSelector` can call it.

## 3. PresetSelector
- [ ] 3.1 In `src/components/PresetSelector.tsx`, extend `applyPreset` to, in order: call `cancelSimulation()`, set `simResults.value = []`, set `simError.value = null`, set `currentStep.value = 0`, set `confirmedHighCost.value = false`, set `highlightTargetId.value = null`, set `highlightTargetKind.value = null`. Then apply the preset values (unchanged).
- [ ] 3.2 Add the new imports: `cancelSimulation`, `simResults`, `simError` from `@/app`; `isSimulating`, `confirmedHighCost`, `highlightTargetId`, `highlightTargetKind` from `@/state/app-state`; `currentStep` from `@/components/StepWizard`.

## 4. Tests
- [ ] 4.1 Add a `tests/preset-selector.test.ts` smoke test that imports `applyPreset` indirectly (or the relevant helper) and asserts that the signals are reset. (If extracting `applyPreset` for testability is too invasive, skip this and rely on the manual verification step.)
- [ ] 4.2 Run `npm run typecheck`, `npm run lint`, `npm run test`.

## 5. Verification
- [ ] 5.1 Manual: start a long-running simulation (e.g. with a DC sweep of [5, 10, 15, 20]), click a preset while it is running — assert the spinner stops and the wizard jumps to step 0. The Run button on the new preset should start a fresh run with no leftover results.
- [ ] 5.2 Run `verification-loop` skill and confirm `Overall: READY for PR`.
