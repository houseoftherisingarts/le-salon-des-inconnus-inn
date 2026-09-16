import React from 'react';

interface Onglet {
  id: string;
  labelFR: string;
  labelEN: string;
}

const ONGLETS: Onglet[] = [
  { id: 'profil', labelFR: 'Profil', labelEN: 'Profile' },
  { id: 'sejours', labelFR: 'Vos séjours', labelEN: 'Your stays' },
  { id: 'billets', labelFR: 'Vos billets', labelEN: 'Your tickets' },
  { id: 'communaute', labelFR: 'Communauté', labelEN: 'Community' },
  { id: 'artistique', labelFR: 'Communauté artistique', labelEN: 'Artistic community' },
  // Les onglets qui ne sont pas construits n'apparaissent pas encore.
];

interface OngletsMembreProps {
  actif: string;
  onChange: (id: string) => void;
  language: 'EN' | 'FR';
}

export const OngletsMembre: React.FC<OngletsMembreProps> = ({ actif, onChange, language }) => {
  return (
    <div className="sticky top-[56px] z-[50] w-full bg-[#0a0808]/85 backdrop-blur-md border-b border-[#c5a059]/15">
      <div 
        role="tablist"
        aria-label={language === 'FR' ? 'Sections de votre espace' : 'Sections of your space'}
        className="flex overflow-x-auto snap-x hide-scrollbar px-4 sm:px-6 md:px-12 lg:px-20"
      >
        {ONGLETS.map((o) => {
          const isSelected = actif === o.id;
          return (
            <button
              key={o.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onChange(o.id)}
              className={`
                snap-start shrink-0 px-4 py-4 text-[11px] font-cinzel uppercase tracking-widest transition-colors
                border-b-2
                ${isSelected ? 'border-[#c5a059] text-[#f3e5ab]' : 'border-transparent text-neutral-400 hover:text-neutral-200'}
              `}
            >
              {language === 'FR' ? o.labelFR : o.labelEN}
            </button>
          );
        })}
        {/* Ombre de fondu */}
        <div className="sticky right-0 w-8 shrink-0 bg-gradient-to-l from-[#0a0808] to-transparent pointer-events-none" />
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
