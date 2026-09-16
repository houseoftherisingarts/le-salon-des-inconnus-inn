import React from 'react';
import { PlancherLuisant, ObjetFlottant, useDansLeReflet } from './PlancherLuisant';

type Langue = 'EN' | 'FR';

const MEDIA = '/media/centre-arts/mecene';
const srcSetLocal = (nom: string) => [960, 1440, 1920].map((w) => `${MEDIA}/${nom}-${w}.webp ${w}w`).join(', ');
const UNSPLASH_CAFE = 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=70';
const srcSetCafe = [960, 1440, 1920].map((w) => `${UNSPLASH_CAFE}&w=${w} ${w}w`).join(', ');
const SIZES_MENU = '(min-width: 1280px) 54vw, (min-width: 640px) 64vw, 112vw';

type CarteMenuPropriétés = {
  titre: string;
  surtitre: string;
  src: string;
  srcSet: string;
  alt: string;
  position: string;
  onClick?: () => void;
  badge?: string;
  prioritaire?: boolean;
};

// Un <button> n'accepte que du contenu de phrase : ni h2 ni p à l'intérieur, et un lecteur
// d'écran aplatit de toute façon ce qu'il contient. Le texte vit donc dans des span.
function CarteMenu({ titre, surtitre, src, srcSet, alt, position, onClick, badge, prioritaire = false }: CarteMenuPropriétés) {
  const reflet = useDansLeReflet();
  const active = Boolean(onClick) && !reflet;
  const Racine = active ? 'button' : 'div';

  return (
    <Racine
      {...(active ? { type: 'button' as const, onClick } : {})}
      className={`group relative block w-full overflow-hidden rounded-[15px] border border-[#c5a059]/20 bg-[#0a0808] text-left
        aspect-[16/11] sm:aspect-[4/3] xl:aspect-[4/5] [container-type:inline-size]
        shadow-[0_40px_60px_-40px_rgba(0,0,0,0.95)]
        ${active ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a059]' : 'cursor-default'}`}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={SIZES_MENU}
        // Dans un bouton titré, la photo est décorative : le nom du bouton reste le surtitre et le titre.
        alt={reflet || active ? '' : alt}
        loading={prioritaire && !reflet ? 'eager' : 'lazy'}
        fetchPriority={prioritaire && !reflet ? 'high' : 'auto'}
        decoding="async"
        style={{ objectPosition: position }}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${active ? 'group-hover:scale-[1.04]' : 'opacity-50 grayscale-[35%]'}`}
      />
      <span aria-hidden="true" className="absolute inset-0 block bg-[linear-gradient(to_top,rgba(5,5,5,0.9)_0%,rgba(10,8,8,0.45)_45%,rgba(10,8,8,0.08)_100%)]" />
      {badge && (
        <span className="absolute right-[clamp(14px,5cqi,22px)] top-[clamp(14px,5cqi,22px)] rounded-full border border-[#c5a059]/40 bg-black/55 px-4 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-[#c5a059] backdrop-blur-md">
          {badge}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 block p-[clamp(18px,7cqi,32px)]">
        <span className="block font-cinzel text-[11px] uppercase tracking-[0.3em] text-[#c5a059]">{surtitre}</span>
        <span className="mt-2 block font-prata text-[clamp(1.5rem,9cqi,2.25rem)] leading-[1.1] text-[#f3e5ab] [text-wrap:balance]">
          {titre}
        </span>
      </span>
    </Racine>
  );
}

type MenuMecenePropriétés = {
  language: Langue;
  onArtistes: () => void;
  onFiscalite: () => void;
  onSoutien: () => void;
};

export function MenuMecene({ language, onArtistes, onFiscalite, onSoutien }: MenuMecenePropriétés) {
  const en = language === 'EN';
  const cartes: (CarteMenuPropriétés & { cle: string })[] = [
    {
      cle: 'artistes',
      surtitre: en ? 'The roster' : 'Le registre',
      titre: en ? 'See our artists' : 'Nos artistes',
      src: `${MEDIA}/leslie-main-1440.webp`,
      srcSet: srcSetLocal('leslie-main'),
      alt: en ? 'An artist from our roster in a snowy forest' : 'Une artiste du registre dans une forêt enneigée',
      position: '72% 40%',
      onClick: onArtistes,
    },
    {
      cle: 'fiscalite',
      surtitre: en ? 'Tax advantages' : 'Avantages fiscaux',
      titre: en ? 'Invest and save' : 'Investir et économiser',
      src: `${MEDIA}/kamy-atelier-1440.webp`,
      srcSet: srcSetLocal('kamy-atelier'),
      alt: en ? 'An artist among her instruments and canvases' : 'Une artiste parmi ses instruments et ses toiles',
      position: '44% 40%',
      onClick: onFiscalite,
    },
    {
      cle: 'soutien',
      surtitre: en ? 'Patronage' : 'Mécénat',
      titre: en ? 'Support projects' : 'Soutenir des projets',
      src: `${MEDIA}/kamy-barcelone-1440.webp`,
      srcSet: srcSetLocal('kamy-barcelone'),
      alt: en ? 'An artist painting on the floor of her studio' : 'Une artiste qui peint au sol dans son atelier',
      position: '45% 55%',
      onClick: onSoutien,
    },
    {
      cle: 'cafe',
      surtitre: en ? 'Productions and artists' : 'Productions et artistes',
      titre: 'Café',
      src: `${UNSPLASH_CAFE}&w=1440`,
      srcSet: srcSetCafe,
      alt: en ? 'A café with long wooden tables' : 'Un café aux longues tables de bois',
      position: '50% 50%',
      badge: en ? 'Coming soon' : 'Bientôt',
    },
  ];

  return (
    <PlancherLuisant
      as="section"
      aria-labelledby="mecene-titre"
      className="flex min-h-full flex-col [--pl-horizon:9%] sm:[--pl-horizon:17%] xl:[--pl-horizon:47%]"
      contenuClassName="flex flex-1 flex-col justify-center px-[clamp(16px,4vw,72px)] pt-[clamp(28px,6vh,64px)] pb-[clamp(40px,8vh,104px)]"
    >
      <header className="mb-[clamp(24px,4vh,44px)]">
        <p className="font-cinzel text-[11px] uppercase tracking-[0.4em] text-[#c5a059]">{en ? 'Patron' : 'Mécène'}</p>
        <h1 id="mecene-titre" className="mt-3 max-w-[22ch] font-prata text-[clamp(1.8rem,3.2vw,3rem)] leading-[1.12] text-[#f3e5ab] [text-wrap:balance] xl:max-w-none">
          {en ? 'Support the artists of the Petite-Nation' : 'Soutenir les artistes de la Petite-Nation'}
        </h1>
      </header>
      <ul role="list" className="grid grid-cols-1 gap-x-[clamp(16px,2vw,28px)] gap-y-[clamp(8px,2vh,20px)] sm:grid-cols-2 xl:grid-cols-4">
        {cartes.map(({ cle, ...carte }, i) => (
          <li key={cle}>
            <ObjetFlottant index={i}>
              <CarteMenu {...carte} prioritaire={i === 0} />
            </ObjetFlottant>
          </li>
        ))}
      </ul>
    </PlancherLuisant>
  );
}

type Palier = {
  cle: string;
  nom: Record<Langue, string>;
  prix: number;
  avantages: Record<Langue, string[]>;
  haut: boolean;
};

const PALIERS: Palier[] = [
  {
    cle: 'initie',
    nom: { FR: "L'Initié", EN: 'The Initiate' },
    prix: 20,
    avantages: {
      FR: ['Du contenu numérique exclusif', "L'accès à l'infolettre", 'La réservation en priorité, 48 heures à l\'avance'],
      EN: ['Exclusive digital content', 'Newsletter access', 'Priority booking, 48 hours ahead'],
    },
    haut: false,
  },
  {
    cle: 'gardien',
    nom: { FR: 'Le Gardien', EN: 'The Guardian' },
    prix: 100,
    avantages: {
      // « Corporate Tax Receipt » retiré : aucun reçu officiel de don ne peut être promis sans statut
      // d'organisme de bienfaisance enregistré (vault, strategie-commandites.md). Revient seulement sur OK d'Alex.
      FR: ["Tous les avantages de l'Initié", 'Une estampe en édition limitée chaque année', '10 % de rabais sur les séjours'],
      EN: ['Every Initiate perk', 'One limited edition print each year', '10% off your stays'],
    },
    haut: true,
  },
  {
    cle: 'mecene',
    nom: { FR: 'Le Mécène', EN: 'The Maecenas' },
    prix: 500,
    avantages: {
      FR: ['Tous les avantages du Gardien', 'Une esquisse originale chaque année', 'Un souper privé avec les artistes', 'Votre nom sur le mur des fondateurs', 'Un service de conciergerie'],
      EN: ['Every Guardian perk', 'One original sketch each year', 'A private dinner with the artists', 'Your name on the founders wall', 'Concierge service'],
    },
    haut: false,
  },
];

function CartePalier({ palier, language }: { palier: Palier; language: Langue }) {
  const reflet = useDansLeReflet();
  const Nom = reflet ? 'div' : 'h3';
  const Bouton = reflet ? 'div' : 'button';
  const en = language === 'EN';
  const prix = en ? `$${palier.prix}` : `${palier.prix} $`;

  return (
    <div
      className={`flex flex-col rounded-[15px] border p-[clamp(24px,2.4vw,36px)] shadow-[0_40px_60px_-40px_rgba(0,0,0,0.95)]
        ${palier.haut
          ? 'min-h-[clamp(440px,34vw,480px)] border-[#c5a059]/45 bg-[linear-gradient(to_bottom,#15110b,#0a0808)]'
          : 'min-h-[clamp(400px,31vw,440px)] border-[#c5a059]/15 bg-[#0a0808]'}`}
    >
      <Nom className="font-prata text-[1.6rem] leading-tight text-[#f3e5ab]">{palier.nom[language]}</Nom>
      <p className="mt-4 font-prata text-[clamp(2.4rem,3.6vw,3.25rem)] leading-none text-[#f3e5ab]">
        {prix} <span className="font-lato text-sm text-neutral-400">{en ? '/ month' : '/ mois'}</span>
      </p>
      <ul role="list" className="mt-8 flex-1 space-y-3">
        {palier.avantages[language].map((a) => (
          <li key={a} className="flex gap-3 font-lato text-[15px] leading-relaxed text-neutral-300">
            <span aria-hidden="true" className="text-[#c5a059]">♦</span>
            {a}
          </li>
        ))}
      </ul>
      <Bouton
        {...(reflet ? {} : { type: 'button' as const })}
        className={`mt-8 w-full rounded-full py-3.5 text-center font-cinzel text-xs uppercase tracking-[0.25em] transition-colors
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a059]
          ${palier.haut
            ? 'bg-[#c5a059] text-[#050505] hover:bg-[#d0ae6c]'
            : 'border border-[#c5a059]/30 text-[#f3e5ab] hover:bg-[#c5a059]/10'}`}
      >
        {en ? 'Join the circle' : 'Rejoindre le cercle'}
      </Bouton>
    </div>
  );
}

export function PaliersMecene({ language }: { language: Langue }) {
  return (
    <PlancherLuisant
      aria-label={language === 'EN' ? 'Membership tiers' : 'Paliers de soutien'}
      className="[--pl-horizon:4%] lg:[--pl-horizon:36%]"
      contenuClassName="px-[clamp(16px,4vw,72px)] pt-[clamp(32px,5vw,72px)] pb-[clamp(40px,6vw,96px)]"
    >
      <ul role="list" className="grid grid-cols-1 items-end gap-x-[clamp(16px,2.2vw,32px)] gap-y-2 lg:grid-cols-3">
        {PALIERS.map((p, i) => (
          <li key={p.cle}>
            <ObjetFlottant index={i} haut={p.haut}>
              <CartePalier palier={p} language={language} />
            </ObjetFlottant>
          </li>
        ))}
      </ul>
    </PlancherLuisant>
  );
}
