import React from 'react';

// Bande commanditaire partagée (/tools et /coffre) : une seule source, pour
// qu'elle soit identique partout et qu'elle ne dérive jamais d'une page à l'autre.
const SPONSOR_MAILTO =
  'mailto:alex@lesalondesinconnus.com?subject=Commanditer%20les%20outils%20du%20Salon';

interface Props {
  t: (en: string, fr: string, es: string) => string;
  onNavigate: (view: any) => void;
  /** Bande en pied de carte (bordure haute pleine largeur) ou bande interne à une section. */
  variant?: 'card' | 'inset';
}

const LINK =
  'underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors';

export const SponsorBand: React.FC<Props> = ({ t, onNavigate, variant = 'card' }) => (
  <div
    className={
      (variant === 'card' ? 'px-10 md:px-12 py-5' : 'mt-10 pt-8') +
      ' border-t border-[#c5a059]/15 flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500'
    }
  >
    <span>
      {t(
        'An ad-free experience, presented by',
        'Une expérience sans publicité, présentée par',
        'Una experiencia sin publicidad, presentada por',
      )}
    </span>
    <span className="text-[#c5a059] font-semibold">La Petite Monnaie</span>
    <a href={SPONSOR_MAILTO} className={LINK}>
      {t('Become a sponsor', 'Devenir commanditaire', 'Convertirse en patrocinador')}
    </a>
    <button onClick={() => onNavigate('DONATION')} className={LINK}>
      {t('Support the project', 'Soutenir le projet', 'Apoyar el proyecto')}
    </button>
  </div>
);
