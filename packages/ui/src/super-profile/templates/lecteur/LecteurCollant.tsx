// LecteurCollant : la barre de lecture en verre, fixée au bas de l'écran
// dès qu'une piste a été lancée. Elle survit au défilement : le visiteur
// continue d'écouter pendant qu'il lit les dates ou la boutique. Une fine
// forme d'onde (vraies fréquences quand l'analyse est branchée, sinon une
// silhouette qui respire au tempo) sert aussi de barre de progression :
// un clic dessus déplace la lecture.

import * as React from 'react';
import { formatDuree, useLecteur } from './LecteurContexte';

const BARRES = 56;
const SILHOUETTE = Array.from({ length: BARRES }, (_, k) => 0.3 + 0.7 * Math.abs(Math.sin(k * 1.7) * Math.cos(k * 0.37)));

export const IconeLecture: React.FC<{ enLecture: boolean; className?: string }> = ({ enLecture, className = 'w-5 h-5' }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className={className} aria-hidden>
        {enLecture ? (
            <>
                <rect x="14" y="4" width="4" height="16" rx="1" />
                <rect x="6" y="4" width="4" height="16" rx="1" />
            </>
        ) : (
            <polygon points="6 3 20 12 6 21 6 3" />
        )}
    </svg>
);

export const LecteurCollant: React.FC<{ language?: 'EN' | 'FR' }> = ({ language = 'FR' }) => {
    const lecteur = useLecteur();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const etat = React.useRef({ niveau: 0.4, freq: null as Uint8Array | null, progres: 0 });
    const fr = language === 'FR';

    const dessiner = React.useCallback(() => {
        const c = canvasRef.current;
        if (!c) return;
        const dpr = window.devicePixelRatio || 1;
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr);
        if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
        const g = c.getContext('2d');
        if (!g) return;
        const styles = getComputedStyle(c);
        const accent = styles.getPropertyValue('--es-accent').trim() || 'currentColor';
        const encre = styles.getPropertyValue('--es-ink-2').trim() || 'currentColor';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const pas = w / BARRES;
        const { niveau, freq, progres } = etat.current;
        for (let k = 0; k < BARRES; k++) {
            const base = freq ? 0.18 + (freq[(k * 3) % 48] / 255) * 0.82 : SILHOUETTE[k] * (0.4 + 0.6 * niveau);
            const bh = Math.max(2, base * h);
            g.globalAlpha = k / BARRES <= progres ? 1 : 0.35;
            g.fillStyle = k / BARRES <= progres ? accent : encre;
            g.fillRect(k * pas + pas * 0.2, (h - bh) / 2, Math.max(1.5, pas * 0.5), bh);
        }
        g.globalAlpha = 1;
    }, []);

    React.useEffect(() => {
        if (!lecteur) return;
        return lecteur.abonner((niveau, freq) => {
            etat.current.niveau = niveau;
            etat.current.freq = freq ? freq.slice() : null;
            dessiner();
        });
    }, [lecteur, dessiner]);

    const temps = lecteur?.temps ?? 0;
    const duree = lecteur?.duree ?? 0;
    React.useEffect(() => {
        etat.current.progres = duree > 0 ? temps / duree : 0;
        dessiner();
    }, [temps, duree, dessiner]);

    if (!lecteur || lecteur.courant === null) return null;
    const piste = lecteur.pistes[lecteur.courant];
    if (!piste) return null;

    const chercherAuClic = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (duree > 0) lecteur.chercher(((e.clientX - r.left) / r.width) * duree);
    };

    return (
        <>
            {/* Réserve la hauteur de la barre sous le pied de page. */}
            <div aria-hidden className="h-28" />
            <div
                role="region"
                aria-label={fr ? 'Lecteur audio' : 'Audio player'}
                data-lecteur-collant
                className="es-verre es-monte fixed z-40 bottom-3 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(780px,calc(100%-3rem))] flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.6)]"
            >
                <button
                    type="button"
                    onClick={lecteur.basculer}
                    aria-label={lecteur.enLecture ? (fr ? 'Pause' : 'Pause') : (fr ? 'Lecture' : 'Play')}
                    className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] hover:brightness-110 transition"
                >
                    <IconeLecture enLecture={lecteur.enLecture} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                        <p className="es-body text-[15px] text-[color:var(--es-ink)] truncate">{piste.titre}</p>
                        <p className="es-body text-[13px] tabular-nums text-[color:var(--es-ink-2)] shrink-0">
                            {formatDuree(temps)} / {formatDuree(duree)}
                        </p>
                    </div>
                    <canvas
                        ref={canvasRef}
                        onClick={chercherAuClic}
                        className="block w-full h-6 mt-1.5 cursor-pointer"
                        aria-hidden
                    />
                </div>
                {lecteur.pistes.length > 1 && (
                    <button
                        type="button"
                        onClick={lecteur.suivant}
                        aria-label={fr ? 'Piste suivante' : 'Next track'}
                        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[color:var(--es-ink)] border border-[color:var(--es-edge)] hover:text-[color:var(--es-accent)] hover:border-[color:var(--es-accent)] transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                            <polygon points="5 4 15 12 5 20 5 4" />
                            <line x1="19" x2="19" y1="5" y2="19" />
                        </svg>
                    </button>
                )}
            </div>
        </>
    );
};
