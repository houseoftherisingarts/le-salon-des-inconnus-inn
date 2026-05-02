import React, { useEffect, useRef, useState } from 'react';
import { LiquidGlassCycler } from './LiquidGlassCycler';

// ─────────────────────────────────────────────────────────────────────────────
// CeilidhPageTest1 — PRESERVED ASSET (not the chosen Ceilidh direction).
//
// Kept on the route /ceilidhtest1 as a reusable building block. The Ceilidh
// direction we shipped is Avenue B (chapter cards) at /ceilidhtest2. This file
// stays around because the estate-map mechanic (aerial photo + positioned pins
// with status badges + slide-in detail panel) is a strong fit for any other
// "explore a place" feature later — likely candidates:
//   · Wwoofing tasks board (pins on the estate for each task / area)
//   · Property tour for Inn visitors (each pin is a room)
//   · Lodging floor plan (pins on a top-down house illustration)
//
// To repurpose: rename the export, swap PINS data + MAP_PHOTO, and lift any of
// the helpers (PinButton, PinDetailPanel, StatusSeal logic).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
}

type PinStatus = 'locked' | 'inprogress' | 'done';

interface Pin {
  id: string;
  num: string;
  titleEn: string;
  titleFr: string;
  taglineEn: string;
  taglineFr: string;
  // Position on the map photo, in percent. Tuned to the actual aerial image.
  x: number;
  y: number;
  status: PinStatus;
}

const HERO_IMAGES = [
  'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg',
  'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg',
  'https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg',
];

// The aerial drone photo doubles as the estate map.
const MAP_PHOTO = 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg';

const PINS: Pin[] = [
  {
    id: 'event',
    num: '01',
    titleEn: 'The Event',
    titleFr: "L'Événement",
    taglineEn: 'The manor — overview & arrival',
    taglineFr: 'Le manoir — aperçu & arrivée',
    x: 50, y: 48, // centre — the manor itself dominates the aerial
    status: 'inprogress',
  },
  {
    id: 'programme',
    num: '02',
    titleEn: 'Programme',
    titleFr: 'Programme',
    taglineEn: 'The amphitheatre — 5-day schedule',
    taglineFr: "L'amphithéâtre — programme 5 jours",
    x: 32, y: 70,
    status: 'locked',
  },
  {
    id: 'teams',
    num: '03',
    titleEn: 'The Teams',
    titleFr: 'Les Équipes',
    taglineEn: 'Around the fire — choose yours',
    taglineFr: 'Autour du feu — choisissez la vôtre',
    x: 70, y: 36,
    status: 'inprogress',
  },
  {
    id: 'lodging',
    num: '04',
    titleEn: 'Lodging',
    titleFr: 'Hébergement',
    taglineEn: 'The yurt & beyond — claim a bed',
    taglineFr: 'La yourte et au-delà — réservez un lit',
    x: 78, y: 65,
    status: 'done',
  },
  {
    id: 'practical',
    num: '05',
    titleEn: 'Practical',
    titleFr: 'Pratique',
    taglineEn: 'The forest path — getting here',
    taglineFr: 'Le sentier — comment venir',
    x: 22, y: 28,
    status: 'locked',
  },
];

const STATUS_COPY: Record<PinStatus, { en: string; fr: string; color: string }> = {
  locked:     { en: 'Locked',      fr: 'Verrouillé',     color: '#5a4a36' },
  inprogress: { en: 'In Progress', fr: 'En cours',       color: '#c5a059' },
  done:       { en: 'Complete',    fr: 'Complété',       color: '#3a7d44' },
};

// ─────────────────────────────────────────────────────────────────────────────

export const CeilidhPageTest1: React.FC<Props> = ({ language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activePin = activeId ? PINS.find((p) => p.id === activeId) : null;

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId]);

  const completeCount = PINS.filter((p) => p.status === 'done').length;

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-[#050505] text-white overflow-y-auto custom-scrollbar selection:bg-[#c5a059] selection:text-black"
      data-ceilidh-test1
    >
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[640px] overflow-hidden">
        <div className="absolute inset-0 ceilidh1-kenburns">
          <LiquidGlassCycler images={HERO_IMAGES} intervalMs={6000} />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(5,5,5,0.35) 0%, rgba(5,5,5,0.15) 30%, rgba(5,5,5,0.7) 78%, rgba(5,5,5,0.95) 100%)',
          }}
        />
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col justify-end pb-20 md:pb-28">
          <div className="ceilidh1-eyebrow flex items-center gap-4 mb-5">
            <button
              onClick={() => onNavigate('INN')}
              className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] hover:text-[#f3e5ab] transition-colors"
            >
              ← {t('Back to the Inn', "Retour à l'auberge")}
            </button>
          </div>
          <div className="ceilidh1-eyebrow flex items-center gap-3 mb-5">
            <div className="ceilidh1-rule h-px bg-[#f3e5ab]" />
            <span
              className="font-cinzel text-[#f3e5ab] text-[10px] md:text-xs uppercase tracking-[0.55em]"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              {t('21 — 25 May 2026 · Maison Favier · Namur, QC', '21 — 25 mai 2026 · Maison Favier · Namur, QC')}
            </span>
          </div>
          <h1
            className="ceilidh1-title font-prata uppercase leading-[0.86] tracking-[-0.015em] text-[#f3e5ab] mb-6"
            style={{
              fontSize: 'clamp(3rem, 11vw, 11rem)',
              textShadow: '0 6px 40px rgba(0,0,0,0.7)',
            }}
          >
            {t('The Grand', 'Le Grand')}<br />Ceilidh
          </h1>
          <p
            className="ceilidh1-tagline font-josefin text-neutral-200 max-w-2xl uppercase mb-10"
            style={{ letterSpacing: '0.18em', fontSize: 'clamp(0.85rem, 1.1vw, 1.05rem)', textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
          >
            {t(
              'Find your way around the domain. Each pin opens a chapter of the gathering.',
              "Explorez le domaine. Chaque épingle ouvre un chapitre du rassemblement.",
            )}
          </p>
          <div className="ceilidh1-ctas flex flex-wrap items-center gap-4">
            <a
              href="#carte"
              className="px-10 py-4 bg-[#c5a059] text-[#18181b] font-josefin font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all"
              style={{ boxShadow: '0 6px 24px rgba(197,160,89,0.35)' }}
            >
              {t('Open the Map', 'Ouvrir la carte')}
            </a>
            <span className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em]">
              {completeCount} / 5 {t('locations', 'lieux')}
            </span>
          </div>
        </div>
      </section>

      {/* ── ESTATE MAP ──────────────────────────────────────────────────── */}
      <section id="carte" className="cv-auto relative bg-[#050505] py-20 md:py-28 px-4 md:px-8 lg:px-16">
        {/* Header + progress */}
        <div className="max-w-[1400px] mx-auto mb-10 md:mb-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="font-cinzel text-[#c5a059] text-[10px] md:text-xs uppercase tracking-[0.55em] block mb-3">
                {t('The Domain', 'Le Domaine')}
              </span>
              <h2
                className="font-prata uppercase text-[#f3e5ab] leading-[0.9] tracking-[-0.01em]"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 6.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
              >
                {t('Estate Map', 'Carte du Domaine')}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2 min-w-[260px]">
              <div className="flex items-center justify-between w-full">
                <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
                  {t('Progress', 'Progression')}
                </span>
                <span className="font-prata text-[#f3e5ab] text-lg">
                  {completeCount}<span className="text-[#c5a059]/60"> / 5</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1a1410] overflow-hidden rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-[#c5a059] to-[#f3e5ab]"
                  style={{
                    width: `${(completeCount / 5) * 100}%`,
                    transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: '0 0 12px rgba(197,160,89,0.5)',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="font-josefin text-neutral-400 text-xs md:text-sm uppercase tracking-[0.3em] mt-6 max-w-2xl">
            {t(
              'Hover a pin to see what lives there. Tap to step in.',
              'Survolez une épingle pour voir ce qui s\'y trouve. Touchez pour entrer.',
            )}
          </p>
        </div>

        {/* Map stage */}
        <div className="relative max-w-[1400px] mx-auto">
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: '16/9',
              borderRadius: '24px',
              border: '1px solid rgba(197,160,89,0.3)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 0 80px rgba(197,160,89,0.05)',
              background: '#0a0807',
            }}
          >
            {/* Aerial photo — the map */}
            <img
              src={MAP_PHOTO}
              alt={t('Aerial view of Maison Favier', 'Vue aérienne de Maison Favier')}
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover map-photo"
            />
            {/* Atmospheric overlay — vignette + warm grade */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(5,5,5,0.55) 100%)',
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(5,5,5,0.2) 0%, transparent 25%, transparent 70%, rgba(5,5,5,0.5) 100%)',
              }}
            />

            {/* Pins layer */}
            {PINS.map((p) => (
              <PinButton
                key={p.id}
                pin={p}
                language={language}
                onActivate={() => p.status !== 'locked' && setActiveId(p.id)}
              />
            ))}

            {/* Compass / decoration — gives the map a game-board feel */}
            <div
              aria-hidden
              className="absolute top-5 right-5 md:top-7 md:right-7 z-10 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(8,6,4,0.6)',
                border: '1px solid rgba(197,160,89,0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="font-cinzel text-[#f3e5ab]/80 text-[9px] uppercase tracking-[0.45em]">
                {t('North ↑', 'Nord ↑')}
              </span>
            </div>
            {/* Scale legend */}
            <div
              aria-hidden
              className="absolute bottom-5 left-5 md:bottom-7 md:left-7 z-10 flex items-center gap-3 px-3 py-2 rounded-full"
              style={{
                background: 'rgba(8,6,4,0.6)',
                border: '1px solid rgba(197,160,89,0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="font-cinzel text-[#f3e5ab]/80 text-[9px] uppercase tracking-[0.45em]">
                {t('Maison Favier · Namur', 'Maison Favier · Namur')}
              </span>
            </div>
          </div>
        </div>

        {/* Legend — pins by status */}
        <div className="max-w-[1400px] mx-auto mt-8 md:mt-10 flex flex-wrap items-center gap-6 px-2">
          {(['done', 'inprogress', 'locked'] as PinStatus[]).map((s) => {
            const meta = STATUS_COPY[s];
            const count = PINS.filter((p) => p.status === s).length;
            return (
              <div key={s} className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: meta.color, boxShadow: s === 'inprogress' ? `0 0 10px ${meta.color}` : undefined }}
                />
                <span className="font-cinzel text-[10px] uppercase tracking-[0.35em]" style={{ color: meta.color }}>
                  {language === 'EN' ? meta.en : meta.fr}
                </span>
                <span className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.25em]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-32 bg-[#050505]" />

      {/* ── DETAIL PANEL — slides in when a pin is active ───────────────── */}
      {activePin && (
        <PinDetailPanel pin={activePin} language={language} onClose={() => setActiveId(null)} />
      )}

      {/* Page styles */}
      <style>{`
        .ceilidh1-eyebrow { opacity: 0; animation: c1FadeUp 0.7s ease-out 0.1s forwards; }
        .ceilidh1-rule    { width: 0;  animation: c1RuleGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s forwards; }
        @keyframes c1RuleGrow { to { width: 64px; } }
        .ceilidh1-title   { opacity: 0; transform: translate3d(0, 32px, 0); animation: c1TitleIn 1.2s cubic-bezier(0.22,1,0.36,1) 0.7s forwards; }
        @keyframes c1TitleIn { to { opacity: 1; transform: translate3d(0,0,0); } }
        .ceilidh1-tagline { opacity: 0; animation: c1FadeUp 0.9s ease-out 1.1s forwards; }
        .ceilidh1-ctas    { opacity: 0; animation: c1FadeUp 0.7s ease-out 1.35s forwards; }
        @keyframes c1FadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        /* Hero Ken Burns */
        .ceilidh1-kenburns { animation: c1KenBurns 22s ease-in-out infinite alternate; }
        @keyframes c1KenBurns {
          0%   { transform: scale(1.02) translate3d(0, 0, 0); }
          100% { transform: scale(1.09) translate3d(-1%, -0.5%, 0); }
        }

        /* Map photo — subtle slow Ken Burns to make the board feel alive */
        .map-photo { animation: c1MapBreath 28s ease-in-out infinite alternate; will-change: transform; }
        @keyframes c1MapBreath {
          0%   { transform: scale(1.01); }
          100% { transform: scale(1.05) translate3d(-0.5%, -0.3%, 0); }
        }

        /* Pin pulse — only on inprogress; locked + done pins stay calm */
        .pin-button .pin-dot {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease;
        }
        .pin-button:hover .pin-dot { transform: scale(1.3); }
        .pin-button.is-locked { cursor: not-allowed; opacity: 0.6; }
        .pin-button.is-locked:hover .pin-dot { transform: scale(1); }
        .pin-button .pin-card {
          opacity: 0;
          transform: translate(-50%, 6px) scale(0.96);
          transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1);
          pointer-events: none;
        }
        .pin-button:hover .pin-card,
        .pin-button:focus-visible .pin-card {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
        }

        /* Pulse halo on inprogress pins — single transform animation, cheap. */
        .pin-button.is-inprogress .pin-halo {
          animation: c1PinPulse 2.6s ease-in-out infinite;
        }
        @keyframes c1PinPulse {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.65; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0;    }
        }

        /* Detail panel slide-in */
        .pin-detail {
          animation: c1PanelIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes c1PanelIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0);    }
        }

        @media (prefers-reduced-motion: reduce) {
          .ceilidh1-eyebrow, .ceilidh1-rule, .ceilidh1-title, .ceilidh1-tagline, .ceilidh1-ctas {
            opacity: 1 !important; transform: none !important; animation: none !important;
          }
          .ceilidh1-rule    { width: 64px !important; }
          .ceilidh1-kenburns, .map-photo, .pin-button.is-inprogress .pin-halo, .pin-detail {
            animation: none !important;
          }
          .map-photo { transform: scale(1.01) !important; }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PinButton — a single map pin with hover card + status halo
// ─────────────────────────────────────────────────────────────────────────────

const PinButton: React.FC<{
  pin: Pin;
  language: 'EN' | 'FR';
  onActivate: () => void;
}> = ({ pin, language, onActivate }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const meta = STATUS_COPY[pin.status];
  const isLocked = pin.status === 'locked';
  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={isLocked}
      aria-label={`${pin.num} · ${language === 'EN' ? pin.titleEn : pin.titleFr}`}
      className={`pin-button absolute z-20 ${isLocked ? 'is-locked' : ''} ${pin.status === 'inprogress' ? 'is-inprogress' : ''}`}
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
    >
      {/* Halo (animated for inprogress) */}
      <span
        aria-hidden
        className="pin-halo absolute"
        style={{
          left: '50%',
          top: '50%',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'transparent',
          border: `2px solid ${meta.color}`,
          opacity: 0.65,
          pointerEvents: 'none',
        }}
      />
      {/* Pin number — sits in a small chip above the dot */}
      <span
        aria-hidden
        className="absolute font-prata text-[#f3e5ab] leading-none"
        style={{
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px',
          background: 'rgba(8,6,4,0.7)',
          padding: '3px 6px',
          borderRadius: '4px',
          border: `1px solid ${meta.color}55`,
          letterSpacing: '0.1em',
        }}
      >
        {pin.num}
      </span>
      {/* The dot itself */}
      <span
        aria-hidden
        className="pin-dot block"
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: meta.color,
          border: '2px solid rgba(8,6,4,0.85)',
          boxShadow: `0 0 14px ${meta.color}, 0 4px 12px rgba(0,0,0,0.7)`,
        }}
      />
      {/* Hover card — title + tagline + status */}
      <div
        className="pin-card absolute z-30"
        role="presentation"
        style={{
          left: '50%',
          top: '32px',
          minWidth: '220px',
          maxWidth: '300px',
          padding: '14px 16px',
          background: 'rgba(8,6,4,0.92)',
          border: `1px solid ${meta.color}66`,
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
        }}
      >
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <span className="font-prata text-[#c5a059]" style={{ fontSize: '0.95rem' }}>{pin.num}</span>
          <span
            className="font-cinzel uppercase tracking-[0.35em] text-[8px]"
            style={{ color: meta.color }}
          >
            {language === 'EN' ? meta.en : meta.fr}
          </span>
        </div>
        <h4 className="font-prata uppercase text-[#f3e5ab] leading-tight mb-1" style={{ fontSize: '1.1rem' }}>
          {language === 'EN' ? pin.titleEn : pin.titleFr}
        </h4>
        <p
          className="font-josefin text-neutral-300 text-[10px] uppercase leading-relaxed"
          style={{ letterSpacing: '0.15em' }}
        >
          {language === 'EN' ? pin.taglineEn : pin.taglineFr}
        </p>
        {!isLocked && (
          <p className="mt-2.5 font-cinzel text-[#f3e5ab] text-[9px] uppercase tracking-[0.4em]">
            {t('Tap to enter', 'Toucher pour entrer')} →
          </p>
        )}
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PinDetailPanel — slides in from the right with the pin's content
// ─────────────────────────────────────────────────────────────────────────────

const PinDetailPanel: React.FC<{
  pin: Pin;
  language: 'EN' | 'FR';
  onClose: () => void;
}> = ({ pin, language, onClose }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const meta = STATUS_COPY[pin.status];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${pin.num} · ${language === 'EN' ? pin.titleEn : pin.titleFr}`}
    >
      {/* Backdrop — click to close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: 'rgba(2,2,2,0.7)',
          backdropFilter: 'blur(4px)',
        }}
        aria-label={t('Close', 'Fermer')}
      />
      {/* Panel */}
      <div
        className="pin-detail relative h-full w-full max-w-[640px] bg-[#0a0807] overflow-y-auto"
        style={{
          borderLeft: '1px solid rgba(197,160,89,0.3)',
          boxShadow: '-30px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Cover band */}
        <div className="relative h-56 md:h-64 overflow-hidden">
          <img
            src={MAP_PHOTO}
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `${pin.x}% ${pin.y}%`, transform: 'scale(1.4)' }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.2) 30%, rgba(5,5,5,0.85) 90%, #0a0807 100%)',
            }}
          />
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 w-11 h-11 rounded-full flex items-center justify-center font-cinzel text-[#f3e5ab] hover:bg-black/60 transition-colors"
            style={{
              background: 'rgba(8,6,4,0.7)',
              border: '1px solid rgba(197,160,89,0.3)',
              backdropFilter: 'blur(8px)',
            }}
            aria-label={t('Close', 'Fermer')}
          >
            ✕
          </button>
          {/* Title block */}
          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-prata text-[#c5a059]" style={{ fontSize: '1.4rem' }}>{pin.num}</span>
              <span
                className="font-cinzel uppercase tracking-[0.35em] text-[9px]"
                style={{ color: meta.color }}
              >
                {language === 'EN' ? meta.en : meta.fr}
              </span>
            </div>
            <h3
              className="font-prata uppercase text-[#f3e5ab] leading-[0.92] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', textShadow: '0 4px 24px rgba(0,0,0,0.7)' }}
            >
              {language === 'EN' ? pin.titleEn : pin.titleFr}
            </h3>
          </div>
        </div>
        {/* Body */}
        <div className="px-6 md:px-10 py-8 md:py-12">
          {pin.id === 'event' ? (
            <EventPinBody language={language} />
          ) : (
            <PreviewPinBody pin={pin} language={language} />
          )}
          <div className="mt-12 text-center">
            <button
              onClick={onClose}
              className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] hover:text-[#f3e5ab] transition-colors"
            >
              ← {t('Back to map', 'Retour à la carte')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventPinBody: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const eventDate = new Date('2026-05-21T12:00:00');
  const days = Math.max(0, Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  return (
    <div className="space-y-10">
      <div
        className="flex items-center justify-between gap-6 p-6 md:p-8 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(28,22,14,0.7) 0%, rgba(15,12,8,0.85) 100%)',
          border: '1px solid rgba(197,160,89,0.3)',
        }}
      >
        <div>
          <span className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em] block mb-1">
            {t('In', 'Dans')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-prata text-[#f3e5ab]" style={{ fontSize: '2.4rem' }}>{days}</span>
            <span className="font-cinzel text-neutral-300 text-[10px] uppercase tracking-[0.4em]">
              {t(days === 1 ? 'day' : 'days', days === 1 ? 'jour' : 'jours')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em] block mb-1">
            {t('Dates', 'Dates')}
          </span>
          <p className="font-prata text-[#f3e5ab] text-base">21 — 25 {t('May 2026', 'mai 2026')}</p>
        </div>
      </div>

      <div className="space-y-5">
        <h4 className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">
          {t('Three pillars', 'Trois piliers')}
        </h4>
        {[
          { en: '01 · Live Together', fr: '01 · Vivre Ensemble', body_en: 'Five days of meals, music, and quiet evenings around the fire.', body_fr: "Cinq jours de repas, de musique et de soirées tranquilles autour du feu." },
          { en: '02 · Make Together', fr: '02 · Créer Ensemble', body_en: 'Eight teams care for the land, the kitchen, the art.', body_fr: "Huit équipes prennent soin de la terre, de la cuisine, de l'art." },
          { en: '03 · Show Together', fr: '03 · Partager Ensemble', body_en: 'Performances each night — open mic, theatre, music.', body_fr: 'Spectacles chaque soir — scène ouverte, théâtre, musique.' },
        ].map((p, i) => (
          <div
            key={i}
            className="p-5 rounded-xl"
            style={{
              background: 'rgba(20, 16, 10, 0.6)',
              border: '1px solid rgba(197,160,89,0.18)',
            }}
          >
            <h5 className="font-prata uppercase text-[#f3e5ab] text-base mb-2">
              {language === 'EN' ? p.en : p.fr}
            </h5>
            <p className="font-josefin text-neutral-300 text-sm leading-relaxed">
              {language === 'EN' ? p.body_en : p.body_fr}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <button
          className="px-8 py-3.5 bg-[#c5a059] text-[#18181b] font-josefin font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all"
          style={{ boxShadow: '0 6px 24px rgba(197,160,89,0.4)' }}
        >
          {t('Continue → Pin 03 · Teams', 'Continuer → Épingle 03 · Équipes')}
        </button>
      </div>
    </div>
  );
};

const PreviewPinBody: React.FC<{ pin: Pin; language: 'EN' | 'FR' }> = ({ pin, language }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  return (
    <div
      className="p-8 md:p-12 rounded-2xl text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(28,22,14,0.5) 0%, rgba(15,12,8,0.7) 100%)',
        border: '1px dashed rgba(197,160,89,0.35)',
      }}
    >
      <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-3">
        {t('Design preview', 'Aperçu')}
      </span>
      <h4 className="font-prata uppercase text-[#f3e5ab] mb-3" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
        {language === 'EN' ? pin.titleEn : pin.titleFr}
      </h4>
      <p className="font-josefin text-neutral-300 text-sm leading-relaxed max-w-md mx-auto">
        {t(
          'This pin\'s content (team picker / lodging floor-plan / programme timeline / practical info) will live here. The map shell — pin states, hover cards, fly-in panel — is what you\'re evaluating now.',
          'Le contenu de cette épingle (équipes / plan d\'hébergement / chronologie / pratique) vivra ici. La coquille de la carte — états, cartes-survol, panneau — est ce qui est évalué maintenant.',
        )}
      </p>
    </div>
  );
};
