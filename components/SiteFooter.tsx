// SiteFooter : le vrai pied de page du Salon (vague 2 de l'écosystème,
// 16 septembre 2026). Il fusionne trois morceaux qui vivaient séparés :
// le texte « À propos » de la route courante (SeoBlock, mots et titres gardés),
// la carte OpenStreetMap avec l'adresse, et un bloc NAP identique au JSON-LD
// de index.html et à public/llms.txt. Suivent les colonnes de liens vers des
// routes réelles, puis la rangée d'écosystème avec le collant Vexel en foil
// réemployé depuis @inconnus/ui. Section ordinaire : rien n'y colle à l'écran.

import React from 'react';
import { CollantVexel } from '@inconnus/ui/collant';
import { SeoBlock } from './SeoBlock';
import type { SeoViewKey } from '../config/seo.content';

// Coordonnées vérifiées sur le nœud OpenStreetMap du Salon.
const LAT = 45.896466;
const LNG = -74.9362425;
const MAP_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${LNG - 0.03}%2C${LAT - 0.015}%2C${LNG + 0.03}%2C${LAT + 0.015}&layer=mapnik&marker=${LAT}%2C${LNG}`;
const MAP_LARGE = `https://www.openstreetmap.org/?mlat=${LAT}&mlon=${LNG}#map=16/${LAT}/${LNG}`;

type Lien = { fr: string; en: string; view?: string; href: string; externe?: boolean };

// Chaque `view` existe dans VIEW_PATHS (App.tsx) ; le href sert aux robots et au clic milieu.
const COLONNES: { fr: string; en: string; liens: Lien[] }[] = [
  {
    fr: 'Séjourner', en: 'Stay',
    liens: [
      { fr: "L'auberge", en: 'The inn', view: 'INN', href: '/' },
      { fr: 'Forfaits', en: 'Packages', view: 'FORFAITS', href: '/forfaits' },
      { fr: 'Camping', en: 'Camping', view: 'CAMPING', href: '/camping' },
      { fr: 'Entreprises', en: 'Businesses', view: 'ENTREPRISES', href: '/entreprises' },
      { fr: 'Les hôtes', en: 'Our hosts', view: 'HOSTS', href: '/about' },
    ],
  },
  {
    fr: 'Vivre sur place', en: 'On site',
    liens: [
      { fr: 'Cuisine', en: 'Kitchen', view: 'KITCHEN', href: '/cuisine' },
      { fr: 'Massothérapie', en: 'Massotherapy', view: 'MASSOTHERAPY', href: '/massage' },
      { fr: 'Événements', en: 'Events', view: 'EVENTS', href: '/evenements' },
      { fr: 'Ceilidh de Mai', en: 'May Ceilidh', view: 'CEILIDH', href: '/ceilidh' },
      { fr: 'Wwoofing', en: 'Wwoofing', view: 'WWOOFING', href: '/wwoofing' },
      { fr: 'Guide local', en: 'Local guide', view: 'GUIDE', href: '/guide' },
      { fr: 'Petite Monnaie', en: 'Petite Monnaie', view: 'PETITE_MONNAIE', href: '/petite-monnaie' },
    ],
  },
  {
    fr: "Centre d'arts et communauté", en: 'Arts centre & community',
    liens: [
      { fr: "Le centre d'arts", en: 'The arts centre', view: 'CENTRE_ARTS', href: '/centre-arts' },
      { fr: 'Les mécènes', en: 'Patrons', view: 'MECENE', href: '/mecene' },
      { fr: 'Creator Studio', en: 'Creator Studio', view: 'CREATOR_STUDIO', href: '/creator' },
      { fr: 'La communauté', en: 'Community', view: 'COMMUNITY', href: '/communaute' },
      { fr: 'Le Dôme', en: 'Le Dôme', href: 'https://ledomedesinconnus.com/', externe: true },
      { fr: 'Les Inconnus', en: 'Les Inconnus', href: 'https://lesinconnus.ca/', externe: true },
    ],
  },
  {
    fr: 'Informations', en: 'Information',
    liens: [
      { fr: 'Pensées', en: 'Thoughts', view: 'PENSEES', href: '/pensees' },
      { fr: 'Faire un don', en: 'Make a gift', view: 'DONATION', href: '/don' },
      { fr: "Politique d'annulation", en: 'Cancellation policy', href: '/politique-annulation.html', externe: true },
      { fr: 'Politique de confidentialité', en: 'Privacy policy', view: 'PRIVACY', href: '#confidentialite' },
    ],
  },
];

const RESEAUX = [
  { nom: 'Facebook', href: 'https://www.facebook.com/lesalondesinconnus' },
  { nom: 'Instagram', href: 'https://www.instagram.com/lesalondesinconnus' },
];

const naviguer = (view: string) => {
  if (view === 'PRIVACY') {
    window.dispatchEvent(new CustomEvent('salon:privacy'));
    return;
  }
  window.dispatchEvent(new CustomEvent('salon:navigate', { detail: { view } }));
};

const LIEN = 'inline-flex items-center min-h-[32px] font-lato text-[15px] text-neutral-300 hover:text-[#f3e5ab] transition-colors focus:outline-none focus-visible:text-[#f3e5ab] focus-visible:underline underline-offset-4';
const SURTITRE = 'font-cinzel uppercase text-[#c5a059] text-[12px] tracking-[0.35em]';

const Ancre: React.FC<{ lien: Lien; language: 'EN' | 'FR'; className?: string }> = ({ lien, language, className = LIEN }) => {
  const label = language === 'FR' ? lien.fr : lien.en;
  const href = lien.externe && language === 'EN' && lien.href === 'https://lesinconnus.ca/' ? 'https://theunknowns.ca/' : lien.href;
  if (lien.externe) {
    const nouvelOnglet = href.startsWith('http') || href.endsWith('.html');
    return (
      <a href={href} className={className} {...(nouvelOnglet ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {label}
      </a>
    );
  }
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        naviguer(lien.view!);
      }}
    >
      {label}
    </a>
  );
};

export const SiteFooter: React.FC<{
  viewKey: SeoViewKey;
  language: 'EN' | 'FR';
  onNavigate?: (view: string) => void;
}> = ({ viewKey, language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  return (
    <footer className="relative w-full bg-[#050505] text-neutral-300">
      {/* a. À propos du lieu : le texte SEO de la route, mots et titres intacts */}
      <SeoBlock viewKey={viewKey} language={language} onNavigate={onNavigate} />

      {/* b + c. Nous trouver : adresse NAP et carte */}
      <div className="border-t border-[#c5a059]/15 px-6 md:px-12 lg:px-24 py-16 md:py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="h-px w-10 bg-[#c5a059]" aria-hidden />
              <h2 className={SURTITRE}>{t('Find us', 'Nous trouver')}</h2>
            </div>
            <address className="not-italic font-lato text-[16px] leading-[1.8] text-neutral-200">
              <span className="block font-prata text-[#f3e5ab] text-2xl md:text-[1.75rem] leading-tight mb-3">Le Salon des Inconnus</span>
              <span className="block">826 Côte à Favier</span>
              <span className="block">{t('Namur (Quebec) J0V 1N0', 'Namur (Québec) J0V 1N0')}</span>
              <span className="block mt-4">
                <a href="tel:+15144183450" className="text-[#f3e5ab] hover:text-white underline decoration-[#c5a059]/40 hover:decoration-[#f3e5ab] underline-offset-4 transition-colors">514 418 3450</a>
              </span>
              <span className="block">
                <a href="mailto:alex@lesalondesinconnus.com" className="text-[#f3e5ab] hover:text-white underline decoration-[#c5a059]/40 hover:decoration-[#f3e5ab] underline-offset-4 transition-colors break-all">alex@lesalondesinconnus.com</a>
              </span>
              <span className="block mt-4 text-[13px] text-neutral-400">
                {t('Registered establishment, CITQ 209613', 'Établissement enregistré, CITQ 209613')}
              </span>
            </address>
            <ul className="mt-6 flex flex-wrap gap-3" aria-label={t('Social networks', 'Réseaux sociaux')}>
              {RESEAUX.map((r) => (
                <li key={r.nom}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center min-h-[40px] px-4 rounded-full border border-[#c5a059]/35 bg-white/[0.03] font-cinzel text-[12px] uppercase tracking-[0.2em] text-[#f3e5ab] hover:border-[#c5a059] hover:bg-[#c5a059]/10 transition-colors"
                  >
                    {r.nom}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="relative w-full overflow-hidden rounded-[15px] border border-[#c5a059]/25 bg-[#0a0808] h-[300px] md:h-[380px]">
              <iframe
                src={MAP_EMBED}
                title={t('Map: Le Salon des Inconnus, Namur', 'Carte : Le Salon des Inconnus, Namur')}
                loading="lazy"
                className="w-full h-full block"
                style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(0.85)' }}
              />
            </div>
            <a
              href={MAP_LARGE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center min-h-[40px] font-lato text-[14px] text-neutral-400 hover:text-[#f3e5ab] transition-colors"
            >
              {t('View larger map', 'Voir la carte plus grande')} →
            </a>
          </div>
        </div>
      </div>

      {/* d. Colonnes de liens */}
      <div className="border-t border-[#c5a059]/15 px-6 md:px-12 lg:px-24 py-14 md:py-16">
        <nav aria-label={t('Site map', 'Plan du site')} className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {COLONNES.map((col) => (
            <div key={col.fr} className="min-w-0">
              <p className={`${SURTITRE} tracking-[0.25em] mb-4 leading-relaxed`}>{language === 'FR' ? col.fr : col.en}</p>
              <ul className="space-y-1">
                {col.liens.map((l) => (
                  <li key={l.href}>
                    <Ancre lien={l} language={language} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* e. Rangée d'écosystème */}
      <div className="border-t border-[#c5a059]/15 px-6 md:px-12 lg:px-24 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
          <CollantVexel language={language} />
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <li><Ancre lien={{ fr: 'Creator Studio', en: 'Creator Studio', view: 'CREATOR_STUDIO', href: '/creator' }} language={language} className={`${LIEN} font-cinzel uppercase text-[12px] tracking-[0.2em]`} /></li>
            <li><Ancre lien={{ fr: 'Le Dôme', en: 'Le Dôme', href: 'https://ledomedesinconnus.com/', externe: true }} language={language} className={`${LIEN} font-cinzel uppercase text-[12px] tracking-[0.2em]`} /></li>
            <li><Ancre lien={{ fr: 'Les Inconnus', en: 'Les Inconnus', href: 'https://lesinconnus.ca/', externe: true }} language={language} className={`${LIEN} font-cinzel uppercase text-[12px] tracking-[0.2em]`} /></li>
          </ul>
          <p className="font-lato text-[13px] text-neutral-500">© 2026 Le Salon des Inconnus</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
