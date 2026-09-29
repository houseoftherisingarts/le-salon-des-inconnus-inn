// PhotoHero : l'ouverture du gabarit Photographe, une photo plein écran vue
// à travers le viseur.
//
// Entrée en matière : l'obturateur est fermé, deux volets couvrent l'écran,
// puis ils s'ouvrent (un peu plus d'une seconde) sur la photo, qui avance
// lentement. Les coins du viseur et la ligne technique (ouverture, vitesse,
// numéro de vue) cadrent l'image. Le premier défilement assombrit la photo
// et fait monter le nom. Sous prefers-reduced-motion, l'obturateur est ouvert
// d'emblée et la photo reste immobile.

import * as React from 'react';
import type { SuperProfileConfig } from '../../types';
import { BackToSalonLink, SocialLinks, useTexte } from '../shared';
import { sectionVisible } from './common';
import { seriesDe } from './Series';

const STYLE_HERO = `
@keyframes es-volet-haut{from{transform:none;}to{transform:translateY(-101%);}}
@keyframes es-volet-bas{from{transform:none;}to{transform:translateY(101%);}}
@keyframes es-lent{from{transform:scale(1.12);}to{transform:scale(1.02);}}
@keyframes es-coin{from{opacity:0;transform:scale(1.25);}to{opacity:1;transform:none;}}
.es-volet-haut{animation:es-volet-haut .9s cubic-bezier(.7,0,.2,1) .35s both;}
.es-volet-bas{animation:es-volet-bas .9s cubic-bezier(.7,0,.2,1) .35s both;}
.es-photo-lente{animation:es-lent 9s cubic-bezier(.2,.6,.2,1) .3s both;}
.es-coin{animation:es-coin .8s cubic-bezier(.2,.7,.2,1) 1s both;}
@media (prefers-reduced-motion: reduce){.es-volet-haut,.es-volet-bas{display:none;}.es-photo-lente{animation:none;transform:none;}}
`;

const Coin: React.FC<{ className: string }> = ({ className }) => (
    <span aria-hidden className={`es-coin absolute w-8 h-8 md:w-12 md:h-12 border-[color:var(--es-accent)] ${className}`} />
);

interface Props {
    config: SuperProfileConfig;
    fallbackDisplayName?: string;
    language?: 'EN' | 'FR';
}

export const PhotoHero: React.FC<Props> = ({ config, fallbackDisplayName, language = 'FR' }) => {
    const t = useTexte(language);
    const nom = config.displayName || fallbackDisplayName || config.username;
    const series = seriesDe(config);
    const photo = series[0]?.photos[0]?.url ?? config.hero?.url;
    const total = series.reduce((n, s) => n + s.photos.length, 0);
    const rdv = sectionVisible(config, 'rendezvous');
    const racineRef = React.useRef<HTMLElement>(null);

    // Premier défilement : la photo s'assombrit, le nom monte.
    React.useEffect(() => {
        const el = racineRef.current;
        if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0;
        const maj = () => {
            raf = 0;
            el.style.setProperty('--es-allumage', Math.min(1, window.scrollY / (window.innerHeight * 0.7)).toFixed(3));
        };
        const surDefilement = () => { if (!raf) raf = requestAnimationFrame(maj); };
        window.addEventListener('scroll', surDefilement, { passive: true });
        maj();
        return () => { window.removeEventListener('scroll', surDefilement); cancelAnimationFrame(raf); };
    }, []);

    return (
        <header
            ref={racineRef}
            className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[color:var(--es-bg)] text-[color:var(--es-ink)]"
            style={{ ['--es-allumage' as string]: '0' } as React.CSSProperties}
        >
            <style>{STYLE_HERO}</style>
            <BackToSalonLink />

            {/* La photo, plein cadre. Le voile reprend le fond de la palette pour que le nom se lise. */}
            {photo ? (
                <div className="absolute inset-0" style={{ transform: 'translateY(calc(var(--es-allumage) * 8svh))' }}>
                    <img src={photo} alt="" className="es-photo-lente absolute inset-0 w-full h-full object-cover" />
                </div>
            ) : (
                <div className="absolute inset-0 bg-[color:var(--es-bg-2)]" />
            )}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(to top, color-mix(in srgb, var(--es-bg) 92%, transparent) 0%, color-mix(in srgb, var(--es-bg) 45%, transparent) 38%, color-mix(in srgb, var(--es-bg) 8%, transparent) 70%, color-mix(in srgb, var(--es-bg) 30%, transparent) 100%)',
                }}
            />
            <div aria-hidden className="absolute inset-0 pointer-events-none bg-[color:var(--es-bg)]" style={{ opacity: 'calc(var(--es-allumage) * 0.55)' }} />

            {/* Le viseur. */}
            <div aria-hidden className="absolute inset-5 md:inset-10 pointer-events-none">
                <Coin className="left-0 top-0 border-l-2 border-t-2" />
                <Coin className="right-0 top-0 border-r-2 border-t-2" />
                <Coin className="left-0 bottom-0 border-l-2 border-b-2" />
                <Coin className="right-0 bottom-0 border-r-2 border-b-2" />
                <div className="es-coin absolute right-5 md:right-8 top-16 md:top-6 flex items-center gap-4 es-label text-[13px] tracking-[0.2em] tabular-nums text-[color:var(--es-ink)]">
                    <span className="w-2 h-2 rounded-full bg-[color:var(--es-accent)] animate-pulse" />
                    <span>f/2.8</span>
                    <span>1/250</span>
                    {total > 0 && <span className="hidden sm:inline">{String(total).padStart(3, '0')}</span>}
                </div>
            </div>

            {/* Le nom et les gestes, en bas à gauche du cadre. */}
            <div
                className="absolute inset-x-0 bottom-0 z-10 px-8 md:px-20 pb-16 md:pb-20"
                style={{ transform: 'translateY(calc(var(--es-allumage) * -40px))' }}
            >
                <div className="max-w-[1480px] mx-auto">
                    <p className="es-label es-monte text-[13px] uppercase tracking-[0.45em] text-[color:var(--es-accent)] mb-5" style={{ animationDelay: '1s' }}>
                        {t('Photography · Series · Sessions', 'Photographie · Séries · Séances')}
                    </p>
                    <h1
                        className="es-display es-monte leading-[0.95] tracking-tight line-clamp-2 max-w-[14ch]"
                        style={{ fontSize: 'clamp(3rem, 8vw, 8rem)', animationDelay: '1.1s', textWrap: 'balance' } as React.CSSProperties}
                    >
                        {nom}
                    </h1>
                    {config.tagline && (
                        <p className="es-body es-monte mt-6 max-w-xl text-lg md:text-xl leading-relaxed text-[color:var(--es-ink-2)]" style={{ animationDelay: '1.2s' }}>
                            {config.tagline}
                        </p>
                    )}
                    <div className="es-monte mt-9 flex flex-wrap items-center gap-3 md:gap-4" style={{ animationDelay: '1.35s' }}>
                        {series.length > 0 && (
                            <a
                                href="#series"
                                className="inline-flex items-center gap-3 min-h-[52px] px-7 rounded-full bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.25em] hover:brightness-110 transition"
                            >
                                {t('See the series', 'Voir les séries')}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                            </a>
                        )}
                        {rdv && (
                            <a href="#rendezvous" className="es-verre inline-flex items-center gap-3 min-h-[52px] px-6 es-label text-[13px] uppercase tracking-[0.25em] hover:border-[color:var(--es-accent)] transition-colors">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
                                </svg>
                                {t('Book a session', 'Réserver une séance')}
                            </a>
                        )}
                    </div>
                    <SocialLinks links={config.links} className="es-monte mt-7" />
                </div>
            </div>

            {/* L'obturateur : le préchargeur. */}
            <div aria-hidden className="es-volet-haut absolute inset-x-0 top-0 h-1/2 z-40 bg-[color:var(--es-bg)] border-b border-[color:var(--es-edge)] pointer-events-none" />
            <div aria-hidden className="es-volet-bas absolute inset-x-0 bottom-0 h-1/2 z-40 bg-[color:var(--es-bg)] border-t border-[color:var(--es-edge)] pointer-events-none" />
        </header>
    );
};
