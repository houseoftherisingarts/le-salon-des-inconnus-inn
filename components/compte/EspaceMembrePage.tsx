import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../AuthModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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
const OngletVivreIci = React.lazy(() => import('./onglets/OngletVivreIci').then(m => ({ default: m.OngletVivreIci })));
const OngletParrainage = React.lazy(() => import('./onglets/OngletParrainage').then(m => ({ default: m.OngletParrainage })));
const OngletPreferences = React.lazy(() => import('./onglets/OngletPreferences').then(m => ({ default: m.OngletPreferences })));
const OngletAide = React.lazy(() => import('./onglets/OngletAide').then(m => ({ default: m.OngletAide })));
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
  const [profilCible, setProfilCible] = useState<MemberProfile | null>(null);

  // Vue admin : on charge la fiche du membre ciblé pour l'afficher à sa place.
  useEffect(() => {
    if (!vueAdmin || !db) return;
    let actif = true;
    getDoc(doc(db, 'members', vueAdmin.uid))
      .then((snap) => {
        if (actif && snap.exists()) setProfilCible({ ...(snap.data() as MemberProfile), isAdmin: false });
      })
      .catch(() => {});
    return () => { actif = false; };
  }, [vueAdmin?.uid]);

  const isReadOnly = !!vueAdmin;
  const uidAffiche = vueAdmin?.uid ?? (user ? user.uid : '');
  const profilAffiche = vueAdmin ? (profilCible ?? memberProfile) : memberProfile;

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
      <div className="relative min-h-[100svh] w-full bg-[#010a13] flex flex-col items-start justify-center px-6 md:px-12 lg:px-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="/media/inn/golden drone copy.jpg" 
            alt="" 
            className="w-full h-full object-cover" 
          />
          <div 
            className="absolute inset-0" 
            style={{ background: 'linear-gradient(90deg, rgba(1,10,19,.92) 0%, rgba(1,10,19,.7) 45%, rgba(1,10,19,.2) 100%)' }} 
          />
          <div 
            className="absolute inset-0" 
            style={{ background: 'radial-gradient(circle at 18% 55%, rgba(200,170,110,0.16), transparent 55%)' }} 
          />
        </div>
        
        <div className="relative z-10 max-w-xl pt-20">
          <span className="font-cinzel text-[#c8aa6e] text-[12px] uppercase tracking-[0.35em] block mb-4 flex items-center gap-2">
            <div className="h-px w-10 bg-[#c8aa6e]" />
            {t('Members\' space', 'Espace membre')}
          </span>
          <h1 className="font-prata text-[#f0e6d2] text-[clamp(2rem,4vw,3.5rem)] leading-[1.05] mb-6">
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
              className="rounded-full bg-[#c8aa6e] text-[#010a13] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-8 py-4 hover:bg-[#d8bd85] transition-colors"
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

  return (
    <div className="relative min-h-[100svh] w-full bg-[#010a13]">
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]" 
        style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(200,170,110,0.07), transparent 75%)' }} 
      />
      {/* 2. Bannière */}
      <Banniere 
        uid={uidAffiche} 
        profile={profilAffiche ?? memberProfile} 
        language={language} 
        onProfileUpdate={(p) => onUserChange(user, p)} 
        readOnly={isReadOnly}
      />

      {/* 3. Bandeau d'identité */}
      <div className="px-4 sm:px-6 md:px-12 lg:px-20 pb-4 relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-5">
          <div className="relative w-28 h-28 lg:w-36 lg:h-36 -mb-14 lg:-mb-[72px] rounded-full ring-4 ring-[#010a13] border border-[#c8aa6e]/60 bg-[#010a13] overflow-hidden shrink-0 group">
            {profilAffiche?.photoURL || user.photoURL ? (
              <img src={profilAffiche?.photoURL || user.photoURL || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#c8aa6e]/10">
                <span className="font-cinzel text-2xl text-[#c8aa6e]">{profilAffiche?.displayName?.[0] || '?'}</span>
              </div>
            )}
            
            {/* Voile de survol pour changer l'avatar */}
            {!isReadOnly && (
              <button 
                className="absolute inset-0 bg-[#010a13]/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('Change my photo', 'Changer ma photo')}
                onClick={() => { /* TODO changer avatar */ }}
              >
                <span className="font-cinzel text-[10px] text-[#f0e6d2] uppercase tracking-widest">{t('Change', 'Changer')}</span>
              </button>
            )}
          </div>
          
          <div className="pb-1">
            <h1 className="font-prata text-[#f0e6d2] text-[clamp(1.9rem,3.2vw,3rem)] leading-none truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
              {profilAffiche?.displayName || t('Member', 'Membre')}
            </h1>
            <p className="font-lato text-neutral-300 text-sm mt-1">
              {isReadOnly ? t('Read only', 'Lecture seule') : t('Member', 'Membre')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-1">
          {profilAffiche?.isAdmin && (
            <span className="px-3 py-1 bg-[#c8aa6e]/10 text-[#c8aa6e] font-cinzel text-[13px] uppercase tracking-widest rounded-full border border-[#c8aa6e]/30">
              {t('Admin space', 'Espace admin')}
            </span>
          )}
          {!isReadOnly && (
            <button
              onClick={() => { /* handleSignOut */ }}
              className="px-3 py-1 bg-[#010a13]/50 text-neutral-400 font-cinzel text-[13px] uppercase tracking-widest rounded-full border border-white/10 hover:bg-white/5 hover:text-neutral-200 transition-colors"
            >
              {t('Sign out', 'Déconnexion')}
            </button>
          )}
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
                memberProfile={profilAffiche ?? memberProfile} 
                language={language} 
                onProfileUpdate={(p) => onUserChange(user, p)} 
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'communaute' && (
              <OngletCommunaute
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'artistique' && (
              <OngletArtistique
                user={user}
                language={language}
                onNavigate={onNavigate}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'sejours' && (
              <OngletSejours
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'billets' && (
              <OngletBillets
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'vivre-ici' && (
              <OngletVivreIci
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'parrainage' && (
              <OngletParrainage
                user={user}
                memberProfile={memberProfile}
                language={language}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'preferences' && (
              <OngletPreferences
                user={user}
                memberProfile={memberProfile}
                language={language}
                onNavigate={onNavigate}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif === 'aide' && (
              <OngletAide
                user={user}
                memberProfile={memberProfile}
                language={language}
                readOnly={isReadOnly}
                uidCible={vueAdmin?.uid}
              />
            )}
            {actif !== 'profil' && actif !== 'sejours' && actif !== 'communaute' && actif !== 'artistique' && actif !== 'billets' && actif !== 'vivre-ici' && actif !== 'parrainage' && actif !== 'preferences' && actif !== 'aide' && (
              <div className="text-neutral-500 font-lato italic py-10">Onglet en construction...</div>
            )}
          </React.Suspense>
        </div>

        {/* Colonne Rail */}
        {!isReadOnly && (
          <div className="xl:block">
            <RailMembre language={language} onNavigate={handleNaviguer} uid={user.uid} />
          </div>
        )}
        
      </div>

      {/* 6. Pied de page */}
      <SiteFooter language={language} />
    </div>
  );
};

export default EspaceMembrePage;
