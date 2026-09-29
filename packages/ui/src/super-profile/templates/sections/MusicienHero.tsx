// MusicienHero : l'ouverture du gabarit Musicien, une salle juste avant le
// premier accord.
//
// Un rideau se lève (le préchargeur, un peu plus d'une seconde), un cône de
// projecteur tombe sur le nom, un disque tourne à droite pendant la lecture
// et un halo à la couleur d'accent bat derrière le nom au rythme de la
// musique (niveau publié par LecteurContexte : l'amplitude réelle quand
// l'analyse est branchée, sinon 96 bpm). Le premier défilement allume la
// scène : le projecteur monte en intensité, le nom recule d'un pas.
// Sous prefers-reduced-motion, le rideau disparaît et rien ne bat.

import * as React from 'react';
import type { SuperProfileConfig } from '../../types';
import { ArtistCutout, BackToSalonLink, SocialLinks, useTexte } from '../shared';
import { useLecteur } from '../lecteur/LecteurContexte';
import { IconeLecture } from '../lecteur/LecteurCollant';
import { formatDateCourte } from './common';

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/></svg>\")";

const STYLE_HERO = `
@keyframes es-ligne{from{transform:scaleX(0);}to{transform:scaleX(1);}}
.es-rideau{transform-origin:top;animation:es-rideau .65s cubic-bezier(.7,0,.2,1) .6s both;}
.es-rideau-ligne{animation:es-ligne .55s cubic-bezier(.2,.7,.2,1) both;}
.es-disque{animation:es-tourne 6s linear infinite;animation-play-state:paused;}
.es-disque[data-joue="oui"]{animation-play-state:running;}
.es-racine[data-fonts="affiche"] .es-nom{text-transform:uppercase;letter-spacing:.01em;}
@media (prefers-reduced-motion: reduce){.es-rideau{display:none;}}
`;

interface MusicienHeroProps {
    config: SuperProfileConfig;
    fallbackDisplayName?: string;
    language?: 'EN' | 'FR';
    fondUrl?: string;
}

export const MusicienHero: React.FC<MusicienHeroProps> = ({ config, fallbackDisplayName, language = 'FR', fondUrl }) => {
    const t = useTexte(language);
    const lecteur = useLecteur();
    const nom = config.displayName || fallbackDisplayName || config.username;
    const racineRef = React.useRef<HTMLElement>(null);
    const haloRef = React.useRef<HTMLDivElement>(null);

    const aujourdhui = new Date().toISOString().slice(0, 10);
    const prochaine = [...(config.dates ?? [])].filter((d) => d.date >= aujourdhui).sort((a, b) => a.date.localeCompare(b.date))[0];
    const pistes = config.pistes ?? [];
    const joue = !!lecteur?.enLecture;

    // Le halo suit le niveau publié par le lecteur, sans rendu React par image.
    React.useEffect(() => {
        if (!lecteur) return;
        return lecteur.abonner((niveau) => {
            const h = haloRef.current;
            if (!h) return;
            h.style.transform = `translate(-50%, -50%) scale(${(1 + niveau * 0.32).toFixed(3)})`;
            h.style.opacity = (0.5 + niveau * 0.5).toFixed(3);
        });
    }, [lecteur]);

    // Premier défilement : la scène s'allume.
    React.useEffect(() => {
        const el = racineRef.current;
        if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0;
        const maj = () => {
            raf = 0;
            const p = Math.min(1, window.scrollY / (window.innerHeight * 0.5));
            el.style.setProperty('--es-allumage', p.toFixed(3));
        };
        const surDefilement = () => {
            if (!raf) raf = requestAnimationFrame(maj);
        };
        window.addEventListener('scroll', surDefilement, { passive: true });
        maj();
        return () => {
            window.removeEventListener('scroll', surDefilement);
            cancelAnimationFrame(raf);
        };
    }, []);

    const ecouter = () => {
        if (pistes.length > 0 && lecteur) lecteur.basculer();
        else document.getElementById('ecoute')?.scrollIntoView({ behavior: 'smooth' });
    };
    const peutEcouter = pistes.length > 0 || (config.ecoute?.length ?? 0) > 0;

    return (
        <header
            ref={racineRef}
            className="relative min-h-[100svh] overflow-hidden flex flex-col"
            style={{ ['--es-allumage' as string]: '0' } as React.CSSProperties}
        >
            <style>{STYLE_HERO}</style>
            <BackToSalonLink />

            {/* Fond : la salle, le projecteur, le grain. */}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[color:var(--es-bg-2)] via-[color:var(--es-bg)] to-[color:var(--es-bg)]" />
            {fondUrl && (
                <img src={fondUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />
            )}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none transition-opacity"
                style={{
                    background: 'radial-gradient(ellipse 55% 75% at 38% -8%, var(--es-glow), transparent 70%)',
                    opacity: 'calc(0.55 + var(--es-allumage) * 0.45)',
                }}
            />
            <div
                aria-hidden
                className="absolute left-0 right-0 bottom-[18%] h-px pointer-events-none"
                style={{
                    background: 'linear-gradient(90deg, transparent, var(--es-accent), transparent)',
                    opacity: 'calc(0.25 + var(--es-allumage) * 0.6)',
                    boxShadow: '0 0 40px 6px var(--es-glow)',
                }}
            />
            <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

            {/* Le disque, à droite : il tourne tant que la musique joue. */}
            <div
                aria-hidden
                className="absolute pointer-events-none -right-[30vw] top-[6vh] w-[80vw] md:-right-[12vw] md:top-1/2 md:-translate-y-1/2 md:w-[min(62vw,860px)] aspect-square opacity-40 md:opacity-90"
                style={{ transform: 'translateY(calc(var(--es-allumage) * -30px))' }}
            >
                <div
                    className="es-disque w-full h-full rounded-full shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]"
                    data-joue={joue ? 'oui' : 'non'}
                    style={{
                        background: `radial-gradient(circle, var(--es-accent) 0 15%, color-mix(in srgb, var(--es-accent) 60%, black) 15.4% 16.2%, transparent 16.4%),
                            repeating-radial-gradient(circle, color-mix(in srgb, var(--es-ink) 10%, transparent) 0 1px, transparent 1px 5px),
                            radial-gradient(circle, color-mix(in srgb, var(--es-bg-2) 80%, black) 0 70%, color-mix(in srgb, var(--es-bg) 60%, black) 71%)`,
                    }}
                >
                    <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 30deg, transparent 0 20%, color-mix(in srgb, var(--es-ink) 14%, transparent) 25%, transparent 32% 70%, color-mix(in srgb, var(--es-ink) 10%, transparent) 75%, transparent 82%)' }} />
                    <div className="absolute left-1/2 top-1/2 w-[2.2%] h-[2.2%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--es-bg)]" />
                </div>
            </div>
            {config.hero?.url && (
                <div className="absolute bottom-0 right-[4vw] z-10 pointer-events-none hidden md:block">
                    <ArtistCutout src={config.hero.url} alt={nom} className="max-h-[82vh] max-w-[38vw]" />
                </div>
            )}

            {/* Le nom, le halo, les gestes. */}
            <div className="relative z-20 flex-1 flex items-center px-6 md:px-14 pt-24 pb-28 md:py-28">
                <div className="w-full max-w-6xl mx-auto" style={{ transform: 'translateY(calc(var(--es-allumage) * -24px))' }}>
                    <p className="es-label es-monte text-[13px] uppercase tracking-[0.45em] text-[color:var(--es-accent)] mb-5 md:mb-7" style={{ animationDelay: '1.05s' }}>
                        {t('Live · Recordings · Shop', 'Scène · Disques · Boutique')}
                    </p>
                    <div className="relative">
                        <div
                            ref={haloRef}
                            data-halo
                            aria-hidden
                            className="absolute left-[30%] top-1/2 w-[70vw] max-w-[900px] aspect-[2/1] rounded-full pointer-events-none"
                            style={{
                                transform: 'translate(-50%, -50%)',
                                background: 'radial-gradient(ellipse at center, var(--es-glow) 0%, transparent 65%)',
                                filter: 'blur(28px)',
                                opacity: 0.75,
                                willChange: 'transform, opacity',
                            }}
                        />
                        <h1
                            className="es-display es-nom es-monte relative text-[color:var(--es-ink)] leading-[0.92] tracking-tight max-w-[14ch] line-clamp-2"
                            style={{ fontSize: 'clamp(3.4rem, 11vw, 10.5rem)', animationDelay: '1.15s', textWrap: 'balance' } as React.CSSProperties}
                        >
                            {nom}
                        </h1>
                    </div>
                    {config.tagline && (
                        <p className="es-body es-monte mt-6 md:mt-8 max-w-xl text-lg md:text-2xl leading-snug text-[color:var(--es-ink-2)]" style={{ animationDelay: '1.3s' }}>
                            {config.tagline}
                        </p>
                    )}
                    <div className="es-monte mt-9 md:mt-12 flex flex-wrap items-center gap-3 md:gap-4" style={{ animationDelay: '1.45s' }}>
                        {peutEcouter && (
                            <button
                                type="button"
                                onClick={ecouter}
                                data-ecouter
                                className="inline-flex items-center gap-3 min-h-[52px] pl-2 pr-6 rounded-full bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.25em] hover:brightness-110 transition shadow-[0_12px_40px_-12px_var(--es-glow)]"
                            >
                                <span className="w-10 h-10 rounded-full flex items-center justify-center bg-[color:var(--es-accent-ink)] text-[color:var(--es-accent)]">
                                    <IconeLecture enLecture={joue} className="w-4 h-4" />
                                </span>
                                {joue ? t('Pause', 'Pause') : t('Listen', 'Écouter')}
                            </button>
                        )}
                        {prochaine && (
                            <a
                                href="#dates"
                                className="es-verre inline-flex items-center gap-3 min-h-[52px] px-5 text-[color:var(--es-ink)] hover:border-[color:var(--es-accent)] transition-colors"
                            >
                                <span className="w-2 h-2 rounded-full bg-[color:var(--es-accent)] shadow-[0_0_12px_2px_var(--es-glow)]" aria-hidden />
                                <span className="es-body text-[14px]">
                                    {t('Next show', 'Prochaine date')} · {formatDateCourte(prochaine.date, language).replace(/ \d{4}$/, '')} · {prochaine.ville}
                                </span>
                            </a>
                        )}
                    </div>
                    <SocialLinks links={config.links} className="es-monte mt-8" />
                </div>
            </div>

            {/* Le rideau : le préchargeur qui se lève sur la salle. */}
            <div aria-hidden className="es-rideau absolute inset-0 z-50 bg-[color:var(--es-bg)] flex items-center justify-center pointer-events-none">
                <div className="es-rideau-ligne w-[min(40vw,320px)] h-px bg-[color:var(--es-accent)] shadow-[0_0_24px_4px_var(--es-glow)]" />
            </div>
        </header>
    );
};
