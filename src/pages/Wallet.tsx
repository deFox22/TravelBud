import { useState } from 'react'
import type { DocKind, EmergencyContact, LoyaltyProgram, TravelDoc } from '../lib/types'
import { useStore } from '../lib/store'
import { Empty, Field, Modal, PageHeader, Pill } from '../components/ui'
import { daysUntil, fmtDate, monthsUntil, uid } from '../lib/util'
import { Plus } from 'lucide-react'

export const DOC_KINDS: Record<DocKind, { label: string; icon: string }> = {
  passport: { label: 'Passport', icon: '🛂' },
  id: { label: 'ID card', icon: '🪪' },
  license: { label: "Driver's license", icon: '🚗' },
  visa: { label: 'Visa', icon: '📄' },
  global_entry: { label: 'Global Entry', icon: '🌐' },
  tsa_pre: { label: 'TSA PreCheck', icon: '✈️' },
  insurance: { label: 'Travel insurance', icon: '🛡️' },
  vaccination: { label: 'Vaccination', icon: '💉' },
  other: { label: 'Other', icon: '📎' },
}

/** Expiry health: expired, expiring (within 6 months), ok, or none. */
export function docStatus(d: TravelDoc): 'expired' | 'soon' | 'ok' | 'none' {
  if (!d.expires) return 'none'
  const days = daysUntil(d.expires)
  if (days < 0) return 'expired'
  if (monthsUntil(d.expires) < 6) return 'soon'
  return 'ok'
}

export function Wallet() {
  const { data, update } = useStore()
  const [doc, setDoc] = useState<TravelDoc | 'new' | null>(null)
  const [loy, setLoy] = useState<LoyaltyProgram | 'new' | null>(null)
  const [con, setCon] = useState<EmergencyContact | 'new' | null>(null)
  const [reveal, setReveal] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const saveDoc = (d: TravelDoc) => update(s => ({ ...s, docs: s.docs.some(x => x.id === d.id) ? s.docs.map(x => (x.id === d.id ? d : x)) : [...s.docs, d] }))
  const saveLoy = (l: LoyaltyProgram) => update(s => ({ ...s, loyalty: s.loyalty.some(x => x.id === l.id) ? s.loyalty.map(x => (x.id === l.id ? l : x)) : [...s.loyalty, l] }))
  const saveCon = (c: EmergencyContact) => update(s => ({ ...s, contacts: s.contacts.some(x => x.id === c.id) ? s.contacts.map(x => (x.id === c.id ? c : x)) : [...s.contacts, c] }))

  const mask = (n: string) => (n.length <= 4 ? '••••' : '•••• ' + n.slice(-4))
  const toggle = (id: string) => setReveal(r => ({ ...r, [id]: !r[id] }))

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(c => (c === id ? null : c)), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const docs = [...data.docs].sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'))

  return (
    <div className="page">
      <PageHeader
        title="Travel wallet"
        subtitle="Passport, trusted-traveler numbers, loyalty programs, and who to call. Stored only on this device, unencrypted, so keep a backup somewhere safe."
      />

      <section>
        <div className="card-head">
          <h2>Documents</h2>
          <button type="button" className="btn primary sm" onClick={() => setDoc('new')}>
            <Plus size={14} /> Add document
          </button>
        </div>
        {docs.length === 0 ? (
          <Empty icon="🛂" title="No documents yet" body="Add your passport and you will get a heads-up on the home page when it is within six months of expiring, which many countries require." />
        ) : (
          <div className="grid">
            {docs.map(d => {
              const st = docStatus(d)
              return (
                <div className="card wallet-card" key={d.id}>
                  <div className="wallet-top">
                    <span className="wallet-ico">{DOC_KINDS[d.kind].icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="wallet-title">{d.label || DOC_KINDS[d.kind].label}</div>
                      <div className="muted small">
                        {DOC_KINDS[d.kind].label}
                        {d.holder ? ` · ${d.holder}` : ''}
                      </div>
                    </div>
                    <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setDoc(d)}>
                      ✎
                    </button>
                  </div>
                  {d.number && (
                    <div className="wallet-num">
                      <code>{reveal[d.id] ? d.number : mask(d.number)}</code>
                      <button type="button" className="btn sm ghost" onClick={() => toggle(d.id)}>
                        {reveal[d.id] ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" className="btn sm ghost" onClick={() => copy(d.number, d.id)}>
                        {copied === d.id ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                  <div className="pills">
                    {st === 'expired' && <Pill tone="danger">Expired {fmtDate(d.expires)}</Pill>}
                    {st === 'soon' && <Pill tone="accent">Expires {fmtDate(d.expires)}</Pill>}
                    {st === 'ok' && <Pill tone="green">Valid until {fmtDate(d.expires)}</Pill>}
                    {d.issued && <Pill>Issued {fmtDate(d.issued)}</Pill>}
                  </div>
                  {d.notes && <p className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{d.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="card-head">
          <h2>Loyalty programs</h2>
          <button type="button" className="btn primary sm" onClick={() => setLoy('new')}>
            <Plus size={14} /> Add program
          </button>
        </div>
        {data.loyalty.length === 0 ? (
          <p className="muted">Airline miles, hotel points, rental car memberships. Keep the numbers handy for booking.</p>
        ) : (
          <div className="grid tight">
            {data.loyalty.map(l => (
              <div className="card wallet-card" key={l.id}>
                <div className="wallet-top">
                  <span className="wallet-ico">🎫</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wallet-title">{l.program}</div>
                    {l.tier && <div className="muted small">{l.tier}</div>}
                  </div>
                  <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setLoy(l)}>
                    ✎
                  </button>
                </div>
                {l.number && (
                  <div className="wallet-num">
                    <code>{l.number}</code>
                    <button type="button" className="btn sm ghost" onClick={() => copy(l.number, l.id)}>
                      {copied === l.id ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {l.notes && <p className="muted small">{l.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="card-head">
          <h2>Emergency contacts</h2>
          <button type="button" className="btn primary sm" onClick={() => setCon('new')}>
            <Plus size={14} /> Add contact
          </button>
        </div>
        {data.contacts.length === 0 ? (
          <p className="muted">Who should be called if something happens on the road. These also print on the sitter handoff sheet.</p>
        ) : (
          <div className="grid tight">
            {data.contacts.map(c => (
              <div className="card wallet-card" key={c.id}>
                <div className="wallet-top">
                  <span className="wallet-ico">📞</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wallet-title">{c.name}</div>
                    {c.relation && <div className="muted small">{c.relation}</div>}
                  </div>
                  <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setCon(c)}>
                    ✎
                  </button>
                </div>
                <div className="contact-row">
                  {c.phone && (
                    <a className="btn sm" href={`tel:${c.phone}`}>
                      📞 {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a className="btn sm" href={`mailto:${c.email}`}>
                      ✉️ Email
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {doc && (
        <DocForm
          initial={doc === 'new' ? undefined : doc}
          onClose={() => setDoc(null)}
          onSave={d => {
            saveDoc(d)
            setDoc(null)
          }}
          onDelete={
            doc === 'new'
              ? undefined
              : () => {
                  if (!confirm('Remove this document?')) return
                  update(s => ({ ...s, docs: s.docs.filter(x => x.id !== doc.id) }))
                  setDoc(null)
                }
          }
        />
      )}
      {loy && (
        <LoyaltyForm
          initial={loy === 'new' ? undefined : loy}
          onClose={() => setLoy(null)}
          onSave={l => {
            saveLoy(l)
            setLoy(null)
          }}
          onDelete={
            loy === 'new'
              ? undefined
              : () => {
                  update(s => ({ ...s, loyalty: s.loyalty.filter(x => x.id !== loy.id) }))
                  setLoy(null)
                }
          }
        />
      )}
      {con && (
        <ContactForm
          initial={con === 'new' ? undefined : con}
          onClose={() => setCon(null)}
          onSave={c => {
            saveCon(c)
            setCon(null)
          }}
          onDelete={
            con === 'new'
              ? undefined
              : () => {
                  update(s => ({ ...s, contacts: s.contacts.filter(x => x.id !== con.id) }))
                  setCon(null)
                }
          }
        />
      )}
    </div>
  )
}

type FormProps<T> = { initial?: T; onClose: () => void; onSave: (v: T) => void; onDelete?: () => void }

function FormFooter({ onClose, onDelete, canSave, onSave }: { onClose: () => void; onDelete?: () => void; canSave: boolean; onSave: () => void }) {
  return (
    <>
      {onDelete && (
        <button type="button" className="btn danger left" onClick={onDelete}>
          Remove
        </button>
      )}
      <button type="button" className="btn" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="btn primary" disabled={!canSave} onClick={onSave}>
        Save
      </button>
    </>
  )
}

function DocForm({ initial, onClose, onSave, onDelete }: FormProps<TravelDoc>) {
  const [d, setD] = useState<TravelDoc>(() => initial ?? { id: uid(), kind: 'passport', label: '', holder: '', number: '', issued: '', expires: '', notes: '' })
  const patch = (p: Partial<TravelDoc>) => setD(x => ({ ...x, ...p }))
  const canSave = Boolean(d.label.trim() || d.number.trim() || d.expires)
  return (
    <Modal title={initial ? 'Edit document' : 'Add document'} onClose={onClose} footer={<FormFooter onClose={onClose} onDelete={onDelete} canSave={canSave} onSave={() => onSave({ ...d, label: d.label.trim() })} />}>
      <div className="form">
        <Field label="Type">
          <div className="radio-group">
            {(Object.keys(DOC_KINDS) as DocKind[]).map(k => (
              <label key={k} className={d.kind === k ? 'on' : ''}>
                <input type="radio" name="dockind" checked={d.kind === k} onChange={() => patch({ kind: k })} />
                {DOC_KINDS[k].icon} {DOC_KINDS[k].label}
              </label>
            ))}
          </div>
        </Field>
        <div className="row">
          <Field label="Label" grow>
            <input type="text" autoFocus value={d.label} onChange={e => patch({ label: e.target.value })} placeholder={`${DOC_KINDS[d.kind].label}`} />
          </Field>
          <Field label="Whose">
            <input type="text" value={d.holder} onChange={e => patch({ holder: e.target.value })} placeholder="Name" />
          </Field>
        </div>
        <Field label="Number" hint="Shown masked on the card. Stored unencrypted on this device.">
          <input type="text" value={d.number} onChange={e => patch({ number: e.target.value })} autoComplete="off" />
        </Field>
        <div className="row">
          <Field label="Issued">
            <input type="date" value={d.issued} onChange={e => patch({ issued: e.target.value })} />
          </Field>
          <Field label="Expires">
            <input type="date" value={d.expires} onChange={e => patch({ expires: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea rows={2} value={d.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Where the physical copy lives, policy number, renewal reminders…" />
        </Field>
      </div>
    </Modal>
  )
}

function LoyaltyForm({ initial, onClose, onSave, onDelete }: FormProps<LoyaltyProgram>) {
  const [l, setL] = useState<LoyaltyProgram>(() => initial ?? { id: uid(), program: '', number: '', tier: '', notes: '' })
  const patch = (p: Partial<LoyaltyProgram>) => setL(x => ({ ...x, ...p }))
  return (
    <Modal title={initial ? 'Edit program' : 'Add loyalty program'} onClose={onClose} footer={<FormFooter onClose={onClose} onDelete={onDelete} canSave={Boolean(l.program.trim())} onSave={() => onSave({ ...l, program: l.program.trim() })} />}>
      <div className="form">
        <Field label="Program">
          <input type="text" autoFocus value={l.program} onChange={e => patch({ program: e.target.value })} placeholder="United MileagePlus, Marriott Bonvoy…" />
        </Field>
        <div className="row">
          <Field label="Member number" grow>
            <input type="text" value={l.number} onChange={e => patch({ number: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Tier">
            <input type="text" value={l.tier} onChange={e => patch({ tier: e.target.value })} placeholder="Gold" />
          </Field>
        </div>
        <Field label="Notes">
          <input type="text" value={l.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Points balance, perks, partner airlines…" />
        </Field>
      </div>
    </Modal>
  )
}

function ContactForm({ initial, onClose, onSave, onDelete }: FormProps<EmergencyContact>) {
  const [c, setC] = useState<EmergencyContact>(() => initial ?? { id: uid(), name: '', relation: '', phone: '', email: '' })
  const patch = (p: Partial<EmergencyContact>) => setC(x => ({ ...x, ...p }))
  return (
    <Modal title={initial ? 'Edit contact' : 'Add emergency contact'} onClose={onClose} footer={<FormFooter onClose={onClose} onDelete={onDelete} canSave={Boolean(c.name.trim())} onSave={() => onSave({ ...c, name: c.name.trim() })} />}>
      <div className="form">
        <div className="row">
          <Field label="Name" grow>
            <input type="text" autoFocus value={c.name} onChange={e => patch({ name: e.target.value })} />
          </Field>
          <Field label="Relationship">
            <input type="text" value={c.relation} onChange={e => patch({ relation: e.target.value })} placeholder="Sister, doctor…" />
          </Field>
        </div>
        <div className="row">
          <Field label="Phone">
            <input type="tel" value={c.phone} onChange={e => patch({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" value={c.email} onChange={e => patch({ email: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
