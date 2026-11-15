import { useEffect, useMemo, useState } from 'react'
import type { Booking, BookingKind, Expense, ItineraryDay, Memory, Page, Photo, Trip, TripIdea, TripStatus } from '../lib/types'
import { HandoffSheet } from './HomeGuide'
import { MiniMap } from '../components/MiniMap'
import confetti from 'canvas-confetti'
import { Slideshow } from '../components/Slideshow'
import { shareUrl } from '../lib/share'
import { Tracker } from '../components/Tracker'
import { TripWizard, type WizardMode } from '../components/TripWizard'
import { EXPENSE_CATS, PACK_TEMPLATES } from '../lib/templates'
import { Plus, Share2, Printer, Play, ArrowLeft, Pencil, Trash2, Compass, ExternalLink, MapPin, Wifi, KeyRound, Images } from 'lucide-react'

const party = () =>
  confetti({ particleCount: 160, spread: 75, startVelocity: 38, origin: { y: 0.65 }, colors: ['#15605d', '#2b8f85', '#d9734a', '#d9a441', '#fffcf7'] })
import { useStore } from '../lib/store'
import { Empty, Field, Modal, PageHeader, Pill, Progress, StatusChip } from '../components/ui'
import { addDays, daysBetween, daysUntil, fetchForecast, fmtDate, fmtMoney, fmtRange, hostOf, makePhoto, mapsUrl, plural, resizeImage, siteLabel, thumbOf, todayISO, uid, usesFahrenheit, weatherIcon, weekday, type ForecastDay } from '../lib/util'
import { Flag as FlagIcon } from '../components/ui'

/** Memories that belong to a trip: explicitly linked, or dated inside the trip. */
export function albumOf(trip: Trip, memories: Memory[]): Memory[] {
  return memories
    .filter(m => m.tripId === trip.id || (!m.tripId && trip.startDate && trip.endDate && m.date >= trip.startDate && m.date <= trip.endDate))
    .sort((a, b) => a.date.localeCompare(b.date))
}

const STATUS: Record<TripStatus, { label: string; tone: 'neutral' | 'teal' | 'accent' | 'gold' | 'green' }> = {
  dreaming: { label: 'Dreaming', tone: 'accent' },
  planning: { label: 'Planning', tone: 'gold' },
  booked: { label: 'Booked', tone: 'teal' },
  completed: { label: 'Completed', tone: 'green' },
}

const BOOKING_ICON: Record<BookingKind, string> = { flight: '✈️', stay: '🏨', train: '🚆', car: '🚗', activity: '🎟️', other: '📎' }


export function Trips({ focusId, clearFocus, go }: { focusId: string | null; clearFocus: () => void; go: (p: Page, id?: string) => void }) {
  const { data } = useStore()
  const [openId, setOpenId] = useState<string | null>(focusId && !focusId.startsWith('new') ? focusId : null)
  const [wizard, setWizard] = useState<WizardMode | null>(focusId === 'new:now' ? 'now' : focusId === 'new:plan' ? 'plan' : null)

  useEffect(() => {
    if (!focusId) return
    if (focusId.startsWith('new')) setWizard(focusId === 'new:now' ? 'now' : 'plan')
    else setOpenId(focusId)
    clearFocus()
  }, [focusId, clearFocus])

  const today = todayISO()
  const groups = useMemo(() => {
    const isPast = (t: Trip) => t.status === 'completed' || (!!t.endDate && t.endDate < today)
    const sorted = [...data.trips].sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'))
    return {
      upcoming: sorted.filter(t => !isPast(t) && t.status !== 'dreaming'),
      dreaming: sorted.filter(t => !isPast(t) && t.status === 'dreaming'),
      past: sorted.filter(isPast).reverse(),
    }
  }, [data.trips, today])

  const open = data.trips.find(t => t.id === openId)

  const coverFor = (t: Trip) => t.cover ?? albumOf(t, data.memories).find(m => m.photos[0])?.photos[0]
  // The trail lives at the top of this tab: the trip you are on, or the one leaving within a week.
  const live = data.trips
    .filter(t => t.status !== 'completed' && t.startDate && t.endDate && t.endDate >= today && daysUntil(t.startDate) <= 7)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]

  if (open) {
    return <TripDetail trip={open} onBack={() => setOpenId(null)} go={go} />
  }

  return (
    <div className="page">
      <PageHeader
        title="Trail"
        subtitle={data.trips.length ? `${plural(groups.upcoming.length, 'trip')} coming up · ${plural(groups.past.length, 'trip')} taken` : 'Plan the next one, remember the last one'}
        actions={
          <>
            {!data.trips.some(t => t.status !== 'completed' && t.startDate && t.endDate && t.startDate <= today && t.endDate >= today) && (
              <button type="button" className="btn" onClick={() => setWizard('now')}>
                <Compass size={16} /> I'm traveling now
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => setWizard('plan')}>
              <Plus size={16} /> Plan a trip
            </button>
          </>
        }
      />

      {data.trips.length === 0 ? (
        <Empty
          icon="🧳"
          title="Where to?"
          body="Three quick steps: where, when, and what to set up. Then the Trail takes over: a countdown before you go, and your day-by-day once you're there."
          action={
            <div className="row">
              <button type="button" className="btn primary" onClick={() => setWizard('plan')}>
                <Plus size={16} /> Plan a trip
              </button>
              <button type="button" className="btn" onClick={() => setWizard('now')}>
                <Compass size={16} /> I'm traveling right now
              </button>
            </div>
          }
        />
      ) : (
        <>
          {live && <Tracker trip={live} go={go} />}
          <TripGroup title="Coming up" trips={groups.upcoming} onOpen={setOpenId} coverFor={coverFor} />
          <TripGroup title="Dreaming about" trips={groups.dreaming} onOpen={setOpenId} variant="dream" coverFor={coverFor} />
          <TripGroup title="Past trips" trips={groups.past} onOpen={setOpenId} variant="past" coverFor={coverFor} />
        </>
      )}

      {wizard && (
        <TripWizard
          mode={wizard}
          onClose={() => setWizard(null)}
          onCreated={id => {
            setWizard(null)
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}

function TripGroup({ title, trips, onOpen, variant, coverFor }: { title: string; trips: Trip[]; onOpen: (id: string) => void; variant?: 'dream' | 'past'; coverFor: (t: Trip) => string | { thumb?: string; dataUrl: string } | undefined }) {
  if (trips.length === 0) return null
  return (
    <section className="trip-section">
      <h2>
        {title} <Pill>{trips.length}</Pill>
      </h2>
      <div className="grid">
        {trips.map(t => {
          const d = t.startDate ? daysUntil(t.startDate) : null
          const nights = t.startDate && t.endDate ? daysBetween(t.startDate, t.endDate) : null
          const cv = coverFor(t)
          const coverSrc = typeof cv === 'string' ? cv : cv ? (cv.thumb ?? cv.dataUrl) : undefined
          const label = variant === 'past' && t.status !== 'completed' ? 'Past' : STATUS[t.status].label
          return (
            <button type="button" key={t.id} className={'card trip-card ' + (variant ?? '')} onClick={() => onOpen(t.id)}>
              <div className="cover-wrap">
                {coverSrc ? <img className="cover" src={coverSrc} alt="" /> : <div className="no-cover">{variant === 'dream' ? '💭' : variant === 'past' ? '🏁' : '✈️'}</div>}
                <span className="chip-over">{label}</span>
                {variant !== 'past' && d !== null && d >= 0 && <span className="chip-over br dark">{d === 0 ? 'Today!' : `${d}d`}</span>}
              </div>
              <div className="body">
                <h3>{t.title}</h3>
                <div className="dest">{t.destination || 'Destination TBD'}</div>
                <div className="foot">
                  <span>{fmtRange(t.startDate, t.endDate)}</span>
                  {variant !== 'past' && d !== null && d >= 0 && <span>{d === 0 ? 'Today!' : `in ${plural(d, 'day')}`}</span>}
                  {nights !== null && variant === 'past' && <span>{plural(nights, 'night')}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TripForm({ initial, onClose, onSave }: { initial?: Trip; onClose: () => void; onSave: (t: Trip) => void }) {
  const { data } = useStore()
  const [t, setT] = useState<Trip>(
    () =>
      initial ?? {
        id: uid(),
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        status: 'planning',
        placeIds: [],
        budget: 0,
        currency: 'USD',
        expenses: [],
        itinerary: [],
        packing: [],
        bookings: [],
        ideas: [],
        notes: '',
        createdAt: new Date().toISOString(),
      },
  )
  const patch = (p: Partial<Trip>) => setT(x => ({ ...x, ...p }))
  const sitters = data.sitters.filter(s => s.role === 'housesitter' || s.role === 'petsitter' || s.trusted)

  const onCover = async (f: File | undefined) => {
    if (!f) return
    try {
      patch({ cover: await resizeImage(f, 1400, 0.8) })
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal
      title={initial ? 'Edit trip' : 'New trip'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!t.title.trim()} onClick={() => onSave({ ...t, title: t.title.trim() })}>
            {initial ? 'Save' : 'Create trip'}
          </button>
        </>
      }
    >
      <div className="form">
        <Field label="Trip name">
          <input type="text" autoFocus value={t.title} onChange={e => patch({ title: e.target.value })} placeholder="Two weeks in Portugal" />
        </Field>
        <Field label="Destination">
          <input type="text" value={t.destination} onChange={e => patch({ destination: e.target.value })} placeholder="Lisbon → Porto → Algarve" />
        </Field>
        <div className="row">
          <Field label="Start">
            <input type="date" value={t.startDate} onChange={e => patch({ startDate: e.target.value, endDate: t.endDate && t.endDate < e.target.value ? e.target.value : t.endDate })} />
          </Field>
          <Field label="End">
            <input type="date" value={t.endDate} min={t.startDate || undefined} onChange={e => patch({ endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Status">
          <div className="radio-group">
            {(Object.keys(STATUS) as TripStatus[]).map(s => (
              <label key={s} className={t.status === s ? 'on' : ''}>
                <input type="radio" name="tstatus" checked={t.status === s} onChange={() => patch({ status: s })} />
                {STATUS[s].label}
              </label>
            ))}
          </div>
        </Field>
        <div className="row">
          <Field label="Budget">
            <input type="number" min={0} value={t.budget || ''} onChange={e => patch({ budget: Number(e.target.value) || 0 })} placeholder="0" />
          </Field>
          <Field label="Currency">
            <input type="text" value={t.currency} maxLength={3} onChange={e => patch({ currency: e.target.value.toUpperCase() })} />
          </Field>
          {sitters.length > 0 && (
            <Field label="House / pet sitter">
              <select value={t.sitterId ?? ''} onChange={e => patch({ sitterId: e.target.value || undefined })}>
                <option value="">— none yet —</option>
                {sitters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Field label="Cover photo">
          <label className="cover-pick">
            <input type="file" accept="image/*" onChange={e => onCover(e.target.files?.[0])} />
            {t.cover ? <img src={t.cover} alt="" /> : <span>+ Choose a photo</span>}
            {t.cover && (
              <button
                type="button"
                className="btn sm rm"
                onClick={e => {
                  e.preventDefault()
                  patch({ cover: undefined })
                }}
              >
                Remove
              </button>
            )}
          </label>
        </Field>
        <Field label="Notes">
          <textarea rows={3} value={t.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Ideas, links, people to see, things not to forget…" />
        </Field>
      </div>
    </Modal>
  )
}

type Tab = 'trail' | 'overview' | 'itinerary' | 'ideas' | 'packing' | 'bookings' | 'budget' | 'album'

function TripDetail({ trip, onBack, go }: { trip: Trip; onBack: () => void; go: (p: Page, id?: string) => void }) {
  const { data, update } = useStore()
  const soon = trip.startDate && trip.endDate && trip.startDate <= addDays(todayISO(), 7) && trip.endDate >= todayISO()
  const [tab, setTab] = useState<Tab>(soon ? 'trail' : 'overview')
  const [editing, setEditing] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const album = albumOf(trip, data.memories)
  const linkedPlaces = trip.placeIds.map(id => data.places.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))

  const patch = (p: Partial<Trip>) => update(d => ({ ...d, trips: d.trips.map(t => (t.id === trip.id ? { ...t, ...p } : t)) }))

  const remove = () => {
    if (!confirm(`Delete "${trip.title}" and everything in it?`)) return
    update(d => ({ ...d, trips: d.trips.filter(t => t.id !== trip.id) }))
    onBack()
  }

  const sitter = data.sitters.find(s => s.id === trip.sitterId)
  const d = trip.startDate ? daysUntil(trip.startDate) : null
  const nights = trip.startDate && trip.endDate ? daysBetween(trip.startDate, trip.endDate) : null
  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0)
  const packed = trip.packing.filter(p => p.packed).length

  const isPast = trip.status === 'completed' || (!!trip.endDate && trip.endDate < todayISO())
  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: 'trail', label: '🏔️ Trail' },
    { id: 'overview', label: 'Overview' },
    { id: 'itinerary', label: 'Itinerary', n: trip.itinerary.reduce((s, day) => s + day.items.length, 0) },
    { id: 'ideas', label: 'Ideas', n: trip.ideas.filter(i => !i.scheduled).length },
    { id: 'packing', label: 'Packing', n: trip.packing.length },
    { id: 'bookings', label: 'Bookings', n: trip.bookings.length },
    { id: 'budget', label: 'Budget', n: trip.expenses.length },
    { id: 'album', label: 'Album', n: album.length },
  ]

  return (
    <div className="page">
      <div className="trip-detail-head">
        <button type="button" className="btn back" onClick={onBack}>
          <ArrowLeft size={16} /> Trips
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="pills" style={{ gap: 10 }}>
            <h1>{trip.title}</h1>
            <StatusChip status={isPast && trip.status !== 'completed' ? 'past' : trip.status} />
          </div>
          <p className="subtitle">
            {trip.destination || 'Destination TBD'} · {fmtRange(trip.startDate, trip.endDate)}
            {nights !== null && ` · ${plural(nights, 'night')}`}
            {d !== null && d > 0 && trip.status !== 'completed' && ` · in ${plural(d, 'day')}`}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => setSharing(true)}>
            <Share2 size={15} /> Share
          </button>
          <button type="button" className="btn" onClick={() => setPrinting(true)}>
            <Printer size={15} /> Print
          </button>
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit
          </button>
          <button type="button" className="btn danger" onClick={remove}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button type="button" key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.n ? <span className="n">{t.n}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="two-col">
          <div className="page" style={{ gap: 16 }}>
            {trip.cover && <img src={trip.cover} alt="" style={{ borderRadius: 14, maxHeight: 280, width: '100%', objectFit: 'cover' }} />}
            {linkedPlaces.length > 0 && <MiniMap points={linkedPlaces.map(p => ({ lat: p.lat, lng: p.lng, label: p.name }))} route={linkedPlaces.length > 1} />}
            <div className="card pad">
              <h3 style={{ marginBottom: 8 }}>Notes</h3>
              <textarea rows={6} value={trip.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Ideas, links, people to see, things not to forget…" />
            </div>
            <div className="card pad">
              <div className="card-head">
                <h3>Places on this trip</h3>
              </div>
              {data.places.length === 0 ? (
                <p className="muted small">Add places on the map, then link them here. They draw a route on the map and count as visited when the trip is done.</p>
              ) : (
                <>
                  {linkedPlaces.length > 0 && (
                    <div className="pills" style={{ marginBottom: 10 }}>
                      {linkedPlaces.map((p, i) => (
                        <span key={p.id} className="chip">
                          {linkedPlaces.length > 1 && <span className="muted">{i + 1}.</span>} <FlagIcon cc={p.countryCode} /> {p.name}
                          <button type="button" onClick={() => patch({ placeIds: trip.placeIds.filter(x => x !== p.id) })} aria-label={`Unlink ${p.name}`}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select value="" onChange={e => e.target.value && patch({ placeIds: [...trip.placeIds, e.target.value] })}>
                    <option value="">+ Link a place…</option>
                    {data.places
                      .filter(p => !trip.placeIds.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.country ? `, ${p.country}` : ''}
                        </option>
                      ))}
                  </select>
                  {linkedPlaces.length > 1 && <p className="hint" style={{ marginTop: 6 }}>Places are linked in travel order. Remove and re-add to reorder.</p>}
                </>
              )}
            </div>
          </div>
          <div className="page" style={{ gap: 16 }}>
            <div className="card pad">
              <h3 style={{ marginBottom: 10 }}>At a glance</h3>
              <dl className="kv">
                <dt>Dates</dt>
                <dd>{fmtRange(trip.startDate, trip.endDate)}</dd>
                <dt>Length</dt>
                <dd>{nights !== null ? `${plural(nights, 'night')}, ${plural(nights + 1, 'day')}` : '—'}</dd>
                <dt>Packing</dt>
                <dd>{trip.packing.length ? `${packed} of ${trip.packing.length} packed` : 'No list yet'}</dd>
                <dt>Bookings</dt>
                <dd>{trip.bookings.length ? plural(trip.bookings.length, 'confirmed item') : 'None logged'}</dd>
                <dt>Budget</dt>
                <dd>{trip.budget ? `${fmtMoney(spent, trip.currency)} of ${fmtMoney(trip.budget, trip.currency)}` : spent ? fmtMoney(spent, trip.currency) + ' spent' : 'Not set'}</dd>
              </dl>
            </div>
            <Weather trip={trip} />
            <div className="card pad">
              <h3 style={{ marginBottom: 10 }}>🔑 While you're away</h3>
              {sitter ? (
                <div>
                  <div style={{ fontWeight: 600 }}>{sitter.name}</div>
                  <div className="muted small">
                    {sitter.role}
                    {sitter.hasKey ? ' · has a key' : ''}
                  </div>
                  <div className="contact-row" style={{ marginTop: 10 }}>
                    {sitter.phone && (
                      <a className="btn sm" href={`tel:${sitter.phone}`}>
                        📞 Call
                      </a>
                    )}
                    {sitter.email && (
                      <a className="btn sm" href={`mailto:${sitter.email}`}>
                        ✉️ Email
                      </a>
                    )}
                    <button type="button" className="btn sm ghost" onClick={() => patch({ sitterId: undefined })}>
                      Unassign
                    </button>
                  </div>
                </div>
              ) : data.sitters.length === 0 ? (
                <p className="muted small">No sitters saved yet. Add trusted housesitters on the Sitters page, then assign one here.</p>
              ) : (
                <select value="" onChange={e => e.target.value && patch({ sitterId: e.target.value })}>
                  <option value="">Assign a sitter…</option>
                  {data.sitters.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => setHandoff(true)}>
                <Printer size={14} /> Handoff sheet for the sitter
              </button>
            </div>
            {trip.status !== 'completed' && (
              <div className="card pad">
                <h3 style={{ marginBottom: 6 }}>Back home?</h3>
                <p className="muted small" style={{ marginBottom: 10 }}>Marking the trip complete moves it to past trips and marks linked places as visited.</p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    party()
                    patch({ status: 'completed' })
                    if (trip.placeIds.length) {
                      update(d => ({ ...d, places: d.places.map(p => (trip.placeIds.includes(p.id) ? { ...p, status: 'visited', firstVisited: p.firstVisited ?? trip.startDate ?? undefined } : p)) }))
                    }
                    if (sitter && trip.startDate && trip.endDate && !sitter.stints.some(s => s.tripId === trip.id)) {
                      update(d => ({
                        ...d,
                        sitters: d.sitters.map(s => (s.id === sitter.id ? { ...s, stints: [...s.stints, { id: uid(), from: trip.startDate, to: trip.endDate, tripId: trip.id, notes: '' }] } : s)),
                      }))
                    }
                  }}
                >
                  Mark trip completed
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'trail' && <Tracker trip={trip} go={go} onTab={setTab} />}
      {tab === 'itinerary' && <Itinerary trip={trip} patch={patch} />}
      {tab === 'packing' && <Packing trip={trip} patch={patch} />}
      {tab === 'bookings' && <Bookings trip={trip} patch={patch} />}
      {tab === 'ideas' && <Ideas trip={trip} patch={patch} />}
      {tab === 'budget' && <Budget trip={trip} patch={patch} />}
      {tab === 'album' && <Album trip={trip} memories={album} go={go} />}

      {handoff && <HandoffSheet trip={trip} onClose={() => setHandoff(false)} />}
      {printing && <ItinerarySheet trip={trip} onClose={() => setPrinting(false)} />}
      {sharing && (
        <Modal
          title="Share this plan"
          onClose={() => setSharing(false)}
          footer={
            <button type="button" className="btn" onClick={() => setSharing(false)}>
              Done
            </button>
          }
        >
          <p className="muted small" style={{ marginBottom: 10 }}>
            The whole plan is packed into this link, so it works without any account or server. Photos and the sitter are left out. Anyone with the link can save a copy into their own TravelBud.
          </p>
          <div className="share-box">
            <input type="text" readOnly value={shareUrl(trip)} onFocus={e => e.currentTarget.select()} />
            <button
              type="button"
              className="btn primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl(trip))
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  /* clipboard unavailable */
                }
              }}
            >
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>Link length: about {Math.round(shareUrl(trip).length / 100) / 10}k characters. Messaging apps handle that fine.</p>
        </Modal>
      )}

      {editing && (
        <TripForm
          initial={trip}
          onClose={() => setEditing(false)}
          onSave={t => {
            patch(t)
            setEditing(false)
          }}
        />
      )}
    </div>
  )
}

type SectionProps = { trip: Trip; patch: (p: Partial<Trip>) => void }

function Itinerary({ trip, patch }: SectionProps) {
  const [drafts, setDrafts] = useState<Record<string, { time: string; text: string }>>({})

  const generateDays = () => {
    if (!trip.startDate || !trip.endDate) return
    const n = daysBetween(trip.startDate, trip.endDate) + 1
    const have = new Set(trip.itinerary.map(d => d.date))
    const days: ItineraryDay[] = [...trip.itinerary]
    for (let i = 0; i < n; i++) {
      const date = addDays(trip.startDate, i)
      if (!have.has(date)) days.push({ id: uid(), date, title: '', items: [] })
    }
    patch({ itinerary: days.sort((a, b) => a.date.localeCompare(b.date)) })
  }

  const addDay = () => {
    const last = trip.itinerary[trip.itinerary.length - 1]
    const date = last ? addDays(last.date, 1) : trip.startDate || todayISO()
    patch({ itinerary: [...trip.itinerary, { id: uid(), date, title: '', items: [] }] })
  }

  const updateDay = (id: string, p: Partial<ItineraryDay>) => patch({ itinerary: trip.itinerary.map(d => (d.id === id ? { ...d, ...p } : d)) })
  const removeDay = (id: string) => {
    const day = trip.itinerary.find(d => d.id === id)
    if (day && day.items.length && !confirm('Remove this day and its plans?')) return
    patch({ itinerary: trip.itinerary.filter(d => d.id !== id) })
  }

  const addItem = (day: ItineraryDay) => {
    const dr = drafts[day.id]
    if (!dr?.text.trim()) return
    const items = [...day.items, { id: uid(), time: dr.time, text: dr.text.trim(), done: false }].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'))
    updateDay(day.id, { items })
    setDrafts(x => ({ ...x, [day.id]: { time: '', text: '' } }))
  }

  if (trip.itinerary.length === 0) {
    return (
      <Empty
        icon="📅"
        title="No days planned yet"
        body={trip.startDate && trip.endDate ? 'Generate one card per day of the trip, then jot down what you want to do each day.' : 'Set start and end dates to generate a day-by-day plan, or add days one at a time.'}
        action={
          <div className="row">
            {trip.startDate && trip.endDate && (
              <button type="button" className="btn primary" onClick={generateDays}>
                Generate {plural(daysBetween(trip.startDate, trip.endDate) + 1, 'day')}
              </button>
            )}
            <button type="button" className="btn" onClick={addDay}>
              + Add a day
            </button>
          </div>
        }
      />
    )
  }

  return (
    <div className="page" style={{ gap: 12 }}>
      <div className="toolbar">
        <button type="button" className="btn sm" onClick={addDay}>
          + Add day
        </button>
        {trip.startDate && trip.endDate && trip.itinerary.length < daysBetween(trip.startDate, trip.endDate) + 1 && (
          <button type="button" className="btn sm ghost" onClick={generateDays}>
            Fill in missing days
          </button>
        )}
      </div>
      {trip.itinerary.map((day, i) => (
        <div className="card day" key={day.id}>
          <div className="day-head">
            <span className="d">Day {i + 1}</span>
            <span className="wd">
              {weekday(day.date)}, {fmtDate(day.date, { year: undefined })}
            </span>
            <input type="text" value={day.title} onChange={e => updateDay(day.id, { title: e.target.value })} placeholder="Theme for the day…" />
            <button type="button" className="icon-btn danger" aria-label="Remove day" onClick={() => removeDay(day.id)}>
              🗑
            </button>
          </div>
          <div className="checklist">
            {day.items.map(it => (
              <div className={'check-item' + (it.done ? ' done' : '')} key={it.id}>
                <input type="checkbox" checked={it.done} onChange={e => updateDay(day.id, { items: day.items.map(x => (x.id === it.id ? { ...x, done: e.target.checked } : x)) })} />
                <span className="time">{it.time}</span>
                <span className="txt">{it.text}</span>
                <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => updateDay(day.id, { items: day.items.filter(x => x.id !== it.id) })}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="add-row" style={{ marginTop: 6 }}>
            <input type="time" value={drafts[day.id]?.time ?? ''} onChange={e => setDrafts(x => ({ ...x, [day.id]: { time: e.target.value, text: x[day.id]?.text ?? '' } }))} />
            <input
              type="text"
              value={drafts[day.id]?.text ?? ''}
              onChange={e => setDrafts(x => ({ ...x, [day.id]: { time: x[day.id]?.time ?? '', text: e.target.value } }))}
              onKeyDown={e => e.key === 'Enter' && addItem(day)}
              placeholder="Add a plan — museum, dinner reservation, train to…"
            />
            <button type="button" className="btn sm" onClick={() => addItem(day)} disabled={!drafts[day.id]?.text.trim()}>
              Add
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Packing({ trip, patch }: SectionProps) {
  const [text, setText] = useState('')
  const packed = trip.packing.filter(p => p.packed).length

  const add = (items: string[]) => {
    const have = new Set(trip.packing.map(p => p.text.toLowerCase()))
    const fresh = items.map(s => s.trim()).filter(s => s && !have.has(s.toLowerCase()))
    if (fresh.length) patch({ packing: [...trip.packing, ...fresh.map(t => ({ id: uid(), text: t, packed: false }))] })
  }

  return (
    <div className="two-col">
      <div className="card pad packing">
        <div className="card-head">
          <h3>
            Packing list{' '}
            {trip.packing.length > 0 && (
              <span className="muted small">
                {packed}/{trip.packing.length}
              </span>
            )}
          </h3>
          {trip.packing.length > 0 && packed > 0 && (
            <button type="button" className="btn sm ghost" onClick={() => patch({ packing: trip.packing.map(p => ({ ...p, packed: false })) })}>
              Reset
            </button>
          )}
        </div>
        {trip.packing.length > 0 && <Progress value={packed} max={trip.packing.length} />}
        <div className="checklist" style={{ marginTop: 10 }}>
          {trip.packing.map(p => (
            <div className={'check-item' + (p.packed ? ' done' : '')} key={p.id}>
              <input
                type="checkbox"
                checked={p.packed}
                onChange={e => {
                  const next = trip.packing.map(x => (x.id === p.id ? { ...x, packed: e.target.checked } : x))
                  if (e.target.checked && next.every(x => x.packed)) party()
                  patch({ packing: next })
                }}
              />
              <span className="txt">{p.text}</span>
              <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => patch({ packing: trip.packing.filter(x => x.id !== p.id) })}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="add-row" style={{ marginTop: 10 }}>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                add(text.split(','))
                setText('')
              }
            }}
            placeholder="Add an item (comma-separate several)"
          />
          <button
            type="button"
            className="btn sm"
            disabled={!text.trim()}
            onClick={() => {
              add(text.split(','))
              setText('')
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div className="card pad">
        <h3 style={{ marginBottom: 6 }}>Quick lists</h3>
        <p className="muted small" style={{ marginBottom: 10 }}>Add a whole set at once. Items you already have are skipped.</p>
        <div className="templates">
          {Object.entries(PACK_TEMPLATES).map(([name, items]) => (
            <button type="button" key={name} className="btn sm" onClick={() => add(items)}>
              + {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Bookings({ trip, patch }: SectionProps) {
  const blank = (): Booking => ({ id: uid(), kind: 'flight', title: '', confirmation: '', date: trip.startDate || '', notes: '' })
  const [b, setB] = useState<Booking>(blank)
  const [open, setOpen] = useState(trip.bookings.length === 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isStay = b.kind === 'stay'

  const save = () => {
    if (!b.title.trim()) return
    const next: Booking = { ...b, title: b.title.trim(), url: b.url?.trim() || undefined }
    const list = editingId ? trip.bookings.map(x => (x.id === editingId ? next : x)) : [...trip.bookings, next]
    patch({ bookings: list.sort((x, y) => (x.date || '9999').localeCompare(y.date || '9999')) })
    setB(blank())
    setEditingId(null)
    setOpen(false)
  }
  const edit = (bk: Booking) => {
    setB(bk)
    setEditingId(bk.id)
    setOpen(true)
  }
  const cancel = () => {
    setB(blank())
    setEditingId(null)
    setOpen(false)
  }
  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setBusy(true)
    const out: Photo[] = []
    for (const f of Array.from(files)) {
      try {
        out.push(await makePhoto(f))
      } catch {
        /* skip unreadable */
      }
    }
    setB(x => ({ ...x, photos: [...(x.photos ?? []), ...out] }))
    setBusy(false)
  }

  return (
    <div className="page" style={{ gap: 12 }}>
      {trip.bookings.length === 0 && !open && <Empty icon="🎟️" title="No bookings logged" />}
      {trip.bookings.map(bk => (
        <div className={'card booking' + (bk.kind === 'stay' ? ' stay' : '')} key={bk.id}>
          <span className="ico">{BOOKING_ICON[bk.kind]}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{bk.title}</div>
            <div className="muted small">
              {bk.date && fmtDate(bk.date)}
              {bk.confirmation && (
                <>
                  {bk.date && ' · '}
                  Conf. <span className="conf">{bk.confirmation}</span>
                </>
              )}
            </div>
            {bk.kind === 'stay' && (
              <>
                <div className="pills" style={{ marginTop: 8 }}>
                  {bk.url && (
                    <a className="btn sm" href={bk.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} /> Open on {siteLabel(bk.url)}
                    </a>
                  )}
                  {bk.address && (
                    <a className="btn sm" href={mapsUrl(bk.address)} target="_blank" rel="noreferrer">
                      <MapPin size={13} /> Directions
                    </a>
                  )}
                </div>
                {bk.address && <div className="small" style={{ marginTop: 6 }}>{bk.address}</div>}
                {(bk.wifi || bk.access || bk.host) && (
                  <div className="stay-codes" style={{ marginTop: 6 }}>
                    {bk.wifi && (
                      <span>
                        <Wifi size={13} /> {bk.wifi}
                      </span>
                    )}
                    {bk.access && (
                      <span>
                        <KeyRound size={13} /> {bk.access}
                      </span>
                    )}
                    {bk.host && <span>Host: {bk.host}</span>}
                  </div>
                )}
                {bk.photos && bk.photos.length > 0 && (
                  <div className="stay-photos" style={{ marginTop: 8 }}>
                    {bk.photos.map(p => (
                      <img key={p.id} src={thumbOf(p)} alt="" loading="lazy" />
                    ))}
                  </div>
                )}
              </>
            )}
            {bk.notes && <div className="small" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{bk.notes}</div>}
          </div>
          <div className="actions" style={{ display: 'flex' }}>
            <button type="button" className="icon-btn" aria-label="Edit" onClick={() => edit(bk)}>
              <Pencil size={15} />
            </button>
            <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => patch({ bookings: trip.bookings.filter(x => x.id !== bk.id) })}>
              ✕
            </button>
          </div>
        </div>
      ))}
      {open ? (
        <div className="card pad form">
          <h3>{editingId ? 'Edit booking' : 'Add a booking'}</h3>
          <div className="row">
            <Field label="Type">
              <select value={b.kind} onChange={e => setB({ ...b, kind: e.target.value as BookingKind })}>
                {(Object.keys(BOOKING_ICON) as BookingKind[]).map(k => (
                  <option key={k} value={k}>
                    {BOOKING_ICON[k]} {k[0].toUpperCase() + k.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={isStay ? 'Place name' : 'What'} grow>
              <input type="text" autoFocus value={b.title} onChange={e => setB({ ...b, title: e.target.value })} placeholder={isStay ? 'Cabin by the lake' : 'UA 1234 SFO → LIS…'} />
            </Field>
          </div>
          {isStay && (
            <>
              <Field label="Listing or reservation link" hint="Airbnb, Vrbo, the hotel site. Listing photos can't be pulled in automatically, so add your own or screenshots below.">
                <input type="text" value={b.url ?? ''} onChange={e => setB({ ...b, url: e.target.value })} placeholder="https://www.airbnb.com/rooms/…" />
              </Field>
              <Field label="Address">
                <input type="text" value={b.address ?? ''} onChange={e => setB({ ...b, address: e.target.value })} placeholder="Street, town" />
              </Field>
              <div className="row">
                <Field label="Wi-Fi">
                  <input type="text" value={b.wifi ?? ''} onChange={e => setB({ ...b, wifi: e.target.value })} placeholder="Network / password" />
                </Field>
                <Field label="Getting in">
                  <input type="text" value={b.access ?? ''} onChange={e => setB({ ...b, access: e.target.value })} placeholder="Door code 4471, lockbox by the gate" />
                </Field>
                <Field label="Host">
                  <input type="text" value={b.host ?? ''} onChange={e => setB({ ...b, host: e.target.value })} placeholder="Name · phone" />
                </Field>
              </div>
              <Field label="Photos of the place">
                <div className="photo-grid">
                  {(b.photos ?? []).map(ph => (
                    <div className="ph" key={ph.id}>
                      <img src={thumbOf(ph)} alt="" />
                      <button type="button" onClick={() => setB(x => ({ ...x, photos: (x.photos ?? []).filter(p => p.id !== ph.id) }))} aria-label="Remove photo">
                        ✕
                      </button>
                    </div>
                  ))}
                  <label className="add">
                    <input type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} disabled={busy} />
                    <span>{busy ? '…' : '+ Add'}</span>
                  </label>
                </div>
              </Field>
            </>
          )}
          <div className="row">
            <Field label="Confirmation #">
              <input type="text" value={b.confirmation} onChange={e => setB({ ...b, confirmation: e.target.value })} />
            </Field>
            <Field label={isStay ? 'Check-in' : 'Date'}>
              <input type="date" value={b.date} onChange={e => setB({ ...b, date: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={2} value={b.notes} onChange={e => setB({ ...b, notes: e.target.value })} placeholder={isStay ? 'Check-out time, parking, house rules…' : 'Check-in time, seat numbers, cancellation policy…'} />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" style={{ flex: 'none' }} onClick={cancel}>
              Cancel
            </button>
            <button type="button" className="btn primary" style={{ flex: 'none' }} disabled={!b.title.trim() || busy} onClick={save}>
              {editingId ? 'Save changes' : 'Add booking'}
            </button>
          </div>
        </div>
      ) : (
        <div className="pills">
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            <Plus size={15} /> Add booking
          </button>
          {!trip.bookings.some(x => x.kind === 'stay') && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setB({ ...blank(), kind: 'stay' })
                setOpen(true)
              }}
            >
              <Images size={15} /> Add your stay
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Budget({ trip, patch }: SectionProps) {
  const [e, setE] = useState<{ label: string; amount: string; category: string }>({ label: '', amount: '', category: EXPENSE_CATS[0] })
  const spent = trip.expenses.reduce((s, x) => s + x.amount, 0)
  const left = trip.budget - spent
  const byCat = EXPENSE_CATS.map(c => ({ c, total: trip.expenses.filter(x => x.category === c).reduce((s, x) => s + x.amount, 0) })).filter(x => x.total > 0)

  const add = () => {
    const amount = Number(e.amount)
    if (!e.label.trim() || !Number.isFinite(amount) || amount <= 0) return
    const ex: Expense = { id: uid(), label: e.label.trim(), amount, category: e.category }
    patch({ expenses: [...trip.expenses, ex] })
    setE({ label: '', amount: '', category: e.category })
  }

  return (
    <div className="two-col">
      <div className="page" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="budget-big">
            <div>
              <div className="num">{fmtMoney(spent, trip.currency)}</div>
              <div className="lbl">spent</div>
            </div>
            {trip.budget > 0 && (
              <>
                <div>
                  <div className="num">{fmtMoney(trip.budget, trip.currency)}</div>
                  <div className="lbl">budget</div>
                </div>
                <div>
                  <div className="num" style={{ color: left < 0 ? 'var(--danger)' : 'var(--green)' }}>
                    {left < 0 ? '−' : ''}
                    {fmtMoney(Math.abs(left), trip.currency)}
                  </div>
                  <div className="lbl">{left < 0 ? 'over' : 'left'}</div>
                </div>
              </>
            )}
          </div>
          {trip.budget > 0 && (
            <div style={{ marginTop: 14 }}>
              <Progress value={spent} max={trip.budget} tone={spent > trip.budget ? 'danger' : spent > trip.budget * 0.85 ? 'accent' : 'teal'} />
            </div>
          )}
          <div className="row" style={{ marginTop: 14, alignItems: 'flex-end' }}>
            <Field label="Budget">
              <input type="number" min={0} value={trip.budget || ''} onChange={ev => patch({ budget: Number(ev.target.value) || 0 })} placeholder="Set a budget" />
            </Field>
            <Field label="Currency">
              <input type="text" maxLength={3} value={trip.currency} onChange={ev => patch({ currency: ev.target.value.toUpperCase() })} />
            </Field>
          </div>
        </div>

        <div className="card pad">
          <h3 style={{ marginBottom: 10 }}>Expenses</h3>
          {trip.expenses.length > 0 && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {trip.expenses.map(x => (
                  <tr key={x.id}>
                    <td>{x.label}</td>
                    <td className="muted">{x.category}</td>
                    <td className="num">{fmtMoney(x.amount, trip.currency)}</td>
                    <td style={{ width: 36 }}>
                      <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => patch({ expenses: trip.expenses.filter(y => y.id !== x.id) })}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <Field label="What" grow>
              <input type="text" value={e.label} onChange={ev => setE({ ...e, label: ev.target.value })} onKeyDown={ev => ev.key === 'Enter' && add()} placeholder="Dinner at…" />
            </Field>
            <Field label="Amount">
              <input type="number" min={0} step="0.01" value={e.amount} onChange={ev => setE({ ...e, amount: ev.target.value })} onKeyDown={ev => ev.key === 'Enter' && add()} />
            </Field>
            <Field label="Category">
              <select value={e.category} onChange={ev => setE({ ...e, category: ev.target.value })}>
                {EXPENSE_CATS.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <button type="button" className="btn primary" style={{ flex: 'none', height: 40 }} onClick={add} disabled={!e.label.trim() || !(Number(e.amount) > 0)}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ marginBottom: 10 }}>By category</h3>
        {byCat.length === 0 ? (
          <p className="muted small">Log expenses and they will break down here.</p>
        ) : (
          <div className="page" style={{ gap: 10 }}>
            {byCat
              .sort((a, b) => b.total - a.total)
              .map(x => (
                <div key={x.c}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                    <span>{x.c}</span>
                    <span style={{ textAlign: 'right' }}>
                      {fmtMoney(x.total, trip.currency)} <span className="muted">· {Math.round((x.total / spent) * 100)}%</span>
                    </span>
                  </div>
                  <Progress value={x.total} max={spent} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Ideas({ trip, patch }: SectionProps) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [target, setTarget] = useState<Record<string, string>>({})

  const add = () => {
    if (!text.trim() && !url.trim()) return
    const idea: TripIdea = { id: uid(), text: text.trim() || hostOf(url.trim()), url: url.trim(), scheduled: false }
    patch({ ideas: [...trip.ideas, idea] })
    setText('')
    setUrl('')
  }

  const schedule = (idea: TripIdea) => {
    const dayId = target[idea.id]
    const day = trip.itinerary.find(d => d.id === dayId)
    if (!day) return
    patch({
      itinerary: trip.itinerary.map(d => (d.id === dayId ? { ...d, items: [...d.items, { id: uid(), time: '', text: idea.text, done: false }] } : d)),
      ideas: trip.ideas.map(i => (i.id === idea.id ? { ...i, scheduled: true } : i)),
    })
  }

  const open = trip.ideas.filter(i => !i.scheduled)
  const done = trip.ideas.filter(i => i.scheduled)

  return (
    <div className="two-col">
      <div className="page" style={{ gap: 12 }}>
        <div className="card pad form" style={{ gap: 10 }}>
          <h3>Drop an idea</h3>
          <p className="muted small">Restaurants, viewpoints, a friend's tip, a link you want to remember. Once the itinerary has days, slot ideas into them from here.</p>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <Field label="Idea" grow>
              <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Ramen at Ichiran, sunset at the bamboo grove…" />
            </Field>
            <Field label="Link (optional)" grow>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="https://" />
            </Field>
            <button type="button" className="btn primary" style={{ flex: 'none', height: 40 }} disabled={!text.trim() && !url.trim()} onClick={add}>
              Add
            </button>
          </div>
        </div>
        {open.length === 0 && done.length === 0 && <Empty icon="💡" title="No ideas yet" />}
        {open.map(i => (
          <div className="card idea" key={i.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{i.text}</div>
              {i.url && (
                <a className="small" href={i.url} target="_blank" rel="noreferrer">
                  {hostOf(i.url)} ↗
                </a>
              )}
            </div>
            {trip.itinerary.length > 0 && (
              <div className="add-row">
                <select value={target[i.id] ?? ''} onChange={e => setTarget(t => ({ ...t, [i.id]: e.target.value }))} style={{ width: 'auto' }}>
                  <option value="">Add to day…</option>
                  {trip.itinerary.map((d, idx) => (
                    <option key={d.id} value={d.id}>
                      Day {idx + 1} · {fmtDate(d.date, { year: undefined })}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn sm" disabled={!target[i.id]} onClick={() => schedule(i)}>
                  Schedule
                </button>
              </div>
            )}
            <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => patch({ ideas: trip.ideas.filter(x => x.id !== i.id) })}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="card pad">
        <h3 style={{ marginBottom: 8 }}>Scheduled</h3>
        {done.length === 0 ? (
          <p className="muted small">Ideas you have slotted into a day show up here.</p>
        ) : (
          <div className="checklist">
            {done.map(i => (
              <div className="check-item done" key={i.id}>
                <span className="txt">{i.text}</span>
                <button type="button" className="icon-btn" aria-label="Unschedule" title="Back to ideas" onClick={() => patch({ ideas: trip.ideas.map(x => (x.id === i.id ? { ...x, scheduled: false } : x)) })}>
                  ↩
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Weather({ trip }: { trip: Trip }) {
  const { data } = useStore()
  const place = data.places.find(p => trip.placeIds.includes(p.id))
  const [days, setDays] = useState<ForecastDay[] | null>(null)
  const [err, setErr] = useState('')
  const today = todayISO()
  const horizon = addDays(today, 15)
  const inWindow = Boolean(trip.startDate && trip.endDate && trip.startDate <= horizon && trip.endDate >= today)
  const lat = place?.lat
  const lng = place?.lng

  useEffect(() => {
    if (!inWindow || lat === undefined || lng === undefined) return
    let cancelled = false
    fetchForecast(lat, lng)
      .then(d => {
        if (!cancelled) setDays(d)
      })
      .catch(() => {
        if (!cancelled) setErr('Forecast unavailable right now.')
      })
    return () => {
      cancelled = true
    }
  }, [inWindow, lat, lng])

  if (!place) {
    return (
      <div className="card pad">
        <h3 style={{ marginBottom: 6 }}>🌤️ Weather</h3>
        <p className="muted small">Link a place to this trip (Overview → Places on this trip) to see the forecast here in the two weeks before you leave.</p>
      </div>
    )
  }
  if (!inWindow) {
    return (
      <div className="card pad">
        <h3 style={{ marginBottom: 6 }}>🌤️ Weather in {place.name}</h3>
        <p className="muted small">{trip.startDate ? `The forecast appears here about two weeks before ${fmtDate(trip.startDate)}.` : 'Set trip dates to get a forecast.'}</p>
      </div>
    )
  }
  const shown = (days ?? []).filter(d => d.date >= trip.startDate && d.date <= trip.endDate)
  const unit = usesFahrenheit() ? '°F' : '°C'
  return (
    <div className="card pad">
      <h3 style={{ marginBottom: 8 }}>🌤️ Weather in {place.name}</h3>
      {err && <p className="muted small">{err}</p>}
      {!err && !days && <p className="muted small">Loading forecast…</p>}
      {days && shown.length === 0 && <p className="muted small">No forecast days fall inside the trip yet.</p>}
      {shown.length > 0 && (
        <div className="weather-strip">
          {shown.map(d => {
            const w = weatherIcon(d.code)
            return (
              <div className="wx" key={d.date} title={w.label}>
                <div className="wd">{weekday(d.date)}</div>
                <div className="ico">{w.icon}</div>
                <div className="hi">{d.hi}°</div>
                <div className="lo">{d.lo}°</div>
                {d.rain >= 30 && <div className="rain">💧{d.rain}%</div>}
              </div>
            )
          })}
        </div>
      )}
      {shown.length > 0 && <p className="muted small" style={{ marginTop: 8 }}>Highs and lows in {unit}. Forecast by Open-Meteo.</p>}
    </div>
  )
}

function Album({ trip, memories, go }: { trip: Trip; memories: Memory[]; go: (p: Page, id?: string) => void }) {
  const photos = memories.flatMap(m => m.photos.map(p => ({ p, m })))
  const [playing, setPlaying] = useState(false)
  if (memories.length === 0) {
    return (
      <Empty
        icon="📷"
        title="No memories on this trip yet"
        body={trip.startDate ? `Memories dated between ${fmtDate(trip.startDate)} and ${fmtDate(trip.endDate)}, or linked to this trip, collect here automatically.` : 'Set trip dates, and memories from those days collect here automatically.'}
        action={
          <button type="button" className="btn primary" onClick={() => go('memories')}>
            Add a memory
          </button>
        }
      />
    )
  }
  return (
    <div className="page" style={{ gap: 16 }}>
      {photos.length > 0 && (
        <div className="toolbar">
          <button type="button" className="btn primary" onClick={() => setPlaying(true)}>
            <Play size={15} /> Replay the trip
          </button>
          <span className="muted small">{plural(photos.length, 'photo')} across {plural(memories.length, 'memory', 'memories')}</span>
        </div>
      )}
      {playing && <Slideshow slides={photos.map(({ p, m }) => ({ src: p.dataUrl, title: m.title, sub: [fmtDate(m.date), m.locationText].filter(Boolean).join(' · ') }))} onClose={() => setPlaying(false)} />}
      {photos.length > 0 && (
        <div className="mosaic">
          {photos.slice(0, 30).map(({ p, m }, i) => (
            <button type="button" key={p.id} className={'mosaic-tile' + (i % 7 === 0 ? ' big' : '')} onClick={() => go('memories', m.id)} title={m.title}>
              <img src={thumbOf(p)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="grid">
        {memories.map(m => (
          <button type="button" key={m.id} className="card memory-card" onClick={() => go('memories', m.id)}>
            <div className="cover-wrap">
              {m.photos[0] ? <img className="cover" src={thumbOf(m.photos[0])} alt="" loading="lazy" /> : <div className="no-cover">📝</div>}
              <span className="chip-over">{fmtDate(m.date, { year: undefined })}</span>
            </div>
            <div className="body">
              <h3>{m.title}</h3>
              {m.locationText && <div className="meta">{m.locationText}</div>}
              {m.body && <p className="excerpt">{m.body}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Printable itinerary: days, bookings, budget, sitter. */
function ItinerarySheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { data } = useStore()
  const sitter = data.sitters.find(s => s.id === trip.sitterId)
  const places = trip.placeIds.map(id => data.places.find(p => p.id === id)?.name).filter(Boolean)
  return (
    <Modal
      wide
      title="Print itinerary"
      onClose={onClose}
      footer={
        <>
          <span className="muted small left">One clean page per few days. Good for the seat-back pocket.</span>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn primary" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </>
      }
    >
      <div className="print-sheet">
        <header>
          <h1>{trip.title}</h1>
          <p>
            {trip.destination}
            {places.length ? ` · ${places.join(' → ')}` : ''} · {fmtRange(trip.startDate, trip.endDate)}
          </p>
        </header>

        {trip.bookings.length > 0 && (
          <section>
            <h2>Bookings</h2>
            <table>
              <tbody>
                {trip.bookings.map(b => (
                  <tr key={b.id}>
                    <th>
                      {BOOKING_ICON[b.kind]} {b.date ? fmtDate(b.date, { year: undefined }) : ''}
                    </th>
                    <td>
                      {b.title}
                      {b.confirmation && <span className="conf"> · conf. {b.confirmation}</span>}
                      {b.notes && <div className="muted small">{b.notes}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {trip.itinerary.length > 0 && (
          <section>
            <h2>Day by day</h2>
            {trip.itinerary.map((d, i) => (
              <div className="pet" key={d.id}>
                <h3>
                  Day {i + 1} · {weekday(d.date)}, {fmtDate(d.date, { year: undefined })}
                  {d.title ? <span> · {d.title}</span> : null}
                </h3>
                {d.items.length === 0 ? (
                  <p className="muted small">Open day</p>
                ) : (
                  <ul>
                    {d.items.map(it => (
                      <li key={it.id}>
                        {it.time ? `${it.time} · ` : ''}
                        {it.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {(sitter || trip.budget > 0 || data.contacts.length > 0) && (
          <section>
            <h2>Good to know</h2>
            <table>
              <tbody>
                {sitter && (
                  <tr>
                    <th>House</th>
                    <td>
                      {sitter.name}
                      {sitter.phone ? ` · ${sitter.phone}` : ''}
                    </td>
                  </tr>
                )}
                {trip.budget > 0 && (
                  <tr>
                    <th>Budget</th>
                    <td>{fmtMoney(trip.budget, trip.currency)}</td>
                  </tr>
                )}
                {data.contacts.slice(0, 3).map(c => (
                  <tr key={c.id}>
                    <th>{c.name}</th>
                    <td>{[c.relation, c.phone].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {trip.notes && (
          <section>
            <h2>Notes</h2>
            <p className="quirks">{trip.notes}</p>
          </section>
        )}
      </div>
    </Modal>
  )
}
