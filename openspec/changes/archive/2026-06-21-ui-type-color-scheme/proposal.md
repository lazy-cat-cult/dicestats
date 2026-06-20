# Proposal: ui-type-color-scheme

## Why

`PipelineEditor.tsx:131` currently paints the entire row card with `border-green-300 bg-green-50` whenever the row's resolved output type is scalar. Lines 138-141 then color the name input border green and render the `num` badge with `bg-green-200 text-green-800`. The visual treatment "rewards" scalar values — they look like the *good* case — and vector rows look like the default. That is the wrong framing: both `num` and `vec` are equally valid output types. The treatment also dominates the page when there are several scalar rows, making the editor feel uneven.

The fix is a more restrained scheme:
1. Remove the full-row green background. All rows share the same neutral card surface (`bg-gray-50`, or `border-red-300 bg-red-50` for validation errors).
2. The small `num` / `vec` badge next to the name remains the primary type indicator. Both badges use the **same** slate color so neither type is visually preferred.
3. The name input border is neutral for valid rows. No green text, no green border.

This change affects `PipelineEditor.tsx` only. `OutcomeEditor.tsx` has no row-level scalar/vector treatment to remove (the type already lives inside the per-condition source dropdown labels), so nothing changes there.

## What Changes

- **Modify** `src/components/PipelineEditor.tsx`:
  - The row container class drops the `border-green-300 bg-green-50` branch. The container is `bg-gray-50` (or error red) for all rows regardless of output type.
  - The `num` badge loses the `bg-green-200 text-green-800` styling and uses the same slate palette as the `vec` badge. Both badges remain; the type label still indicates scalar vs vector at a glance, but neither is highlighted.
  - The name input border is neutral (`border-gray-300` or whatever the default is) for valid rows. It is red only for invalid names.

## Impact

- Affected specs: `openspec/specs/ui/spec.md` (PipelineEditor).
- Affected code: `src/components/PipelineEditor.tsx` only.

## Non-Goals

- No new color tokens. We reuse the existing slate palette already used by the `vec` badge.
- No change to the badge content (`num` / `vec`) — the label text is unchanged.
- No change to validation, error, or hover styling.
- No change to OutcomeEditor (no scalar/vector row treatment to remove).
