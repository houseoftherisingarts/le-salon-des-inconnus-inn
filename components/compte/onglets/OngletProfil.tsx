import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { SelecteurBadges } from '../../../packages/ui/src/reseau/BadgesUI';
import { lireCoordonnees, ecrireCoordonnees } from '../donnees/preferences';

interface OngletProfilProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  onProfileUpdate: (profile: MemberProfile) => void;
}

const MEMBERSHIP_LABELS: Record<string, { en: string; fr: string }> = {
  'voyageur': { en: 'Traveller', fr: 'Voyageur' },
  'artiste': { en: 'Artist', fr: 'Artiste' },
  'membre-communaute': { en: 'Community member', fr: 'Membre de la communauté' },
  'resident': { en: 'Resident', fr: 'Résident' },
  'woofer': { en: 'Woofer', fr: 'Woofer' },
};

export const OngletProfil: React.FC<OngletProfilProps> = ({ user, memberProfile, language, onProfileUpdate }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [displayName, setDisplayName] = useState(memberProfile.displayName || user.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [telephone, setTelephone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    lireCoordonnees(user.uid).then(coords => {
      if (coords?.telephone) setTelephone(coords.telephone);
    });
  }, [user.uid]);

  const handleSaveProfile = async () => {
    if (!db) return;
    setSavingProfile(true);
    setProfileStatus('idle');
    try {
      const newName = displayName.trim() || memberProfile.displayName;
      await updateDoc(doc(db, 'members', user.uid), { displayName: newName });
      onProfileUpdate({ ...memberProfile, displayName: newName });
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus('idle'), 3000);
    } catch {
      setProfileStatus('error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveContact = async () => {
    if (!db) return;
    setSavingContact(true);
    setContactStatus('idle');
    try {
      await ecrireCoordonnees(user.uid, telephone.trim());
      setContactStatus('saved');
      setTimeout(() => setContactStatus('idle'), 3000);
    } catch {
      setContactStatus('error');
    } finally {
      setSavingContact(false);
    }
  };

  const memLabel = MEMBERSHIP_LABELS[memberProfile.membershipType] || MEMBERSHIP_LABELS['voyageur'];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Ce que les autres voient de vous */}
      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Profile', 'Profil')}
        </h3>
        <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('What others see of you', 'Ce que les autres voient de vous')}
        </h2>
        <p className="font-lato text-neutral-200 mb-8">
          {t('Your name, photo, bio and links appear on your member page, which only signed-in members can read.', 'Votre nom, votre photo, votre bio et vos liens apparaissent sur votre fiche de membre, que seuls les membres connectés peuvent lire.')}
        </p>

        <div className="space-y-5">
          <div>
            <label className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em] block mb-2">
              {t('Display name', 'Nom affiché')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
              style={{ border: '1px solid rgba(197,160,89,0.3)' }}
            />
          </div>

          <div>
            <label className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em] block mb-2">
              {t('Email', 'Courriel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={memberProfile.email || user.email || ''}
                disabled
                className="flex-1 bg-black/30 text-neutral-500 px-4 py-3 rounded-lg font-josefin text-sm cursor-not-allowed"
                style={{ border: '1px solid rgba(197,160,89,0.15)' }}
              />
              <span className="font-cinzel text-neutral-600 text-[9px] uppercase tracking-[0.35em] shrink-0">
                {t('Managed by Google', 'Géré par Google')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-[#d4b06a] disabled:opacity-40 transition-colors"
            >
              {savingProfile ? t('Saving…', 'Sauvegarde…') : t('Save changes', 'Sauvegarder')}
            </button>
            {profileStatus === 'saved' && (
              <span className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em]">{t('Saved', 'C\'est enregistré.')}</span>
            )}
            {profileStatus === 'error' && (
              <span className="font-cinzel text-red-400 text-[10px] uppercase tracking-[0.4em]">{t('Error', 'L\'enregistrement n\'a pas passé. Réessayez dans un instant.')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Coordonnées privées */}
      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Private details', 'Coordonnées privées')}
        </h3>
        <p className="font-lato text-neutral-200 mb-8">
          {t('Your phone number stays between you and the Salon team, and no other member can see it.', 'Votre numéro de téléphone reste entre vous et l\'équipe du Salon, et aucun autre membre ne le voit.')}
        </p>

        <div className="space-y-5">
          <div>
            <label className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em] block mb-2">
              {t('Phone', 'Téléphone')}
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
              className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
              style={{ border: '1px solid rgba(197,160,89,0.3)' }}
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSaveContact}
              disabled={savingContact}
              className="rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              {savingContact ? t('Saving…', 'Sauvegarde…') : t('Save', 'Enregistrer')}
            </button>
            {contactStatus === 'saved' && (
              <span className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em]">{t('Saved.', 'C\'est enregistré.')}</span>
            )}
            {contactStatus === 'error' && (
              <span className="font-cinzel text-red-400 text-[10px] uppercase tracking-[0.4em]">{t('That didn\'t save. Try again in a moment.', 'L\'enregistrement n\'a pas passé. Réessayez dans un instant.')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Type d'adhésion */}
      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Membership type', 'Type d\'adhésion')}
        </h3>
        <p className="font-prata text-[#f3e5ab] text-xl">
          {language === 'FR' ? memLabel.fr : memLabel.en}
        </p>
      </div>

      {/* Vos badges */}
      <SelecteurBadges 
        uid={user.uid} 
        language={language} 
      />
      
    </div>
  );
};
