import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';

interface AffiliationPanneauProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
}

// Programme affilié, déplacé depuis ProfilePage.tsx:744-846. Le membre demande
// à devenir affilié ; l'admin approuve avec un code personnel (10% par séjour
// de 2 nuits ou plus). Textes conservés tels quels, or #d4af37 passé à #c5a059.
export const AffiliationPanneau: React.FC<AffiliationPanneauProps> = ({ user, memberProfile, language }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [affiliate, setAffiliate] = useState<null | {
    status: 'waiting' | 'accepted' | 'refused';
    code?: string;
  }>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);

  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'affiliateRequests', user.uid);
    return onSnapshot(ref, (snap) => {
      setAffiliate(snap.exists() ? (snap.data() as { status: 'waiting' | 'accepted' | 'refused'; code?: string }) : null);
    });
  }, [user.uid]);

  const requestAffiliate = async () => {
    if (!db || affiliateLoading) return;
    setAffiliateLoading(true);
    try {
      await setDoc(doc(db, 'affiliateRequests', user.uid), {
        uid: user.uid,
        displayName: memberProfile.displayName || user.displayName || '',
        email: memberProfile.email || user.email || '',
        photoURL: memberProfile.photoURL || user.photoURL || '',
        status: 'waiting',
        createdAt: serverTimestamp(),
      }, { merge: true });
    } finally {
      setAffiliateLoading(false);
    }
  };

  const copyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 1800);
    });
  };

  return (
    <div
      className="p-6 md:p-8 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
        border: '1px solid rgba(197,160,89,0.22)',
      }}
    >
      <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] block mb-3">
        {t('Affiliate program', 'Programme affilié')}
      </span>
      <h4
        className="font-prata uppercase text-[#f3e5ab] leading-tight mb-3"
        style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)' }}
      >
        {t(
          'Become an affiliate · earn 10% on stays of 2 nights or more',
          'Devenir affilié · gagner 10% par réservation de 2 jours ou plus',
        )}
      </h4>
      <p className="font-josefin text-neutral-400 text-sm leading-relaxed mb-5">
        {t(
          'Share a personal code with your network. We pay you 10% of every booking that uses it (minimum 2 nights).',
          'Partagez un code personnel avec votre réseau. Nous vous versons 10% sur chaque réservation qui l’utilise (minimum 2 nuits).',
        )}
      </p>

      {!affiliate && (
        <button
          type="button"
          onClick={requestAffiliate}
          disabled={affiliateLoading}
          className="w-full px-5 py-3.5 rounded-lg font-cinzel text-[#1a1208] text-[10px] uppercase tracking-[0.45em] disabled:opacity-40 transition-transform hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
            boxShadow: '0 4px 16px rgba(197,160,89,0.4)',
          }}
        >
          {affiliateLoading
            ? t('Sending…', 'Envoi…')
            : t('Request to become an affiliate', 'Demander à devenir affilié')}
        </button>
      )}

      {affiliate?.status === 'waiting' && (
        <div
          className="px-5 py-4 rounded-lg flex items-center gap-3"
          style={{ background: 'rgba(8,6,4,0.55)', border: '1px solid rgba(197,160,89,0.4)' }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#c5a059]"
            style={{ animation: 'affiliationPulse 2.2s ease-in-out infinite' }}
            aria-hidden
          />
          <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.4em]">
            {t('Waiting for approval', 'En attente d’approbation')}
          </span>
        </div>
      )}

      {affiliate?.status === 'accepted' && affiliate.code && (
        <div className="space-y-3">
          <p className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em]">
            ✓ {t('You’re an affiliate', 'Vous êtes affilié·e')}
          </p>
          <button
            type="button"
            onClick={() => copyCoupon(affiliate.code!)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-lg transition-all hover:bg-black/20"
            style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}
          >
            <span className="font-prata text-[#c5a059] text-xl tracking-[0.3em]">
              {affiliate.code}
            </span>
            <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em]">
              {couponCopied ? t('Copied ✓', 'Copié ✓') : t('Tap to copy', 'Toucher pour copier')}
            </span>
          </button>
        </div>
      )}

      {affiliate?.status === 'refused' && (
        <div
          className="px-5 py-4 rounded-lg"
          style={{ background: 'rgba(8,6,4,0.55)', border: '1px solid rgba(220,90,90,0.3)' }}
        >
          <p className="font-cinzel text-red-400/80 text-[10px] uppercase tracking-[0.4em]">
            {t('Request not approved at this time', 'Demande non approuvée pour l’instant')}
          </p>
        </div>
      )}

      <style>{`
        @keyframes affiliationPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};
