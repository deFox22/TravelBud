import { useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { BadgeDef } from '../lib/badges'
import { TIER_LABEL } from '../lib/badges'

const BASE = import.meta.env.BASE_URL

/** B12-C unlock toast: forest card at the top, badge art pops, confetti once, gone after 4 s. Tap opens the badge. */
export function UnlockToast({ badge, onOpen, onClose }: { badge: BadgeDef; onOpen: () => void; onClose: () => void }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) confetti({ particleCount: 90, spread: 70, startVelocity: 32, origin: { y: 0.12 }, ticks: 110, colors: ['#FF7A2F', '#FFC24B', '#14857C', '#F7A8B8', '#FFF4E6'] })
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="tb-toast-wrap" role="status" aria-live="polite">
      <button type="button" className="tb-toast" onClick={onOpen}>
        <img className="tb-toast-art" src={`${BASE}${badge.art}`} alt="" />
        <span className="tb-toast-text">
          <span className="tb-toast-title">{badge.name}</span>
          <span className="tb-toast-sub">New {TIER_LABEL[badge.tier].split(' ·')[0].toLowerCase()} badge · tap to see</span>
        </span>
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
