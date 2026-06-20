## ADDED Requirements

### Requirement: MyPreset Type

The application SHALL define a `MyPreset` interface in `src/types/index.ts` that extends `PresetConfig` with metadata fields:

```typescript
interface MyPreset extends PresetConfig {
  createdAt: string;  // ISO 8601 timestamp
  updatedAt: string;  // ISO 8601 timestamp
}
```

#### Scenario: MyPreset has all PresetConfig fields
- GIVEN a `MyPreset` object
- WHEN it is used as a configuration
- THEN all `PresetConfig` fields are present (`id`, `name`, `pool`, `rerollConditions`, `pipeline`, `outcomes`, `sweep`)
- AND `createdAt` and `updatedAt` are ISO 8601 strings

#### Scenario: Metadata timestamps are set on creation
- GIVEN a new MyPreset is created via Save
- WHEN the preset is stored
- THEN `createdAt` and `updatedAt` are set to the current time in ISO 8601 format
- AND `createdAt` SHALL NOT change on subsequent updates

---

### Requirement: MyPreset Persistent Storage

The application SHALL persist My Presets in `localStorage` under the key `dice-calc-my-presets`. The stored value SHALL be `lz-string.compressToBase64(JSON.stringify({ version: 1, presets: MyPreset[] }))`. The application SHALL load my-presets on page mount and hydrate the `myPresets` signal.

#### Scenario: My presets survive page reload
- GIVEN the user saved a preset named "Fireball" to My Presets
- WHEN the page is reloaded
- THEN "Fireball" appears in the My Presets rail zone
- AND clicking it applies the saved configuration

#### Scenario: Empty My Presets on first visit
- GIVEN a user who has never saved a my-preset
- WHEN the application loads
- THEN `myPresets.value` is an empty array

#### Scenario: lz-string round-trip fidelity
- GIVEN a `MyPreset` object with a complex pipeline and outcomes
- WHEN it is compressed, stored, retrieved, and decompressed
- THEN the resulting object is deeply equal to the original

#### Scenario: Corrupted storage fallback
- GIVEN a corrupted or invalid value under `dice-calc-my-presets`
- WHEN the application attempts to load
- THEN the error is caught silently
- AND `myPresets.value` is set to an empty array
- AND no error toast or console.error is emitted

---

### Requirement: MyPreset Limit

The application SHALL enforce a maximum of **100** My Presets. When saving a new preset (not overwriting an existing one) and the limit is reached, the Save operation SHALL be rejected.

#### Scenario: Save rejected at limit
- GIVEN there are exactly 100 My Presets
- AND no existing my-preset matches the current configuration's name
- WHEN the user triggers Save
- THEN the save is rejected
- AND the Save button shows a tooltip "My Presets limit reached (100). Delete unused presets to make room."
- AND the Save button is disabled

#### Scenario: Overwrite allowed at limit
- GIVEN there are exactly 100 My Presets
- AND the user edits an existing my-preset and clicks Save
- WHEN the save executes
- THEN the existing my-preset is updated (overwritten)
- AND the 100-preset count is unchanged

---

### Requirement: Save to My Presets

The application SHALL provide a "Save" action that persists the current configuration to My Presets. If `currentPresetName` is `null` or `""`, the application SHALL prompt for a name via an inline dialog before saving. If the current configuration was derived from a standard preset and the name still matches, the save SHALL require "Save as Copy".

#### Scenario: Save with name set
- GIVEN `currentPresetName.value` is `"My Custom Roll"`
- WHEN the user clicks Save
- THEN a new my-preset is created (or an existing one with the same name is overwritten)
- AND the preset appears in the My Presets rail zone
- AND it persists across page reloads

#### Scenario: Save prompts for name when empty
- GIVEN `currentPresetName.value` is `null`
- WHEN the user clicks Save
- THEN an inline dialog appears with an input field
- AND the placeholder is "My Preset"
- AND the input is autofocused
- AND pressing `Enter` with a non-empty name saves the preset
- AND pressing `Escape` or clicking `✕` cancels the save

#### Scenario: Save over standard preset name forces copy
- GIVEN the user applied "D&D 5e — d20" and modified the pipeline
- AND `currentPresetName.value` is still `"D&D 5e — d20"`
- WHEN the user clicks Save
- THEN a prompt appears: "`D&D 5e — d20` is a standard preset. Save as copy?"
- AND clicking "Save as Copy" creates a new my-preset with a copy of the standard preset's name
- AND the standard preset is NOT modified

#### Scenario: Save overwrite confirmation
- GIVEN a my-preset named "Fireball" already exists
- AND the user saves a configuration with `currentPresetName` set to `"Fireball"`
- WHEN the save executes
- THEN a prompt appears: "Overwrite `Fireball`?"
- AND options are [Overwrite] [Save as Copy] [Cancel]

---

### Requirement: Favorites

The application SHALL allow marking any preset (standard or my-preset) as a favorite via a ⭐ toggle. Favorite IDs SHALL be stored in `localStorage` under `dice-calc-favorites` as a JSON array of preset ID strings. Favorites SHALL appear before non-favorites in both the rail and library modal.

#### Scenario: Toggle favorite on
- GIVEN the "D&D 5e — d20" standard preset (id: `dnd-d20`)
- WHEN the user clicks the ☆ next to it
- THEN the star becomes ⭐ (solid)
- AND `favoriteIds` contains `dnd-d20`
- AND the star state persists after page reload

#### Scenario: Toggle favorite off
- GIVEN a preset is favorited (solid star)
- WHEN the user clicks the ⭐
- THEN the star becomes ☆ (outline)
- AND the preset ID is removed from `favoriteIds`

#### Scenario: Favorites survive page reload
- GIVEN the user has favorited 3 presets
- WHEN the page is reloaded
- THEN the same 3 presets show a solid ⭐

---

### Requirement: Copy Preset

The application SHALL allow copying any preset to My Presets. Copying a my-preset creates a duplicate with suffix " (copy)". Copying a standard preset creates a new my-preset with the same configuration.

#### Scenario: Copy my-preset
- GIVEN a my-preset named "Fireball"
- WHEN the user selects "Copy" from the context menu
- THEN a new my-preset appears named "Fireball (copy)"
- AND the new preset has a unique ID
- AND `createdAt` and `updatedAt` are set to the current time

#### Scenario: Copy standard preset to My Presets
- GIVEN the "D&D 5e — d20" standard preset
- WHEN the user selects "Copy to My Presets" in the Library Modal
- THEN a new my-preset "D&D 5e — d20" appears in My Presets
- AND it persists across page reloads

---

### Requirement: Delete My Preset

The application SHALL allow deleting a my-preset with confirmation. Standard presets SHALL NOT be deletable.

#### Scenario: Delete my-preset
- GIVEN a my-preset named "Old Roll"
- WHEN the user selects "Delete" from the context menu
- THEN a confirmation prompt appears: "Delete `Old Roll`?"
- AND on confirmation the preset is removed from localStorage
- AND the preset disappears from the rail and modal

#### Scenario: Delete cancelled
- GIVEN a confirmation prompt for deletion
- WHEN the user clicks Cancel or presses Escape
- THEN the preset is NOT removed

#### Scenario: Standard preset cannot be deleted
- GIVEN the "D&D 5e — d20" standard preset
- WHEN the user views its actions in the Library Modal
- THEN "Delete" is not available
- AND "Copy to My Presets" is available instead

---

### Requirement: Rename My Preset

The application SHALL allow renaming a my-preset via the Library Modal's context menu and the rail name editor.

#### Scenario: Rename via modal context menu
- GIVEN a my-preset named "Fireball"
- WHEN the user selects "Rename" from the context menu and types "Fireball 5e"
- THEN the preset is renamed to "Fireball 5e" in localStorage
- AND the new name appears in the rail and modal

#### Scenario: Rename via rail name editor
- GIVEN the active configuration is a my-preset named "Fireball"
- WHEN the user edits the name in the rail to "Greater Fireball" and presses Enter
- THEN the my-preset is renamed in localStorage
- AND `currentPresetName.value` is updated

---

### Requirement: Standard Preset Immutability

Built-in presets (`PRESETS` in `src/domain/presets.ts`) SHALL remain read-only. No save, rename, or delete operation SHALL modify a standard preset. Modifications derived from a standard preset SHALL require copying to My Presets first.

#### Scenario: Standard preset content preserved
- GIVEN the user applied "D&D 5e — d20" and changed the pool to 2d20
- WHEN the user applies a different preset and then re-applies "D&D 5e — d20"
- THEN the pool is back to 1d20 (the original built-in value)

#### Scenario: Cannot save over standard
- GIVEN the active config matches a standard preset's name
- WHEN the user clicks Save
- THEN the application prompts "Save as Copy" instead of overwriting

---

## MODIFIED Requirements

### Requirement: User Presets (in-memory) → My Presets (persistent)

~~The application SHALL maintain a list of user presets for the current session. User presets are added when a YAML file is loaded whose `name:` does not match any built-in preset. They are cleared on page reload.~~

The application SHALL maintain a persistent list of My Presets backed by `localStorage` via `lz-string` compression. Presets imported from YAML files SHALL be persisted to My Presets. Presets saved via the "Save" action SHALL be persisted to My Presets. My Presets survive page reloads and survive browser tab closure.

#### Scenario: Import persists to My Presets
- GIVEN a YAML file with `name: My Custom Roll`
- WHEN the user imports it
- THEN a new my-preset "My Custom Roll" is created in localStorage
- AND the preset is applied
- AND it appears in the My Presets rail zone
- AND it survives a page reload

#### Scenario: Import with name conflict
- GIVEN a my-preset named "Fireball" already exists in localStorage
- WHEN the user imports a YAML file whose `name:` field is `Fireball`
- THEN a prompt appears: "A preset named `Fireball` already exists."
- AND options are [Overwrite] [Save as Copy] [Cancel]
- AND choosing Cancel does not modify the existing preset

#### Scenario: Import of standard preset name
- GIVEN the user imports a YAML file whose `name:` matches a built-in preset name
- WHEN the import executes
- THEN the standard preset is NOT modified
- AND a new my-preset is created with the imported configuration and a suffix or the same name (as a my-preset copy)
- AND the imported config is applied to the editor
