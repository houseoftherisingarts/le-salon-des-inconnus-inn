import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import {
  trouverOuCreerCode, lienInvitation, lireFilleuls, lireMonParrainage,
  lireNbFilleuls, type Filleul,
} from '../donnees/parrainage';
import { AffiliationPanneau } from '../deplaces/AffiliationPanneau';

interface OngletParrainageProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
}

const dateCourte = (iso: string, language: 'EN' | 'FR') => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const OngletParrainage: React.FC<OngletParrainageProps> = ({ user, memberProfile, language }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [code, setCode] = useState<string | null>(null);
  const [erreurCode, setErreurCode] = useState(false);
  const [filleuls, setFilleuls] = useState<Filleul[]>([]);
  const [invitePar, setInvitePar] = useState<{ code: string; parrainUid: string } | null>(null);
  const [nb, setNb] = useState(0);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let actif = true;
    trouverOuCreerCode(user.uid)
      .then((c) => { if (actif) setCode(c); })
      .catch(() => { if (actif) setErreurCode(true); });
    lireFilleuls(user.uid).then((f) => { if (actif) setFilleuls(f); }).catch(() => {});
    lireMonParrainage(user.uid).then((p) => { if (actif) setInvitePar(p); }).catch(() => {});
    lireNbFilleuls(user.uid).then((n) => { if (actif) setNb(n); }).catch(() => {});
    return () => { actif = false; };
  }, [user.uid]);

  const lien = code ? lienInvitation(code) : '';

  const copier = () => {
    if (!lien) return;
    navigator.clipboard?.writeText(lien).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    });
  };

  const partager = async () => {
    if (!lien) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url: lien });
      } catch { /* annulé */ }
    }
  };

  const carte = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40';
  const surtitre = 'font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2';

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Referrals', 'Parrainage')}
        </h3>
        <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('Invite someone to the Salon', 'Invitez quelqu\'un au Salon')}
        </h2>
        <p className="font-lato text-neutral-200">
          {t(
            'Everyone who creates an account through your link shows up in your list.',
            'Chaque personne qui crée son compte avec votre lien apparaît dans votre liste.'
          )}
        </p>
      </div>

      {/* Invité par : la porte par laquelle je suis entré */}
      {invitePar && (
        <div className={carte}>
          <p className="font-lato text-neutral-300 text-sm">
            {t(`Your invitation came through code {code}.`, `Votre invitation est venue du code {code}.`).replace('{code}', invitePar.code)}
          </p>
        </div>
      )}

      {/* Mon code et mon lien */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Your code', 'Votre code')}
        </h3>
        {erreurCode ? (
          <p className="font-lato text-neutral-400 text-sm">
            {t('Your code could not be created. Try again in a moment.', 'Votre code n\'a pas pu être créé. Réessayez dans un instant.')}
          </p>
        ) : !code ? (
          <div className="flex items-center gap-3 text-neutral-500 text-sm py-4">
            <div className="w-4 h-4 border-2 border-neutral-700 border-t-[#c5a059] rounded-full animate-spin" />
            {t('Loading…', 'Chargement…')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-lg" style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}>
              <span className="font-prata text-[#c5a059] text-xl tracking-[0.3em]">{code}</span>
              <span className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.3em]">
                {nb > 0 ? t(`${nb} guest${nb > 1 ? 's' : ''}`, `${nb} invité${nb > 1 ? 's' : ''}`) : ''}
              </span>
            </div>

            <p className="font-cinzel text-neutral-400 text-[11px] uppercase tracking-[0.25em]">
              {t('Your invitation link', 'Votre lien d\'invitation')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={copier}
                className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-[#d4b06a] transition-colors"
              >
                {copie ? t('Link copied', 'Lien copié') : t('Copy the link', 'Copier le lien')}
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={partager}
                  className="rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-white/5 transition-colors"
                >
                  {t('Share', 'Partager')}
                </button>
              )}
            </div>
            <p className="font-lato text-neutral-500 text-xs break-all">{lien}</p>
          </div>
        )}
      </div>

      {/* Vos invités */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Your guests', 'Vos invités')}
        </h3>
        {filleuls.length === 0 ? (
          <p className="font-lato text-neutral-400 text-sm">
            {t('No one yet. Your link works right now.', 'Personne encore. Votre lien fonctionne dès maintenant.')}
          </p>
        ) : (
          <ul className="space-y-2">
            {filleuls.map((f) => (
              <li key={f.id} className="flex items-baseline justify-between gap-4 px-4 py-3 rounded-lg" style={{ background: 'rgba(20,16,10,0.5)' }}>
                <span className="font-lato text-neutral-200 text-sm">{f.nom || 'Un membre'}</span>
                <span className="font-lato text-neutral-500 text-xs">
                  {t(`since {date}`, `depuis le {date}`).replace('{date}', dateCourte(f.creeLe, language))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Programme affilié (textes conservés de ProfilePage) */}
      <AffiliationPanneau user={user} memberProfile={memberProfile} language={language} />

    </div>
  );
};
