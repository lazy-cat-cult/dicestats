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
  const [xCapped, setXCapped] = useState(false);
  const [yCapped, setYCapped] = useState(false);
  const [xName, setXName] = useState(sw.xName);
  const [yName, setYName] = useState(sw.yName);

  useEffect(() => {
    setXInput(formatValuesForDisplay(sweep.value.x));
  }, [sweep.value.x]);

  useEffect(() => {
    setYInput(sweep.value.y ? formatValuesForDisplay(sweep.value.y) : '');
  }, [sweep.value.y]);

  function commitX(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      sweep.value = { x: [], y: null, xName: sweep.value.xName, yName: sweep.value.yName };
      setXCapped(false);
      return;
    }
    const parsed = parseValues(trimmed);
    const { values, capped } = normalizeSweepValues(parsed);
    sweep.value = {
      x: values,
      y: sweep.value.y && sweep.value.y.length > 0 ? sweep.value.y : null,
      xName: sweep.value.xName,
      yName: sweep.value.yName,
    };
    setXCapped(capped);
    if (capped) {
      setXInput(formatValuesForDisplay(values));
    }
  }

  function commitY(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      sweep.value = { x: sweep.value.x, y: null, xName: sweep.value.xName, yName: sweep.value.yName };
      setYCapped(false);
      return;
    }
    const parsed = parseValues(trimmed);
    const { values, capped } = normalizeSweepValues(parsed);
    if (sweep.value.x.length === 0) {
      sweep.value = { x: [], y: null, xName: sweep.value.xName, yName: sweep.value.yName };
      return;
    }
    sweep.value = { x: sweep.value.x, y: values.length > 0 ? values : null, xName: sweep.value.xName, yName: sweep.value.yName };
    setYCapped(capped);
    if (capped) {
      setYInput(formatValuesForDisplay(values));
    }
  }

  function commitXName(raw: string) {
    const name = raw.trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      sweep.value = { ...sweep.value, xName: name };
    }
  }

  function commitYName(raw: string) {
    const name = raw.trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      sweep.value = { ...sweep.value, yName: name };
    }
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

  function handleXNameInput(raw: string) {
    setXName(raw);
  }

  function handleXNameBlur() {
    commitXName(xName);
    setXName(sweep.value.xName);
  }

  function handleYNameInput(raw: string) {
    setYName(raw);
  }

  function handleYNameBlur() {
    commitYName(yName);
    setYName(sweep.value.yName);
  }

  return (
    <div>
      <div class="space-y-3">
        <div class="flex gap-3 items-end">
          <div class="w-28 shrink-0">
            <TextField
              label="Name"
              value={xName}
              onInput={handleXNameInput}
              onBlur={handleXNameBlur}
              placeholder="X"
              ariaLabel="X parameter name"
            />
          </div>
          <div class="flex-1">
            <TextField
              label={`${sweep.value.xName} values`}
              value={xInput}
              onInput={handleXInput}
              onBlur={handleXBlur}
              placeholder="1, 2, 3, 4, 5 or 1..5"
              ariaLabel={`${sweep.value.xName} values`}
              error={xCapped ? 'Capped to 10 values' : undefined}
            />
          </div>
        </div>
        <div class="flex gap-3 items-end">
          <div class="w-28 shrink-0">
            <TextField
              label="Name"
              value={yName}
              onInput={handleYNameInput}
              onBlur={handleYNameBlur}
              placeholder="Y"
              ariaLabel="Y parameter name"
            />
          </div>
          <div class="flex-1">
            <TextField
              label={`${sweep.value.yName} values`}
              value={yInput}
              onInput={handleYInput}
              onBlur={handleYBlur}
              placeholder="10, 15, 20 or 10..20"
              ariaLabel={`${sweep.value.yName} values`}
              error={yCapped ? 'Capped to 10 values' : undefined}
            />
          </div>
        </div>
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