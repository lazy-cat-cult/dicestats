# UI Specification (delta)

## MODIFIED Requirements

### Requirement: OddsTape (extended — preset name display)
The OddsTape component SHALL display the current preset name above the "Top Probability" eyebrow when a preset is applied.

The preset name is rendered as:
- A `font-display text-[13px] tracking-[0.14em] text-ink` paragraph.
- Positioned above the "Top Probability" eyebrow line.
- Truncated with `truncate` class if the name exceeds the available width.
- Includes a `title` attribute with the full preset name for tooltip on hover.
- Hidden entirely when `currentPresetName.value` is `null`.

```tsx
{presetName && (
  <p class="font-display text-[13px] tracking-[0.14em] text-ink mb-2 truncate" title={presetName}>
    {presetName}
  </p>
)}
<div class="flex items-center gap-2 mb-2">
  <span class="h-px w-6 bg-gold" aria-hidden="true" />
  <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep">
    Top Probability
  </p>
</div>
```

#### Scenario: OddsTape shows preset name when applied
- GIVEN `currentPresetName.value` is `"D&D 5e — Advantage"`
- WHEN the OddsTape renders with simulation results
- THEN the preset name is displayed above the "Top Probability" eyebrow
- AND the name is truncated with ellipsis if it exceeds the container width
- AND hovering over the truncated name shows the full name in a tooltip

#### Scenario: OddsTape hides preset name when no preset
- GIVEN `currentPresetName.value` is `null`
- WHEN the OddsTape renders with simulation results
- THEN no preset name is displayed
- AND the "Top Probability" eyebrow is the first element in the header area

#### Scenario: Preset name updates reactively
- GIVEN the OddsTape is rendered with `currentPresetName.value` = `"PbtA — 2d6"`
- WHEN the user applies a different preset ("Shadowrun — Xd6")
- THEN the OddsTape re-renders with the new preset name
- AND no page reload is required

#### Scenario: Preset name in sweep results
- GIVEN a parameter sweep run with `taskName: "D&D 5e — d20"`
- WHEN the ResultView table renders
- THEN the sweep labels in the leftmost column include the preset name (e.g., `"D&D 5e — d20 · DC=15"`)
- AND the preset name is also shown in the OddsTape above the "Top Probability" eyebrow
