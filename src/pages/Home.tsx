import { lazy, Suspense, useEffect, useState } from 'react'
import type { Page } from '../lib/types'
import { useStore } from '../lib/store'
import { CountUp, StatStrip } from '../components/ui'
import { TripCard } from '../components/TripCard'
import { Camera, Map as MapIcon, Plane, Compass, Backpack, CircleDollarSign, Award, Footprints, Share2, NotebookPen, ShieldCheck, Search } from 'lucide-react'
import { FoxSays, type FoxAction } from '../components/Fox'
import { backupDueAfterDays, backupPermission, getBackupFolder, requestBackupPermission, shareBackup, supportsFolderBackup } from '../lib/backup'

const WorldGlobe = lazy(() => import('../components/Globe'))
import { DOC_KINDS, docStatus } from './Wallet'
import { addDays, daysBetween, daysUntil, fmtDate, fmtRange, plural, thumbOf, todayISO } from '../lib/util'
import { BADGES, isEarned } from '../lib/badges'
import { requestCapture, requestSearch } from '../lib/events'

/** Home: greeting, Scout's postcard, the trip that matters, your numbers, and a strip of recent memories. */
export function Home({ go }: { go: (p: Page, id?: string) => void }) {
  const { data, update } = useStore()
  const today = todayISO()

  const visited = data.places.filter(p => p.status === 'visited')
  const countries = new Set(visited.map(p => p.country).filter(Boolean))
  const pastTrips = data.trips.filter(t => t.status === 'completed' || (t.endDate && t.endDate < today))
  const upcoming = data.trips.filter(t => t.status !== 'completed' && t.startDate && t.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))
  const active = data.trips.find(t => t.status !== 'completed' && t.startDate && t.endDate && t.startDate <= today && t.endDate >= today)
  const next = active ?? upcoming[0]
  const recent = [...data.memories].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const onThisDay = data.memories.filter(m => m.date.slice(5) === today.slice(5) && m.date !== today)
  const badges = BADGES.filter(b => isEarned(b, data)).length
  const empty = data.trips.length + data.memories.length + data.places.length === 0

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = data.profile.name.trim()
  const packed = next ? next.packing.filter(p => p.packed).length : 0
  const unpacked = next ? next.packing.length - packed : 0

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
  if (next && !active && daysUntil(next.startDate) <= 7 && unpacked > 0) alerts.push(`${next.title} is in ${plural(daysUntil(next.startDate), 'day')} and ${unpacked} packing items are unchecked.`)
  if (next && !active && daysUntil(next.startDate) <= 14 && !next.sitterId && data.sitters.length > 0) alerts.push(`No sitter assigned for ${next.title} yet.`)
  const items = data.memories.length + data.trips.length + data.places.length + data.docs.length
  const sinceBackup = data.profile.lastBackup ? daysBetween(data.profile.lastBackup, today) : null
  const backupDue = items >= 5 && (sinceBackup === null || sinceBackup > backupDueAfterDays())

  // A memory to revisit: rotates daily, favorites first.
  const pool = data.memories.length > 1 ? data.memories.filter(m => m.photos.length > 0 || m.body) : []
  const favPool = pool.filter(m => m.favorite)
  const dayIndex = Math.floor(Date.parse(today + 'T00:00:00') / 86_400_000)
  const basket = favPool.length ? favPool : pool
  const throwback = basket[dayIndex % Math.max(1, basket.length)]

  // What Scout says today: one thought, one link. "Later" rests the postcard until tomorrow.
  const scout: { mood: 'happy' | 'sleepy' | 'excited' | 'wave' | 'think'; text: string; action?: FoxAction } | null = empty
    ? { mood: 'wave', text: `Hi${name ? ' ' + name : ''}, I'm Scout. I keep your trips, places and memories in one spot, right on this device. Where shall we start?`, action: { label: <><Plane size={14} /> Plan a trip</>, onClick: () => go('trips', 'new:plan') } }
    : active
      ? { mood: 'excited', text: `Day ${daysBetween(active.startDate, today) + 1} of ${active.title}. Capture moments as you go and I'll sort the dates and places.`, action: { label: <><Camera size={14} /> Capture a moment</>, onClick: () => go('memories', `new:${active.id}`) } }
      : next && daysUntil(next.startDate) <= 3
        ? { mood: 'excited', text: `${plural(daysUntil(next.startDate), 'day')} until ${next.title}! ${unpacked > 0 ? `${unpacked} things still unpacked.` : 'Bags are packed. Passport?'}`, action: { label: <><Backpack size={14} /> Packing list</>, onClick: () => go('trips', next.id) } }
        : next && daysUntil(next.startDate) <= 21 && unpacked > 0
          ? { mood: 'think', text: `${next.title} is in ${plural(daysUntil(next.startDate), 'day')} and the packing list has ${unpacked} open items.`, action: { label: <><Backpack size={14} /> Packing list</>, onClick: () => go('trips', next.id) } }
          : alerts.length
            ? { mood: 'think', text: alerts[0], action: alerts[0].includes('backup') ? undefined : { label: 'Open the wallet', onClick: () => go('wallet') } }
            : badges > 0 && badges < BADGES.length && dayIndex % 3 === 0
              ? { mood: 'happy', text: `${plural(badges, 'badge')} on the board so far. The next one is closer than you think.`, action: { label: <><Award size={14} /> See the collection</>, onClick: () => go('badges') } }
              : throwback
                ? { mood: 'happy', text: `Remember ${throwback.title}? ${fmtDate(throwback.date, { year: 'numeric', month: 'long', day: undefined })}. Worth a look back today.`, action: { label: 'Take me back', onClick: () => go('memories', throwback.id) } }
                : next
                  ? { mood: 'happy', text: `${plural(daysUntil(next.startDate), 'day')} until ${next.title}. Plenty of time to collect ideas.`, action: { label: <><Footprints size={14} /> Open the trail</>, onClick: () => go('trips', next.id) } }
                  : null // the "No trip on the horizon" card already says it; Scout stays quiet rather than repeat it
  // Just back and not wrapped up: that outranks everything except being on a trip.
  const ended = data.trips
    .filter(t => t.status !== 'completed' && t.endDate && t.endDate < today && daysBetween(t.endDate, today) <= 30)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0]
  // Wrapped up within two weeks and nothing saved from it yet: the photos are still fresh.
  const bare = data.trips.find(t => t.status === 'completed' && t.endDate && daysBetween(t.endDate, today) >= 0 && daysBetween(t.endDate, today) <= 14 && !data.memories.some(m => m.tripId === t.id))
  const say =
    !active && ended
      ? { mood: 'wave' as const, text: `Welcome back from ${ended.title}. Wrap it up and I'll stamp the places and count it toward your badges.`, action: { label: 'Wrap up the trip', onClick: () => go('trips', ended.id) } }
      : !active && bare
        ? { mood: 'happy' as const, text: `${bare.title} is in the books. Drop in a few photos while they're fresh and I'll file them under the trip.`, action: { label: <><Camera size={14} /> Add photos</>, onClick: () => requestCapture(bare.id) } }
        : scout
  const rested = data.profile.postcardDismissed === today
  const rest = () => update(d => ({ ...d, profile: { ...d.profile, postcardDismissed: today } }))

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
          <p className="subtitle">{empty ? 'Welcome to TravelBud.' : `You've logged ${plural(visited.length, 'place')} across ${plural(countries.size, 'country', 'countries')}.`}</p>
        </div>
        <span className="hero-date">{fmtDate(today, { weekday: 'long' })}</span>
        <button type="button" className="hero-search" aria-label="Search everything" title="Search" onClick={requestSearch}>
          <Search size={20} strokeWidth={2.2} />
        </button>
      </div>

      {!rested && say && (
        <FoxSays mood={say.mood} actions={[...(say.action ? [say.action] : []), { label: 'Later', onClick: rest }]}>
          {say.text}
        </FoxSays>
      )}

      <BackupNudge />
      {backupDue && <BackupReminder sinceDays={sinceBackup} />}

      {empty && (
        <div className="welcome">
          <button type="button" className="card welcome-step" onClick={() => go('trips', 'new:plan')}>
            <span className="ico"><Plane size={26} strokeWidth={1.8} /></span>
            <span className="welcome-text">
              <b>Plan a trip</b>
              <span className="muted small">Where, when, and a packing list. Three short steps.</span>
            </span>
          </button>
          <button type="button" className="card welcome-step" onClick={() => go('trips', 'new:now')}>
            <span className="ico"><Compass size={26} strokeWidth={1.8} /></span>
            <span className="welcome-text">
              <b>I'm on a trip right now</b>
              <span className="muted small">Scout sets it up around today so you can capture as you go.</span>
            </span>
          </button>
          <button type="button" className="card welcome-step" onClick={() => go('places')}>
            <span className="ico"><MapIcon size={26} strokeWidth={1.8} /></span>
            <span className="welcome-text">
              <b>Pin where you've been</b>
              <span className="muted small">Each place earns a stamp. Countries and badges build from there.</span>
            </span>
          </button>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card pad alerts">
          <h3>Heads up</h3>
          <ul>
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {next ? (
        <TripCard trip={next} go={go} />
      ) : (
        !empty && (
          <div className="card pad">
            <h2>No trip on the horizon</h2>
            <p className="muted" style={{ margin: '6px 0 14px' }}>Even a far-off idea counts. Add a trip you are dreaming about and this spot will count down to it.</p>
            <div className="btn-pair">
              <button type="button" className="btn primary" onClick={() => go('trips', 'new:plan')}>
                <Plane size={15} /> Plan a trip
              </button>
              <button type="button" className="btn" onClick={() => go('trips', 'new:now')}>
                <Compass size={15} /> On a trip
              </button>
            </div>
          </div>
        )
      )}

      {!empty && (
      <StatStrip
        onPress={() => go('badges')}
        stats={[
          { n: <CountUp n={countries.size} />, label: countries.size === 1 ? 'country' : 'countries' },
          { n: <CountUp n={visited.length} />, label: visited.length === 1 ? 'stamp' : 'stamps' },
          { n: <CountUp n={pastTrips.length} />, label: pastTrips.length === 1 ? 'trip' : 'trips' },
          { n: <CountUp n={badges} />, label: badges === 1 ? 'badge' : 'badges' },
        ]}
      />
      )}

      {recent.length > 0 && (
        <section className="mem-strip">
          <div className="card-head">
            <h2>Recent memories</h2>
            <button type="button" className="btn ghost sm" onClick={() => go('memories')}>
              See all
            </button>
          </div>
          <div className="mem-strip-row">
            {recent.map(m => (
              <button type="button" key={m.id} className="mem-tile" onClick={() => go('memories', m.id)}>
                {m.photos[0] ? <img src={thumbOf(m.photos[0])} alt="" /> : <span className="mem-tile-blank"><NotebookPen size={26} strokeWidth={1.6} /></span>}
                <span className="mem-tile-cap">
                  <b>{m.title}</b>
                  <small>{fmtDate(m.date)}</small>
                </span>
              </button>
            ))}
            <button type="button" className="mem-tile add" onClick={() => go('memories', active ? `new:${active.id}` : 'new')}>
              <Camera size={22} />
              <span>Capture</span>
            </button>
          </div>
        </section>
      )}

      <div className="home-grid">
        {throwback && (
          <button type="button" className="card throwback" onClick={() => go('memories', throwback.id)}>
            {throwback.photos[0] ? <img src={thumbOf(throwback.photos[0])} alt="" /> : <div className="throwback-blank"><NotebookPen size={30} strokeWidth={1.6} /></div>}
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

        {onThisDay.length > 0 && (
          <div className="card pad on-this-day">
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

        {upcoming.filter(t => t.id !== next?.id).length > 0 && (
          <div className="card pad">
            <h2>Also coming up</h2>
            <div className="mini-list" style={{ marginTop: 8 }}>
              {upcoming
                .filter(t => t.id !== next?.id)
                .slice(0, 3)
                .map(t => (
                  <button type="button" key={t.id} className="mini-item" onClick={() => go('trips', t.id)}>
                    <div className="thumb">
                      <Plane size={18} />
                    </div>
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

        {visited.length > 0 && (
          <button type="button" className="card globe-row" onClick={() => go('insights')}>
            <div className="globe-row-text">
              <span className="eyebrow">Your world</span>
              <h2>{plural(countries.size, 'country', 'countries')} lit up</h2>
              <span className="muted small">Open Insights for the globe and your year in review</span>
            </div>
            <Suspense fallback={<div className="globe-loading" />}>
              <WorldGlobe height={150} interactive={false} />
            </Suspense>
          </button>
        )}

        {active && (
          <div className="card pad">
            <h2>While you're there</h2>
            <div className="pills" style={{ marginTop: 10 }}>
              <button type="button" className="btn" onClick={() => go('trips', active.id)}>
                <CircleDollarSign size={15} /> Log an expense
              </button>
              <button type="button" className="btn" onClick={() => go('places')}>
                <MapIcon size={15} /> Pin a place
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** A backup is due: never made, or older than a week on a phone (a month where a folder backup can run). */
function BackupReminder({ sinceDays }: { sinceDays: number | null }) {
  const { data, update } = useStore()
  const [done, setDone] = useState('')
  const phone = !supportsFolderBackup()
  return (
    <div className="card backup-banner">
      <ShieldCheck size={22} />
      <div className="backup-banner-text">
        <b>{done ? 'Backed up' : sinceDays === null ? 'No backup yet' : `Last backup ${plural(sinceDays, 'day')} ago`}</b>
        <span className="muted small">{done || (phone ? 'Everything lives only on this phone.' : 'Everything lives only in this browser.')}</span>
      </div>
      {!done && (
        <button
          type="button"
          className="btn primary sm"
          onClick={async () => {
            const how = await shareBackup(data)
            if (how === 'cancelled') return
            update(d => ({ ...d, profile: { ...d.profile, lastBackup: todayISO() } }))
            setDone(how === 'shared' ? 'Saved through the share sheet.' : 'Downloaded. Keep it in a cloud folder.')
          }}
        >
          <Share2 size={14} /> Back up
        </button>
      )}
    </div>
  )
}

/** After a browser restart the backup folder needs one click to resume. */
function BackupNudge() {
  const [state, setState] = useState<'hidden' | 'prompt'>('hidden')
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
    <div className="card pad alerts">
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
