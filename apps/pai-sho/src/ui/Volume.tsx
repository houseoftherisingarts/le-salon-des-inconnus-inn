// ─── Le volume de la musique ────────────────────────────────────────

import { useState } from 'react';
import { reglerVolume, volumeSauve } from '../audio';

export default function Volume({ etiquette }: { etiquette: string }) {
  const [v, setV] = useState(volumeSauve);
  return (
    <input
      className="volume" type="range" min={0} max={1} step={0.05} value={v}
      aria-label={etiquette} title={etiquette}
      onChange={(e) => { const n = Number(e.target.value); setV(n); reglerVolume(n); }}
    />
  );
}
