import { createStore, delMany, getMany, setMany } from 'idb-keyval'
import type { AppData, Photo } from './types'

/* Photos live in their own IndexedDB store, one record per photo, keyed by photo id.
   The main record only keeps each photo's id and caption, so saving a note or ticking a
   packing item no longer rewrites every picture you have ever added. In memory, photos
   are still complete `Photo` objects: the split happens only on the way to and from disk. */

const store = createStore('travelbud-photos', 'photos')

export interface StoredPhoto {
  dataUrl: string
  thumb?: string
}

const isLean = (p: Photo) => !p.dataUrl

/** Every photo in the data set, wherever it hangs. */
export function allPhotos(d: AppData): Photo[] {
  const out: Photo[] = []
  for (const m of d.memories) out.push(...m.photos)
  for (const t of d.trips) for (const b of t.bookings) if (b.photos) out.push(...b.photos)
  return out
}

const mapPhotos = (d: AppData, fn: (p: Photo) => Photo): AppData => ({
  ...d,
  memories: d.memories.map(m => ({ ...m, photos: m.photos.map(fn) })),
  trips: d.trips.map(t => ({ ...t, bookings: t.bookings.map(b => (b.photos ? { ...b, photos: b.photos.map(fn) } : b)) })),
})

/** The data set with every photo reduced to its id and caption, for the main record. */
export const stripPhotos = (d: AppData): AppData => mapPhotos(d, p => ({ id: p.id, dataUrl: '', ...(p.caption ? { caption: p.caption } : {}) }))

/** Put the pictures back into a lean data set. Photos that were never split (older saves) pass through untouched. */
export async function hydratePhotos(d: AppData): Promise<{ data: AppData; stored: Set<string> }> {
  const lean = allPhotos(d).filter(isLean)
  const stored = new Set<string>()
  if (lean.length === 0) return { data: d, stored }
  const ids = Array.from(new Set(lean.map(p => p.id)))
  const rows = await getMany<StoredPhoto | undefined>(ids, store)
  const byId = new Map<string, StoredPhoto>()
  rows.forEach((r, i) => {
    if (r) {
      byId.set(ids[i], r)
      stored.add(ids[i])
    }
  })
  const data = mapPhotos(d, p => {
    if (!isLean(p)) return p
    const r = byId.get(p.id)
    return r ? { ...p, dataUrl: r.dataUrl, thumb: r.thumb } : p
  })
  return { data, stored }
}

/** Write photos that are new since the last save and drop the ones that are gone. Returns the ids now on disk. */
export async function persistPhotos(d: AppData, known: Set<string>): Promise<Set<string>> {
  const current = new Map<string, Photo>()
  for (const p of allPhotos(d)) if (!isLean(p)) current.set(p.id, p)
  const fresh = Array.from(current.values()).filter(p => !known.has(p.id))
  const gone = Array.from(known).filter(id => !current.has(id))
  if (fresh.length) await setMany(fresh.map(p => [p.id, { dataUrl: p.dataUrl, thumb: p.thumb } satisfies StoredPhoto]), store)
  if (gone.length) await delMany(gone, store)
  return new Set(current.keys())
}
