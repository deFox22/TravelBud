import { useEffect, useMemo, useState } from 'react'
import type { Memory, Photo, Place, Trip } from '../lib/types'
import { useStore } from '../lib/store'
import { Empty, Field, Flag, Modal, PageHeader, Pill, TagInput } from '../components/ui'
import { Slideshow } from '../components/Slideshow'
import { Plus, Play } from 'lucide-react'
import { fmtDate, isHeic, makePhoto, plural, readExif, reverseGeocode, thumbOf, todayISO, uid } from '../lib/util'

export function Memories({ focusId, clearFocus }: { focusId: string | null; clearFocus: () => void }) {
  const { data, update } = useStore()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [editing, setEditing] = useState<Memory | 'new' | null>(focusId?.startsWith('new') ? 'new' : null)
  const [preset, setPreset] = useState<Partial<Memory>>(() => presetFrom(focusId))
  const [viewingId, setViewingId] = useState<string | null>(focusId && !focusId.startsWith('new') ? focusId : null)
  const [view, setView] = useState<'grid' | 'timeline'>('grid')
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!focusId) return
    if (focusId.startsWith('new')) {
      setPreset(presetFrom(focusId))
      setEditing('new')
    } else setViewingId(focusId)
    clearFocus()
  }, [focusId, clearFocus])

  const allTags = useMemo(() => Array.from(new Set(data.memories.flatMap(m => m.tags))).sort(), [data.memories])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.memories
      .filter(m => !favOnly || m.favorite)
      .filter(m => !tag || m.tags.includes(tag))
      .filter(m => !needle || [m.title, m.body, m.locationText, ...m.people, ...m.tags].some(s => s.toLowerCase().includes(needle)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.memories, q, tag, favOnly])

  const save = (m: Memory) =>
    update(d => ({
      ...d,
      memories: d.memories.some(x => x.id === m.id) ? d.memories.map(x => (x.id === m.id ? m : x)) : [m, ...d.memories],
    }))

  const remove = (id: string) => {
    if (!confirm('Delete this memory and its photos? This cannot be undone.')) return
    update(d => ({ ...d, memories: d.memories.filter(x => x.id !== id) }))
    setViewingId(null)
  }

  const toggleFav = (id: string) => update(d => ({ ...d, memories: d.memories.map(x => (x.id === id ? { ...x, favorite: !x.favorite } : x)) }))

  const viewing = data.memories.find(m => m.id === viewingId) ?? null
  const placeOf = (m: Memory) => data.places.find(p => p.id === m.placeId)
  const tripOf = (m: Memory) => data.trips.find(t => t.id === m.tripId)

  return (
    <div className="page">
      <PageHeader
        title="Memories"
        subtitle={data.memories.length ? `${plural(data.memories.length, 'memory', 'memories')} worth keeping` : 'Your travel journal'}
        actions={
          <button type="button" className="btn primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> New memory
          </button>
        }
      />

      {data.memories.length > 0 && (
        <div className="toolbar">
          <input className="search" type="search" placeholder="Search titles, notes, people, places…" value={q} onChange={e => setQ(e.target.value)} />
          {allTags.length > 0 && (
            <select value={tag} onChange={e => setTag(e.target.value)} style={{ width: 'auto' }}>
              <option value="">All tags</option>
              {allTags.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <button type="button" className={'btn' + (favOnly ? ' primary' : '')} onClick={() => setFavOnly(v => !v)}>
            ★ Favorites
          </button>
          {list.some(m => m.photos.length) && (
            <button type="button" className="btn" onClick={() => setPlaying(true)} title="Play the photos in view as a slideshow">
              <Play size={14} /> Slideshow
            </button>
          )}
          <div className="seg">
            <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
              ▦ Grid
            </button>
            <button type="button" className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>
              ☰ Timeline
            </button>
          </div>
        </div>
      )}

      {data.memories.length === 0 ? (
        <Empty
          icon="📸"
          title="No memories yet"
          body="Add photos and the date and location fill themselves in from the picture. Then write a few words about what it was like."
          action={
            <button type="button" className="btn primary" onClick={() => setEditing('new')}>
              Add your first memory
            </button>
          }
        />
      ) : list.length === 0 ? (
        <Empty icon="🔍" title="Nothing matches" body="Try a different search or clear the filters." />
      ) : view === 'timeline' ? (
        <Timeline list={list} onOpen={setViewingId} placeOf={placeOf} />
      ) : (
        <div className="grid">
          {list.map(m => (
            <button type="button" key={m.id} className="card memory-card" onClick={() => setViewingId(m.id)}>
              <div className="cover-wrap">
                {m.photos[0] ? <img className="cover" src={thumbOf(m.photos[0])} alt="" loading="lazy" /> : <div className="no-cover">📝</div>}
                <span className="chip-over">{fmtDate(m.date, { year: undefined })}</span>
                {m.photos.length > 1 && <span className="chip-over br dark">{m.photos.length} 📷</span>}
              </div>
              {m.favorite && <span className="fav">★</span>}
              <div className="body">
                <h3>{m.title}</h3>
                <div className="meta">
                  <span>{m.date.slice(0, 4)}</span>
                  {m.locationText && (
                    <span>
                      <Flag cc={placeOf(m)?.countryCode} /> {m.locationText}
                    </span>
                  )}
                </div>
                {m.body && <p className="excerpt">{m.body}</p>}
                {m.tags.length > 0 && (
                  <div className="pills" style={{ marginTop: 4 }}>
                    {m.tags.slice(0, 3).map(t => (
                      <Pill key={t} tone="teal">
                        {t}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {playing && (
        <Slideshow
          slides={list.flatMap(m => m.photos.map(p => ({ src: p.dataUrl, title: m.title, sub: [fmtDate(m.date), m.locationText].filter(Boolean).join(' · ') })))}
          onClose={() => setPlaying(false)}
        />
      )}

      {editing && (
        <MemoryForm
          initial={editing === 'new' ? undefined : editing}
          preset={editing === 'new' ? preset : undefined}
          places={data.places}
          trips={data.trips}
          onSave={m => {
            save(m)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {viewing && !editing && (
        <MemoryView memory={viewing} place={placeOf(viewing)} trip={tripOf(viewing)} onClose={() => setViewingId(null)} onEdit={() => setEditing(viewing)} onDelete={() => remove(viewing.id)} onFav={() => toggleFav(viewing.id)} />
      )}
    </div>
  )
}

function MemoryForm({ initial, preset, places, trips, onSave, onClose }: { initial?: Memory; preset?: Partial<Memory>; places: Place[]; trips: Trip[]; onSave: (m: Memory) => void; onClose: () => void }) {
  const [m, setM] = useState<Memory>(
    () =>
      initial ?? {
        id: uid(),
        title: '',
        date: todayISO(),
        locationText: '',
        body: '',
        photos: [],
        people: [],
        tags: [],
        favorite: false,
        createdAt: new Date().toISOString(),
        ...preset,
      },
  )
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<string>('')
  const [skipped, setSkipped] = useState<string[]>([])
  const [autoNote, setAutoNote] = useState('')
  const [dateTouched, setDateTouched] = useState(Boolean(initial))
  const patch = (p: Partial<Memory>) => {
    setDirty(true)
    setM(x => ({ ...x, ...p }))
  }

  const tripForDate = (date: string) => trips.find(t => t.startDate && t.endDate && t.startDate <= date && t.endDate >= date)

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setDirty(true)
    const list = Array.from(files)
    const out: Photo[] = []
    const bad: string[] = []
    let meta: { date?: string; lat?: number; lng?: number } = {}
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      setBusy(`Processing photo ${i + 1} of ${list.length}…`)
      try {
        const [photo, exif] = await Promise.all([makePhoto(f), readExif(f)])
        out.push(photo)
        if (!meta.date && exif.date) meta.date = exif.date
        if (meta.lat === undefined && exif.lat !== undefined) meta = { ...meta, lat: exif.lat, lng: exif.lng }
      } catch {
        bad.push(f.name + (isHeic(f) ? ' (HEIC)' : ''))
      }
    }
    setBusy('')
    if (bad.length) setSkipped(s => [...s, ...bad])
    const notes: string[] = []
    setM(x => {
      const next: Memory = { ...x, photos: [...x.photos, ...out] }
      if (meta.date && !dateTouched && !initial) {
        next.date = meta.date
        notes.push(`date set to ${fmtDate(meta.date)}`)
        const t = tripForDate(meta.date)
        if (t && !next.tripId) {
          next.tripId = t.id
          notes.push(`linked to ${t.title}`)
        }
      }
      if (meta.lat !== undefined && meta.lng !== undefined && next.lat === undefined) {
        next.lat = meta.lat
        next.lng = meta.lng
        notes.push('location pinned from the photo')
      }
      return next
    })
    if (notes.length) setAutoNote(notes.join(', ') + '.')
    if (meta.lat !== undefined && meta.lng !== undefined && !m.locationText && !m.placeId) {
      const g = await reverseGeocode(meta.lat, meta.lng).catch(() => null)
      if (g) setM(x => (x.locationText ? x : { ...x, locationText: [g.name, g.country].filter(Boolean).join(', ') }))
    }
  }

  const pickPlace = (id: string) => {
    const p = places.find(x => x.id === id)
    patch({ placeId: id || undefined, locationText: p ? [p.name, p.country].filter(Boolean).join(', ') : m.locationText })
  }

  const canSave = m.title.trim().length > 0 && !busy

  return (
    <Modal
      title={initial ? 'Edit memory' : 'New memory'}
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <button type="button" className="btn" onClick={() => (!dirty || confirm('Discard your changes?')) && onClose()}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!canSave} onClick={() => onSave({ ...m, title: m.title.trim() })}>
            {busy ? 'Processing photos…' : 'Save memory'}
          </button>
        </>
      }
    >
      <div className="form">
        <Field label="Photos" hint={autoNote ? `From your photos: ${autoNote}` : 'Add photos first and the date and location fill in automatically.'}>
          <div className="photo-grid">
            {m.photos.map(ph => (
              <div className="ph" key={ph.id}>
                <img src={thumbOf(ph)} alt="" />
                <button type="button" onClick={() => patch({ photos: m.photos.filter(x => x.id !== ph.id) })} aria-label="Remove photo">
                  ✕
                </button>
              </div>
            ))}
            <label className="add">
              <input type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} disabled={Boolean(busy)} />
              <span>{busy ? '…' : '+ Add'}</span>
            </label>
          </div>
          {busy && <span className="hint">{busy}</span>}
          {skipped.length > 0 && (
            <span className="hint" style={{ color: 'var(--danger)' }}>
              Couldn't read {skipped.length === 1 ? skipped[0] : `${skipped.length} files (${skipped.slice(0, 2).join(', ')}…)`}. HEIC photos from iPhone need converting to JPEG first.
            </span>
          )}
        </Field>
        <Field label="Title">
          <input type="text" autoFocus value={m.title} onChange={e => patch({ title: e.target.value })} placeholder="Sunrise over Haleakalā" />
        </Field>
        <div className="row">
          <Field label="Date">
            <input
              type="date"
              value={m.date}
              onChange={e => {
                setDateTouched(true)
                patch({ date: e.target.value })
              }}
            />
          </Field>
          <Field label="Trip">
            <select value={m.tripId ?? ''} onChange={e => patch({ tripId: e.target.value || undefined })}>
              <option value="">— none —</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row">
          <Field label="Linked place" hint={places.length ? undefined : 'Add places on the map to link them'}>
            <select value={m.placeId ?? ''} onChange={e => pickPlace(e.target.value)}>
              <option value="">— none —</option>
              {places.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.country ? `, ${p.country}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Where" hint={m.lat !== undefined ? `📍 ${m.lat.toFixed(3)}, ${m.lng?.toFixed(3)} from the photo` : undefined}>
            <input type="text" value={m.locationText} onChange={e => patch({ locationText: e.target.value })} placeholder="Town, region, or a spot only you'd know" />
          </Field>
        </div>
        <Field label="The story">
          <textarea value={m.body} onChange={e => patch({ body: e.target.value })} placeholder="What happened, what it felt like, what you'd tell someone going there…" rows={5} />
        </Field>
        <div className="row">
          <Field label="Who was there">
            <TagInput value={m.people} onChange={people => patch({ people })} placeholder="Names, press Enter" />
          </Field>
          <Field label="Tags">
            <TagInput value={m.tags} onChange={tags => patch({ tags })} placeholder="food, hike, beach…" />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={m.favorite} onChange={e => patch({ favorite: e.target.checked })} />
          Mark as a favorite
        </label>
      </div>
    </Modal>
  )
}

function MemoryView({
  memory: m,
  place,
  trip,
  onClose,
  onEdit,
  onDelete,
  onFav,
}: {
  memory: Memory
  place?: Place
  trip?: Trip
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onFav: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const n = m.photos.length
  const photo = m.photos[Math.min(idx, n - 1)]
  const prev = () => setIdx(i => (i - 1 + n) % n)
  const next = () => setIdx(i => (i + 1) % n)

  useEffect(() => {
    if (n < 2 && !lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape' && lightbox) {
        e.stopImmediatePropagation()
        setLightbox(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, lightbox])

  return (
    <Modal
      wide
      title={m.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn danger left" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="btn" onClick={onFav}>
            {m.favorite ? '★ Favorited' : '☆ Favorite'}
          </button>
          <button type="button" className="btn primary" onClick={onEdit}>
            Edit
          </button>
        </>
      }
    >
      <div className="meta-line">
        <span>📅 {fmtDate(m.date, { weekday: 'long' })}</span>
        {m.locationText && (
          <span>
            📍 <Flag cc={place?.countryCode} /> {m.locationText}
          </span>
        )}
        {trip && <span>✈️ {trip.title}</span>}
        {m.people.length > 0 && <span>👥 {m.people.join(', ')}</span>}
      </div>
      {m.tags.length > 0 && (
        <div className="pills" style={{ marginTop: 10 }}>
          {m.tags.map(t => (
            <Pill key={t} tone="teal">
              {t}
            </Pill>
          ))}
        </div>
      )}
      {photo && (
        <div className="gallery" style={{ marginTop: 14 }}>
          <div className="gallery-main">
            <img className="main" src={photo.dataUrl} alt="" onClick={() => setLightbox(true)} />
            {n > 1 && (
              <>
                <button type="button" className="gallery-nav prev" onClick={prev} aria-label="Previous photo">
                  ‹
                </button>
                <button type="button" className="gallery-nav next" onClick={next} aria-label="Next photo">
                  ›
                </button>
                <span className="gallery-count">
                  {idx + 1} / {n}
                </span>
              </>
            )}
            <button type="button" className="gallery-full" onClick={() => setLightbox(true)} aria-label="View full screen">
              ⤢
            </button>
          </div>
          {n > 1 && (
            <div className="thumbs">
              {m.photos.map((p, i) => (
                <img key={p.id} src={thumbOf(p)} alt="" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} />
              ))}
            </div>
          )}
        </div>
      )}
      {m.body && <p className="memory-body">{m.body}</p>}
      {!m.body && !photo && (
        <p className="muted" style={{ marginTop: 14 }}>
          No notes or photos yet. Hit Edit to add some.
        </p>
      )}

      {lightbox && photo && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <img src={photo.dataUrl} alt="" onClick={e => e.stopPropagation()} />
          {n > 1 && (
            <>
              <button
                type="button"
                className="gallery-nav prev"
                onClick={e => {
                  e.stopPropagation()
                  prev()
                }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-nav next"
                onClick={e => {
                  e.stopPropagation()
                  next()
                }}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}
          <div className="lightbox-caption">
            {m.title}
            {n > 1 && ` · ${idx + 1} / ${n}`}
          </div>
          <button type="button" className="lightbox-close" aria-label="Close">
            ✕
          </button>
        </div>
      )}
    </Modal>
  )
}

function Timeline({ list, onOpen, placeOf }: { list: Memory[]; onOpen: (id: string) => void; placeOf: (m: Memory) => Place | undefined }) {
  const years = Array.from(new Set(list.map(m => m.date.slice(0, 4))))
  return (
    <div className="timeline">
      {years.map(y => (
        <section key={y} className="tl-year">
          <h2>{y}</h2>
          <div className="tl-items">
            {list
              .filter(m => m.date.startsWith(y))
              .map(m => (
                <button type="button" key={m.id} className="tl-item" onClick={() => onOpen(m.id)}>
                  <span className="tl-date">{fmtDate(m.date, { year: undefined })}</span>
                  <span className="tl-dot" />
                  <span className="tl-body">
                    {m.photos[0] ? <img src={thumbOf(m.photos[0])} alt="" loading="lazy" /> : <span className="tl-noimg">📝</span>}
                    <span>
                      <span className="tl-title">
                        {m.favorite && <span style={{ color: 'var(--gold)' }}>★ </span>}
                        {m.title}
                      </span>
                      {m.locationText && (
                        <span className="muted small" style={{ display: 'block' }}>
                          <Flag cc={placeOf(m)?.countryCode} /> {m.locationText}
                        </span>
                      )}
                      {m.body && <span className="excerpt">{m.body}</span>}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** 'new' opens a blank memory; 'new:<tripId>' links it to that trip. */
function presetFrom(focusId: string | null): Partial<Memory> {
  if (!focusId || !focusId.startsWith('new')) return {}
  const tripId = focusId.split(':')[1]
  return tripId ? { tripId } : {}
}
