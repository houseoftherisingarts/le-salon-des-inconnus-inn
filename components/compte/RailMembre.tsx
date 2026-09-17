import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

interface RailMembreProps {
  language: 'EN' | 'FR';
  onNavigate: (onglet: string) => void;
  uid: string;
}

export const RailMembre: React.FC<RailMembreProps> = ({ language, onNavigate, uid }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [nb, setNb] = useState(0);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, 'parrainagesCompte', uid), (snap) => {
      const n = Number(snap.data()?.n ?? 0);
      setNb(Number.isFinite(n) ? n : 0);
    });
  }, [uid]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[15px] border border-[#c8aa6e]/25 bg-[#091428]/60 p-5 sm:p-7 transition-colors duration-200 hover:border-[#c8aa6e]/55">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c8aa6e] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('Arts centre & community', 'Centre d\'arts et communauté')}
        </h3>
        <p className="font-lato text-neutral-200 mb-6">
          {t('Discover the artists\' centre and Creator Studio.', 'Découvrez le centre d\'artistes et le Creator Studio.')}
        </p>
        <button
          onClick={() => onNavigate('artistique')}
          className="rounded-full border border-[#c8aa6e]/55 bg-[#010a13]/55 text-[#f0e6d2] text-[11px] font-cinzel uppercase tracking-widest px-6 py-2 hover:bg-white/5 transition-colors w-full"
        >
          {t('See the community', 'Voir la communauté')}
        </button>
      </div>

      <div className="rounded-[15px] border border-[#c8aa6e]/25 bg-[#091428]/60 p-5 sm:p-7 transition-colors duration-200 hover:border-[#c8aa6e]/55">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c8aa6e] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('Invite someone', 'Invitez quelqu\'un')}
        </h3>
        <p className="font-lato text-neutral-300 text-sm mb-5">
          {nb > 0
            ? t(`${nb} guest${nb > 1 ? 's' : ''}`, `${nb} invité${nb > 1 ? 's' : ''}`)
            : t('Your link works right now.', 'Votre lien fonctionne dès maintenant.')}
        </p>
        <button
          onClick={() => onNavigate('parrainage')}
          className="rounded-full bg-[#c8aa6e] text-[#010a13] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 py-3 hover:bg-[#d8bd85] transition-colors w-full"
        >
          {t('Invite someone', 'Invitez quelqu\'un')}
        </button>
      </div>

      <div className="rounded-[15px] border border-[#c8aa6e]/25 bg-[#091428]/60 p-5 sm:p-7 transition-colors duration-200 hover:border-[#c8aa6e]/55">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c8aa6e] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('A question?', 'Une question ?')}
        </h3>
        <button
          onClick={() => onNavigate('aide')}
          className="rounded-full border border-[#c8aa6e]/55 bg-transparent text-[#f0e6d2] text-[11px] font-cinzel uppercase tracking-widest px-6 py-3 hover:bg-[#c8aa6e]/10 transition-colors w-full"
        >
          {t('Write to the team', 'Écrire à l\'équipe')}
        </button>
      </div>
    </div>
  );
};
