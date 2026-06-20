# Proposal: YAML preset save/load

## Why

The current "Save" button only persists the current configuration to `localStorage` (private to the browser). Users cannot:

- Share a roll configuration with another player
- Check the configuration into version control
- Edit it in a text editor
- Re-import a configuration on a different device

We need a file-based export/import format that is also human-readable as a pseudolanguage, so a TTRPG player can read the file and understand what dice are being rolled without running the app.

## What changes

- Add a YAML serialization/deserialization layer for `PresetConfig` using a small, hand-rolled `yaml.ts` (no new runtime dependency).
- The YAML grammar is a pseudolanguage tuned for readability (see design.md for the full grammar).
- Replace the header "Save" button with a "Save" / "Load" pair:
  - **Save** downloads the current configuration as `<slug>.yaml` via `Blob` + anchor click.
  - **Load** opens a hidden `<input type="file" accept=".yaml,.yml">`. On file pick: parse → resolve → either update the matching built-in preset (by `name`) in `PRESETS` or stage as a user preset → apply to all signals (clearing sim results, etc., like `PresetSelector` does today).
- Add a small inline error region next to the Load button for parse/resolution errors. No modal, no `console.error`.
- Add `tests/yaml.test.ts` with round-trip coverage of every built-in preset plus targeted tests for each pseudolanguage construct.

## Scope

In scope:

- YAML serialize/parse for `PresetConfig`
- File download / upload via `Blob` + hidden file input
- Built-in preset merge-by-name; user-preset list lives in-memory for the current session only (not in `localStorage` in this change)
- Tests

Out of scope (deliberate):

- Multi-preset bundle files on Save (Save writes single-preset bare form; Load accepts `presets: [ ... ]` list as forward-compat but does not surface a multi-preset UI)
- Persisting user presets across reloads (would require extending `SavedConfig`; deferred)
- Diffing / previewing the loaded preset before apply

## Spec deltas

- `openspec/specs/persistence/spec.md` — add requirement **YAML Export/Import** with scenarios for download, upload, merge-by-name, user-preset staging, error display.
- `openspec/specs/presets/spec.md` — add requirement **User Presets (in-memory)** with scenario for staging a new preset.
- `openspec/specs/ui/spec.md` — add requirement **Header Save/Load Buttons** with scenarios for file download, file picker, error visibility.

## Risks

- **Lossy edge cases**: a YAML file that round-trips a built-in preset must produce a semantically identical `PresetConfig`. We test every built-in preset round-trip. If a new pipeline op or outcome shape is added later, the serializer/parser must be updated in the same change.
- **Reference resolution**: pipeline steps and outcomes reference each other by `name`. Parser must error on unknown references and on ambiguous targets (e.g. two terms with the same tag and a `pool.count` parameter without an `on` qualifier).
- **Tag parsing**: die tags are read with a regex; require `[A-Za-z][A-Za-z0-9_]*`. Empty tag → no `<...>` written.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test` (new `yaml.test.ts` passes; existing 37 tests still pass)
- `npm run build`
- Manual: open dev server, configure a preset, click Save, open the file in a text editor, edit a value, click Load, verify UI updates.
