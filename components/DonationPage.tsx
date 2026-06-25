import React, { useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { AuthModal, type MemberProfile } from './AuthModal';
import { ContributionPanel } from './ContributionPanel';

// Dedicated donation page at /don. Reuses the Square ContributionPanel,
// reframed for a gift to the mission (not the Ceilidh). Editorial, left-aligned.
interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
}

const HERO_IMG = 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg';

export const DonationPage: React.FC<Props> = ({
  onNavigate, language, user, onUserChange, onShowPrivacy,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [showAuth, setShowAuth] = useState(false);

  const handleAuthSuccess = useCallback((u: User, p: MemberProfile) => {
    onUserChange(u, p);
    setShowAuth(false);
  }, [onUserChange]);

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeInDon">
      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('INN')}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {t('Back to the Inn', "Retour à l'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">DON</span>
        </div>
      </header>

      <main className="pt-16">
        {/* Editorial hero, asymmetric (no centered dead space) */}
        <section className="px-6 md:px-12 lg:px-20 pt-20 md:pt-28 pb-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-end">
            <div>
              <div className="flex items-center gap-4 mb-7">
                <span className="h-px w-12 bg-[#c5a059]" />
                <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                  {t('Support the mission', 'Soutenir la mission')}
                </span>
              </div>
              <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
                {t('Make a gift', 'Faire un don')}
              </h1>
              <p className="font-cormorant italic mt-6 text-[#c5a059]" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.7rem)', lineHeight: 1.3, maxWidth: '28ch' }}>
                {t('Help keep the door open.', 'Aide à garder la porte ouverte.')}
              </p>
            </div>
            <figure className="relative overflow-hidden rounded-[15px]" style={{ aspectRatio: '4 / 3', boxShadow: '0 50px 120px -60px rgba(0,0,0,0.9)' }}>
              <img src={HERO_IMG} alt={t('The manor and grounds at golden hour.', "Le manoir et son terrain à l'heure dorée.")} className="w-full h-full object-cover" />
              <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(5,5,5,0.6))' }} />
              <span className="absolute inset-0 pointer-events-none rounded-[15px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(197,160,89,0.22)' }} />
            </figure>
          </div>
        </section>

        {/* Photo band — the community a gift keeps alive */}
        <figure className="relative w-full overflow-hidden" style={{ height: 'clamp(260px, 40vh, 480px)' }}>
          <img
            src="/wwoof/bw-2.jpg"
            alt={t('The community at work on the land.', "La communauté au travail sur le terrain.")}
            loading="lazy"
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(1) contrast(1.04)' }}
          />
          <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(5,5,5,0.45) 0%, transparent 28%, transparent 58%, rgba(5,5,5,0.92) 100%)' }} />
          <figcaption className="absolute bottom-5 left-6 md:left-12 font-cinzel uppercase" style={{ color: '#f3e5ab', fontSize: '11px', letterSpacing: '0.3em', textShadow: '0 1px 10px rgba(0,0,0,0.75)' }}>
            {t('The community your gift keeps alive', 'La communauté que ton don fait vivre')}
          </figcaption>
        </figure>

        {/* Body + the Square panel, left-anchored */}
        <section className="px-6 md:px-12 lg:px-20 py-10 md:py-14">
          <div className="max-w-3xl space-y-6">
            <p className="font-lato" style={{ color: '#dacfb6', fontSize: '17px', lineHeight: 1.85 }}>
              {t(
                'Le Salon des Inconnus is a living place, carried by a family and a small community. Your gift helps maintain the house, feed the project, and keep the door open to artists, travellers and the people who pass through.',
                "Le Salon des Inconnus, c'est un lieu vivant, porté par une famille et une petite communauté. Ton don aide à entretenir la maison, à nourrir le projet, et à garder la porte ouverte aux artistes, aux voyageurs et aux gens de passage."
              )}
            </p>
            <p className="font-lato" style={{ color: '#9c8f76', fontSize: '15px', lineHeight: 1.8 }}>
              {t(
                'Every amount counts, one-time or recurring. Payment is handled securely.',
                "Chaque montant compte, ponctuel ou récurrent. Le paiement est traité de façon sécurisée."
              )}
            </p>
          </div>

          {/* Where the gift goes — short editorial ledger */}
          <dl className="max-w-4xl mt-12 grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'rgba(197,160,89,0.18)', border: '1px solid rgba(197,160,89,0.18)', borderRadius: '15px', overflow: 'hidden' }}>
            {[
              { k: t('The house', 'La maison'), v: t('Upkeep of the manor and the grounds.', "L'entretien du manoir et du terrain.") },
              { k: t('The project', 'Le projet'), v: t('Food, tools, and the everyday of the place.', "La nourriture, les outils, le quotidien du lieu.") },
              { k: t('The open door', 'La porte ouverte'), v: t('Welcoming artists, travellers and members.', "Accueillir artistes, voyageurs et membres.") },
            ].map((it, i) => (
              <div key={i} className="bg-[#050505] p-6">
                <dt className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '11px', letterSpacing: '0.28em' }}>{it.k}</dt>
                <dd className="font-lato mt-2.5" style={{ color: '#9c8f76', fontSize: '13px', lineHeight: 1.6 }}>{it.v}</dd>
              </div>
            ))}
          </dl>

          <div className="max-w-xl mt-12">
            <ContributionPanel
              language={language}
              user={user}
              onRequireAuth={() => setShowAuth(true)}
              title={t('Support the mission', 'Soutenir la mission')}
              blurb={t(
                'Want to support the project? You can make a gift to the mission.',
                "Envie de soutenir le projet ? Tu peux faire un don à la mission."
              )}
              successMsg={t(
                'Thank you for your gift to the mission. It matters more than you know.',
                "Merci pour ton don à la mission. Ça compte plus que tu penses."
              )}
              paymentNote="Don à la mission · Le Salon des Inconnus"
            />
          </div>
        </section>

        <footer className="px-6 md:px-12 lg:px-20 py-16 border-t border-[#c5a059]/10">
          <div className="max-w-6xl flex flex-wrap items-center gap-8">
            <button onClick={() => onNavigate('COMMUNITY')} className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#c5a059] hover:text-[#f3e5ab] transition-colors">
              {t('Join the community', 'Faire partie de la communauté')} →
            </button>
            <button onClick={() => onNavigate('WWOOFING')} className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#c5a059] hover:text-[#f3e5ab] transition-colors">
              {t('Volunteer wwoofing', 'Wwoofing bénévole')} →
            </button>
            <button onClick={() => onNavigate('INN')} className="font-cinzel text-xs uppercase tracking-[0.3em] text-neutral-500 hover:text-white transition-colors">
              {t('Back to the Inn', "Retour à l'auberge")}
            </button>
          </div>
        </footer>
      </main>

      {showAuth && (
        <AuthModal
          language={language}
          onClose={() => setShowAuth(false)}
          onAuthSuccess={handleAuthSuccess}
          onShowPrivacy={onShowPrivacy}
        />
      )}

      <style>{`
        .animate-fadeInDon { animation: fadeInDon 0.6s ease-out forwards; }
        @keyframes fadeInDon { from { opacity: 0; filter: blur(5px); } to { opacity: 1; filter: blur(0); } }
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
      `}</style>
    </div>
  );
};
