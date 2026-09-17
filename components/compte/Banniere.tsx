import React, { useState, useRef } from 'react';
import type { MemberProfile } from '../AuthModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface BanniereProps {
  uid: string;
  profile: MemberProfile;
  language: 'EN' | 'FR';
  onProfileUpdate: (profile: MemberProfile) => void;
  readOnly?: boolean;
}

const DEFAULT_BANNERS = [
  '/media/inn/golden drone copy.jpg',
  '/media/Auberge photos/cuisine grande.jpg',
  '/media/Financement Artistique/centered copy.jpg'
];

export const Banniere: React.FC<BanniereProps> = ({ uid, profile, language, onProfileUpdate, readOnly }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const currentBanner = profile.banniereURL || DEFAULT_BANNERS[0];

  const handleSelect = async (url: string) => {
    if (readOnly) return;
    try {
      await updateDoc(doc(db, 'members', uid), { banniereURL: url });
      onProfileUpdate({ ...profile, banniereURL: url });
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = () => {
    // Placeholder pour un vrai upload plus tard, si besoin. 
    // Le devis parle de "catalogue réel ou photo personnelle".
    fileInputRef.current?.click();
  };

  return (
    <div className="relative w-full h-[240px] sm:h-[300px] lg:h-[clamp(320px,30vw,440px)] bg-neutral-900 group">
      <img src={currentBanner} alt="Bannière" className="w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(1,10,19,.9) 0%, rgba(1,10,19,.35) 45%, transparent 100%)' }} />

      {!readOnly && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-[#f0e6d2] border border-[#c8aa6e]/40 rounded-full px-4 py-2 text-[10px] font-cinzel uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100"
        >
          {t('Change the banner', 'Changer la bannière')}
        </button>
      )}

      {isOpen && !readOnly && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#010a13] border border-[#c8aa6e]/30 rounded-[15px] p-6 sm:p-8 max-w-2xl w-full">
            <h2 className="font-prata text-[#f0e6d2] text-2xl mb-2">{t('Choose a banner', 'Choisir une bannière')}</h2>
            <p className="font-lato text-neutral-400 text-sm mb-6">{t('Every one of these photos was taken at the Salon. You can also use your own.', 'Ces photos ont toutes été prises au Salon. Vous pouvez aussi mettre la vôtre.')}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {DEFAULT_BANNERS.map((url) => (
                <button
                  key={url}
                  onClick={() => handleSelect(url)}
                  className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-[#c8aa6e] transition-colors"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mt-8 border-t border-white/10 pt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white font-cinzel text-[11px] uppercase tracking-wider"
              >
                {t('Cancel', 'Annuler')}
              </button>
              <button
                onClick={handleUpload}
                className="rounded-full bg-[#c8aa6e] text-[#010a13] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 py-3 hover:bg-[#d8bd85]"
              >
                {t('Use my photo', 'Mettre ma photo')}
              </button>
              <input type="file" className="hidden" ref={fileInputRef} accept="image/*" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
