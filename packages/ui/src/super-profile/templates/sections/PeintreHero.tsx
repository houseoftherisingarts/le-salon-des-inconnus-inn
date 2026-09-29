// PeintreHero : l'ouverture du gabarit Peintre, une salle de galerie juste
// avant l'ouverture des portes.
//
// Entrée en matière : la salle est noire, puis l'éclairage s'allume sur la
// toile accrochée à droite (un peu plus d'une seconde). La toile porte son
// cartel, comme au musée. Le premier défilement monte la lumière d'un cran
// et fait reculer le nom. La toile d'ouverture est la première œuvre du mur;
// si elle a ses dimensions, un clic la pose à l'échelle dans une pièce.
// Sous prefers-reduced-motion, la lumière est allumée d'emblée.

import * as React from 'react';
import type { OeuvreProfilPro, SuperProfileConfig } from '../../types';
import { BackToSalonLink, SocialLinks, useTexte } from '../shared';
import { PieceEchelle, aDimensions, formatCm } from './PieceEchelle';
import { IconeRegle } from './MurOeuvres';

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/></svg>\")";

const STYLE_HERO = `
@keyframes es-noir{from{opacity:1;}to{opacity:0;}}
@keyframes es-allume{0%{filter:brightness(.12) saturate(.4);}55%{filter:brightness(.35) saturate(.6);}100%{filter:none;}}
@keyframes es-cone{from{opacity:0;transform:translateX(-50%) scaleY(.6);}to{opacity:1;transform:translateX(-50%);}}
.es-salle-noire{animation:es-noir .7s ease-out .45s both;}
.es-toile-hero{animation:es-allume 1.2s cubic-bezier(.3,0,.2,1) .25s both;}
.es-cone{transform-origin:top center;animation:es-cone 1.1s cubic-bezier(.2,.7,.2,1) .35s both;}
.es-racine{--es-lumiere:color-mix(in srgb, var(--es-ink) 16%, transparent);}
.es-racine[data-sombre="non"]{--es-lumiere:color-mix(in srgb, white 80%, transparent);}
@media (prefers-reduced-motion: reduce){.es-salle-noire{display:none;}}
`;

function prochaineExpo(config: SuperProfileConfig) {
    return (config.expositions ?? []).find((e) => e.aVenir);
}

interface Props {
    config: SuperProfileConfig;
    fallbackDisplayName?: string;
    language?: 'EN' | 'FR';
}

export const PeintreHero: React.FC<Props> = ({ config, fallbackDisplayName, language = 'FR' }) => {
    const t = useTexte(language);
    const nom = config.displayName || fallbackDisplayName || config.username;
    const toile: OeuvreProfilPro | undefined = config.oeuvres?.[0] ?? (config.works?.[0] ? { url: config.works[0].url, storagePath: config.works[0].storagePath, titre: config.works[0].caption } : undefined);
    const expo = prochaineExpo(config);
    const racineRef = React.useRef<HTMLElement>(null);
    const [echelle, setEchelle] = React.useState(false);
    const peutEchelle = !!toile && aDimensions(toile);
    const ratio = toile && peutEchelle ? toile.largeurCm! / toile.hauteurCm! : 0.8;

    // Premier défilement : la lumière monte, le nom recule.
    React.useEffect(() => {
        const el = racineRef.current;
        if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0;
        const maj = () => {
            raf = 0;
            el.style.setProperty('--es-allumage', Math.min(1, window.scrollY / (window.innerHeight * 0.6)).toFixed(3));
        };
        const surDefilement = () => { if (!raf) raf = requestAnimationFrame(maj); };
        window.addEventListener('scroll', surDefilement, { passive: true });
        maj();
        return () => { window.removeEventListener('scroll', surDefilement); cancelAnimationFrame(raf); };
    }, []);

    const cartel = toile && [toile.technique, peutEchelle ? formatCm(toile.largeurCm!, toile.hauteurCm!) : toile.dimensions].filter(Boolean).join(' · ');

    return (
        <header
            ref={racineRef}
            className="relative min-h-[100svh] overflow-hidden bg-[color:var(--es-bg)] text-[color:var(--es-ink)]"
            style={{ ['--es-allumage' as string]: '0' } as React.CSSProperties}
        >
            <style>{STYLE_HERO}</style>
            <BackToSalonLink />
            <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
            {/* La plinthe de la salle, un filet au bas de l'écran. */}
            <div aria-hidden className="absolute left-0 right-0 bottom-[9svh] h-px bg-[color:var(--es-line)]" />

            <div className="relative z-10 min-h-[100svh] max-w-[1480px] mx-auto px-6 md:px-14 pt-24 pb-24 md:pb-20 grid md:grid-cols-12 gap-10 md:gap-8 items-center">
                {/* La toile d'ouverture, sous son cône de lumière. */}
                {toile && (
                    <figure className="md:col-start-7 md:col-span-6 md:row-start-1 relative flex flex-col items-center">
                        <div
                            aria-hidden
                            className="es-cone absolute left-1/2 -top-24 w-[150%] h-[125%] pointer-events-none"
                            style={{
                                background: 'radial-gradient(ellipse 42% 60% at 50% 0%, var(--es-lumiere), transparent 72%)',
                                opacity: 'calc(0.75 + var(--es-allumage) * 0.25)',
                            }}
                        />
                        <button
                            type="button"
                            disabled={!peutEchelle}
                            onClick={() => setEchelle(true)}
                            aria-label={peutEchelle ? t('See the work to scale', 'Voir l’œuvre à l’échelle') : undefined}
                            className="es-toile-hero relative block disabled:cursor-default enabled:cursor-zoom-in"
                            style={{
                                width: `min(100%, calc(62svh * ${ratio}))`,
                                aspectRatio: String(ratio),
                                transform: 'scale(calc(1 + var(--es-allumage) * 0.035))',
                                boxShadow: '0 50px 90px -40px color-mix(in srgb, black 70%, transparent), 0 0 120px -20px var(--es-glow)',
                            }}
                        >
                            <img src={toile.url} alt={toile.titre || ''} className="absolute inset-0 w-full h-full object-cover" />
                        </button>
                        <figcaption className="es-monte mt-7 w-full max-w-md flex items-start justify-between gap-6 border-t border-[color:var(--es-line)] pt-4" style={{ animationDelay: '1.2s' }}>
                            <div className="min-w-0">
                                {toile.titre && <p className="es-display text-lg leading-snug">{toile.titre}{toile.annee ? `, ${toile.annee}` : ''}</p>}
                                {cartel && <p className="es-body text-[14px] text-[color:var(--es-ink-2)] mt-1">{cartel}</p>}
                            </div>
                            {peutEchelle && (
                                <button type="button" onClick={() => setEchelle(true)} className="shrink-0 inline-flex items-center gap-2 min-h-[44px] es-label text-[13px] uppercase tracking-[0.2em] text-[color:var(--es-accent)] hover:brightness-125">
                                    <IconeRegle className="w-4 h-4" />
                                    {t('To scale', 'À l’échelle')}
                                </button>
                            )}
                        </figcaption>
                    </figure>
                )}

                {/* Le nom, la ligne, les gestes. */}
                <div className={`${toile ? 'md:col-start-1 md:col-span-6 md:row-start-1' : 'md:col-span-10'} relative`} style={{ transform: 'translateY(calc(var(--es-allumage) * -28px))' }}>
                    <p className="es-label es-monte text-[13px] uppercase tracking-[0.45em] text-[color:var(--es-accent)] mb-6" style={{ animationDelay: '.9s' }}>
                        {t('Works · Exhibitions · Studio', 'Œuvres · Expositions · Atelier')}
                    </p>
                    <h1
                        className="es-display es-monte leading-[0.95] tracking-tight line-clamp-2"
                        style={{ fontSize: 'clamp(3rem, 7.4vw, 7.5rem)', animationDelay: '1s', textWrap: 'balance' } as React.CSSProperties}
                    >
                        {nom}
                    </h1>
                    {config.tagline && (
                        <p className="es-body es-monte mt-7 max-w-lg text-lg md:text-xl leading-relaxed text-[color:var(--es-ink-2)]" style={{ animationDelay: '1.15s' }}>
                            {config.tagline}
                        </p>
                    )}
                    <div className="es-monte mt-10 flex flex-wrap items-center gap-3 md:gap-4" style={{ animationDelay: '1.3s' }}>
                        <a
                            href="#oeuvres"
                            className="inline-flex items-center gap-3 min-h-[52px] px-7 rounded-full bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.25em] hover:brightness-110 transition"
                        >
                            {t('See the works', 'Voir les œuvres')}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                        </a>
                        {expo && (
                            <a href="#expositions" className="es-verre inline-flex items-center gap-3 min-h-[52px] px-5 hover:border-[color:var(--es-accent)] transition-colors">
                                <span className="w-2 h-2 rounded-full bg-[color:var(--es-accent)]" aria-hidden />
                                <span className="es-body text-[14px]">{t('Upcoming', 'À venir')} · {expo.lieu}</span>
                            </a>
                        )}
                    </div>
                    <SocialLinks links={config.links} className="es-monte mt-8" />
                </div>
            </div>

            {/* La salle noire qui s'éclaire : le préchargeur. */}
            <div aria-hidden className="es-salle-noire absolute inset-0 z-40 bg-[color:var(--es-bg)] pointer-events-none" />
            {echelle && toile && <PieceEchelle oeuvre={toile} language={language} onFermer={() => setEchelle(false)} />}
        </header>
    );
};
