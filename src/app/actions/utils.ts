/**
 * Utilities for server actions form parsing and currency processing
 */

export function parseCurrency(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val
  if (!val || typeof val !== 'string') return fallback
  const parsed = parseFloat(val.replace(/[^\d,-]/g, '').replace(',', '.'))
  return isNaN(parsed) ? fallback : parsed
}

export function parseNullableCurrency(val: unknown): number | null {
  if (!val || typeof val !== 'string') return null
  const parsed = parseFloat(val.replace(/[^\d,-]/g, '').replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

export function parseBoolean(val: unknown): boolean {
  return val === 'true' || val === 'on' || val === true
}
