import type { Place } from '../lib/types'

const BASE = import.meta.env.BASE_URL
const ART = ['stamp-yosemite', 'stamp-half-dome', 'stamp-mariposa', 'stamp-mirror', 'stamp-tuolumne', 'stamp-camp-4']

const hash = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** A postage stamp for a visited place: perforated white frame, your photo (or kit art) inside,
    the place name as the caption, and an ink postmark with the first-visit date. */
export function Stamp({ place, photo, date, index = 0, size = 112 }: { place: Place; photo?: string; date?: string; index?: number; size?: number }) {
  const h = hash(place.id)
  const tilt = ((h % 15) - 7) * (index % 2 ? 1 : -1)
  const art = `${BASE}brand/stamps/${ART[h % ART.length]}.svg`
  const d = date ? new Date(date + 'T00:00:00') : null
  return (
    <figure className="stamp-frame" style={{ width: size, transform: `rotate(${tilt}deg)` }}>
      <div className="stamp-paper">
        <div className="stamp-art">{photo ? <img src={photo} alt="" /> : <img src={art} alt="" className="kit" />}</div>
        <figcaption className="stamp-cap">{place.name}</figcaption>
        <span className="stamp-corner">{place.countryCode ? place.countryCode.toUpperCase() : '·'}</span>
      </div>
      {d && !Number.isNaN(d.getTime()) && (
        <span className="postmark" style={{ transform: `rotate(${-tilt - 8}deg)` }}>
          <b>{String(d.getDate()).padStart(2, '0')}</b>
          <small>{d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</small>
        </span>
      )}
    </figure>
  )
}
