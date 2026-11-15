/* Tiny app-wide signals for moments the whole app should react to, without wiring props through every page. */

const STAMP = 'tb:stamp'

/** A place was just marked visited: its stamp slams onto the screen wherever you are. */
export const announceStamp = (placeId: string) => window.dispatchEvent(new CustomEvent(STAMP, { detail: placeId }))

export function onStamp(fn: (placeId: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail)
  window.addEventListener(STAMP, h)
  return () => window.removeEventListener(STAMP, h)
}
