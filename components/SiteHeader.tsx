
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';
import { MemberPanel } from './MemberPanel';
import { MUSIC_GENRES } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewState =
  | 'INN' | 'INN_TEST2' | 'INN_TEST3' | 'INN_RESERVE_CINE' | 'KITCHEN' | 'MASSOTHERAPY' | 'HOSTS' | 'GUIDE'
  | 'EVENTS' | 'CEILIDH' | 'WWOOFING' | 'MY_PROFILE' | 'PUBLIC_PROFILE'
  | 'MESSAGING' | 'ADMIN';

interface SiteHeaderProps {
  language: 'EN' | 'FR';
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onToggleLanguage: () => void;
  // Music
  isMusicPlaying: boolean;
  isMusicMenuOpen: boolean;
  setIsMusicMenuOpen: (open: boolean) => void;
  changeGenre: (genre: keyof typeof MUSIC_GENRES) => void;
  toggleMute: () => void;
  currentGenre: keyof typeof MUSIC_GENRES | null;
  // Auth / member
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
  redirectPendingUser?: User | null;
  onRedirectUserHandled?: () => void;
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

type NavItem = { view: ViewState; label_fr: string; label_en: string; desc_fr: string; desc_en: string; icon: string };

const SEJOUR: NavItem[] = [
  { view: 'INN',      label_fr: 'L\'Auberge',    label_en: 'The Inn',       desc_fr: 'Chambres, yourte et bus',          desc_en: 'Rooms, yurt and converted bus',    icon: '🏛️' },
  { view: 'WWOOFING', label_fr: 'Wwoofing',      label_en: 'Wwoofing',      desc_fr: 'Vivez et travaillez sur le domaine', desc_en: 'Live and work on the estate',     icon: '🌿' },
  { view: 'CEILIDH',  label_fr: 'Ceilidh de Mai',label_en: 'May Ceilidh',   desc_fr: 'Festival communautaire 2026',       desc_en: 'Community festival 2026',          icon: '🎶' },
];

const EXPLORER: NavItem[] = [
  { view: 'KITCHEN',      label_fr: 'Cuisine',          label_en: 'Kitchen',         desc_fr: 'Chef privé & bistronomie',       desc_en: 'Private chef & bistronomy',    icon: '🍽️' },
  { view: 'MASSOTHERAPY', label_fr: 'Massothérapie',    label_en: 'Massotherapy',    desc_fr: 'Soins holistiques & reiki',      desc_en: 'Holistic care & reiki',        icon: '✦' },
  { view: 'GUIDE',        label_fr: 'Guide Local',      label_en: 'Local Guide',     desc_fr: 'Quoi faire en Petite-Nation',    desc_en: 'Things to do in Petite-Nation', icon: '🗺️' },
  { view: 'HOSTS',        label_fr: 'Les Hôtes',        label_en: 'Our Hosts',       desc_fr: 'L\'équipe derrière le projet',   desc_en: 'The team behind the project',  icon: '✧' },
  { view: 'EVENTS',       label_fr: 'Événements',       label_en: 'Events',          desc_fr: 'Spectacles & résidences',        desc_en: 'Shows & residencies',          icon: '🌙' },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback(() => setScrolled(window.scrollY > threshold), [threshold]);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);
  return scrolled;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

const Dropdown: React.FC<{
  label: string;
  items: NavItem[];
  language: 'EN' | 'FR';
  currentView: ViewState;
  onNavigate: (v: ViewState) => void;
}> = ({ label, items, language, currentView, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = items.some(i => i.view === currentView);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-cinzel font-bold uppercase tracking-[0.18em] transition-all duration-200
          ${isActive
            ? 'text-[#d4af37]'
            : 'text-white/70 hover:text-white'}`}
      >
        {label}
        <svg
          width="9" height="6" viewBox="0 0 9 6" fill="none"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-header-drop"
          style={{ minWidth: '340px' }}
        >
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#111] border-l border-t border-[#d4af37]/20" />

          <ul
            className="relative bg-[#0e0e0e]/95 backdrop-blur-xl border border-[#d4af37]/20 rounded-xl shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.08)' }}
          >
            {items.map((item) => {
              const active = currentView === item.view;
              return (
                <li key={item.view}>
                  <button
                    onClick={() => { onNavigate(item.view); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 group
                      ${active
                        ? 'bg-[#d4af37]/10 border-l-2 border-[#d4af37]'
                        : 'hover:bg-white/[0.04] border-l-2 border-transparent'}`}
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base border transition-colors
                      ${active
                        ? 'bg-[#d4af37]/15 border-[#d4af37]/40'
                        : 'bg-white/5 border-white/10 group-hover:border-[#d4af37]/30'}`}>
                      <span>{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-cinzel font-bold uppercase tracking-[0.15em] transition-colors
                        ${active ? 'text-[#d4af37]' : 'text-white/90 group-hover:text-white'}`}>
                        {language === 'FR' ? item.label_fr : item.label_en}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5 font-lato leading-tight truncate">
                        {language === 'FR' ? item.desc_fr : item.desc_en}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Mobile menu (portal) ─────────────────────────────────────────────────────

const MobileMenu: React.FC<{
  open: boolean;
  language: 'EN' | 'FR';
  currentView: ViewState;
  onNavigate: (v: ViewState) => void;
  onClose: () => void;
}> = ({ open, language, currentView, onNavigate, onClose }) => {
  if (!open || typeof window === 'undefined') return null;

  const go = (v: ViewState) => { onNavigate(v); onClose(); };

  return createPortal(
    <div
      className="fixed inset-0 z-[108] flex flex-col bg-[#080808]/98 backdrop-blur-xl"
      style={{ top: '56px' }}
    >
      <div
        data-open={open}
        className="flex-1 overflow-y-auto p-5 flex flex-col gap-6"
        style={{ animation: 'mobileMenuIn 0.22s ease-out both' }}
      >
        {/* SÉJOUR */}
        <div>
          <p className="text-[9px] font-cinzel font-bold uppercase tracking-[0.35em] text-[#d4af37]/60 mb-2 px-1">
            {language === 'FR' ? 'Séjour' : 'Stay'}
          </p>
          <div className="flex flex-col gap-1">
            {SEJOUR.map(item => (
              <button
                key={item.view}
                onClick={() => go(item.view)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors
                  ${currentView === item.view ? 'bg-[#d4af37]/10' : 'hover:bg-white/5'}`}
              >
                <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm flex-shrink-0">{item.icon}</span>
                <div>
                  <p className={`text-[11px] font-cinzel font-bold uppercase tracking-[0.15em] ${currentView === item.view ? 'text-[#d4af37]' : 'text-white/90'}`}>
                    {language === 'FR' ? item.label_fr : item.label_en}
                  </p>
                  <p className="text-[10px] text-white/40 font-lato mt-0.5">
                    {language === 'FR' ? item.desc_fr : item.desc_en}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* EXPLORER */}
        <div>
          <p className="text-[9px] font-cinzel font-bold uppercase tracking-[0.35em] text-[#d4af37]/60 mb-2 px-1">
            {language === 'FR' ? 'Explorer' : 'Explore'}
          </p>
          <div className="flex flex-col gap-1">
            {EXPLORER.map(item => (
              <button
                key={item.view}
                onClick={() => go(item.view)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors
                  ${currentView === item.view ? 'bg-[#d4af37]/10' : 'hover:bg-white/5'}`}
              >
                <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm flex-shrink-0">{item.icon}</span>
                <div>
                  <p className={`text-[11px] font-cinzel font-bold uppercase tracking-[0.15em] ${currentView === item.view ? 'text-[#d4af37]' : 'text-white/90'}`}>
                    {language === 'FR' ? item.label_fr : item.label_en}
                  </p>
                  <p className="text-[10px] text-white/40 font-lato mt-0.5">
                    {language === 'FR' ? item.desc_fr : item.desc_en}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Réserver CTA */}
        <button
          onClick={() => go('INN')}
          className="w-full py-3.5 rounded-full bg-[#d4af37] text-[#0a0808] font-cinzel font-bold text-[11px] uppercase tracking-[0.3em] transition-all hover:bg-[#e0bc45] active:scale-95"
        >
          {language === 'FR' ? 'Réserver' : 'Book'}
        </button>
      </div>
    </div>,
    document.body,
  );
};

// ─── Hamburger icon ───────────────────────────────────────────────────────────

const Hamburger: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
    <line
      x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      style={{ transformOrigin: '10px 2px', transition: 'transform 0.28s ease', transform: open ? 'rotate(45deg) translateY(5px)' : 'none' }}
    />
    <line
      x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      style={{ transition: 'opacity 0.2s ease', opacity: open ? 0 : 1 }}
    />
    <line
      x1="0" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      style={{ transformOrigin: '10px 12px', transition: 'transform 0.28s ease', transform: open ? 'rotate(-45deg) translateY(-5px)' : 'none' }}
    />
  </svg>
);

// ─── Music button ─────────────────────────────────────────────────────────────

const MusicButton: React.FC<{
  isMusicPlaying: boolean;
  isMusicMenuOpen: boolean;
  setIsMusicMenuOpen: (o: boolean) => void;
  changeGenre: (g: keyof typeof MUSIC_GENRES) => void;
  toggleMute: () => void;
  currentGenre: keyof typeof MUSIC_GENRES | null;
  language: 'EN' | 'FR';
}> = ({ isMusicPlaying, isMusicMenuOpen, setIsMusicMenuOpen, changeGenre, toggleMute, currentGenre, language }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsMusicMenuOpen(false); };
    if (isMusicMenuOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isMusicMenuOpen, setIsMusicMenuOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsMusicMenuOpen(!isMusicMenuOpen)}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border
          ${isMusicPlaying
            ? 'bg-black/40 border-[#d4af37]/50 text-[#f3e5ab] shadow-[0_0_10px_rgba(212,175,55,0.25)]'
            : 'bg-black/40 border-white/10 text-white/30 hover:border-white/25 hover:text-white/60'}`}
        title="Music"
      >
        {isMusicPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        )}
      </button>
      {isMusicMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsMusicMenuOpen(false)} />
          <div className="absolute top-10 right-0 z-50 w-32 bg-[#0e0e0e]/95 border border-white/10 rounded-xl backdrop-blur-md shadow-xl overflow-hidden animate-header-drop">
            <div className="py-1 flex flex-col">
              {(Object.keys(MUSIC_GENRES) as Array<keyof typeof MUSIC_GENRES>).map((genre) => (
                <button
                  key={genre}
                  onClick={() => changeGenre(genre)}
                  className={`px-4 py-2 text-[11px] font-cinzel text-left transition-colors
                    ${currentGenre === genre && isMusicPlaying ? 'text-[#f3e5ab] bg-white/10' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  {genre}
                </button>
              ))}
              <div className="h-px bg-white/10 my-1 mx-2" />
              <button
                onClick={toggleMute}
                className={`px-4 py-2 text-[11px] font-cinzel text-left transition-colors
                  ${!isMusicPlaying ? 'text-red-300' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
              >
                {isMusicPlaying ? 'Silence' : (language === 'FR' ? 'Jouer' : 'Play')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main header ──────────────────────────────────────────────────────────────

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  language, currentView, onNavigate, onToggleLanguage,
  isMusicPlaying, isMusicMenuOpen, setIsMusicMenuOpen, changeGenre, toggleMute, currentGenre,
  user, memberProfile, onUserChange, onShowPrivacy, redirectPendingUser, onRedirectUserHandled,
}) => {
  const scrolled = useScroll(10);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close mobile menu on navigate
  const handleNavigate = (v: ViewState) => { onNavigate(v); setMobileOpen(false); };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[109] transition-all duration-300 ${
          scrolled
            ? 'bg-[#050505]/90 backdrop-blur-xl border-b border-[#d4af37]/15 shadow-[0_1px_30px_rgba(0,0,0,0.6)]'
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ height: '56px' }}
      >
        <nav className="h-full mx-auto max-w-7xl px-5 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => handleNavigate('INN')}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <img
              src="https://i.imgur.com/B1YfPqn.png"
              alt="Le Salon des Inconnus"
              className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="hidden sm:block font-cinzel text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 group-hover:text-white/90 transition-colors">
              Le Salon des Inconnus
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            <Dropdown
              label={language === 'FR' ? 'Séjour' : 'Stay'}
              items={SEJOUR}
              language={language}
              currentView={currentView}
              onNavigate={handleNavigate}
            />
            <Dropdown
              label={language === 'FR' ? 'Explorer' : 'Explore'}
              items={EXPLORER}
              language={language}
              currentView={currentView}
              onNavigate={handleNavigate}
            />
            <button
              onClick={() => handleNavigate('CEILIDH')}
              className={`px-3 py-2 rounded-md text-[11px] font-cinzel font-bold uppercase tracking-[0.18em] transition-all duration-200
                ${currentView === 'CEILIDH' ? 'text-[#d4af37]' : 'text-white/70 hover:text-white'}`}
            >
              Ceilidh
            </button>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* Réserver — desktop only */}
            <button
              onClick={() => handleNavigate('INN')}
              className="hidden md:flex items-center px-5 py-2 rounded-full bg-[#d4af37] text-[#0a0808] font-cinzel font-bold text-[10px] uppercase tracking-[0.25em] transition-all hover:bg-[#e0bc45] hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 2px 14px rgba(212,175,55,0.28)' }}
            >
              {language === 'FR' ? 'Réserver' : 'Book'}
            </button>

            {/* Language toggle */}
            <button
              onClick={onToggleLanguage}
              className="flex items-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-1 py-1 hover:bg-black/60 transition-colors"
            >
              <span className={`text-[9px] font-cinzel font-bold px-2.5 py-0.5 rounded-full transition-all ${language === 'EN' ? 'bg-[#f3e5ab] text-[#4a3b2a]' : 'text-yellow-100/50'}`}>EN</span>
              <span className={`text-[9px] font-cinzel font-bold px-2.5 py-0.5 rounded-full transition-all ${language === 'FR' ? 'bg-[#f3e5ab] text-[#4a3b2a]' : 'text-yellow-100/50'}`}>FR</span>
            </button>

            {/* Music */}
            <MusicButton
              isMusicPlaying={isMusicPlaying}
              isMusicMenuOpen={isMusicMenuOpen}
              setIsMusicMenuOpen={setIsMusicMenuOpen}
              changeGenre={changeGenre}
              toggleMute={toggleMute}
              currentGenre={currentGenre}
              language={language}
            />

            {/* Member panel */}
            <MemberPanel
              user={user}
              memberProfile={memberProfile}
              language={language}
              onUserChange={onUserChange}
              onShowPrivacy={onShowPrivacy}
              onNavigate={onNavigate}
              redirectPendingUser={redirectPendingUser}
              onRedirectUserHandled={onRedirectUserHandled}
            />

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full border border-white/15 bg-black/40 text-white/80 hover:text-white transition-colors"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              <Hamburger open={mobileOpen} />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        open={mobileOpen}
        language={language}
        currentView={currentView}
        onNavigate={handleNavigate}
        onClose={() => setMobileOpen(false)}
      />

      <style>{`
        @keyframes header-drop {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-header-drop { animation: header-drop 0.18s ease-out both; }
        @keyframes mobileMenuIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
