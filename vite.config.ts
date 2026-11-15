import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Keep the app shell offline; map tiles, flags and APIs are fetched live.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
