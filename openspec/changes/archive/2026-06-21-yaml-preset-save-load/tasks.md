# Tasks: YAML preset save/load

## 1. OpenSpec change

- [x] Create `openspec/changes/yaml-preset-save-load/{proposal,design}.md`
- [x] Add spec deltas in `specs/persistence/spec.md`, `specs/presets/spec.md`, `specs/ui/spec.md`
- [x] Add `tasks.md` (this file)
- [ ] Run `openspec validate yaml-preset-save-load` (must pass)

## 2. YAML core (`src/utils/yaml.ts`)

- [ ] Tokenizer (lines + indent + key/value + scalars + comments)
- [ ] Parser (mapping, list, scalar)
- [ ] `serializePreset(config: PresetConfig): string`
- [ ] `parsePresetFile(text: string): PresetConfig[]` (always returns list)
- [ ] `parsePreset(text: string): PresetConfig` (single, throws on bundle)

## 3. Serialization (`src/utils/yaml.ts` continued)

- [ ] `presetToAst(config: PresetConfig): unknown` — domain → generic AST
- [ ] `astToPreset(ast: unknown): PresetConfig` — generic AST → domain
- [ ] Reference resolution: build name → id map, rewrite string references
- [ ] Die notation parser/serializer
- [ ] Reroll clause parser/serializer
- [ ] Pipeline `expr` parser/serializer (all forms)
- [ ] Outcome clause parser/serializer (scalar + dice-pool)
- [ ] Parameter parser/serializer (with `on` disambiguator)

## 4. State (`src/state/app-state.ts`)

- [ ] Add `userPresets` signal
- [ ] Add `allPresets` computed
- [ ] Helper `applyPresetByConfig(config: PresetConfig)` that mirrors `applyPreset` in `PresetSelector`

## 5. Persistence wiring (`src/state/persistence.ts`)

- [ ] `exportPresetToYaml(): string`
- [ ] `importPresetFromYaml(text: string): PresetConfig`
- [ ] `downloadYaml(filename: string, text: string): void`

## 6. UI (`src/app.tsx`)

- [ ] Replace single `Save` button with `Save` + `Load` + hidden file input
- [ ] Add `loadError` signal
- [ ] `handleSave` — slugify current name, call `downloadYaml`
- [ ] `handleLoad` — read file, parse, apply, surface error inline

## 7. PresetSelector (`src/components/PresetSelector.tsx`)

- [ ] Read from `allPresets` (built-in + user)
- [ ] Mark user presets with a small visual indicator
- [ ] Apply user presets by id (works the same as built-in after we register them)

## 8. Tests (`tests/yaml.test.ts`)

- [ ] Round-trip every built-in preset
- [ ] Die notation: 1d20, 2d6, 1d12<hope>, multi-term
- [ ] Reroll: simple explode, simple reroll, multi-clause (and/or)
- [ ] Pipeline: each expr form
- [ ] Outcomes: scalar and dice-pool, with `default`
- [ ] Parameters: each target, with and without `on`
- [ ] Errors: unknown step, ambiguous target, malformed die, bundle-vs-single
- [ ] Bundle parse: returns array of two

## 9. Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Manual smoke: configure, save, edit, load
