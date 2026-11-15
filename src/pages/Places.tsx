import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Memory, Page, Place, PlaceStatus } from '../lib/types'
import { useStore } from '../lib/store'
import { Empty, Field, Flag, Modal, PageHeader, Pill, Stars } from '../components/ui'
import { fmtDate, geocode, plural, reverseGeocode, thumbOf, todayISO, uid, type GeoResult } from '../lib/util'
import { Plus } from 'lucide-react'

const BASE = import.meta.env.BASE_URL
/** B16-D: visited = ember dot, wishlist = white dot with a teal ring, selected = ember teardrop with Scout. 44 px hit areas. */
const dot = (kind: PlaceStatus) => L.divIcon({ className: 'tb-pin', html: `<span class="tb-dot ${kind}"></span>`, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -18] })
const icons: Record<PlaceStatus | 'selected', L.DivIcon | L.Icon> = {
  visited: dot('visited'),
  wishlist: dot('wishlist'),
  selected: L.icon({ iconUrl: `${BASE}brand/map-pins/pin-selected-teardrop.svg`, iconSize: [48, 64], iconAnchor: [24, 62], popupAnchor: [0, -58], className: 'tb-pin-selected' }),
}

const photoIcon = (m: Memory) =>
  L.divIcon({
    className: 'pin-wrap',
    html: m.photos[0] ? `<div class="photo-pin"><img src="${thumbOf(m.photos[0])}" alt=""></div>` : '<div class="photo-pin txt">📝</div>',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  })

type Draft = Omit<Place, 'id' | 'createdAt'> & { id?: string; createdAt?: string }

export function Places({ focusId, clearFocus, go }: { focusId: string | null; clearFocus: () => void; go: (p: Page, id?: string) => void }) {
  const { data, update } = useStore()
  const [filter, setFilter] = useState<'all' | PlaceStatus>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(focusId)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [locating, setLocating] = useState(false)
  const [showMemories, setShowMemories] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)

  useEffect(() => {
    if (focusId) {
      const p = data.places.find(x => x.id === focusId)
      if (p) {
        setSelected(p.id)
        setFlyTo({ lat: p.lat, lng: p.lng, zoom: 8 })
      }
      clearFocus()
    }
  }, [focusId, clearFocus, data.places])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.places
      .filter(p => filter === 'all' || p.status === filter)
      .filter(p => !needle || p.name.toLowerCase().includes(needle) || p.country.toLowerCase().includes(needle))
      .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name))
  }, [data.places, filter, q])

  // Memories that can be placed: their own GPS, or the linked place (nudged so several at one place don't stack exactly).
  const memoryPins = useMemo(() => {
    const out: { m: Memory; lat: number; lng: number }[] = []
    const seen = new Map<string, number>()
    for (const m of data.memories) {
      let lat = m.lat
      let lng = m.lng
      if (lat === undefined || lng === undefined) {
        const p = data.places.find(x => x.id === m.placeId)
        if (!p) continue
        const k = seen.get(p.id) ?? 0
        seen.set(p.id, k + 1)
        const angle = (k * 2.4) % (Math.PI * 2)
        lat = p.lat + 0.012 * Math.sin(angle) * (1 + k * 0.15)
        lng = p.lng + 0.016 * Math.cos(angle) * (1 + k * 0.15)
      }
      out.push({ m, lat, lng })
    }
    return out
  }, [data.memories, data.places])

  const routes = useMemo(
    () =>
      data.trips
        .map(t => ({ t, pts: t.placeIds.map(id => data.places.find(p => p.id === id)).filter((p): p is Place => Boolean(p)) }))
        .filter(x => x.pts.length > 1),
    [data.trips, data.places],
  )

  const visitedCount = data.places.filter(p => p.status === 'visited').length
  const wishCount = data.places.length - visitedCount
  const memoriesAt = (id: string) => data.memories.filter(m => m.placeId === id).length

  const savePlace = (d: Draft) => {
    const place: Place = { ...d, id: d.id ?? uid(), createdAt: d.createdAt ?? new Date().toISOString() }
    update(s => ({
      ...s,
      places: s.places.some(p => p.id === place.id) ? s.places.map(p => (p.id === place.id ? place : p)) : [...s.places, place],
    }))
    setDraft(null)
    setAdding(false)
    setSelected(place.id)
    setFlyTo({ lat: place.lat, lng: place.lng, zoom: 7 })
  }

  const removePlace = (id: string) => {
    const linked = memoriesAt(id)
    if (!confirm(linked ? `Delete this place? ${plural(linked, 'memory', 'memories')} will stay but lose the link.` : 'Delete this place?')) return
    update(s => ({
      ...s,
      places: s.places.filter(p => p.id !== id),
      memories: s.memories.map(m => (m.placeId === id ? { ...m, placeId: undefined } : m)),
      trips: s.trips.map(t => ({ ...t, placeIds: t.placeIds.filter(x => x !== id) })),
    }))
    if (selected === id) setSelected(null)
  }

  const fromGeo = (g: GeoResult): Draft => ({ name: g.name, country: g.country, countryCode: g.countryCode, lat: g.lat, lng: g.lng, status: 'visited', rating: 0, notes: '' })

  const onMapClick = async (lat: number, lng: number) => {
    if (draft || adding) return
    setLocating(true)
    const g = await reverseGeocode(lat, lng).catch(() => null)
    setLocating(false)
    setDraft(g ? fromGeo({ ...g, lat, lng }) : { name: '', country: '', countryCode: '', lat, lng, status: 'visited', rating: 0, notes: '' })
  }

  const focus = (p: Place) => {
    setSelected(p.id)
    setFlyTo({ lat: p.lat, lng: p.lng, zoom: 7 })
  }

  return (
    <div className="page">
      <PageHeader
        title="Places"
        subtitle={data.places.length ? `${plural(visitedCount, 'place')} visited · ${plural(wishCount, 'wishlist spot')}` : 'Everywhere you have been and everywhere you want to go'}
        actions={
          <button type="button" className="btn primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add place
          </button>
        }
      />

      <div className="places-layout">
        <div className="map-wrap">
          <MapContainer center={[22, 10]} zoom={2} minZoom={2} worldCopyJump scrollWheelZoom style={{ height: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} crossOrigin="anonymous" />
            <FlyTo target={flyTo} />
            <ClickCatcher onClick={onMapClick} />
            <FitOnce places={data.places} skip={Boolean(focusId)} />
            {showRoutes &&
              routes.map(({ t, pts }) => (
                <Polyline
                  key={t.id}
                  positions={pts.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: t.status === 'completed' ? '#FF7A2F' : '#1F3B2D', weight: t.status === 'completed' ? 4 : 3, dashArray: t.status === 'completed' ? '10 6' : '8 8', opacity: t.status === 'completed' ? 0.9 : 0.6, lineCap: 'round' }}
                >
                  <Popup>
                    <b>✈️ {t.title}</b>
                    <div className="muted small">{pts.map(p => p.name).join(' → ')}</div>
                    <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => go('trips', t.id)}>
                      Open trip
                    </button>
                  </Popup>
                </Polyline>
              ))}
            {showMemories &&
              memoryPins.map(({ m, lat, lng }) => (
                <Marker key={m.id} position={[lat, lng]} icon={photoIcon(m)} zIndexOffset={-100} eventHandlers={{ click: () => go('memories', m.id) }}>
                  <Popup>
                    <b>{m.title}</b>
                    <div className="muted small">{fmtDate(m.date)}</div>
                  </Popup>
                </Marker>
              ))}
            {data.places.map(p => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={selected === p.id ? icons.selected : icons[p.status]} eventHandlers={{ click: () => setSelected(p.id) }}>
                <Popup>
                  <b>
                    <Flag cc={p.countryCode} /> {p.name}
                  </b>
                  <div className="muted small">{p.country}</div>
                  <div className="small" style={{ marginTop: 4 }}>
                    {p.status === 'visited' ? '✅ Visited' : '💭 Wishlist'}
                    {p.rating > 0 && ` · ${'★'.repeat(p.rating)}`}
                    {memoriesAt(p.id) > 0 && ` · ${plural(memoriesAt(p.id), 'memory', 'memories')}`}
                  </div>
                  {p.notes && (
                    <div className="small" style={{ marginTop: 4 }}>
                      {p.notes}
                    </div>
                  )}
                  <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setDraft(p)}>
                    Edit
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="map-hint">{locating ? 'Looking up that spot…' : 'Tip: click anywhere on the map to pin a place'}</div>
          {data.places.length > 0 && (
            <div className="map-legend">
              <span>
                <i style={{ background: 'var(--primary)' }} />
                Visited
              </span>
              <span>
                <i style={{ background: 'var(--accent)' }} />
                Wishlist
              </span>
              {memoryPins.length > 0 && (
                <button type="button" className={'legend-toggle' + (showMemories ? ' on' : '')} onClick={() => setShowMemories(v => !v)}>
                  📸 Memories
                </button>
              )}
              {routes.length > 0 && (
                <button type="button" className={'legend-toggle' + (showRoutes ? ' on' : '')} onClick={() => setShowRoutes(v => !v)}>
                  ✈️ Routes
                </button>
              )}
            </div>
          )}
        </div>

        <div className="side-panel">
          <div className="seg" style={{ alignSelf: 'stretch', display: 'flex' }}>
            {(['all', 'visited', 'wishlist'] as const).map(f => (
              <button type="button" key={f} className={filter === f ? 'active' : ''} style={{ flex: 1 }} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'visited' ? '✅ Visited' : '💭 Wishlist'}
              </button>
            ))}
          </div>
          {data.places.length > 3 && <input type="search" placeholder="Filter places…" value={q} onChange={e => setQ(e.target.value)} />}
          <div className="side-list">
            {data.places.length === 0 ? (
              <Empty icon="🗺️" title="Your map is blank" body="Search for a place or click the map to drop your first pin." />
            ) : list.length === 0 ? (
              <Empty icon="🔍" title="No matches" />
            ) : (
              list.map(p => (
                <div key={p.id} className={'place-item' + (selected === p.id ? ' on' : '')} onClick={() => focus(p)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && focus(p)}>
                  <span className="flag">
                    <Flag cc={p.countryCode} fallback={p.status === 'visited' ? '📍' : '💭'} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{p.name}</div>
                    <div className="ct">
                      {p.country}
                      {p.status === 'wishlist' && <Pill tone="accent"> wishlist</Pill>}
                      {p.rating > 0 && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>{'★'.repeat(p.rating)}</span>}
                      {memoriesAt(p.id) > 0 && <span style={{ marginLeft: 6 }}>· {plural(memoriesAt(p.id), 'memory', 'memories')}</span>}
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Edit"
                      onClick={e => {
                        e.stopPropagation()
                        setDraft(p)
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label="Delete"
                      onClick={e => {
                        e.stopPropagation()
                        removePlace(p.id)
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {adding && !draft && <SearchPlace onClose={() => setAdding(false)} onPick={g => setDraft(fromGeo(g))} />}

      {draft && (
        <PlaceForm
          draft={draft}
          onClose={() => {
            setDraft(null)
            setAdding(false)
          }}
          onSave={savePlace}
        />
      )}
    </div>
  )
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), target.zoom ?? 6), { duration: 0.8 })
  }, [target, map])
  return null
}

function FitOnce({ places, skip }: { places: Place[]; skip: boolean }) {
  const map = useMap()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (done) return
    if (places.length > 0 && !skip) {
      const b = L.latLngBounds(places.map(p => [p.lat, p.lng] as [number, number]))
      map.fitBounds(b.pad(0.3), { maxZoom: 6 })
    }
    setDone(true)
  }, [places, map, done, skip])
  return null
}

/** Map clicks pin a place, except the click that merely closes an open popup. */
function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const closedAt = useRef(0)
  useMapEvents({
    popupclose: () => {
      closedAt.current = Date.now()
    },
    click: e => {
      if (Date.now() - closedAt.current < 400) return
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function SearchPlace({ onClose, onPick }: { onClose: () => void; onPick: (g: GeoResult) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!q.trim()) return
    setBusy(true)
    setError('')
    try {
      const r = await geocode(q.trim())
      setResults(r)
      if (r.length === 0) setError('Nothing found. Try adding the country, or click the map instead.')
    } catch {
      setError('Search needs an internet connection. You can still click the map to pin a spot.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add a place" onClose={onClose}>
      <div className="form">
        <Field label="Search for a city, town, park, or landmark">
          <div className="search-row">
            <input type="search" autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder="Kyoto, Banff, Lisbon…" />
            <button type="button" className="btn primary" onClick={run} disabled={busy || !q.trim()}>
              {busy ? '…' : 'Search'}
            </button>
          </div>
        </Field>
        {error && <p className="muted small">{error}</p>}
        {results && results.length > 0 && (
          <div className="geo-results">
            {results.map((g, i) => (
              <button type="button" key={i} onClick={() => onPick(g)}>
                <Flag cc={g.countryCode} /> <b>{g.name}</b>
                <span className="d">{g.display}</span>
              </button>
            ))}
          </div>
        )}
        <p className="muted small">Search powered by OpenStreetMap. Or close this and click directly on the map.</p>
      </div>
    </Modal>
  )
}

function PlaceForm({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(draft)
  const [dirty, setDirty] = useState(false)
  const patch = (p: Partial<Draft>) => {
    setDirty(true)
    setD(x => ({ ...x, ...p }))
  }
  const isEdit = Boolean(draft.id)

  return (
    <Modal
      title={isEdit ? 'Edit place' : 'Pin this place'}
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!d.name.trim()} onClick={() => onSave({ ...d, name: d.name.trim(), country: d.country.trim() })}>
            {isEdit ? 'Save changes' : 'Add to map'}
          </button>
        </>
      }
    >
      <div className="form">
        <div className="row">
          <Field label="Name" grow>
            <input type="text" autoFocus value={d.name} onChange={e => patch({ name: e.target.value })} placeholder="Place name" />
          </Field>
          <Field label="Country">
            <input type="text" value={d.country} onChange={e => patch({ country: e.target.value })} placeholder="Country" />
          </Field>
        </div>
        <Field label="Status">
          <div className="radio-group">
            <label className={d.status === 'visited' ? 'on' : ''}>
              <input type="radio" name="status" checked={d.status === 'visited'} onChange={() => patch({ status: 'visited' })} />✅ Been there
            </label>
            <label className={d.status === 'wishlist' ? 'on' : ''}>
              <input type="radio" name="status" checked={d.status === 'wishlist'} onChange={() => patch({ status: 'wishlist' })} />💭 Want to go
            </label>
          </div>
        </Field>
        {d.status === 'visited' && (
          <div className="row">
            <Field label="Rating">
              <Stars value={d.rating} onChange={rating => patch({ rating })} />
            </Field>
            <Field label="First visited">
              <input type="date" value={d.firstVisited ?? ''} max={todayISO()} onChange={e => patch({ firstVisited: e.target.value || undefined })} />
            </Field>
          </div>
        )}
        <Field label="Notes">
          <textarea rows={3} value={d.notes} onChange={e => patch({ notes: e.target.value })} placeholder={d.status === 'visited' ? 'Favorite spot, what to skip, where to eat…' : 'Why it is on the list, best season, who recommended it…'} />
        </Field>
        <p className="muted small">
          📍 {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
          {d.firstVisited ? ` · first visited ${fmtDate(d.firstVisited)}` : ''}
        </p>
      </div>
    </Modal>
  )
}
