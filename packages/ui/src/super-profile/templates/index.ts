// templates/index.ts : le pont entre un type d'artiste et le composant React
// qui le rend. artistes.ts sait déjà quelle FAMILLE de gabarit sert un type
// (familleGabarit) ; ici, la famille devient un vrai composant.

import type * as React from 'react';
import type { ArtistType } from '../types';
import { familleGabarit } from '../artistes';
import type { TemplateProps } from './shared';
import { PeintreTemplate } from './PeintreTemplate';
import { MusicienTemplate } from './MusicienTemplate';
import { PhotoTemplate } from './PhotoTemplate';
import { EditorialTemplate } from './EditorialTemplate';

/** Le composant à monter pour un type d'artiste donné. */
export function gabaritPour(type: ArtistType): React.FC<TemplateProps> {
    switch (familleGabarit(type)) {
        case 'peintre': return PeintreTemplate;
        case 'musicien': return MusicienTemplate;
        case 'photographe': return PhotoTemplate;
        case 'ecrivain':
        default: return EditorialTemplate;
    }
}

export { PeintreTemplate } from './PeintreTemplate';
export { MusicienTemplate } from './MusicienTemplate';
export { PhotoTemplate } from './PhotoTemplate';
export { VisualArtTemplate } from './VisualArtTemplate';
export { EditorialTemplate } from './EditorialTemplate';
export * from './sections';
export type { TemplateProps } from './shared';
