// VisualArtTemplate: painter / illustrator / sculptor Mind Palace.
//
// Three layers, back-to-front, puis les sections du Profil Pro en dessous :
//   1. Works scattered as a "wall of sketches", each rotated and offset
//      deterministically so the composition is stable on every render.
//   2. Huge name flowing right-to-left, partially obscured by the cutout.
//   3. Artist cutout, centered.
//
// `fixed inset-0` devient `relative min-h-screen` : ce premier écran n'est
// plus toute la page, les sections communes défilent en dessous.

import * as React from 'react';
import { ArtistCutout, BackToSalonLink, useTexte, type TemplateProps } from './shared';
import { BottomDock, NameLayer, WorkCountChip, deterministicTransform } from './stage';
import { BioSection, ContactSection, LiensSection, OeuvresSection, PiedDePageSection, PriseRendezVousSection } from './sections';

export const VisualArtTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const t = useTexte(language);
    const works = config.works ?? [];
    const displayName = config.displayName || fallbackDisplayName || config.username;

    return (
        <>
        <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden font-lato">
            <BackToSalonLink />

            {/* Ambient washes so the dark canvas doesn't read as a void */}
            <div aria-hidden className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[55%] h-[55%] bg-[#c5a059]/15 rounded-full blur-[150px]" />
                <div className="absolute -bottom-[15%] -right-[15%] w-[55%] h-[55%] bg-fuchsia-500/10 rounded-full blur-[160px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
            </div>

            {/* ── Layer 1 · Back: scattered works wall ──────────────────── */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {works.map((w, i) => {
                    const { x, y, rot } = deterministicTransform(i + 1);
                    const size = 18 + ((i * 7) % 12); // 18..29 vw
                    return (
                        <figure
                            key={`${w.storagePath}-${i}`}
                            className="absolute top-1/2 left-1/2 origin-center pointer-events-auto group"
                            style={{
                                transform: `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh)) rotate(${rot}deg)`,
                                width: `${size}vw`,
                                maxWidth: '320px',
                                minWidth: '160px',
                            }}
                        >
                            <div className="relative bg-[#0a0a0a] p-2 shadow-2xl border border-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0 group-hover:z-30">
                                <img
                                    src={w.url}
                                    alt={w.caption || `Work ${i + 1}`}
                                    className="block w-full h-auto"
                                    loading="lazy"
                                />
                                {w.caption && (
                                    <figcaption className="absolute -bottom-6 left-0 right-0 text-center font-lato text-neutral-400 text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">
                                        {w.caption}
                                    </figcaption>
                                )}
                            </div>
                        </figure>
                    );
                })}
            </div>

            {/* ── Layer 2 · Middle: name flowing right-to-left ─────────── */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <NameLayer name={displayName} tagline={config.tagline} medium={config.medium} />
            </div>

            {/* ── Layer 3 · Front: artist cutout ────────────────────────── */}
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <ArtistCutout
                    src={config.hero?.url}
                    alt={displayName}
                    className="max-h-[88vh] max-w-[44vw]"
                />
            </div>

            <BottomDock config={config} />
            <WorkCountChip count={works.length} />

            <a
                href="#contenu"
                aria-label={t('Scroll to see more', 'Faire défiler pour en voir plus')}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 text-neutral-400 hover:text-[#c5a059] transition-colors animate-bounce"
            >
                <span className="font-cinzel text-[13px] uppercase tracking-[0.4em]">{t('Scroll', 'Défiler')}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M12 4v16M6 14l6 6 6-6" />
                </svg>
            </a>
        </div>

        <div id="contenu" className="bg-[#050505]">
            <OeuvresSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            <BioSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            <PriseRendezVousSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            <ContactSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            <LiensSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            <PiedDePageSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
        </div>
        </>
    );
};
