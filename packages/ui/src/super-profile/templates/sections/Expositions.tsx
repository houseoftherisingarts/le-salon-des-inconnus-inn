// Expositions : passées et à venir, séparées en deux colonnes sur grand
// écran pour que « à venir » saute aux yeux sans qu'il faille défiler.

import * as React from 'react';
import { useTexte } from '../shared';
import { CARD_GLASS, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const ExpositionsSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const expos = config.expositions ?? [];
    if (!sectionVisible(config, 'expositions') || expos.length === 0) return null;
    const aVenir = expos.filter((e) => e.aVenir);
    const passees = expos.filter((e) => !e.aVenir);

    const Colonne: React.FC<{ titre: string; items: typeof expos }> = ({ titre, items }) => (
        <div>
            <p className="es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-ink-2)] mb-4">{titre}</p>
            <ul className="space-y-4">
                {items.map((e, i) => (
                    <li key={`${e.titre}-${i}`} className={`p-5 ${CARD_GLASS}`}>
                        <p className="es-display text-[color:var(--es-ink)] text-lg leading-snug">{e.titre}</p>
                        <p className="es-body text-sm text-[color:var(--es-ink-2)] mt-1">{e.lieu}</p>
                        <p className="es-body text-[13px] text-[color:var(--es-ink-2)] mt-1">{e.dates}</p>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <SectionShell eyebrowEn="Exhibitions" eyebrowFr="Expositions" language={language} id="expositions" tone="graphite">
            <SectionTitle>{t('Where the work has hung', 'Où l’œuvre a été accrochée')}</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {aVenir.length > 0 && <Colonne titre={t('Upcoming', 'À venir')} items={aVenir} />}
                {passees.length > 0 && <Colonne titre={t('Past', 'Passées')} items={passees} />}
            </div>
        </SectionShell>
    );
};
