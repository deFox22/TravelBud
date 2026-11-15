import { lazy, Suspense, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { CountUp, Empty, Flag, PageHeader, Stars } from '../components/ui'
import { YearStory } from './Story'
import { Play } from 'lucide-react'

const WorldGlobe = lazy(() => import('../components/Globe'))
import { daysBetween, plural, todayISO } from '../lib/util'

export function Insights() {
  const { data } = useStore()
  const today = todayISO()
  const [story, setStory] = useState<string | null>(null)

  const s = useMemo(() => {
    const visited = data.places.filter(p => p.status === 'visited')
    const byCountry = new Map<string, { country: string; cc: string; places: number; memories: number }>()
    for (const p of visited) {
      const key = p.countryCode || p.country || '?'
      const row = byCountry.get(key) ?? { country: p.country || 'Unknown', cc: p.countryCode, places: 0, memories: 0 }
      row.places++
      row.memories += data.memories.filter(m => m.placeId === p.id).length
      byCountry.set(key, row)
    }
    const countries = [...byCountry.values()].sort((a, b) => b.places - a.places || a.country.localeCompare(b.country))

    const past = data.trips.filter(t => (t.status === 'completed' || (t.endDate && t.endDate < today)) && t.startDate)
    const years = new Map<string, { trips: number; nights: number; memories: number }>()
    const bump = (y: string, k: 'trips' | 'nights' | 'memories', n: number) => {
      const row = years.get(y) ?? { trips: 0, nights: 0, memories: 0 }
      row[k] += n
      years.set(y, row)
    }
    for (const t of past) {
      bump(t.startDate.slice(0, 4), 'trips', 1)
      if (t.endDate) bump(t.startDate.slice(0, 4), 'nights', Math.max(0, daysBetween(t.startDate, t.endDate)))
    }
    for (const m of data.memories) bump(m.date.slice(0, 4), 'memories', 1)
    const yearRows = [...years.entries()].sort((a, b) => b[0].localeCompare(a[0]))
    const maxNights = Math.max(1, ...yearRows.map(([, r]) => r.nights))
    const maxMem = Math.max(1, ...yearRows.map(([, r]) => r.memories))

    const totalNights = past.reduce((n, t) => n + (t.endDate ? Math.max(0, daysBetween(t.startDate, t.endDate)) : 0), 0)
    const longest = past.filter(t => t.endDate).sort((a, b) => daysBetween(b.startDate, b.endDate) - daysBetween(a.startDate, a.endDate))[0]
    const topRated = visited.filter(p => p.rating > 0).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)).slice(0, 6)
    const spent = past.reduce((n, t) => n + t.expenses.reduce((x, e) => x + e.amount, 0), 0)
    const people = new Map<string, number>()
    for (const m of data.memories) for (const p of m.people) people.set(p, (people.get(p) ?? 0) + 1)
    const companions = [...people.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    const tags = new Map<string, number>()
    for (const m of data.memories) for (const t of m.tags) tags.set(t, (tags.get(t) ?? 0) + 1)
    const topTags = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    const sitterStays = data.sitters.reduce((n, x) => n + x.stints.length, 0)
    const wishlist = data.places.filter(p => p.status === 'wishlist').length

    return { visited, countries, past, yearRows, maxNights, maxMem, totalNights, longest, topRated, spent, companions, topTags, sitterStays, wishlist }
  }, [data, today])

  const nothing = data.places.length + data.trips.length + data.memories.length === 0

  return (
    <div className="page">
      <PageHeader title="Insights" subtitle="Your travels, added up" />

      {data.places.length > 0 && (
        <div className="card globe-big">
          <Suspense fallback={<div className="globe-loading">Spinning up the globe…</div>}>
            <WorldGlobe height={460} />
          </Suspense>
          <div className="globe-legend">
            <span>
              <i style={{ background: '#5cbdb6' }} /> visited
            </span>
            <span>
              <i style={{ background: '#e68a62' }} /> wishlist
            </span>
            <span>— trip routes · drag to spin, scroll to zoom</span>
          </div>
        </div>
      )}

      {s.yearRows.length > 0 && (
        <div className="card pad story-launch">
          <div>
            <h2>Year in review</h2>
            <p className="muted small">A tap-through story of each year: countries, nights away, the people, the highlights.</p>
          </div>
          <div className="pills">
            {s.yearRows.map(([y]) => (
              <button type="button" key={y} className="btn primary" onClick={() => setStory(y)}>
                <Play size={14} /> {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {story && <YearStory year={story} onClose={() => setStory(null)} />}

      {nothing ? (
        <Empty icon="📊" title="Nothing to add up yet" body="Pin places, log trips, and keep memories. This page fills in as you go." />
      ) : (
        <>
          <div className="stat-row">
            <Tile n={s.countries.length} label="Countries" />
            <Tile n={s.visited.length} label="Places visited" />
            <Tile n={s.past.length} label="Trips taken" />
            <Tile n={s.totalNights} label="Nights away" />
            <Tile n={data.memories.length} label="Memories" />
            <Tile n={s.wishlist} label="On the wishlist" />
          </div>

          <div className="two-col">
            <div className="page" style={{ gap: 16 }}>
              <div className="card pad">
                <h2 style={{ marginBottom: 12 }}>Passport stamps</h2>
                {s.countries.length === 0 ? (
                  <p className="muted">Mark places as visited and countries collect here.</p>
                ) : (
                  <div className="stamp-grid">
                    {s.countries.map(c => (
                      <div className="stamp" key={c.cc || c.country}>
                        <span className="stamp-tag">Visited</span>
                        <div className="stamp-flag">
                          <Flag cc={c.cc} fallback="🏳️" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.country}</div>
                          <div className="muted small">
                            {plural(c.places, 'place')}
                            {c.memories ? ` · ${plural(c.memories, 'memory', 'memories')}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card pad">
                <h2 style={{ marginBottom: 12 }}>Year by year</h2>
                {s.yearRows.length === 0 ? (
                  <p className="muted">Completed trips and dated memories build this up.</p>
                ) : (
                  <table className="tbl years">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Nights away</th>
                        <th>Memories</th>
                        <th className="num">Trips</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.yearRows.map(([y, r]) => (
                        <tr key={y}>
                          <td style={{ fontWeight: 600 }}>{y}</td>
                          <td>
                            <Bar value={r.nights} max={s.maxNights} tone="teal" />
                          </td>
                          <td>
                            <Bar value={r.memories} max={s.maxMem} tone="accent" />
                          </td>
                          <td className="num">{r.trips}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="page" style={{ gap: 16 }}>
              <div className="card pad">
                <h2 style={{ marginBottom: 10 }}>Highlights</h2>
                <dl className="kv">
                  {s.longest && (
                    <>
                      <dt>Longest trip</dt>
                      <dd>
                        {s.longest.title} · {plural(daysBetween(s.longest.startDate, s.longest.endDate), 'night')}
                      </dd>
                    </>
                  )}
                  {s.countries[0] && (
                    <>
                      <dt>Most visited</dt>
                      <dd>
                        {s.countries[0].country} · {plural(s.countries[0].places, 'place')}
                      </dd>
                    </>
                  )}
                  {s.spent > 0 && (
                    <>
                      <dt>Logged spend</dt>
                      <dd>{Math.round(s.spent).toLocaleString()} across past trips (in each trip's currency)</dd>
                    </>
                  )}
                  {s.sitterStays > 0 && (
                    <>
                      <dt>Sitter stays</dt>
                      <dd>{plural(s.sitterStays, 'time', 'times')} someone watched the house</dd>
                    </>
                  )}
                  <dt>Favorites</dt>
                  <dd>{plural(data.memories.filter(m => m.favorite).length, 'starred memory', 'starred memories')}</dd>
                </dl>
              </div>

              {s.topRated.length > 0 && (
                <div className="card pad">
                  <h2 style={{ marginBottom: 10 }}>Top-rated places</h2>
                  <div className="mini-list">
                    {s.topRated.map(p => (
                      <div className="mini-item" key={p.id} style={{ cursor: 'default' }}>
                        <div className="thumb">
                          <Flag cc={p.countryCode} fallback="📍" />
                        </div>
                        <div>
                          <div className="t">{p.name}</div>
                          <Stars value={p.rating} small />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s.companions.length > 0 && (
                <div className="card pad">
                  <h2 style={{ marginBottom: 10 }}>Travel companions</h2>
                  <div className="pills">
                    {s.companions.map(([name, n]) => (
                      <span className="chip" key={name}>
                        {name} · {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {s.topTags.length > 0 && (
                <div className="card pad">
                  <h2 style={{ marginBottom: 10 }}>What you do most</h2>
                  <div className="pills">
                    {s.topTags.map(([tag, n]) => (
                      <span className="chip" key={tag} style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                        {tag} · {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Tile({ n, label }: { n: number; label: string }) {
  return (
    <div className="card stat">
      <div className="num">
        <CountUp n={n} />
      </div>
      <div className="lbl">{label}</div>
    </div>
  )
}

function Bar({ value, max, tone }: { value: number; max: number; tone: 'teal' | 'accent' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="bar-cell">
      <div className={'bar ' + tone} style={{ width: `${pct}%` }} />
      <span className="small">{value}</span>
    </div>
  )
}
