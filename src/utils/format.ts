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