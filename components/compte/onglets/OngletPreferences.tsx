import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { deleteMemberData, AuthModal } from '../../AuthModal';
import { lirePreferences, ecrirePreferences, type Preferences } from '../donnees/preferences';

interface OngletPreferencesProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  readOnly?: boolean;
  uidCible?: string;
}

export const OngletPreferences: React.FC<OngletPreferencesProps> = ({ user, language, readOnly, uidCible }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const uid = uidCible ?? user.uid;

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState(false);
  const [erreur, setErreur] = useState(false);

  const [confirmation, setConfirmation] = useState('');
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [doitReconnecter, setDoitReconnecter] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState(false);

  useEffect(() => {
    lirePreferences(uid).then((p) => setPrefs(p)).catch(() => {});
  }, [uid]);

  const maj = (champ: Partial<Preferences>) => {
    if (!prefs) return;
    const suivant = { ...prefs, ...champ };
    setPrefs(suivant);
    setSaved(false);
    setErreur(false);
    ecrirePreferences(uid, champ)
      .then(() => setSaved(true))
      .catch(() => setErreur(true));
  };

  const supprimer = async () => {
    const attendu = language === 'FR' ? 'SUPPRIMER' : 'DELETE';
    if (confirmation.trim() !== attendu) return;
    setSuppressionEnCours(true);
    setErreurSuppression(false);
    try {
      await deleteMemberData(user);
    } catch (e: unknown) {
      const code = String((e as { code?: string })?.code ?? '');
      if (code.includes('requires-recent-login')) {
        setDoitReconnecter(true);
      } else {
        setErreurSuppression(true);
      }
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const carte = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c8aa6e]/40';
  const surtitre = 'font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c8aa6e] mb-4 flex items-center gap-2';

  const OuvrirConfidentialite = () => {
    try { window.dispatchEvent(new CustomEvent('salon:privacy')); } catch { /* privé */ }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('Preferences', 'Préférences')}
        </h3>
        <h2 className="font-prata text-[#f0e6d2] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('The way you like it', 'Comme vous l\'aimez')}
        </h2>
      </div>

      {/* Langue */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('Language of your space', 'Langue de votre espace')}
        </h3>
        <div className="flex gap-3">
          {(['FR', 'EN'] as const).map((code) => (
            <button
              key={code}
              onClick={() => maj({ langue: code })}
              disabled={readOnly}
              className={`rounded-full px-6 min-h-[44px] font-cinzel uppercase text-[12px] tracking-[0.18em] transition-colors disabled:opacity-50 ${
                (prefs?.langue ?? 'FR') === code
                  ? 'bg-[#c8aa6e] text-[#010a13] font-bold'
                  : 'border border-white/20 text-neutral-300 hover:border-[#c8aa6e]/50'
              }`}
            >
              {code === 'FR' ? 'Français' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Courriels */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c8aa6e]" />
          {t('Emails', 'Courriels')}
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="font-lato text-neutral-200 text-sm">
              {t('Get an email when the team replies', 'Recevoir un courriel quand l\'équipe vous répond')}
            </span>
            <input
              type="checkbox"
              checked={prefs?.courrielReponseEquipe !== false}
              onChange={(e) => maj({ courrielReponseEquipe: e.target.checked })}
              disabled={readOnly}
              className="w-5 h-5 accent-[#c8aa6e]"
            />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="font-lato text-neutral-200 text-sm">
              {t('Get an email when a member writes to you (at most once an hour)', 'Recevoir un courriel quand un membre vous écrit (une fois l\'heure au plus)')}
            </span>
            <input
              type="checkbox"
              checked={prefs?.courrielNouveauMessage === true}
              onChange={(e) => maj({ courrielNouveauMessage: e.target.checked })}
              disabled={readOnly}
              className="w-5 h-5 accent-[#c8aa6e]"
            />
          </label>
        </div>
        <p className="font-lato text-sm mt-4 h-5">
          {saved && <span className="text-[#c8aa6e]">{t('Saved.', 'C\'est enregistré.')}</span>}
          {erreur && <span className="text-red-400">{t('That didn\'t save. Try again in a moment.', 'L\'enregistrement n\'a pas passé. Réessayez dans un instant.')}</span>}
        </p>
      </div>

      {/* Confidentialité */}
      <div className={carte}>
        <button onClick={OuvrirConfidentialite} className="font-cinzel text-xs uppercase tracking-[0.3em] text-neutral-400 hover:text-[#c8aa6e] transition-colors">
          {t('Read the privacy policy', 'Lire la politique de confidentialité')} →
        </button>
      </div>

      {/* Suppression du compte */}
      {!readOnly && (
      <div className={carte} style={{ borderColor: 'rgba(220,90,90,0.25)' }}>
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-red-400/80 mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-red-400/50" />
          {t('Delete my account', 'Supprimer mon compte')}
        </h3>
        <p className="font-lato text-neutral-300 text-sm mb-6">
          {t(
            'Your member page and your account will be erased. Messages you already sent to other members remain in their conversations.',
            'Votre fiche et votre compte seront effacés. Vos messages déjà envoyés à d\'autres membres restent dans leurs conversations.'
          )}
        </p>

        {doitReconnecter ? (
          <div className="space-y-4">
            <p className="font-lato text-neutral-200 text-sm">
              {t('To protect your account, sign in one last time before deleting it.', 'Pour protéger votre compte, reconnectez-vous une dernière fois avant la suppression.')}
            </p>
            <AuthModal
              language={language}
              onClose={() => setDoitReconnecter(false)}
              onAuthSuccess={(u) => {
                setDoitReconnecter(false);
                deleteMemberData(u).catch(() => setErreurSuppression(true));
              }}
              onShowPrivacy={OuvrirConfidentialite}
            />
          </div>
        ) : (
          <>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={t('Type DELETE to confirm', 'Tapez SUPPRIMER pour confirmer')}
              className="w-full mb-4 px-4 py-3 rounded-lg bg-[#010a13]/60 border border-white/15 text-neutral-200 font-lato text-sm focus:outline-none focus:border-[#c8aa6e]/50"
            />
            <button
              onClick={supprimer}
              disabled={suppressionEnCours || confirmation.trim() !== (language === 'FR' ? 'SUPPRIMER' : 'DELETE')}
              className="rounded-full border border-red-400/50 text-red-300 font-cinzel uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-red-400/10 transition-colors disabled:opacity-40"
            >
              {suppressionEnCours ? t('Deleting…', 'Suppression…') : t('Delete permanently', 'Supprimer définitivement')}
            </button>
          </>
        )}

        {erreurSuppression && (
          <p className="font-lato text-red-400 text-sm mt-4">
            {t('The account could not be deleted. Try again in a moment.', 'Le compte n\'a pas pu être supprimé. Réessayez dans un instant.')}
          </p>
        )}
      </div>
      )}

    </div>
  );
};
