# Le Salon des Inconnus — Award-Winning Redesign Session Reference

**Generated:** 2026-04-29
**Branch:** `main` (uncommitted changes — see "Modified files" below)
**Build status:** ✓ `npm run build` passes
**Dev server:** running at `http://localhost:5178/` (started in this session)

---

## Headline state

We started a multi-phase redesign targeting **award-tier** ("editorial spine + illustrated soul" — Mood B with A's warmth). Audit grades the codebase pre-changes at **Architecture D+ / Design C− / UX C**. Top critical finding from the audit: a **hardcoded admin password in the client bundle** (now fixed).

**User's design references** (sent as screenshots): Lagunitas IPA, Bespoke / Cadence Design, Europa wine, Cine Daily / Deadpool, Red Bark Studios, No Hangover.

**Important user clarifications during this session:**
- Existing `*banana*` and `*ai*` photo filenames are **real photos retouched in Nano Banana** (Google's editor), NOT AI-generated. They stay in the build until replaced by new photography.
- The user is a **professional photographer** — they will produce all hero photography themselves.
- Visual identity changes (themes, fonts, signature shapes) must ship in the **same phase as the replacement design** — never in an isolated cleanup pass. (This rule was learned the hard way mid-session — see memory file `feedback_visual_identity.md`.)

---

## What shipped — Phase 0 + Phase 1 (committed-ready, build passes)

### Phase 0 — Security + dead code + broken refs
- **Removed hardcoded admin password** (`AdminCRM.tsx`). Replaced with email-gate against `houseoftherisingarts@gmail.com` (matches `firestore.rules`). **The leaked password `Peterjackson1!` should still be rotated wherever it was reused.**
- Deleted `components/HeroPreview.tsx` + `/preview-hero` route (it was marked TEMPORARY).
- Deleted empty `public/_redirects` (Netlify file in a Firebase-hosted project).
- Removed dead Tailwind importmap from `index.html` (orphan from AI Studio export).
- Fixed `og:image` and Schema.org `image` (were 404'ing) — pointed to `golden-drone.jpg` from GCS until proper exports exist.
- Fixed 7 malformed Unsplash URLs in `constants.ts` (Local Guide tiles) — now fall back to `PLACEHOLDER_ROOM`.

### Phase 1a — Tailwind CDN → PostCSS build
- Installed `tailwindcss@3` + `postcss` + `autoprefixer`.
- Created `tailwind.config.js` with token layer (gold/ink/wwoof palette, fluid display type scale, editorial letter-spacing). Tokens are wired but most code still uses inline arbitrary classes — token migration is a future cleanup pass.
- Created `postcss.config.js` (ESM, `tailwindcss` + `autoprefixer`).
- Created `index.css` at root, imported in `index.tsx`. Contains Google Fonts `@import` (kept all 6 to preserve identity), `@tailwind` directives, custom font utility classes, scrollbar styling, button border-radius rule.
- Removed `<script src="https://cdn.tailwindcss.com">` and inline `<style>` from `index.html`.
- Added preconnect/dns-prefetch hints for fonts.googleapis.com / fonts.gstatic.com / storage.googleapis.com / wsrv.nl.
- **Result:** CSS purged from CDN's ~200KB unpurged → `98.6 kB / 14.8 kB gzipped`.

### Phase 1e — Code splitting via React.lazy
- Converted 12 page imports in `App.tsx` to `React.lazy` + `Suspense` with a `<PageLoader />` fallback (small black screen with brand text pulse).
- Each page now emits its own chunk:
  - CeilidhPage 132 KB / 35.7 KB gzip
  - InnPage 76 KB / 19 KB gzip
  - WwoofingPage 38 KB / 11 KB gzip
  - MassotherapyPage 24 KB / 7 KB gzip
  - AdminCRM 19 KB / 5 KB gzip
  - KitchenPage, ProfilePage, GuidePage, MessagingPage, HostsPage, PublicProfilePage, EventsPage all small
- Main bundle still 837 KB / 219 KB gzip (Firebase + GSAP + Three.js + React) — that's the next perf lever, blocked on `manualChunks` config.

### Phase 1g — Single SEO source of truth
- Extended `config/seo.config.ts` `PAGE_META` to all 12 views in EN+FR (was missing CEILIDH, WWOOFING, EVENTS, MY_PROFILE, PUBLIC_PROFILE, MESSAGING, ADMIN).
- Deleted duplicate `pageMeta` dict in `App.tsx` (was FR-only and drift-prone).
- App.tsx now reads from `PAGE_META[currentView][language]` and updates `<title>`, `og:*`, `twitter:*`, `meta[description]`.

### Phase 1 — Reverted (preserved visual identity)
After a regression, the following changes from Phase 1 were **reverted** to keep the existing visual look:
- Default `vibe` mode kept at `HOSTEL` (not changed to CLASSIC). InnPage `useState<VibeMode>('HOSTEL')` is original.
- Vibe toggle UI is still **visible** at the InnPage hero (top-right, desktop only). Reversal of an attempted hide.
- All 6 Google Fonts kept loaded (Cinzel, Lato, Prata, Josefin Sans, Cormorant Garamond, MedievalSharp). The font trim was reverted because it broke HOSTEL/SHIRE typography.

These visual-identity changes are deferred to Phase 2 hero remasters — they ship together with their replacement, never in isolation.

---

## Phase 2 — In progress (Ceilidh page first slice)

### Ceilidh hero — completed in this session

The event panel hero is now built around a **shared `LiquidGlassCycler` component** (new file: `components/LiquidGlassCycler.tsx`).

- The cycler is the **same WebGL liquid-glass bubble transition** the InnPage uses (Three.js + GSAP loaded from cdnjs at runtime, with CSS fallback). I extracted it from the inline InnPage implementation into a shared component. **InnPage was NOT modified** — it still has its own inline copy. The two implementations can be reconciled later.
- New constant `CEILIDH_HERO_IMAGES` in `CeilidhPage.tsx` cycles 5 photos every 5s:
  1. `Auberge%20photos/Maison%20main.png` (front of house — user's primary pick)
  2. `Artistes/aliel%20campfire.jpg`
  3. `inn/amphiteatre%20banana.jpg`
  4. `inn/golden%20drone%20copy.jpg`
  5. `inn/yourte.png`
- Hero content (title, eyebrow, date, CTA) is bottom-anchored over the cycler with a gradient overlay — same composition pattern as InnPage hero.
- Title: "GRAND CEILIDH / DE MAI" (Cinzel, clamp(2.5rem, 8vw, 8.5rem) — up to 136px on desktop).
- Brightened the accordion's per-panel image opacity (0.18 → 0.7 active, 0.5 → 0.9 inactive) and lightened the gradient overlays. **The "everything is too dark" complaint is solved for the panel content.**
- Inactive accordion strip labels now `text-white` (was `/60`) with `text-shadow` for legibility, plus a small **gold pulsing dot** as a click affordance.

### Visual evolution that user pushed back on (now resolved)
The hero went through three iterations:
1. **Type-as-scaffolding** (Bespoke pattern) — photo cuts through middle of "CEILIDH" word. User: "objectively worse, tiny picture on top of text". Reverted.
2. **Poster style** — title above, dominant photo below. User: "what is this". Reverted.
3. **Cycler hero (final)** — same WebGL cycler as InnPage, bottom-anchored title. User accepted.

---

## PARKED Ceilidh fixes (the user listed these and then redirected to a main-page bug)

These six items were requested but **NOT YET IMPLEMENTED**. Resume here when the InnPage scroll bug is resolved:

1. **Hide event-panel background image** — when `event` is the active panel, the panel's own bg image (`golden drone` at 0.7 opacity) bleeds through below the hero, creating a "duplicate photo" feel. Fix: in `CeilidhPage.tsx` near line 2412, conditionally set image opacity to 0 only when `panel.id === 'event' && isActive`. Other panels keep their bg image at 0.7.

2. **Animate accordion strip on hover (slight expansion)** — currently inactive strips are fixed at 52px wide. User wants hover expansion as an interactivity affordance. Fix: replace inline `style={{ width }}` with className `${isActive ? 'flex-1' : 'w-[52px] hover:w-[88px] cursor-pointer'}`. Width animates via the existing `transition-all duration-700` already on the parent.

3. **"S'inscrire Maintenant" → opens 1st accordion section** — currently button at line ~2508 sets `setActivePanel('equipes')`. Change to `setActivePanel('programme')` (the first section after `event`).

4. **Add "Suivant →" Next buttons in each panel** — at the bottom of programme/equipes/hebergement panel content, add a button that advances to the next panel:
   - programme → équipes
   - équipes → hébergement
   - hébergement → pratique
   - pratique → no Next (terminal)

5. **Glassmorphism around "Qui est là, quand"** (PresenceTimeline) — `CeilidhPage.tsx:2076`. Currently the timeline renders directly over the panel bg image and is unreadable. Wrap in a glass card: `backdrop-blur-md bg-black/40 border border-white/10 p-6 rounded-2xl`.

6. **Redesign the Pratique panel** — user says "super ugly". Starts at `CeilidhPage.tsx:3049`. Need to read it, understand what it currently shows (probably the practical-info text section), and rebuild with the editorial vocabulary used elsewhere on the page.

---

## RESOLVED: InnPage scroll at Local Guide section and below — Option C applied

**Fix shipped:** Refactored `StickySection` (`InnPage.tsx:158-204`) to drop `position: sticky` + the `top` calculation + the `zIndex` style. The `zIndex` prop is preserved in the interface for backward compatibility but unused. Hero wrapper at `InnPage.tsx:1483` also un-stuck (was `position: sticky; top: 0`, now plain `relative`). All 12 StickySection call sites continue to work with the same API.

**Result:** Sections now flow sequentially in normal document order. Each section's `min-height` is preserved. Verified via Playwright at the previously-broken positions: Events title + CTAs now fully visible (`/tmp/innx-events-at.png`); Wwoofing title visible; Hosts content + footer-style trailing block render in proper top-down order (`/tmp/innx-hosts-at.png`); Local Guide visible (`/tmp/innx-localguide-at.png`).

Build passes. Bundle sizes unchanged.

### Below: original diagnosis kept for reference

User reported: "on the main page, there is huge bug on local guide, and after. review the scrolling behaviors, and anything that can cause those problems."

### Root cause (verified via Playwright DOM measurements)

The InnPage is a **13-layer sticky-stack** with monotonically increasing z-index (10/20/30/35/40/50/60/70/80/90/95/97). The stack uses `<StickySection>` (`InnPage.tsx:159-214`) which sets `position: sticky; top: ${windowHeight - sectionHeight}px` for sections taller than the viewport, and `top: 0` otherwise.

Measured at `scrollTop = 11469` (Events section start), my Playwright dump showed **all 11 lower-z sections still rendering simultaneously** in the DOM, layered by z-index. The visible result is determined by which section has the highest z-index at each pixel row:

| zIndex | Section | rectTop | rectBottom | visible region |
|---|---|---|---|---|
| 95 | Events | -1 | 900 | full viewport |
| 97 | Wwoofing | **732** | 1633 | rows 732-900 |

So at the moment the user is supposed to be reading the Events section, **Wwoofing (higher z) covers the bottom 168 pixels of the viewport** — and the Events section places its title/CTA exactly there with `justify-end pb-16` (`InnPage.tsx:1284`). The Events title and CTA are hidden behind Wwoofing.

This affects the entire late portion of the page (z 80 → 90 → 95 → 97 transitions). User-visible symptoms in the screenshots:
- **Events at scroll 11469** (`/tmp/innx-events-at.png`): hero photo at top, then black middle, then a sliver of Wwoofing at the bottom. **No title, no CTA visible.**
- **Wwoofing at scroll 12414** (`/tmp/innx-wwoofing-at.png`): photo at top, black middle, cookie banner at bottom. Title not visible.
- **Hosts at scroll 10037** (`/tmp/innx-hosts-at.png`): "Découvrez vos hôtes" + button render correctly, but the footer (Alex@... + map) is showing immediately below in the same viewport because Hosts content is shorter than its `desktopHeight: 100vh` and the post-stack footer bleeds in.

### Whether my changes caused it

This is **pre-existing behavior**, not introduced by my Phase 0/1 work. I have not modified `InnPage.tsx` layout or `StickySection` logic. The Tailwind PostCSS migration shipped only standard utilities (`justify-end`, `h-screen`, `min-h-screen`) which are core Tailwind classes — verified in the built CSS bundle. The sticky stack worked the same way before.

Hypothesis why the user is noticing it now: previously the page may have masked the issue with vibe-mode-specific positioning, OR the user's testing was with the dev server and HMR causing intermediate render states.

### Three fix options (pick one — all reversible)

**A. Move content away from the bottom (smallest change, ships fast)**
Change `justify-end` → `justify-center` in `EventsSection` (`InnPage.tsx:1284`), `HostsSection`, `WwoofingSection`. Content moves to the middle of the section where it isn't overlapped by the next section's pin.

**B. Add a tail buffer to each StickySection (medium change)**
Increase `desktopHeight` on the late-stack sections (e.g., Events `100vh` → `120vh`, Wwoofing `100vh` → `120vh`). Adds 200px of scroll between each pin so the user sees the previous section's content fully before the next pins.

**C. Replace the sticky-stack with sequential sections (architectural — Phase 2/3 territory)**
Stop using the layered sticky-stack pattern. Make each section a normal-flow `<section>` that fills 100vh and scrolls naturally. Lose the "layers stack on top of each other" effect; gain predictable layout. This aligns with the editorial direction we've already chosen for Phase 2 hero rebuilds.

### Diagnostic artifacts (in `/tmp/`)
- `inn-00.png` … `inn-11.png` — 12 evenly-spaced scroll positions
- `innx-localguide-at.png`, `-plus400.png` — at LocalGuide and 400px past
- `innx-hosts-at.png`, `-plus400.png` — at Hosts and 400px past
- `innx-events-at.png`, `-plus400.png` — at Events and 400px past
- `innx-wwoofing-at.png`, `-plus400.png` — at Wwoofing and 400px past
- `inspect-inn.mjs` — Playwright DOM measurement script (in repo root)
- `screenshot-inn.mjs`, `screenshot-inn-late.mjs` — capture scripts (in repo root)

These diagnostic scripts can be deleted before commit.

---

## Modified files in this session (not yet committed)

```
M  .env.local                              (pre-existing, not modified by me)
M  App.tsx                                 (lazy-load pages, SEO consolidation)
M  components/AdminCRM.tsx                 (admin password removed → email gate)
M  components/CeilidhPage.tsx              (cycler hero + brightness fixes)
M  components/InnPage.tsx                  (only vibe-toggle revert; identity preserved)
M  components/PrivacyPolicyModal.tsx       (pre-existing — not from me)
M  components/MemberPanel.tsx              (pre-existing — not from me)
M  components/OptimizedImage.tsx           (pre-existing — not from me)
M  components/GuidePage.tsx                (pre-existing — not from me)
M  config/seo.config.ts                    (added 7 missing views in EN+FR)
M  constants.ts                            (fixed 7 malformed Unsplash URLs)
M  firebase.json                           (pre-existing)
M  firestore.rules                         (pre-existing — security model uses email check)
M  index.html                              (Tailwind CDN out, preconnect in, OG image fixed)
M  index.tsx                               (imports `index.css`)
M  tsconfig.json                           (pre-existing)
M  types.ts                                (pre-existing)
M  vite.config.ts                          (pre-existing)
?? components/AdminCRM.tsx                 (untracked — needs `git add`)
?? components/ContributionPanel.tsx        (untracked)
?? components/HeroPreview.tsx              (DELETED in this session — was untracked)
?? components/LiquidGlassCycler.tsx        (NEW — untracked)
?? components/MessagingPage.tsx            (untracked)
?? components/ProfilePage.tsx              (untracked)
?? components/PublicProfilePage.tsx        (untracked)
?? components/ShowTicketModal.tsx          (untracked)
?? components/SiteHeader.tsx               (untracked)
?? components/WwoofingPage.tsx             (untracked)
?? functions/                              (untracked)
?? docs/PHOTOGRAPHY-SHOTLIST.md            (NEW — printable shoot brief)
?? docs/SESSION-REFERENCE.md               (this file)
?? screenshot-ceilidh.mjs                  (NEW — Playwright capture script)
?? screenshot-inn.mjs                      (NEW — Playwright capture script for /)
?? tailwind.config.js                      (NEW)
?? postcss.config.js                       (NEW)
?? index.css                               (NEW)
```

The two `screenshot-*.mjs` files are diagnostic — fine to delete or move to `scripts/` before commit. They depend on the `playwright` dev dep added this session.

---

## Memory entries written this session

In `/Users/lesalondesinconnus/.claude/projects/-Users-lesalondesinconnus-Documents-Websites-le-salon-des-inconnus-inn-section-v-08--5-/memory/`:

- `user_role.md` — User is a working photographer; treat real photography as a given asset, not a blocker.
- `project_design_direction.md` — Editorial spine + illustrated soul. Mood B with A's warmth. Six reference sites listed by name.
- `feedback_visual_identity.md` — Visual-identity changes (theme, fonts, signature shapes) ship in the same phase as their replacement, NOT as standalone cleanup. Triggered by the vibe-toggle / font-trim regression.
- Updated `MEMORY.md` index.

---

## Photography brief

`docs/PHOTOGRAPHY-SHOTLIST.md` — print-ready, ~8 shoot days grouped by location/season. Brand assets (logo SVG, favicon, OG image), Inn (Day 1 — golden + blue hour), Hosts (Days 2-3), Ceilidh night (Day 4 — live), Wwoofing garden (Day 5), Kitchen lunch service (Day 6), Guide road trip (Day 7), Massage room (Day 8). Includes equipment / lighting notes and a hand-off workflow.

---

## Roadmap snapshot

| Phase | Scope | Status |
|---|---|---|
| 0 | Security + broken refs | ✓ Done |
| 1a | Tailwind PostCSS + tokens | ✓ Done |
| 1b | Font trim + preconnect | Partial — preconnect done, trim reverted (preserves identity) |
| 1c | Hide vibe toggle | Reverted — re-do with replacement in P2 |
| 1d | Lenis smooth scroll | Deferred (needs body-overflow refactor first) |
| 1e | React.lazy code splitting | ✓ Done |
| 1f | Global SiteHeader | Deferred (needs body-overflow refactor first) |
| 1g | Single SEO source | ✓ Done |
| 2  | Hero rebuilds + photography drop-in | In progress — Ceilidh started, 6 fixes parked, Inn bug to diagnose |
| 3 | Section choreography (scroll-as-cinema) | Not started |
| 4 | Polish + a11y + perf + award submission | Not started |

---

## When you resume this work

1. Look at `/tmp/inn-00.png` … `/tmp/inn-11.png` to identify the InnPage scroll bug (Local Guide section onward).
2. Apply the fix.
3. Re-run `node screenshot-inn.mjs` to verify.
4. Return to the **PARKED Ceilidh fixes** list above (six items, line refs included).
5. Then continue rolling out the cycler hero pattern to other pages (Wwoofing, Hosts, Guide, Inn) — at which point the body-overflow refactor + Lenis smooth scroll come online.
