import { useState } from 'react';
import { PLATFORM_LOGOS } from './platformLogos';

// The Salon's front door: one level above the arts hub.
// Two paths — the artist centre (stays in the Salon) and the inn (leaves to
// aubergedesinconnus.com). Booking-platform trust badges sit under the lodging
// side. Visual language mirrors the existing arts Hub (split-screen, hover
// grow, Cinzel titles, gold-glow separator) so it reads as the same family.

const AUBERGE_URL = 'https://aubergedesinconnus.com';

// Evocative backdrops (same external-image approach the arts Hub already uses).
const ART_IMG =
  'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2000&auto=format&fit=crop';
const INN_IMG =
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop';

type Side = 'ART' | 'INN' | null;

export default function Splitter({ onEnterArts }: { onEnterArts: () => void }) {
  const [hovered, setHovered] = useState<Side>(null);

  const panelClass = (side: Exclude<Side, null>) =>
    `group relative cursor-pointer h-[38vh] md:h-full rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
      hovered === side
        ? 'flex-[1.5] -translate-y-4 z-10 ring-1 ring-white/20'
        : hovered
          ? 'flex-[0.8] translate-y-8 brightness-50 opacity-60'
          : 'flex-1'
    }`;

  return (
    <div className="min-h-screen w-full bg-[#0a0808] text-neutral-200 font-lato flex flex-col overflow-hidden">
      {/* Warm vignette + grain */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.7)_100%)]" />

      {/* Wordmark */}
      <header className="relative z-10 pt-10 pb-6 text-center shrink-0">
        <p className="font-cinzel text-sm md:text-base tracking-[0.45em] text-amber-100/80">
          LE SALON DES INCONNUS
        </p>
        <p className="mt-3 font-cormorant italic text-lg md:text-xl text-neutral-400">
          Que venez-vous chercher&nbsp;?
        </p>
      </header>

      {/* Two doors */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-stretch gap-4 md:gap-0 px-4 md:px-8 pb-4 min-h-[60vh]">
        {/* Artist centre */}
        <div
          onClick={onEnterArts}
          onMouseEnter={() => setHovered('ART')}
          onMouseLeave={() => setHovered(null)}
          className={panelClass('ART')}
        >
          <div className="absolute inset-0 bg-neutral-900" />
          <img
            src={ART_IMG}
            alt=""
            className={`w-full h-full object-cover transition-all duration-1000 ${
              hovered === 'ART' ? 'scale-105 saturate-125' : 'saturate-50 opacity-45'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <h2 className="font-cinzel text-4xl md:text-6xl text-white mb-4 tracking-widest drop-shadow-xl">
              Le Centre d'artiste
            </h2>
            <p
              className={`font-lato text-xs md:text-sm tracking-[0.35em] text-amber-200 border-b border-amber-400/50 pb-1 transition-all duration-500 ${
                hovered === 'ART' ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-2'
              }`}
            >
              SERVICES ARTISTIQUES
            </p>
          </div>
        </div>

        {/* Separator */}
        <div className="shrink-0 relative z-20 flex items-center justify-center opacity-60">
          <div className="w-24 h-px md:w-px md:h-48 bg-white/40 shadow-[0_0_10px_rgba(253,224,71,0.4)] rounded-full" />
        </div>

        {/* Inn / lodging */}
        <div
          onClick={() => {
            window.location.href = AUBERGE_URL;
          }}
          onMouseEnter={() => setHovered('INN')}
          onMouseLeave={() => setHovered(null)}
          className={panelClass('INN')}
        >
          <div className="absolute inset-0 bg-neutral-900" />
          <img
            src={INN_IMG}
            alt=""
            className={`w-full h-full object-cover transition-all duration-1000 ${
              hovered === 'INN' ? 'scale-105 saturate-125' : 'saturate-50 opacity-45'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <h2 className="font-cinzel text-4xl md:text-6xl text-white mb-4 tracking-widest drop-shadow-xl">
              L'Auberge des Inconnus
            </h2>
            <p
              className={`font-lato text-xs md:text-sm tracking-[0.35em] text-amber-200 border-b border-amber-400/50 pb-1 transition-all duration-500 ${
                hovered === 'INN' ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-2'
              }`}
            >
              HÉBERGEMENT
            </p>
          </div>
        </div>
      </div>

      {/* Lodging trust badges */}
      <footer className="relative z-10 shrink-0 px-6 pb-10 pt-4 text-center">
        <p className="font-lato text-[0.7rem] md:text-xs tracking-[0.3em] text-neutral-500 uppercase mb-5">
          Notre hébergement, réservable aussi sur
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {PLATFORM_LOGOS.map(({ name, label, Logo }) => (
            <Logo
              key={name}
              aria-label={label}
              className="h-6 md:h-7 w-auto text-neutral-400/70 hover:text-amber-100 transition-colors duration-300"
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
