import { addDays, clock, money, parseISODate, toISODate } from '../lib/format'

describe('format', () => {
  it('formats money without trailing cents for whole dollars', () => {
    expect(money(12000)).toBe('$120')
    expect(money(1380)).toBe('$13.80')
    expect(money(38000)).toBe('$380')
  })

  it('formats 24h clock as 12h', () => {
    expect(clock('00:30')).toBe('12:30 AM')
    expect(clock('12:00')).toBe('12:00 PM')
    expect(clock('21:30')).toBe('9:30 PM')
  })

  it('does date arithmetic on local calendar days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    // across the US DST change (Nov 1 2026) a day is still a day
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(toISODate(parseISODate('2026-02-28'))).toBe('2026-02-28')
  })
})
