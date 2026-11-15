import { useCallback, useEffect, useState } from 'react'
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
import { Settings } from './pages/Settings'
import { Palette } from './components/Palette'
import { Home as HomeIcon, Camera, Map as MapIcon, Plane, KeyRound, IdCard, ChartColumn, Settings as SettingsIcon, Search, Menu, type LucideIcon } from 'lucide-react'
import { todayISO } from './lib/util'

const NAV: { id: Page; label: string; icon: LucideIcon; primary?: boolean }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon, primary: true },
  { id: 'memories', label: 'Memories', icon: Camera, primary: true },
  { id: 'places', label: 'Places', icon: MapIcon, primary: true },
  { id: 'trips', label: 'Trips', icon: Plane, primary: true },
  { id: 'sitters', label: 'Sitters', icon: KeyRound },
  { id: 'wallet', label: 'Wallet', icon: IdCard },
  { id: 'insights', label: 'Insights', icon: ChartColumn },
]

export default function App() {
  const { data, ready } = useStore()
  const [page, setPage] = useState<Page>('home')
  const [nonce, setNonce] = useState(0)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shared, setShared] = useState<Trip | null>(() => readShareFromUrl())

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

  const go = useCallback((p: Page, id?: string) => {
    setFocusId(id ?? null)
    setPage(p)
    setNonce(n => n + 1) // remount the page so nav clicks always land on that page's top level
    setMoreOpen(false)
    window.scrollTo({ top: 0 })
  }, [])
  const clearFocus = useCallback(() => setFocusId(null), [])

  if (!ready)
    return (
      <div className="loading">
        <div className="splash-mark">
          <Fox mood="excited" size={64} />
        </div>
        Scout is packing your bags…
      </div>
    )

  const counts: Partial<Record<Page, number>> = {
    memories: data.memories.length,
    places: data.places.length,
    trips: data.trips.length,
    sitters: data.sitters.length,
    wallet: data.docs.length + data.loyalty.length + data.contacts.length,
  }

  const secondary = NAV.filter(n => !n.primary)
  const moreActive = secondary.some(n => n.id === page)
  const today = todayISO()
  const activeTrip = data.trips.find(t => t.status !== 'completed' && t.startDate && t.endDate && t.startDate <= today && t.endDate >= today)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Fox mood="happy" size={34} />
          </span>
          <span className="brand-text">
            TravelBud
            <small>all things travel</small>
          </span>
        </div>
        <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
          <span>
            <Search size={16} strokeWidth={2.2} />
          </span>
          <span className="search-trigger-label">Search anything</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav>
          {NAV.map(n => (
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
          <button type="button" className="nav-item" onClick={() => setSettingsOpen(true)}>
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
          {page === 'sitters' && <Sitters />}
          {page === 'wallet' && <Wallet />}
          {page === 'insights' && <Insights />}
        </div>
      </main>

      <nav className="bottom-nav">
        {NAV.filter(n => n.primary).map(n => (
          <button key={n.id} type="button" className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
            <span className="ico">
                <n.icon size={18} strokeWidth={2} />
              </span>
            {n.label}
          </button>
        ))}
        <button type="button" className={moreActive || moreOpen ? 'active' : ''} onClick={() => setMoreOpen(v => !v)}>
          <span className="ico">
            <Menu size={18} strokeWidth={2} />
          </span>
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="nav-item"
              onClick={() => {
                setMoreOpen(false)
                setPaletteOpen(true)
              }}
            >
              <span className="ico">
                <Search size={18} strokeWidth={2} />
              </span>
              Search anything
            </button>
            {secondary.map(n => (
              <button key={n.id} type="button" className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => go(n.id)}>
                <span className="ico">
                <n.icon size={18} strokeWidth={2} />
              </span>
                {n.label}
                {(counts[n.id] ?? 0) > 0 && <span className="count">{counts[n.id]}</span>}
              </button>
            ))}
            <button
              type="button"
              className="nav-item"
              onClick={() => {
                setMoreOpen(false)
                setSettingsOpen(true)
              }}
            >
              <span className="ico">
              <SettingsIcon size={18} strokeWidth={2} />
            </span>
              Settings & backup
            </button>
          </div>
        </div>
      )}

      <button type="button" className="fab" aria-label="Capture a moment" title="Capture a moment" onClick={() => go('memories', activeTrip ? `new:${activeTrip.id}` : 'new')}>
        <Camera size={26} strokeWidth={2.2} />
      </button>
      <span className="fab-label">Capture</span>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} go={go} />}
      {shared && <SharedTrip trip={shared} onClose={() => setShared(null)} />}
    </div>
  )
}
