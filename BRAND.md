# TravelBud brand guide

TravelBud is a warm, personal travel companion. It should feel like a well-loved notebook with a very organized fox inside, not like a booking site.

## Scout

Scout is the mascot and logo: a round-faced fox with a teal scarf. Scout lives in `src/components/Fox.tsx` as inline SVG and in `public/` as PNG app icons.

- Moods: **happy** (default), **wave** (greeting), **excited** (celebrations, the year story), **think** (nudges and alerts), **sleepy** (empty states).
- Scout speaks in the first person, short and friendly, never corporate. One sentence of fact, one of encouragement.
- Scout is never used for warnings about data loss or deletions. Those are plain text.
- Minimum size 24 px. Keep the scarf; it is the brand color anchor.

## Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Deep teal `--primary` | `#15605d` | `#5cbdb6` | Actions, links, visited, the scarf |
| Terracotta `--accent` | `#d9734a` | `#e68a62` | Wishlist, highlights, the trail, Scout's fur |
| Gold `--gold` | `#d9a441` | `#e2b65a` | Ratings, heads-up alerts, the sun |
| Sand `--bg` | `#f4efe6` | `#111b1a` | Page background with a faint topographic pattern |
| Cream `--surface` | `#fffcf7` | `#1a2725` | Cards and panels |
| Ink `--ink` | `#1e2a2f` | `#ece6da` | Text |

Teal does the work, terracotta points at things, gold celebrates. Never use red except for destructive actions.

## Type

- **Display:** Fraunces (serif, optical sizing). Headlines, numbers, Scout's big moments. Italic for names and years.
- **Body:** DM Sans. Everything else. Labels are small, bold, uppercase, letter-spaced.
- Numbers that matter are large and count up.

## Icons

Lucide icons at 1.8 to 2.2 stroke for navigation and actions. Emoji are reserved for content that is itself illustrative: weather, flags, booking types, and the little badges on empty states.

## Motion

Soft and brief: 150 to 350 ms, ease-out, lift on hover, fade-up on entry. Celebrations (confetti, the slideshow, the year story) are the only places motion gets loud. Everything respects the system "reduce motion" setting.

## Voice

Second person, plain words, no exclamation marks except from Scout. "Heads up" rather than "Warning". "Take me back" rather than "Memory of the day".

## Logo lockup

Scout in a rounded teal tile at the left, the wordmark "TravelBud" in Fraunces bold teal, and the tagline "ALL THINGS TRAVEL" in small-caps DM Sans beneath. The favicon is Scout alone on teal.
