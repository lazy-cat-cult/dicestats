# Tasks: preset-name-display

## 1. Specs
- [x] 1.1 Update `openspec/specs/presets/spec.md`: add requirement for `currentPresetName` signal tracking.
- [x] 1.2 Update `openspec/specs/simulation/spec.md`: add `taskName` field to `SimJob` and update `SimResult.label` semantics.
- [x] 1.3 Update `openspec/specs/ui/spec.md`: add preset name display to `OddsTape` requirement.

## 2. Types
- [x] 2.1 In `src/types/index.ts`, add `taskName?: string` field to `SimJob` interface.

## 3. State
- [x] 3.1 In `src/state/app-state.ts`, add `export const currentPresetName = signal<string | null>(null);`.
- [x] 3.2 In `src/state/app-state.ts`, modify `applyPresetConfig` to set `currentPresetName.value = preset.name` after applying the preset values.
- [x] 3.3 In `src/state/app-state.ts`, modify `resetToDefaults` to set `currentPresetName.value = null`.

## 4. App
- [x] 4.1 In `src/app.tsx`, import `currentPresetName` from `@/state/app-state`.
- [x] 4.2 In `src/app.tsx`, modify `runSimulation` to pass `taskName: currentPresetName.value ?? undefined` in the `SimJob` object.

## 5. Worker
- [x] 5.1 In `src/worker/sim.worker.ts`, modify `runSimulation` function signature to accept `taskName?: string` parameter.
- [x] 5.2 In `src/worker/sim.worker.ts`, modify `runSimulation` to return `label: taskName ?? ''` instead of `label: ''`.
- [x] 5.3 In `src/worker/sim.worker.ts`, modify the parameter sweep loop to destructure `taskName` from `msg.job`.
- [x] 5.4 In `src/worker/sim.worker.ts`, modify the sweep loop to pass `taskName` to `runSimulation`.
- [x] 5.5 In `src/worker/sim.worker.ts`, modify the sweep label assignment to prepend `taskName` when present: `result.label = taskName ? \`${taskName} · ${param.label}=${sweep.value}\` : \`${param.label}=${sweep.value}\``.

## 6. UI
- [x] 6.1 In `src/components/OddsTape.tsx`, import `currentPresetName` from `@/state/app-state`.
- [x] 6.2 In `src/components/OddsTape.tsx`, add `const presetName = currentPresetName.value;` at the top of the component.
- [x] 6.3 In `src/components/OddsTape.tsx`, add a conditional render of the preset name above the "Top Probability" eyebrow: `{presetName && (<p class="font-display text-[13px] tracking-[0.14em] text-ink mb-2 truncate" title={presetName}>{presetName}</p>)}`.

## 7. Tests
- [x] 7.1 Add a test in `tests/app-state.test.ts` to verify that `applyPresetConfig` sets `currentPresetName.value` to the preset name.
- [x] 7.2 Add a test in `tests/app-state.test.ts` to verify that `resetToDefaults` sets `currentPresetName.value` to `null`.
- [x] 7.3 Run `npm run typecheck` to verify TypeScript compilation.
- [x] 7.4 Run `npm run lint` to verify ESLint compliance.
- [x] 7.5 Run `npm run test` to verify all tests pass.

## 8. Verification
- [ ] 8.1 Manual: apply a preset (e.g., "D&D 5e — d20"), run a simulation, and verify the preset name appears in the OddsTape above "Top Probability".
- [ ] 8.2 Manual: apply a preset with parameters (e.g., "D&D 5e — d20" with DC sweep), run a simulation, and verify the sweep labels in the result table include the preset name (e.g., "D&D 5e — d20 · DC=15").
- [ ] 8.3 Manual: reset to defaults (load a blank config), run a simulation, and verify no preset name is shown in the OddsTape.
- [ ] 8.4 Run `verification-loop` skill and confirm `Overall: READY for PR`.
