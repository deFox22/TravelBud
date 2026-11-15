import { useEffect, useState } from 'react'
import type { Place } from '../lib/types'
import { useStore } from '../lib/store'
import { Stamp } from './Stamp'
import { onStamp } from '../lib/events'
import { thumbOf } from '../lib/util'

/** When a place becomes visited, its stamp slams onto the screen for a moment (B20-style ink motion), then it waits in the logbook. */
export function StampSlam({ onOpen }: { onOpen: () => void }) {
  const { data } = useStore()
  const [queue, setQueue] = useState<string[]>([])
  useEffect(() => onStamp(id => setQueue(q => [...q, id])), [])
  const id = queue[0]
  const place: Place | undefined = id ? data.places.find(p => p.id === id) : undefined
  useEffect(() => {
    if (!id) return
    const t = setTimeout(() => setQueue(q => q.slice(1)), 2600)
    return () => clearTimeout(t)
  }, [id])
  if (!id) return null
  if (!place) {
    setQueue(q => q.slice(1))
    return null
  }
  const mem = data.memories.filter(m => m.placeId === place.id && m.photos[0]).sort((a, b) => a.date.localeCompare(b.date))[0]
  return (
    <button
      type="button"
      className="stamp-slam"
      aria-label={`Stamp earned: ${place.name}`}
      onClick={() => {
        setQueue([])
        onOpen()
      }}
    >
      <span className="stamp-slam-art">
        <Stamp place={place} photo={mem ? thumbOf(mem.photos[0]) : undefined} date={place.firstVisited ?? mem?.date} size={170} />
      </span>
      <span className="stamp-slam-cap">
        <b>Stamp earned</b>
        <small>{place.name} is in your logbook</small>
      </span>
    </button>
  )
}
