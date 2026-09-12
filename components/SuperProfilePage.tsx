// SuperProfilePage : la page publique d'un artiste à /{username} sur le site
// de l'auberge. Depuis septembre 2026, c'est le Profil Pro du Creator Studio
// (gabarit selon le type d'artiste, sections, rendez-vous) qui se rend ici :
// la page résout le slug, écoute la configuration et pose ses propres balises.
//
// Montée comme « view » de premier niveau depuis App.tsx, sans SiteHeader ni
// contrôles de musique : visiter /{nom}, c'est entrer dans la pièce de
// l'artiste, pas dans le Salon avec une bannière au-dessus.

import React from 'react';
import { ProfilProPage } from '@inconnus/ui';

interface SuperProfilePageProps {
    /** Le slug de l'adresse, déjà normalisé en minuscules par App.tsx. */
    slug: string;
    /** Retour à l'auberge. */
    onNavigateHome: () => void;
}

export const SuperProfilePage: React.FC<SuperProfilePageProps> = ({ slug, onNavigateHome }) => (
    <ProfilProPage slug={slug} language="FR" onNavigateHome={onNavigateHome} site="auberge" />
);
