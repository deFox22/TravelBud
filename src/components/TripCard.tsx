import { useEffect, useState } from 'react'
import { Footprints, Map as MapIcon } from 'lucide-react'
import type { Page, Place, Trip } from '../lib/types'
import { useStore } from '../lib/store'
import { StatusChip } from './ui'
import { daysBetween, daysUntil, fetchLocalNow, fmtRange, plural, todayISO, weatherIcon, type LocalNow } from '../lib/util'

/** The trip card on Home (kit "soft card"): an illustrated header, status chip, where and when, and the way in. */
export function TripCard({ trip, go }: { trip: Trip; go: (p: Page, id?: string) => void }) {
  const { data } = useStore()
  const today = todayISO()
  const active = trip.startDate <= today && trip.endDate >= today
  const n = daysBetween(trip.startDate, trip.endDate) + 1
  const day = daysBetween(trip.startDate, today) + 1
  const place = data.places.find(p => trip.placeIds.includes(p.id))
  const todayPlan = trip.itinerary.find(d => d.date === today)
  const overline = active ? `${(trip.destination || trip.title).toUpperCase()} · DAY ${day} OF ${n}` : `${(trip.destination || trip.title).toUpperCase()} · ${fmtRange(trip.startDate, trip.endDate).toUpperCase()}`
  const headline = active ? todayPlan?.title || `Day ${day} on the trail` : daysUntil(trip.startDate) === 0 ? 'Leaving today' : `${plural(daysUntil(trip.startDate), 'day')} to go`
  return (
    <section className="trip-card-home card">
      {trip.cover ? (
        <img className="tch-cover" src={trip.cover} alt="" />
      ) : (
        <svg className="tch-art" viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <rect width="400" height="130" fill="var(--tb-sky)" />
          <circle cx="330" cy="38" r="18" fill="var(--tb-sun)" />
          <path d="M0 110 L90 48 L150 88 L220 30 L290 86 L350 62 L400 92 L400 130 L0 130 Z" fill="var(--tb-sage)" />
          <path d="M0 120 L60 92 L130 112 L200 80 L270 110 L340 90 L400 108 L400 130 L0 130 Z" fill="var(--tb-forest-2)" />
          <path d="M214 36 L220 30 L226 36 Z" fill="#fff" />
        </svg>
      )}
      <StatusChip status={trip.status} className="tch-chip" />
      <div className="tch-body">
        <p className="eyebrow">{overline}</p>
        <h2>{active ? headline : trip.title}</h2>
        {!active && <p className="muted">{headline}</p>}
        {active && place && <DestinationNow place={place} />}
        <div className="tch-actions">
          <button type="button" className="btn primary" onClick={() => go('trips', trip.id)}>
            <Footprints size={18} /> {active ? "Start today's trail" : 'Open the trail'}
          </button>
          {place && (
            <button type="button" className="btn" onClick={() => go('places', place.id)}>
              <MapIcon size={18} /> Map
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/** Live clock and current weather at the destination. */
export function DestinationNow({ place }: { place: Place }) {
  const [now, setNow] = useState<LocalNow | null>(null)
  const [, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    fetchLocalNow(place.lat, place.lng)
      .then(x => {
        if (!cancelled) setNow(x)
      })
      .catch(() => {})
    const t = setInterval(() => setTick(x => x + 1), 30_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [place.lat, place.lng])
  if (!now) return null
  let time = ''
  try {
    time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: now.timezone }).format(new Date())
  } catch {
    return null
  }
  const w = weatherIcon(now.code)
  return (
    <p className="muted small">
      {time} in {place.name} · {w.icon} {now.temp}° now
    </p>
  )
}
