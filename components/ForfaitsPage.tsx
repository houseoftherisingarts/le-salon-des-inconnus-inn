import React from 'react';
import { motion } from 'framer-motion';
import { getOptimizedUrl } from '../utils/imageOptimizer';
import { ProposalRequestForm } from './ProposalRequestForm';

// Unlisted page at /forfaits — B2C packages for inn guests. Same warm-dark
// aesthetic as /entreprises and /invitation. First package: "Nuit & Table"
// (room + 3-course dinner on arrival + breakfast), sold as a Hostaway add-on.

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const HERO_IMG = getOptimizedUrl('/media/Cuisine/alexis%20chef.jpg', 1920);

const INCLUDED = [
  {
    titleFr: 'Un souper trois services',
    titleEn: 'A three-course dinner',
    bodyFr: "Préparé sur place le soir de votre arrivée par le chef Marc Alexis Pepin. Vous vous installez, vous êtes reçus.",
    bodyEn: 'Prepared on site the evening you arrive by chef Marc Alexis Pepin. You settle in, you are received.',
  },
  {
    titleFr: 'Le déjeuner au réveil',
    titleEn: 'Breakfast when you wake',
    bodyFr: 'Servi le lendemain matin, sans avoir à ressortir. La journée commence en douceur.',
    bodyEn: 'Served the next morning, without ever going out. The day starts gently.',
  },
  {
    titleFr: 'La chambre de votre choix',
    titleEn: 'The room of your choice',
    bodyFr: "N'importe laquelle de nos chambres devient une table d'hôte. Vous choisissez le lieu, nous ajoutons la table.",
    bodyEn: 'Any of our rooms becomes a table d\'hôte. You choose the place, we add the table.',
  },
];

export const ForfaitsPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0a0808' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div
          className="absolute inset-0 will-change-transform"
          style={{ background: 'radial-gradient(48% 38% at 50% 18%, rgba(201,168,90,0.10), transparent 72%)', animation: 'forfaitsDrift 48s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>
      <style>{`
        @keyframes forfaitsDrift {
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
            ← {t('The Inn', "L'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">
            {t('PACKAGES', 'FORFAITS')}
          </span>
        </div>
      </header>

      <main className="pt-28 md:pt-36 pb-24">
        {/* Hero */}
        <section className="relative px-6 md:px-12 lg:px-20 pb-14 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-30" aria-hidden>
            <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,8,8,0.35) 0%, rgba(10,8,8,0.92) 85%)' }} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <span className="h-px w-12 bg-[#c5a059]" />
              <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                {t('Nuit & Table', 'Nuit & Table')}
              </span>
            </div>
            <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5.5rem)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
              {t('Your room, and the chef’s table', 'Votre chambre, et la table d’hôte')}
            </h1>
            <p className="font-cormorant italic mt-8 text-white/80" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.6rem)', lineHeight: 1.5, maxWidth: '58ch' }}>
              {t(
                'Add a three-course dinner the evening you arrive and breakfast the next morning. The inn becomes your table, without ever going out.',
                "Ajoutez un souper trois services le soir de votre arrivée et le déjeuner au réveil. L'auberge devient votre table, sans avoir à ressortir.",
              )}
            </p>
          </motion.div>
        </section>

        {/* Included */}
        <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20 border-y border-[#c5a059]/15">
          <span className="font-cinzel uppercase text-white/40 block mb-10" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
            {t('What the package adds', 'Ce que le forfait ajoute')}
          </span>
          <div className="grid gap-10 md:gap-14 md:grid-cols-3">
            {INCLUDED.map((o, i) => (
              <motion.article
                key={o.titleEn}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: Math.min(i, 3) * 0.06 }}
              >
                <h3 className="font-prata text-[#f3e5ab] text-xl md:text-2xl">
                  {fr ? o.titleFr : o.titleEn}
                </h3>
                <p className="font-cormorant mt-3 text-white/70" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)', lineHeight: 1.55 }}>
                  {fr ? o.bodyFr : o.bodyEn}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Price + book */}
        <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20">
          <div className="max-w-xl">
            <span className="font-cinzel uppercase text-[#c5a059] block mb-4" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
              {t('The package', 'Le forfait')}
            </span>
            <h2 className="font-prata text-[#f3e5ab] mb-3" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1.1 }}>
              {t('+ $85 per person', '+ 85 $ par personne')}
            </h2>
            <p className="font-cormorant text-white/70 mb-10" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)', lineHeight: 1.55 }}>
              {t(
                'Added to your room rate: three-course dinner and breakfast. Choose it when you book your stay.',
                "En sus du tarif de votre chambre : souper trois services et déjeuner. Choisissez-le au moment de réserver votre séjour.",
              )}
            </p>
            <button
              onClick={() => onNavigate('INN')}
              className="inline-block px-10 py-4 border border-[#c5a059]/50 text-[#f3e5ab] font-cinzel text-sm uppercase tracking-[0.35em] hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-colors"
            >
              {t('Book a room', 'Réserver une chambre')}
            </button>
          </div>
        </section>

        {/* Questions */}
        <section className="px-6 md:px-12 lg:px-20 pb-6">
          <span className="font-cinzel uppercase text-[#c5a059] block mb-4" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
            {t('A special request?', 'Une demande particulière ?')}
          </span>
          <p className="font-cormorant text-white/70 mb-8" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)', lineHeight: 1.55, maxWidth: '52ch' }}>
            {t(
              'Dietary needs, a celebration, a larger group? Write to us and we shape it with you.',
              "Un régime particulier, une célébration, un plus grand groupe ? Écrivez-nous et nous le préparons avec vous.",
            )}
          </p>
          <ProposalRequestForm language={language} subject={t('Nuit & Table package', 'Forfait Nuit & Table')} showCompany={false} />
        </section>
      </main>
    </div>
  );
};
