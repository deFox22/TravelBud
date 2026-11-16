/* Tiny app-wide signals for moments the whole app should react to, without wiring props through every page. */

const STAMP = 'tb:stamp'

/** A place was just marked visited: its stamp slams onto the screen wherever you are. */
export const announceStamp = (placeId: string) => window.dispatchEvent(new CustomEvent(STAMP, { detail: placeId }))

export function onStamp(fn: (placeId: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail)
  window.addEventListener(STAMP, h)
  return () => window.removeEventListener(STAMP, h)
}

const CAPTURE = 'tb:capture'

/** Open the quick-capture sheet from anywhere, optionally tied to a trip, without leaving the page you are on. */
export const requestCapture = (tripId?: string) => window.dispatchEvent(new CustomEvent(CAPTURE, { detail: tripId ?? '' }))

export function onCaptureRequest(fn: (tripId?: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail || undefined)
  window.addEventListener(CAPTURE, h)
  return () => window.removeEventListener(CAPTURE, h)
}

const SEARCH = 'tb:search'

/** Open search from anywhere. Phones have no sidebar box and no Ctrl+K. */
export const requestSearch = () => window.dispatchEvent(new Event(SEARCH))

export function onSearchRequest(fn: () => void): () => void {
  window.addEventListener(SEARCH, fn)
  return () => window.removeEventListener(SEARCH, fn)
}
