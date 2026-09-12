// Hero : l'écran d'ouverture des gabarits Peintre et Musicien. Reprend les
// trois couches des gabarits d'origine (fond, nom géant, découpe), mais en
// `relative` plutôt qu'en `fixed` : le gabarit est un vrai site qui défile,
// le hero n'est plus qu'un premier écran, pas toute la page.

import * as React from 'react';
import type { SuperProfileConfig } from '../../types';
import { ArtistCutout, BackToSalonLink, useTexte } from '../shared';
import { BottomDock, NameLayer, WorkCountChip } from '../stage';

interface HeroSectionProps {
    config: SuperProfileConfig;
    fallbackDisplayName?: string;
    language?: 'EN' | 'FR';
    /** 'galerie' : ambiance de fin de journée, or sur noir (peintre, sculpteur,
     *  artisan, numérique). 'scene' : contrastes plus durs, avant le premier
     *  accord (musicien, scène, cinéaste). */
    ambiance: 'galerie' | 'scene';
    /** L'image de fond derrière le nom : la première œuvre, ou la photo de
     *  scène si l'artiste en a mis une comme "œuvre" d'ouverture. */
    fondUrl?: string;
    workCountLabel?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    config, fallbackDisplayName, language = 'FR', ambiance, fondUrl, workCountLabel,
}) => {
    const t = useTexte(language);
    const displayName = config.displayName || fallbackDisplayName || config.username;
    const count = (config.oeuvres ?? config.works ?? []).length;

    return (
        <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden font-lato">
            <BackToSalonLink />

            {/* ── Fond ────────────────────────────────────────────────── */}
            <div className="absolute inset-0 z-0">
                {fondUrl ? (
                    <img
                        src={fondUrl}
                        alt=""
                        aria-hidden
                        className={`absolute inset-0 w-full h-full object-cover ${ambiance === 'scene' ? 'grayscale-[20%] contrast-125' : 'opacity-70'}`}
                    />
                ) : (
                    <div
                        aria-hidden
                        className={
                            ambiance === 'galerie'
                                ? 'absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1208] to-[#050505]'
                                : 'absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#050505] to-[#0a0a0a]'
                        }
                    />
                )}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            ambiance === 'galerie'
                                ? 'radial-gradient(ellipse at center, rgba(5,5,5,0.25) 20%, rgba(5,5,5,0.78) 70%, rgba(5,5,5,0.96) 100%)'
                                : 'linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.35) 40%, rgba(5,5,5,0.9) 100%)',
                    }}
                />
            </div>

            {/* ── Nom géant ───────────────────────────────────────────── */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <NameLayer name={displayName} tagline={config.tagline} />
            </div>

            {/* ── Découpe ─────────────────────────────────────────────── */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <ArtistCutout src={config.hero?.url} alt={displayName} className="max-h-[86vh] max-w-[52vw]" />
            </div>

            <BottomDock config={config} />
            <WorkCountChip count={count} label={workCountLabel ?? t('works', 'œuvres')} />

            {/* Indice de défilement : le gabarit est une vraie page. */}
            <a
                href="#suite"
                aria-label={t('Scroll to see more', 'Faire défiler pour en voir plus')}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-neutral-400 hover:text-[#c5a059] transition-colors animate-bounce"
            >
                <span className="font-cinzel text-[9px] uppercase tracking-[0.4em]">{t('Scroll', 'Défiler')}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M12 4v16M6 14l6 6 6-6" />
                </svg>
            </a>
        </div>
    );
};
