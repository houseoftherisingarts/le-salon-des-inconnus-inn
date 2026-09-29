// LecteurContexte : le lecteur audio d'un espace, partagé par la liste des
// pistes, la barre collante et le halo du hero.
//
// Un seul élément audio vit à la fois (un neuf par piste), et une seule
// boucle d'animation publie un niveau entre 0 et 1 à qui s'abonne. Quand la
// piste est servie par le même domaine que la page, ce niveau vient d'un
// AnalyserNode et suit la vraie musique. Sinon (fichiers de Storage, que le
// seau ne sert pas avec les en-têtes CORS voulus), le niveau bat un tempo
// fixe de 96 bpm : le halo vit quand même, sans jamais couper le son.
// Sous prefers-reduced-motion, la boucle ne démarre pas et rien ne bouge.

import * as React from 'react';
import type { PisteEspace } from '../../types';
import { annoncerLecture, ecouterExclusivite } from './audioExclusif';

export type AbonneNiveau = (niveau: number, frequences: Uint8Array | null) => void;

interface LecteurValeur {
    pistes: PisteEspace[];
    courant: number | null;
    enLecture: boolean;
    temps: number;
    duree: number;
    jouer: (index: number) => void;
    basculer: () => void;
    suivant: () => void;
    chercher: (secondes: number) => void;
    abonner: (cb: AbonneNiveau) => () => void;
}

const Contexte = React.createContext<LecteurValeur | null>(null);

export const useLecteur = () => React.useContext(Contexte);

const BATTEMENT_MS = 60000 / 96;

/** 83 → « 1:23 ». */
export function formatDuree(s?: number): string {
    if (!s || !Number.isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
}

function memeOrigine(url: string): boolean {
    try {
        return new URL(url, window.location.href).origin === window.location.origin;
    } catch {
        return false;
    }
}

export const LecteurProvider: React.FC<{ pistes: PisteEspace[]; children: React.ReactNode }> = ({ pistes, children }) => {
    const [courant, setCourant] = React.useState<number | null>(null);
    const [enLecture, setEnLecture] = React.useState(false);
    const [temps, setTemps] = React.useState(0);
    const [duree, setDuree] = React.useState(0);

    const moi = React.useRef({}).current;
    const pistesRef = React.useRef(pistes);
    pistesRef.current = pistes;
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const courantRef = React.useRef<number | null>(null);
    const enLectureRef = React.useRef(false);
    const ctxRef = React.useRef<AudioContext | null>(null);
    const analyseRef = React.useRef<AnalyserNode | null>(null);
    const sourceRef = React.useRef<MediaElementAudioSourceNode | null>(null);
    const abonnes = React.useRef(new Set<AbonneNiveau>());
    const jouerRef = React.useRef<(i: number) => void>(() => {});

    const brancherAnalyse = React.useCallback((audio: HTMLAudioElement) => {
        sourceRef.current?.disconnect();
        sourceRef.current = null;
        if (!memeOrigine(audio.src)) return;
        try {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AC) return;
            if (!ctxRef.current) {
                ctxRef.current = new AC();
                analyseRef.current = ctxRef.current.createAnalyser();
                analyseRef.current.fftSize = 128;
                analyseRef.current.smoothingTimeConstant = 0.78;
                analyseRef.current.connect(ctxRef.current.destination);
            }
            void ctxRef.current.resume();
            const source = ctxRef.current.createMediaElementSource(audio);
            source.connect(analyseRef.current!);
            sourceRef.current = source;
        } catch {
            sourceRef.current = null;
        }
    }, []);

    const jouer = React.useCallback((i: number) => {
        const piste = pistesRef.current[i];
        if (!piste) return;
        const actuel = audioRef.current;
        if (courantRef.current === i && actuel) {
            if (actuel.paused) {
                void ctxRef.current?.resume();
                void actuel.play().catch(() => {});
            } else {
                actuel.pause();
            }
            return;
        }
        if (actuel) {
            actuel.pause();
            actuel.removeAttribute('src');
            actuel.load();
        }
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = piste.url;
        const siActif = (fn: () => void) => () => {
            if (audioRef.current === audio) fn();
        };
        audio.addEventListener('play', siActif(() => {
            enLectureRef.current = true;
            setEnLecture(true);
            annoncerLecture(moi);
        }));
        audio.addEventListener('pause', siActif(() => {
            enLectureRef.current = false;
            setEnLecture(false);
        }));
        audio.addEventListener('timeupdate', siActif(() => setTemps(audio.currentTime)));
        audio.addEventListener('loadedmetadata', siActif(() => {
            if (Number.isFinite(audio.duration)) setDuree(audio.duration);
        }));
        audio.addEventListener('ended', siActif(() => {
            const n = pistesRef.current.length;
            if (courantRef.current !== null && courantRef.current + 1 < n) jouerRef.current(courantRef.current + 1);
        }));
        audioRef.current = audio;
        courantRef.current = i;
        setCourant(i);
        setTemps(0);
        setDuree(piste.duree ?? 0);
        brancherAnalyse(audio);
        void audio.play().catch(() => {
            enLectureRef.current = false;
            setEnLecture(false);
        });
    }, [brancherAnalyse, moi]);
    jouerRef.current = jouer;

    const suivant = React.useCallback(() => {
        const n = pistesRef.current.length;
        if (n === 0) return;
        jouer(((courantRef.current ?? -1) + 1) % n);
    }, [jouer]);

    const basculer = React.useCallback(() => jouer(courantRef.current ?? 0), [jouer]);

    const chercher = React.useCallback((s: number) => {
        const a = audioRef.current;
        if (a && Number.isFinite(s)) a.currentTime = Math.max(0, s);
    }, []);

    const abonner = React.useCallback((cb: AbonneNiveau) => {
        abonnes.current.add(cb);
        return () => {
            abonnes.current.delete(cb);
        };
    }, []);

    // Une autre source de la page démarre : celle-ci se tait.
    React.useEffect(() => ecouterExclusivite(moi, () => audioRef.current?.pause()), [moi]);

    // La boucle unique qui publie le niveau.
    React.useEffect(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const donnees = new Uint8Array(64);
        const debut = performance.now();
        let raf = 0;
        const boucle = (t: number) => {
            let niveau: number;
            let freq: Uint8Array | null = null;
            const analyse = analyseRef.current;
            if (enLectureRef.current && analyse && sourceRef.current) {
                analyse.getByteFrequencyData(donnees);
                freq = donnees;
                let somme = 0;
                for (let k = 0; k < 16; k++) somme += donnees[k];
                niveau = Math.min(1, (somme / (16 * 255)) * 1.5);
            } else {
                const phase = ((t - debut) % BATTEMENT_MS) / BATTEMENT_MS;
                niveau = Math.exp(-phase * 5) * (enLectureRef.current ? 1 : 0.45);
            }
            abonnes.current.forEach((cb) => cb(niveau, freq));
            raf = requestAnimationFrame(boucle);
        };
        raf = requestAnimationFrame(boucle);
        return () => cancelAnimationFrame(raf);
    }, []);

    React.useEffect(() => () => {
        audioRef.current?.pause();
        void ctxRef.current?.close().catch(() => {});
    }, []);

    const valeur = React.useMemo<LecteurValeur>(() => ({
        pistes, courant, enLecture, temps, duree, jouer, basculer, suivant, chercher, abonner,
    }), [pistes, courant, enLecture, temps, duree, jouer, basculer, suivant, chercher, abonner]);

    return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
};
