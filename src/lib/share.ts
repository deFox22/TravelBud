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

/* ---------- moving everything to another device ----------
   The whole data set, minus pictures, packed into a link. Open it on the other device and
   TravelBud offers to import it. Small enough to text, email or show as a QR code. */

import type { AppData } from './types'

interface TransferEnvelope {
  v: 1
  kind: 'transfer'
  data: AppData
}

export const wordsOnly = (d: AppData): AppData => ({
  ...d,
  memories: d.memories.map(m => ({ ...m, photos: m.photos.map(p => ({ id: p.id, dataUrl: '', ...(p.caption ? { caption: p.caption } : {}) })) })),
  trips: d.trips.map(t => ({ ...t, cover: undefined, bookings: t.bookings.map(b => ({ ...b, photos: undefined })) })),
})

export const encodeTransfer = (d: AppData): string => compressToEncodedURIComponent(JSON.stringify({ v: 1, kind: 'transfer', data: wordsOnly(d) } satisfies TransferEnvelope))

export function decodeTransfer(code: string): AppData | null {
  try {
    const raw = decompressFromEncodedURIComponent(code)
    if (!raw) return null
    const env = JSON.parse(raw) as Partial<TransferEnvelope>
    if (env.v !== 1 || env.kind !== 'transfer' || !env.data || !Array.isArray(env.data.trips)) return null
    // Photos were left behind on purpose: drop the empty shells so nothing shows a broken picture.
    const d = env.data
    return { ...d, memories: d.memories.map(m => ({ ...m, photos: [] })) }
  } catch {
    return null
  }
}

export const transferUrl = (d: AppData): string => `${location.origin}${location.pathname}#import=${encodeTransfer(d)}`

export function readTransferFromUrl(): AppData | null {
  const m = location.hash.match(/^#import=(.+)$/)
  return m ? decodeTransfer(m[1]) : null
}
