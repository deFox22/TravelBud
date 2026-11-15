import { useEffect, useState, type ReactNode, type KeyboardEvent } from 'react'
import { CalendarClock, CircleCheckBig, Sparkles, Ticket, History, type LucideIcon } from 'lucide-react'
import { Fox } from './Fox'

/** B18-A trip status chip: soft tint + Lucide icon + label. */
const CHIP: Record<'dreaming' | 'planning' | 'booked' | 'completed' | 'past', { label: string; Icon: LucideIcon }> = {
  dreaming: { label: 'Dreaming', Icon: Sparkles },
  planning: { label: 'Planning', Icon: CalendarClock },
  booked: { label: 'Booked', Icon: Ticket },
  completed: { label: 'Completed', Icon: CircleCheckBig },
  past: { label: 'Past', Icon: History },
}
export function StatusChip({ status, className = '' }: { status: keyof typeof CHIP; className?: string }) {
  const { label, Icon } = CHIP[status]
  return (
    <span className={`chip-status ${status} ${className}`}>
      <Icon size={16} strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  )
}

/** B4 stat strip: one slim row of numbers with hairline dividers. Never tiles. */
export function StatStrip({ stats, onPress, className = '' }: { stats: { n: ReactNode; label: string }[]; onPress?: () => void; className?: string }) {
  const inner = stats.map(s => (
    <div key={s.label}>
      <span className="n">{s.n}</span>
      <span className="l">{s.label}</span>
    </div>
  ))
  return onPress ? (
    <button type="button" className={`card stat-strip ${className}`} onClick={onPress} style={{ font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', border: 0, width: '100%' }}>
      {inner}
    </button>
  ) : (
    <div className={`card stat-strip ${className}`}>{inner}</div>
  )
}

/** Number that counts up from zero when it mounts or changes. */
export function CountUp({ n, duration = 900 }: { n: number; duration?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      setV(Math.round(n * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [n, duration])
  return <>{v.toLocaleString()}</>
}

/** True when the page is currently rendering in dark mode (system or forced). */
export function useIsDark(): boolean {
  const compute = () => {
    const forced = document.documentElement.dataset.theme
    if (forced === 'dark') return true
    if (forced === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  const [dark, setDark] = useState(compute)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setDark(compute())
    mq.addEventListener('change', update)
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      obs.disconnect()
    }
  }, [])
  return dark
}

/** Circular progress ring with a label in the middle. */
export function Ring({ value, max, size = 72, stroke = 6, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle className="ring-fg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
  dirty,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** When true, closing by backdrop or Escape asks before discarding. */
  dirty?: boolean
}) {
  const requestClose = () => {
    if (dirty && !confirm('Discard your changes?')) return
    onClose()
  }
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('.lightbox, .palette-backdrop')) return
      requestClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, dirty])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, grow }: { label: string; children: ReactNode; hint?: string; grow?: boolean }) {
  return (
    <div className={'field' + (grow ? ' grow' : '')}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function Stars({ value, onChange, small }: { value: number; onChange?: (n: number) => void; small?: boolean }) {
  return (
    <span className={'stars' + (onChange ? ' editable' : '') + (small ? ' small' : '')} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          className={n <= value ? 'on' : ''}
          onClick={onChange ? () => onChange(n === value ? 0 : n) : undefined}
          disabled={!onChange}
          tabIndex={onChange ? 0 : -1}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </span>
  )
}

export function Empty({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty" data-icon={icon}>
      <div className="empty-night">
        <span className="hill" />
        <Fox mood="sleepy" size={150} />
      </div>
      <div className="empty-body">
        <h3>{title}</h3>
        {body && <p>{body}</p>}
        {action}
      </div>
    </div>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'accent' | 'gold' | 'danger' | 'green' }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const commit = () => {
    const parts = draft
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !value.includes(s))
    if (parts.length) onChange([...value, ...parts])
    setDraft('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }
  return (
    <div className="tag-input">
      {value.map(t => (
        <span key={t} className="chip">
          {t}
          <button type="button" onClick={() => onChange(value.filter(x => x !== t))} aria-label={`Remove ${t}`}>
            ×
          </button>
        </span>
      ))}
      <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} onBlur={commit} placeholder={value.length ? '' : placeholder} />
    </div>
  )
}

export function Progress({ value, max, tone }: { value: number; max: number; tone?: 'teal' | 'accent' | 'danger' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={'progress ' + (tone ?? 'teal')} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Country flag as a small image (Windows has no flag-emoji font). Falls back to the code or a given string. */
export function Flag({ cc, fallback }: { cc?: string; fallback?: string }) {
  const code = (cc ?? '').toLowerCase()
  if (!/^[a-z]{2}$/.test(code)) return fallback ? <span>{fallback}</span> : null
  return (
    <img
      className="flag-img"
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={20}
      height={15}
      alt={code.toUpperCase()}
      loading="lazy"
      crossOrigin="anonymous"
    />
  )
}
