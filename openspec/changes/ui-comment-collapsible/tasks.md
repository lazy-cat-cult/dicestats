# Tasks: ui-comment-collapsible

## 1. Specs
- [ ] 1.1 Update `openspec/specs/ui/spec.md`: add the "Show comments" toggle requirement to both `PipelineEditor` and `OutcomeEditor`.

## 2. State
- [ ] 2.1 In `src/state/app-state.ts`, add `export const showComments = signal<boolean>(loadShowComments());`.
- [ ] 2.2 Add `effect(() => { saveUiPrefs({ showComments: showComments.value }); });` after the signal declaration.

## 3. Persistence
- [ ] 3.1 In `src/state/persistence.ts`, add `const UI_PREFS_KEY = 'dice-calc-ui';` and the `UiPrefs` interface.
- [ ] 3.2 Add `loadUiPrefs()` and `saveUiPrefs(prefs)` helpers with `try/catch` around `localStorage` access (matching the existing pattern).
- [ ] 3.3 Add a `loadShowComments()` helper that calls `loadUiPrefs().showComments`.

## 4. UI
- [ ] 4.1 In `src/components/PipelineEditor.tsx`, replace the bare `<h2>Resolution Pipeline</h2>` with a flex row containing the heading and a "Show comments" `<label>` + `<input type="checkbox">` bound to `showComments`.
- [ ] 4.2 Wrap the per-row comment `<input>` in `{showComments.value && (...)}`.
- [ ] 4.3 In `src/components/OutcomeEditor.tsx`, do the same for the "Outcomes" heading and each outcome's comment input.

## 5. Tests
- [ ] 5.1 Add `tests/app-state.test.ts`: import `showComments` and assert the default value; mutate and assert the signal updates; with a stub localStorage, call `saveUiPrefs` and then `loadUiPrefs` and assert round-trip.
- [ ] 5.2 Run `npm run typecheck`, `npm run lint`, `npm run test`.

## 6. Verification
- [ ] 6.1 Run `verification-loop` skill and confirm `Overall: READY for PR`.
