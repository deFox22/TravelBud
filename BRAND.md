# TravelBud brand · V2 Daylight Trail

The brand is defined by the design kit, not by this file. This file says where things live and how the app uses them.

- **Guidelines:** `docs/TravelBud-brand-guidelines.pdf` (23 pages). The developer handoff is `docs/brand-handoff.md`.
- **Tokens:** `src/styles/brand-tokens.css` is generated from the kit (`tokens.json`). Do not hand-edit it; regenerate from the kit. `src/styles/tokens.css` maps the app's own variable names onto it, and `src/styles/brand.css` holds the component rules from the kit.
- **Artwork:** `public/brand/` holds Scout (five moods, head, ranger), the logo lockups and wordmark, badges, stamps, map pins, favicon and app icons. All SVGs have outlined text, so no font is needed to render them.

## Scout

Scout is the logo and the mascot: a fox with a ranger hat and a teal scarf. Use the kit's artwork as-is. Never redraw, recolour, rotate, stretch, outline, or crop Scout's hat or ears. One Scout per screen. Scout sits on sand, cream, sage or sky, never on a photo.

Moods and where the app uses them: **happy** (default, the Trail, headers), **wave** (greeting, postcard notes), **excited** (celebrations, packed, the year story cover), **think** (nudges, choices, errors), **sleepy** (empty states). Minimum size: 40 px head, 64 px full body.

## Colour

Forest `#1F3B2D` is the ink. Ember `#FF7A2F` is the one hero colour: primary buttons (with a forest label, never white), the active tab, the completed trail, visited pins, progress. Sand `#F4EAD5` is the page. Teal `#14857C` is for icons, rings and small accents; links use the darker `#0D6A63`. Sun `#FFC24B` is ratings, tape and the sun. Dark mode is neutral charcoal, not forest. Use the semantic tokens (`--tb-primary`, `--tb-text`…), never raw hex.

## Type

Baloo 2 at 800 for titles, big numbers and badges, never for paragraphs. Lexend for everything else. Both ship with the app via `@fontsource-variable`. Big numbers are forest, tabular, and count up the first time they show.

## Components, in one line each

Buttons: rounded square, radius 14, 48 high, ember with forest text; secondary is sand. Cards: white, radius 20, soft forest shadow, no border. Inputs: filled sand, radius 14, 52 high, no border; focus turns white with a teal ring. Stats: one slim strip, never tiles. Scout speaks through a tilted postcard with a postage stamp. Trip status is a soft chip with a Lucide icon. Memories are Polaroids with sun-yellow tape. Packing items get an ink PACKED stamp, not a strikethrough. The trail is a forest dashed route with the completed part in ember, mini stamps for days, Scout at today, and a locked badge at the summit. Map pins: ember dot visited, white dot with a teal ring wishlist, ember teardrop with Scout when selected. Empty states show Scout asleep under the stars. Loading shows Scout walking a dashed trail.

## Icons and motion

Lucide line icons only, 24 px in tabs and 20 px inline, 2 px stroke (2.25 when active). Emoji stay only where they are content: weather and the little badges inside popups. Motion is quick and a little bouncy: 120 ms press, 320 ms sheets and stamps, 420 ms badge pop, 900 ms confetti and count-ups. Everything respects reduced motion.

## Open with the designer

See the handoff's section 9: the badge unlock motion is provisional, the app icon is teal (ember is the alternative), map tiles need a provider, and the badge list and unlock rules are still to be defined.
