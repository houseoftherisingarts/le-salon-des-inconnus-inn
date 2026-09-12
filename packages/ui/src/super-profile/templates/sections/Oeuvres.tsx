// Oeuvres : le mur de galerie du Profil Pro. Chaque pièce porte sa fiche
// (technique, dimensions, année, prix) et se révèle au survol comme au
// toucher, pour que la fiche existe aussi sur mobile sans second geste.

import * as React from 'react';
import type { OeuvreProfilPro } from '../../types';
import { useTexte } from '../shared';
import { CARD_GLASS, formatPrixCents, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

const StatutBadge: React.FC<{ oeuvre: OeuvreProfilPro; language: 'EN' | 'FR' }> = ({ oeuvre, language }) => {
    const t = useTexte(language);
    if (oeuvre.statutVente === 'vendu') {
        return <span className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-400">{t('Sold', 'Vendu')}</span>;
    }
    if (oeuvre.statutVente === 'sur-demande') {
        return <span className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-[#c5a059]">{t('On request', 'Sur demande')}</span>;
    }
    if (typeof oeuvre.prixCents === 'number' && oeuvre.prixCents > 0) {
        return <span className="font-lato text-sm text-[#c5a059]">{formatPrixCents(oeuvre.prixCents)}</span>;
    }
    return null;
};

const Carte: React.FC<{ oeuvre: OeuvreProfilPro; language: 'EN' | 'FR' }> = ({ oeuvre, language }) => {
    const [ouvert, setOuvert] = React.useState(false);
    const details = [oeuvre.technique, oeuvre.dimensions, oeuvre.annee].filter(Boolean).join(' · ');
    return (
        <figure
            className={`group relative overflow-hidden ${CARD_GLASS}`}
            onPointerEnter={() => setOuvert(true)}
            onPointerLeave={() => setOuvert(false)}
            onClick={() => setOuvert((v) => !v)}
        >
            <div className="aspect-[4/5] overflow-hidden">
                <img
                    src={oeuvre.url}
                    alt={oeuvre.titre || oeuvre.caption || ''}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            </div>
            <figcaption
                className={`absolute inset-x-0 bottom-0 p-4 md:p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
                    ouvert ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
            >
                {oeuvre.titre && <p className="font-prata text-[#f3e5ab] text-lg leading-tight mb-1">{oeuvre.titre}</p>}
                {details && <p className="font-lato text-[13px] text-neutral-300 mb-1">{details}</p>}
                <StatutBadge oeuvre={oeuvre} language={language} />
            </figcaption>
        </figure>
    );
};

export const OeuvresSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const oeuvres = config.oeuvres ?? [];
    if (!sectionVisible(config, 'oeuvres') || oeuvres.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Works" eyebrowFr="Œuvres" language={language} id="oeuvres">
            <SectionTitle>{t('The gallery wall', 'Le mur de galerie')}</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {oeuvres.map((o, i) => (
                    <Carte key={`${o.storagePath}-${i}`} oeuvre={o} language={language} />
                ))}
            </div>
        </SectionShell>
    );
};
