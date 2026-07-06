import { useEffect, useState, useCallback } from 'react';
import { ArtsPage } from '@inconnus/ui';
import Splitter from './Splitter';

// Route model:
//   '/'          → Splitter (front door: artist centre vs inn)
//   '/centre'    → arts hub (was '/'); the Patron/Creator choice
//   '/createur'  → Le Créateur — opens CreatorStudio
//   '/mecene'    → Le Mécène — buyer menu
//   '/cafe'      → Café (platforms node)
// Deep links to the arts slugs bypass the splitter.
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
function isSplitter(pathname: string): boolean {
  return normalize(pathname) === '/';
}

export default function App() {
  const [onSplitter, setOnSplitter] = useState<boolean>(() => isSplitter(window.location.pathname));
  const [target, setTarget] = useState<string>(() => pathToNode(window.location.pathname));

  useEffect(() => {
    const onPop = () => {
      setOnSplitter(isSplitter(window.location.pathname));
      setTarget(pathToNode(window.location.pathname));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const enterArts = useCallback(() => {
    window.history.pushState({}, '', '/centre');
    setTarget('hub');
    setOnSplitter(false);
  }, []);

  const onNodeChange = useCallback((node: string) => {
    const slug = NODE_TO_SLUG[node];
    if (!slug) return; // node not in our slug table — leave URL alone
    if (normalize(window.location.pathname) === slug) return;
    window.history.pushState({}, '', slug);
  }, []);

  if (onSplitter) {
    return <Splitter onEnterArts={enterArts} />;
  }

  return (
    <ArtsPage
      language="FR"
      initialTargetNode={target}
      onNodeChange={onNodeChange}
    />
  );
}
