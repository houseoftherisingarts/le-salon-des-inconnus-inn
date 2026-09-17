import React, { useState } from 'react';

interface CouponCommunauteProps {
  language: 'EN' | 'FR';
}

// Coupon statique COMMUNAUTE, déplacé depuis ProfilePage.tsx:706-742. Le code
// s'applique aux réservations faites directement avec le Salon, ici sur le site.
export const CouponCommunaute: React.FC<CouponCommunauteProps> = ({ language }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [couponCopied, setCouponCopied] = useState(false);
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
        background: 'linear-gradient(135deg, rgba(50,40,22,0.85) 0%, rgba(28,22,12,0.95) 100%)',
        border: '1px solid rgba(243,229,171,0.45)',
        boxShadow: '0 0 60px rgba(197,160,89,0.15)',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em]">
          {t('Promo code', 'Code promo')}
        </span>
        <span className="font-prata text-[#f3e5ab] text-2xl">10%</span>
      </div>
      <p className="font-josefin text-neutral-300 text-sm leading-relaxed mb-5">
        {t(
          'For everyone who chooses to stay with us. Use this code when you book directly with us, here on the site.',
          "Pour toutes celles et ceux qui choisissent de rester chez nous. Utilisez ce code en réservant directement avec nous, ici même sur le site.",
        )}
      </p>
      <button
        type="button"
        onClick={() => copyCoupon('COMMUNAUTE')}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-lg transition-all hover:bg-black/20"
        style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}
      >
        <span className="font-prata text-[#c5a059] text-xl tracking-[0.3em]">COMMUNAUTE</span>
        <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em]">
          {couponCopied ? t('Copied ✓', 'Copié ✓') : t('Tap to copy', 'Toucher pour copier')}
        </span>
      </button>
    </div>
  );
};
