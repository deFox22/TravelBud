import exifr from 'exifr'
import type { Photo } from './types'

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const todayISO = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const parseLocal = (iso: string) => new Date(iso + 'T00:00:00')

export function fmtDate(iso?: string, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return ''
  const d = parseLocal(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', ...opts })
}

export function fmtRange(a?: string, b?: string): string {
  if (!a && !b) return 'Dates TBD'
  if (a && !b) return `From ${fmtDate(a)}`
  if (!a && b) return `Until ${fmtDate(b)}`
  if (a === b) return fmtDate(a)
  const sameYear = a!.slice(0, 4) === b!.slice(0, 4)
  return `${fmtDate(a, sameYear ? { year: undefined } : {})} – ${fmtDate(b)}`
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseLocal(b).getTime() - parseLocal(a).getTime()) / 86_400_000)
}

export const daysUntil = (iso: string): number => daysBetween(todayISO(), iso)

export function addDays(iso: string, n: number): string {
  const d = parseLocal(iso)
  d.setDate(d.getDate() + n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function weekday(iso: string): string {
  return parseLocal(iso).toLocaleDateString(undefined, { weekday: 'short' })
}

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : (many ?? one + 's')}`
}

export function flag(cc?: string): string {
  if (!cc || cc.length !== 2) return ''
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
}

export function fmtMoney(n: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${currency} ${Math.round(n)}`
  }
}

/** Shrink an image so photos don't bloat storage. Returns a JPEG data URL. */
export function resizeImage(file: File, max = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

export interface GeoResult {
  name: string
  display: string
  country: string
  countryCode: string
  lat: number
  lng: number
}

interface NominatimRow {
  name?: string
  display_name: string
  lat: string
  lon: string
  address?: { country?: string; country_code?: string; city?: string; town?: string; village?: string; state?: string }
}

function toGeo(x: NominatimRow): GeoResult {
  const a = x.address ?? {}
  return {
    name: x.name || a.city || a.town || a.village || x.display_name.split(',')[0].trim(),
    display: x.display_name,
    country: a.country ?? '',
    countryCode: a.country_code ?? '',
    lat: parseFloat(x.lat),
    lng: parseFloat(x.lon),
  }
}

/** Free place search via OpenStreetMap's Nominatim (no API key). */
export async function geocode(q: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'Accept-Language': navigator.language || 'en' } })
  if (!r.ok) throw new Error(`Search failed (${r.status})`)
  const rows = (await r.json()) as NominatimRow[]
  return rows.map(toGeo)
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&lat=${lat}&lon=${lng}`
  const r = await fetch(url, { headers: { 'Accept-Language': navigator.language || 'en' } })
  if (!r.ok) return null
  const row = (await r.json()) as NominatimRow & { error?: string }
  if (row.error) return null
  return { ...toGeo(row), lat, lng }
}

export function download(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Whole months from today until `iso` (negative when past). */
export function monthsUntil(iso: string): number {
  return daysUntil(iso) / 30.44
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export interface ForecastDay {
  date: string
  code: number
  hi: number
  lo: number
  rain: number
  sunrise?: string
  sunset?: string
}

const WMO: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Clear' },
  1: { icon: '🌤️', label: 'Mostly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Fog' },
  51: { icon: '🌦️', label: 'Drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌧️', label: 'Drizzle' },
  61: { icon: '🌧️', label: 'Rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  66: { icon: '🌧️', label: 'Freezing rain' },
  67: { icon: '🌧️', label: 'Freezing rain' },
  71: { icon: '🌨️', label: 'Snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  77: { icon: '🌨️', label: 'Snow grains' },
  80: { icon: '🌦️', label: 'Showers' },
  81: { icon: '🌧️', label: 'Showers' },
  82: { icon: '⛈️', label: 'Heavy showers' },
  85: { icon: '🌨️', label: 'Snow showers' },
  86: { icon: '🌨️', label: 'Snow showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm' },
  99: { icon: '⛈️', label: 'Thunderstorm' },
}

export const weatherIcon = (code: number) => WMO[code] ?? { icon: '🌡️', label: 'Weather' }

export const usesFahrenheit = () => /^en-(US|BS|BZ|KY|LR|PW|FM|MH)$/i.test(navigator.language || '')

/** Free 16-day forecast from Open-Meteo (no API key). */
export async function fetchForecast(lat: number, lng: number): Promise<ForecastDay[]> {
  const unit = usesFahrenheit() ? '&temperature_unit=fahrenheit' : ''
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=16${unit}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Forecast failed (${r.status})`)
  const js = (await r.json()) as {
    daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; sunrise?: string[]; sunset?: string[] }
  }
  const clock = (iso?: string) => {
    if (!iso) return undefined
    const t = iso.slice(11, 16)
    const [h, m] = t.split(':').map(Number)
    if (!Number.isFinite(h)) return undefined
    return usesFahrenheit() ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}` : t
  }
  return js.daily.time.map((date, i) => ({
    date,
    code: js.daily.weather_code[i],
    hi: Math.round(js.daily.temperature_2m_max[i]),
    lo: Math.round(js.daily.temperature_2m_min[i]),
    rain: js.daily.precipitation_probability_max[i] ?? 0,
    sunrise: clock(js.daily.sunrise?.[i]),
    sunset: clock(js.daily.sunset?.[i]),
  }))
}

export const thumbOf = (p: Photo): string => p.thumb ?? p.dataUrl

/** Full-size (max 1600px) plus a 400px thumbnail for grids. Throws if the browser cannot decode the file (HEIC, for example). */
export async function makePhoto(file: File): Promise<Photo> {
  const [dataUrl, thumb] = await Promise.all([resizeImage(file, 1600, 0.85), resizeImage(file, 420, 0.75)])
  return { id: uid(), dataUrl, thumb }
}

export interface PhotoMeta {
  date?: string
  lat?: number
  lng?: number
}

/** Pull the shot date and GPS position out of a photo's EXIF, when present. Never throws. */
export async function readExif(file: File): Promise<PhotoMeta> {
  const out: PhotoMeta = {}
  try {
    const meta = (await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] })) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined
    const d = meta?.DateTimeOriginal ?? meta?.CreateDate
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      out.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
  } catch {
    /* no exif */
  }
  try {
    const gps = await exifr.gps(file)
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude) && (gps.latitude !== 0 || gps.longitude !== 0)) {
      out.lat = gps.latitude
      out.lng = gps.longitude
    }
  } catch {
    /* no gps */
  }
  return out
}

export const isHeic = (f: File) => /\.(heic|heif)$/i.test(f.name) || /heic|heif/i.test(f.type)

export interface LocalNow {
  timezone: string
  temp: number
  code: number
}

/** Time zone plus current conditions for a point, via Open-Meteo. */
export async function fetchLocalNow(lat: number, lng: number): Promise<LocalNow> {
  const unit = usesFahrenheit() ? '&temperature_unit=fahrenheit' : ''
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto&forecast_days=1${unit}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Local lookup failed (${r.status})`)
  const js = (await r.json()) as { timezone: string; current: { temperature_2m: number; weather_code: number } }
  return { timezone: js.timezone, temp: Math.round(js.current.temperature_2m), code: js.current.weather_code }
}

/** Friendly name for a booking link's site. */
export function siteLabel(url: string): string {
  const h = hostOf(url).toLowerCase()
  if (h.includes('airbnb')) return 'Airbnb'
  if (h.includes('vrbo')) return 'Vrbo'
  if (h.includes('booking.com')) return 'Booking.com'
  if (h.includes('hotels.com')) return 'Hotels.com'
  if (h.includes('expedia')) return 'Expedia'
  if (h.includes('marriott')) return 'Marriott'
  if (h.includes('hilton')) return 'Hilton'
  return h || 'link'
}

export const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
