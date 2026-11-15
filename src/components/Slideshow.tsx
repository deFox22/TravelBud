import { useEffect, useState } from 'react'

export interface Slide {
  src: string
  title: string
  sub?: string
}

/** Full-screen Ken Burns slideshow. Space pauses, arrows step, Escape closes. */
export function Slideshow({ slides, onClose, interval = 4500 }: { slides: Slide[]; onClose: () => void; interval?: number }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length

  useEffect(() => {
    if (paused || n < 2) return
    const t = setInterval(() => setI(x => (x + 1) % n), interval)
    return () => clearInterval(t)
  }, [paused, n, interval])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      } else if (e.key === 'ArrowRight') setI(x => (x + 1) % n)
      else if (e.key === 'ArrowLeft') setI(x => (x - 1 + n) % n)
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused(p => !p)
      }
    }
    window.addEventListener('keydown', onKey, true)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = ''
    }
  }, [n, onClose])

  if (n === 0) return null
  const s = slides[i]
  return (
    <div className="lightbox slideshow" onClick={() => setPaused(p => !p)}>
      {/* key forces the Ken Burns animation to restart on each slide */}
      <img key={i} src={s.src} alt="" className={'kb ' + (i % 2 ? 'kb-b' : 'kb-a')} style={{ animationDuration: `${interval + 1200}ms` }} />
      <div className="slideshow-caption">
        <div className="slideshow-title">{s.title}</div>
        {s.sub && <div className="slideshow-sub">{s.sub}</div>}
      </div>
      <div className="slideshow-bar">
        {slides.map((_, k) => (
          <span key={k} className={k < i ? 'done' : k === i ? 'on' : ''} style={k === i && !paused ? { animationDuration: `${interval}ms` } : undefined} />
        ))}
      </div>
      {paused && <div className="slideshow-paused">⏸ paused · tap to resume</div>}
      <button
        type="button"
        className="lightbox-close"
        aria-label="Close"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
      >
        ✕
      </button>
    </div>
  )
}
