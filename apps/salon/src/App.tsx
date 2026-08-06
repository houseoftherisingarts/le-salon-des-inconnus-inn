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

  const onNodeChange = useCallback((node: string) => {
    const slug = NODE_TO_SLUG[node];
    if (!slug) return; // node not in our slug table — leave URL alone
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
