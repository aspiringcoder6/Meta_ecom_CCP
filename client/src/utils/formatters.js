export function formatAudience(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(value)
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'Chưa thiết lập'
  return `${new Intl.NumberFormat('en-US').format(value)} ₫`
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}
