import { useEffect, useMemo, useRef, useState } from 'react'
import type { Page } from '../lib/types'
import { useStore } from '../lib/store'
import { fmtDate, fmtRange, thumbOf, todayISO } from '../lib/util'
import { DOC_KINDS } from '../pages/Wallet'
import { Search } from 'lucide-react'

interface Hit {
  key: string
  page: Page
  id?: string
  icon: string
  img?: string
  title: string
  sub: string
  text: string
}

const PAGES: Hit[] = [
  { key: 'p-home', page: 'home', icon: '🏠', title: 'Home', sub: 'Dashboard', text: 'home dashboard' },
  { key: 'p-mem', page: 'memories', icon: '📸', title: 'Memories', sub: 'Journal and photos', text: 'memories journal photos' },
  { key: 'p-pl', page: 'places', icon: '🗺️', title: 'Places', sub: 'Map of everywhere', text: 'places map' },
  { key: 'p-tr', page: 'trips', icon: '🥾', title: 'Trail', sub: 'Trips, plans and the live tracker', text: 'trail trips plan itinerary packing tracker' },
  { key: 'p-bd', page: 'badges', icon: '🏅', title: 'Badges', sub: 'Collection: badges and stamps', text: 'badges stamps collection logbook' },
  { key: 'p-me', page: 'me', icon: '🦊', title: 'Me', sub: 'Profile, memories, wallet, sitters, settings', text: 'me profile account settings' },
  { key: 'p-si', page: 'sitters', icon: '🔑', title: 'Sitters', sub: 'Trusted people and home guide', text: 'sitters housesitter home guide' },
  { key: 'p-wa', page: 'wallet', icon: '🛂', title: 'Wallet', sub: 'Documents and loyalty', text: 'wallet passport documents loyalty contacts' },
  { key: 'p-in', page: 'insights', icon: '📊', title: 'Insights', sub: 'Stats and stamps', text: 'insights stats' },
]

export function Palette({ onClose, go }: { onClose: () => void; go: (p: Page, id?: string) => void }) {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const all = useMemo<Hit[]>(
    () => [
      ...data.trips.map(t => ({
        key: 't' + t.id,
        page: 'trips' as Page,
        id: t.id,
        icon: '✈️',
        img: t.cover,
        title: t.title,
        sub: [t.destination, fmtRange(t.startDate, t.endDate)].filter(Boolean).join(' · '),
        text: [t.title, t.destination, t.notes, t.status].join(' '),
      })),
      ...data.memories.map(m => ({
        key: 'm' + m.id,
        page: 'memories' as Page,
        id: m.id,
        icon: '📸',
        img: m.photos[0] ? thumbOf(m.photos[0]) : undefined,
        title: m.title,
        sub: [fmtDate(m.date), m.locationText].filter(Boolean).join(' · '),
        text: [m.title, m.body, m.locationText, ...m.tags, ...m.people].join(' '),
      })),
      ...data.places.map(p => ({
        key: 'p' + p.id,
        page: 'places' as Page,
        id: p.id,
        icon: p.status === 'visited' ? '📍' : '💭',
        title: p.name,
        sub: [p.country, p.status === 'wishlist' ? 'wishlist' : ''].filter(Boolean).join(' · '),
        text: [p.name, p.country, p.notes].join(' '),
      })),
      ...data.sitters.map(s => ({ key: 's' + s.id, page: 'sitters' as Page, id: s.id, icon: '🔑', title: s.name, sub: s.role, text: [s.name, s.role, s.notes].join(' ') })),
      ...data.docs.map(d => ({
        key: 'd' + d.id,
        page: 'wallet' as Page,
        id: d.id,
        icon: DOC_KINDS[d.kind].icon,
        title: d.label || DOC_KINDS[d.kind].label,
        sub: d.expires ? `Expires ${fmtDate(d.expires)}` : DOC_KINDS[d.kind].label,
        text: [d.label, d.holder, d.kind, DOC_KINDS[d.kind].label].join(' '),
      })),
      ...data.loyalty.map(l => ({ key: 'l' + l.id, page: 'wallet' as Page, id: l.id, icon: '🎫', title: l.program, sub: l.tier || 'Loyalty program', text: [l.program, l.tier].join(' ') })),
    ],
    [data],
  )

  const hits = useMemo<Hit[]>(() => {
    const n = q.trim().toLowerCase()
    if (!n) {
      const today = todayISO()
      const next = data.trips.filter(t => t.status !== 'completed' && t.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
      const recent = [...data.memories].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
      return [...PAGES, ...all.filter(h => (next && h.key === 't' + next.id) || recent.some(m => h.key === 'm' + m.id))]
    }
    const words = n.split(/\s+/)
    const score = (h: Hit) => {
      const t = h.title.toLowerCase()
      const body = (h.title + ' ' + h.sub + ' ' + h.text).toLowerCase()
      if (!words.every(w => body.includes(w))) return 0
      return (t.startsWith(n) ? 3 : t.includes(n) ? 2 : 1) + (h.page === 'trips' ? 0.2 : 0)
    }
    return [...PAGES, ...all]
      .map(h => ({ h, s: score(h) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 14)
      .map(x => x.h)
  }, [q, all, data])

  useEffect(() => setIdx(0), [q])
  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  const pick = (h: Hit) => {
    go(h.page, h.id)
    onClose()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx(i => Math.min(hits.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hits[idx]) pick(hits[idx])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="palette-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="palette" role="dialog" aria-label="Search everything">
        <div className="palette-input">
          <span className="palette-glyph">
            <Search size={22} strokeWidth={2.2} />
          </span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search trips, memories, places, people, documents…" />
          <kbd>esc</kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {hits.length === 0 && <div className="palette-empty">Nothing matches "{q}".</div>}
          {hits.map((h, i) => (
            <button type="button" key={h.key} data-i={i} className={'palette-hit' + (i === idx ? ' on' : '')} onMouseEnter={() => setIdx(i)} onClick={() => pick(h)}>
              {h.img ? <img src={h.img} alt="" /> : <span className="palette-ico">{h.icon}</span>}
              <span className="palette-text">
                <span className="palette-title">{h.title}</span>
                <span className="palette-sub">{h.sub}</span>
              </span>
              <span className="palette-kind">{h.id ? h.page : 'page'}</span>
            </button>
          ))}
        </div>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>ctrl</kbd>
            <kbd>k</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  )
}
