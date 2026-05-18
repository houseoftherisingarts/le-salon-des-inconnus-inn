import { useEffect, useState, useCallback } from 'react';
import { ArtsPage } from '@inconnus/ui';

// FR URL slug ↔ ArtsPage internal node ID. Bidirectional:
//   - read pathname on mount → seed initialTargetNode
//   - listen to popstate so the back button works
//   - on every internal nav, push the matching slug to history
const SLUG_TO_NODE: Record<string, string> = {
  '/':          'hub',
  '/cafe':      'platforms',  // Café (replaced Atelier Numérique)
  '/createur':  'artist_hub', // Le Créateur — opens CreatorStudio
  '/mecene':    'patron_hub', // Le Mécène — opens the buyer menu
};
const NODE_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_NODE).map(([slug, node]) => [node, slug]),
) as Record<string, string>;

function pathToNode(pathname: string): string {
  const trimmed = pathname.replace(/\/$/, '') || '/';
  return SLUG_TO_NODE[trimmed] ?? 'hub';
}

export default function App() {
  const [target, setTarget] = useState<string>(() => pathToNode(window.location.pathname));

  useEffect(() => {
    const onPop = () => setTarget(pathToNode(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const onNodeChange = useCallback((node: string) => {
    const slug = NODE_TO_SLUG[node];
    if (!slug) return; // node not in our slug table — leave URL alone
    if (slug === window.location.pathname.replace(/\/$/, '') || (slug === '/' && window.location.pathname === '/')) return;
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
