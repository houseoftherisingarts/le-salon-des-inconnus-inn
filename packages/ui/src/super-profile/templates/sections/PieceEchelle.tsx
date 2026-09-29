// PieceEchelle : « à l'échelle dans une pièce ». Une pièce dessinée en SVG
// (mur, plinthe, plancher, canapé de 180 cm), sans photo, où l'œuvre se
// pose à ses dimensions réelles.
//
// Le viewBox du dessin est en centimètres : le canapé fait 180 unités de
// large, l'œuvre fait largeurCm par hauteurCm, et le navigateur met le tout
// à l'échelle de l'écran d'un seul coup. Les mesures s'écrivent en HTML
// par-dessus (Outfit, chiffres tabulaires) pour garder une taille lisible
// même quand la pièce entière tient dans un téléphone. L'œuvre est une
// balise image du SVG : elle s'affiche depuis Storage sans CORS, rien ne lit
// ses pixels. Toutes les couleurs viennent des jetons du thème.

import * as React from 'react';
import { lienPaiementValide, type OeuvreProfilPro } from '../../types';
import { useTexte } from '../shared';
import { StatutOeuvre } from './MurOeuvres';

const SOFA_L = 180;
const SOFA_H = 84;
const HAUTEUR_OEIL = 150;

const STYLE_PIECE = `
@keyframes es-piece{from{opacity:0;}to{opacity:1;}}
@keyframes es-pose{from{opacity:0;transform:translateY(-14px) scale(.985);}to{opacity:1;transform:none;}}
.es-piece{animation:es-piece .35s ease-out both;}
.es-pose{animation:es-pose .95s cubic-bezier(.2,.7,.2,1) .2s both;transform-box:fill-box;transform-origin:center;}
.es-mesure{font-family:'Outfit',sans-serif;font-variant-numeric:tabular-nums;}
`;

export function aDimensions(o: Pick<OeuvreProfilPro, 'largeurCm' | 'hauteurCm'>): boolean {
    const ok = (v?: number) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 2000;
    return ok(o.largeurCm) && ok(o.hauteurCm);
}

/** 120 × 90 cm, avec la virgule décimale québécoise au besoin. */
export function formatCm(l: number, h: number): string {
    const f = (v: number) => v.toLocaleString('fr-CA', { maximumFractionDigits: 1 });
    return `${f(l)} × ${f(h)} cm`;
}

function useOutfit() {
    React.useEffect(() => {
        if (document.getElementById('es-fonts-outfit')) return;
        const link = document.createElement('link');
        link.id = 'es-fonts-outfit';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500&display=swap';
        document.head.appendChild(link);
    }, []);
}

interface Props {
    oeuvre: OeuvreProfilPro;
    language: 'EN' | 'FR';
    onFermer: () => void;
}

export const PieceEchelle: React.FC<Props> = ({ oeuvre, language, onFermer }) => {
    const t = useTexte(language);
    const fermerRef = React.useRef<HTMLButtonElement>(null);
    useOutfit();

    React.useEffect(() => {
        const avant = document.activeElement as HTMLElement | null;
        const debordement = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        fermerRef.current?.focus();
        const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
        window.addEventListener('keydown', touche);
        return () => {
            window.removeEventListener('keydown', touche);
            document.documentElement.style.overflow = debordement;
            avant?.focus?.();
        };
    }, [onFermer]);

    const l = oeuvre.largeurCm!;
    const h = oeuvre.hauteurCm!;
    // La pièce : le centre de l'œuvre à hauteur d'œil, jamais à moins de
    // 22 cm au-dessus du dossier; le mur s'élargit et monte pour une grande toile.
    const bas = Math.max(SOFA_H + 22, HAUTEUR_OEIL - h / 2);
    const haut = bas + h;
    const W = Math.max(420, l + 220);
    const H = Math.max(265, haut + 45);
    const SOL = 34;
    const y = (depuisSol: number) => H - depuisSol;
    const xArt = (W - l) / 2;
    const xSofa = (W - SOFA_L) / 2;
    const pct = (v: number, total: number) => `${(v / total) * 100}%`;

    const lienVente = oeuvre.statutVente === 'a-vendre' && lienPaiementValide(oeuvre.lienVente) ? oeuvre.lienVente : null;
    const titre = oeuvre.titre || t('Untitled', 'Sans titre');

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="es-piece-titre"
            className="es-piece fixed inset-0 z-[80] flex flex-col bg-[color:var(--es-bg)] text-[color:var(--es-ink)]"
        >
            <style>{STYLE_PIECE}</style>
            <div className="flex items-center justify-between gap-4 px-5 md:px-10 py-4 border-b border-[color:var(--es-edge)]">
                <p className="es-label text-[13px] uppercase tracking-[0.35em] text-[color:var(--es-accent)]">{t('To scale, in a room', 'À l’échelle, dans une pièce')}</p>
                <button
                    ref={fermerRef}
                    type="button"
                    onClick={onFermer}
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-[color:var(--es-line)] es-label text-[13px] uppercase tracking-[0.2em] hover:border-[color:var(--es-accent)] transition-colors"
                >
                    {t('Close', 'Fermer')}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center px-3 md:px-10 py-4">
                <div className="relative w-full max-h-full" style={{ aspectRatio: `${W} / ${H + SOL}`, maxWidth: `calc((100svh - 230px) * ${W / (H + SOL)})` }}>
                    <svg viewBox={`0 0 ${W} ${H + SOL}`} className="absolute inset-0 w-full h-full" role="img" aria-label={t(`${titre} above a 180 cm sofa`, `${titre} au-dessus d’un canapé de 180 cm`)}>
                        <defs>
                            <radialGradient id="es-piece-lumiere" cx="50%" cy="0%" r="75%">
                                <stop offset="0%" style={{ stopColor: 'var(--es-ink)', stopOpacity: 0.1 }} />
                                <stop offset="100%" style={{ stopColor: 'var(--es-ink)', stopOpacity: 0 }} />
                            </radialGradient>
                            <filter id="es-piece-flou" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
                        </defs>
                        <rect x="0" y="0" width={W} height={H} style={{ fill: 'var(--es-bg-2)' }} />
                        <rect x="0" y="0" width={W} height={H} fill="url(#es-piece-lumiere)" />
                        <rect x="0" y={H} width={W} height={SOL} style={{ fill: 'color-mix(in srgb, var(--es-ink) 9%, var(--es-bg))' }} />
                        {Array.from({ length: Math.ceil(W / 60) }, (_, i) => (
                            <line key={i} x1={i * 60 + 20} y1={H} x2={i * 60 - 30} y2={H + SOL} strokeWidth="0.4" style={{ stroke: 'var(--es-edge)' }} />
                        ))}
                        <rect x="0" y={y(10)} width={W} height="10" style={{ fill: 'color-mix(in srgb, var(--es-ink) 8%, var(--es-bg-2))' }} />
                        <line x1="0" y1={y(10)} x2={W} y2={y(10)} strokeWidth="0.5" style={{ stroke: 'var(--es-edge)' }} />

                        <ellipse cx={W / 2} cy={H + 3} rx={SOFA_L / 2 + 8} ry="5" filter="url(#es-piece-flou)" style={{ fill: 'color-mix(in srgb, var(--es-ink) 30%, transparent)' }} />
                        <g style={{ fill: 'color-mix(in srgb, var(--es-ink) 22%, var(--es-bg-2))' }}>
                            <rect x={xSofa + 12} y={y(9)} width="3" height="9" />
                            <rect x={xSofa + SOFA_L - 15} y={y(9)} width="3" height="9" />
                            <rect x={xSofa + 10} y={y(SOFA_H)} width={SOFA_L - 20} height={SOFA_H - 40} rx="8" />
                            <rect x={xSofa} y={y(46)} width={SOFA_L} height="38" rx="6" />
                            <rect x={xSofa} y={y(62)} width="20" height="54" rx="7" />
                            <rect x={xSofa + SOFA_L - 20} y={y(62)} width="20" height="54" rx="7" />
                        </g>
                        <line x1={xSofa + 22} y1={y(46)} x2={xSofa + SOFA_L - 22} y2={y(46)} strokeWidth="0.6" style={{ stroke: 'color-mix(in srgb, var(--es-bg) 35%, transparent)' }} />
                        <line x1={W / 2} y1={y(46)} x2={W / 2} y2={y(SOFA_H - 6)} strokeWidth="0.6" style={{ stroke: 'color-mix(in srgb, var(--es-bg) 35%, transparent)' }} />

                        <g className="es-pose">
                            <rect x={xArt + 1.5} y={y(haut) + 4} width={l} height={h} filter="url(#es-piece-flou)" style={{ fill: 'color-mix(in srgb, var(--es-ink) 35%, transparent)' }} />
                            <image href={oeuvre.url} x={xArt} y={y(haut)} width={l} height={h} preserveAspectRatio="xMidYMid slice" />
                            <rect x={xArt} y={y(haut)} width={l} height={h} fill="none" strokeWidth="0.4" style={{ stroke: 'color-mix(in srgb, var(--es-ink) 25%, transparent)' }} />
                        </g>

                        <g strokeWidth="0.5" style={{ stroke: 'var(--es-accent)' }}>
                            <line x1={xArt} y1={y(haut + 12)} x2={xArt + l} y2={y(haut + 12)} />
                            <line x1={xArt} y1={y(haut + 9)} x2={xArt} y2={y(haut + 15)} />
                            <line x1={xArt + l} y1={y(haut + 9)} x2={xArt + l} y2={y(haut + 15)} />
                            <line x1={xArt + l + 12} y1={y(haut)} x2={xArt + l + 12} y2={y(bas)} />
                            <line x1={xArt + l + 9} y1={y(haut)} x2={xArt + l + 15} y2={y(haut)} />
                            <line x1={xArt + l + 9} y1={y(bas)} x2={xArt + l + 15} y2={y(bas)} />
                            <line x1={xSofa} y1={H + SOL - 8} x2={xSofa + SOFA_L} y2={H + SOL - 8} />
                            <line x1={xSofa} y1={H + SOL - 11} x2={xSofa} y2={H + SOL - 5} />
                            <line x1={xSofa + SOFA_L} y1={H + SOL - 11} x2={xSofa + SOFA_L} y2={H + SOL - 5} />
                        </g>
                    </svg>

                    <span className="es-mesure absolute -translate-x-1/2 -translate-y-[130%] text-[13px] md:text-[15px] px-2 rounded-full bg-[color:var(--es-bg-2)] text-[color:var(--es-ink)] whitespace-nowrap" style={{ left: pct(xArt + l / 2, W), top: pct(y(haut + 12), H + SOL) }}>
                        {l.toLocaleString('fr-CA')} cm
                    </span>
                    <span className="es-mesure absolute -translate-y-1/2 translate-x-2 text-[13px] md:text-[15px] px-2 rounded-full bg-[color:var(--es-bg-2)] text-[color:var(--es-ink)] whitespace-nowrap" style={{ left: pct(xArt + l + 12, W), top: pct(y(bas + h / 2), H + SOL) }}>
                        {h.toLocaleString('fr-CA')} cm
                    </span>
                    <span className="es-mesure absolute -translate-x-1/2 -translate-y-[125%] text-[13px] md:text-[14px] px-2 rounded-full bg-[color:color-mix(in_srgb,var(--es-ink)_9%,var(--es-bg))] text-[color:var(--es-ink-2)] whitespace-nowrap" style={{ left: '50%', top: pct(H + SOL - 8, H + SOL) }}>
                        {t('Sofa', 'Canapé')} 180 cm
                    </span>
                </div>
            </div>

            <div className="border-t border-[color:var(--es-edge)] px-5 md:px-10 py-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
                <div className="min-w-0">
                    <p id="es-piece-titre" className="es-display text-xl md:text-2xl leading-tight truncate">{titre}{oeuvre.annee ? `, ${oeuvre.annee}` : ''}</p>
                    <p className="es-mesure text-[14px] text-[color:var(--es-ink-2)] mt-1">
                        {[oeuvre.technique, formatCm(l, h)].filter(Boolean).join(' · ')}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <StatutOeuvre oeuvre={oeuvre} language={language} />
                    {lienVente && (
                        <a
                            href={lienVente}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.2em] hover:brightness-110 transition"
                        >
                            {t('Acquire', 'Acquérir')}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
