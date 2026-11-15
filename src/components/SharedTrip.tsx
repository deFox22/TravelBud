import type { Trip } from '../lib/types'
import { useStore } from '../lib/store'
import { Modal } from './ui'
import { FoxSays } from './Fox'
import { fmtDate, fmtRange, plural, uid, weekday } from '../lib/util'
import { clearShareFromUrl } from '../lib/share'

/** Read-only view of a trip someone sent as a link, with a one-click "save a copy". */
export function SharedTrip({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { update } = useStore()
  const save = () => {
    update(d => ({ ...d, trips: [{ ...trip, id: uid(), createdAt: new Date().toISOString(), sitterId: undefined, placeIds: [] }, ...d.trips] }))
    clearShareFromUrl()
    onClose()
  }
  const dismiss = () => {
    clearShareFromUrl()
    onClose()
  }
  return (
    <Modal
      wide
      title="Someone shared a trip with you"
      onClose={dismiss}
      footer={
        <>
          <button type="button" className="btn" onClick={dismiss}>
            Not now
          </button>
          <button type="button" className="btn primary" onClick={save}>
            Save a copy to my trips
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <FoxSays mood="excited">A plan arrived! Save it and it's yours to edit. Photos and places aren't included, only the plan.</FoxSays>
      </div>
      <h2 style={{ fontSize: 26 }}>{trip.title}</h2>
      <p className="muted">
        {trip.destination}
        {trip.destination ? ' · ' : ''}
        {fmtRange(trip.startDate, trip.endDate)}
      </p>
      {trip.notes && <p style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{trip.notes}</p>}
      {trip.itinerary.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Day by day</h3>
          {trip.itinerary.map((d, i) => (
            <div key={d.id} style={{ marginBottom: 8 }}>
              <b>
                Day {i + 1} · {weekday(d.date)}, {fmtDate(d.date, { year: undefined })}
              </b>
              {d.title ? <span className="muted"> · {d.title}</span> : null}
              {d.items.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {d.items.map(it => (
                    <li key={it.id}>
                      {it.time ? `${it.time} · ` : ''}
                      {it.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="muted small" style={{ marginTop: 12 }}>
        Includes {plural(trip.bookings.length, 'booking')}, {plural(trip.packing.length, 'packing item')}, and {plural(trip.ideas.length, 'idea')}.
      </p>
    </Modal>
  )
}
