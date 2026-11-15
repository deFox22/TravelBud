import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'

export interface MapPoint {
  lat: number
  lng: number
  label: string
}

const dot = L.divIcon({ className: 'tb-pin', html: '<span class="tb-dot visited" style="width:20px;height:20px;margin:0;border-width:3px"></span>', iconSize: [20, 20], iconAnchor: [10, 10] })

function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 7)
      return
    }
    map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])).pad(0.25), { maxZoom: 8 })
  }, [points, map])
  return null
}

/** Small read-only map: a few pins and, optionally, a route through them in order. */
export function MiniMap({ points, route, height = 220 }: { points: MapPoint[]; route?: boolean; height?: number }) {
  return (
    <div className="minimap" style={{ height }}>
      <MapContainer center={[20, 0]} zoom={2} zoomControl={false} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} attributionControl={false} style={{ height: '100%' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} crossOrigin="anonymous" />
        <Fit points={points} />
        {route && points.length > 1 && <Polyline positions={points.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#FF7A2F', weight: 4, dashArray: '10 6', opacity: 0.9, lineCap: 'round' }} />}
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={dot} interactive={false}>
            <Tooltip permanent direction="top" offset={[0, -12]} className="minimap-tip">
              {p.label}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
