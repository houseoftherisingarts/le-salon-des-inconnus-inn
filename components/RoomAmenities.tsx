import type { ReactNode } from 'react';
import type { AmenityKey, Accommodation } from '../types';

type Lang = 'EN' | 'FR';

type AmenityDef = {
  /** Compact label shown under the icon. Keep ≤ 16 chars per language. */
  label: { EN: string; FR: string };
  /** Tooltip shown on hover — can be longer. Falls back to label. */
  tooltip?: { EN: string; FR: string };
  icon: ReactNode;
};

const stroke = { strokeWidth: 1.5, stroke: 'currentColor', fill: 'none' as const };

const AMENITIES: Record<AmenityKey, AmenityDef> = {
  parking: {
    label: { EN: 'Parking', FR: 'Parking' },
    tooltip: { EN: 'Parking', FR: 'Stationnement' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M10 17V8h3.5a2.5 2.5 0 0 1 0 5H10" />
      </svg>
    ),
  },
  wifi: {
    label: { EN: 'Wifi', FR: 'Wifi' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 9.5a15 15 0 0 1 19 0" />
        <path d="M5.5 12.5a11 11 0 0 1 13 0" />
        <path d="M8.5 15.5a7 7 0 0 1 7 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  'no-wifi': {
    label: { EN: 'No Wifi', FR: 'Sans Wifi' },
    tooltip: { EN: 'No Wifi (intentional)', FR: 'Sans Wifi (volontaire)' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 9.5a15 15 0 0 1 19 0" />
        <path d="M5.5 12.5a11 11 0 0 1 13 0" />
        <path d="M8.5 15.5a7 7 0 0 1 7 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  'hot-tub': {
    label: { EN: 'Hot tub', FR: 'Spa' },
    tooltip: { EN: 'Hot tub / Spa', FR: 'Spa / Jacuzzi' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14h18v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
        <path d="M7 14V8a2 2 0 0 1 2-2h2" />
        <path d="M11 6c1 0 1.5 1 1.5 2" />
        <path d="M6 10c.6-.4 1.4-.4 2 0" />
        <path d="M10 10c.6-.4 1.4-.4 2 0" />
        <path d="M14 10c.6-.4 1.4-.4 2 0" />
      </svg>
    ),
  },
  terrasse: {
    label: { EN: 'Terrace', FR: 'Terrasse' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-6 9 6" />
        <path d="M5 11v9h14v-9" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  projector: {
    label: { EN: 'Projector & screen', FR: 'Projecteur' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="9" width="16" height="9" rx="2" />
        <circle cx="9" cy="13.5" r="2.5" />
        <path d="M18 13.5h3" />
        <path d="M5 18v2" />
        <path d="M15 18v2" />
      </svg>
    ),
  },
  boardgames: {
    label: { EN: 'Board games', FR: 'Jeux de société' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  fireplace: {
    label: { EN: 'Fireplace', FR: 'Foyer' },
    tooltip: { EN: 'Fireplace / Wood stove', FR: 'Foyer / Poêle à bois' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c1.5 3 3 4.5 3 7a3 3 0 1 1-6 0c0-2 1-3 1-5" />
        <path d="M9 14a3 3 0 0 0 6 0" />
        <path d="M7 19h10" />
      </svg>
    ),
  },
  'private-bath': {
    label: { EN: 'Private bath', FR: 'SdB privée' },
    tooltip: { EN: 'Private bath', FR: 'Salle de bain privée' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
        <path d="M7 12V7a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2" />
        <path d="M6 18l-1 2" />
        <path d="M18 18l1 2" />
      </svg>
    ),
  },
  electricity: {
    label: { EN: 'Electricity', FR: 'Électricité' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
      </svg>
    ),
  },
  'off-grid': {
    label: { EN: 'Off-grid', FR: 'Hors-réseau' },
    tooltip: { EN: 'Off-grid (battery provided)', FR: 'Hors-réseau (batterie fournie)' },
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="14" height="9" rx="1.5" />
        <path d="M18 11h2v3h-2" />
        <path d="M8 8V6h6v2" />
        <path d="M9 12.5l2 0" />
        <path d="M13 12.5l2 0" />
        <path d="M11 11v3" />
      </svg>
    ),
  },
};

/** Per-room accent colours used by the modal background gradient. */
export const ROOM_ACCENTS: Record<string, { from: string; to: string; glow: string }> = {
  room1: { from: '#b8862c', to: '#3b2410', glow: '#e9c97a' }, // Écrivaine — parchment / ink
  room2: { from: '#8a1f2c', to: '#2a0d14', glow: '#d6a04f' }, // Musicienne — burgundy / brass
  room3: { from: '#3a4a78', to: '#0d1428', glow: '#9bb1d8' }, // Cinéaste — silver-screen blue
  room4: { from: '#a01840', to: '#2c0814', glow: '#e6c25a' }, // Amphithéâtre — moulin rouge
  manor: { from: '#a87a2c', to: '#1c1408', glow: '#f3d68a' }, // Manor — classic gold
  yurt:  { from: '#5a6b3a', to: '#1a2410', glow: '#d4a861' }, // Yourte — forest / amber
  tiny:  { from: '#3d5a4a', to: '#0e1a14', glow: '#a8c4a0' }, // Méditante — moss / mist
  bus:   { from: '#b25a2a', to: '#1f1208', glow: '#e8a35c' }, // Bus — sunset
};

export function getRoomAccent(id: string) {
  return ROOM_ACCENTS[id] ?? { from: '#a87a2c', to: '#1c1408', glow: '#f3d68a' };
}

type AmenityIconsProps = {
  amenities?: AmenityKey[];
  language: Lang;
  /** Maximum guests allowed (shown as the first chip). */
  maxGuests?: number | string;
  /** Standard guest count, displayed alongside max if both supplied. */
  guests?: number | string;
  /** Visual size — 'sm' for cards, 'md' for the modal. */
  size?: 'sm' | 'md';
  className?: string;
};

export default function RoomAmenities({
  amenities,
  language,
  maxGuests,
  guests,
  size = 'sm',
  className = '',
}: AmenityIconsProps) {
  const list = amenities ?? [];
  const iconBox = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  const iconSvg = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const labelTxt = size === 'md' ? 'text-[9px]' : 'text-[8px]';
  const cellW = size === 'md' ? 'w-[78px]' : 'w-[64px]';
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const peopleLabel = t('Max guests', 'Capacité max');
  const peopleShort = t('Max', 'Max');
  const peopleValue = maxGuests ?? guests;

  return (
    <ul className={`flex flex-wrap gap-x-2 gap-y-3 justify-center md:justify-start items-start ${className}`}>
      {peopleValue !== undefined && (
        <li className={`${cellW} flex flex-col items-center gap-1.5 text-center`} title={peopleLabel}>
          <div
            className={`${iconBox} rounded-full border border-[#c5a059]/50 bg-black/40 backdrop-blur-sm flex items-center justify-center text-[#f3e5ab]`}
          >
            <svg viewBox="0 0 24 24" {...stroke} strokeLinecap="round" strokeLinejoin="round" className={iconSvg}>
              <circle cx="9" cy="8" r="3" />
              <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
              <circle cx="17" cy="8" r="2.5" />
              <path d="M21 18c0-2.5-2-4-4-4" />
            </svg>
          </div>
          <span
            className={`${labelTxt} font-cinzel uppercase tracking-[0.15em] text-[#f3e5ab]/85 leading-tight`}
          >
            {peopleShort} {String(peopleValue)}
          </span>
        </li>
      )}

      {list.map((key) => {
        const def = AMENITIES[key];
        if (!def) return null;
        const dim = key === 'no-wifi';
        const tip = (def.tooltip ?? def.label)[language];
        return (
          <li
            key={key}
            className={`${cellW} flex flex-col items-center gap-1.5 text-center`}
            title={tip}
          >
            <div
              className={`${iconBox} rounded-full border bg-black/30 backdrop-blur-sm flex items-center justify-center transition-colors ${
                dim
                  ? 'border-white/15 text-neutral-500'
                  : 'border-[#c5a059]/30 text-[#f3e5ab] hover:border-[#c5a059]/70'
              }`}
            >
              <span className={iconSvg}>{def.icon}</span>
            </div>
            <span
              className={`${labelTxt} font-cinzel uppercase tracking-[0.15em] leading-tight ${
                dim ? 'text-neutral-500' : 'text-neutral-400'
              }`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {def.label[language]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact variant for cards — icons only, no labels, no people chip duplication. */
export function RoomAmenitiesCompact({
  amenities,
  language,
  className = '',
}: {
  amenities?: Accommodation['amenities'];
  language: Lang;
  className?: string;
}) {
  const list = amenities ?? [];
  if (list.length === 0) return null;
  return (
    <ul className={`flex flex-wrap justify-center gap-1.5 ${className}`}>
      {list.map((key) => {
        const def = AMENITIES[key];
        if (!def) return null;
        const dim = key === 'no-wifi';
        const tip = (def.tooltip ?? def.label)[language];
        return (
          <li
            key={key}
            title={tip}
            className={`w-6 h-6 rounded-full border flex items-center justify-center ${
              dim ? 'border-white/15 text-neutral-500' : 'border-[#c5a059]/25 text-[#c5a059]'
            }`}
          >
            <span className="w-3.5 h-3.5">{def.icon}</span>
          </li>
        );
      })}
    </ul>
  );
}
