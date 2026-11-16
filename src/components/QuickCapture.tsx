import { useState } from 'react'
import { Camera, Images, PencilLine } from 'lucide-react'
import type { Memory, Photo } from '../lib/types'
import { useStore } from '../lib/store'
import { Modal } from './ui'
import { Fox } from './Fox'
import { daysBetween, fmtDate, isHeic, makePhoto, plural, readExif, reverseGeocode, thumbOf, todayISO, uid } from '../lib/util'

const touchDevice = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Two taps on the trail: photos, one line, done. Date, trip and place come from the picture and from the trip you are on.
    "Add details" saves the same memory and opens it, for the full form. */
export function QuickCapture({ tripId, onClose, onOpen }: { tripId?: string; onClose: () => void; onOpen: (memoryId: string) => void }) {
  const { data, update } = useStore()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [line, setLine] = useState('')
  const [date, setDate] = useState(todayISO())
  const [geo, setGeo] = useState<{ lat: number; lng: number; text?: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [skipped, setSkipped] = useState(0)

  const trip = data.trips.find(t => t.id === tripId) ?? data.trips.find(t => t.startDate && t.endDate && t.startDate <= date && t.endDate >= date)
  const nearest = geo
    ? data.places.map(p => ({ p, km: kmBetween(geo.lat, geo.lng, p.lat, p.lng) })).sort((a, b) => a.km - b.km).find(x => x.km < 25)?.p
    : trip
      ? data.places.find(p => trip.placeIds.includes(p.id))
      : undefined

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    const out: Photo[] = []
    let bad = 0
    let firstGeo: { lat: number; lng: number } | null = null
    let firstDate: string | undefined
    for (let i = 0; i < list.length; i++) {
      setBusy(`Processing ${i + 1} of ${list.length}…`)
      try {
        const [photo, exif] = await Promise.all([makePhoto(list[i]), readExif(list[i])])
        out.push(photo)
        if (!firstDate && exif.date) firstDate = exif.date
        if (!firstGeo && exif.lat !== undefined && exif.lng !== undefined) firstGeo = { lat: exif.lat, lng: exif.lng }
      } catch {
        bad += isHeic(list[i]) ? 1 : 1
      }
    }
    setBusy('')
    setPhotos(p => [...p, ...out])
    if (bad) setSkipped(s => s + bad)
    if (firstDate && photos.length === 0) setDate(firstDate)
    if (firstGeo && !geo) {
      setGeo(firstGeo)
      const g = await reverseGeocode(firstGeo.lat, firstGeo.lng).catch(() => null)
      if (g) setGeo(x => (x ? { ...x, text: [g.name, g.country].filter(Boolean).join(', ') } : x))
    }
  }

  const build = (): Memory => {
    const inTrip = Boolean(trip && trip.startDate && date >= trip.startDate && date <= trip.endDate)
    const day = trip && inTrip ? daysBetween(trip.startDate, date) + 1 : 0
    const fallback = trip && inTrip ? `Day ${day} · ${trip.destination || trip.title}` : trip ? trip.title : nearest ? `A moment in ${nearest.name}` : `Moment on ${fmtDate(date)}`
    return {
      id: uid(),
      title: line.trim() || fallback,
      date,
      tripId: trip?.id,
      placeId: nearest?.id,
      lat: geo?.lat,
      lng: geo?.lng,
      locationText: geo?.text ?? (nearest ? [nearest.name, nearest.country].filter(Boolean).join(', ') : ''),
      body: '',
      photos,
      people: [],
      tags: [],
      favorite: false,
      createdAt: new Date().toISOString(),
    }
  }
  const save = (thenOpen: boolean) => {
    const m = build()
    update(d => ({ ...d, memories: [m, ...d.memories] }))
    if (thenOpen) onOpen(m.id)
    else onClose()
  }
  const canSave = !busy && (photos.length > 0 || line.trim().length > 0)
  const context = [trip ? trip.title : null, nearest ? nearest.name : geo?.text ?? null, fmtDate(date)].filter(Boolean).join(' · ')

  return (
    <Modal
      title="Capture a moment"
      onClose={onClose}
      dirty={photos.length > 0 || line.length > 0}
      footer={
        <>
          <button type="button" className="btn" disabled={!canSave} onClick={() => save(true)}>
            <PencilLine size={15} /> Add details
          </button>
          <button type="button" className="btn primary" disabled={!canSave} onClick={() => save(false)}>
            {busy || 'Save'}
          </button>
        </>
      }
    >
      <div className="qc">
        {photos.length === 0 ? (
          <div className="qc-pick">
            {touchDevice && (
              <label className="btn primary qc-big">
                <input type="file" accept="image/*" capture="environment" onChange={e => addFiles(e.target.files)} disabled={Boolean(busy)} />
                <Camera size={22} /> Take a photo
              </label>
            )}
            <label className={'btn qc-big' + (touchDevice ? '' : ' primary')}>
              <input type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files)} disabled={Boolean(busy)} />
              <Images size={22} /> Choose photos
            </label>
          </div>
        ) : (
          <div className="qc-strip">
            {photos.map(p => (
              <img key={p.id} src={thumbOf(p)} alt="" />
            ))}
            <label className="qc-more">
              <input type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files)} disabled={Boolean(busy)} />
              +
            </label>
          </div>
        )}
        {busy && <p className="muted small">{busy}</p>}
        {skipped > 0 && <p className="muted small">{plural(skipped, 'photo')} skipped: this browser cannot read that format (HEIC, usually). Export as JPEG and try again.</p>}
        <input className="qc-line" type="text" value={line} onChange={e => setLine(e.target.value)} placeholder="One line about it (optional)" maxLength={120} autoFocus={!touchDevice} />
        <div className="qc-context">
          <Fox mood="happy" variant="head" size={34} />
          <span className="muted small">{context ? `Filed under ${context}.` : 'Date and place fill in from the photo.'}</span>
        </div>
      </div>
    </Modal>
  )
}
