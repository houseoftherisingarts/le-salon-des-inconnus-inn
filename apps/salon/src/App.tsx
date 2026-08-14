import { useEffect, useState, useCallback } from 'react';
import { ArtsPage } from '@inconnus/ui';

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
    const meta = NODE_META[target] ?? NODE_META.hub;
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', meta.description);
  }, [target]);

  const onNodeChange = useCallback((node: string) => {
    const slug = NODE_TO_SLUG[node];
    if (!slug) return; // node not in our slug table: leave URL alone
    setTarget(node); // keep the tab title in sync (see NODE_META effect)
    if (normalize(window.location.pathname) === slug) return;
    window.history.pushState({}, '', slug);
  }, []);

  return (
    <ArtsPage
      language="FR"
      initialTargetNode={target}
      onNodeChange={onNodeChange}
    />
  );
}
