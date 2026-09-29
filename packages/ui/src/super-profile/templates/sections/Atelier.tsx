// Atelier : le lieu où l'artiste travaille, et si on peut le visiter.

import * as React from 'react';
import { useTexte } from '../shared';
import { CARD_GLASS, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const AtelierSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const atelier = config.atelier;
    if (!sectionVisible(config, 'atelier') || !atelier || (!atelier.ville && !atelier.note)) return null;
    return (
        <SectionShell eyebrowEn="Studio" eyebrowFr="Atelier" language={language} id="atelier">
            <SectionTitle>{t('The studio', 'L’atelier')}</SectionTitle>
            <div className={`max-w-xl p-6 md:p-8 ${CARD_GLASS}`}>
                {atelier.ville && <p className="es-display text-[color:var(--es-ink)] text-xl mb-2">{atelier.ville}</p>}
                {atelier.note && <p className="es-body text-[color:var(--es-ink-2)] leading-relaxed mb-4">{atelier.note}</p>}
                <p className="es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-accent)]">
                    {atelier.visitesSurRendezVous
                        ? t('Visits by appointment', 'Visites sur rendez-vous')
                        : t('Not open for visits', 'Pas ouvert aux visites pour le moment')}
                </p>
            </div>
        </SectionShell>
    );
};
