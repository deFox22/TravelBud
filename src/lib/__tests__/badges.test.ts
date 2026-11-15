import { describe, expect, it } from 'vitest'
import { BADGES, earnedIds, isEarned, longestStreak, nightsAway, trailKm } from '../badges'
import { emptyData } from '../store'
import type { AppData, Memory, Place, Trip } from '../types'

const place = (id: string, lat: number, lng: number, status: Place['status'] = 'visited'): Place => ({ id, name: id, country: 'X', countryCode: 'xx', lat, lng, status, rating: 0, notes: '', createdAt: '' })
const memory = (date: string, tags: string[] = [], title = 'm'): Memory => ({ id: date + title, title, date, locationText: '', body: '', photos: [], people: [], tags, favorite: false, createdAt: '' })
const trip = (start: string, end: string, placeIds: string[] = [], status: Trip['status'] = 'completed'): Trip => ({
  id: start,
  title: 't',
  destination: '',
  startDate: start,
  endDate: end,
  status,
  placeIds,
  budget: 0,
  currency: 'USD',
  expenses: [],
  itinerary: [],
  packing: [],
  bookings: [],
  ideas: [],
  notes: '',
  createdAt: '',
})
const data = (patch: Partial<AppData>): AppData => ({ ...emptyData(), ...patch })

describe('longestStreak', () => {
  it('is 0 with no memories', () => expect(longestStreak([])).toBe(0))
  it('counts consecutive days once each', () => {
    const mems = ['2026-01-01', '2026-01-02', '2026-01-02', '2026-01-03', '2026-01-05', '2026-01-06'].map(d => memory(d))
    expect(longestStreak(mems)).toBe(3)
  })
  it('crosses a month boundary', () => {
    expect(longestStreak(['2026-01-30', '2026-01-31', '2026-02-01'].map(d => memory(d)))).toBe(3)
  })
})

describe('nightsAway and trailKm', () => {
  it('sums nights across completed trips only', () => {
    const d = data({ trips: [trip('2025-05-01', '2025-05-04'), trip('2099-01-01', '2099-01-10', [], 'booked')] })
    expect(nightsAway(d)).toBe(3)
  })
  it('measures distance between consecutive linked places', () => {
    const d = data({ places: [place('a', 0, 0), place('b', 0, 1)], trips: [trip('2025-05-01', '2025-05-04', ['a', 'b'])] })
    expect(trailKm(d)).toBeGreaterThan(110)
    expect(trailKm(d)).toBeLessThan(112)
  })
})

describe('badge rules', () => {
  const byId = (id: string) => BADGES.find(b => b.id === id)!
  it('first summit needs one completed trip', () => {
    expect(isEarned(byId('first-summit'), data({}))).toBe(false)
    expect(isEarned(byId('first-summit'), data({ trips: [trip('2025-05-01', '2025-05-02')] }))).toBe(true)
  })
  it('a past end date counts as completed even if the status was never flipped', () => {
    expect(isEarned(byId('first-summit'), data({ trips: [trip('2025-05-01', '2025-05-02', [], 'booked')] }))).toBe(true)
  })
  it('waterfall matches tags, titles and body text', () => {
    expect(isEarned(byId('waterfall'), data({ memories: [memory('2025-01-01', ['Waterfall'])] }))).toBe(true)
    expect(isEarned(byId('waterfall'), data({ memories: [memory('2025-01-01', [], 'Multnomah Falls')] }))).toBe(true)
    expect(isEarned(byId('waterfall'), data({ memories: [memory('2025-01-01', ['lake'])] }))).toBe(false)
  })
  it('ranger needs every other badge', () => {
    const r = byId('ranger')
    expect(r.progress(data({})).need).toBe(BADGES.length - 1)
    expect(isEarned(r, data({}))).toBe(false)
  })
  it('earnedIds is empty on a fresh install', () => expect(earnedIds(data({}))).toEqual([]))
  it('every badge has unique id and art', () => {
    expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length)
    expect(new Set(BADGES.map(b => b.art)).size).toBe(BADGES.length)
  })
})
