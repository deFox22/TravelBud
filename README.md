# TravelBud 🧭

Your one spot for all things travel: memories and photos from places you've been, a map of everywhere you've visited (and want to visit), a planner for upcoming trips, your travel documents, and the trusted people who look after home while you're away.

Everything is stored privately in your browser on this device. Nothing is uploaded anywhere.

## How to open it

**Easiest:** double-click **`Open TravelBud.cmd`** in this folder. It installs what it needs the first time, builds the app, opens it in your browser at http://localhost:5173, and keeps running in a small window. Close that window to stop.

**Install it as an app:** once it is open in Chrome or Edge, click the install icon at the right end of the address bar (or the browser menu → "Install TravelBud"). You get a desktop and Start-menu icon with Scout on it, and it opens in its own window. The launcher still needs to be running in the background, so start it first, or pin the launcher next to the app icon.

**On your phone:** it is a web app, so it needs to be hosted somewhere (any static host works: Netlify, Vercel, GitHub Pages, a folder on your own server). Upload the `dist` folder after `npm run build`, open the address on the phone, and use "Add to Home Screen". Then export a backup on the computer and import it on the phone.

**For development:**

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Both the launcher and the dev server use port 5173 on purpose: browser storage is per address, so this keeps your data in one place.

To build a static version you can host anywhere:

```bash
npm run build
```

The output lands in `dist/`. The build includes a web app manifest and service worker, so when hosted over HTTPS (or served from `npm run preview`) you can install TravelBud to your home screen or desktop like a native app, and the app shell works offline.

## What's inside

| Section | What it does |
| --- | --- |
| **Scout** | The fox. Greets you on Home with a tip that fits the moment (days to go, unpacked bags, a memory worth revisiting), naps in empty states, and hosts the year-in-review. |
| **Home** | Stats, countdown to your next trip, heads-up alerts (expiring passport, unpacked bags, no sitter yet), recent memories, "on this day", wishlist, quick-add. |
| **Memories** | A travel journal. Drop in photos and the date and location fill in from the picture's EXIF data (and the memory auto-links to a trip on those dates). Grid or timeline view, fullscreen lightbox with arrow keys, search, tags, favorites. |
| **Places** | A world map with pins for places you've visited (teal) and want to visit (terracotta), photo pins for memories, and dashed routes for trips. Search any city or landmark, or click the map to pin a spot. |
| **Starting a trip** | **Plan a trip** or **I'm traveling now** (on Home, in Scout's bubble, and on the Trips page) opens a three-step wizard: where (search the place right there), when (with an "I'm on this trip right now" option), and set-up (a day per date, packing list, budget). It drops you on the Trail. |
| **During a trip** | The Trail is home base: tick off today's plan, add a plan item inline, **Capture a moment** (a memory already linked to the trip and dated today), **Log expense** and **Quick note** inline, and **Your stay**: the Airbnb or hotel link, directions, Wi-Fi and door code, and your own photos of the place. Listing photos can't be imported from Airbnb automatically, so add your own or screenshots. |
| **Trips** | A **Trail** tracker for the trip that's close or underway: Scout hikes a mountain path with one waypoint per day, today's plan with checkboxes, the forecast with sunrise and sunset, packing, spend, and memories at a glance. Dates, status (dreaming → planning → booked → completed), day-by-day itinerary, an ideas inbox you can slot into days, packing list with quick templates, bookings with confirmation numbers, budget and expenses, a 16-day weather forecast for a linked place, a mini-map of the route, an album of the trip's memories, a printable itinerary, a printable handoff sheet for the sitter, a Ken Burns replay of the trip's photos, confetti when the trip is done or the bag is packed, and a **share link** that packs the whole plan into a URL (no server needed) so a travel companion can save a copy. |
| **Sitters** | Trusted housesitters, pet sitters, neighbors, family: contact info, rating, whether they have a key, notes, and history. Plus the **home guide**: Wi-Fi, codes, trash day, pets and their routines, who to call. |
| **Wallet** | Passport and other documents with expiry tracking (numbers shown masked), loyalty program numbers, emergency contacts. |
| **Insights** | A 3D globe with hex-tiled countries that fill in as you travel, animated arcs for trip routes, and a tap-through **Year in Review** story per year. Plus passport stamps, nights away and memories per year, top-rated places, companions, tags. |
| **Search** | Ctrl+K (or the search box) finds any trip, memory, place, person, or document and jumps straight to it. |
| **Settings & backup** | Your name, light/dark/auto theme, export a JSON backup, import one on another device, or start over. |

## Backups

Your data lives in this browser's IndexedDB. Clearing site data erases it, so export a backup from **Settings & backup** every so often and keep it somewhere safe. Import it to move everything to another device.

The wallet and home guide store numbers, codes and passwords unencrypted on this device. Treat a backup file like you would a wallet.

## Brand

See [BRAND.md](BRAND.md) for the palette, type, Scout's moods and voice, and icon rules.

## Built with

Vite, React, TypeScript, react-globe.gl (three.js) for the globe, Leaflet with OpenStreetMap tiles, Nominatim for place search, Open-Meteo for forecasts, flag images from flagcdn.com, idb-keyval for storage, and vite-plugin-pwa. Map tiles, place search, forecasts and flags need an internet connection; everything else works offline.
