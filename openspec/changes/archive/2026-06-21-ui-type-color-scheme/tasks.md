# Tasks: ui-type-color-scheme

## 1. Specs
- [ ] 1.1 Update `openspec/specs/ui/spec.md`: rewrite the PipelineEditor requirement to remove the green-row treatment; specify the neutral badge color.

## 2. UI
- [ ] 2.1 In `src/components/PipelineEditor.tsx:131`, remove the `outputType === 'scalar' ? 'border-green-300 bg-green-50'` branch from the row container class string. The container becomes `bg-gray-50` for valid rows.
- [ ] 2.2 In `src/components/PipelineEditor.tsx:138`, drop the `outputType === 'scalar' ? 'text-green-700 border-green-400'` branch from the name input class.
- [ ] 2.3 In `src/components/PipelineEditor.tsx:141`, render the `num` / `vec` badge with a single neutral `bg-slate-200 text-slate-800` class for both types.

## 3. Tests
- [ ] 3.1 No new unit tests required (purely a CSS class change). Run `npm run typecheck`, `npm run lint`, `npm run test` to confirm no regression.

## 4. Verification
- [ ] 4.1 Run `verification-loop` skill and confirm `Overall: READY for PR`.
