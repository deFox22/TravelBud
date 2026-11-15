import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import { useStore } from '../lib/store'
import { useIsDark } from './ui'
import type { Place } from '../lib/types'

interface CountryFeature {
  type: 'Feature'
  properties: Record<string, string>
  geometry: unknown
}

let cache: CountryFeature[] | null = null
async function loadCountries(): Promise<CountryFeature[]> {
  if (cache) return cache
  const r = await fetch(`${import.meta.env.BASE_URL}data/countries.geojson`)
  const js = (await r.json()) as { features: CountryFeature[] }
  cache = js.features
  return cache
}

const ALIASES: Record<string, string> = {
  'united states': 'united states of america',
  usa: 'united states of america',
  'czech republic': 'czechia',
  'the netherlands': 'netherlands',
  'republic of ireland': 'ireland',
  'south korea': 'south korea',
  'north macedonia': 'north macedonia',
  eswatini: 'eswatini',
  'bosnia and herzegovina': 'bosnia and herzegovina',
}
const norm = (s: string) => {
  const k = s.trim().toLowerCase()
  return ALIASES[k] ?? k
}

/**
 * The world as a hex-tiled globe. Visited countries fill in teal, wishlist in terracotta,
 * places glow as points, and trips with several places draw animated arcs between them.
 */
export default function WorldGlobe({ height = 420, interactive = true }: { height?: number; interactive?: boolean }) {
  const { data } = useStore()
  const dark = useIsDark()
  const ref = useRef<GlobeMethods | undefined>(undefined)
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [countries, setCountries] = useState<CountryFeature[]>([])

  useEffect(() => {
    loadCountries()
      .then(setCountries)
      .catch(err => console.warn('No country shapes', err))
  }, [])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const visited = useMemo(() => {
    const codes = new Set<string>()
    const names = new Set<string>()
    for (const p of data.places.filter(x => x.status === 'visited')) {
      if (p.countryCode) codes.add(p.countryCode.toUpperCase())
      if (p.country) names.add(norm(p.country))
    }
    return { codes, names }
  }, [data.places])
  const wish = useMemo(() => {
    const codes = new Set<string>()
    const names = new Set<string>()
    for (const p of data.places.filter(x => x.status === 'wishlist')) {
      if (p.countryCode) codes.add(p.countryCode.toUpperCase())
      if (p.country) names.add(norm(p.country))
    }
    return { codes, names }
  }, [data.places])

  const match = (f: CountryFeature, set: { codes: Set<string>; names: Set<string> }) => {
    const p = f.properties
    return set.codes.has(p.ISO_A2) || set.codes.has(p.ISO_A2_EH ?? '') || set.names.has(norm(p.ADMIN ?? p.NAME ?? ''))
  }
  const isVisited = (f: CountryFeature) => match(f, visited)
  const isWish = (f: CountryFeature) => !isVisited(f) && match(f, wish)

  const points = useMemo(() => data.places.map(p => ({ lat: p.lat, lng: p.lng, name: p.name, status: p.status })), [data.places])

  const arcs = useMemo(() => {
    const out: { startLat: number; startLng: number; endLat: number; endLng: number; color: string[]; name: string }[] = []
    for (const t of data.trips) {
      const pts = t.placeIds.map(id => data.places.find(p => p.id === id)).filter((p): p is Place => Boolean(p))
      for (let i = 0; i < pts.length - 1; i++) {
        const done = t.status === 'completed'
        out.push({ startLat: pts[i].lat, startLng: pts[i].lng, endLat: pts[i + 1].lat, endLng: pts[i + 1].lng, color: done ? ['#5cbdb6', '#fffcf7'] : ['#e68a62', '#fde3d0'], name: t.title })
      }
    }
    return out
  }, [data.trips, data.places])

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(dark ? '#0d2423' : '#d9e6e3'),
        emissive: new THREE.Color(dark ? '#06100f' : '#f4efe6'),
        emissiveIntensity: dark ? 0.25 : 0.12,
        shininess: 4,
      }),
    [dark],
  )

  // Controls and starting view.
  useEffect(() => {
    const g = ref.current
    if (!g) return
    const c = g.controls()
    c.autoRotate = true
    c.autoRotateSpeed = 0.55
    c.enableZoom = interactive
    c.enablePan = false
    const first = data.places.find(p => p.status === 'visited') ?? data.places[0]
    g.pointOfView({ lat: first ? first.lat * 0.6 : 20, lng: first ? first.lng : 0, altitude: interactive ? 1.9 : 2.1 }, 0)
    // Pause the spin while the pointer is on the globe.
    const el = wrap.current
    if (!el) return
    const stop = () => {
      c.autoRotate = false
    }
    const start = () => {
      c.autoRotate = true
    }
    el.addEventListener('pointerenter', stop)
    el.addEventListener('pointerleave', start)
    return () => {
      el.removeEventListener('pointerenter', stop)
      el.removeEventListener('pointerleave', start)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, interactive, w > 0])

  const baseHex = dark ? 'rgba(236, 230, 218, 0.16)' : 'rgba(21, 96, 93, 0.2)'

  return (
    <div ref={wrap} className="globe-wrap" style={{ height }}>
      {w > 0 && (
        <Globe
          ref={ref}
          width={w}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          rendererConfig={{ antialias: true, alpha: true }}
          showAtmosphere
          atmosphereColor={dark ? '#5cbdb6' : '#15605d'}
          atmosphereAltitude={0.16}
          hexPolygonsData={countries}
          hexPolygonResolution={3}
          hexPolygonMargin={0.32}
          hexPolygonUseDots={false}
          hexPolygonColor={(f: object) => (isVisited(f as CountryFeature) ? '#5cbdb6' : isWish(f as CountryFeature) ? '#e68a62' : baseHex)}
          hexPolygonAltitude={(f: object) => (isVisited(f as CountryFeature) ? 0.014 : 0.004)}
          hexPolygonLabel={(f: object) => {
            const p = (f as CountryFeature).properties
            const tag = isVisited(f as CountryFeature) ? '✅ visited' : isWish(f as CountryFeature) ? '💭 wishlist' : ''
            return `<div class="globe-tip"><b>${p.ADMIN ?? p.NAME ?? ''}</b>${tag ? `<div>${tag}</div>` : ''}</div>`
          }}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={(p: object) => ((p as { status: string }).status === 'visited' ? '#fffcf7' : '#e68a62')}
          pointAltitude={0.035}
          pointRadius={0.32}
          pointLabel={(p: object) => `<div class="globe-tip"><b>${(p as { name: string }).name}</b></div>`}
          arcsData={arcs}
          arcColor="color"
          arcDashLength={0.45}
          arcDashGap={0.25}
          arcDashAnimateTime={2600}
          arcStroke={0.55}
          arcAltitudeAutoScale={0.4}
          arcLabel={(a: object) => `<div class="globe-tip"><b>✈️ ${(a as { name: string }).name}</b></div>`}
        />
      )}
    </div>
  )
}
