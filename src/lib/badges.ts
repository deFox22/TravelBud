import type { AppData, Memory, Place, Trip } from './types'
import { daysBetween, todayISO } from './util'

/* Collectibles. Every badge is computed from the data you already keep, so nothing
   needs to be "tracked" separately. Tiers follow the kit: copper (common) → silver → gold → black nickel (legendary). */

export type Tier = 'copper' | 'silver' | 'gold' | 'black'
export type LockedShape = 'shield' | 'circle' | 'hex' | 'star'

export interface BadgeDef {
  id: string
  name: string
  how: string
  tier: Tier
  art: string
  locked: LockedShape
  progress: (d: AppData) => { have: number; need: number }
}

export const TIER_LABEL: Record<Tier, string> = {
  copper: 'Copper · common',
  silver: 'Silver · uncommon',
  gold: 'Gold · rare',
  black: 'Black nickel · legendary',
}

const art = (file: string) => `brand/badges/${file}`

export function completedTrips(d: AppData): Trip[] {
  const today = todayISO()
  return d.trips.filter(t => t.startDate && t.endDate && (t.status === 'completed' || t.endDate < today))
}

export const nightsAway = (d: AppData): number => completedTrips(d).reduce((n, t) => n + Math.max(0, daysBetween(t.startDate, t.endDate)), 0)

export const visitedPlaces = (d: AppData): Place[] => d.places.filter(p => p.status === 'visited')

/** Longest run of consecutive days that have at least one memory. */
export function longestStreak(memories: Memory[]): number {
  const days = Array.from(new Set(memories.map(m => m.date))).sort()
  let best = 0
  let run = 0
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

function haversineKm(a: Place, b: Place): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Kilometres between consecutive linked places across completed trips. */
export function trailKm(d: AppData): number {
  let km = 0
  for (const t of completedTrips(d)) {
    const pts = t.placeIds.map(id => d.places.find(p => p.id === id)).filter((p): p is Place => Boolean(p))
    for (let i = 0; i < pts.length - 1; i++) km += haversineKm(pts[i], pts[i + 1])
  }
  return Math.round(km)
}

const mentions = (d: AppData, words: string[]) =>
  d.memories.some(m => {
    const hay = [m.title, ...m.tags, m.body].join(' ').toLowerCase()
    return words.some(w => hay.includes(w))
  })

export const BADGES: BadgeDef[] = [
  { id: 'first-summit', name: 'First summit', how: 'Complete your first trip.', tier: 'silver', art: art('badge-summit-silver-enamel.svg'), locked: 'circle', progress: d => ({ have: Math.min(1, completedTrips(d).length), need: 1 }) },
  { id: 'nights-5', name: '5 nights under the stars', how: 'Spend five nights away, across any trips.', tier: 'gold', art: art('badge-nights-gold-enamel.svg'), locked: 'shield', progress: d => ({ have: Math.min(5, nightsAway(d)), need: 5 }) },
  { id: 'peak-10', name: 'Peak bagger', how: 'Visit ten places.', tier: 'silver', art: art('badge-half-dome-silver-enamel.svg'), locked: 'hex', progress: d => ({ have: Math.min(10, visitedPlaces(d).length), need: 10 }) },
  { id: 'trail-100', name: '100 km on the trail', how: 'Cover 100 km between the places on your completed trips.', tier: 'copper', art: art('badge-boot-copper-patch.svg'), locked: 'circle', progress: d => ({ have: Math.min(100, trailKm(d)), need: 100 }) },
  { id: 'streak-7', name: '7-day streak', how: 'Keep a memory on seven days in a row.', tier: 'gold', art: art('badge-streak-gold-enamel.svg'), locked: 'circle', progress: d => ({ have: Math.min(7, longestStreak(d.memories)), need: 7 }) },
  { id: 'waterfall', name: 'Chased a waterfall', how: 'Keep a memory tagged waterfall or falls.', tier: 'silver', art: art('badge-falls-silver-patch.svg'), locked: 'hex', progress: d => ({ have: mentions(d, ['waterfall', 'falls', 'cascade']) ? 1 : 0, need: 1 }) },
  { id: 'trails-10', name: '10 trails', how: 'Complete ten trips.', tier: 'silver', art: art('badge-trails-silver-patch.svg'), locked: 'shield', progress: d => ({ have: Math.min(10, completedTrips(d).length), need: 10 }) },
  { id: 'aurora', name: 'Northern lights', how: 'Keep a memory tagged aurora or northern lights.', tier: 'black', art: art('badge-aurora-black-enamel.svg'), locked: 'star', progress: d => ({ have: mentions(d, ['aurora', 'northern lights']) ? 1 : 0, need: 1 }) },
  {
    id: 'ranger',
    name: 'Ranger',
    how: 'Earn every other badge.',
    tier: 'gold',
    art: art('patch-ranger-scout.svg'),
    locked: 'circle',
    progress: d => {
      const others = BADGES.filter(b => b.id !== 'ranger')
      const have = others.filter(b => {
        const p = b.progress(d)
        return p.have >= p.need
      }).length
      return { have, need: others.length }
    },
  },
]

export const isEarned = (b: BadgeDef, d: AppData): boolean => {
  const p = b.progress(d)
  return p.have >= p.need
}

export const earnedIds = (d: AppData): string[] => BADGES.filter(b => isEarned(b, d)).map(b => b.id)

export const lockedArt = (shape: LockedShape) => `brand/badges/badge-locked-${shape}.svg`
