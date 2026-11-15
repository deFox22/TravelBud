import type { CSSProperties } from 'react'

export type FoxMood = 'happy' | 'sleepy' | 'excited' | 'wave' | 'think'

/**
 * Scout, the TravelBud fox. Pure SVG so it stays crisp at any size.
 * Moods change the eyes, mouth, and a few props (a waving paw, sparkles, Zs).
 */
export function Fox({ mood = 'happy', size = 64, className = '', style }: { mood?: FoxMood; size?: number; className?: string; style?: CSSProperties }) {
  const closed = mood === 'sleepy'
  return (
    <svg className={`fox fox-${mood} ${className}`} width={size} height={size} viewBox="0 0 120 120" style={style} role="img" aria-label="Scout the fox">
      <defs>
        <linearGradient id="foxFur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f29a5c" />
          <stop offset="1" stopColor="#df7a43" />
        </linearGradient>
        <linearGradient id="foxScarf" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#15605d" />
          <stop offset="1" stopColor="#2b8f85" />
        </linearGradient>
      </defs>

      {/* sparkles for excited */}
      {mood === 'excited' && (
        <g className="fox-sparkles" fill="#d9a441">
          <path d="M14 30l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" />
          <path d="M104 22l1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6z" />
          <path d="M100 58l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" />
        </g>
      )}

      {/* Zs for sleepy */}
      {mood === 'sleepy' && (
        <g className="fox-zzz" fill="#15605d" fontFamily="Fraunces, Georgia, serif" fontWeight="700">
          <text x="92" y="30" fontSize="14">
            z
          </text>
          <text x="102" y="18" fontSize="10">
            z
          </text>
        </g>
      )}

      {/* thought bubble for think */}
      {mood === 'think' && (
        <g fill="#fffcf7" stroke="#15605d" strokeWidth="2">
          <circle cx="98" cy="40" r="3" />
          <circle cx="104" cy="30" r="5" />
          <circle cx="110" cy="16" r="8" />
        </g>
      )}

      {/* ears */}
      <g className="fox-ear fox-ear-l">
        <path d="M30 46 L34 8 Q35 5 38 8 L60 36 Z" fill="url(#foxFur)" />
        <path d="M37 38 L38 18 L52 36 Z" fill="#fde3d0" />
      </g>
      <g className="fox-ear fox-ear-r">
        <path d="M90 46 L86 8 Q85 5 82 8 L60 36 Z" fill="url(#foxFur)" />
        <path d="M83 38 L82 18 L68 36 Z" fill="#fde3d0" />
      </g>

      {/* head */}
      <path d="M22 60 C22 38 38 30 60 30 C82 30 98 38 98 60 C98 82 82 96 60 96 C38 96 22 82 22 60 Z" fill="url(#foxFur)" />
      {/* white muzzle / cheeks */}
      <path d="M32 66 C36 56 48 60 60 68 C72 60 84 56 88 66 C92 80 78 96 60 96 C42 96 28 80 32 66 Z" fill="#fff8ef" />
      {/* blush */}
      <ellipse cx="38" cy="70" rx="6" ry="3.5" fill="#f4a58a" opacity="0.6" />
      <ellipse cx="82" cy="70" rx="6" ry="3.5" fill="#f4a58a" opacity="0.6" />

      {/* eyes */}
      {closed ? (
        <g stroke="#2a2a2a" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M40 60 Q46 65 52 60" />
          <path d="M68 60 Q74 65 80 60" />
        </g>
      ) : (
        <g className="fox-eyes">
          <ellipse className="fox-eye" cx="46" cy="60" rx="4.2" ry={mood === 'excited' ? 5.5 : 4.8} fill="#2a2a2a" />
          <ellipse className="fox-eye" cx="74" cy="60" rx="4.2" ry={mood === 'excited' ? 5.5 : 4.8} fill="#2a2a2a" />
          <circle cx="47.5" cy="58" r="1.4" fill="#fff" />
          <circle cx="75.5" cy="58" r="1.4" fill="#fff" />
        </g>
      )}

      {/* nose + mouth */}
      <path d="M55 75 Q60 72 65 75 Q62 80 60 80 Q58 80 55 75 Z" fill="#2a2a2a" />
      {mood === 'excited' ? (
        <path d="M50 83 Q60 94 70 83 Z" fill="#c0392b" stroke="#2a2a2a" strokeWidth="2" strokeLinejoin="round" />
      ) : mood === 'think' ? (
        <path d="M54 86 L66 85" stroke="#2a2a2a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M52 84 Q56 89 60 85 Q64 89 68 84" stroke="#2a2a2a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      )}

      {/* scarf */}
      <path d="M26 92 C40 104 80 104 94 92 L92 102 C78 112 42 112 28 102 Z" fill="url(#foxScarf)" />
      <path d="M72 100 L84 118 L92 108 L86 98 Z" fill="#2b8f85" />
      <path d="M74 103 L82 114" stroke="#fffcf7" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* waving paw */}
      {mood === 'wave' && (
        <g className="fox-paw">
          <ellipse cx="104" cy="78" rx="9" ry="11" fill="url(#foxFur)" />
          <circle cx="98" cy="70" r="3.2" fill="#fff8ef" />
          <circle cx="104" cy="68" r="3.2" fill="#fff8ef" />
          <circle cx="110" cy="70" r="3.2" fill="#fff8ef" />
        </g>
      )}
    </svg>
  )
}

/** Scout plus a speech bubble. */
export interface FoxAction {
  label: React.ReactNode
  onClick: () => void
  primary?: boolean
}

export function FoxSays({ mood = 'happy', children, size = 76, actions }: { mood?: FoxMood; children: React.ReactNode; size?: number; actions?: FoxAction[] }) {
  return (
    <div className="fox-says">
      <Fox mood={mood} size={size} />
      <div className="fox-bubble">
        <div>{children}</div>
        {actions && actions.length > 0 && (
          <div className="fox-actions">
            {actions.map((a, i) => (
              <button type="button" key={i} className={'btn sm' + (a.primary ? ' primary' : '')} onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
