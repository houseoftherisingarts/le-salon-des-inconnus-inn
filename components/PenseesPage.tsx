import React from 'react';
import { motion } from 'framer-motion';
import { PENSEES } from '../data/pensees';

// Dedicated journal page at /pensees. One paragraph a day, published each
// morning by the pensee-du-jour job. Editorial, contemplative, no clutter:
// same warm-dark atmosphere and typography as the rest of the site.
interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDate = (iso: string, fr: boolean): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const day = d;
  const month = fr ? MONTHS_FR[m - 1] : MONTHS_EN[m - 1];
  return fr ? `${day} ${month} ${y}` : `${month} ${day}, ${y}`;
};

export const PenseesPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);
  const [latest, ...rest] = PENSEES;

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0a0808' }}>
      {/* atmosphere: warm near-black + soft drifting fog + grain, same recipe as the rest of the site */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div
          className="absolute inset-0 will-change-transform"
          style={{ background: 'radial-gradient(48% 38% at 50% 18%, rgba(201,168,90,0.10), transparent 72%)', animation: 'penseesDrift 48s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>
      <style>{`
        @keyframes penseesDrift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,2%,0) scale(1.05); }
        }
      `}</style>

      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#0a0808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('INN')}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {t('Back to the Inn', "Retour à l'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">
            {t('THOUGHTS', 'PENSÉES')}
          </span>
        </div>
      </header>

      <main className="pt-28 md:pt-36 pb-24">
        {/* Eyebrow, full-width editorial */}
        <section className="px-6 md:px-12 lg:px-20 pb-8 md:pb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-12 bg-[#c5a059]" />
            <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
              {t('The daily journal', 'Le journal quotidien')}
            </span>
          </div>
          <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5.5rem)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
            {t('Thoughts of the day', 'Pensée du jour')}
          </h1>
          <p className="font-cormorant italic mt-6 text-[#c5a059]" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)', lineHeight: 1.3, maxWidth: '42ch' }}>
            {t('A short paragraph, written most mornings, on hospitality, art and the life of the house.', "Un court paragraphe, écrit la plupart des matins, sur l'hospitalité, l'art et la vie de la maison.")}
          </p>
        </section>

        {latest && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="px-6 md:px-12 lg:px-20 py-10 md:py-14 border-y border-[#c5a059]/15"
          >
            <div className="max-w-4xl">
              <time className="font-cinzel text-[#c5a059] uppercase" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
                {formatDate(latest.date, fr)}
              </time>
              <h2 className="font-prata text-[#f3e5ab] mt-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.1 }}>
                {fr ? latest.title_fr : latest.title_en}
              </h2>
              <p className="font-cormorant mt-6 text-white/80" style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.4rem)', lineHeight: 1.6 }}>
                {fr ? latest.body_fr : latest.body_en}
              </p>
            </div>
          </motion.section>
        )}

        {rest.length > 0 && (
          <section className="px-6 md:px-12 lg:px-20 pt-14 md:pt-20">
            <span className="font-cinzel uppercase text-white/40 block mb-8" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
              {t('Earlier', 'Précédemment')}
            </span>
            <div className="grid gap-8 md:gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <motion.article
                  key={p.date}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: Math.min(i, 4) * 0.05 }}
                  className="border-t border-[#c5a059]/12 pt-5"
                >
                  <time className="font-cinzel text-[#c5a059]/80 uppercase" style={{ fontSize: '10px', letterSpacing: '0.25em' }}>
                    {formatDate(p.date, fr)}
                  </time>
                  <h3 className="font-prata text-white/85 mt-2 text-lg md:text-xl">
                    {fr ? p.title_fr : p.title_en}
                  </h3>
                  <p className="font-cormorant mt-3 text-white/55 text-sm md:text-base leading-relaxed">
                    {fr ? p.body_fr : p.body_en}
                  </p>
                </motion.article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
