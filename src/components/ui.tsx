import type { ComponentChildren } from 'preact';

interface SectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  index?: number;
  total?: number;
  actions?: ComponentChildren;
  children: ComponentChildren;
}

export function Section({ eyebrow, title, description, index, total, actions, children }: SectionProps) {
  return (
    <section class="pt-7 pb-7 first:pt-0">
      <div class="h-px bg-gold/30 mb-6 first:hidden" aria-hidden="true" />
      <header class="mb-4 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep mb-1.5">
              {eyebrow}
            </p>
          )}
          <h2 class="font-display text-[1.5rem] leading-none text-ink tracking-wider">
            {index !== undefined && total !== undefined && (
              <span class="text-billiard mr-2">{String(index).padStart(2, '0')}</span>
            )}
            {title}
          </h2>
          {description && (
            <p class="text-[13px] text-ink-soft mt-2 leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div class="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

interface TextFieldProps {
  label?: string;
  value: string | number;
  onInput: (v: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  id?: string;
  ariaLabel?: string;
  mono?: boolean;
  suffix?: string;
  error?: string;
}

export function TextField({
  label,
  value,
  onInput,
  onBlur,
  type = 'text',
  min,
  max,
  step,
  placeholder,
  maxLength,
  className = '',
  id,
  ariaLabel,
  suffix,
  error,
}: TextFieldProps) {
  const inputId = id ?? `f-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div class={className}>
      {label && (
        <label for={inputId} class="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1">
          {label}
        </label>
      )}
      <div class={`flex items-stretch border transition-all ${error ? 'border-billiard' : 'border-rule'} bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)]`}>
        <input
          id={inputId}
          type={type}
          value={value}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-label={ariaLabel ?? label}
          aria-invalid={error ? 'true' : undefined}
          class="w-full bg-transparent px-2.5 py-1.5 text-[13px] font-mono tabular text-ink outline-none placeholder:text-ink-mute"
          onInput={(e) => onInput((e.target as HTMLInputElement).value)}
          onBlur={onBlur}
        />
        {suffix && (
          <span class="flex items-center px-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft border-l border-rule">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p class="font-mono text-[10px] uppercase tracking-[0.14em] mt-1 text-billiard" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface BracketedNameInputProps {
  value: string;
  onInput: (v: string) => void;
  bracketed: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
}

export function BracketedNameInput({ value, onInput, bracketed, placeholder, maxLength = 30, className = '', ariaLabel }: BracketedNameInputProps) {
  return (
    <div class={`flex items-stretch border border-rule bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)] transition-all ${className}`}>
      {bracketed && (
        <span aria-hidden="true" class="flex items-center px-2 font-mono text-[13px] text-ink-mute select-none">[</span>
      )}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={ariaLabel}
        class="w-full bg-transparent px-1 py-1.5 text-[13px] font-mono tabular text-ink outline-none placeholder:text-ink-mute"
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
      {bracketed && (
        <span aria-hidden="true" class="flex items-center px-2 font-mono text-[13px] text-ink-mute select-none">]</span>
      )}
    </div>
  );
}

interface SelectProps<T extends string> {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  id?: string;
  ariaLabel?: string;
  style?: Record<string, string>;
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  className = '',
  id,
  ariaLabel,
  style,
}: SelectProps<T>) {
  const selectId = id ?? `s-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div class={className}>
      {label && (
        <label for={selectId} class="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1">
          {label}
        </label>
      )}
      <div
        class="flex items-stretch border border-rule bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)] transition-all"
        style={style}
      >
        <select
          id={selectId}
          value={value}
          aria-label={ariaLabel ?? label}
          class="w-full appearance-none bg-transparent px-2.5 py-1.5 pr-7 text-[13px] font-mono tabular text-ink outline-none"
          style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2 4l4 4 4-4%22 stroke=%22%232f7a4d%22 stroke-width=%221.4%22 fill=%22none%22 stroke-linecap=%22square%22/></svg>'); background-size: 12px; background-repeat: no-repeat; background-position: right 8px center;"
          onChange={(e) => onChange((e.target as HTMLSelectElement).value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} class="bg-paper text-ink">{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface ButtonProps {
  children: ComponentChildren;
  onClick?: (e: Event) => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'ghost',
  size = 'md',
  disabled,
  className = '',
  ariaLabel,
  title,
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-mono uppercase tracking-[0.14em] transition-all focus-visible:outline-2 focus-visible:outline-billiard focus-visible:outline-offset-2 disabled:opacity-30 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'text-[10px] px-2.5 py-1',
    md: 'text-[11px] px-3 py-1.5',
    lg: 'text-[12px] px-5 py-3',
  };
  const variants = {
    primary: 'bg-billiard text-paper hover:bg-billiard-deep shadow-[0_2px_0_0_var(--color-billiard-deep)] hover:shadow-[0_3px_0_0_var(--color-billiard-deep)] hover:-translate-y-px',
    ghost: 'border border-gold text-ink hover:border-billiard hover:text-billiard',
    quiet: 'text-ink-soft hover:text-billiard',
    danger: 'text-billiard-deep hover:text-ink',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      class={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}

interface PillProps {
  children: ComponentChildren;
  variant?: 'default' | 'active' | 'accent' | 'mute';
  className?: string;
  onClick?: (e: Event) => void;
  title?: string;
  ariaLabel?: string;
  type?: 'button';
}

export function Pill({ children, variant = 'default', className = '', onClick, title, ariaLabel, type = 'button' }: PillProps) {
  const variants = {
    default: 'border border-rule text-ink hover:border-billiard hover:text-billiard',
    active: 'border border-billiard bg-billiard text-paper',
    accent: 'border border-gold bg-gold/15 text-gold-deep',
    mute: 'border border-rule text-ink-mute',
  };
  const cls = `inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${variants[variant]} ${className}`;
  if (onClick) {
    return (
      <button type={type} onClick={onClick} class={cls} title={title} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }
  return <span class={cls} title={title} aria-label={ariaLabel}>{children}</span>;
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  return (
    <label class={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span class={`relative inline-block w-3.5 h-3.5 border ${checked ? 'border-billiard bg-billiard' : 'border-rule bg-paper'} transition-colors`}>
        {checked && (
          <svg viewBox="0 0 14 14" class="absolute inset-0 w-full h-full text-paper" aria-hidden="true">
            <path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        class="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</span>
    </label>
  );
}

interface IconButtonProps {
  onClick?: (e: Event) => void;
  ariaLabel: string;
  title?: string;
  children: ComponentChildren;
  disabled?: boolean;
  variant?: 'quiet' | 'danger';
  className?: string;
}

export function IconButton({ onClick, ariaLabel, title, children, disabled, variant = 'quiet', className = '' }: IconButtonProps) {
  const variants = {
    quiet: 'text-ink-soft hover:text-billiard',
    danger: 'text-ink-soft hover:text-billiard-deep',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      class={`inline-flex items-center justify-center w-7 h-7 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Hairline({ vertical = false }: { vertical?: boolean }) {
  if (vertical) return <div class="w-px self-stretch bg-rule" />;
  return <div class="h-px w-full bg-rule" />;
}

export function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div class="flex flex-col gap-1">
      <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</span>
      <span class="font-mono tabular text-[16px] text-ink">
        {value}
        {suffix && <span class="ml-1 text-ink-soft text-[12px]">{suffix}</span>}
      </span>
    </div>
  );
}
