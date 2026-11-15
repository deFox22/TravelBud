import { useMemo, useState } from 'react'
import type { Sitter, SitterRole, SitterStint } from '../lib/types'
import { useStore } from '../lib/store'
import { Empty, Field, Modal, PageHeader, Pill, Stars } from '../components/ui'
import { HomeGuideForm } from './HomeGuide'
import { Plus, House } from 'lucide-react'
import { fmtRange, plural, uid } from '../lib/util'

const ROLES: Record<SitterRole, { label: string; icon: string }> = {
  housesitter: { label: 'Housesitter', icon: '🏠' },
  petsitter: { label: 'Pet sitter', icon: '🐾' },
  neighbor: { label: 'Neighbor', icon: '🏘️' },
  family: { label: 'Family', icon: '👨‍👩‍👧' },
  friend: { label: 'Friend', icon: '🤝' },
  other: { label: 'Other', icon: '👤' },
}

export function Sitters() {
  const { data, update } = useStore()
  const [role, setRole] = useState<'all' | SitterRole>('all')
  const [editing, setEditing] = useState<Sitter | 'new' | null>(null)
  const [guide, setGuide] = useState(false)

  const list = useMemo(
    () =>
      data.sitters
        .filter(s => role === 'all' || s.role === role)
        .sort((a, b) => Number(b.trusted) - Number(a.trusted) || b.rating - a.rating || a.name.localeCompare(b.name)),
    [data.sitters, role],
  )

  const save = (s: Sitter) =>
    update(d => ({ ...d, sitters: d.sitters.some(x => x.id === s.id) ? d.sitters.map(x => (x.id === s.id ? s : x)) : [...d.sitters, s] }))

  const remove = (s: Sitter) => {
    if (!confirm(`Remove ${s.name}?`)) return
    update(d => ({ ...d, sitters: d.sitters.filter(x => x.id !== s.id), trips: d.trips.map(t => (t.sitterId === s.id ? { ...t, sitterId: undefined } : t)) }))
  }

  const tripName = (id?: string) => data.trips.find(t => t.id === id)?.title
  const usedRoles = Array.from(new Set(data.sitters.map(s => s.role)))

  return (
    <div className="page">
      <PageHeader
        title="Sitters & trusted people"
        subtitle={data.sitters.length ? `${plural(data.sitters.filter(s => s.trusted).length, 'trusted sitter')} · ${plural(data.sitters.length, 'contact')} total` : 'Who looks after home while you are away'}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setGuide(true)}>
              <House size={15} /> Home guide
            </button>
            <button type="button" className="btn primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> Add person
            </button>
          </>
        }
      />

      {guide && <HomeGuideForm onClose={() => setGuide(false)} />}

      {usedRoles.length > 1 && (
        <div className="seg">
          <button type="button" className={role === 'all' ? 'active' : ''} onClick={() => setRole('all')}>
            All
          </button>
          {usedRoles.map(r => (
            <button type="button" key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>
              {ROLES[r].icon} {ROLES[r].label}
            </button>
          ))}
        </div>
      )}

      {data.sitters.length === 0 ? (
        <Empty
          icon="🔑"
          title="No sitters saved"
          body="Keep your trusted housesitters, pet sitters, and the neighbor with a spare key in one place, with ratings, notes, and a history of when they have helped."
          action={
            <button type="button" className="btn primary" onClick={() => setEditing('new')}>
              Add your first sitter
            </button>
          }
        />
      ) : (
        <div className="grid">
          {list.map(s => (
            <div className="card sitter-card" key={s.id}>
              <div className="sitter-top">
                <div className={'avatar ' + (s.role === 'petsitter' ? 'accent' : s.role === 'housesitter' ? '' : 'gold')}>{s.name.trim().charAt(0).toUpperCase() || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sitter-name">{s.name}</div>
                  <div className="muted small">
                    {ROLES[s.role].icon} {ROLES[s.role].label}
                  </div>
                </div>
                <div style={{ display: 'flex' }}>
                  <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setEditing(s)}>
                    ✎
                  </button>
                  <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => remove(s)}>
                    🗑
                  </button>
                </div>
              </div>
              <div className="sitter-badges">
                {s.trusted && <Pill tone="green">✓ Trusted</Pill>}
                {s.hasKey && <Pill tone="gold">🔑 Has a key</Pill>}
                {s.stints.length > 0 && <Pill>{plural(s.stints.length, 'stay')}</Pill>}
              </div>
              {s.rating > 0 && <Stars value={s.rating} small />}
              {(s.phone || s.email) && (
                <div className="contact-row">
                  {s.phone && (
                    <a className="btn sm" href={`tel:${s.phone}`}>
                      📞 {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a className="btn sm" href={`mailto:${s.email}`}>
                      ✉️ Email
                    </a>
                  )}
                </div>
              )}
              {s.notes && <p className="sitter-notes">{s.notes}</p>}
              {s.stints.length > 0 && (
                <div className="stint-list">
                  {[...s.stints]
                    .sort((a, b) => b.from.localeCompare(a.from))
                    .slice(0, 3)
                    .map(st => (
                      <div className="stint" key={st.id}>
                        <span>{fmtRange(st.from, st.to)}</span>
                        <span className="muted" style={{ textAlign: 'right' }}>
                          {tripName(st.tripId) ?? st.notes}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <SitterForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={s => {
            save(s)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function SitterForm({ initial, onClose, onSave }: { initial?: Sitter; onClose: () => void; onSave: (s: Sitter) => void }) {
  const { data } = useStore()
  const [s, setS] = useState<Sitter>(
    () =>
      initial ?? {
        id: uid(),
        name: '',
        role: 'housesitter',
        phone: '',
        email: '',
        rating: 0,
        trusted: true,
        hasKey: false,
        notes: '',
        stints: [],
        createdAt: new Date().toISOString(),
      },
  )
  const patch = (p: Partial<Sitter>) => setS(x => ({ ...x, ...p }))
  const [stint, setStint] = useState<SitterStint>({ id: uid(), from: '', to: '', notes: '' })

  const addStint = () => {
    if (!stint.from) return
    patch({ stints: [...s.stints, { ...stint, to: stint.to || stint.from }] })
    setStint({ id: uid(), from: '', to: '', notes: '' })
  }

  return (
    <Modal
      title={initial ? `Edit ${initial.name}` : 'Add a trusted person'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!s.name.trim()} onClick={() => onSave({ ...s, name: s.name.trim() })}>
            Save
          </button>
        </>
      }
    >
      <div className="form">
        <Field label="Name">
          <input type="text" autoFocus value={s.name} onChange={e => patch({ name: e.target.value })} placeholder="Full name" />
        </Field>
        <Field label="Role">
          <div className="radio-group">
            {(Object.keys(ROLES) as SitterRole[]).map(r => (
              <label key={r} className={s.role === r ? 'on' : ''}>
                <input type="radio" name="role" checked={s.role === r} onChange={() => patch({ role: r })} />
                {ROLES[r].icon} {ROLES[r].label}
              </label>
            ))}
          </div>
        </Field>
        <div className="row">
          <Field label="Phone">
            <input type="tel" value={s.phone} onChange={e => patch({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" value={s.email} onChange={e => patch({ email: e.target.value })} />
          </Field>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <Field label="How did it go?">
            <Stars value={s.rating} onChange={rating => patch({ rating })} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={s.trusted} onChange={e => patch({ trusted: e.target.checked })} />
            Trusted
          </label>
          <label className="check">
            <input type="checkbox" checked={s.hasKey} onChange={e => patch({ hasKey: e.target.checked })} />
            Has a key
          </label>
        </div>
        <Field label="Notes">
          <textarea rows={3} value={s.notes} onChange={e => patch({ notes: e.target.value })} placeholder="How you met, what they're great with, rate, pet quirks they know about, anything to remember next time…" />
        </Field>

        <div className="divider" />
        <h3 style={{ fontSize: 16 }}>Times they've helped</h3>
        {s.stints.length > 0 && (
          <div className="stint-list">
            {s.stints.map(st => (
              <div className="stint" key={st.id}>
                <span>
                  {fmtRange(st.from, st.to)}
                  {st.tripId && <span className="muted"> · {data.trips.find(t => t.id === st.tripId)?.title}</span>}
                  {st.notes && <span className="muted"> · {st.notes}</span>}
                </span>
                <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => patch({ stints: s.stints.filter(x => x.id !== st.id) })}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <Field label="From">
            <input type="date" value={stint.from} onChange={e => setStint({ ...stint, from: e.target.value })} />
          </Field>
          <Field label="To">
            <input type="date" value={stint.to} min={stint.from || undefined} onChange={e => setStint({ ...stint, to: e.target.value })} />
          </Field>
          {data.trips.length > 0 && (
            <Field label="Trip">
              <select value={stint.tripId ?? ''} onChange={e => setStint({ ...stint, tripId: e.target.value || undefined })}>
                <option value="">—</option>
                {data.trips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button type="button" className="btn" style={{ flex: 'none', height: 40 }} disabled={!stint.from} onClick={addStint}>
            Add
          </button>
        </div>
      </div>
    </Modal>
  )
}
