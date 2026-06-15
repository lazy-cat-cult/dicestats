# Dice Pool Specification

## Purpose

The dice pool defines what dice to roll — a flat list of dice terms, each representing a group of identical dice. Tags differentiate dice within the same pool for use in resolution conditions and pipeline operations. Keep rules and explode modes are NOT pool-level properties; they are expressed via the pipeline and reroll conditions respectively.

## Requirements

### Requirement: DiceTerm Identity and Stability
Each `DiceTerm` SHALL have a stable unique identifier (`id`) generated via `crypto.randomUUID()`. This `id` persists across reorderings and edits, ensuring that references from parameters, pipeline rows, and outcomes remain valid.

#### Scenario: Term stability across reorderings
- GIVEN a dice pool with terms [A (id "abc"), B (id "def")]
- WHEN the user reorders terms so B appears first
- THEN term A retains id "abc" and term B retains id "def"
- AND references from parameters targeting these terms remain valid

### Requirement: DiceTerm Field Constraints
Each `DiceTerm` SHALL enforce:
- `count`: integer >= 1 and <= 99, default 1
- `sides`: integer >= 1 and <= 999; standard options in UI: d4, d6, d8, d10, d12, d20, d100; custom option for arbitrary values
- `tag`: free-text label, maximum 30 characters, default ""; tags are NOT required to be unique across terms

#### Scenario: Default term creation
- GIVEN the user adds a new dice term
- THEN count defaults to 1, sides defaults to 20, and tag defaults to ""

#### Scenario: Custom sides
- GIVEN the user selects "custom" for sides in the UI
- WHEN the user enters 7
- THEN the term has sides set to 7

#### Scenario: Multiple terms sharing a tag
- GIVEN term A (2d6 tag "fire") and term B (3d6 tag "fire")
- WHEN a pipeline step filters by tag "fire"
- THEN dice from both terms A and B are included

### Requirement: Minimum Pool Size
The dice pool SHALL contain at least one `DiceTerm` at all times. Deletion of the last remaining term SHALL be disabled in the UI.

#### Scenario: Cannot delete last term
- GIVEN a dice pool with exactly one term
- WHEN the user attempts to delete it
- THEN the delete button SHALL be disabled
- AND the term remains in the pool

### Requirement: Tag Autocomplete and Color Palette
The UI SHALL provide tag autocomplete from existing tag values. Tags in the dice notation preview SHALL be displayed with auto-assigned colored dots from a fixed palette: `['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']`. Colors cycle through the palette in tag-first-appearance order.

#### Scenario: Tag color assignment
- GIVEN terms with tags ["normal", "hunger", "rage"]
- WHEN the dice notation preview is rendered
- THEN "normal" shows with red dot (#ef4444), "hunger" with blue (#3b82f6), "rage" with green (#22c55e)

#### Scenario: Empty tag display
- GIVEN a term with an empty tag ("")
- WHEN the dice notation preview is rendered
- THEN the term displays without a colored dot (e.g., "4d6" not "4d6 ●red")

### Requirement: No Pool-Level Keep or Explode
Keep rules (advantage, disadvantage) and explode modes SHALL NOT be properties of the `DicePool` type. Keep functionality is expressed through the resolution pipeline (`max`/`min` operations). Explode functionality is expressed through `RerollCondition` with action `explode`.

#### Scenario: Advantage expressed through pipeline
- GIVEN a pool of 2d20 with no pool-level keep rule
- WHEN the user wants the highest roll (advantage)
- THEN the resolution pipeline contains `best = max rolled`
- AND the outcome references `best` rather than a pool-level keep property

### Requirement: Live Dice Notation Preview
The UI SHALL display a live dice notation preview showing count, sides, and tag-colored dots (e.g., "2d20 ●adv + 4d6").

#### Scenario: Mixed pool with tags
- GIVEN terms [2d20 tag "adv", 4d6 tag ""]
- WHEN the preview is rendered
- THEN it shows "2d20 ●adv + 4d6"

### Requirement: DicePool TypeScript Type
The `DicePool` type SHALL be:
```typescript
interface DiceTerm {
  id: string;       // crypto.randomUUID(), stable across reorderings
  count: number;    // 1..99, default 1
  sides: number;    // 1..999, standard options or custom
  tag: string;      // max 30 chars, default ""
}

interface DicePool {
  terms: DiceTerm[];
}
```

#### Scenario: Type structure
- GIVEN the DicePool type definition
- WHEN a pool is constructed
- THEN it contains only a `terms` array with no `keep` or `explode` fields