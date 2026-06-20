# Design: ui-comment-collapsible

## Goals

- Hide the per-row optional comment inputs in `PipelineEditor` and `OutcomeEditor` by default.
- A single per-editor checkbox toggles visibility. The state is shared (one global `showComments`), so the two editors stay in sync.
- The toggle persists across reloads in `localStorage` under the new key `dice-calc-ui`.
- A new user who wants comments visible re-enables it once; that setting survives reloads.

## Non-Goals

- No per-editor toggle. The shared `showComments` keeps the two editors in sync without state duplication.
- No new persistence key migration. The new key is independent of `dice-calc-config`.

## State

```ts
// src/state/app-state.ts
export const showComments = signal<boolean>(loadShowComments());
```

`loadShowComments()` reads the new localStorage key and returns `false` on any error or missing key. Default: `false`.

## Persistence

```ts
// src/state/persistence.ts
const UI_PREFS_KEY = 'dice-calc-ui';
interface UiPrefs { showComments: boolean; }

export function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { showComments: false };
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return { showComments: parsed.showComments === true };
  } catch {
    return { showComments: false };
  }
}

export function saveUiPrefs(prefs: UiPrefs): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
}

function loadShowComments(): boolean {
  return loadUiPrefs().showComments;
}
```

The auto-save is wired in `src/state/app-state.ts` next to the existing parameter-fingerprint `effect()`:

```ts
effect(() => {
  saveUiPrefs({ showComments: showComments.value });
});
```

## UI

In `PipelineEditor.tsx`, the heading row changes from a single `<h2>` to:

```tsx
<div class="flex items-center justify-between mb-4">
  <h2 class="text-lg font-semibold">Resolution Pipeline</h2>
  <label class="flex items-center gap-1 text-xs text-gray-600">
    <input
      type="checkbox"
      checked={showComments.value}
      onChange={(e) => { showComments.value = (e.target as HTMLInputElement).checked; }}
    />
    Show comments
  </label>
</div>
```

The per-row comment `<input>` becomes:

```tsx
{showComments.value && (
  <input
    type="text"
    value={nv.comment}
    placeholder="Comment (optional)"
    class="w-full mt-1 px-2 py-1 border rounded text-sm"
    onInput={(e) => updateRow(i, { comment: (e.target as HTMLInputElement).value })}
  />
)}
```

`OutcomeEditor.tsx` gets the same treatment in its heading row and per-row comment input.

## Risks

- **State stored in module scope** — `loadShowComments()` runs at module load (before `App` mounts). If the user clears the key in DevTools between the load and the first effect, the next save will overwrite it. This is acceptable; the same risk exists for `loadConfig()` today.
- **Two editors share one toggle** — some users might want comments visible in `OutcomeEditor` but hidden in `PipelineEditor`. The plan intentionally keeps the toggle global to avoid per-editor state duplication. If per-editor toggles are needed later, they can be added on top.
