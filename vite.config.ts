import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'globe', test: /node_modules[\/](three|three-globe|react-globe\.gl|globe\.gl|h3-js|d3-)/ },
            { name: 'map', test: /node_modules[\/](leaflet|react-leaflet|@react-leaflet)/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TravelBud',
        short_name: 'TravelBud',
        description: 'Memories, places, trip plans and trusted housesitters, all in one spot.',
        theme_color: '#15605d',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
        // Live data stays usable offline: tiles and flags are kept, weather and search fall back to the last answer.
        runtimeCaching: [
          { urlPattern: /^https:\/\/tile\.openstreetmap\.org\//, handler: 'CacheFirst', options: { cacheName: 'osm-tiles', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 90 }, cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: /^https:\/\/flagcdn\.com\//, handler: 'CacheFirst', options: { cacheName: 'flags', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: /^https:\/\/api\.open-meteo\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'weather', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 } } },
          { urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\//, handler: 'NetworkFirst', options: { cacheName: 'geocode', expiration: { maxEntries: 200 } } },
          { urlPattern: /\/data\/countries\.geojson$/, handler: 'CacheFirst', options: { cacheName: 'shapes' } },
        ],
      },
    }),
  ],
})
