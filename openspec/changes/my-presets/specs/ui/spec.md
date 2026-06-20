## ADDED Requirements

### Requirement: My Presets Zone in Preset Rail

The Preset Rail SHALL contain a visually distinguishable My Presets zone before the Standard zone. This zone SHALL render up to 4 my-preset pills, favoring favorites first, then sorted by `updatedAt` descending. When no my-presets exist, SHALL show a subdued non-interactive placeholder.

#### Scenario: My Presets zone with presets
- GIVEN there are 3 my-presets (one favorited)
- WHEN the rail renders
- THEN the first pill in the rail is the favorited my-preset
- AND the next two pills are the remaining my-presets ordered by `updatedAt` desc
- AND they are visually distinguishable from standard presets (e.g., `·` suffix or distinct styling)

#### Scenario: Empty My Presets zone
- GIVEN there are 0 my-presets
- WHEN the rail renders
- THEN the My Presets zone shows a muted italic text: "No saved presets"
- AND no my-preset pills are rendered
- AND the Standard zone follows immediately after

---

### Requirement: Action Buttons in Preset Rail Footer

The Preset Rail SHALL expose four action buttons in a row: **New**, **Export**, **Import**, **Save**. The buttons SHALL be styled as ghost variants with `border-gold/50 text-ink hover:border-billiard hover:text-billiard`.

#### Scenario: New clears config
- GIVEN the user has a complex configuration loaded
- WHEN the user clicks "New"
- THEN all sections reset to defaults (1d20, no reroll, no pipeline, no outcomes, no sweep)
- AND `currentPresetName.value` is set to `null`
- AND sim results are cleared
- AND any in-flight simulation is cancelled

#### Scenario: Save disabled at limit
- GIVEN 100 My Presets exist
- AND no existing my-preset matches the current `currentPresetName`
- WHEN the user clicks Save
- THEN the Save button is disabled
- AND a tooltip reads: "My Presets limit reached (100). Delete unused presets to make room."

#### Scenario: Save is a separate action from Export
- GIVEN the Preset Rail
- WHEN inspecting the action buttons
- THEN "Export" and "Save" are two distinct buttons
- AND "Export" always downloads a YAML file
- AND "Save" saves to My Presets (with name prompt if empty)

---

### Requirement: Save Name Prompt Dialog

When Save is triggered and `currentPresetName` is `null` or `""`, an inline dialog SHALL appear directly in the rail:

```
┌──────────────────────────────────────────────┐
│ Name: [________________________] [Save] [✕]  │
└──────────────────────────────────────────────┘
```

#### Scenario: Save name prompt auto-focus
- GIVEN `currentPresetName` is `null`
- WHEN the Save button is clicked
- THEN an input field appears
- AND the input is autofocused with the cursor inside

#### Scenario: Save name prompt confirmed
- GIVEN the name prompt is open with input text "My Roll"
- WHEN the user presses Enter
- THEN the preset is saved to My Presets with name "My Roll"
- AND the dialog closes

#### Scenario: Save name prompt cancelled
- GIVEN the name prompt is open
- WHEN the user presses Escape
- THEN the dialog closes
- AND no preset is saved
- AND `currentPresetName` remains unchanged

---

### Requirement: Preset Library Modal Tabs

The Preset Library Modal SHALL have a tab bar with three tabs: **All**, **My Presets (N)**, **Favorites (M)**. The search input SHALL filter within the active tab. The default tab SHALL be "All".

#### Scenario: Default tab is All
- GIVEN the Library Modal is opened
- WHEN it renders
- THEN the "All" tab is selected

#### Scenario: Tab counts update reactively
- GIVEN there are 5 my-presets and 2 favorited presets
- WHEN the modal renders
- THEN the "My Presets" tab shows "(5)"
- AND the "Favorites" tab shows "(2)"

#### Scenario: Search scoped to active tab
- GIVEN the user is on the "Favorites" tab with 3 favorited presets
- WHEN the user types "blades" in the search field
- THEN only favorited presets whose name contains "blades" (case-insensitive) are shown

#### Scenario: My Presets tab shows only user presets
- GIVEN the user is on the "My Presets" tab
- WHEN the list renders
- THEN no standard (built-in) presets are shown
- AND presets are sorted favorites first, then by `updatedAt` desc

#### Scenario: Favorites tab shows presets of both types
- GIVEN the user has favorited 2 built-in presets and 1 my-preset
- WHEN the user is on the "Favorites" tab
- THEN all 3 favorited presets are shown
- AND my-presets appear before standard presets within the list

---

### Requirement: Context Menu for My Presets

Each my-preset row in the Library Modal SHALL have a `…` (vertical ellipsis) trigger that opens a context menu with **Rename**, **Copy**, and **Delete** actions. Standard preset rows SHALL NOT have a context menu — instead they SHALL have a **"Copy to My Presets"** action.

#### Scenario: Context menu opens on click
- GIVEN a my-preset row in the modal
- WHEN the user clicks the `…` trigger
- THEN a menu appears with Rename, Copy, Delete

#### Scenario: Rename via context menu
- GIVEN the context menu is open on a my-preset named "Old Name"
- WHEN the user clicks Rename
- THEN the preset name becomes an inline editable text input pre-filled with "Old Name"
- AND pressing Enter saves the new name
- AND pressing Escape restores the original name

#### Scenario: Delete via context menu
- GIVEN the context menu is open on a my-preset
- WHEN the user clicks Delete
- THEN a confirmation prompt appears: "Delete `<name>`?"
- AND after confirmation the preset is removed

#### Scenario: Standard preset shows Copy action
- GIVEN a standard preset row in the modal
- WHEN the row renders
- THEN a "Copy to My Presets" action is available
- AND no `…` trigger or Delete action is shown

#### Scenario: Context menu closes on outside click
- GIVEN the context menu is open
- WHEN the user clicks outside the menu
- THEN the menu closes
- AND no action is taken

---

### Requirement: Favorite Star Toggle in Library Modal

Every preset row in the Library Modal SHALL show a ⭐ toggle on the left side of the preset name. The star is solid ⭐ (`text-gold`) when favorited, outline ☆ (`text-ink-mute hover:text-gold`) when not. The toggle SHALL have `aria-label` describing the current state.

#### Scenario: Star toggle adds favorite
- GIVEN a preset row with an outline ☆
- WHEN the user clicks ☆
- THEN the star becomes solid ⭐
- AND the preset ID is added to `favoriteIds`

#### Scenario: Star toggle removes favorite
- GIVEN a preset row with a solid ⭐
- WHEN the user clicks ⭐
- THEN the star becomes outline ☆
- AND the preset ID is removed from `favoriteIds`

#### Scenario: Keyboard accessibility
- GIVEN a ⭐ toggle for a preset named "Fireball"
- WHEN inspecting the element
- THEN `aria-label` is "Favorite Fireball" when not favorited, or "Unfavorite Fireball" when favorited
- AND the element is focusable and activatable via keyboard

---

### Requirement: Copy to My Presets for Standard Presets

The Library Modal SHALL provide a "Copy to My Presets" action for each standard preset row. Clicking it SHALL create a new my-preset with the standard preset's configuration and the standard preset's name. If a my-preset with that name already exists, the copy SHALL use the name with " (copy)" suffix.

#### Scenario: Copy standard preset to My Presets
- GIVEN the user views "D&D 5e — d20" in the Library Modal
- WHEN the user clicks "Copy to My Presets"
- THEN a new my-preset "D&D 5e — d20" appears in My Presets
- AND it persists across reloads

#### Scenario: Copy standard preset with name conflict
- GIVEN a my-preset named "D&D 5e — d20" already exists
- WHEN the user copies the standard "D&D 5e — d20" preset
- THEN a new my-preset "D&D 5e — d20 (copy)" is created

---

## MODIFIED Requirements

### Requirement: Preset Rail

~~A horizontal pill rail pinned directly under the header SHALL show all available presets (built-in and user-imported). Each preset is rendered as a `Pill` component in the default variant (no active highlight is used). The rail: SHALL have a "Presets" eyebrow label, SHALL be horizontally scrollable, user-loaded preset marked with `·`, SHALL have `border-b border-rule` separator, editable name input, and "All Presets ▾" trigger.~~

The Preset Rail SHALL be reorganized into three horizontal zones (rendered in order):

1. **My Presets zone** — up to 4 pills of my-presets (favorites first, then by `updatedAt` desc); subdued "No saved presets" placeholder when empty.
2. **Standard zone** — featured built-in presets (unchanged from existing behavior).
3. **All ▾ trigger** — opens the Preset Library Modal.

Below the pill row, a footer row SHALL contain: the editable name input, followed by action buttons **New**, **Export**, **Import**, and **Save**.

The rail SHALL be horizontally scrollable on narrow viewports, with My Presets at the start of the scroll.

#### Scenario: Rail zones in order
- GIVEN the application renders with 2 my-presets and 4 featured standard presets
- WHEN inspecting the pill region
- THEN the first two pills are my-presets
- THEN the next four pills are featured standard presets
- THEN the "All ▾" trigger appears after the last standard pill

#### Scenario: Empty My Presets on first visit
- GIVEN the user has never saved a my-preset
- WHEN the rail renders
- THEN the My Presets zone shows "No saved presets" in muted, italic text
- AND the Standard zone follows immediately
- AND the pill region starts with the Standard zone

#### Scenario: Action buttons below pill region
- GIVEN the Preset Rail renders
- WHEN inspecting the footer row
- THEN four buttons are visible in order: [New] [Export] [Import] [Save]
- AND they use the same ghost styling as existing YAML Save/Load buttons
