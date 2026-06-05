export function formatCop(value: number | string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString())
  }
  return 0
}
