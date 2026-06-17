## 1. State (`src/state/app-state.ts`)

- [x] 1.1 Add `export function setCurrentPresetName(name: string | null): void` that sets `currentPresetName.value = name === '' ? null : name` (implements presets `Editable Preset Name`).
- [x] 1.2 Add tests in `tests/app-state.test.ts` for `setCurrentPresetName`: setting a non-empty string, clearing with `null`, and coercing empty string to `null` (implements presets `Editable Preset Name`).

## 2. Persistence (`src/state/persistence.ts`)

- [x] 2.1 Add `export async function saveCurrentAsYaml(name: string): Promise<void>` that, when `typeof window !== 'undefined' && 'showSaveFilePicker' in window`, calls `window.showSaveFilePicker({ suggestedName: filenameForName(name || 'dice-roll'), types: [{ description: 'YAML preset', accept: { 'text/yaml': ['.yaml'] } }] })`, writes the YAML text via `handle.createWritable()`, and closes the handle (implements persistence `Save and Load YAML Presets`).
- [x] 2.2 In `saveCurrentAsYaml`, wrap the `showSaveFilePicker` call in a `try`/`catch`: on `err.name === 'AbortError'` return silently; on any other error silently fall through to the `downloadYamlFile` fallback (implements persistence `Save and Load YAML Presets`).
- [x] 2.3 In `saveCurrentAsYaml`, when `showSaveFilePicker` is unavailable, call `exportCurrentAsYaml(name || 'Dice Roll')` and `downloadYamlFile` with the resulting `{ filename, text }` (implements persistence `Save and Load YAML Presets`).
- [x] 2.4 Ensure `saveCurrentAsYaml` does NOT touch the `loadError` signal and does NOT call `console.error` (satisfies the `no-console` lint rule and the silent-cancellation spec) (implements persistence `Save and Load YAML Presets`).

## 3. PresetSelector (`src/components/PresetSelector.tsx`)

- [x] 3.1 Import `currentPresetName` and `setCurrentPresetName` from `@/state/app-state` (implements presets `Editable Preset Name`).
- [x] 3.2 Import `saveCurrentAsYaml` from `@/state/persistence` (implements persistence `Save and Load YAML Presets`).
- [x] 3.3 Add an editable name input (`TextField` from `@/components/ui`) to the rail footer, to the left of the Save/Load buttons. Bind its `value` to `currentPresetName.value ?? ''` and its `onInput` to `(e) => setCurrentPresetName((e.currentTarget as HTMLInputElement).value)`. Set `placeholder="Preset name"`, `ariaLabel="Preset name"`, and apply Tailwind classes `min-w-[200px] max-w-[280px]`. The input reuses the existing `TextField` styling (implements presets `Editable Preset Name`, ui `Preset Rail`).
- [x] 3.4 Render an inline `✕` clear button as a sibling of the `TextField` (absolutely positioned at the right edge inside the field wrapper) when `currentPresetName.value` is a non-empty string. On click, call `setCurrentPresetName(null)`. The button has `aria-label="Clear preset name"` and `type="button"` (implements presets `Editable Preset Name`, ui `Form Controls Accessibility`).
- [x] 3.5 Replace the body of `handleSave` with `await saveCurrentAsYaml(currentPresetName.value ?? '')`. The function becomes `async` (implements persistence `Save and Load YAML Presets`, presets `Preset Name Used in YAML Save`).

## 4. App (`src/app.tsx`)

- [x] 4.1 Import `currentPresetName` from `@/state/app-state` (already imported via the `preset-name-display` change; verify and re-import if needed) (implements ui `Current Preset Name Display`).
- [x] 4.2 Add a small `CurrentPresetNameHeading` function component colocated in `src/app.tsx` that returns `null` when `currentPresetName.value` is `null` or `''`, otherwise renders:
  - a top `border-t border-gold/30` hairline divider (matching `Section`),
  - an eyebrow `<p class="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep mb-2">Preset</p>`,
  - a `<h2 class="font-display text-[2rem] leading-none text-ink tracking-wider">{currentPresetName.value}</h2>`.
  - No description, no `actions` slot, no editor (implements ui `Current Preset Name Display`).
- [x] 4.3 Render `<CurrentPresetNameHeading />` as the FIRST child of the configuration column in `App`, directly above the `DicePoolEditor` `Section` (implements ui `Current Preset Name Display`).
- [x] 4.4 Verify that `currentPresetName` re-renders the heading reactively: changing the signal from `null` → `"X"` → `null` toggles the heading in place without re-mounting the rest of the column (covers the "Name display updates without reload" scenario) (implements ui `Current Preset Name Display`).

## 5. Verification

- [x] 5.1 Run `npm run typecheck`; resolve any new type errors (in particular, the `showSaveFilePicker` and `FileSystemFileHandle` types must be picked up from `lib.dom.d.ts`; if not, add a minimal ambient declaration in `src/vite-env.d.ts`).
- [x] 5.2 Run `npm run lint`; resolve any new lint errors. Pay attention to `no-console`, `no-unused-vars`, `no-explicit-any`. Do not lower rule severity.
- [x] 5.3 Run `npm run test`; ensure all existing tests pass and the new `setCurrentPresetName` tests in `tests/app-state.test.ts` pass.
- [x] 5.4 Run `npm run build`; ensure the production build succeeds.
- [x] 5.5 Manual smoke test: open the dev server, type a name into the rail input, verify the heading appears above "Step 01", apply a preset and verify the input updates, click Save on a Chromium browser and verify the native dialog appears, click Cancel and verify no error is shown, click Save on a browser without the API and verify the file downloads to the default folder.
- [x] 5.6 Run the `verification-loop` skill (`.kilocode/skills/verification-loop/SKILL.md`) and confirm `Overall: READY for PR`. Fix all issues and re-run until clean.
- [x] 5.7 Run `npx openspec validate --strict` and confirm no validation errors in the new `preset-name-and-save-dialog` change.
