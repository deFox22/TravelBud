import type { CSSProperties, ReactNode } from 'react'

export type FoxMood = 'happy' | 'sleepy' | 'excited' | 'wave' | 'think'

const BASE = import.meta.env.BASE_URL
const FILE: Record<FoxMood | 'head' | 'ranger', string> = {
  happy: 'scout-happy.svg',
  wave: 'scout-wave.svg',
  excited: 'scout-excited.svg',
  think: 'scout-think.svg',
  sleepy: 'scout-sleepy.svg',
  head: 'scout-head.svg',
  ranger: 'scout-ranger-sash.svg',
}

/** Scout, from the brand kit's artwork. Never redrawn or recoloured; ask the designer for new art. */
export function Fox({ mood = 'happy', size = 64, variant = 'full', className = '', style }: { mood?: FoxMood; size?: number; variant?: 'full' | 'head' | 'ranger'; className?: string; style?: CSSProperties }) {
  const key = variant === 'full' ? mood : variant
  return <img className={`fox fox-${mood} fox-${variant} ${className}`} src={`${BASE}brand/scout/${FILE[key]}`} width={size} height={size} alt="Scout the fox" style={style} draggable={false} />
}

export interface FoxAction {
  label: ReactNode
  onClick: () => void
  primary?: boolean
}

const STAMPS = ['stamp-yosemite', 'stamp-half-dome', 'stamp-mariposa', 'stamp-mirror', 'stamp-tuolumne', 'stamp-camp-4']

/** Scout's postcard note (B8-D): warm paper, tilted, a postage stamp, "From Scout", one link action and a quieter second one. */
export function FoxSays({ mood = 'wave', children, actions }: { mood?: FoxMood; children: ReactNode; size?: number; actions?: FoxAction[] }) {
  const day = Math.floor(Date.now() / 86_400_000)
  const stamp = STAMPS[day % STAMPS.length]
  const [first, ...rest] = actions ?? []
  return (
    <div className="postcard-wrap">
      <section className="postcard" aria-label="Note from Scout">
        <img className="postcard-stamp" src={`${BASE}brand/stamps/${stamp}.svg`} alt="" />
        <p className="postcard-from">From Scout</p>
        <p className="postcard-msg">{children}</p>
        {actions && actions.length > 0 && (
          <>
            <hr className="postcard-rule" />
            <div className="postcard-actions">
              {first && (
                <button type="button" className="postcard-link" onClick={first.onClick}>
                  {first.label} →
                </button>
              )}
              {rest.map((a, i) => (
                <button type="button" key={i} className="postcard-later" onClick={a.onClick}>
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      <Fox mood={mood} size={104} className="postcard-fox" />
    </div>
  )
}
