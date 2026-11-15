import { lazy, Suspense, useEffect, useState } from 'react'
import type { Page, Place } from '../lib/types'
import { useStore } from '../lib/store'
import { CountUp, Flag, Ring, StatStrip } from '../components/ui'
import { Tracker } from '../components/Tracker'
import { MapPin, Luggage, Camera, KeyRound, Map as MapIcon, Plane, IdCard, ChartColumn, Compass, CircleDollarSign, ListChecks, Backpack } from 'lucide-react'
import { FoxSays, type FoxAction } from '../components/Fox'
import { fetchLocalNow, weatherIcon, type LocalNow } from '../lib/util'
import { backupPermission, getBackupFolder, requestBackupPermission } from '../lib/backup'

const WorldGlobe = lazy(() => import('../components/Globe'))
import { DOC_KINDS, docStatus } from './Wallet'
import { addDays, daysBetween, daysUntil, fmtDate, fmtRange, plural, thumbOf, todayISO } from '../lib/util'

export function Home({ go }: { go: (p: Page, tripId?: string) => void }) {
  const { data } = useStore()
  const today = todayISO()

  const visited = data.places.filter(p => p.status === 'visited')
  const countries = new Set(visited.map(p => p.country).filter(Boolean))
  const pastTrips = data.trips.filter(t => t.status === 'completed' || (t.endDate && t.endDate < today))
  const upcoming = data.trips
    .filter(t => t.status !== 'completed' && t.startDate && t.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const active = data.trips.find(t => t.status !== 'completed' && t.startDate && t.endDate && t.startDate <= today && t.endDate >= today)
  const next = active ?? upcoming[0]
  const recent = [...data.memories].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const wishlist = data.places.filter(p => p.status === 'wishlist').slice(0, 10)
  const onThisDay = data.memories.filter(m => m.date.slice(5) === today.slice(5) && m.date !== today)

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = data.profile.name.trim()

  const packed = next ? next.packing.filter(p => p.packed).length : 0

  // Heads-up: documents expired or expiring, and passports that won't cover the next trip plus six months.
  const alerts: string[] = []
  for (const d of data.docs) {
    const st = docStatus(d)
    const nm = d.label || DOC_KINDS[d.kind].label
    if (st === 'expired') alerts.push(`${nm} expired on ${fmtDate(d.expires)}.`)
    else if (st === 'soon') alerts.push(`${nm} expires ${fmtDate(d.expires)}, under six months away.`)
    else if (d.kind === 'passport' && next?.endDate && d.expires && d.expires < addDays(next.endDate, 183))
      alerts.push(`${nm} expires ${fmtDate(d.expires)}, less than six months after ${next.title} ends. Some countries will refuse entry.`)
  }
  if (next && !active && daysUntil(next.startDate) <= 7 && next.packing.length > 0 && packed < next.packing.length)
    alerts.push(`${next.title} is in ${plural(daysUntil(next.startDate), 'day')} and ${next.packing.length - packed} packing items are unchecked.`)
  if (next && !active && daysUntil(next.startDate) <= 14 && !next.sitterId && data.sitters.length > 0) alerts.push(`No sitter assigned for ${next.title} yet.`)
  const items = data.memories.length + data.trips.length + data.places.length + data.docs.length
  const sinceBackup = data.profile.lastBackup ? daysBetween(data.profile.lastBackup, today) : null
  if (items >= 5 && (sinceBackup === null || sinceBackup > 30))
    alerts.push(sinceBackup === null ? 'You have never exported a backup. Everything lives only in this browser, so grab one from Settings & backup.' : `It has been ${plural(sinceBackup, 'day')} since your last backup.`)

  // A memory to revisit: rotates daily, favorites first, never the newest one.
  const pool = data.memories.length > 1 ? data.memories.filter(m => m.photos.length > 0 || m.body) : []
  const favPool = pool.filter(m => m.favorite)
  const dayIndex = Math.floor(Date.parse(today + 'T00:00:00') / 86_400_000)
  const throwback = (favPool.length ? favPool : pool)[dayIndex % Math.max(1, (favPool.length ? favPool : pool).length)]
  const nextPlace = next ? data.places.find(p => next.placeIds.includes(p.id)) : undefined

  // What Scout says today.
  const empty = data.trips.length + data.memories.length + data.places.length === 0
  const unpacked = next ? next.packing.length - packed : 0
  const planNow: FoxAction[] = [
    { label: <><Compass size={14} /> I'm traveling now</>, onClick: () => go('trips', 'new:now') },
    { label: <><Plane size={14} /> Plan a trip</>, onClick: () => go('trips', 'new:plan'), primary: true },
  ]
  const scout: { mood: 'happy' | 'sleepy' | 'excited' | 'wave' | 'think'; text: string; actions?: FoxAction[] } = empty
    ? { mood: 'wave', text: `Hi${name ? ' ' + name : ''}, I'm Scout. I keep track of where you've been and where you're going. Already on a trip? Say so and I'll set it up around today.`, actions: planNow }
    : active
      ? {
          mood: 'excited',
          text: `You're on ${active.title}, day ${daysBetween(active.startDate, today) + 1}. Capture moments as you go and tick off today's plan. I'll sort the dates and places.`,
          actions: [
            { label: <><Camera size={14} /> Capture a moment</>, onClick: () => go('memories', `new:${active.id}`), primary: true },
            { label: <><CircleDollarSign size={14} /> Log expense</>, onClick: () => go('trips', active.id) },
            { label: <><ListChecks size={14} /> Today's plan</>, onClick: () => go('trips', active.id) },
          ],
        }
      : next && daysUntil(next.startDate) <= 3
        ? { mood: 'excited', text: `${plural(daysUntil(next.startDate), 'day')} until ${next.title}! ${unpacked > 0 ? `${unpacked} things still unpacked.` : 'Bags are packed. Passport?'}`, actions: [{ label: <><Backpack size={14} /> Packing list</>, onClick: () => go('trips', next.id), primary: true }, { label: <><Compass size={14} /> Already there? Tell me</>, onClick: () => go('trips', 'new:now') }] }
        : next && daysUntil(next.startDate) <= 21 && unpacked > 0
          ? { mood: 'think', text: `${next.title} is in ${plural(daysUntil(next.startDate), 'day')} and the packing list has ${unpacked} open items. Want to knock a few out?`, actions: [{ label: <><Backpack size={14} /> Packing list</>, onClick: () => go('trips', next.id), primary: true }] }
          : alerts.length
            ? { mood: 'think', text: alerts[0] }
            : throwback
              ? { mood: 'happy', text: `Remember ${throwback.title}? ${fmtDate(throwback.date, { year: 'numeric', month: 'long', day: undefined })}. Worth a look back today.` }
              : next
                ? { mood: 'happy', text: `${plural(daysUntil(next.startDate), 'day')} until ${next.title}. Plenty of time to collect ideas.` }
                : { mood: 'think', text: 'Nothing on the calendar. Even a far-off idea counts, and if you are already somewhere, tell me and I will set it up around today.', actions: planNow }

  return (
    <div className="page home">
      <div className="hero-greet">
        <div>
          <h1>
            {greet}
            {name ? (
              <>
                , <em>{name}</em>.
              </>
            ) : (
              '.'
            )}
          </h1>
          <p className="subtitle">
            {data.trips.length + data.memories.length + data.places.length === 0
              ? 'Welcome. Pick any door below to get going.'
              : `You've logged ${plural(visited.length, 'place')} across ${plural(countries.size, 'country', 'countries')}.`}
          </p>
        </div>
        <span className="hero-date">{fmtDate(today, { weekday: 'long' })}</span>
      </div>

      <FoxSays mood={scout.mood} actions={scout.actions}>
        {scout.text}
      </FoxSays>

      <BackupNudge />

      {data.trips.length + data.memories.length + data.places.length === 0 && (
        <div className="welcome">
          <button type="button" className="card welcome-step" onClick={() => go('places')}>
            <span className="n">1</span>
            <span className="ico"><MapIcon size={30} strokeWidth={1.6} /></span>
            <b>Pin where you've been</b>
            <span className="muted small">Search a city or click the map. Countries and stats build from here.</span>
          </button>
          <button type="button" className="card welcome-step" onClick={() => go('memories')}>
            <span className="n">2</span>
            <span className="ico"><Camera size={30} strokeWidth={1.6} /></span>
            <b>Drop in some photos</b>
            <span className="muted small">Date and location fill in from the picture. Write a line or two.</span>
          </button>
          <button type="button" className="card welcome-step" onClick={() => go('trips', 'new:plan')}>
            <span className="n">3</span>
            <span className="ico"><Plane size={30} strokeWidth={1.6} /></span>
            <b>Plan the next one</b>
            <span className="muted small">Dates, itinerary, packing, budget, and who's watching the house.</span>
          </button>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card pad alerts">
          <h3>⚠️ Heads up</h3>
          <ul>
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <StatStrip
        onPress={() => go('insights')}
        stats={[
          { n: <CountUp n={countries.size} />, label: countries.size === 1 ? 'country' : 'countries' },
          { n: <CountUp n={visited.length} />, label: visited.length === 1 ? 'place' : 'places' },
          { n: <CountUp n={pastTrips.length} />, label: pastTrips.length === 1 ? 'trip' : 'trips' },
          { n: <CountUp n={data.memories.length} />, label: data.memories.length === 1 ? 'memory' : 'memories' },
        ]}
      />

      {next && (active || daysUntil(next.startDate) <= 7) && <Tracker trip={next} go={go} />}

      <div className="home-grid">
        <div className="page" style={{ gap: 16 }}>
          {next && !(active || daysUntil(next.startDate) <= 7) ? (
            <div className="card next-trip">
              {next.cover && <img className="cover" src={next.cover} alt="" />}
              <span className="watermark" aria-hidden="true">{active ? '🧭' : '✈️'}</span>
              <div className="inner">
                <div className="pills between">
                  <span className="pill">{active ? 'Happening now' : 'Next up'}</span>
                  <span style={{ opacity: 0.85, flex: 'none' }}>{fmtRange(next.startDate, next.endDate)}</span>
                </div>
                <div>
                  <h2 style={{ fontSize: 28, color: '#fff' }}>{next.title}</h2>
                  <p style={{ opacity: 0.85 }}>{next.destination}</p>
                </div>
                <div className="count-row">
                  {active ? (
                    <div className="countdown">
                      Day {daysUntil(next.startDate) * -1 + 1}
                      <small>of {daysUntil(next.endDate) - daysUntil(next.startDate) + 1}</small>
                    </div>
                  ) : (
                    <div className="countdown">
                      {daysUntil(next.startDate)}
                      <small>{daysUntil(next.startDate) === 1 ? 'day to go' : 'days to go'}</small>
                    </div>
                  )}
                  {next.packing.length > 0 && (
                    <Ring value={packed} max={next.packing.length}>
                      <b>{Math.round((packed / next.packing.length) * 100)}%</b>
                      packed
                    </Ring>
                  )}
                </div>
                <div className="meta-row">
                  {next.packing.length > 0 && (
                    <span>
                      🎒 {packed}/{next.packing.length} packed
                    </span>
                  )}
                  {next.itinerary.length > 0 && <span>📅 {plural(next.itinerary.length, 'day')} planned</span>}
                  {next.bookings.length > 0 && <span>🎟️ {plural(next.bookings.length, 'booking')}</span>}
                  {next.sitterId && <span>🔑 Sitter arranged</span>}
                </div>
                {nextPlace && <DestinationNow place={nextPlace} />}
                <button type="button" className="btn" onClick={() => go('trips', next.id)}>
                  Open trip →
                </button>
              </div>
            </div>
          ) : next ? null : (
            <div className="card pad">
              <h2>No trip on the horizon</h2>
              <p className="muted" style={{ margin: '6px 0 14px' }}>
                Even a far-off idea counts. Add a trip you are dreaming about and this spot will count down to it.
              </p>
              <div className="pills">
                <button type="button" className="btn primary" onClick={() => go('trips', 'new:plan')}>
                  <Plane size={15} /> Plan a trip
                </button>
                <button type="button" className="btn" onClick={() => go('trips', 'new:now')}>
                  <Compass size={15} /> I'm traveling now
                </button>
              </div>
            </div>
          )}

          {throwback && (
            <button type="button" className="card throwback" onClick={() => go('memories', throwback.id)}>
              {throwback.photos[0] ? <img src={thumbOf(throwback.photos[0])} alt="" /> : <div className="throwback-blank">📝</div>}
              <div className="throwback-text">
                <span className="eyebrow">Take me back</span>
                <h2>{throwback.title}</h2>
                <span className="muted small">
                  {fmtDate(throwback.date)}
                  {throwback.locationText ? ` · ${throwback.locationText}` : ''}
                </span>
                {throwback.body && <p className="excerpt">{throwback.body}</p>}
              </div>
            </button>
          )}

          <div className="card pad">
            <div className="card-head">
              <h2>Recent memories</h2>
              <button type="button" className="btn ghost sm" onClick={() => go('memories')}>
                See all
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="muted">No memories yet. Add photos and a few words from a trip you loved.</p>
            ) : (
              <div className="mini-list">
                {recent.map(m => (
                  <button type="button" key={m.id} className="mini-item" onClick={() => go('memories', m.id)}>
                    {m.photos[0] ? <img className="thumb" src={thumbOf(m.photos[0])} alt="" /> : <div className="thumb">📝</div>}
                    <div>
                      <div className="t">{m.title}</div>
                      <div className="muted small">
                        {fmtDate(m.date)}
                        {m.locationText ? ` · ${m.locationText}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="page" style={{ gap: 16 }}>
          {onThisDay.length > 0 && (
            <div className="card pad" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)' }}>
              <h2>On this day</h2>
              <div className="mini-list" style={{ marginTop: 8 }}>
                {onThisDay.map(m => (
                  <button type="button" key={m.id} className="mini-item" onClick={() => go('memories', m.id)}>
                    {m.photos[0] ? <img className="thumb" src={thumbOf(m.photos[0])} alt="" /> : <div className="thumb">✨</div>}
                    <div>
                      <div className="t">{m.title}</div>
                      <div className="muted small">{m.date.slice(0, 4)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.places.length > 0 && (
            <button type="button" className="card globe-card" onClick={() => go('insights')}>
              <div className="globe-card-head">
                <h2>Your world</h2>
                <span className="muted small">{plural(countries.size, 'country', 'countries')} lit up →</span>
              </div>
              <Suspense fallback={<div className="globe-loading">Spinning up the globe…</div>}>
                <WorldGlobe height={260} interactive={false} />
              </Suspense>
            </button>
          )}

          <div className="card pad">
            <div className="card-head">
              <h2>Wishlist</h2>
              <button type="button" className="btn ghost sm" onClick={() => go('places')}>
                Map
              </button>
            </div>
            {wishlist.length === 0 ? (
              <p className="muted">Where next? Mark places on the map as wishlist and they show up here.</p>
            ) : (
              <div className="wish-chips">
                {wishlist.map(p => (
                  <span key={p.id} className="chip">
                    <Flag cc={p.countryCode} /> {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {upcoming.length > 1 && (
            <div className="card pad">
              <h2>Also coming up</h2>
              <div className="mini-list" style={{ marginTop: 8 }}>
                {upcoming.slice(1, 4).map(t => (
                  <button type="button" key={t.id} className="mini-item" onClick={() => go('trips', t.id)}>
                    <div className="thumb">✈️</div>
                    <div>
                      <div className="t">{t.title}</div>
                      <div className="muted small">
                        {fmtRange(t.startDate, t.endDate)} · in {plural(daysUntil(t.startDate), 'day')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card pad">
            <h2 style={{ marginBottom: 10 }}>Quick add</h2>
            <div className="quick-actions">
              <button type="button" onClick={() => go('memories')}>
                <span className="ico"><Camera size={22} /></span>New memory
              </button>
              <button type="button" onClick={() => go('places')}>
                <span className="ico"><MapPin size={22} /></span>Pin a place
              </button>
              <button type="button" onClick={() => go('trips', 'new:plan')}>
                <span className="ico"><Luggage size={22} /></span>Plan a trip
              </button>
              <button type="button" onClick={() => go('sitters')}>
                <span className="ico"><KeyRound size={22} /></span>Add a sitter
              </button>
              <button type="button" onClick={() => go('wallet')}>
                <span className="ico"><IdCard size={22} /></span>Travel wallet
              </button>
              <button type="button" onClick={() => go('insights')}>
                <span className="ico"><ChartColumn size={22} /></span>Insights
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Live clock and current weather at the next destination. */
function DestinationNow({ place }: { place: Place }) {
  const [now, setNow] = useState<LocalNow | null>(null)
  const [tick, setTick] = useState(0)
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
  void tick
  let time = ''
  try {
    time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: now.timezone }).format(new Date())
  } catch {
    return null
  }
  const w = weatherIcon(now.code)
  return (
    <div className="dest-now">
      <span>🕒 {time} in {place.name}</span>
      <span title={w.label}>
        {w.icon} {now.temp}° right now
      </span>
    </div>
  )
}

/** After a browser restart the backup folder needs one click to resume. */
function BackupNudge() {
  const [state, setState] = useState<'hidden' | 'prompt' | 'ok'>('hidden')
  useEffect(() => {
    let cancelled = false
    getBackupFolder().then(async h => {
      if (!h || cancelled) return
      const p = await backupPermission(h)
      if (!cancelled) setState(p === 'prompt' ? 'prompt' : 'hidden')
    })
    return () => {
      cancelled = true
    }
  }, [])
  if (state !== 'prompt') return null
  return (
    <div className="card pad alerts" style={{ order: 1 }}>
      <h3>Automatic backup is paused</h3>
      <p className="small" style={{ margin: '4px 0 10px' }}>The browser needs a click to let TravelBud write to your backup folder again.</p>
      <button
        type="button"
        className="btn primary sm"
        onClick={async () => {
          const h = await getBackupFolder()
          if (!h) return
          const p = await requestBackupPermission(h)
          setState(p === 'granted' ? 'hidden' : 'prompt')
        }}
      >
        Resume backups
      </button>
    </div>
  )
}
