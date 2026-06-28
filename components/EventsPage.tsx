
import React, { useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';
import { SeoBlock } from './SeoBlock';

interface EventsPageProps {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
}

// ─── Upcoming events data ─────────────────────────────────────────────────────

interface EventEntry {
  id: string;
  name: string;
  name_fr: string;
  subtitle: string;
  subtitle_fr: string;
  startDate: string;   // ISO
  endDate: string;     // ISO
  isNext: boolean;
  status: 'open' | 'coming_soon' | 'past';
  image?: string;
  navigateTo: string;
  tag?: string;
  tag_fr?: string;
}

const SALON_EVENTS: EventEntry[] = [
  {
    id: 'ceilidh-mai-2026',
    name: 'Grand Ceilidh de Mai',
    name_fr: 'Grand Ceilidh de Mai',
    subtitle: 'Community Woofing Weekend : shows, banquet & collective work',
    subtitle_fr: 'Weekend de Woofing Communautaire : spectacles, banquet et travail collectif',
    startDate: '2026-05-21',
    endDate: '2026-05-25',
    isNext: true,
    status: 'open',
    image: '/media/inn/golden%20drone%20copy.jpg',
    navigateTo: 'CEILIDH',
    tag: 'Next Event',
    tag_fr: 'Prochain Événement',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string, lang: 'EN' | 'FR'): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const monthFR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months = lang === 'FR' ? monthFR : monthEN;
  if (lang === 'FR') {
    return `${s.getDate()} – ${e.getDate()} ${months[s.getMonth()]} ${e.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── EventCard ───────────────────────────────────────────────────────────────

const NextEventCard: React.FC<{ event: EventEntry; language: 'EN' | 'FR'; onNavigate: (v: any) => void }> = ({ event, language, onNavigate }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const countdown = daysUntil(event.startDate);
  const dateStr = formatDateRange(event.startDate, event.endDate, language);

  return (
    <div
      onClick={() => onNavigate(event.navigateTo)}
      className="group relative cursor-pointer w-full overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-500 shadow-2xl hover:shadow-[0_0_60px_rgba(212,175,55,0.15)]"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={event.image}
          alt={event.name_fr}
          className="w-full h-full object-cover transition-transform duration-[8s] group-hover:scale-105"
          style={{ objectPosition: '50% 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent"></div>
      </div>

      {/* Tag */}
      <div className="absolute top-6 left-6 z-10">
        <div className="bg-[#d4af37] text-black px-4 py-1 font-cinzel text-xs font-bold uppercase tracking-[0.3em]">
          {language === 'FR' ? event.tag_fr : event.tag}
        </div>
      </div>

      {/* Countdown */}
      {countdown > 0 && (
        <div className="absolute top-6 right-6 z-10 text-right">
          <div className="text-[#d4af37] font-cinzel text-3xl font-bold leading-none">{countdown}</div>
          <div className="text-neutral-400 text-[10px] uppercase tracking-[0.2em] font-cinzel mt-1">
            {t('days', countdown === 1 ? 'jour' : 'jours')}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-8 md:p-12 min-h-[420px] flex flex-col justify-end">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-10 bg-[#d4af37]"></div>
          <span className="text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.4em]">
            {dateStr}
          </span>
        </div>

        <h2 className="font-cinzel text-4xl md:text-6xl text-white mb-4 leading-tight group-hover:text-[#f3e5ab] transition-colors duration-300">
          {language === 'FR' ? event.name_fr : event.name}
        </h2>

        <p className="font-lato text-neutral-300 text-base md:text-lg max-w-2xl leading-relaxed mb-8">
          {language === 'FR' ? event.subtitle_fr : event.subtitle}
        </p>

        <div className="flex items-center gap-2 text-[#d4af37] font-cinzel text-sm uppercase tracking-widest group-hover:gap-4 transition-all duration-300">
          <span>{t('Discover & Register', 'Découvrir & S\'inscrire')}</span>
          <span className="text-lg">→</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const EventsPage: React.FC<EventsPageProps> = ({ onNavigate, language }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const nextEvent = SALON_EVENTS.find(e => e.isNext);
  const otherEvents = SALON_EVENTS.filter(e => !e.isNext);

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeIn custom-scrollbar font-sans selection:bg-[#d4af37] selection:text-black">

      {/* Background textures */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paisley.png')]"></div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-[#050505]/95 to-transparent backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('INN')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[#d4af37]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <span className="font-cinzel font-bold text-lg tracking-widest hidden md:block text-[#d4af37]">Maison Favier</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-24 max-w-6xl mx-auto px-6">

        {/* Page Title */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="border-y border-[#d4af37]/40 py-2 px-8 bg-black/30 backdrop-blur-sm">
              <span className="text-xs font-bold uppercase tracking-[0.5em] text-[#d4af37] font-cinzel">
                {t('Salon des Inconnus', 'Salon des Inconnus')}
              </span>
            </div>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl md:text-7xl text-white tracking-wide sm:tracking-widest mb-6" style={{ textShadow: '0 0 40px rgba(212,175,55,0.2)' }}>
            {t('EVENTS', 'ÉVÉNEMENTS')}
          </h1>
          <p className="font-lato text-neutral-400 text-lg max-w-2xl mx-auto leading-relaxed">
            {t(
              'Communal gatherings, shows, and woofing weekends. Be part of the living history of the place.',
              'Rassemblements communautaires, spectacles et weekends de woofing. Participez à l\'histoire vivante du lieu.',
            )}
          </p>
          <div className="mt-8 w-24 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mx-auto"></div>
        </div>

        {/* Next Event — Hero Card */}
        {nextEvent && (
          <section className="mb-16">
            <NextEventCard event={nextEvent} language={language} onNavigate={onNavigate} />
          </section>
        )}

        {/* More events (placeholder for future) */}
        {otherEvents.length > 0 && (
          <section>
            <h3 className="font-cinzel text-xl text-neutral-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
              {t('More Events', 'Plus d\'Événements')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherEvents.map(ev => (
                <div key={ev.id} className="p-6 border border-white/10 hover:border-[#d4af37]/40 transition-colors cursor-pointer" onClick={() => onNavigate(ev.navigateTo)}>
                  <div className="text-[#d4af37] text-xs font-cinzel uppercase tracking-widest mb-2">
                    {formatDateRange(ev.startDate, ev.endDate, language)}
                  </div>
                  <h3 className="font-cinzel text-xl text-white">{language === 'FR' ? ev.name_fr : ev.name}</h3>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Coming up callout */}
        <div className="mt-24 text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 border border-white/10 bg-white/2">
            <span className="text-2xl">🪕</span>
            <p className="font-lato text-neutral-500 text-sm">
              {t('More events to come, stay tuned.', 'D\'autres événements à venir, restez à l\'écoute.')}
            </p>
          </div>
        </div>

      </main>

      <SeoBlock viewKey="EVENTS" language={language} onNavigate={onNavigate} />

      <footer className="text-center pb-12 text-neutral-700 text-xs font-cinzel uppercase tracking-widest">
        © 2026 Le Salon des Inconnus
      </footer>

      <style>{`
        .animate-fadeIn { animation: fadeInEvPage 0.8s ease-out forwards; }
        @keyframes fadeInEvPage { from { opacity: 0; } to { opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4af37; }
      `}</style>
    </div>
  );
};
