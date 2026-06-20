## 1. Type Definitions

- [ ] 1.1 Add `MyPreset` interface in `src/types/index.ts` extending `PresetConfig` with `createdAt: string` and `updatedAt: string`
- [ ] 1.2 Export `MyPreset` from `@/types` barrel

## 2. Storage Layer (`src/state/my-presets.ts`)

- [ ] 2.1 Implement `loadMyPresets(): MyPreset[]` with lz-string decompression and error fallback
- [ ] 2.2 Implement `saveMyPresets(presets: MyPreset[]): void` with lz-string compression and `QuotaExceededError` handling
- [ ] 2.3 Implement `addOrUpdateMyPreset(config: PresetConfig): 'ok' | 'limit_reached'` with 100-preset limit check
- [ ] 2.4 Implement `removeMyPreset(id: string): void`
- [ ] 2.5 Implement `renameMyPreset(id: string, newName: string): void`
- [ ] 2.6 Implement `copyMyPreset(id: string): void` with " (copy)" suffix strategy
- [ ] 2.7 Implement `copyStandardToMyPresets(presetId: string): 'ok' | 'limit_reached'`
- [ ] 2.8 Implement `isStandardPreset(id: string): boolean` helper
- [ ] 2.9 Implement `loadFavorites(): Set<string>` and `saveFavorites(ids: Set<string>): void`
- [ ] 2.10 Implement `toggleFavorite(id: string): void`
- [ ] 2.11 Write unit tests in `tests/my-presets.test.ts` covering load/save round-trip, limit enforcement, favorites, and error scenarios

## 3. State Changes (`src/state/app-state.ts`)

- [ ] 3.1 Replace `userPresets` signal with `myPresets` signal initialized from `loadMyPresets()`
- [ ] 3.2 Add `favoriteIds` signal initialized from `loadFavorites()`
- [ ] 3.3 Add `lastAppliedPresetId` signal
- [ ] 3.4 Update `applyPresetConfig` to set `lastAppliedPresetId`
- [ ] 3.5 Add `effect` on `myPresets` with 300ms debounce that calls `saveMyPresets()`
- [ ] 3.6 Add `effect` on `favoriteIds` with 300ms debounce that calls `saveFavorites()`
- [ ] 3.7 Add `flushPendingPresetWrites()` for `visibilitychange` / `pagehide` hooks

## 4. Save to My Presets (`src/components/PresetSaveDialog.tsx`)

- [ ] 4.1 Create `PresetSaveDialog` component with inline name input
- [ ] 4.2 Handle Enter (confirm), Escape (cancel), ✕ (cancel)
- [ ] 4.3 Handle name conflict with existing my-preset (Overwrite / Save as Copy / Cancel)
- [ ] 4.4 Handle name match with standard preset (Save as Copy / Cancel)
- [ ] 4.5 Integrate with `addOrUpdateMyPreset` and `copyStandardToMyPresets`

## 5. UI: Preset Rail (`src/components/PresetSelector.tsx`)

- [ ] 5.1 Restructure pill region into My Presets zone (up to 4 pills, favorites first) + Standard zone
- [ ] 5.2 Implement empty-state: "No saved presets" placeholder in muted italic
- [ ] 5.3 Rename existing "Save" button to "Export"
- [ ] 5.4 Rename existing "Load" button to "Import" (wires Import to persist to My Presets)
- [ ] 5.5 Add "New" button calling `resetToDefaults()`
- [ ] 5.6 Add "Save" button — writes to My Presets directly if name is set, or opens `PresetSaveDialog`
- [ ] 5.7 Disable Save button and show tooltip when 100-preset limit reached

## 6. UI: Library Modal (`src/components/PresetLibraryModal.tsx`)

- [ ] 6.1 Add tab bar: All | My Presets (N) | Favorites (M)
- [ ] 6.2 Scope search filter to active tab
- [ ] 6.3 Add ⭐ toggle (star) on each preset row with `aria-label`
- [ ] 6.4 Add "Copy to My Presets" action for standard preset rows
- [ ] 6.5 Add `…` context menu trigger for my-preset rows
- [ ] 6.6 Wire context menu actions: Rename (inline edit), Copy, Delete (confirmation)

## 7. UI: Context Menu (`src/components/MyPresetsContextMenu.tsx`)

- [ ] 7.1 Create dropdown menu component positioned relative to trigger
- [ ] 7.2 Implement Rename → inline editable text, Copy → duplicates, Delete → confirmation prompt
- [ ] 7.3 Close on click outside, Escape, or action selection

## 8. Wire in `src/app.tsx`

- [ ] 8.1 Add "New" action call (`resetToDefaults()`) — no structural changes, PresetSelector handles all actions
- [ ] 8.2 Ensure `visibilitychange` and `pagehide` events flush pending my-presets writes

## 9. Verification

- [ ] 9.1 Run `npm run typecheck` — no TypeScript errors
- [ ] 9.2 Run `npm run test` — all existing tests pass, new storage tests pass
- [ ] 9.3 Run `npm run lint` — no new lint errors
- [ ] 9.4 Verify in browser: Save → reload → preset still in rail
- [ ] 9.5 Verify in browser: favorite a preset → reload → star is still solid
- [ ] 9.6 Verify in browser: 100 limit — save is blocked with tooltip
- [ ] 9.7 Verify in browser: standard preset cannot be overwritten — "Save as Copy" is forced
