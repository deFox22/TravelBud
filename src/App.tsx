import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page, Trip } from './lib/types'
import { Fox } from './components/Fox'
import { SharedTrip } from './components/SharedTrip'
import { readShareFromUrl } from './lib/share'
import { useStore } from './lib/store'
import { Home } from './pages/Home'
import { Memories } from './pages/Memories'
import { Places } from './pages/Places'
import { Trips } from './pages/Trips'
import { Sitters } from './pages/Sitters'
import { Wallet } from './pages/Wallet'
import { Insights } from './pages/Insights'
import { Badges } from './pages/Badges'
import { Me } from './pages/Me'
import { Settings } from './pages/Settings'
import { Palette } from './components/Palette'
import { UnlockToast } from './components/Toast'
import { BADGES, earnedIds, type BadgeDef } from './lib/badges'
import { Home as HomeIcon, Camera, Map as MapIcon, Route, Award, User, KeyRound, IdCard, ChartColumn, Settings as SettingsIcon, Search, type LucideIcon } from 'lucide-react'
import { todayISO } from './lib/util'

/* Five tabs, as the kit lays them out: Home, Trail, Places, Badges, Me.
   Everything else lives on the sidebar on wide screens and behind Me on a phone. */
const NAV: { id: Page; label: string; icon: LucideIcon; tab?: boolean }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon, tab: true },
  { id: 'trips', label: 'Trail', icon: Route, tab: true },
  { id: 'places', label: 'Places', icon: MapIcon, tab: true },
  { id: 'badges', label: 'Badges', icon: Award, tab: true },
  { id: 'me', label: 'Me', icon: User, tab: true },
  { id: 'memories', label: 'Memories', icon: Camera },
  { id: 'wallet', label: 'Wallet', icon: IdCard },
  { id: 'sitters', label: 'Sitters', icon: KeyRound },
  { id: 'insights', label: 'Insights', icon: ChartColumn },
]

export default function App() {
  const { data, ready, update } = useStore()
  const [page, setPage] = useState<Page>('home')
  const [nonce, setNonce] = useState(0)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shared, setShared] = useState<Trip | null>(() => readShareFromUrl())
  const [toasts, setToasts] = useState<BadgeDef[]>([])

  // Theme: 'auto' leaves it to the OS, otherwise pin it on <html>.
  const theme = data.profile.theme
  useEffect(() => {
    const el = document.documentElement
    if (theme === 'auto') delete el.dataset.theme
    else el.dataset.theme = theme
  }, [theme])

  // Ctrl/Cmd+K opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Badge engine: whenever the data changes, any badge newly earned is recorded and announced.
  // The first run on an existing collection records silently, so an upgrade doesn't fire nine toasts.
  const seeded = useRef(false)
  useEffect(() => {
    if (!ready) return
    const have = new Set((data.profile.badges ?? []).map(b => b.id))
    const fresh = earnedIds(data).filter(id => !have.has(id))
    if (fresh.length === 0) {
      seeded.current = true
      return
    }
    const quiet = !seeded.current && data.profile.badges === undefined && fresh.length > 1
    seeded.current = true
    const today = todayISO()
    update(d => ({ ...d, profile: { ...d.profile, badges: [...(d.profile.badges ?? []), ...fresh.map(id => ({ id, earnedAt: today }))] } }))
    if (!quiet) setToasts(t => [...t, ...BADGES.filter(b => fresh.includes(b.id))])
  }, [data, ready, update])
  const popToast = useCallback(() => setToasts(t => t.slice(1)), [])

  const go = useCallback((p: Page, id?: string) => {
    setFocusId(id ?? null)
    setPage(p)
    setNonce(n => n + 1) // remount the page so nav clicks always land on that page's top level
    window.scrollTo({ top: 0 })
  }, [])
  const clearFocus = useCallback(() => setFocusId(null), [])
  const openSettings = useCallback(() => setSettingsOpen(true), [])

  if (!ready)
    return (
      <div className="loading">
        <div className="walk">
          <svg viewBox="0 0 260 40" aria-hidden="true">
            <path d="M4 30 C 60 6, 110 6, 130 22" fill="none" stroke="var(--tb-primary)" strokeWidth="5" strokeLinecap="round" />
            <path d="M130 22 C 160 40, 210 36, 256 14" fill="none" stroke="var(--tb-text-muted)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
          </svg>
          <Fox mood="happy" size={110} />
        </div>
        Packing your bag…
        <span className="muted">Getting your trail ready</span>
      </div>
    )

  const counts: Partial<Record<Page, number>> = {
    memories: data.memories.length,
    places: data.places.length,
    trips: data.trips.length,
    sitters: data.sitters.length,
    wallet: data.docs.length + data.loyalty.length + data.contacts.length,
    badges: data.profile.badges?.length || undefined,
  }

  const today = todayISO()
  const activeTrip = data.trips.find(t => t.status !== 'completed' && t.startDate && t.endDate && t.startDate <= today && t.endDate >= today)
  const tabs = NAV.filter(n => n.tab)
  const more = NAV.filter(n => !n.tab)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-lockup forest" src={`${import.meta.env.BASE_URL}brand/logo/travelbud-lockup-horizontal-forest.svg`} alt="TravelBud" />
          <img className="brand-lockup cream" src={`${import.meta.env.BASE_URL}brand/logo/travelbud-lockup-horizontal-cream.svg`} alt="" aria-hidden="true" />
        </div>
        <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
          <span>
            <Search size={16} strokeWidth={2.2} />
          </span>
          <span className="search-trigger-label">Search anything</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav>
          {tabs.map(n => (
            <button key={n.id} type="button" className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => go(n.id)}>
              <span className="ico">
                <n.icon size={18} strokeWidth={2} />
              </span>
              {n.label}
              {(counts[n.id] ?? 0) > 0 && <span className="count">{counts[n.id]}</span>}
            </button>
          ))}
          <span className="nav-group">Also</span>
          {more.map(n => (
            <button key={n.id} type="button" className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => go(n.id)}>
              <span className="ico">
                <n.icon size={18} strokeWidth={2} />
              </span>
              {n.label}
              {(counts[n.id] ?? 0) > 0 && <span className="count">{counts[n.id]}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="nav-item" onClick={openSettings}>
            <span className="ico">
              <SettingsIcon size={18} strokeWidth={2} />
            </span>
            Settings & backup
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="page-enter" key={page + nonce}>
          {page === 'home' && <Home go={go} />}
          {page === 'memories' && <Memories focusId={focusId} clearFocus={clearFocus} />}
          {page === 'places' && <Places focusId={focusId} clearFocus={clearFocus} go={go} />}
          {page === 'trips' && <Trips focusId={focusId} clearFocus={clearFocus} go={go} />}
          {page === 'badges' && <Badges go={go} />}
          {page === 'me' && <Me go={go} openSettings={openSettings} />}
          {page === 'sitters' && <Sitters />}
          {page === 'wallet' && <Wallet />}
          {page === 'insights' && <Insights />}
        </div>
      </main>

      <nav className="bottom-nav">
        {tabs.map(n => {
          const on = page === n.id || (n.id === 'me' && more.some(m => m.id === page))
          return (
            <button key={n.id} type="button" className={on ? 'active' : ''} onClick={() => go(n.id)}>
              <span className="ico">
                <n.icon size={18} strokeWidth={2} />
              </span>
              {n.label}
            </button>
          )
        })}
      </nav>

      <button type="button" className="fab" aria-label="Capture a moment" title="Capture a moment" onClick={() => go('memories', activeTrip ? `new:${activeTrip.id}` : 'new')}>
        <Camera size={26} strokeWidth={2.2} />
      </button>
      <span className="fab-label">Capture</span>

      {toasts[0] && (
        <UnlockToast
          key={toasts[0].id}
          badge={toasts[0]}
          onClose={popToast}
          onOpen={() => {
            popToast()
            go('badges')
          }}
        />
      )}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} go={go} />}
      {shared && <SharedTrip trip={shared} onClose={() => setShared(null)} />}
    </div>
  )
}
