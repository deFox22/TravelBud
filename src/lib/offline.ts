/* Save the map tiles around a place so the Trail's map works without signal.
   Tiles go into the same cache the service worker serves from. */

const CACHE = 'osm-tiles'
const TILE = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

function tileXY(lat: number, lng: number, z: number): [number, number] {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latR = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n)
  return [x, y]
}

export const supportsOffline = (): boolean => typeof caches !== 'undefined'

/** Tiles for zooms 9 to 13 within about 12 km of the point: roughly 80 small images. */
export async function saveMapOffline(lat: number, lng: number, onProgress?: (done: number, total: number) => void): Promise<number> {
  const urls: string[] = []
  const spanDeg = 0.11
  for (let z = 9; z <= 13; z++) {
    const [x0, y0] = tileXY(lat + spanDeg, lng - spanDeg, z)
    const [x1, y1] = tileXY(lat - spanDeg, lng + spanDeg, z)
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) urls.push(TILE(z, x, y))
  }
  const cache = await caches.open(CACHE)
  let done = 0
  // A few at a time, politely.
  const queue = [...urls]
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift()!
      try {
        if (!(await cache.match(u))) {
          const r = await fetch(u, { mode: 'cors' })
          if (r.ok) await cache.put(u, r)
        }
      } catch {
        /* skip */
      }
      done++
      onProgress?.(done, urls.length)
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return urls.length
}
