# TravelBud · Brand + design kit · developer handoff

**Direction:** V2 Daylight Trail · **Version:** 1.0 · **Date:** 14 Nov 2026
**Stack:** Vite + React + TypeScript · Tailwind (v3 preset or v4 theme) · Lucide (`lucide-react`) · Leaflet (+ `leaflet.markercluster`)

The PDF (`../book/TravelBud-brand-guidelines.pdf`) shows how everything looks. This file covers how to build it.
Every colour, size and timing in the PDF comes from the same token source as `tokens.json`, `tokens.css`, `tokens.ts` and the Tailwind files.

---

## 0. Update BRAND.md first

The fonts have changed. **Baloo 2** (display) and **Lexend** (text) replace **Fraunces** and **DM Sans**.
Remove the Fraunces and DM Sans imports, update BRAND.md, and point it at this kit. The palette also moves to the V2 Daylight Trail tokens below.

## 1. Install

```bash
npm i lucide-react leaflet leaflet.markercluster @fontsource-variable/baloo-2 @fontsource-variable/lexend
npm i -D @types/leaflet @types/leaflet.markercluster
```

```ts
// main.tsx
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/lexend';
import './brand/tokens.css';      // copy handoff/tokens.css → src/brand/
import './index.css';             // your Tailwind entry
```

If you use the variable packages, the family names are `'Baloo 2 Variable'` and `'Lexend Variable'`. Either alias them or prepend them in `--tb-font-display` / `--tb-font-body`:

```css
:root { --tb-font-display: 'Baloo 2 Variable', 'Baloo 2', system-ui, sans-serif;
        --tb-font-body: 'Lexend Variable', 'Lexend', system-ui, sans-serif; }
```

If you use Google Fonts instead, request `Baloo+2:wght@600;700;800` and `Lexend:wght@400;500;600;700` with `display=swap`, and preload both woff2 files.
Baloo 2 is only used at 800 (600 is a fallback). Never set paragraphs in Baloo.

Copy `assets/` to `public/brand/` so the paths in `markers.ts` and the manifest work.

## 2. Tailwind

**v4** (recommended for a new Vite app):

```css
/* index.css */
@import "tailwindcss";
@import "./brand/tokens.css";
@import "./brand/tailwind.theme.css";
```

**v3:**

```js
// tailwind.config.js
module.exports = {
  presets: [require('./src/brand/tailwind.preset.js')],
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};
```

Both files map utilities to CSS variables, so **colours switch with the theme on their own**. You don't need `dark:` variants for colour.
Utility names follow the token names: `bg-bg`, `bg-surface`, `bg-primary`, `text-text`, `text-text-muted`, `text-link`, `border-border`, `rounded-md` (14), `rounded-lg` (20), `shadow-card`, `font-display`, `text-title`, `text-number-sm`, `h-btn`, `h-tap`, `duration-fast`, `ease-standard`, `animate-pop`.
Both setups were checked: the example components type-check with `tsc --strict`, and every utility they use compiles in Tailwind 3.4 and 4.x.

## 3. Themes

- Light is the default on `:root`.
- Neutral dark uses charcoal, not forest. It applies with `<html data-theme="dark">`, or automatically from the OS unless `data-theme="light"` is set.
- Offer a three-way setting: System / Light / Dark. Store it and set `data-theme` on `<html>` before first paint to avoid a flash.
- `--tb-number` (big numbers) is forest in light and off-white in dark.
- Ink stamps use `mix-blend-mode: multiply` on paper in light mode. In dark mode, switch to the dark ink colours (`--tb-ink-red`, `--tb-ink-blue`) **without** multiply, or the ink disappears.
- Badges, stamps, Scout and the app icon are fixed artwork. They are the same in both themes.

## 4. Tokens at a glance

| Group | Key values |
|---|---|
| Brand | forest `#1F3B2D` · ember `#FF7A2F` · sand `#F4EAD5` · teal `#14857C` · sun `#FFC24B` · sage `#A9C6A0` · cream `#FFF4E6` |
| Light roles | bg `#F4EAD5` · surface `#FFFFFF` · fill `#EADBBE` · text `#1F3B2D` · muted `#5E6E62` · primary `#FF7A2F` · on-primary `#1F3B2D` · link `#0D6A63` |
| Dark roles | bg `#17181A` · surface `#222326` · fill `#2C2D31` · text `#F2F2F0` · muted `#B4B5B0` · primary `#FF8A47` · on-primary `#17181A` · link `#4CC2B6` |
| Type | number-xl 64/64 · display 40/44 · title 28/32 · headline 22/26 · number-sm 22/24 (Baloo 2 800) · body-lg 17/24 · body 15/22 · label 14/18 600 · caption 12/16 500 · overline 11/14 700 +0.12em (Lexend) |
| Space | 4 px grid: 2 4 8 12 16 20 24 32 40 48 64 · screen padding 20 · card padding 16 |
| Radius | xs 6 · sm 10 (postcard) · md 14 (buttons, inputs) · lg 20 (cards) · xl 24 (sheets, toast) · pill |
| Shadow | card `0 14px 28px -16px` · raised `0 10px 24px -8px` · button `0 6px 14px -8px` (forest alpha in light, black in dark) · focus = 3 px teal ring |
| Motion | fast 120 · base 200 · slow 320 · pop 420 · confetti 900 · toast 4000 ms · standard `cubic-bezier(.2,.8,.2,1)` · pop `cubic-bezier(.34,1.56,.64,1)` |
| Layout | tap ≥ 44 · button 48 / 36 · input 52 · tab bar 84 · stat strip 56 |

**Accessibility note:** primary buttons use **forest text on ember** (4.7:1, AA). White on ember is only 2.6:1, so it is not used for text. Text links are the darker teal `#0D6A63` (6.4:1 on white, 5.4:1 on sand). The brighter teal `#14857C` is for icons, rings and small accents only.

## 5. Component specs (the picks)

| # | Component | Spec |
|---|---|---|
| B1-B / B2-C | **Button** | Rounded square, radius 14, height 48 (sm 36), Lexend 600 16. Primary is ember with forest label. Secondary is sand (`fill`) with forest label. Link is teal text with →. **Pressed:** fill one step darker, scale .97, shadow off, 120 ms. **Focus:** 3 px teal ring (`:focus-visible` only). **Disabled:** `disabled-bg` + `disabled-text`, no shadow. → `components/Button.tsx` |
| B3-A | **Card** | White surface, radius 20, `shadow-card`, no border, padding 16. Interactive cards scale to .98 when pressed. → `Card.tsx` |
| B4 | **Stat strip** (no tiles) | One row, 56 high, 3–4 stats with hairline dividers. Number in Baloo 22/800 tabular, label in caption muted. **Don't build tile grids anywhere.** Use inline rows for lists. → `StatStrip.tsx` |
| B5-A | **Big number** | Solid forest (`--tb-number`), Baloo 800, number-xl. It counts up over 900 ms the first time it shows, and not in reduced motion. |
| B6-B / B7-D | **Tab bar** | Frosted: `tabbar-bg` + `backdrop-filter: blur(18px) saturate(1.4)`, 84 high including the safe area, hairline top border. 5 tabs: Home `House`, Trail `Route`, Places `MapPin`, Badges `Award`, Me `User`. **Active:** a 28×4 ember bar on the top edge, an ember icon and a bold label in text colour. Inactive tabs are `text-muted`. Labels are always shown. |
| B8-D | **Postcard note** | Scout's note on Home. Warm surface, radius 10, rotated −2°, postage stamp top-right, "From Scout" caption, body-lg 600 message, dashed divider, link action + "Later". Scout (wave) sits off the bottom-left corner. One at a time. → `PostcardNote.tsx` |
| B9-A | **Trail path** | SVG path. The remaining route is a forest dashed stroke (7 px, dash 18/13, 60% opacity). The completed part is an ember dashed stroke (10 px, dash 22/11), with round caps. |
| B10-B | **Waypoints** | Mini postage stamps. Past = stamp with a red cancel mark and tick. Today = full-colour stamp with Scout beside it. Future = dashed empty slot. → `assets/stamps/waypoint-*.svg` |
| B11-D | **Summit** | A locked badge shield sits on the summit with a forest pill label ("Half Dome badge"). Reaching the summit unlocks it with the toast. |
| B12-C | **Unlock toast** | Forest card, radius 24, 72 high, top of screen under the safe area. Badge art left, Baloo headline title, caption. It slides in (320 ms), pops the badge, and fires confetti once (900 ms). It auto-dismisses after 4 s; tap opens the badge. `role="status"`. → `Toast.tsx` |
| B13 | **Unlock motion** | **PROVISIONAL.** A short bouncy pop (420 ms, scale .6 → 1.08 → 1, ease-pop). Revisit later. |
| B14-C | **Badge display** | Cork board on Collection. Pins are tilted ±8°, and locked slots are dashed outlines in cork brown. |
| B15-A | **Logbook** | Passport scatter. Postage stamps rotated ±7° with overlaps, and ink postmarks over them, on paper (`#FFFDF6`, dark `#2A2925`). |
| B16-D / B17-C | **Map pins** | Visited = ember dot. Wishlist = white dot with a teal ring (26 px, 4 px ring, 44 px hit area). Selected = ember teardrop with Scout. Clusters are a ring split ember/teal by visited share, with the count in Baloo. → `markers.ts` |
| B18-A | **Status chips** | Soft tint + Lucide icon + label, pill, 32 high. Dreaming `Sparkles`, Planning `CalendarClock`, Booked `Ticket`, Completed `CircleCheckBig`. → `Chip.tsx` |
| B19-A | **Inputs** | Filled sand, radius 14, height 52, no border. Label above (label type). **Focus:** white fill + teal ring. **Error:** 2 px danger ring + caption message below. **Disabled:** `disabled-bg`. Toggle 52×32 (ember on). Checkbox 26 px radius 8 (ember on). |
| B20-C | **Packing** | When an item is checked, an ink "PACKED" stamp slams in (320 ms, scale 1.4 → 1, −14° → −8°). Don't strike through the item. Unchecked = an empty checkbox square. Progress shows as "3 / 6 packed" plus a slim bar. |
| B21-A | **Icons** | Lucide line icons only: 24 px in tabs, 20 inline, stroke 2 (2.25 when active). |
| B22-C | **Dark mode** | Neutral charcoal (section 3). |
| B23-D | **Empty state** | Scout asleep under the stars: forest night art, moon, stars. Then a title, one line of text and an optional primary action. |
| B24-A | **Loading** | Scout walks along a dashed trail. `tb-walk` loop, 1.2 s (bob 4 px, tilt ±2°). The ember part of the trail can show progress. Short copy: "Packing your bag…". |
| B25 | **App icon** | Fox head on teal (primary). The ember version is included as an alternative. |
| B26-B | **Memory frame** | Polaroid: white border 9 px, 34 px bottom caption, ±3° tilt, sun-yellow tape at 75% opacity. |

Example components are in `components/` (typed, Tailwind, tokens only). Treat them as references: copy them, then adapt.

## 6. Leaflet

- Use `markers.ts`: `visitedIcon`, `wishlistIcon`, `selectedIcon()`, `clusterIcon(visited, wishlist)`.
- Tiles: use a quiet, low-detail basemap and tint it towards the map tokens (`--tb-map-land/park/water/road`). Options are a custom MapTiler or Stadia style in these colours, or CARTO Positron light / Dark Matter for dark, with `filter: sepia(.15) saturate(.8)` on the tile pane in light mode. Keep labels small and muted, because the pins carry the colour.
- Keep a 44 px hit area on markers. Opening a pin shows the place card (Card + Chip + buttons) above the tab bar.

## 7. Motion and accessibility

- Durations and easings are in `tokens.css`. The keyframes are `tb-pop` (provisional), `tb-toast-in`, `tb-confetti`, `tb-walk` and `tb-stamp`.
- `prefers-reduced-motion` turns motion into near-instant changes. That covers count-up, confetti and the walk loop.
- Minimum tap target is 44 × 44. Use `:focus-visible` for focus rings only.
- Respect Dynamic Type / browser zoom: tokens are px for fidelity, so test at 200% zoom.

## 8. Assets

| Folder | Contents |
|---|---|
| `assets/logo/` | `travelbud-mark` (Scout head), `scout-full`, `travelbud-wordmark-{forest,cream}`, `travelbud-lockup-horizontal-*`, `travelbud-lockup-stacked-*`. SVG with text converted to outlines, plus PNG at 1× and 2× sizes. |
| `assets/app-icon/teal/` (primary), `assets/app-icon/ember/` (alt) | `ios/` (1024 App Store … 20, opaque, square, iOS rounds the corners) · `android/mipmap-*/ic_launcher(.png, _round, _foreground)` + `mipmap-anydpi-v26/ic_launcher.xml` + `values/ic_launcher_background.xml` + `play-store-512.png` · `pwa/icon-192/512` (any) + `icon-maskable-192/512` + `apple-touch-icon-180` · master SVGs |
| `assets/favicon/` | `favicon.svg` (use first), `favicon.ico` (16/32/48), `favicon-16/32/48.png`, `apple-touch-icon.png` (180) |
| `assets/scout/` | happy, wave, excited, think, sleepy, ranger-sash, head |
| `assets/badges/` | enamel pins (gold / silver / black nickel), embroidered patches (copper / silver), locked shapes, ranger patch |
| `assets/stamps/` | postage stamps, round postmark, postmark with cancel lines, cancel lines, ink PACKED, waypoint past / today / future |
| `assets/map-pins/` | visited dot, wishlist dot, selected teardrop, cluster example + template |

All SVGs are valid standalone files: each has `xmlns` and a `viewBox`, and contains no live text, so no font is needed.

```html
<link rel="icon" href="/brand/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/favicon/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/brand/favicon/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#F4EAD5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17181A" media="(prefers-color-scheme: dark)">
```

`manifest.webmanifest` is in this folder.

Tier rarity, from common to legendary: **Copper → Silver → Gold → Black nickel**.

## 9. Open questions

1. **Unlock motion (B13)** is provisional. The bouncy pop ships for now.
2. **App icon:** teal is primary and ember is the alternative. Confirm teal before you submit to the stores.
3. **Primary label colour:** forest-on-ember was chosen for contrast. Some earlier mockups used white on ember. Confirm.
4. **Map tiles:** choose a provider and style (see section 6).
5. **Badge artwork:** the badge set is a starter set. The full list, names and unlock rules are still needed.
