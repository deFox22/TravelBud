import { useState } from 'react'
import type { HomeGuide, HomeVendor, Pet, Trip } from '../lib/types'
import { useStore } from '../lib/store'
import { Field, Modal } from '../components/ui'
import { fmtDate, fmtRange, uid } from '../lib/util'

/** Editor for the standing "how our house works" guide that every handoff sheet pulls from. */
export function HomeGuideForm({ onClose }: { onClose: () => void }) {
  const { data, update } = useStore()
  const [g, setG] = useState<HomeGuide>(data.home)
  const patch = (p: Partial<HomeGuide>) => setG(x => ({ ...x, ...p }))
  const [showSecrets, setShowSecrets] = useState(false)

  const save = () => {
    update(d => ({ ...d, home: g }))
    onClose()
  }

  const addPet = () => patch({ pets: [...g.pets, { id: uid(), name: '', kind: '', routine: '', meds: '', notes: '' }] })
  const setPet = (id: string, p: Partial<Pet>) => patch({ pets: g.pets.map(x => (x.id === id ? { ...x, ...p } : x)) })
  const addVendor = () => patch({ vendors: [...g.vendors, { id: uid(), role: '', name: '', phone: '' }] })
  const setVendor = (id: string, p: Partial<HomeVendor>) => patch({ vendors: g.vendors.map(x => (x.id === id ? { ...x, ...p } : x)) })

  return (
    <Modal
      wide
      title="Home guide"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={save}>
            Save guide
          </button>
        </>
      }
    >
      <div className="form">
        <p className="muted small">Write this once. Every trip can print a handoff sheet that combines it with the dates, the sitter, and your emergency contacts.</p>
        <Field label="Address">
          <input type="text" value={g.address} onChange={e => patch({ address: e.target.value })} />
        </Field>
        <div className="row">
          <Field label="Wi-Fi network">
            <input type="text" value={g.wifiName} onChange={e => patch({ wifiName: e.target.value })} />
          </Field>
          <Field label="Wi-Fi password">
            <input type={showSecrets ? 'text' : 'password'} value={g.wifiPassword} onChange={e => patch({ wifiPassword: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Alarm / door code">
            <input type={showSecrets ? 'text' : 'password'} value={g.alarmCode} onChange={e => patch({ alarmCode: e.target.value })} autoComplete="off" />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={showSecrets} onChange={e => setShowSecrets(e.target.checked)} />
          Show passwords and codes
        </label>
        <div className="row">
          <Field label="Keys & getting in">
            <input type="text" value={g.keyInfo} onChange={e => patch({ keyInfo: e.target.value })} placeholder="Lockbox on the side gate, code…" />
          </Field>
          <Field label="Trash & recycling">
            <input type="text" value={g.trashDay} onChange={e => patch({ trashDay: e.target.value })} placeholder="Bins out Tuesday night" />
          </Field>
        </div>
        <div className="row">
          <Field label="Thermostat">
            <input type="text" value={g.thermostat} onChange={e => patch({ thermostat: e.target.value })} placeholder="Keep at 68, app is on the fridge iPad" />
          </Field>
          <Field label="Parking">
            <input type="text" value={g.parking} onChange={e => patch({ parking: e.target.value })} placeholder="Driveway is fine, street needs permit" />
          </Field>
        </div>
        <Field label="Plants">
          <input type="text" value={g.plants} onChange={e => patch({ plants: e.target.value })} placeholder="Water the fiddle-leaf once a week, succulents never" />
        </Field>
        <Field label="House quirks & rules">
          <textarea rows={3} value={g.quirks} onChange={e => patch({ quirks: e.target.value })} placeholder="Jiggle the back door handle. Don't run the dishwasher and shower together. No shoes upstairs." />
        </Field>

        <div className="divider" />
        <div className="card-head">
          <h3 style={{ fontSize: 16 }}>Pets</h3>
          <button type="button" className="btn sm" onClick={addPet}>
            + Add pet
          </button>
        </div>
        {g.pets.map(p => (
          <div className="card pad form" key={p.id} style={{ gap: 10 }}>
            <div className="row">
              <Field label="Name">
                <input type="text" value={p.name} onChange={e => setPet(p.id, { name: e.target.value })} />
              </Field>
              <Field label="What kind">
                <input type="text" value={p.kind} onChange={e => setPet(p.id, { kind: e.target.value })} placeholder="Dog, 6yo lab mix" />
              </Field>
              <button type="button" className="icon-btn danger" style={{ alignSelf: 'flex-end', flex: 'none' }} aria-label="Remove pet" onClick={() => patch({ pets: g.pets.filter(x => x.id !== p.id) })}>
                🗑
              </button>
            </div>
            <Field label="Daily routine">
              <textarea rows={2} value={p.routine} onChange={e => setPet(p.id, { routine: e.target.value })} placeholder="1 cup kibble 7am and 6pm. Walk after breakfast. Crate at night." />
            </Field>
            <div className="row">
              <Field label="Medications">
                <input type="text" value={p.meds} onChange={e => setPet(p.id, { meds: e.target.value })} placeholder="None" />
              </Field>
              <Field label="Quirks">
                <input type="text" value={p.notes} onChange={e => setPet(p.id, { notes: e.target.value })} placeholder="Scared of thunder, hides under bed" />
              </Field>
            </div>
          </div>
        ))}

        <div className="divider" />
        <div className="card-head">
          <h3 style={{ fontSize: 16 }}>Who to call</h3>
          <button type="button" className="btn sm" onClick={addVendor}>
            + Add
          </button>
        </div>
        {g.vendors.map(v => (
          <div className="row" key={v.id} style={{ alignItems: 'flex-end' }}>
            <Field label="Role">
              <input type="text" value={v.role} onChange={e => setVendor(v.id, { role: e.target.value })} placeholder="Vet, plumber, landlord…" />
            </Field>
            <Field label="Name">
              <input type="text" value={v.name} onChange={e => setVendor(v.id, { name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={v.phone} onChange={e => setVendor(v.id, { phone: e.target.value })} />
            </Field>
            <button type="button" className="icon-btn danger" style={{ flex: 'none' }} aria-label="Remove" onClick={() => patch({ vendors: g.vendors.filter(x => x.id !== v.id) })}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null
  return (
    <tr>
      <th>{k}</th>
      <td>{v}</td>
    </tr>
  )
}

/** Printable one-pager for whoever is watching the house during a trip. */
export function HandoffSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { data } = useStore()
  const g = data.home
  const sitter = data.sitters.find(s => s.id === trip.sitterId)
  const name = data.profile.name || 'Us'
  const empty = !g.address && !g.wifiName && !g.alarmCode && g.pets.length === 0 && g.vendors.length === 0

  return (
    <Modal
      wide
      title="Handoff sheet"
      onClose={onClose}
      footer={
        <>
          <span className="muted small left">Prints as one clean page. Codes and passwords are included, so hand it over in person.</span>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn primary" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </>
      }
    >
      {empty && <p className="muted small" style={{ marginBottom: 12 }}>The home guide is empty. Fill it in from the Sitters page and this sheet fills itself out.</p>}
      <div className="print-sheet">
        <header>
          <h1>House notes for {sitter ? sitter.name : 'our sitter'}</h1>
          <p>
            {name} away {fmtRange(trip.startDate, trip.endDate)} · {trip.title}
            {trip.destination ? ` (${trip.destination})` : ''}
          </p>
        </header>

        <section>
          <h2>The house</h2>
          <table>
            <tbody>
              <Row k="Address" v={g.address} />
              <Row k="Getting in" v={g.keyInfo} />
              <Row k="Alarm / door code" v={g.alarmCode} />
              <Row k="Wi-Fi" v={g.wifiName ? `${g.wifiName}${g.wifiPassword ? ` · password: ${g.wifiPassword}` : ''}` : ''} />
              <Row k="Trash & recycling" v={g.trashDay} />
              <Row k="Thermostat" v={g.thermostat} />
              <Row k="Parking" v={g.parking} />
              <Row k="Plants" v={g.plants} />
            </tbody>
          </table>
          {g.quirks && <p className="quirks">{g.quirks}</p>}
        </section>

        {g.pets.length > 0 && (
          <section>
            <h2>Pets</h2>
            {g.pets.map(p => (
              <div className="pet" key={p.id}>
                <h3>
                  {p.name}
                  {p.kind ? <span> · {p.kind}</span> : null}
                </h3>
                {p.routine && <p>{p.routine}</p>}
                {p.meds && (
                  <p>
                    <b>Meds:</b> {p.meds}
                  </p>
                )}
                {p.notes && (
                  <p>
                    <b>Good to know:</b> {p.notes}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        <section>
          <h2>Who to call</h2>
          <table>
            <tbody>
              {data.contacts.length === 0 && g.vendors.length === 0 && <Row k="Nobody listed yet" v="Add emergency contacts in the Travel wallet and vendors in the home guide" />}
              {data.contacts.map(c => (
                <Row key={c.id} k={`${c.name}${c.relation ? ` (${c.relation})` : ''}`} v={[c.phone, c.email].filter(Boolean).join(' · ')} />
              ))}
              {g.vendors.map(v => (
                <Row key={v.id} k={v.role || v.name} v={[v.role ? v.name : '', v.phone].filter(Boolean).join(' · ')} />
              ))}
            </tbody>
          </table>
        </section>

        {trip.bookings.length > 0 && (
          <section>
            <h2>Our travel dates</h2>
            <ul>
              {trip.bookings
                .filter(b => b.kind === 'flight' || b.kind === 'train')
                .map(b => (
                  <li key={b.id}>
                    {b.date ? `${fmtDate(b.date)}: ` : ''}
                    {b.title}
                  </li>
                ))}
            </ul>
          </section>
        )}

        <footer>Thank you for looking after things. Text anytime, even for small stuff.</footer>
      </div>
    </Modal>
  )
}
