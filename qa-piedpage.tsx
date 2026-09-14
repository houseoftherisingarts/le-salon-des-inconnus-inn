// QA temporaire, jamais committé : rend PiedDePageSection isolée pour capture.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PiedDePageSection } from './packages/ui/src/super-profile/templates/sections/PiedDePage';
import type { SuperProfileConfig } from './packages/ui/src/super-profile/types';

const config: SuperProfileConfig = {
  enabled: true,
  username: 'qa',
  medium: 'peinture' as any,
  works: [],
};

createRoot(document.getElementById('root')!).render(
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
    <PiedDePageSection config={config} language="FR" />
  </div>
);
