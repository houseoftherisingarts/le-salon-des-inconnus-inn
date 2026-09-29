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
            <div className={`grid md:grid-cols-12 gap-6 md:gap-10 p-6 md:p-10 ${CARD_GLASS}`}>
                <div className="md:col-span-5">
                    {atelier.ville && <p className="es-display text-[color:var(--es-ink)] text-2xl md:text-3xl leading-tight mb-4">{atelier.ville}</p>}
                    <p className="es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-accent)]">
                        {atelier.visitesSurRendezVous
                            ? t('Visits by appointment', 'Visites sur rendez-vous')
                            : t('Not open for visits', 'Pas ouvert aux visites pour le moment')}
                    </p>
                </div>
                {atelier.note && <p className="md:col-span-7 es-body text-[color:var(--es-ink-2)] text-lg leading-relaxed">{atelier.note}</p>}
            </div>
        </SectionShell>
    );
};
