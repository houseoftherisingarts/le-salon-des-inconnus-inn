// common.tsx : le shell partagé par toutes les sections du Profil Pro, et
// les petits utilitaires (formatage, garde d'affichage) qu'elles réutilisent
// toutes. Chaque section vit dans son propre fichier pour rester lisible,
// mais elles doivent former une seule page qui défile sans à-coup : même
// grille, même respiration verticale, même vocabulaire typographique.

import * as React from 'react';
import type { SectionId, SuperProfileConfig } from '../../types';
import { useTexte, type TemplateProps } from '../shared';

export type SectionProps = TemplateProps;

/** Une section ne se rend que si l'artiste ne l'a pas explicitement éteinte. */
export function sectionVisible(config: SuperProfileConfig, id: SectionId): boolean {
    return config.sections?.[id] !== false;
}

interface SectionShellProps {
    id?: string;
    eyebrowEn: string;
    eyebrowFr: string;
    language?: 'EN' | 'FR';
    /** Fond légèrement différent pour alterner le rythme entre deux sections. */
    tone?: 'noir' | 'graphite';
    children: React.ReactNode;
    /** Contenu de droite, aligné avec le titre (ex. un bouton). */
    aside?: React.ReactNode;
}

/**
 * L'ossature commune : plein écran en largeur, contenu tenu dans une mesure
 * de lecture, étiquette Cinzel puis titre Prata. Jamais de bloc central
 * flottant dans du vide : le fond va d'un bord à l'autre, seul le texte se
 * tient sur une colonne confortable.
 */
export const SectionShell: React.FC<SectionShellProps> = ({
    id, eyebrowEn, eyebrowFr, language = 'FR', tone = 'noir', children, aside,
}) => {
    const t = useTexte(language);
    return (
        <section
            id={id}
            className={`relative w-full border-t border-white/10 px-6 md:px-14 py-16 md:py-24 ${
                tone === 'graphite' ? 'bg-[#0a0908]' : 'bg-[#050505]'
            }`}
        >
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-14">
                    <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
                        {t(eyebrowEn, eyebrowFr)}
                    </p>
                    {aside}
                </div>
                {children}
            </div>
        </section>
    );
};

/** Titre de section, en Prata, jamais plus de deux lignes visuelles (canon). */
export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl leading-[1.1] mb-10 md:mb-14 max-w-3xl -mt-6">
        {children}
    </h2>
);

/** 100,00 $ en cents → "100 $" (ou "100,50 $" si des sous existent). */
export function formatPrixCents(cents: number): string {
    const dollars = cents / 100;
    const arrondi = Math.round(dollars * 100) / 100;
    const texte = Number.isInteger(arrondi)
        ? arrondi.toLocaleString('fr-CA')
        : arrondi.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${texte} $`;
}

export function formatDateCourte(iso: string, language: 'EN' | 'FR' = 'FR'): string {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
}

/** Glassmorphism du canon : verre translucide, coins 15px, filet clair. */
export const CARD_GLASS = 'bg-black/40 backdrop-blur-md border border-white/15 rounded-[15px]';
