import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { lireBillets, type Billets } from '../donnees/billets';
import { MonCeilidhPanneau } from '../deplaces/MonCeilidhPanneau';
import { TEAMS } from '../../CeilidhPage';

interface OngletBilletsProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  readOnly?: boolean;
  uidCible?: string;
}

const NIGHTS_LABELS: Record<string, { fr: string; en: string }> = {
  '2026-05-22': { fr: 'Vendredi 22 Mai', en: 'Friday May 22' },
  '2026-05-23': { fr: 'Samedi 23 Mai', en: 'Saturday May 23' },
  '2026-05-24': { fr: 'Dimanche 24 Mai', en: 'Sunday May 24' },
};

const nomEquipe = (equipeId: string, language: 'EN' | 'FR') => {
  const team = TEAMS.find((x) => x.id === equipeId);
  return team ? (language === 'FR' ? team.nameFr : team.nameEn) : equipeId;
};

const montant = (v: number) => `$${v.toFixed(2)}`;

export const OngletBillets: React.FC<OngletBilletsProps> = ({ user, memberProfile, language, onNavigate, readOnly, uidCible }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [billets, setBillets] = useState<Billets | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    lireBillets(uidCible)
      .then((b) => { if (actif) setBillets(b); })
      .catch(() => { if (actif) setErreur(true); });
    return () => { actif = false; };
  }, [uidCible]);

  const vide = !!billets
    && billets.spectacles.length === 0
    && billets.inscriptions.length === 0
    && billets.contributions.length === 0
    && billets.camping.length === 0;

  const carte = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c8aa6e]/40';
  const surtitre = 'font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c8aa6e] mb-4 flex items-center gap-2';

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('Your tickets', 'Vos billets')}
        </h3>
        <h2 className="font-prata text-[#f0e6d2] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('Shows and evenings', 'Spectacles et soirées')}
        </h2>
        <p className="font-lato text-neutral-200">
          {t(
            'Your show tickets, your registrations and your contributions to Salon events all end up here.',
            'Vos billets de spectacle, vos inscriptions et vos contributions aux événements du Salon se retrouvent ici.'
          )}
        </p>
      </div>

      {erreur && (
        <div className="font-lato text-neutral-400 text-sm">
          {t('The ticket register isn\'t answering right now. Come back in a few minutes.', 'Le registre des billets ne répond pas pour l\'instant. Revenez dans quelques minutes.')}
        </div>
      )}

      {!billets && !erreur && (
        <div className="flex items-center gap-3 text-neutral-500 text-sm py-10 px-4">
          <div className="w-4 h-4 border-2 border-neutral-700 border-t-[#c8aa6e] rounded-full animate-spin" />
          {t('Loading…', 'Chargement…')}
        </div>
      )}

      {vide && (
        <div className={carte}>
          <p className="font-lato text-neutral-300 mb-6">
            {t('No tickets yet. Upcoming events are announced on the Events page.', 'Aucun billet pour l\'instant. Les prochains événements s\'annoncent sur la page Événements.')}
          </p>
          <button
            onClick={() => onNavigate('CEILIDH')}
            className="rounded-full border border-[#c8aa6e]/55 bg-[#010a13]/55 text-[#f0e6d2] font-cinzel uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-white/5 transition-colors"
          >
            {t('See events', 'Voir les événements')}
          </button>
        </div>
      )}

      {/* Spectacles */}
      {billets && billets.spectacles.length > 0 && (
        <div className={carte}>
          <h3 className={surtitre}>
            <div className="h-px w-10 bg-[#c8aa6e]" />
            {t('Grand Ceilidh, May 2026', 'Grand Ceilidh de Mai 2026')}
          </h3>
          <div className="space-y-3">
            {billets.spectacles.map((s, i) => (
              <div key={i} className="p-5 rounded-xl" style={{ background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(200,170,110,0.18)' }}>
                <p className="font-prata text-[#f0e6d2] text-base mb-1">
                  {s.type === 'weekend' ? t('Weekend pass', 'Passe fin de semaine') : t('Show ticket', 'Billet spectacle')}
                </p>
                {s.soirs.length > 0 && (
                  <p className="font-lato text-neutral-300 text-sm">
                    {t('Nights: {nights}', 'Soirs : {soirs}')
                      .replace('{nights}', s.soirs.map((n) => language === 'FR' ? NIGHTS_LABELS[n]?.fr : NIGHTS_LABELS[n]?.en).filter(Boolean).join(', '))
                      .replace('{soirs}', s.soirs.map((n) => language === 'FR' ? NIGHTS_LABELS[n]?.fr : NIGHTS_LABELS[n]?.en).filter(Boolean).join(', '))}
                  </p>
                )}
                {s.code && (
                  <p className="font-lato text-neutral-300 text-sm">
                    {t('Entry code: {code}', 'Code d\'entrée : {code}').replace('{code}', s.code)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inscriptions */}
      {billets && billets.inscriptions.length > 0 && (
        <div className={carte}>
          <h3 className={surtitre}>
            <div className="h-px w-10 bg-[#c8aa6e]" />
            {t('Grand Ceilidh, May 2026', 'Grand Ceilidh de Mai 2026')}
          </h3>
          <div className="space-y-3">
            {billets.inscriptions.map((ins, i) => {
              const equipes = ins.equipes.map((e) => nomEquipe(e, language)).join(', ');
              return (
                <div key={i} className="p-5 rounded-xl" style={{ background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(200,170,110,0.18)' }}>
                  <p className="font-lato text-neutral-300 text-sm">
                    {equipes
                      ? t(`Registered for the Ceilidh · team {team}`, `Inscrit au Ceilidh · équipe {equipe}`).replace('{team}', equipes).replace('{equipe}', equipes)
                      : t('Registered for the Ceilidh', 'Inscrit au Ceilidh')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contributions */}
      {billets && billets.contributions.length > 0 && (
        <div className={carte}>
          <h3 className={surtitre}>
            <div className="h-px w-10 bg-[#c8aa6e]" />
            {t('Grand Ceilidh, May 2026', 'Grand Ceilidh de Mai 2026')}
          </h3>
          <div className="space-y-3">
            {billets.contributions.map((c, i) => (
              <div key={i} className="p-5 rounded-xl" style={{ background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(200,170,110,0.18)' }}>
                <p className="font-lato text-neutral-300 text-sm">
                  {t(`{amount} contribution to the Ceilidh`, `Contribution de {montant} au Ceilidh`)
                    .replace('{amount}', montant(c.montant))
                    .replace('{montant}', montant(c.montant))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camping */}
      {billets && billets.camping.length > 0 && (
        <div className={carte}>
          <h3 className={surtitre}>
            <div className="h-px w-10 bg-[#c8aa6e]" />
            {t('Medieval Festival 2026', 'Festival médiéval 2026')}
          </h3>
          <div className="space-y-3">
            {billets.camping.map((camp, i) => (
              <div key={i} className="p-5 rounded-xl" style={{ background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(200,170,110,0.18)' }}>
                <p className="font-lato text-neutral-300 text-sm">
                  {t('Campsite · Medieval Festival 2026', 'Emplacement de camping · Festival médiéval 2026')}
                  {' · '}{montant(camp.montant)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mon Ceilidh : pickers + salons, seulement si inscrit */}
      {billets && billets.inscriptions.length > 0 && (
        <MonCeilidhPanneau user={user} memberProfile={memberProfile} language={language} />
      )}

    </div>
  );
};
