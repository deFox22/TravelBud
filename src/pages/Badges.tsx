import { useMemo, useState } from 'react'
import type { Page } from '../lib/types'
import { useStore } from '../lib/store'
import { Modal, PageHeader, Progress } from '../components/ui'
import { Stamp } from '../components/Stamp'
import { Fox } from '../components/Fox'
import { BADGES, TIER_LABEL, isEarned, lockedArt, visitedPlaces, type BadgeDef } from '../lib/badges'
import { fmtDate, plural, thumbOf } from '../lib/util'

const BASE = import.meta.env.BASE_URL

/** The collection: a cork board of badges, and a logbook of stamps, one per place you have been. */
export function Badges({ go }: { go: (p: Page, id?: string) => void }) {
  const { data } = useStore()
  const [tab, setTab] = useState<'badges' | 'stamps'>('badges')
  const [open, setOpen] = useState<BadgeDef | null>(null)

  const earned = useMemo(() => BADGES.filter(b => isEarned(b, data)), [data])
  const gold = earned.filter(b => b.tier === 'gold').length
  const black = earned.filter(b => b.tier === 'black').length
  const earnedAt = (id: string) => data.profile.badges?.find(b => b.id === id)?.earnedAt

  const stamps = useMemo(
    () =>
      visitedPlaces(data)
        .map(p => {
          const mems = data.memories.filter(m => m.placeId === p.id).sort((a, b) => a.date.localeCompare(b.date))
          const photo = mems.find(m => m.photos[0])?.photos[0]
          return { place: p, photo: photo ? thumbOf(photo) : undefined, date: p.firstVisited ?? mems[0]?.date }
        })
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    [data],
  )

  return (
    <div className="page">
      <PageHeader title="Collection" subtitle={`${plural(earned.length, 'badge')} earned · ${plural(stamps.length, 'stamp')} in the logbook`} />

      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={tab === 'badges' ? 'active' : ''} onClick={() => setTab('badges')}>
          Badges
        </button>
        <button type="button" className={tab === 'stamps' ? 'active' : ''} onClick={() => setTab('stamps')}>
          Stamps
        </button>
      </div>

      {tab === 'badges' && (
        <>
          <div className="cork">
            {BADGES.map((b, i) => {
              const got = isEarned(b, data)
              return (
                <button type="button" key={b.id} className={'pin-slot' + (got ? ' got' : ' locked')} style={{ ['--tilt' as string]: `${((i * 7) % 17) - 8}deg` }} onClick={() => setOpen(b)} title={b.name}>
                  <img src={`${BASE}${got ? b.art : lockedArt(b.locked)}`} alt={b.name} />
                </button>
              )
            })}
          </div>
          <div className="card pad">
            <div className="card-head" style={{ marginBottom: 6 }}>
              <h3>
                {earned.length} of {BADGES.length} badges
              </h3>
              <span className="muted small">
                {gold ? `${gold} gold` : ''}
                {gold && black ? ' · ' : ''}
                {black ? `${black} black nickel` : ''}
              </span>
            </div>
            <Progress value={earned.length} max={BADGES.length} />
            <p className="muted small" style={{ marginTop: 10 }}>Badges come from what you already do: trips, nights away, places, memories. Tap one to see how to earn it.</p>
          </div>
        </>
      )}

      {tab === 'stamps' && (
        <div className="logbook">
          {stamps.length === 0 ? (
            <div className="logbook-empty">
              <Fox mood="think" size={96} />
              <p>Stamps are earned per place. Mark a place as visited on the map and its stamp lands here.</p>
              <button type="button" className="btn primary" onClick={() => go('places')}>
                Open the map
              </button>
            </div>
          ) : (
            <div className="logbook-scatter">
              {stamps.map((s, i) => (
                <button type="button" key={s.place.id} className="logbook-item" onClick={() => go('places', s.place.id)}>
                  <Stamp place={s.place} photo={s.photo} date={s.date} index={i} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {open && (
        <Modal
          title={open.name}
          onClose={() => setOpen(null)}
          footer={
            <button type="button" className="btn primary" onClick={() => setOpen(null)}>
              Nice
            </button>
          }
        >
          <div className="badge-detail">
            <img className={isEarned(open, data) ? 'got' : 'locked'} src={`${BASE}${isEarned(open, data) ? open.art : lockedArt(open.locked)}`} alt="" />
            <div>
              <p className="eyebrow">{TIER_LABEL[open.tier]}</p>
              <p style={{ margin: '6px 0 10px' }}>{open.how}</p>
              {(() => {
                const p = open.progress(data)
                return (
                  <>
                    <Progress value={p.have} max={p.need} />
                    <p className="muted small" style={{ marginTop: 6 }}>
                      {isEarned(open, data) ? `Earned${earnedAt(open.id) ? ` ${fmtDate(earnedAt(open.id))}` : ''}.` : `${p.have} of ${p.need}`}
                    </p>
                  </>
                )
              })()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
