// Series : les séries du photographe, son élément wow.
//
// Chaque série se lit de côté. Sur grand écran, la section s'épingle et le
// défilement vertical fait glisser la mosaïque vers la gauche; au téléphone,
// c'est une bande horizontale, le seul défileur de côté de la page. La
// mosaïque alterne une grande photo et une pile de deux, et chaque photo
// entre en fondu avec un léger zoom quand elle arrive dans la fenêtre,
// décalée de 40 ms sur sa voisine. Sous prefers-reduced-motion, la série se
// rend en grille simple, sans épinglage ni animation.
//
// Un photographe qui n'a pas encore de séries mais qui avait des œuvres ou
// des photos (avant le moteur d'espace) les retrouve ici en une série.

import * as React from 'react';
import type { PhotoSerie, SeriePhoto, SuperProfileConfig } from '../../types';
import { useTexte } from '../shared';
import { sectionVisible, type SectionProps } from './common';

const STYLE_SERIES = `
.es-revele img{opacity:0;transform:scale(1.08);transition:opacity .8s ease-out,transform 1.3s cubic-bezier(.2,.7,.2,1);}
.es-revele[data-vue="oui"] img{opacity:1;transform:none;}
.es-bande{scrollbar-width:none;}
.es-bande::-webkit-scrollbar{display:none;}
.es-piste{--es-bande-h:58svh;}
@media (min-width:768px){.es-piste{--es-bande-h:66vh;}}
@media (prefers-reduced-motion: reduce){.es-revele img{opacity:1;transform:none;}}
`;

type Mode = 'epingle' | 'bande' | 'grille';

function useMode(): Mode {
    const lire = (): Mode => {
        if (typeof window === 'undefined' || !window.matchMedia) return 'bande';
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'grille';
        return window.matchMedia('(min-width: 768px)').matches ? 'epingle' : 'bande';
    };
    const [mode, setMode] = React.useState<Mode>(lire);
    React.useEffect(() => {
        const requetes = ['(prefers-reduced-motion: reduce)', '(min-width: 768px)'].map((q) => window.matchMedia(q));
        const maj = () => setMode(lire());
        requetes.forEach((r) => r.addEventListener('change', maj));
        return () => requetes.forEach((r) => r.removeEventListener('change', maj));
    }, []);
    return mode;
}

/** Les séries à rendre : celles de l'atelier, sinon les anciennes œuvres en une seule. */
export function seriesDe(config: SuperProfileConfig): SeriePhoto[] {
    const series = (config.series ?? []).filter((s) => s.photos?.length);
    if (series.length) return series;
    const anciennes = config.oeuvres?.length ? config.oeuvres : config.works ?? [];
    if (!anciennes.length) return [];
    return [{ id: 'portfolio', titre: 'Portfolio', photos: anciennes.map((o, i) => ({ id: `p${i}`, url: o.url, storagePath: o.storagePath })) }];
}

/** Grande photo, puis une pile de deux, et ainsi de suite. */
function colonnes(photos: PhotoSerie[]): PhotoSerie[][] {
    const cols: PhotoSerie[][] = [];
    let i = 0;
    while (i < photos.length) {
        if (cols.length % 2 === 0 || i === photos.length - 1) cols.push([photos[i++]]);
        else cols.push([photos[i++], photos[i++]]);
    }
    return cols;
}

function ratio(p: PhotoSerie): number {
    const r = p.largeur && p.hauteur ? p.largeur / p.hauteur : 0.8;
    return Math.min(1.6, Math.max(0.66, r));
}

/** Fondu et léger zoom à l'entrée, décalés de 40 ms par photo. */
function useRevele(racine: React.RefObject<HTMLElement | null>, cle: string) {
    React.useEffect(() => {
        const el = racine.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const obs = new IntersectionObserver((entrees) => {
            entrees.filter((e) => e.isIntersecting).forEach((e, k) => {
                const n = e.target as HTMLElement;
                n.querySelector('img')?.style.setProperty('transition-delay', `${k * 40}ms`);
                n.dataset.vue = 'oui';
                obs.unobserve(n);
            });
        }, { threshold: 0.12 });
        el.querySelectorAll('.es-revele').forEach((n) => obs.observe(n));
        return () => obs.disconnect();
    }, [racine, cle]);
}

const Photo: React.FC<{ photo: PhotoSerie; style?: React.CSSProperties; className?: string }> = ({ photo, style, className }) => (
    <div className={`es-revele relative overflow-hidden rounded-[6px] bg-[color:var(--es-bg-2)] ${className ?? ''}`} style={style}>
        <img src={photo.url} alt="" loading="lazy" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
    </div>
);

const Mosaique: React.FC<{ photos: PhotoSerie[] }> = ({ photos }) => (
    <>
        {colonnes(photos).map((col, i) => (
            col.length === 1 ? (
                <Photo key={col[0].id} photo={col[0]} className="shrink-0 snap-start" style={{ height: 'var(--es-bande-h)', width: `calc(var(--es-bande-h) * ${ratio(col[0])})` }} />
            ) : (
                <div key={`pile-${i}`} className="shrink-0 snap-start flex flex-col gap-3 md:gap-4" style={{ height: 'var(--es-bande-h)', width: 'calc(var(--es-bande-h) * 0.62)' }}>
                    {col.map((p) => <Photo key={p.id} photo={p} className="flex-1" />)}
                </div>
            )
        ))}
    </>
);

const Entete: React.FC<{ serie: SeriePhoto; rang: number; total: number; language: 'EN' | 'FR'; className?: string }> = ({ serie, rang, total, language, className }) => {
    const t = useTexte(language);
    return (
        <div className={className}>
            <p className="es-label text-[13px] uppercase tracking-[0.35em] text-[color:var(--es-accent)] tabular-nums">
                {t('Series', 'Série')} {String(rang + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </p>
            <h3 className="es-display text-[color:var(--es-ink)] text-4xl md:text-5xl lg:text-6xl leading-[1.02] mt-5 line-clamp-2" style={{ textWrap: 'balance' } as React.CSSProperties}>
                {serie.titre}
            </h3>
            {serie.description && <p className="es-body text-[color:var(--es-ink-2)] text-base md:text-lg leading-relaxed mt-5 max-w-md">{serie.description}</p>}
            <p className="es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-ink-2)] mt-6 tabular-nums">
                {serie.photos.length} {serie.photos.length > 1 ? t('photographs', 'photographies') : t('photograph', 'photographie')}
            </p>
        </div>
    );
};

/** Grand écran : la série s'épingle et glisse de côté au défilement vertical. */
const SerieEpinglee: React.FC<{ serie: SeriePhoto; rang: number; total: number; language: 'EN' | 'FR' }> = (props) => {
    const enveloppe = React.useRef<HTMLDivElement>(null);
    const piste = React.useRef<HTMLDivElement>(null);
    const barre = React.useRef<HTMLDivElement>(null);
    const [distance, setDistance] = React.useState(0);
    useRevele(piste, props.serie.id);

    React.useEffect(() => {
        const p = piste.current;
        if (!p) return;
        const mesurer = () => setDistance(Math.max(0, p.scrollWidth - window.innerWidth));
        const ro = new ResizeObserver(mesurer);
        ro.observe(p);
        window.addEventListener('resize', mesurer);
        mesurer();
        return () => { ro.disconnect(); window.removeEventListener('resize', mesurer); };
    }, []);

    React.useEffect(() => {
        let raf = 0;
        const maj = () => {
            raf = 0;
            const e = enveloppe.current;
            if (!e || !piste.current) return;
            const course = e.offsetHeight - window.innerHeight;
            const avance = course > 0 ? Math.min(1, Math.max(0, -e.getBoundingClientRect().top / course)) : 0;
            piste.current.style.transform = `translate3d(${(-avance * distance).toFixed(1)}px, 0, 0)`;
            if (barre.current) barre.current.style.transform = `scaleX(${avance.toFixed(4)})`;
        };
        const surDefilement = () => { if (!raf) raf = requestAnimationFrame(maj); };
        window.addEventListener('scroll', surDefilement, { passive: true });
        maj();
        return () => { window.removeEventListener('scroll', surDefilement); cancelAnimationFrame(raf); };
    }, [distance]);

    return (
        <div ref={enveloppe} data-serie-epinglee className="relative" style={{ height: `calc(100vh + ${distance}px)` }}>
            <div className="sticky top-0 h-screen overflow-hidden flex items-center">
                <div ref={piste} className="es-piste flex items-center gap-3 md:gap-4 w-max pl-14 pr-[8vw] will-change-transform">
                    <Entete {...props} className="shrink-0 w-[min(34vw,460px)] pr-10" />
                    <Mosaique photos={props.serie.photos} />
                </div>
                <div className="absolute left-14 right-14 bottom-8 h-px bg-[color:var(--es-edge)]">
                    <div ref={barre} className="h-full origin-left bg-[color:var(--es-accent)]" style={{ transform: 'scaleX(0)' }} />
                </div>
            </div>
        </div>
    );
};

/** Téléphone : l'en-tête, puis une seule bande qui défile de côté. */
const SerieBande: React.FC<{ serie: SeriePhoto; rang: number; total: number; language: 'EN' | 'FR' }> = (props) => {
    const t = useTexte(props.language);
    const piste = React.useRef<HTMLDivElement>(null);
    useRevele(piste, props.serie.id);
    return (
        <div className="py-14">
            <Entete {...props} className="px-6" />
            <p className="es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-ink-2)] px-6 mt-8 mb-3" aria-hidden>{t('Swipe', 'Glissez')} →</p>
            <div ref={piste} className="es-bande es-piste flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-6 px-6 overscroll-x-contain">
                <Mosaique photos={props.serie.photos} />
            </div>
        </div>
    );
};

/** Sans mouvement : l'en-tête et une grille simple. */
const SerieGrille: React.FC<{ serie: SeriePhoto; rang: number; total: number; language: 'EN' | 'FR' }> = (props) => (
    <div className="px-6 md:px-14 py-14 md:py-20 max-w-[1480px] mx-auto">
        <Entete {...props} className="mb-10" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {props.serie.photos.map((p) => (
                <div key={p.id} className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[color:var(--es-bg-2)]">
                    <img src={p.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                </div>
            ))}
        </div>
    </div>
);

export const SeriesSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const mode = useMode();
    const series = seriesDe(config);
    if (!sectionVisible(config, 'series') || series.length === 0) return null;
    const Rendu = mode === 'epingle' ? SerieEpinglee : mode === 'bande' ? SerieBande : SerieGrille;
    return (
        <section id="series" data-mode-series={mode} className="relative w-full border-t border-[color:var(--es-edge)] bg-[color:var(--es-bg)]">
            <style>{STYLE_SERIES}</style>
            <div className="px-6 md:px-14 pt-20 md:pt-28 max-w-[1480px] mx-auto flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="es-label text-[color:var(--es-accent)] text-[13px] uppercase tracking-[0.4em] mb-5">{t('Series', 'Séries')}</p>
                    <h2 className="es-display text-[color:var(--es-ink)] text-4xl md:text-6xl leading-[1.05]">{t('The series', 'Les séries')}</h2>
                </div>
                <p className="es-body text-[15px] text-[color:var(--es-ink-2)] max-w-sm">
                    {mode === 'epingle'
                        ? t('Keep scrolling: each series slides by on its own.', 'Continuez de défiler : chaque série glisse d’elle-même.')
                        : t('Each series reads sideways.', 'Chaque série se lit de côté.')}
                </p>
            </div>
            {series.map((s, i) => <Rendu key={s.id} serie={s} rang={i} total={series.length} language={language} />)}
        </section>
    );
};
