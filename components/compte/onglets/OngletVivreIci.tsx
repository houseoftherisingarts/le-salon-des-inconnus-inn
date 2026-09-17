import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';

interface OngletVivreIciProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
}

type Statut = 'pending' | 'approved' | 'declined';

const labelCommunaute: Record<Statut, { fr: string; en: string }> = {
  pending: { fr: 'Reçue', en: 'Received' },
  approved: { fr: 'Approuvée', en: 'Approved' },
  declined: { fr: 'Fermée', en: 'Closed' },
};
const labelWwoofing: Record<Statut, { fr: string; en: string }> = {
  pending: { fr: 'En attente', en: 'Pending review' },
  approved: { fr: 'Approuvée', en: 'Approved' },
  declined: { fr: 'Refusée', en: 'Declined' },
};

export const OngletVivreIci: React.FC<OngletVivreIciProps> = ({ user, language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [communaute, setCommunaute] = useState<Statut | null>(null);
  const [wwoofing, setWwoofing] = useState<Statut | null>(null);

  useEffect(() => {
    if (!db) return;
    const unsubComm = onSnapshot(doc(db, 'communityApplications', user.uid), (snap) => {
      setCommunaute(snap.exists() ? ((snap.data().status ?? 'pending') as Statut) : null);
    });
    const unsubWw = onSnapshot(doc(db, 'wwoofers', user.uid), (snap) => {
      setWwoofing(snap.exists() ? ((snap.data().status ?? 'pending') as Statut) : null);
    });
    return () => { unsubComm(); unsubWw(); };
  }, [user.uid]);

  const carte = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40';
  const surtitre = 'font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2';

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Live here', 'Vivre ici')}
        </h3>
        <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('Live and work at the Salon', 'Vivre et travailler au Salon')}
        </h2>
        <p className="font-lato text-neutral-200">
          {t(
            'Two doors lead to a longer stay: the resident member place in the community, and wwoofing for a shorter volunteer stay.',
            'Deux portes existent pour rester plus longtemps : la place de membre résident de la communauté, et le wwoofing pour un séjour bénévole plus court.'
          )}
        </p>
      </div>

      {/* Candidature communauté */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('The community place', 'La place dans la communauté')}
        </h3>
        {communaute ? (
          <p className="font-lato text-neutral-200 text-sm mb-6">
            {t(
              `Your community application: {status}`,
              `Votre candidature à la communauté : {statut}`
            )
              .replace('{status}', language === 'FR' ? labelCommunaute[communaute].fr : labelCommunaute[communaute].en)
              .replace('{statut}', language === 'FR' ? labelCommunaute[communaute].fr : labelCommunaute[communaute].en)}
          </p>
        ) : (
          <>
            <p className="font-lato text-neutral-300 text-sm mb-6">
              {t(
                'The resident member lives on site and takes part in the housekeeping in exchange for the place.',
                'Le membre résident habite sur place et participe au ménage en échange de la place.'
              )}
            </p>
            <button
              onClick={() => onNavigate('COMMUNITY')}
              className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-[#d4b06a] transition-colors"
            >
              {t('Fill in the application', 'Remplir la candidature')}
            </button>
          </>
        )}
      </div>

      {/* Candidature wwoofing */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Wwoofing', 'Wwoofing')}
        </h3>
        {wwoofing ? (
          <p className="font-lato text-neutral-200 text-sm mb-6">
            {t(
              `Your wwoofer application: {status}`,
              `Votre candidature de wwoofer : {statut}`
            )
              .replace('{status}', language === 'FR' ? labelWwoofing[wwoofing].fr : labelWwoofing[wwoofing].en)
              .replace('{statut}', language === 'FR' ? labelWwoofing[wwoofing].fr : labelWwoofing[wwoofing].en)}
          </p>
        ) : (
          <button
            onClick={() => onNavigate('WWOOFING')}
            className="font-cinzel text-xs uppercase tracking-[0.3em] text-neutral-400 hover:text-[#c5a059] transition-colors"
          >
            {t('Prefer a shorter volunteer stay? See wwoofing', 'Plutôt un séjour bénévole plus court ? Voir le wwoofing')} →
          </button>
        )}
      </div>

    </div>
  );
};
