import { useEffect, useMemo, useState } from 'react'
import { Camera, CircleDollarSign, ListChecks, Pencil, Plus, StickyNote, ExternalLink, MapPin, Wifi, KeyRound, Images, BedDouble } from 'lucide-react'
import type { Page, Photo, Trip } from '../lib/types'
import { useStore } from '../lib/store'
import { Fox } from './Fox'
import { Progress, Ring } from './ui'
import { EXPENSE_CATS } from '../lib/templates'
import { addDays, daysBetween, daysUntil, fetchForecast, fmtDate, fmtMoney, makePhoto, mapsUrl, plural, siteLabel, thumbOf, todayISO, uid, usesFahrenheit, weatherIcon, weekday, type ForecastDay } from '../lib/util'

/** The trail: a winding path up a mountain with one waypoint per trip day. Points are roughly evenly spaced. */
const TRAIL: [number, number][] = [
  [70, 292],
  [150, 262],
  [225, 272],
  [300, 228],
  [375, 236],
  [450, 190],
  [525, 196],
  [600, 150],
  [670, 154],
  [735, 110],
  [795, 112],
  [850, 70],
]

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`
  }
  return d
}

/** Position along the trail at fraction t of its length. */
function along(t: number): [number, number] {
  const segs: number[] = []
  let total = 0
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const L = Math.hypot(TRAIL[i + 1][0] - TRAIL[i][0], TRAIL[i + 1][1] - TRAIL[i][1])
    segs.push(L)
    total += L
  }
  let target = Math.min(1, Math.max(0, t)) * total
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const f = segs[i] === 0 ? 0 : target / segs[i]
      return [TRAIL[i][0] + (TRAIL[i + 1][0] - TRAIL[i][0]) * f, TRAIL[i][1] + (TRAIL[i + 1][1] - TRAIL[i][1]) * f]
    }
    target -= segs[i]
  }
  return TRAIL[TRAIL.length - 1]
}

export function Tracker({ trip, go, onTab }: { trip: Trip; go: (p: Page, id?: string) => void; onTab?: (tab: 'itinerary' | 'packing' | 'budget') => void }) {
  const { data, update } = useStore()
  const today = todayISO()
  const hasDates = Boolean(trip.startDate && trip.endDate)
  const n = hasDates ? daysBetween(trip.startDate, trip.endDate) + 1 : 0
  const dayIdx = hasDates ? daysBetween(trip.startDate, today) : -1
  const phase: 'before' | 'during' | 'after' = !hasDates || dayIdx < 0 ? 'before' : dayIdx >= n ? 'after' : 'during'
  const [sel, setSel] = useState<number>(phase === 'during' ? dayIdx : 0)
  useEffect(() => setSel(phase === 'during' ? dayIdx : 0), [phase, dayIdx])

  const days = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const date = addDays(trip.startDate, i)
        return { i, date, plan: trip.itinerary.find(d => d.date === date), done: date < today, isToday: date === today }
      }),
    [n, trip.startDate, trip.itinerary, today],
  )

  const place = data.places.find(p => trip.placeIds.includes(p.id))
  const [wx, setWx] = useState<ForecastDay[] | null>(null)
  const inWindow = hasDates && trip.startDate <= addDays(today, 15) && trip.endDate >= today
  useEffect(() => {
    if (!place || !inWindow) return
    let cancelled = false
    fetchForecast(place.lat, place.lng)
      .then(d => {
        if (!cancelled) setWx(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [place, inWindow])
  const wxFor = (date: string) => wx?.find(d => d.date === date)

  const patchTrip = (fn: (t: Trip) => Trip) => update(d => ({ ...d, trips: d.trips.map(t => (t.id === trip.id ? fn(t) : t)) }))

  const packed = trip.packing.filter(p => p.packed).length
  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0)
  const memories = data.memories.filter(m => m.tripId === trip.id || (!m.tripId && hasDates && m.date >= trip.startDate && m.date <= trip.endDate))

  const toggleItem = (dayId: string, itemId: string, done: boolean) =>
    patchTrip(t => ({ ...t, itinerary: t.itinerary.map(day => (day.id === dayId ? { ...day, items: day.items.map(it => (it.id === itemId ? { ...it, done } : it)) } : day)) }))

  // Inline add: a plan item for the selected day (creating the day if it does not exist yet).
  const [newItem, setNewItem] = useState('')
  const addItem = () => {
    const sday = days[sel]
    if (!sday || !newItem.trim()) return
    const text = newItem.trim()
    patchTrip(t => {
      const exists = t.itinerary.find(d => d.date === sday.date)
      const item = { id: uid(), time: '', text, done: false }
      const itinerary = exists ? t.itinerary.map(d => (d.id === exists.id ? { ...d, items: [...d.items, item] } : d)) : [...t.itinerary, { id: uid(), date: sday.date, title: '', items: [item] }].sort((a, b) => a.date.localeCompare(b.date))
      return { ...t, itinerary }
    })
    setNewItem('')
  }

  // Inline expense.
  const [exp, setExp] = useState<{ open: boolean; label: string; amount: string; category: string }>({ open: false, label: '', amount: '', category: 'Food' })
  const [expDone, setExpDone] = useState('')
  const logExpense = () => {
    const amount = Number(exp.amount)
    if (!exp.label.trim() || !(amount > 0)) return
    patchTrip(t => ({ ...t, expenses: [...t.expenses, { id: uid(), label: exp.label.trim(), amount, category: exp.category }] }))
    setExpDone(`Logged ${fmtMoney(amount, trip.currency)} for ${exp.label.trim()}.`)
    setExp({ open: false, label: '', amount: '', category: exp.category })
    setTimeout(() => setExpDone(''), 3000)
  }

  // The stay: first lodging booking. Photos can be added right here.
  const stay = trip.bookings.find(b => b.kind === 'stay')
  const [stayDraft, setStayDraft] = useState<{ open: boolean; title: string; url: string }>({ open: false, title: '', url: '' })
  const [stayBusy, setStayBusy] = useState(false)
  const addStay = () => {
    if (!stayDraft.title.trim() && !stayDraft.url.trim()) return
    const url = stayDraft.url.trim()
    patchTrip(t => ({ ...t, bookings: [...t.bookings, { id: uid(), kind: 'stay', title: stayDraft.title.trim() || (url ? `Stay via ${siteLabel(url)}` : 'Our stay'), confirmation: '', date: t.startDate, notes: '', url: url || undefined, photos: [] }] }))
    setStayDraft({ open: false, title: '', url: '' })
  }
  const addStayPhotos = async (files: FileList | null) => {
    if (!files || !stay) return
    setStayBusy(true)
    const out: Photo[] = []
    for (const f of Array.from(files)) {
      try {
        out.push(await makePhoto(f))
      } catch {
        /* skip unreadable */
      }
    }
    patchTrip(t => ({ ...t, bookings: t.bookings.map(b => (b.id === stay.id ? { ...b, photos: [...(b.photos ?? []), ...out] } : b)) }))
    setStayBusy(false)
  }

  // Quick note appended to the trip notes with the date.
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const addNote = () => {
    if (!note.trim()) return
    const line = `${fmtDate(today, { year: undefined })}: ${note.trim()}`
    patchTrip(t => ({ ...t, notes: t.notes ? `${t.notes}\n${line}` : line }))
    setNote('')
    setNoteOpen(false)
  }

  const foxT = phase === 'before' ? 0 : phase === 'after' ? 1 : n <= 1 ? 1 : dayIdx / (n - 1)
  const [fx, fy] = along(foxT)
  const foxMood = phase === 'after' ? 'excited' : phase === 'during' ? 'wave' : daysUntil(trip.startDate) <= 2 ? 'excited' : 'happy'
  const status =
    phase === 'before'
      ? !hasDates
        ? 'Set trip dates to start the trail.'
        : daysUntil(trip.startDate) === 0
          ? 'Leaving today!'
          : daysUntil(trip.startDate) === 1
            ? `Leaving tomorrow · ${weekday(trip.startDate)}`
            : `Leaving in ${plural(daysUntil(trip.startDate), 'day')} · ${weekday(trip.startDate)}, ${fmtDate(trip.startDate, { year: undefined })}`
      : phase === 'during'
        ? `Day ${dayIdx + 1} of ${n}${n - dayIdx - 1 > 0 ? ` · ${plural(n - dayIdx - 1, 'day')} to go` : ' · last day, make it count'}`
        : `Back home · ${plural(n, 'day')} on the trail`

  const selected = days[sel]
  const unit = usesFahrenheit() ? '°F' : '°C'
  const selWx = selected ? wxFor(selected.date) : undefined

  return (
    <section className="tracker card">
      <header className="tracker-head">
        <div>
          <span className="eyebrow">{phase === 'during' ? 'Happening now' : phase === 'after' ? 'Trip complete' : 'Coming up'}</span>
          <h2>{trip.title}</h2>
          <p className="muted">
            {trip.destination}
            {trip.destination && hasDates ? ' · ' : ''}
            {hasDates ? `${fmtDate(trip.startDate, { year: undefined })} – ${fmtDate(trip.endDate)}` : ''}
          </p>
        </div>
        <div className="tracker-status">{status}</div>
      </header>

      {phase === 'during' && (
        <div className="tracker-actions">
          <button type="button" className="btn primary" onClick={() => go('memories', `new:${trip.id}`)}>
            <Camera size={16} /> Capture a moment
          </button>
          <button type="button" className="btn" onClick={() => setExp(e => ({ ...e, open: !e.open }))}>
            <CircleDollarSign size={16} /> Log expense
          </button>
          <button type="button" className="btn" onClick={() => setNoteOpen(v => !v)}>
            <StickyNote size={16} /> Quick note
          </button>
          {expDone && <span className="tracker-toast">✓ {expDone}</span>}
        </div>
      )}
      {exp.open && (
        <div className="tracker-inline">
          <input type="text" autoFocus value={exp.label} onChange={e => setExp({ ...exp, label: e.target.value })} onKeyDown={e => e.key === 'Enter' && logExpense()} placeholder="What was it? Lunch, lift tickets…" />
          <input type="number" min={0} step="0.01" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value })} onKeyDown={e => e.key === 'Enter' && logExpense()} placeholder="0.00" style={{ maxWidth: 120 }} />
          <select value={exp.category} onChange={e => setExp({ ...exp, category: e.target.value })} style={{ width: 'auto' }}>
            {EXPENSE_CATS.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button type="button" className="btn primary sm" disabled={!exp.label.trim() || !(Number(exp.amount) > 0)} onClick={logExpense}>
            Save
          </button>
        </div>
      )}
      {noteOpen && (
        <div className="tracker-inline">
          <input type="text" autoFocus value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Something to remember: the cabin wifi, a restaurant tip, where you parked…" />
          <button type="button" className="btn primary sm" disabled={!note.trim()} onClick={addNote}>
            Save
          </button>
        </div>
      )}

      <div className="trail-wrap">
        <svg className="trail" viewBox="0 0 920 330" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--trail-sky-a)" />
              <stop offset="1" stopColor="var(--trail-sky-b)" />
            </linearGradient>
            <linearGradient id="peakFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--trail-peak-a)" />
              <stop offset="1" stopColor="var(--trail-peak-b)" />
            </linearGradient>
          </defs>
          <rect width="920" height="330" fill="url(#sky)" rx="16" />
          <circle cx="120" cy="70" r="26" fill="var(--gold)" opacity="0.85" />
          <path d="M0 250 L120 180 L200 220 L300 140 L380 200 L480 110 L560 180 L650 120 L740 190 L820 140 L920 200 L920 330 L0 330 Z" fill="var(--trail-range)" opacity="0.55" />
          <path d="M0 330 L260 250 L420 160 L560 230 L680 120 L850 60 L920 90 L920 330 Z" fill="url(#peakFill)" />
          <path d="M790 84 L850 60 L900 82 L878 96 L856 86 L838 100 L814 92 Z" fill="var(--trail-snow)" />
          {[60, 120, 190, 260, 330].map((x, i) => (
            <g key={x} transform={`translate(${x} ${300 - (i % 2) * 8})`} fill="var(--trail-tree)">
              <path d="M0 -34 L12 -8 L-12 -8 Z" />
              <path d="M0 -22 L15 6 L-15 6 Z" />
              <rect x="-2" y="6" width="4" height="8" />
            </g>
          ))}
          <path d={smoothPath(TRAIL)} fill="none" stroke="var(--trail-path-bg)" strokeWidth="9" strokeLinecap="round" />
          <path d={smoothPath(TRAIL)} fill="none" stroke="var(--trail-path)" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 10" />
          <g transform="translate(850 60)">
            <line x1="0" y1="0" x2="0" y2="-36" stroke="var(--ink)" strokeWidth="2.5" />
            <path d="M0 -36 L26 -29 L0 -22 Z" fill={phase === 'after' ? 'var(--accent)' : 'var(--trail-flag)'} />
          </g>
          {days.map(d => {
            const [x, y] = along(n <= 1 ? 1 : d.i / (n - 1))
            const on = d.i === sel
            return (
              <g key={d.date} className={'wp' + (d.done ? ' done' : '') + (d.isToday ? ' today' : '') + (on ? ' on' : '')} transform={`translate(${x} ${y})`} onClick={() => setSel(d.i)} style={{ cursor: 'pointer' }}>
                <circle r={on ? 13 : 10} className="wp-ring" />
                <circle r={on ? 9 : 6} className="wp-dot" />
                {d.done && <path d="M-4 0 L-1 3 L4 -3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
                <text y={28} textAnchor="middle" className="wp-label">
                  {weekday(d.date)}
                </text>
              </g>
            )
          })}
          <g transform={`translate(${fx - 24} ${fy - 50})`} className="trail-fox">
            <Fox mood={foxMood} size={48} />
          </g>
        </svg>
      </div>

      <div className="tracker-grid">
        <div className="tracker-today">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <h3>
              {selected ? (selected.isToday ? 'Today' : `Day ${selected.i + 1}`) : 'Plan'}
              {selected && (
                <span className="muted small" style={{ marginLeft: 8, fontWeight: 500 }}>
                  {weekday(selected.date)}, {fmtDate(selected.date, { year: undefined })}
                </span>
              )}
            </h3>
            {selWx && (
              <span className="tracker-wx" title={weatherIcon(selWx.code).label}>
                {weatherIcon(selWx.code).icon} {selWx.hi}° / {selWx.lo}°
                {selWx.sunrise && (
                  <span className="muted">
                    {' '}
                    · ☀ {selWx.sunrise} · ☾ {selWx.sunset}
                  </span>
                )}
              </span>
            )}
          </div>
          {selected?.plan?.title && <p className="tracker-theme">{selected.plan.title}</p>}
          {!selected ? (
            <p className="muted small">Set dates to plan by day.</p>
          ) : !selected.plan || selected.plan.items.length === 0 ? (
            <p className="muted small">Nothing planned for this day yet. Add the first thing below.</p>
          ) : (
            <div className="checklist">
              {selected.plan.items.map(it => (
                <label key={it.id} className={'check-item' + (it.done ? ' done' : '')}>
                  <input type="checkbox" checked={it.done} onChange={e => toggleItem(selected.plan!.id, it.id, e.target.checked)} />
                  {it.time && <span className="time">{it.time}</span>}
                  <span className="txt">{it.text}</span>
                </label>
              ))}
            </div>
          )}
          {selected?.plan && selected.plan.items.length > 0 && <Progress value={selected.plan.items.filter(i => i.done).length} max={selected.plan.items.length} />}
          {selected && (
            <div className="add-row" style={{ marginTop: 10 }}>
              <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder={selected.isToday ? 'Add something for today…' : `Add a plan for ${weekday(selected.date)}…`} />
              <button type="button" className="btn sm" disabled={!newItem.trim()} onClick={addItem}>
                <Plus size={14} /> Add
              </button>
            </div>
          )}
          <div className="pills" style={{ marginTop: 10 }}>
            <button type="button" className="btn sm ghost" onClick={() => (onTab ? onTab('itinerary') : go('trips', trip.id))}>
              <Pencil size={14} /> Full itinerary
            </button>
            {phase !== 'during' && (
              <button type="button" className="btn sm ghost" onClick={() => go('memories', `new:${trip.id}`)}>
                <Camera size={14} /> Add a memory
              </button>
            )}
          </div>
        </div>

        <div className="tracker-side">
          {stay ? (
            <div className="stay-card">
              <div className="stay-head">
                <BedDouble size={18} />
                <b>{stay.title}</b>
                {stay.confirmation && <span className="conf">{stay.confirmation}</span>}
              </div>
              <div className="pills">
                {stay.url && (
                  <a className="btn sm" href={stay.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} /> Open on {siteLabel(stay.url)}
                  </a>
                )}
                {stay.address && (
                  <a className="btn sm" href={mapsUrl(stay.address)} target="_blank" rel="noreferrer">
                    <MapPin size={13} /> Directions
                  </a>
                )}
                <label className="btn sm file-btn">
                  <input type="file" accept="image/*" multiple onChange={e => addStayPhotos(e.target.files)} disabled={stayBusy} />
                  <Images size={13} /> {stayBusy ? 'Adding…' : 'Add photos'}
                </label>
              </div>
              {(stay.wifi || stay.access) && (
                <div className="stay-codes">
                  {stay.wifi && (
                    <span>
                      <Wifi size={13} /> {stay.wifi}
                    </span>
                  )}
                  {stay.access && (
                    <span>
                      <KeyRound size={13} /> {stay.access}
                    </span>
                  )}
                </div>
              )}
              {stay.photos && stay.photos.length > 0 && (
                <div className="stay-photos">
                  {stay.photos.slice(0, 6).map(p => (
                    <img key={p.id} src={thumbOf(p)} alt="" loading="lazy" />
                  ))}
                  {stay.photos.length > 6 && <span className="muted small">+{stay.photos.length - 6}</span>}
                </div>
              )}
              {!stay.url && !stay.address && !stay.wifi && <p className="muted small">Add the link, address, Wi-Fi and door code on the Bookings tab.</p>}
            </div>
          ) : phase !== 'after' ? (
            stayDraft.open ? (
              <div className="stay-card">
                <div className="form" style={{ gap: 8 }}>
                  <input type="text" autoFocus value={stayDraft.title} onChange={e => setStayDraft({ ...stayDraft, title: e.target.value })} placeholder="Cabin at Government Camp" />
                  <input type="text" value={stayDraft.url} onChange={e => setStayDraft({ ...stayDraft, url: e.target.value })} onKeyDown={e => e.key === 'Enter' && addStay()} placeholder="Paste the Airbnb / hotel link" />
                  <div className="pills">
                    <button type="button" className="btn primary sm" onClick={addStay} disabled={!stayDraft.title.trim() && !stayDraft.url.trim()}>
                      Save stay
                    </button>
                    <button type="button" className="btn sm ghost" onClick={() => setStayDraft({ open: false, title: '', url: '' })}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" className="tracker-stat" onClick={() => setStayDraft({ ...stayDraft, open: true })}>
                <BedDouble size={22} />
                <div>
                  <div className="tracker-stat-n">Where are you staying?</div>
                  <div className="muted small">Link the Airbnb, save the door code, add photos</div>
                </div>
              </button>
            )
          ) : null}
          {phase === 'before' && trip.packing.length > 0 && (
            <button type="button" className="tracker-stat" onClick={() => (onTab ? onTab('packing') : go('trips', trip.id))}>
              <Ring value={packed} max={trip.packing.length} size={56} stroke={5}>
                <b>{Math.round((packed / trip.packing.length) * 100)}%</b>
              </Ring>
              <div>
                <div className="tracker-stat-n">
                  {packed}/{trip.packing.length}
                </div>
                <div className="muted small">packed</div>
              </div>
            </button>
          )}
          <div className="tracker-stat">
            <ListChecks size={22} />
            <div>
              <div className="tracker-stat-n">
                {trip.itinerary.reduce((s, d) => s + d.items.filter(i => i.done).length, 0)}/{trip.itinerary.reduce((s, d) => s + d.items.length, 0)}
              </div>
              <div className="muted small">plans done</div>
            </div>
          </div>
          <button type="button" className="tracker-stat" onClick={() => (onTab ? onTab('budget') : setExp(e => ({ ...e, open: true })))}>
            <CircleDollarSign size={22} />
            <div>
              <div className="tracker-stat-n">{fmtMoney(spent, trip.currency)}</div>
              <div className="muted small">{trip.budget ? `of ${fmtMoney(trip.budget, trip.currency)}` : 'spent'}</div>
            </div>
          </button>
          <button type="button" className="tracker-stat" onClick={() => go('memories', `new:${trip.id}`)}>
            <Camera size={22} />
            <div>
              <div className="tracker-stat-n">{memories.length}</div>
              <div className="muted small">{memories.length === 1 ? 'memory' : 'memories'}</div>
            </div>
          </button>
          {wx && inWindow && (
            <div className="tracker-forecast">
              {days
                .filter(d => wxFor(d.date))
                .slice(0, 8)
                .map(d => {
                  const w = wxFor(d.date)!
                  return (
                    <div key={d.date} className={'wx' + (d.isToday ? ' on' : '')} title={weatherIcon(w.code).label}>
                      <div className="wd">{weekday(d.date)}</div>
                      <div className="ico">{weatherIcon(w.code).icon}</div>
                      <div className="hi">{w.hi}°</div>
                      <div className="lo">{w.lo}°</div>
                    </div>
                  )
                })}
              <div className="muted small" style={{ alignSelf: 'center', paddingLeft: 4 }}>
                {place?.name} · {unit}
              </div>
            </div>
          )}
          {!place && <p className="muted small">Link a place to this trip (Overview tab) for the forecast on the trail.</p>}
        </div>
      </div>
    </section>
  )
}
