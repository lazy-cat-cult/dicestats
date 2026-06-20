## ADDED Requirements

### Requirement: My Presets localStorage Schema

The application SHALL store My Presets under the `localStorage` key `dice-calc-my-presets` with the following schema:

```typescript
interface MyPresetsStorage {
  version: 1;
  presets: MyPreset[];
}
```

The value SHALL be `lz-string.compressToBase64(JSON.stringify(data))`. On load, the value SHALL be decompressed and parsed.

#### Scenario: Compression round-trip
- GIVEN a valid `MyPresetsStorage` object with 3 presets
- WHEN it is compressed, stored, retrieved, and decompressed
- THEN the resulting object is deeply equal to the original

#### Scenario: Missing key returns empty
- GIVEN no value under `dice-calc-my-presets`
- WHEN the application loads my presets
- THEN an empty array is returned
- AND no error is raised

#### Scenario: Invalid data returns empty
- GIVEN the stored value is not valid lz-string base64
- WHEN the application loads my presets
- THEN `myPresets.value` is an empty array
- AND the error is caught silently

---

### Requirement: My Presets Versioning and Migration

The `MyPresetsStorage` schema includes a `version` field. When the stored version differs from the current version, a migration function SHALL be applied.

#### Scenario: Current version loads without migration
- GIVEN stored data with `version: 1`
- WHEN the current version is also `1`
- THEN no migration is applied
- AND presets are loaded as-is

#### Scenario: Unknown future version
- GIVEN stored data with `version: 2` (future)
- WHEN the application loads
- THEN the data is rejected (returns empty array)
- AND a warning is logged to console.warn with the version number

---

### Requirement: Favorites localStorage Schema

The application SHALL store favorite preset IDs under the `localStorage` key `dice-calc-favorites` as a JSON array of strings:

```json
["dnd-d20", "550e8400-e29b-41d4-a716-446655440000"]
```

On load, if the key is missing or the JSON is invalid, favorites SHALL default to an empty set.

#### Scenario: Favorites persist across reloads
- GIVEN the user has favorited two presets
- WHEN the page is reloaded
- THEN `favoriteIds` contains both IDs

#### Scenario: Missing favorites key
- GIVEN no value under `dice-calc-favorites`
- WHEN the application loads favorites
- THEN an empty Set is returned

---

### Requirement: localStorage QuotaExceededError Handling

If `localStorage.setItem()` throws a `QuotaExceededError` during a My Presets or Favorites write, the application SHALL show a non-blocking toast message and leave existing data intact.

#### Scenario: Quota exceeded on my-preset save
- GIVEN localStorage is at capacity
- WHEN the user clicks Save
- THEN a toast "Storage full — could not save preset." appears
- AND the existing My Presets are unchanged
- AND no error is thrown to the UI

#### Scenario: Normal save without quota issue
- GIVEN localStorage has available space
- WHEN the user saves a my-preset
- THEN the save succeeds
- AND no toast is shown

---

## MODIFIED Requirements

### Requirement: Save and Load → Export and Import

~~A "Save" button in the header SHALL write the current configuration to localStorage under the key `dice-calc-config`. Config SHALL auto-load on page mount. A "Clear" button SHALL remove the saved config and reset to defaults.~~

The application SHALL rename Save to **Export** (downloads current config as YAML file) and Load to **Import** (loads a YAML file and persists it to My Presets). A new "Save" action saves to My Presets in localStorage. A new "New" action resets to defaults. The existing auto-save/auto-load of the working configuration (`dice-calc-config`) continues unchanged.

#### Scenario: Export downloads YAML
- GIVEN a configured dice pool, pipeline, and outcomes
- WHEN the user clicks "Export"
- THEN a YAML file is downloaded (via showSaveFilePicker or Blob fallback)
- AND the file contains the current configuration as YAML

#### Scenario: Import persists and applies
- GIVEN a YAML file with valid preset data
- WHEN the user clicks "Import" and selects the file
- THEN the configuration is loaded into the editor
- AND the preset is persisted to My Presets
