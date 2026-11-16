/* Browsers treat a website's storage as disposable unless the site asks to keep it. Safari on iPhone
   goes further and clears it after about a week without a visit, unless the app is on the Home Screen.
   TravelBud asks once there is something worth keeping, and says so plainly when the answer is no. */

export type PersistState = 'unknown' | 'persisted' | 'best-effort' | 'unsupported'

let state: PersistState = 'unknown'
const listeners = new Set<() => void>()

export const getPersistState = (): PersistState => state

export function onPersistChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Ask the browser to keep our storage. Safe to call again: after installing to the Home Screen the answer can change. */
export async function ensurePersistent(): Promise<PersistState> {
  let next: PersistState = 'unsupported'
  try {
    const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (s && typeof s.persisted === 'function') {
      let ok = await s.persisted()
      if (!ok && typeof s.persist === 'function') ok = await s.persist()
      next = ok ? 'persisted' : 'best-effort'
    }
  } catch {
    next = 'unsupported'
  }
  if (next !== state) {
    state = next
    listeners.forEach(l => l())
  }
  return state
}
