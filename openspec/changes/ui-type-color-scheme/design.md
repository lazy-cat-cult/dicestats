# Design: ui-type-color-scheme

## Goals

- The scalar/vector output type of a pipeline row is communicated by the existing `num` / `vec` badge next to the name, with no extra row-level color treatment.
- Both badges share a single neutral color so neither type is preferred visually.
- Validation errors and hover states are unchanged.

## Non-Goals

- No new design tokens. We reuse the existing `slate-200` / `slate-700` utilities that the `vec` badge already uses (line 141 of the current `PipelineEditor.tsx`).

## Changes

`src/components/PipelineEditor.tsx:131`:

```tsx
// Before
<div key={nv.id} id={`pipeline-row-${nv.id}`} class={`border rounded p-3 mb-3 ${nameInvalid || nameDuplicate || sourceInvalid ? 'border-red-300 bg-red-50' : outputType === 'scalar' ? 'border-green-300 bg-green-50' : 'bg-gray-50'}`}>

// After
<div key={nv.id} id={`pipeline-row-${nv.id}`} class={`border rounded p-3 mb-3 ${nameInvalid || nameDuplicate || sourceInvalid ? 'border-red-300 bg-red-50' : 'bg-gray-50'}`}>
```

`src/components/PipelineEditor.tsx:138-141`:

```tsx
// Before
<input
  ...
  class={`w-28 px-2 py-1 border rounded text-sm font-mono ${nameInvalid || nameDuplicate ? 'border-red-400' : outputType === 'scalar' ? 'text-green-700 border-green-400' : ''}`}
  ...
/>
<span class={`text-xs px-1.5 py-0.5 rounded ${outputType === 'scalar' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'}`}>{outputType === 'scalar' ? 'num' : 'vec'}</span>

// After
<input
  ...
  class={`w-28 px-2 py-1 border rounded text-sm font-mono ${nameInvalid || nameDuplicate ? 'border-red-400' : ''}`}
  ...
/>
<span class="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">{outputType === 'scalar' ? 'num' : 'vec'}</span>
```

## Risks

- The old `bg-blue-200 text-blue-800` `vec` badge color is also removed in favour of the neutral slate. Users who had a muscle memory for "blue badge = vector" will see the same slate for both, which is the intended outcome.
