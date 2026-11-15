import { useState } from 'react'
import { Download, ShieldAlert } from 'lucide-react'
import type { AppData } from '../lib/types'
import { normalize, useStore } from '../lib/store'
import { Modal } from './ui'
import { Fox } from './Fox'
import { clearShareFromUrl } from '../lib/share'
import { plural } from '../lib/util'

/** Opened from a transfer link: shows what is inside and replaces this device's data on a tap. */
export function ImportSheet({ incoming, onClose }: { incoming: AppData; onClose: () => void }) {
  const { data, replace } = useStore()
  const [done, setDone] = useState(false)
  const here = data.memories.length + data.trips.length + data.places.length + data.docs.length
  const inc = normalize(incoming)
  const summary = [plural(inc.trips.length, 'trip'), plural(inc.places.length, 'place'), plural(inc.memories.length, 'memory', 'memories'), inc.sitters.length ? plural(inc.sitters.length, 'sitter') : '', inc.docs.length ? plural(inc.docs.length, 'document') : ''].filter(Boolean).join(', ')
  const close = () => {
    clearShareFromUrl()
    onClose()
  }
  return (
    <Modal
      title={done ? 'All here' : 'Bring your data to this device'}
      onClose={close}
      footer={
        done ? (
          <button type="button" className="btn primary" onClick={close}>
            Open TravelBud
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={close}>
              Not now
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                replace(inc)
                setDone(true)
              }}
            >
              <Download size={15} /> {here > 0 ? 'Replace and import' : 'Import'}
            </button>
          </>
        )
      }
    >
      <div className="import-sheet">
        <Fox mood={done ? 'excited' : 'wave'} size={96} />
        {done ? (
          <p>
            {summary} landed on this device. Photos stay on the device they were added on, so drop them onto the memories from this camera roll.
          </p>
        ) : (
          <>
            <p>
              This link carries <b>{summary}</b>, without photos.
            </p>
            {here > 0 ? (
              <p className="import-warn">
                <ShieldAlert size={16} /> This device already has {plural(here, 'item')}. Importing replaces them. Export a backup first if you might want them back.
              </p>
            ) : (
              <p className="muted small">This device is empty, so nothing is lost.</p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
