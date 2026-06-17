import { useState, useEffect } from 'preact/hooks';
import type { Expr } from '@/types';
import { parseExpr, exprToString, literalExpr } from '@/utils/expression';

type ExprMode = 'num' | 'var';

function inferMode(expr: Expr): ExprMode {
  if (expr.kind === 'ref') return 'var';
  return 'num';
}

interface ExprInputProps {
  value: Expr;
  onChange: (expr: Expr) => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
  integerOnly?: boolean;
  min?: number;
  max?: number;
  availableVars?: { x: boolean; y: boolean };
}

export function ExprInput({ value, onChange, label, ariaLabel, className = '', placeholder, integerOnly, min, max, availableVars }: ExprInputProps) {
  const mode = inferMode(value);
  const [localMode, setLocalMode] = useState<ExprMode>(mode);
  const hasX = availableVars?.x ?? false;
  const hasY = availableVars?.y ?? false;

  useEffect(() => {
    setLocalMode(inferMode(value));
  }, [value.kind]);

  function switchMode(newMode: ExprMode) {
    setLocalMode(newMode);
    if (newMode === 'num') {
      if (value.kind === 'ref') {
        const fallback = integerOnly ? (min ?? 1) : 0;
        onChange(literalExpr(fallback));
      }
    } else {
      onChange({ kind: 'ref', name: 'X' });
    }
  }

  if (localMode === 'var') {
    const selectedVar = value.kind === 'ref' ? value.name : 'X';
    const varMissing = selectedVar === 'X' ? !hasX : !hasY;

    return (
      <div class={className}>
        {label && (
          <label class="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1">
            {label}
          </label>
        )}
        <div class="flex items-stretch">
          <VarToggle mode="var" onSwitch={() => switchMode('num')} />
          <select
            aria-label={ariaLabel ?? label}
            class={`flex-1 border border-l-0 ${varMissing ? 'border-billiard bg-billiard/5' : 'border-rule bg-paper'} px-2 py-1.5 text-[13px] font-mono tabular ${varMissing ? 'text-billiard' : 'text-billiard'} outline-none focus:border-billiard transition-colors`}
            value={selectedVar}
            onChange={(e) => {
              const name = (e.target as HTMLSelectElement).value as 'X' | 'Y';
              onChange({ kind: 'ref', name });
            }}
          >
            <option value="X" disabled={!hasX}>X{hasX ? '' : ' (not set)'}</option>
            <option value="Y" disabled={!hasY}>Y{hasY ? '' : ' (not set)'}</option>
          </select>
        </div>
        {varMissing && (
          <p class="font-mono text-[10px] uppercase tracking-[0.14em] mt-1 text-billiard">
            Set {selectedVar} values in Sweep
          </p>
        )}
      </div>
    );
  }

  return (
    <NumExprInput
      value={value}
      onChange={onChange}
      label={label}
      ariaLabel={ariaLabel}
      className={className}
      placeholder={placeholder}
      integerOnly={integerOnly}
      min={min}
      max={max}
      onSwitchToVar={() => switchMode('var')}
    />
  );
}

interface NumExprInputProps {
  value: Expr;
  onChange: (expr: Expr) => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
  integerOnly?: boolean;
  min?: number;
  max?: number;
  onSwitchToVar: () => void;
}

function NumExprInput({ value, onChange, label, ariaLabel, className = '', placeholder, onSwitchToVar }: NumExprInputProps) {
  const initial = exprToString(value);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = exprToString(value);
    if (current !== text) {
      setText(current);
      setError(null);
    }
  }, [value]);

  function commit(next: string) {
    setText(next);
    if (next.trim() === '') {
      setError('Empty');
      return;
    }
    const parsed = parseExpr(next);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onChange(parsed.expr);
  }

  return (
    <div class={className}>
      {label && (
        <label class="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1">
          {label}
        </label>
      )}
      <div class="flex items-stretch">
        <VarToggle mode="num" onSwitch={onSwitchToVar} />
        <div class={`flex-1 border border-l-0 ${error ? 'border-billiard' : 'border-rule'} bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)] transition-all`}>
          <input
            type="text"
            value={text}
            placeholder={placeholder}
            aria-label={ariaLabel ?? label}
            class="w-full bg-transparent px-2.5 py-1.5 text-[13px] font-mono tabular text-ink outline-none placeholder:text-ink-mute"
            onInput={(e) => commit((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>
      {error && (
        <p class="font-mono text-[10px] uppercase tracking-[0.14em] mt-1 text-billiard">
          Error: {error}
        </p>
      )}
    </div>
  );
}

function VarToggle({ mode, onSwitch }: { mode: ExprMode; onSwitch: () => void }) {
  return (
    <button
      type="button"
      onClick={onSwitch}
      aria-label={mode === 'num' ? 'Switch to variable reference' : 'Switch to numeric input'}
      title={mode === 'num' ? 'Use X/Y variable' : 'Enter number'}
      class={`flex items-center justify-center w-8 border shrink-0 ${mode === 'var' ? 'border-billiard bg-billiard/10 text-billiard' : 'border-rule bg-paper-deep/50 text-ink-mute hover:text-ink-soft hover:bg-paper'} transition-colors cursor-pointer select-none`}
    >
      {mode === 'num' ? (
        <svg viewBox="0 0 16 16" class="w-3.5 h-3.5" aria-hidden="true">
          <text x="3" y="12.5" font-size="12" font-family="monospace" font-weight="bold" fill="currentColor">n</text>
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" class="w-3.5 h-3.5" aria-hidden="true">
          <text x="2.5" y="12.5" font-size="12" font-family="monospace" font-weight="bold" fill="currentColor">x̄</text>
        </svg>
      )}
    </button>
  );
}