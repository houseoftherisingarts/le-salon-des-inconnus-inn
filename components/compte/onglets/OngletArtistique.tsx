import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { lireEtatCreatorStudio, type CreatorStudioState } from '../donnees/creatorStudio';

interface OngletArtistiqueProps {
  user: User;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  readOnly?: boolean;
  uidCible?: string;
}

export const OngletArtistique: React.FC<OngletArtistiqueProps> = ({ user, language, onNavigate, uidCible }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const uid = uidCible ?? user.uid;
  const [etat, setEtat] = useState<CreatorStudioState | null>(null);

  useEffect(() => {
    lireEtatCreatorStudio(uid).then(setEtat);
  }, [uid]);

  if (!etat) {
    return (
      <div className="flex items-center gap-3 text-neutral-500 text-sm py-10 px-4">
        <div className="w-4 h-4 border-2 border-neutral-700 border-t-[#c5a059] rounded-full animate-spin" />
        {t('Loading…', 'Chargement…')}
      </div>
    );
  }

  // Fusion de la phrase d'état (RÈGLE -6)
  let phraseEtatFR = "";
  let phraseEtatEN = "";
  
  if (etat.hasProfile) {
    if (etat.isCompleted) {
      phraseEtatFR = "Votre profil d'artiste est complété";
      phraseEtatEN = "Your artist profile is complete";
      
      const suiteFR = [];
      const suiteEN = [];
      
      if (etat.isCuratedArtist) {
        suiteFR.push("l'équipe a confirmé votre statut d'artiste du Salon");
        suiteEN.push("the team has confirmed your status as a Salon artist");
      }
      if (etat.hasProProfile && etat.slug) {
        suiteFR.push(`votre Profil Pro est en ligne à l'adresse lesalondesinconnus.com/${etat.slug}`);
        suiteEN.push(`your Pro Profile is live at lesalondesinconnus.com/${etat.slug}`);
      }
      
      if (suiteFR.length === 1) {
        phraseEtatFR += ` et ${suiteFR[0]}.`;
        phraseEtatEN += ` and ${suiteEN[0]}.`;
      } else if (suiteFR.length === 2) {
        phraseEtatFR += `, ${suiteFR[0]} et ${suiteFR[1]}.`;
        phraseEtatEN += `, ${suiteEN[0]} and ${suiteEN[1]}.`;
      } else {
        phraseEtatFR += ".";
        phraseEtatEN += ".";
      }
    } else {
      phraseEtatFR = "Votre profil d'artiste est commencé.";
      phraseEtatEN = "Your artist profile is started.";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      
      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40 overflow-hidden relative">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.1fr_1fr] gap-8 relative z-10">
          <div>
            <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
              <div className="h-px w-10 bg-[#c5a059]" />
              {t('Arts centre & community', 'Centre d\'arts et communauté')}
            </h3>
            
            {!etat.hasProfile ? (
              <>
                <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-6">
                  {t('Join the artistic community', 'Devenir membre de la communauté artistique')}
                </h2>
                <p className="font-lato text-neutral-200 mb-8 max-w-lg">
                  {t(
                    'Beyond the rooms, Maison Favier houses an artists\' centre where artists in residence cross paths with musicians and entrepreneurs. Artists find the Creator Studio there, a workspace to build their profile and publish their writing.',
                    'Au-delà des chambres, la Maison Favier abrite un centre d\'artistes où se croisent des artistes en résidence, des musiciens et des entrepreneurs. Les artistes y trouvent le Creator Studio, un espace de travail pour bâtir leur profil et publier leurs écrits.'
                  )}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={() => onNavigate('CREATOR_STUDIO')}
                    className="w-full sm:w-auto rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-8 min-h-[48px] hover:bg-[#d4b06a] transition-colors"
                  >
                    {t('Enter the Creator Studio', 'Entrer au Creator Studio')}
                  </button>
                  <button
                    onClick={() => onNavigate('CENTRE_ARTS')}
                    className="w-full sm:w-auto rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[12px] tracking-[0.18em] px-8 min-h-[48px] hover:bg-white/5 transition-colors"
                  >
                    {t('Discover the arts centre', 'Découvrir le centre d\'arts')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-6">
                  {t('Your workshop in the Creator Studio', 'Votre atelier au Creator Studio')}
                </h2>
                <p className="font-lato text-neutral-200 mb-8 max-w-lg leading-relaxed">
                  {language === 'FR' ? phraseEtatFR : phraseEtatEN}
                </p>
                <button
                  onClick={() => onNavigate('CREATOR_STUDIO')}
                  className="w-full sm:w-auto rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-8 min-h-[48px] hover:bg-[#d4b06a] transition-colors"
                >
                  {t('Back to the workshop', 'Retourner à l\'atelier')}
                </button>
              </>
            )}
          </div>
          
          <div className="-mx-5 -mb-5 sm:-mx-7 sm:-mb-7 lg:m-0 h-48 sm:h-64 lg:h-auto order-first lg:order-last">
            <img 
              src="/media/centre-arts/tournage-manoir-960.webp" 
              srcSet="/media/centre-arts/tournage-manoir-960.webp 960w, /media/centre-arts/tournage-manoir-1600.webp 1600w, /media/centre-arts/tournage-manoir-2400.webp 2400w"
              sizes="(max-width: 1024px) 100vw, 50vw"
              alt="" 
              className="w-full h-full object-cover rounded-t-[15px] lg:rounded-tr-[15px] lg:rounded-br-[15px] lg:rounded-l-none" 
            />
          </div>
        </div>
      </div>

    </div>
  );
};
