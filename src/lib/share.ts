import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Trip } from './types'

interface Envelope {
  v: 1
  trip: Omit<Trip, 'cover'>
}

/** A trip packed into a URL fragment: no server, no photos, just the plan. */
export function encodeTrip(t: Trip): string {
  const { cover: _cover, ...rest } = t
  void _cover
  const env: Envelope = { v: 1, trip: rest }
  return compressToEncodedURIComponent(JSON.stringify(env))
}

export function decodeTrip(code: string): Trip | null {
  try {
    const raw = decompressFromEncodedURIComponent(code)
    if (!raw) return null
    const env = JSON.parse(raw) as Partial<Envelope>
    if (env.v !== 1 || !env.trip || typeof env.trip.title !== 'string') return null
    const t = env.trip as Partial<Trip>
    return { ideas: [], expenses: [], itinerary: [], packing: [], bookings: [], placeIds: [], budget: 0, currency: 'USD', notes: '', ...t } as Trip
  } catch {
    return null
  }
}

export const shareUrl = (t: Trip): string => `${location.origin}${location.pathname}#share=${encodeTrip(t)}`

export function readShareFromUrl(): Trip | null {
  const m = location.hash.match(/^#share=(.+)$/)
  return m ? decodeTrip(m[1]) : null
}

export function clearShareFromUrl() {
  history.replaceState(null, '', location.pathname + location.search)
}
