import { useEffect, useState, useCallback } from 'react';
import { ArtsPage, PageMembre, ProfilProPage, RESERVED_SLUGS } from '@inconnus/ui';
import AlexPage from './AlexPage';

// Les hôtes du Salon lui-même. Tout autre nom d'hôte est le domaine personnel
// d'un artiste au Profil Pro (branché sur ce site hosting par Alex) : la page
// rend alors son profil, quelle que soit l'adresse demandée.
const HOTES_DU_SALON = [
  /^localhost$/, /^127\.0\.0\.1$/, /^\[::1\]$/, /^0\.0\.0\.0$/,
  /\.web\.app$/, /\.firebaseapp\.com$/,
  /(^|\.)lesalondesinconnus\.com$/, /(^|\.)aubergedesinconnus\.com$/, /(^|\.)houseoftherisingarts\.com$/,
];
export function estUnHoteDuSalon(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return HOTES_DU_SALON.some((re) => re.test(h));
}

// /{slug} : la page publique d'un Profil Pro. Un seul segment, en minuscules,
// qui n'est ni un nœud du Salon, ni une adresse réservée, ni une page pleine.
const SLUG_PUBLIC = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
export function slugProfilProDeLadresse(pathname: string): string | null {
  const chemin = pathname.replace(/\/$/, '') || '/';
  if (chemin === '/' || chemin.slice(1).includes('/')) return null;
  const slug = chemin.slice(1).toLowerCase();
  if (`/${slug}` in SLUG_TO_NODE || slug === 'alex' || slug === 'membre') return null;
  if (!SLUG_PUBLIC.test(slug) || RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

// Route model:
//   '/' & '/centre' → arts hub (the Patron/Creator choice)
//   '/createur'     → Le Créateur: opens CreatorStudio
//   '/mecene'       → Le Mécène: buyer menu
//   '/cafe'         → Café (platforms node)
// The old '/' Splitter (artist centre vs inn) was removed 2026-07-21:
// the family hub already separates Auberge / Salon / Dôme upstream.
const SLUG_TO_NODE: Record<string, string> = {
  '/centre':   'hub',
  '/cafe':     'platforms',
  '/createur': 'artist_hub',
  '/mecene':   'patron_hub',
};
const NODE_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_NODE).map(([slug, node]) => [node, slug]),
) as Record<string, string>;

// Title + description par section, pour que l'onglet et les partages nomment
// la bonne chose (le head statique ne connaît que le hub).
const NODE_META: Record<string, { title: string; description: string }> = {
  hub: {
    title: "Le Salon des Inconnus · Centre d'art contemporain · Outaouais",
    description:
      "Centre d'art à Namur, QC. Galerie, ateliers d'artistes, fiscalité de l'art (DPA), patronage et plateformes pour acheteurs et créateurs.",
  },
  artist_hub: {
    title: 'Creator Studio · Le Salon des Inconnus',
    description:
      "Le studio des créateurs du Salon des Inconnus : profil d'artiste, collaborations, outils de production, lectures et clavardage.",
  },
  patron_hub: {
    title: 'Le Mécène · Le Salon des Inconnus',
    description:
      "Acheter et soutenir l'art autrement : patronage, fiscalité de l'art (DPA) et œuvres du Salon des Inconnus.",
  },
  platforms: {
    title: 'Le Café · Le Salon des Inconnus',
    description: 'Les plateformes et projets numériques du Salon des Inconnus.',
  },
};

function normalize(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/';
}
function pathToNode(pathname: string): string {
  return SLUG_TO_NODE[normalize(pathname)] ?? 'hub';
}

// La fiche publique d'un membre : /membre/{uid} (adresse canon) ou, pour ne
// pas casser le lien « Voir le dossier » déjà en place dans l'onglet ROSTER
// du Creator Studio, /membre?uid={uid}. Les deux mènent à la même page.
function membreUidDeLadresse(pathname: string, search: string): string | null {
  const chemin = normalize(pathname);
  const segment = chemin.match(/^\/membre\/([^/]+)$/);
  if (segment) return decodeURIComponent(segment[1]);
  if (chemin === '/membre') {
    const uid = new URLSearchParams(search).get('uid');
    if (uid) return uid;
  }
  return null;
}

export default function App() {
  const [target, setTarget] = useState<string>(() => pathToNode(window.location.pathname));

  useEffect(() => {
    // Keep the canonical slug in the bar when landing on the old splitter URL.
    if (normalize(window.location.pathname) === '/') {
      window.history.replaceState({}, '', '/centre');
    }
    const onPop = () => setTarget(pathToNode(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    // La page d'artiste pose son propre titre : ne pas l'ecraser.
    if (normalize(window.location.pathname) === '/alex') return;
    const meta = NODE_META[target] ?? NODE_META.hub;
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', meta.description);
  }, [target]);

  const onNodeChange = useCallback((node: string) => {
    const slug = NODE_TO_SLUG[node];
    if (!slug) return; // node not in our slug table: leave URL alone
    // Sans passer par setTarget : changer initialTargetNode rejouerait la
    // navigation dans ArtsPage. On met le head à jour directement.
    const meta = NODE_META[node] ?? NODE_META.hub;
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
    if (normalize(window.location.pathname) === slug) return;
    window.history.pushState({}, '', slug);
  }, []);

  // Un domaine personnel d'artiste (Profil Pro) branché sur ce site : la page
  // rend son profil directement, sans passer par le graphe du Salon.
  if (!estUnHoteDuSalon(window.location.hostname)) {
    return (
      <ProfilProPage
        hostname={window.location.hostname.toLowerCase()}
        language="FR"
        onNavigateHome={() => window.location.assign('https://inconnus-salon.web.app/centre')}
        site="atelier"
      />
    );
  }

  // Page d'artiste d'Alex : une page pleine, hors du graphe d'ArtsPage.
  if (normalize(window.location.pathname) === '/alex') {
    return <AlexPage />;
  }

  // /{slug} : la page publique d'un Profil Pro (gabarit selon le type
  // d'artiste), une page pleine comme /alex.
  const slugPro = slugProfilProDeLadresse(window.location.pathname);
  if (slugPro) {
    return (
      <ProfilProPage
        slug={slugPro}
        language="FR"
        onNavigateHome={() => { window.history.pushState({}, '', '/centre'); window.location.reload(); }}
      />
    );
  }

  // La fiche publique d'un membre du réseau social d'artistes : une page
  // pleine, hors du graphe d'ArtsPage, comme /alex ci-dessus.
  const membreUid = membreUidDeLadresse(window.location.pathname, window.location.search);
  if (membreUid) {
    return <PageMembre uid={membreUid} language="FR" />;
  }

  return (
    <ArtsPage
      language="FR"
      initialTargetNode={target}
      onNodeChange={onNodeChange}
    />
  );
}
