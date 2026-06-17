import { useState, useEffect } from 'preact/hooks';
import { sweep, totalIterations, confirmedHighCost } from '@/state/app-state';
import { normalizeSweepValues, parseValues } from '@/utils/expression';
import { SweepCostChip } from '@/components/SweepCostChip';
import { TextField } from '@/components/ui';

function formatValuesForDisplay(values: number[]): string {
  if (values.length === 0) return '';
  return values.join(', ');
}

export function SweepEditor() {
  const sw = sweep.value;
  const displayX = formatValuesForDisplay(sw.x);
  const displayY = sw.y ? formatValuesForDisplay(sw.y) : '';
  const total = totalIterations.value;
  const yOuter = sw.y && sw.y.length > 0;

  const [xInput, setXInput] = useState(displayX);
  const [yInput, setYInput] = useState(displayY);

  useEffect(() => {
    setXInput(formatValuesForDisplay(sweep.value.x));
  }, [sweep.value.x]);

  useEffect(() => {
    setYInput(sweep.value.y ? formatValuesForDisplay(sweep.value.y) : '');
  }, [sweep.value.y]);

  function commitX(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      sweep.value = { x: [], y: null };
      return;
    }
    const parsed = parseValues(trimmed);
    const { values, capped } = normalizeSweepValues(parsed);
    sweep.value = {
      x: values,
      y: sweep.value.y && sweep.value.y.length > 0 ? sweep.value.y : null,
    };
    if (capped) {
      sweep.value = { ...sweep.value };
    }
  }

  function commitY(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      sweep.value = { x: sweep.value.x, y: null };
      return;
    }
    const parsed = parseValues(trimmed);
    const { values } = normalizeSweepValues(parsed);
    if (sweep.value.x.length === 0) {
      sweep.value = { x: [], y: null };
      return;
    }
    sweep.value = { x: sweep.value.x, y: values.length > 0 ? values : null };
  }

  function handleXInput(raw: string) {
    setXInput(raw);
  }

  function handleXBlur() {
    commitX(xInput);
    setXInput(formatValuesForDisplay(sweep.value.x));
  }

  function handleYInput(raw: string) {
    setYInput(raw);
  }

  function handleYBlur() {
    commitY(yInput);
    setYInput(sweep.value.y ? formatValuesForDisplay(sweep.value.y) : '');
  }

  return (
    <div>
      <div class="space-y-3">
        <TextField
          label="Sweep X values"
          value={xInput}
          onInput={handleXInput}
          onBlur={handleXBlur}
          placeholder="1, 2, 3, 4, 5 or 1..5"
          ariaLabel="Sweep X values"
        />
        <TextField
          label="Sweep Y values (optional)"
          value={yInput}
          onInput={handleYInput}
          onBlur={handleYBlur}
          placeholder="10, 15, 20 or 10..20"
          ariaLabel="Sweep Y values"
        />
        <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
          {yOuter
            ? `${sw.y!.length} × ${sw.x.length} simulations · ${total.toLocaleString()} rolls`
            : `${sw.x.length} simulation${sw.x.length === 1 ? '' : 's'} · ${total.toLocaleString()} rolls`}
        </p>
      </div>
      <div class="mt-4">
        <SweepCostChip onConfirmHighCost={() => { confirmedHighCost.value = true; }} />
      </div>
    </div>
  );
}