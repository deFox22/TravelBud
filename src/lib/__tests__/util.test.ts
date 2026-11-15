import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, plural } from '../util'

describe('date math', () => {
  it('daysBetween counts whole days', () => {
    expect(daysBetween('2026-11-13', '2026-11-16')).toBe(3)
    expect(daysBetween('2026-11-16', '2026-11-13')).toBe(-3)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
  })
  it('addDays rolls over months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-11-13', 183)).toBe('2027-05-15')
  })
  it('daysBetween ignores daylight-saving shifts', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})

describe('plural', () => {
  it('uses the given forms', () => {
    expect(plural(1, 'day')).toBe('1 day')
    expect(plural(2, 'day')).toBe('2 days')
    expect(plural(0, 'memory', 'memories')).toBe('0 memories')
  })
})
