import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, MapPin, Search } from 'lucide-react'
import type { ItineraryDay, Place, Trip } from '../lib/types'
import { useStore } from '../lib/store'
import { Field, Flag, Modal } from './ui'
import { Fox } from './Fox'
import { PACK_TEMPLATES } from '../lib/templates'
import { addDays, daysBetween, fmtDate, geocode, plural, todayISO, uid, type GeoResult } from '../lib/util'

export type WizardMode = 'plan' | 'now' | 'dream'

const STEPS = ['Where', 'When', 'Set up']

/** Three short steps to a trip that lands you on the Trail. */
export function TripWizard({ mode: initialMode = 'plan', onClose, onCreated }: { mode?: WizardMode; onClose: () => void; onCreated: (tripId: string) => void }) {
  const { data, update } = useStore()
  const today = todayISO()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<WizardMode>(initialMode)
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [picked, setPicked] = useState<GeoResult | Place | null>(null)
  const [start, setStart] = useState(initialMode === 'now' ? today : addDays(today, 14))
  const [end, setEnd] = useState(initialMode === 'now' ? addDays(today, 2) : addDays(today, 18))
  const [makeDays, setMakeDays] = useState(true)
  const [lists, setLists] = useState<Record<string, boolean>>({ Essentials: true })
  const [budget, setBudget] = useState('')
  const dirty = Boolean(title || destination || picked || q)

  const search = async () => {
    if (!q.trim()) return
    setBusy(true)
    setErr('')
    try {
      const all = await geocode(q.trim())
      // The lookup often returns the same spot twice (once with a postcode): keep one of each.
      const seen = new Set<string>()
      const r = all.filter(g => {
        const k = `${g.countryCode}|` + g.display.split(', ').filter(x => !/^\d[\d -]*$/.test(x)).join(', ')
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      setResults(r)
      if (r.length === 0) setErr(`No match for “${q.trim()}”. Tap Next to use it as typed, or add the state or country and try again.`)
    } catch {
      setResults([])
      setErr('Could not look that up without a connection. Tap Next to carry on; you can link a place later.')
    } finally {
      setBusy(false)
    }
  }

  /** One field does it all: picking a match fills the name and destination and moves on. */
  const pick = (g: GeoResult | Place) => {
    setPicked(g)
    setDestination([g.name, g.country].filter(Boolean).join(', '))
    setTitle(t => t || g.name)
    setResults(null)
    setErr('')
    setQ('')
    setStep(1)
  }

  const next = async () => {
    if (step === 0 && !picked && q.trim()) {
      // First tap looks the place up; a second tap carries on with the text as typed.
      if (results === null) return search()
      setDestination(q.trim())
      setTitle(t => t || q.trim())
    }
    setStep(s => s + 1)
  }

  const setModeAndDates = (m: WizardMode) => {
    setMode(m)
    if (m === 'now') {
      setStart(today)
      setEnd(addDays(today, 2))
    }
  }

  const nights = start && end ? Math.max(0, daysBetween(start, end)) : 0
  const canNext = step === 0 ? Boolean(picked || q.trim()) && !busy : step === 1 ? mode === 'dream' || (Boolean(start && end) && end >= start) : true

  const create = () => {
    const tripId = uid()
    update(d => {
      let places = d.places
      let placeId: string | undefined
      if (picked) {
        if ('id' in picked) placeId = picked.id
        else {
          const existing = d.places.find(p => Math.abs(p.lat - picked.lat) < 0.02 && Math.abs(p.lng - picked.lng) < 0.02)
          if (existing) placeId = existing.id
          else {
            const np: Place = {
              id: uid(),
              name: picked.name,
              country: picked.country,
              countryCode: picked.countryCode,
              lat: picked.lat,
              lng: picked.lng,
              status: mode === 'now' ? 'visited' : 'wishlist',
              rating: 0,
              notes: '',
              firstVisited: mode === 'now' ? start : undefined,
              createdAt: new Date().toISOString(),
            }
            placeId = np.id
            places = [...places, np]
          }
        }
      }
      const hasDates = mode !== 'dream' && start && end
      const days: ItineraryDay[] = hasDates && makeDays ? Array.from({ length: daysBetween(start, end) + 1 }, (_, i) => ({ id: uid(), date: addDays(start, i), title: '', items: [] })) : []
      const packing = Object.entries(mode === 'now' ? {} : lists)
        .filter(([, on]) => on)
        .flatMap(([name]) => PACK_TEMPLATES[name] ?? [])
        .map(text => ({ id: uid(), text, packed: false }))
      const trip: Trip = {
        id: tripId,
        title: title.trim() || destination.trim() || 'New trip',
        destination: destination.trim(),
        startDate: hasDates ? start : '',
        endDate: hasDates ? end : '',
        status: mode === 'dream' ? 'dreaming' : mode === 'now' ? 'booked' : 'planning',
        placeIds: placeId ? [placeId] : [],
        budget: Number(budget) || 0,
        currency: 'USD',
        expenses: [],
        itinerary: days,
        packing,
        bookings: [],
        ideas: [],
        notes: '',
        createdAt: new Date().toISOString(),
      }
      return { ...d, places, trips: [trip, ...d.trips] }
    })
    onCreated(tripId)
  }

  return (
    <Modal
      title={
        <span className="wizard-title">
          <Fox mood={step === 2 ? 'excited' : 'happy'} size={36} />
          {mode === 'now' ? 'Catch up on your trip' : mode === 'dream' ? 'Dream up a trip' : 'Plan a trip'}
        </span>
      }
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <span className="wizard-steps left">
            {STEPS.map((s, i) => (
              <span key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
                {i < step ? <Check size={12} /> : i + 1} {s}
              </span>
            ))}
          </span>
          {step > 0 && (
            <button type="button" className="btn" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft size={15} /> Back
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="btn primary" disabled={!canNext} onClick={() => void next()}>
              {busy ? 'Looking…' : 'Next'} <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={create}>
              <Check size={15} /> {mode === 'now' ? 'Open the trail' : 'Create trip'}
            </button>
          )}
        </>
      }
    >
      {step === 0 && (
        <div className="form">
          <Field label={mode === 'now' ? 'Where are you?' : 'Where are you going?'} hint={picked || results ? undefined : 'Type a place and tap Next. Scout looks it up so the map and the forecast work.'}>
            {picked ? (
              <div className="wizard-picked">
                <MapPin size={16} />
                <Flag cc={picked.countryCode} />
                <span className="wizard-picked-name">
                  <b>{picked.name}</b>
                  {picked.country ? <span className="muted">, {picked.country}</span> : null}
                </span>
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => {
                    setPicked(null)
                    setDestination('')
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="search-row">
                <Search size={18} className="search-row-ico" />
                <input
                  type="search"
                  autoFocus
                  enterKeyHint="search"
                  value={q}
                  onChange={e => {
                    setQ(e.target.value)
                    setResults(null)
                    setErr('')
                  }}
                  onKeyDown={e => e.key === 'Enter' && void next()}
                  placeholder="Mount Hood, Lisbon, Banff…"
                />
              </div>
            )}
          </Field>
          {err && <p className="muted small">{err}</p>}
          {results && results.length > 0 && (
            <>
              <p className="muted small">Pick the one you mean. Or tap Next to carry on with “{q.trim()}” as typed.</p>
              <div className="geo-results">
                {results.map((g, i) => (
                  <button type="button" key={i} onClick={() => pick(g)}>
                    <Flag cc={g.countryCode} /> <b>{g.name}</b>
                    <span className="d">{g.display}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {!picked && !results && data.places.length > 0 && (
            <Field label="Or one of your places">
              <div className="pills">
                {data.places.slice(0, 12).map(p => (
                  <button type="button" key={p.id} className="chip" onClick={() => pick(p)}>
                    <Flag cc={p.countryCode} /> {p.name}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="form">
          <Field label="Which is it?">
            <div className="radio-group">
              <label className={mode === 'plan' ? 'on' : ''}>
                <input type="radio" name="wmode" checked={mode === 'plan'} onChange={() => setModeAndDates('plan')} />
                Planning ahead
              </label>
              <label className={mode === 'now' ? 'on' : ''}>
                <input type="radio" name="wmode" checked={mode === 'now'} onChange={() => setModeAndDates('now')} />
                I'm on this trip right now
              </label>
              <label className={mode === 'dream' ? 'on' : ''}>
                <input type="radio" name="wmode" checked={mode === 'dream'} onChange={() => setModeAndDates('dream')} />
                Just dreaming, no dates yet
              </label>
            </div>
          </Field>
          {mode !== 'dream' && (
            <>
              <div className="row">
                <Field label={mode === 'now' ? 'When did it start?' : 'Start'}>
                  <input
                    type="date"
                    value={start}
                    onChange={e => {
                      setStart(e.target.value)
                      if (end < e.target.value) setEnd(e.target.value)
                    }}
                  />
                </Field>
                <Field label={mode === 'now' ? 'When are you back?' : 'End'}>
                  <input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} />
                </Field>
              </div>
              {mode === 'now' && (
                <div className="pills">
                  {[
                    ['Started today', 0],
                    ['Started yesterday', -1],
                    ['Started 2 days ago', -2],
                  ].map(([label, off]) => (
                    <button type="button" key={label} className={'chip' + (start === addDays(today, off as number) ? ' on' : '')} onClick={() => setStart(addDays(today, off as number))}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {start && end && end >= start && (
                <p className="muted small">
                  {plural(nights, 'night')}, {fmtDate(start, { year: undefined })} to {fmtDate(end)}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="form">
          <Field label="Trip name">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={destination || 'Two weeks in Portugal'} />
          </Field>
          {mode !== 'dream' && (
            <label className="check">
              <input type="checkbox" checked={makeDays} onChange={e => setMakeDays(e.target.checked)} />
              Make a day for each date ({plural(nights + 1, 'day')}) so I can fill in plans
            </label>
          )}
          {mode !== 'now' && (
            <Field label="Start the packing list with">
              <div className="radio-group">
                {Object.keys(PACK_TEMPLATES).map(name => (
                  <label key={name} className={lists[name] ? 'on' : ''}>
                    <input type="checkbox" checked={Boolean(lists[name])} onChange={e => setLists(l => ({ ...l, [name]: e.target.checked }))} />
                    {name}
                  </label>
                ))}
              </div>
            </Field>
          )}
          <Field label="Budget (optional)">
            <input type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" style={{ maxWidth: 200 }} />
          </Field>
          <p className="muted small">
            {mode === 'now'
              ? 'Next: the Trail. Check off today, log what you spend, and add photos as you go. Scout handles the dates.'
              : 'Next: the Trail. Drop ideas in, slot them into days, and watch the countdown.'}
          </p>
        </div>
      )}
    </Modal>
  )
}
