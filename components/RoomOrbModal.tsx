import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Accommodation } from '../types';
import { ACCOMMODATIONS } from '../constants';
import RoomAmenities, { getRoomAccent } from './RoomAmenities';

// Shimmer SFX — same synth recipe as the main hub orb (apps/hub/src/HubOrb.tsx).
// Stacked sine partials in A major glide upward and bloom in over ~0.3s, with
// a faint high-passed noise wash for sparkle. Kept inline so this module
// stays a drop-in import for the inn page.
function useShimmer() {
  const ctxRef = useRef<AudioContext | null>(null);
  return () => {
    try {
      if (!ctxRef.current) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current!;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const duration = 1.6;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.22, now + 0.3);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(ctx.destination);

      const partials: { freq: number; offset: number; gain: number }[] = [
        { freq: 880,  offset: 0.00, gain: 0.18 },
        { freq: 1320, offset: 0.06, gain: 0.14 },
        { freq: 1760, offset: 0.12, gain: 0.12 },
        { freq: 2217, offset: 0.18, gain: 0.09 },
        { freq: 2637, offset: 0.24, gain: 0.07 },
        { freq: 3520, offset: 0.30, gain: 0.05 },
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now);
        osc.frequency.linearRampToValueAtTime(p.freq * 1.012, now + duration);
        const start = now + p.offset;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(p.gain, start + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(now + duration + 0.05);
      });

      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5500;
      hp.Q.value = 0.7;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.04, now + 0.4);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      noise.connect(hp);
      hp.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + duration);
    } catch {
      /* private mode etc. — silently no-op */
    }
  };
}

type RoomOrbCtx = { openRoomOrb: (acc: Accommodation) => void };
const Ctx = createContext<RoomOrbCtx | null>(null);

export function useRoomOrb(): RoomOrbCtx {
  // Consumers outside the provider get a no-op so we never break the page.
  return useContext(Ctx) ?? { openRoomOrb: () => {} };
}

type ProviderProps = { children: ReactNode; language: 'EN' | 'FR' };

export function RoomOrbProvider({ children, language }: ProviderProps) {
  // Rooms cycled by "Next Room". Skip only the whole-estate listing — it's a
  // different shopping experience. Coming-soon rooms are kept in the cycle so
  // visitors can read about them; the Choose button is replaced with a
  // "Bientôt" disabled state inside the modal.
  const rooms = useMemo(
    () => ACCOMMODATIONS.filter((a) => a.id !== 'manor'),
    [],
  );

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const openRoomOrb = useCallback(
    (acc: Accommodation) => {
      const i = rooms.findIndex((r) => r.id === acc.id);
      // If the click came from the manor card, fall back to the first room
      // so the visitor still sees something useful.
      setOpenIdx(i >= 0 ? i : 0);
    },
    [rooms],
  );

  const close = useCallback(() => setOpenIdx(null), []);

  return (
    <Ctx.Provider value={{ openRoomOrb }}>
      {children}
      {openIdx !== null &&
        createPortal(
          <RoomOrbModal
            rooms={rooms}
            index={openIdx}
            setIndex={setOpenIdx}
            onClose={close}
            language={language}
          />,
          document.body,
        )}
    </Ctx.Provider>
  );
}

type ModalProps = {
  rooms: Accommodation[];
  index: number;
  setIndex: (n: number) => void;
  onClose: () => void;
  language: 'EN' | 'FR';
};

function RoomOrbModal({ rooms, index, setIndex, onClose, language }: ModalProps) {
  const room = rooms[index];
  const accent = getRoomAccent(room.id);
  const playShimmer = useShimmer();

  // Play the hub's shimmer sound on every room change (skip the initial mount —
  // opening the modal is its own moment, the orb-fade animation already
  // signals it).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    playShimmer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // Auto-cycle through the room's photos every 4s, with cross-fade.
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => setImgIdx(0), [room.id]);
  useEffect(() => {
    if (room.images.length < 2) return;
    const t = setInterval(
      () => setImgIdx((i) => (i + 1) % room.images.length),
      4000,
    );
    return () => clearInterval(t);
  }, [room.id, room.images.length]);

  // Cross-fade two stacked layers, mirroring the hub orb.
  const [layerA, setLayerA] = useState(room.images[0]);
  const [layerB, setLayerB] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
  useEffect(() => {
    const next = room.images[imgIdx];
    if (activeLayer === 'A') {
      setLayerB(next);
      requestAnimationFrame(() => setActiveLayer('B'));
    } else {
      setLayerA(next);
      requestAnimationFrame(() => setActiveLayer('A'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgIdx, room.id]);

  const nextRoom = useCallback(() => {
    setIndex((index + 1) % rooms.length);
  }, [index, rooms.length, setIndex]);

  const choose = useCallback(() => {
    if (!room.bookingLink || room.bookingLink === '#') return;
    window.open(room.bookingLink, '_blank', 'noopener,noreferrer');
  }, [room.bookingLink]);

  // Esc to close, ←/→ to cycle rooms.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') nextRoom();
      else if (e.key === 'ArrowLeft') setIndex((index - 1 + rooms.length) % rooms.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, nextRoom, setIndex, index, rooms.length]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const title = language === 'FR' && room.title_fr ? room.title_fr : room.title;
  const type = language === 'FR' && room.type_fr ? room.type_fr : room.type;
  const desc = language === 'FR' && room.description_fr ? room.description_fr : room.description;
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const layerStyle = (img: string): CSSProperties => ({
    // Quote the URL so parens / spaces in filenames (e.g. "mini (1).jpg")
    // don't break CSS url() parsing. Escape any embedded quote.
    backgroundImage: `url("${img.replace(/"/g, '\\"')}")`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="room-orb-root fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md text-neutral-100 font-lato animate-roomFadeIn px-4 py-8 overflow-y-auto"
    >
      {/* Per-room animated gradient — sits behind everything, ~50% transparency,
          drifting "lights" use the room's accent palette. The key forces a
          fresh fade-in on every room change. */}
      <div
        key={`bg-${room.id}`}
        aria-hidden
        className="room-orb-bg pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="room-orb-bg-base absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 70% 30%, ${accent.from}, transparent 60%), radial-gradient(ellipse at 25% 80%, ${accent.to}, transparent 65%)`,
            opacity: 0.5,
          }}
        />
        <div
          className="room-orb-bg-glow-a absolute inset-[-10%]"
          style={{
            background: `radial-gradient(35% 35% at 30% 35%, ${accent.glow}99, transparent 70%)`,
            filter: 'blur(70px)',
            mixBlendMode: 'screen',
            opacity: 0.5,
          }}
        />
        <div
          className="room-orb-bg-glow-b absolute inset-[-10%]"
          style={{
            background: `radial-gradient(40% 40% at 70% 75%, ${accent.from}cc, transparent 70%)`,
            filter: 'blur(80px)',
            mixBlendMode: 'screen',
            opacity: 0.45,
          }}
        />
      </div>

      {/* Close X — fixed so it stays in the viewport even on tall content,
          and z-index above the dialog's stacking context. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t('Close', 'Fermer')}
        className="fixed top-5 right-5 md:top-8 md:right-10 w-11 h-11 rounded-full border border-white/25 bg-black/60 backdrop-blur-md text-neutral-200 hover:text-white hover:border-[#c5a059] hover:bg-black/80 transition-colors flex items-center justify-center text-2xl leading-none z-[110]"
      >
        ×
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1400px] mx-auto grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 items-center"
      >
        {/* LEFT — description + actions */}
        <div className="flex flex-col gap-6 md:gap-8 max-w-xl mx-auto md:mx-0 text-center md:text-left">
          <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">
            {type}
          </span>
          <h2
            key={room.id}
            className="room-orb-title font-cinzel text-[#f3e5ab] uppercase leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
          >
            {title}
          </h2>
          <p
            key={`desc-${room.id}`}
            className="room-orb-desc font-lato text-neutral-300 text-sm md:text-base leading-relaxed"
          >
            {desc}
          </p>

          {/* Stats — beds / baths */}
          <div className="flex justify-center md:justify-start gap-6 text-[10px] font-cinzel uppercase tracking-[0.3em] text-[#f3e5ab]">
            <span>
              {room.beds} <span className="text-[#c5a059]/70">{t('Beds', 'Lits')}</span>
            </span>
            <span className="text-[#c5a059]/40">·</span>
            <span>
              {room.baths} <span className="text-[#c5a059]/70">{t('Baths', 'Salles de Bain')}</span>
            </span>
          </div>

          {/* Amenity icons — max guests + per-room amenities */}
          <RoomAmenities
            amenities={room.amenities}
            guests={room.guests}
            maxGuests={room.maxGuests}
            language={language}
            size="md"
          />


          {/* Buttons */}
          <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
            <button
              onClick={nextRoom}
              className="px-7 py-4 font-cinzel font-bold text-xs uppercase tracking-[0.3em] border border-white/20 text-neutral-200 hover:border-[#c5a059] hover:text-[#f3e5ab] transition-colors"
            >
              {t('Next Room', 'Chambre Suivante')}
            </button>
            {room.status === 'COMING_SOON' ? (
              <button
                disabled
                className="px-7 py-4 font-cinzel font-bold text-xs uppercase tracking-[0.3em] border border-[#c5a059]/40 text-[#f3e5ab]/60 bg-black/30 cursor-not-allowed"
              >
                {t('Coming Soon', 'Bientôt')}
              </button>
            ) : (
              <button
                onClick={choose}
                disabled={!room.bookingLink || room.bookingLink === '#'}
                className="px-7 py-4 font-cinzel font-bold text-xs uppercase tracking-[0.3em] border bg-[#c5a059] text-[#18181b] border-[#c5a059] hover:bg-[#d4b06a] hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  boxShadow:
                    '0 6px 24px rgba(197,160,89,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {t('Choose This Room', 'Choisir Cette Chambre')}
              </button>
            )}
          </div>

          {/* Room counter */}
          <span className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mt-2">
            {String(index + 1).padStart(2, '0')} / {String(rooms.length).padStart(2, '0')}
          </span>
        </div>

        {/* RIGHT — orb with cycling images */}
        <div className="relative flex items-center justify-center">
          <div className="relative w-full max-w-[560px] aspect-square">
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(197,160,89,0.22), transparent 60%)',
                filter: 'blur(50px)',
              }}
            />

            <div className="room-orb relative aspect-square w-full rounded-full overflow-hidden">
              {/* IMAGE LAYERS — cross-fade */}
              <div
                className={`room-orb-img absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                  activeLayer === 'A' ? 'opacity-100 room-orb-img-active' : 'opacity-0'
                }`}
                style={layerStyle(layerA)}
              />
              {layerB && (
                <div
                  className={`room-orb-img absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                    activeLayer === 'B' ? 'opacity-100 room-orb-img-active' : 'opacity-0'
                  }`}
                  style={layerStyle(layerB)}
                />
              )}

              {/* Inner vignette */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
                }}
              />

              {/* Glassy refraction shell */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.18), rgba(0,0,0,0) 38%)',
                  mixBlendMode: 'screen',
                }}
              />

              {/* Top specular highlight, breathing */}
              <div
                className="absolute inset-x-[15%] top-[5%] h-[36%] rounded-full pointer-events-none room-orb-shine"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55), rgba(255,255,255,0) 65%)',
                  filter: 'blur(2px)',
                }}
              />

              {/* Gold ornate ring */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: '1px solid rgba(243,229,171,0.5)',
                  boxShadow:
                    'inset 0 0 0 5px rgba(0,0,0,0.55), inset 0 0 0 6px rgba(197,160,89,0.6), inset 0 0 70px rgba(197,160,89,0.2), 0 0 80px rgba(197,160,89,0.18), 0 0 200px rgba(197,160,89,0.08), 0 30px 80px rgba(0,0,0,0.6)',
                }}
              />

              {/* Bottom name banner inside the orb */}
              <div className="absolute left-0 right-0 bottom-[16%] flex justify-center pointer-events-none">
                <span
                  key={room.id}
                  className="room-orb-nameplate px-6 py-2 font-cinzel uppercase text-[#f3e5ab]"
                  style={{
                    letterSpacing: '0.15em',
                    fontSize: 'clamp(0.85rem, 1.1vw, 1.05rem)',
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 25%, rgba(0,0,0,0.55) 75%, transparent 100%)',
                    textShadow: '0 2px 12px rgba(0,0,0,0.85)',
                  }}
                >
                  {title}
                </span>
              </div>
            </div>

            {/* Image dots */}
            {room.images.length > 1 && (
              <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
                {room.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    aria-label={`${t('Image', 'Image')} ${i + 1}`}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === imgIdx ? 'bg-[#f3e5ab] w-5' : 'bg-white/25 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .room-orb-img {
          will-change: transform, opacity;
        }
        .room-orb-img-active {
          animation: roomKenBurns 16s ease-in-out infinite alternate;
        }
        @keyframes roomKenBurns {
          0%   { transform: scale(1.05); }
          100% { transform: scale(1.14) translateY(-1.5%); }
        }
        .room-orb-shine {
          animation: roomShine 6s ease-in-out infinite alternate;
        }
        @keyframes roomShine {
          0%   { opacity: 0.45; transform: translateY(0); }
          100% { opacity: 0.7;  transform: translateY(2px); }
        }
        .room-orb-title,
        .room-orb-desc,
        .room-orb-nameplate {
          animation: roomFadeText 600ms ease-out;
        }
        @keyframes roomFadeText {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-roomFadeIn {
          animation: roomFadeIn 320ms ease-out;
        }
        @keyframes roomFadeIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        .room-orb-bg {
          animation: roomBgFade 1100ms ease-out;
        }
        @keyframes roomBgFade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        .room-orb-bg-base {
          animation: roomBgPulse 9s ease-in-out infinite alternate;
          will-change: opacity, transform;
        }
        .room-orb-bg-glow-a {
          animation: roomBgDriftA 14s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        .room-orb-bg-glow-b {
          animation: roomBgDriftB 18s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        @keyframes roomBgPulse {
          0%   { opacity: 0.45; transform: scale(1); }
          100% { opacity: 0.6;  transform: scale(1.05); }
        }
        @keyframes roomBgDriftA {
          0%   { transform: translate(-3%, -2%) scale(1.05); opacity: 0.45; }
          50%  { transform: translate( 3%,  1%) scale(1.12); opacity: 0.6;  }
          100% { transform: translate(-1%,  3%) scale(1.08); opacity: 0.5;  }
        }
        @keyframes roomBgDriftB {
          0%   { transform: translate( 2%,  3%) scale(1.07); opacity: 0.4;  }
          50%  { transform: translate(-3%, -2%) scale(1.14); opacity: 0.55; }
          100% { transform: translate( 1%, -3%) scale(1.05); opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .room-orb-img-active,
          .room-orb-shine,
          .room-orb-title,
          .room-orb-desc,
          .room-orb-nameplate,
          .room-orb-bg-base,
          .room-orb-bg-glow-a,
          .room-orb-bg-glow-b,
          .animate-roomFadeIn { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
