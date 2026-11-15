import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { Flag, CountUp } from '../components/ui'
import { Fox } from '../components/Fox'
import { daysBetween, plural, thumbOf } from '../lib/util'

interface SlideDef {
  key: string
  tone: 'teal' | 'accent' | 'gold' | 'ink'
  body: ReactNode
}

/** Instagram-stories style recap of one year of travel. */
export function YearStory({ year, onClose }: { year: string; onClose: () => void }) {
  const { data } = useStore()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = useMemo<SlideDef[]>(() => {
    const inYear = (d: string) => d.startsWith(year)
    const trips = data.trips.filter(t => t.startDate && inYear(t.startDate) && (t.status === 'completed' || (t.endDate && t.endDate < new Date().toISOString().slice(0, 10))))
    const memories = data.memories.filter(m => inYear(m.date))
    const nights = trips.reduce((n, t) => n + (t.endDate ? Math.max(0, daysBetween(t.startDate, t.endDate)) : 0), 0)
    const longest = [...trips].filter(t => t.endDate).sort((a, b) => daysBetween(b.startDate, b.endDate) - daysBetween(a.startDate, a.endDate))[0]
    const placeIds = new Set<string>([...trips.flatMap(t => t.placeIds), ...memories.map(m => m.placeId ?? '')])
    const places = data.places.filter(p => placeIds.has(p.id) || (p.firstVisited && inYear(p.firstVisited)))
    const countries = Array.from(new Map(places.filter(p => p.country).map(p => [p.country, p])).values())
    const photos = memories.flatMap(m => m.photos.map(p => ({ p, m })))
    const fav = memories.filter(m => m.favorite && m.photos[0])[0] ?? memories.find(m => m.photos[0])
    const people = new Map<string, number>()
    for (const m of memories) for (const x of m.people) people.set(x, (people.get(x) ?? 0) + 1)
    const companions = [...people.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const tags = new Map<string, number>()
    for (const m of memories) for (const x of m.tags) tags.set(x, (tags.get(x) ?? 0) + 1)
    const topTags = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const topPlace = [...places].sort((a, b) => b.rating - a.rating)[0]
    const wishlist = data.places.filter(p => p.status === 'wishlist').slice(0, 4)

    const out: SlideDef[] = []
    out.push({
      key: 'title',
      tone: 'teal',
      body: (
        <>
          <Fox mood="excited" size={120} />
          <div className="story-eyebrow">Your year in travel</div>
          <div className="story-huge">{year}</div>
          <p className="story-sub">Scout dug through your memories. Tap to flip through.</p>
        </>
      ),
    })
    if (trips.length || nights) {
      out.push({
        key: 'trips',
        tone: 'ink',
        body: (
          <>
            <div className="story-eyebrow">You went away</div>
            <div className="story-huge">
              <CountUp n={trips.length} />
            </div>
            <div className="story-big">{trips.length === 1 ? 'time' : 'times'}</div>
            <p className="story-sub">
              <CountUp n={nights} /> nights somewhere else
              {longest ? `. The longest: ${longest.title}, ${plural(daysBetween(longest.startDate, longest.endDate), 'night')}.` : '.'}
            </p>
          </>
        ),
      })
    }
    if (countries.length) {
      out.push({
        key: 'countries',
        tone: 'accent',
        body: (
          <>
            <div className="story-eyebrow">Stamps collected</div>
            <div className="story-huge">
              <CountUp n={countries.length} />
            </div>
            <div className="story-big">{countries.length === 1 ? 'country' : 'countries'}</div>
            <div className="story-flags">
              {countries.slice(0, 12).map(p => (
                <span key={p.country} className="story-flag">
                  <Flag cc={p.countryCode} /> {p.country}
                </span>
              ))}
            </div>
          </>
        ),
      })
    }
    if (topPlace && topPlace.rating > 0) {
      out.push({
        key: 'top',
        tone: 'gold',
        body: (
          <>
            <div className="story-eyebrow">Highest rated</div>
            <div className="story-big" style={{ fontSize: 44 }}>
              <Flag cc={topPlace.countryCode} /> {topPlace.name}
            </div>
            <div className="story-stars">{'★'.repeat(topPlace.rating)}</div>
            {topPlace.notes && <p className="story-sub">“{topPlace.notes}”</p>}
          </>
        ),
      })
    }
    if (memories.length) {
      out.push({
        key: 'memories',
        tone: 'teal',
        body: (
          <>
            <div className="story-eyebrow">Kept for later</div>
            <div className="story-huge">
              <CountUp n={memories.length} />
            </div>
            <div className="story-big">{memories.length === 1 ? 'memory' : 'memories'}</div>
            <p className="story-sub">{plural(photos.length, 'photo')} that will never end up in a drawer.</p>
            {photos.length > 0 && (
              <div className="story-strip">
                {photos.slice(0, 6).map(({ p }) => (
                  <img key={p.id} src={thumbOf(p)} alt="" />
                ))}
              </div>
            )}
          </>
        ),
      })
    }
    if (fav && fav.photos[0]) {
      out.push({
        key: 'fav',
        tone: 'ink',
        body: (
          <>
            <img className="story-hero" src={fav.photos[0].dataUrl} alt="" />
            <div className="story-eyebrow">{fav.favorite ? 'A favorite' : 'One to remember'}</div>
            <div className="story-big">{fav.title}</div>
            {fav.body && <p className="story-sub">{fav.body.slice(0, 140)}{fav.body.length > 140 ? '…' : ''}</p>}
          </>
        ),
      })
    }
    if (companions.length) {
      out.push({
        key: 'people',
        tone: 'accent',
        body: (
          <>
            <div className="story-eyebrow">Who came along</div>
            <div className="story-names">
              {companions.map(([name, n]) => (
                <div key={name} className="story-name">
                  {name} <span>{plural(n, 'memory', 'memories')}</span>
                </div>
              ))}
            </div>
          </>
        ),
      })
    }
    if (topTags.length) {
      out.push({
        key: 'tags',
        tone: 'gold',
        body: (
          <>
            <div className="story-eyebrow">You were mostly</div>
            <div className="story-tags">
              {topTags.map(([t]) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </>
        ),
      })
    }
    out.push({
      key: 'end',
      tone: 'teal',
      body: (
        <>
          <Fox mood="think" size={110} />
          <div className="story-eyebrow">Where to next?</div>
          {wishlist.length ? (
            <div className="story-flags">
              {wishlist.map(p => (
                <span key={p.id} className="story-flag">
                  <Flag cc={p.countryCode} /> {p.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="story-big">Add a wishlist and Scout will nag you about it.</div>
          )}
        </>
      ),
    })
    return out
  }, [data, year])

  const n = slides.length
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => {
      if (i < n - 1) setI(i + 1)
    }, 6500)
    return () => clearTimeout(t)
  }, [i, n, paused])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      } else if (e.key === 'ArrowRight') setI(x => Math.min(n - 1, x + 1))
      else if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1))
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused(p => !p)
      }
    }
    window.addEventListener('keydown', onKey, true)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = ''
    }
  }, [n, onClose])

  const s = slides[i]
  return (
    <div className={`story story-${s.tone}`} onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onMouseLeave={() => setPaused(false)}>
      <div className="story-bars">
        {slides.map((x, k) => (
          <span key={x.key} className={k < i ? 'done' : k === i ? 'on' : ''} style={k === i && !paused ? { animationDuration: '6500ms' } : undefined} />
        ))}
      </div>
      <div className="story-tap left" onClick={() => setI(x => Math.max(0, x - 1))} />
      <div className="story-tap right" onClick={() => (i < n - 1 ? setI(i + 1) : onClose())} />
      <div className="story-body" key={s.key}>
        {s.body}
      </div>
      <button
        type="button"
        className="lightbox-close"
        aria-label="Close"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
      >
        ✕
      </button>
      <div className="story-hint">← tap sides to move · hold to pause →</div>
    </div>
  )
}
