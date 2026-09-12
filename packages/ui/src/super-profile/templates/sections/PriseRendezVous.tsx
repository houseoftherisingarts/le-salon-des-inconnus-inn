// PriseRendezVous (section) : encadre le widget réel dans l'ossature commune
// des sections. Ne se rend que si le Profil Pro fournit un uid (l'agenda
// vit sous members/{uid}/agenda) : sur un profil de base sans Profil Pro, la
// section reste éteinte.

import * as React from 'react';
import { useTexte } from '../shared';
import { PriseRendezVous as PriseRendezVousWidget } from '../../PriseRendezVous';
import { sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const PriseRendezVousSection: React.FC<SectionProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const t = useTexte(language);
    if (!sectionVisible(config, 'rendezvous') || !uid) return null;
    const nomArtiste = config.displayName || fallbackDisplayName || config.username;
    return (
        <SectionShell eyebrowEn="Appointment" eyebrowFr="Rendez-vous" language={language} id="rendezvous">
            <SectionTitle>{t(`Meet with ${nomArtiste}`, `Rencontrer ${nomArtiste}`)}</SectionTitle>
            <PriseRendezVousWidget artisteUid={uid} artisteNom={nomArtiste} language={language} />
        </SectionShell>
    );
};
