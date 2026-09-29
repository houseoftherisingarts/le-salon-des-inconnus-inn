// MurOeuvres : le mur du gabarit Peintre, son élément wow.
//
// Chaque toile est accrochée dans la pénombre, en gris; sous le curseur, un
// masque radial qui suit la souris lui rend ses couleurs, comme une lampe
// qu'on promène sur le mur. C'est la révélation de RevealWaveImage (même
// rayon, même bord adouci), refaite en masque CSS sur deux balises img : le
// shader WebGL de RevealWaveImage doit lire les pixels de l'image, ce que le
// bucket Storage refuse faute de CORS, alors qu'une balise img s'affiche
// toujours. Au toucher, la toile s'éclaire en entier à son arrivée dans la
// fenêtre, et le doigt qui glisse déplace la lumière. Sous
// prefers-reduced-motion, le mur est en couleurs, sans masque.
//
// Une toile qui porte sa largeur et sa hauteur en centimètres propose
// « À l'échelle » : elle se pose alors dans une pièce dessinée (PieceEchelle).

import * as React from 'react';
import type { OeuvreProfilPro } from '../../types';
import { useTexte } from '../shared';
import { formatPrixCents, sectionVisible, type SectionProps } from './common';
import { PieceEchelle, aDimensions, formatCm } from './PieceEchelle';

const STYLE_MUR = `
@property --es-rayon{syntax:'<length>';inherits:true;initial-value:0px;}
.es-toile{--mx:50%;--my:45%;--es-rayon:0px;transition:--es-rayon .75s cubic-bezier(.2,.7,.2,1);}
.es-toile[data-revele="oui"]{--es-rayon:190px;}
.es-toile[data-revele="plein"]{--es-rayon:1600px;transition-duration:1.8s;}
.es-toile-base{filter:grayscale(1) contrast(1.08) brightness(.58);}
.es-racine[data-sombre="non"] .es-toile-base{filter:grayscale(1) contrast(1.04) brightness(1.03);opacity:.82;}
.es-toile-couleur{-webkit-mask-image:radial-gradient(circle at var(--mx) var(--my),black calc(var(--es-rayon) * .42),transparent var(--es-rayon));mask-image:radial-gradient(circle at var(--mx) var(--my),black calc(var(--es-rayon) * .42),transparent var(--es-rayon));}
.es-toile-entree{opacity:0;transform:translateY(28px);transition:opacity .9s ease-out,transform 1.1s cubic-bezier(.2,.7,.2,1);}
.es-toile-entree[data-vue="oui"]{opacity:1;transform:none;}
@media (prefers-reduced-motion: reduce){
  .es-toile-couleur{-webkit-mask-image:none;mask-image:none;}
  .es-toile-entree{opacity:1;transform:none;}
}
`;

export const IconeRegle: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
        <path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" />
    </svg>
);

/** Le prix, « Vendu » ou « Sur demande », dans la voix du cartel. */
export const StatutOeuvre: React.FC<{ oeuvre: OeuvreProfilPro; language: 'EN' | 'FR' }> = ({ oeuvre, language }) => {
    const t = useTexte(language);
    const base = 'es-label text-[13px] uppercase tracking-[0.25em]';
    if (oeuvre.statutVente === 'vendu') {
        return (
            <span className={`${base} inline-flex items-center gap-2 text-[color:var(--es-ink-2)]`}>
                <span className="w-2 h-2 rounded-full bg-[color:var(--es-accent)]" aria-hidden />
                {t('Sold', 'Vendu')}
            </span>
        );
    }
    if (oeuvre.statutVente === 'sur-demande') return <span className={`${base} text-[color:var(--es-accent)]`}>{t('On request', 'Sur demande')}</span>;
    if (typeof oeuvre.prixCents === 'number' && oeuvre.prixCents > 0) {
        return <span className="es-label text-[15px] tracking-[0.08em] text-[color:var(--es-accent)] tabular-nums">{formatPrixCents(oeuvre.prixCents)}</span>;
    }
    return null;
};

/** Un seul observateur pour tout le mur : l'entrée en fondu, et au toucher la révélation. */
function useEntreesMur(racine: React.RefObject<HTMLElement | null>, nombre: number) {
    React.useEffect(() => {
        const el = racine.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const toucher = window.matchMedia?.('(hover: none)').matches;
        const obs = new IntersectionObserver((entrees) => {
            entrees.filter((e) => e.isIntersecting).forEach((e, k) => {
                const toile = e.target as HTMLElement;
                toile.style.transitionDelay = `${k * 90}ms`;
                toile.dataset.vue = 'oui';
                if (toucher) {
                    const cadre = toile.querySelector<HTMLElement>('.es-toile');
                    if (cadre) window.setTimeout(() => { cadre.dataset.revele = 'plein'; }, 350 + k * 90);
                }
                obs.unobserve(toile);
            });
        }, { threshold: 0.35 });
        el.querySelectorAll('.es-toile-entree').forEach((n) => obs.observe(n));
        return () => obs.disconnect();
    }, [racine, nombre]);
}

const Toile: React.FC<{ oeuvre: OeuvreProfilPro; rang: number; language: 'EN' | 'FR'; onEchelle: () => void }> = ({ oeuvre, rang, language, onEchelle }) => {
    const t = useTexte(language);
    const cadreRef = React.useRef<HTMLDivElement>(null);
    const echelle = aDimensions(oeuvre);
    const details = [oeuvre.technique, echelle ? undefined : oeuvre.dimensions].filter(Boolean).join(' · ');
    const ratio = echelle ? `${oeuvre.largeurCm} / ${oeuvre.hauteurCm}` : undefined;
    const titre = oeuvre.titre || oeuvre.caption || '';

    const suivre = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = cadreRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    const allumer = (e: React.PointerEvent<HTMLDivElement>) => {
        suivre(e);
        if (e.pointerType !== 'touch' && cadreRef.current) cadreRef.current.dataset.revele = 'oui';
    };
    const eteindre = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'touch' && cadreRef.current) cadreRef.current.dataset.revele = 'non';
    };

    const Cadre = echelle ? 'button' : 'div';
    return (
        <figure className="es-toile-entree break-inside-avoid mb-12 md:mb-16">
            <Cadre
                {...(echelle ? { type: 'button' as const, onClick: onEchelle, 'aria-label': t(`See ${titre} to scale`, `Voir ${titre} à l'échelle`) } : {})}
                className={`group relative block w-full text-left ${echelle ? 'cursor-zoom-in' : ''}`}
            >
                <div
                    ref={cadreRef}
                    data-revele="non"
                    onPointerEnter={allumer}
                    onPointerMove={suivre}
                    onPointerLeave={eteindre}
                    className="es-toile relative overflow-hidden rounded-[2px]"
                    style={{ aspectRatio: ratio, boxShadow: '0 34px 70px -34px color-mix(in srgb, var(--es-ink) 45%, transparent)' }}
                >
                    <img src={oeuvre.url} alt="" aria-hidden loading="lazy" className={`es-toile-base block w-full ${ratio ? 'h-full object-cover' : 'h-auto'}`} />
                    <img src={oeuvre.url} alt={titre} loading="lazy" className="es-toile-couleur absolute inset-0 w-full h-full object-cover" />
                </div>
            </Cadre>
            <figcaption className="mt-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="flex items-baseline gap-3">
                        <span className="es-label text-[13px] tabular-nums text-[color:var(--es-ink-2)]">{String(rang + 1).padStart(2, '0')}</span>
                        <span className="es-display text-[color:var(--es-ink)] text-xl md:text-2xl leading-tight">
                            {titre}{oeuvre.annee && <span className="text-[color:var(--es-ink-2)]">, {oeuvre.annee}</span>}
                        </span>
                    </p>
                    {details && <p className="es-body text-[14px] text-[color:var(--es-ink-2)] mt-1.5 pl-9">{details}</p>}
                    <div className="mt-3 pl-9"><StatutOeuvre oeuvre={oeuvre} language={language} /></div>
                </div>
                {echelle && (
                    <button
                        type="button"
                        onClick={onEchelle}
                        title={t('See it to scale in a room', 'Voir à l’échelle, dans une pièce')}
                        aria-label={t(`${titre}, to scale`, `${titre}, à l’échelle`)}
                        className="shrink-0 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-[color:var(--es-line)] es-label text-[13px] uppercase tracking-[0.2em] text-[color:var(--es-ink)] hover:border-[color:var(--es-accent)] hover:text-[color:var(--es-accent)] transition-colors"
                    >
                        <IconeRegle className="w-4 h-4" />
                        <span className="normal-case tabular-nums tracking-[0.06em]">{formatCm(oeuvre.largeurCm!, oeuvre.hauteurCm!)}</span>
                    </button>
                )}
            </figcaption>
        </figure>
    );
};

export const MurOeuvresSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const oeuvres = config.oeuvres ?? [];
    const murRef = React.useRef<HTMLDivElement>(null);
    const [ouverte, setOuverte] = React.useState<OeuvreProfilPro | null>(null);
    useEntreesMur(murRef, oeuvres.length);
    if (!sectionVisible(config, 'oeuvres') || oeuvres.length === 0) return null;

    return (
        <section id="oeuvres" className="relative w-full border-t border-[color:var(--es-edge)] bg-[color:var(--es-bg)] px-6 md:px-14 py-20 md:py-28">
            <style>{STYLE_MUR}</style>
            <div className="max-w-[1480px] mx-auto">
                <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-12 md:mb-20">
                    <div>
                        <p className="es-label text-[color:var(--es-accent)] text-[13px] uppercase tracking-[0.4em] mb-5">{t('Works', 'Œuvres')}</p>
                        <h2 className="es-display text-[color:var(--es-ink)] text-4xl md:text-6xl leading-[1.05]">{t('The wall', 'Le mur')}</h2>
                    </div>
                    <p className="es-body text-[15px] text-[color:var(--es-ink-2)] max-w-sm">
                        <span className="hidden [@media(hover:hover)]:inline">{t('Move over a canvas to light it. Click a work to see it to scale.', 'Promenez la souris sur une toile pour l’éclairer. Un clic sur ses dimensions la pose à l’échelle, dans une pièce.')}</span>
                        <span className="[@media(hover:hover)]:hidden">{t('Each canvas lights up as it arrives. Tap one to see it to scale.', 'Chaque toile s’éclaire à son arrivée. Touchez ses dimensions pour la voir à l’échelle, dans une pièce.')}</span>
                    </p>
                </div>
                <div ref={murRef} className="columns-1 sm:columns-2 lg:columns-3 gap-8 md:gap-14">
                    {oeuvres.map((o, i) => (
                        <Toile key={`${o.storagePath || o.url}-${i}`} oeuvre={o} rang={i} language={language} onEchelle={() => setOuverte(o)} />
                    ))}
                </div>
            </div>
            {ouverte && <PieceEchelle oeuvre={ouverte} language={language} onFermer={() => setOuverte(null)} />}
        </section>
    );
};
