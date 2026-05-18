import { useEffect, useState, useCallback } from 'react';
import { ArtsPage } from '@inconnus/ui';

// EN URL slug ↔ ArtsPage internal node ID. Mirror of salon, English slugs.
const SLUG_TO_NODE: Record<string, string> = {
  '/':         'hub',
  '/cafe':     'platforms',  // Café
  '/creator':  'artist_hub',
  '/patron':   'patron_hub',
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
    if (!slug) return;
    if (slug === window.location.pathname.replace(/\/$/, '') || (slug === '/' && window.location.pathname === '/')) return;
    window.history.pushState({}, '', slug);
  }, []);

  return (
    <ArtsPage
      language="EN"
      initialTargetNode={target}
      onNodeChange={onNodeChange}
    />
  );
}
