import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import type { AppData, HomeGuide, Sitter, Trip } from './types'
import { backupPermission, getBackupFolder, writeBackup } from './backup'

const KEY = 'travelbud:data'

export const emptyHome = (): HomeGuide => ({
  address: '',
  wifiName: '',
  wifiPassword: '',
  alarmCode: '',
  keyInfo: '',
  trashDay: '',
  thermostat: '',
  parking: '',
  plants: '',
  quirks: '',
  pets: [],
  vendors: [],
})

export const emptyData = (): AppData => ({
  version: 1,
  places: [],
  memories: [],
  trips: [],
  sitters: [],
  docs: [],
  loyalty: [],
  contacts: [],
  home: emptyHome(),
  profile: { name: '', homeBase: '', theme: 'auto' },
})

/** Fill in anything missing so older or hand-edited backups still load. */
export function normalize(d: Partial<AppData> | null | undefined): AppData {
  const base = emptyData()
  if (!d || typeof d !== 'object') return base
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  return {
    ...base,
    ...d,
    version: 1,
    places: arr(d.places),
    memories: arr(d.memories),
    trips: arr<Partial<Trip>>(d.trips).map(
      t =>
        ({
          placeIds: [],
          expenses: [],
          itinerary: [],
          packing: [],
          bookings: [],
          ideas: [],
          budget: 0,
          currency: 'USD',
          notes: '',
          ...t,
        }) as Trip,
    ),
    sitters: arr<Partial<Sitter>>(d.sitters).map(s => ({ stints: [], ...s }) as Sitter),
    docs: arr(d.docs),
    loyalty: arr(d.loyalty),
    contacts: arr(d.contacts),
    home: { ...emptyHome(), ...(d.home ?? {}), pets: arr(d.home?.pets), vendors: arr(d.home?.vendors) },
    profile: { ...base.profile, ...(d.profile ?? {}) },
  }
}

type Updater = (d: AppData) => AppData

interface StoreValue {
  data: AppData
  ready: boolean
  update: (fn: Updater) => void
  replace: (d: AppData) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  // Load once from IndexedDB.
  useEffect(() => {
    let cancelled = false
    get<AppData>(KEY)
      .then(saved => {
        if (cancelled) return
        if (saved) setData(normalize(saved))
        loaded.current = true
        setReady(true)
      })
      .catch(err => {
        console.error('Could not load saved data', err)
        loaded.current = true
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Persist (debounced) whenever data changes after the initial load.
  useEffect(() => {
    if (!loaded.current) return
    const t = setTimeout(() => {
      set(KEY, data).catch(err => console.error('Could not save data', err))
    }, 250)
    return () => clearTimeout(t)
  }, [data])

  // Folder backup, a little later, when a folder was chosen and the browser still allows it.
  const dirty = useRef(false)
  useEffect(() => {
    if (!loaded.current) return
    dirty.current = true
    const t = setTimeout(async () => {
      if (!dirty.current) return
      const h = await getBackupFolder()
      if (!h || (await backupPermission(h)) !== 'granted') return
      try {
        await writeBackup(h, data)
        dirty.current = false
        const today = new Date().toISOString().slice(0, 10)
        if (data.profile.lastBackup !== today) setData(d => ({ ...d, profile: { ...d.profile, lastBackup: today } }))
      } catch (err) {
        console.warn('Folder backup failed', err)
      }
    }, 15_000)
    return () => clearTimeout(t)
  }, [data])

  const update = useCallback((fn: Updater) => setData(d => fn(d)), [])
  const replace = useCallback((d: AppData) => setData(normalize(d)), [])

  return <StoreContext.Provider value={{ data, ready, update, replace }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}
