# Proposal: ui-comment-collapsible

## Why

Every pipeline row (`src/components/PipelineEditor.tsx:299-305`) and every outcome row (`src/components/OutcomeEditor.tsx:238-244`) currently renders a `<input placeholder="Comment (optional)">` row at all times. For a configuration with 10 outcomes and 8 pipeline rows that is 18 comment fields visible at once — most of them empty. The comment field is optional and rarely used; the constant presence of empty inputs makes the editor feel noisier than it needs to be and pushes the more important controls (condition value, default checkbox, etc.) further down the page.

The fix is a single per-editor "Show comments" checkbox that hides all per-row comment inputs by default. The toggle state persists in localStorage so a user who wants comments visible does not have to re-enable it on every reload.

## What Changes

- **Add** a `showComments: boolean` signal in `src/state/app-state.ts` (default `false`).
- **Persist** the signal under a new localStorage key `dice-calc-ui` with shape `{ showComments: boolean }`. The persistence helper is `loadUiPrefs()` / `saveUiPrefs()` in `src/state/persistence.ts`, mirroring the existing `try/catch` pattern at `persistence.ts:77-81` and `persistence.ts:85-99`.
- **Add** a small "Show comments" `<label>` + `<input type="checkbox">` in the heading row of `PipelineEditor` and `OutcomeEditor`. When unchecked, the per-row comment `<input>` is hidden for every row of that editor.
- **Wire** an `effect(() => { saveUiPrefs({ showComments: showComments.value }); })` in `app-state.ts` so changes to the toggle are auto-saved.

## Impact

- Affected specs: `openspec/specs/ui/spec.md` (PipelineEditor, OutcomeEditor).
- Affected code:
  - `src/state/app-state.ts` (new signal).
  - `src/state/persistence.ts` (new `loadUiPrefs` / `saveUiPrefs`).
  - `src/components/PipelineEditor.tsx` (heading-row toggle, conditional render).
  - `src/components/OutcomeEditor.tsx` (same).
- New tests: `tests/app-state.test.ts` for the default value and the persistence round-trip.

## Non-Goals

- No new comment-edit affordance beyond the existing text input.
- No comment on reroll conditions (RerollEditor already has a comment input that is rarely used, but no user request to hide it).
- No migration of the `dice-calc-config` key; `dice-calc-ui` is a new key and does not interact with v5/v6 migrations.
