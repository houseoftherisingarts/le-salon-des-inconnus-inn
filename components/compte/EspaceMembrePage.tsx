import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../AuthModal';
import { AuthModal } from '../AuthModal';
import { SiteFooter } from '../SiteFooter';
import { Banniere } from './Banniere';
import { OngletsMembre } from './OngletsMembre';
import { RailMembre } from './RailMembre';
import { OngletProfil } from './onglets/OngletProfil';
const OngletCommunaute = React.lazy(() => import('./onglets/OngletCommunaute').then(m => ({ default: m.OngletCommunaute })));
const OngletArtistique = React.lazy(() => import('./onglets/OngletArtistique').then(m => ({ default: m.OngletArtistique })));
const OngletBillets = React.lazy(() => import('./onglets/OngletBillets').then(m => ({ default: m.OngletBillets })));
const OngletSejours = React.lazy(() => import('./onglets/OngletSejours').then(m => ({ default: m.OngletSejours })));
// Import lazy des autres onglets (ajoutés au fil des lots)

interface EspaceMembrePageProps {
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onNavigate: (view: string) => void;
  // Permet à l'admin de voir l'espace d'un autre membre (Lot 7)
  vueAdmin?: { uid: string };
}

const EspaceMembrePage: React.FC<EspaceMembrePageProps> = ({
  language,
  user,
  memberProfile,
  onUserChange,
  onNavigate,
  vueAdmin
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [showAuth, setShowAuth] = useState(false);

  // Parse query string for current tab
  const getOnglet = () => {
    if (typeof window === 'undefined') return 'profil';
    const params = new URLSearchParams(window.location.search);
    const o = params.get('onglet');
    return o || 'profil';
  };

  const [actif, setActif] = useState(getOnglet());

  useEffect(() => {
    const handlePopState = () => setActif(getOnglet());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleChangeOnglet = (id: string) => {
    setActif(id);
    const url = `/compte?onglet=${id}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState({ view: 'COMPTE' }, '', url);
    }
  };

  const handleNaviguer = (onglet: string) => {
    handleChangeOnglet(onglet);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Porte non connectée
  if (!user || !memberProfile) {
    return (
      <div className="relative min-h-[100svh] w-full bg-[#050505] flex flex-col items-start justify-center px-6 md:px-12 lg:px-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="/media/inn/golden drone copy.jpg" 
            alt="" 
            className="w-full h-full object-cover" 
          />
          <div 
            className="absolute inset-0" 
            style={{ background: 'linear-gradient(90deg, rgba(10,8,8,.92) 0%, rgba(10,8,8,.7) 45%, rgba(10,8,8,.2) 100%)' }} 
          />
        </div>
        
        <div className="relative z-10 max-w-xl pt-20">
          <span className="font-cinzel text-[#c5a059] text-[12px] uppercase tracking-[0.35em] block mb-4 flex items-center gap-2">
            <div className="h-px w-10 bg-[#c5a059]" />
            {t('Members\' space', 'Espace membre')}
          </span>
          <h1 className="font-prata text-[#f3e5ab] text-[clamp(2rem,4vw,3.5rem)] leading-[1.05] mb-6">
            {t('Your space at the Salon', 'Votre espace au Salon')}
          </h1>
          <p className="font-lato text-neutral-300 text-lg leading-relaxed mb-10">
            {t(
              'Your bookings and tickets are waiting for you here, together with the people you met at the Salon and a direct line to the team whenever you need us.',
              'Vos réservations et vos billets vous attendent ici, avec les gens rencontrés au Salon et une ligne directe vers l\'équipe quand vous avez besoin de nous.'
            )}
          </p>
          <div className="space-y-6">
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-8 py-4 hover:bg-[#d4b06a] transition-colors"
            >
              {t('Sign in', 'Se connecter')}
            </button>
            <p className="font-josefin text-neutral-400 text-sm max-w-md">
              {t(
                'Your account takes a minute to create, right here, with Google or with your email.',
                'Le compte se crée en une minute, au même endroit, avec Google ou avec votre courriel.'
              )}
            </p>
          </div>
        </div>

        {showAuth && (
          <AuthModal
            language={language}
            onClose={() => setShowAuth(false)}
            onAuthSuccess={(u, p) => {
              onUserChange(u, p);
              setShowAuth(false);
            }}
            onNavigate={onNavigate}
            onShowPrivacy={() => {}}
          />
        )}
      </div>
    );
  }

  // Si on est en vueAdmin, on masque l'édition
  const isReadOnly = !!vueAdmin;

  return (
    <div className="relative min-h-[100svh] w-full bg-[#0a0808]">
      {/* 2. Bannière */}
      <Banniere 
        uid={user.uid} 
        profile={memberProfile} 
        language={language} 
        onProfileUpdate={(p) => onUserChange(user, p)} 
        readOnly={isReadOnly}
      />

      {/* 3. Bandeau d'identité */}
      <div className="px-4 sm:px-6 md:px-12 lg:px-20 pb-4 relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-5">
          <div className="relative w-28 h-28 lg:w-36 lg:h-36 -mb-14 lg:-mb-[72px] rounded-full ring-4 ring-[#0a0808] border border-[#c5a059]/60 bg-[#0a0808] overflow-hidden shrink-0 group">
            {memberProfile.photoURL || user.photoURL ? (
              <img src={memberProfile.photoURL || user.photoURL || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#c5a059]/10">
                <span className="font-cinzel text-2xl text-[#c5a059]">{memberProfile.displayName?.[0] || '?'}</span>
              </div>
            )}
            
            {/* Voile de survol pour changer l'avatar */}
            {!isReadOnly && (
              <button 
                className="absolute inset-0 bg-[#0a0808]/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('Change my photo', 'Changer ma photo')}
                onClick={() => { /* TODO changer avatar */ }}
              >
                <span className="font-cinzel text-[10px] text-[#f3e5ab] uppercase tracking-widest">{t('Change', 'Changer')}</span>
              </button>
            )}
          </div>
          
          <div className="pb-1">
            <h1 className="font-prata text-[#f3e5ab] text-[clamp(1.9rem,3.2vw,3rem)] leading-none truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
              {memberProfile.displayName || t('Member', 'Membre')}
            </h1>
            <p className="font-lato text-neutral-300 text-sm mt-1">
              {t('Member', 'Membre')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-1">
          {memberProfile.isAdmin && (
            <span className="px-3 py-1 bg-[#c5a059]/10 text-[#c5a059] font-cinzel text-[13px] uppercase tracking-widest rounded-full border border-[#c5a059]/30">
              {t('Admin space', 'Espace admin')}
            </span>
          )}
          <button
            onClick={() => { /* handleSignOut */ }}
            className="px-3 py-1 bg-[#0a0808]/50 text-neutral-400 font-cinzel text-[13px] uppercase tracking-widest rounded-full border border-white/10 hover:bg-white/5 hover:text-neutral-200 transition-colors"
          >
            {t('Sign out', 'Déconnexion')}
          </button>
        </div>
      </div>

      <div className="h-10 lg:h-16" /> {/* Espace sous l'avatar */}

      {/* 4. Rangée d'onglets */}
      <OngletsMembre actif={actif} onChange={handleChangeOnglet} language={language} />

      {/* 5. Grille */}
      <div className="grid gap-8 px-4 sm:px-6 md:px-12 lg:px-20 pt-10 pb-24 xl:grid-cols-[minmax(0,1fr)_340px]">
        
        {/* Colonne Contenu (Onglet actif) */}
        <div className="min-w-0">
          <React.Suspense fallback={<div className="py-10 text-center text-neutral-500 text-sm">Chargement...</div>}>
            {actif === 'profil' && (
              <OngletProfil 
                user={user} 
                memberProfile={memberProfile} 
                language={language} 
                onProfileUpdate={(p) => onUserChange(user, p)} 
              />
            )}
            {actif === 'communaute' && (
              <OngletCommunaute
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
              />
            )}
            {actif === 'artistique' && (
              <OngletArtistique
                user={user}
                language={language}
                onNavigate={onNavigate}
              />
            )}
            {actif === 'sejours' && (
              <OngletSejours
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
              />
            )}
            {actif === 'billets' && (
              <OngletBillets
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
              />
            )}
            {actif !== 'profil' && actif !== 'sejours' && actif !== 'communaute' && actif !== 'artistique' && actif !== 'billets' && (
              <div className="text-neutral-500 font-lato italic py-10">Onglet en construction...</div>
            )}
          </React.Suspense>
        </div>

        {/* Colonne Rail */}
        <div className="xl:block">
          <RailMembre language={language} onNavigate={handleNaviguer} />
        </div>
        
      </div>

      {/* 6. Pied de page */}
      <SiteFooter language={language} />
    </div>
  );
};

export default EspaceMembrePage;
