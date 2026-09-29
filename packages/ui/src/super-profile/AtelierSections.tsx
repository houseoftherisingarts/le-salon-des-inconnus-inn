// AtelierSections : allumer, éteindre et ordonner les sections de l'espace.
// Chaque ligne porte son interrupteur et deux flèches; tout s'écrit au clic.
// Le hero reste en tête et le pied de page en queue, hors de cette liste.

import * as React from 'react';
import { familleGabarit, sectionsParDefaut } from './artistes';
import { deplacer, ordreSections } from './ordre';
import type { ArtistType, SectionId, SectionsConfig, SuperProfileConfig } from './types';
import { AIDE, BoutonFleche, EtatEcriture, useEcritureImmediate } from './atelierCommun';

export const SECTIONS_ETIQUETTES: Record<SectionId, { en: string; fr: string }> = {
    oeuvres: { en: 'Works', fr: 'Œuvres' },
    ecoute: { en: 'Listen', fr: 'Écoute' },
    dates: { en: 'Dates', fr: 'Dates' },
    presse: { en: 'Press', fr: 'Presse' },
    expositions: { en: 'Exhibitions', fr: 'Expositions' },
    livres: { en: 'Books', fr: 'Livres' },
    bio: { en: 'About', fr: 'Démarche' },
    atelier: { en: 'Studio', fr: 'Atelier' },
    rendezvous: { en: 'Appointment', fr: 'Rendez-vous' },
    boutique: { en: 'Shop', fr: 'Boutique' },
    contact: { en: 'Contact', fr: 'Contact' },
    liens: { en: 'Links', fr: 'Liens' },
    series: { en: 'Series', fr: 'Séries' },
    tarifs: { en: 'Rates', fr: 'Tarifs' },
    extraits: { en: 'Excerpts', fr: 'Extraits' },
    evenements: { en: 'Events', fr: 'Événements' },
    pied: { en: 'Footer', fr: 'Pied de page' },
};

interface Props {
    uid: string;
    config: SuperProfileConfig;
    type: ArtistType;
    language?: 'EN' | 'FR';
}

export const AtelierSections: React.FC<Props> = ({ uid, config, type, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const famille = familleGabarit(type);
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [sections, setSections] = React.useState<SectionsConfig>(config.sections ?? sectionsParDefaut(type));
    const [ordre, setOrdre] = React.useState<SectionId[]>(ordreSections(config, famille));

    React.useEffect(() => {
        setSections(config.sections ?? sectionsParDefaut(type));
        setOrdre(ordreSections(config, famille));
    }, [config.sections, config.ordre, type, famille]);

    const basculer = (id: SectionId) => {
        const suivant = { ...sections, [id]: sections[id] === false };
        setSections(suivant);
        void ecrire({ sections: suivant });
    };
    const bouger = (id: SectionId, sens: -1 | 1) => {
        const suivant = deplacer(ordre, id, sens);
        if (suivant === ordre) return;
        setOrdre(suivant);
        void ecrire({ ordre: suivant, ...(config.sections ? {} : { sections }) });
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-2">
                <span className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-400">
                    {t('Sections and order', 'Sections et ordre')}
                </span>
                <EtatEcriture etat={etat} language={language} />
            </div>
            <p className={`${AIDE} mb-3`}>
                {t('The cover stays on top and the footer at the bottom.', 'La couverture reste en tête et le pied de page tout en bas.')}
            </p>
            <ol className="space-y-2" data-atelier-sections>
                {ordre.map((id, i) => {
                    const allumee = sections[id] !== false;
                    const nom = language === 'FR' ? SECTIONS_ETIQUETTES[id].fr : SECTIONS_ETIQUETTES[id].en;
                    return (
                        <li key={id} className={`flex items-center gap-2 px-3 py-2 rounded-[10px] border transition-colors ${allumee ? 'border-[#c5a059]/40 bg-[#c5a059]/[0.06]' : 'border-white/10'}`}>
                            <span className="font-cinzel text-[13px] text-neutral-500 w-6 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                            <span className={`flex-1 font-lato text-sm ${allumee ? 'text-[#f3e5ab]' : 'text-neutral-500'}`}>{nom}</span>
                            <BoutonFleche sens="haut" disabled={i === 0} onClick={() => bouger(id, -1)} label={t(`Move ${nom} up`, `Monter ${nom}`)} />
                            <BoutonFleche sens="bas" disabled={i === ordre.length - 1} onClick={() => bouger(id, 1)} label={t(`Move ${nom} down`, `Descendre ${nom}`)} />
                            <button
                                type="button"
                                role="switch"
                                aria-checked={allumee}
                                aria-label={nom}
                                onClick={() => basculer(id)}
                                className={`relative ml-1 w-12 h-7 shrink-0 rounded-full border transition-colors ${allumee ? 'bg-[#c5a059] border-[#c5a059]' : 'bg-black/40 border-white/20'}`}
                            >
                                <span className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all ${allumee ? 'left-[24px] bg-[#050505]' : 'left-[3px] bg-neutral-400'}`} />
                            </button>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};
