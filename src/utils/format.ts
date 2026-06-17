export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatRatio(count: number, total: number): string {
  if (total === 0) return '0';
  return formatPercent(count / total);
}

export function formatSweepRange(values: number[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return String(values[0]);
  const isContiguousAscending = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
  if (isContiguousAscending) return `${values[0]}..${values[values.length - 1]}`;
  if (values.length <= 5) return `{${values.join(', ')}}`;
  return `{${values.slice(0, 5).join(', ')}, \u2026}`;
}

export function formatRange([lo, hi]: [number, number], decimals = 2): string {
  return `${(lo * 100).toFixed(decimals)}% – ${(hi * 100).toFixed(decimals)}%`;
}

export function formatDelta(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value * 100).toFixed(decimals)}%`;
}