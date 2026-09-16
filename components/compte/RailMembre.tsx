import React from 'react';

interface RailMembreProps {
  language: 'EN' | 'FR';
  onNavigate: (onglet: string) => void;
}

export const RailMembre: React.FC<RailMembreProps> = ({ language, onNavigate }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 transition-colors duration-200 hover:border-[#c5a059]/40">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Arts centre & community', 'Centre d\'arts et communauté')}
        </h3>
        <p className="font-lato text-neutral-200 mb-6">
          {t('Discover the artists\' centre and Creator Studio.', 'Découvrez le centre d\'artistes et le Creator Studio.')}
        </p>
        <button
          onClick={() => onNavigate('artistique')}
          className="rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] text-[11px] font-cinzel uppercase tracking-widest px-6 py-2 hover:bg-white/5 transition-colors w-full"
        >
          {t('See the community', 'Voir la communauté')}
        </button>
      </div>

      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 transition-colors duration-200 hover:border-[#c5a059]/40">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('A question?', 'Une question ?')}
        </h3>
        <button
          onClick={() => onNavigate('aide')}
          className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 py-3 hover:bg-[#d4b06a] transition-colors w-full"
        >
          {t('Write to the team', 'Écrire à l\'équipe')}
        </button>
      </div>
    </div>
  );
};
