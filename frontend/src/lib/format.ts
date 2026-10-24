import type { Service } from './catalog'

export function money(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars.toLocaleString('en-US')}` : `$${dollars.toFixed(2)}`
}

export function duration(minutes: number): string {
  return `${minutes} min`
}

export function fromPrice(s: Service): string {
  return money(Math.min(...s.options.map((o) => o.price_cents)))
}

/** "2026-10-25" -> Date at local noon (avoids the UTC-midnight off-by-one). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function longDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** "14:30" -> "2:30 PM" */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
