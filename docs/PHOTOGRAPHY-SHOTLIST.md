# Photography & Asset Shot List
## Le Salon des Inconnus — Award-Winning Site Production Brief

**Generated:** 2026-04-29
**Direction:** Editorial spine + illustrated soul ("Mood B with A's warmth")
**References:** Lagunitas IPA, Bespoke / Cadence Design, Europa wine, Cine Daily / Deadpool, Red Bark Studios, No Hangover

---

## How to use this document

- Print and bring on shoot days
- Each item has a **filename** (target upload name to Firebase Storage), **dimensions**, **format**, and a **reference**
- Filenames assume bucket path `salondesinconnus/<page>/...`
- "Cutout PNG" = subject isolated against transparent background; will be layered in front of and behind oversized type in scroll layouts
- Existing "banana"-suffixed photos stay in the build until replacement is shot — no rush
- Tick items as you complete them; commit replacements one batch at a time

---

## A. Brand assets (non-photographic)

These need to exist before launch. Mostly one-time deliverables.

- [ ] **Logo SVG** — `public/logo.svg` — single-color vector, will be re-tinted via CSS
  - Replaces the brittle `i.imgur.com/B1YfPqn.png` and the `filter: brightness(0) invert(1)` hack
  - If no vector source exists: have a freelancer trace it from the highest-res raster (Fiverr, ~$30)
- [ ] **Logomark SVG** — `public/logo-mark.svg` — square, stand-alone version for favicon and OG badge
- [ ] **Favicon set** — generate from logomark via realfavicongenerator.net
  - `public/favicon.ico`, `apple-touch-icon.png` (180×180), `android-chrome-192.png`, `android-chrome-512.png`
- [ ] **OG / social share image** — `public/social.jpg` — **1200 × 630 JPG**
  - Inn exterior or signature interior at golden hour, logo overlay top-left, tagline bottom-left in Cormorant
  - Currently 404s — used by Facebook, LinkedIn, iMessage previews
- [ ] **Twitter card image** — `public/twitter-card.jpg` — **1200 × 600 JPG** — same scene, slightly tighter
- [ ] **Schema.org hero image** — `public/assets/hero.jpg` — **1920 × 1080 JPG** — wide architectural, no overlay

---

## B. Inn page (Day 1 — golden hour + blue hour)

The hero of the site. Highest-priority shots.

- [ ] **Inn hero — exterior** — `salondesinconnus/inn-hero-exterior-golden.jpg` — **3840 × 2160 JPG**
  - Wide architectural exterior at golden hour
  - Will pair with display type "MAISON FAVIER" cutting in front of and behind the building silhouette
  - Reference: Europa wine bottle layout, Bespoke / Cadence
- [ ] **Inn hero — interior fireplace** — `inn-hero-interior-fireplace.jpg` — **3840 × 2160 JPG**
  - Wide interior at blue hour, fireplace lit, lamps glowing, no people
  - Replaces existing `Maison-main`
- [ ] **Inn hero — yourte at night** — `inn-hero-yourte-night.jpg` — **3840 × 2160 JPG**
  - Yurt at night, candlelight from inside, stars overhead
  - Replaces existing `yourte`
- [ ] **Inn detail — doorway** — `inn-detail-doorway.jpg` — **2400 × 3000 JPG portrait**
  - Architectural close-up: handle, window frame, beam, shallow DOF
- [ ] **Inn detail — textiles** — `inn-detail-textiles.jpg` — **2400 × 3000 JPG portrait**
  - Bedding / drapery / lampshade close-up with warm light
- [ ] **Inn detail — table** — `inn-detail-table.jpg` — **3000 × 2400 JPG landscape**
  - Top-down or 3/4 of a set table, candles, bread, wine
  - Reference: Lagunitas editorial detail shots
- [ ] **Cutout — lantern** — `inn-cutout-lantern.png` — **1500 × 2000 PNG transparent**
  - Single lantern shot against black backdrop, then keyed out in post
  - Used as floating foreground element scrolling past hero type
- [ ] **Cutout — open book** — `inn-cutout-book.png` — **1800 × 1200 PNG transparent**
  - Open book on the salon table, isolated
- [ ] **Cutout — smoke / fog overlay** — `inn-overlay-smoke.png` — **1920 × 1080 PNG transparent**
  - Smoke against pure black, lit by flashlight; isolate; will replace remote `raw.githubusercontent.com/.../fog1.png`

---

## C. Hosts page (Days 2–3 — environmental portraits)

For each host (~4–6 hosts total), four shots:

- [ ] **Portrait — formal** — `hosts/{name}-portrait.jpg` — **2400 × 3600 JPG portrait**
  - Environmental portrait in their craft context (writing desk, kitchen, garden)
  - 35mm or 50mm look, shallow DOF, eye contact
  - Reference: Cine Daily editorial subject crops
- [ ] **Portrait — candid** — `hosts/{name}-candid.jpg` — **2400 × 3600 JPG portrait**
  - Same person mid-action, no eye contact, motion blur acceptable
- [ ] **Cutout — full-length** — `hosts/{name}-cutout.png` — **2000 × 3000 PNG transparent**
  - Full-length isolated for type-as-scaffolding moment (name in 240px type, host steps in front of letters)
- [ ] **Craft detail** — `hosts/{name}-craft.jpg` — **3000 × 2400 JPG landscape**
  - Close-up of their work product: page they wrote, dish they plated, instrument they play

**Hosts to shoot:** _____________________________________________________________________________

---

## D. Ceilidh / event page (Day 4 — live event night)

You only get one chance per Ceilidh — plan ahead.

- [ ] **Hero — wide / drone** — `events/ceilidh-hero-wide.jpg` — **3840 × 2160 JPG**
  - Wide of gathered crowd, lanterns / string lights, dusk
  - Replaces reused `golden-drone`
- [ ] **Dance moment** — `events/ceilidh-dancing.jpg` — **3840 × 2160 JPG**
  - Slow shutter (1/15s), motion-blurred dancers around firelight
- [ ] **Musicians at work** — `events/ceilidh-musicians.jpg` — **3840 × 2160 JPG**
  - Tight 3/4 of fiddle / accordion / voice, candlelight only
- [ ] **The table at midnight** — `events/ceilidh-table.jpg` — **3000 × 2400 JPG landscape**
  - Aftermath of food / drink, no people, intimate
- [ ] **Faces in firelight (5-pack)** — `events/ceilidh-face-{1..5}.jpg` — **2400 × 2400 JPG square**
  - Five different attendees, lit by fire, eye contact or candid
  - Will become the kinetic-type marquee photo strip behind the section title
- [ ] **Optional: 4-second video loop** — `events/ceilidh-loop.mp4` — **1920 × 1080 H.264 MP4, ≤ 5 MB, silent, looping**
  - Slow flames or hands clapping to music; for ambient hero motion

---

## E. Wwoofing page (Day 5 — garden hours)

- [ ] **Hero — garden** — `wwoofing/wwoofing-hero-garden.jpg` — **3840 × 2160 JPG**
  - Wide of someone working the garden, golden hour, hands dirty
- [ ] **Diptych — morning task** — `wwoofing/wwoofing-day.jpg` — **2400 × 3000 JPG portrait**
  - Composting / harvesting / chickens close-up
- [ ] **Diptych — meal** — `wwoofing/wwoofing-meal.jpg` — **2400 × 3000 JPG portrait**
  - Communal meal after work, hands and food
- [ ] **A day in 5 frames** — `wwoofing/wwoofing-day-{1..5}.jpg` — **3000 × 2400 JPG landscape**
  - Sunrise, garden, midday meal, afternoon craft, fire pit
  - These will scrub-crossfade as you scroll
- [ ] **Cutout — produce trio** — `wwoofing/produce-{tomato, herbs, eggs}.png` — **1500 × 1500 PNG transparent**
  - Three pieces of produce isolated, scattered foreground elements

---

## F. Kitchen / dining page (Day 6 — lunch service)

- [ ] **Hero — plate** — `kitchen/kitchen-hero-plate.jpg` — **3840 × 2160 JPG**
  - Overhead of a signature dish, dramatic lighting
  - Will sit behind 200px type ("EAT" / "TABLE" / "SALON")
  - Replaces existing `Plating-alexis-ai-1`
- [ ] **Cooking action** — `kitchen/kitchen-cooking.jpg` — **3840 × 2160 JPG**
  - Chef's hands, steam, fire on stove
- [ ] **Dish gallery (8 plates)** — `kitchen/dish-{1..8}.jpg` — **2400 × 2400 JPG square**
  - Eight signature dishes, all shot at the **same angle and lighting** for visual rhythm
- [ ] **Cutout — signature plate** — `kitchen/dish-hero-cutout.png` — **2000 × 2000 PNG transparent**
  - One dish isolated for type-as-scaffolding moment

---

## G. Guide / local map (Day 7 — Namur QC region road trip)

- [ ] **Local landscapes (10-pack)** — `guide/namur-{1..10}.jpg` — **3000 × 2400 JPG landscape**
  - Forest, lake, village, farmer, road, sunset, etc.
  - For horizontal-scroll local guide
- [ ] **Hand-illustrated map SVG** — `public/assets/guide-map.svg` — **commission**
  - Custom illustrated map of Namur QC + the inn pinned
  - Reference: travel-magazine illustrated maps
  - Budget ~$300–800 on Domestika / 99designs, or generate a draft via Magic MCP and refine

---

## H. Massotherapy page (Day 8 — half-day)

- [ ] **Hero — room** — `massage/massage-hero.jpg` — **3840 × 2160 JPG**
  - Empty massage room, candlelit, towel folded, no people
  - Replaces existing `massage-andre.png` (currently a portrait, not a room)
- [ ] **Detail — oils / stones** — `massage/massage-detail.jpg` — **2400 × 3000 JPG portrait**
  - Close-up of oils, stones, or hands
- [ ] **Practitioner portrait** — `massage/practitioner.jpg` — **2400 × 3600 JPG portrait**
  - Same treatment as Hosts portraits

---

## I. Member-facing pages (lower priority — Phase 4)

- [ ] **Default member avatar SVG** — `public/avatar-default.svg`
  - Neutral illustrated avatar (not a stock silhouette)
- [ ] **Empty-state illustrations (3)** — for empty messaging inbox, empty event list, empty profile gallery
  - Either commissioned or generated and refined

---

## Production day summary

| Day | Subjects | Output count | Best season |
|---|---|---|---|
| 1 | Inn exterior + interiors + cutouts | ~9 photos + 3 cutouts | Any (interiors); golden hour exterior |
| 2 | Hosts (3–4 hosts back-to-back) | 12–16 photos | Any |
| 3 | Hosts (remaining) | 8–12 photos | Any |
| 4 | Ceilidh night (live event) | 9 photos + 1 video | Event night |
| 5 | Wwoofing (garden + meal) | 11 photos | Late spring–summer |
| 6 | Kitchen (lunch service) | 11 photos | Any |
| 7 | Guide / Namur QC road trip | 10 photos + 1 commission | Sept–Oct foliage ideal |
| 8 | Massage room + practitioner | 3 photos | Any |

**Total: ~8 production days spread across the year.** Order priority: Day 1 (Inn) → Day 2–3 (Hosts) → Day 4 (next Ceilidh) → rest opportunistically.

---

## Equipment / lighting notes

- **Hero shots** want a 24mm or 35mm equivalent — wide enough to dominate, narrow enough to keep distortion clean
- **Portraits** want 50–85mm equivalent for natural compression
- **Cutouts** want a **flagged off** background (matte black fabric or white seamless) and the subject lit *separately* from the background — this makes keying in Photoshop / Capture One trivial. Final delivery PNG with **anti-aliased edge** and 16-bit alpha if possible.
- **Editorial color**: I recommend grading toward **slightly warmer than neutral** (~+200K WB shift on the cool side) and crushing midtone contrast a touch. Keeps the "salon" warmth without veering Instagram-orange.
- **All photos**: deliver as **3840×2160 minimum on the long edge**, JPG quality 88–92, sRGB, embedded metadata
- **Cutouts**: deliver as PNG with transparency, no shadow baked in (shadows added in CSS for flexibility)

---

## What lives where

| Currently | Should be |
|---|---|
| `storage.googleapis.com/salondesinconnus/...` | Same — keep using Firebase Storage as primary CDN |
| `i.imgur.com/B1YfPqn.png` (logo) | `public/logo.svg` (committed to repo) |
| `transparenttextures.com/patterns/...` | Same OK for now, or download + commit if performance demands |
| `raw.githubusercontent.com/SochavaAG/.../fog1.png` | `public/textures/smoke.png` (committed) |
| Various Unsplash URLs (some malformed) | Real photography or removed |

---

## Hand-off back to the build

After each shoot day:

1. Cull and edit in Capture One / Lightroom
2. Export to spec (see Equipment notes above)
3. Upload to the matching Firebase Storage path
4. Tell Claude "Day 1 photos uploaded — please update the constants and hero references"
5. We commit and push; site updates within minutes

End of brief.
