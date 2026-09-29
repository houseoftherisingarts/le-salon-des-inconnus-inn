// ApercuPage : un espace témoin, ouvert sans compte, à /apercu/{slug}.
//
// La page rend le vrai gabarit avec une config inventée (apercus.ts) et sans
// uid, si bien que rien ne lit ni n'écrit Firestore. Elle se retire des
// moteurs de recherche (meta robots ici, en-tête X-Robots-Tag dans
// firebase.json) et porte en haut un bandeau qui dit ce qu'elle est, avec le
// geste pour créer le sien. Le bandeau prend les couleurs du thème de
// l'aperçu pour ne jamais trancher sur la page.

import * as React from 'react';
import { APERCUS } from './apercus';
import { resoudreTheme } from './themes';
import { MusicienTemplate } from './templates/MusicienTemplate';

export interface ApercuPageProps {
    slug: string;
    /** Où mène « Créer le vôtre ». */
    lienCreer?: string;
}

export const ApercuPage: React.FC<ApercuPageProps> = ({ slug, lienCreer = '/createur' }) => {
    const config = APERCUS[slug] ?? APERCUS.musicien;
    const vars = React.useMemo(() => resoudreTheme('musicien', config.theme).vars, [config.theme]);

    React.useEffect(() => {
        document.title = `${config.displayName} · Espace témoin · Le Salon des Inconnus`;
        let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        const avant = meta?.getAttribute('content') ?? null;
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'robots';
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', 'noindex, nofollow');
        return () => {
            if (avant === null) meta?.remove();
            else meta?.setAttribute('content', avant);
        };
    }, [config.displayName]);

    return (
        <>
            <div
                style={{ ...vars, fontFamily: 'var(--es-font-label)' } as React.CSSProperties}
                className="relative z-[60] bg-[color:var(--es-bg-2)] text-[color:var(--es-ink)] border-b border-[color:var(--es-edge)]"
            >
                <div className="mx-auto max-w-6xl px-4 md:px-14 min-h-[48px] flex items-center justify-between gap-4 text-[13px]">
                    <div className="min-w-0 flex-1 flex items-baseline gap-3">
                        <span className="shrink-0 uppercase tracking-[0.3em] text-[color:var(--es-accent)]">Espace témoin</span>
                        <p className="hidden md:block min-w-0 truncate text-[color:var(--es-ink-2)]">Un artiste inventé, un vrai gabarit, prêt à recevoir votre musique.</p>
                    </div>
                    <a
                        href={lienCreer}
                        className="shrink-0 inline-flex items-center gap-2 min-h-[36px] px-4 rounded-full bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] uppercase tracking-[0.2em] hover:brightness-110 transition"
                    >
                        Créer le vôtre
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                        </svg>
                    </a>
                </div>
            </div>
            <MusicienTemplate config={config} language="FR" />
        </>
    );
};
