// Rencontre : la salle vidéo d'un rendez-vous du Profil Pro. Salle Jitsi
// Meet nommée d'après le rendez-vous, aucune clé d'API, aucun serveur à
// louer. Porté d'un module de rendez-vous déjà construit pour un chantier précédent.

import * as React from 'react';
import { salleUrl } from './rendezvous';

interface RencontreProps {
    salle: string;
    nom: string;
    language?: 'EN' | 'FR';
    onQuitter: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiMeetAPI;
    }
}

interface JitsiMeetAPI {
    on: (evenement: string, gestionnaire: () => void) => void;
    dispose: () => void;
}

const SCRIPT_JITSI = 'https://meet.jit.si/external_api.js';
let chargementScript: Promise<void> | null = null;

function chargerScriptJitsi(): Promise<void> {
    if (typeof window !== 'undefined' && window.JitsiMeetExternalAPI) return Promise.resolve();
    if (!chargementScript) {
        chargementScript = new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = SCRIPT_JITSI;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                chargementScript = null;
                reject(new Error('jitsi-script'));
            };
            document.head.appendChild(script);
        });
    }
    return chargementScript;
}

export const Rencontre: React.FC<RencontreProps> = ({ salle, nom, language = 'FR', onQuitter }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const conteneurRef = React.useRef<HTMLDivElement>(null);
    const apiRef = React.useRef<JitsiMeetAPI | null>(null);
    const [pret, setPret] = React.useState(false);
    const [echec, setEchec] = React.useState(false);

    React.useEffect(() => {
        let annule = false;
        const delaiSecours = window.setTimeout(() => { if (!annule) setEchec(true); }, 8000);

        chargerScriptJitsi()
            .then(() => {
                if (annule || !conteneurRef.current || !window.JitsiMeetExternalAPI) return;
                const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
                    roomName: salle,
                    parentNode: conteneurRef.current,
                    width: '100%',
                    height: '100%',
                    userInfo: { displayName: nom },
                    configOverwrite: { prejoinPageEnabled: true, disableDeepLinking: true, subject: 'Le Salon des Inconnus, Profil Pro' },
                    interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
                });
                apiRef.current = api;
                api.on('videoConferenceLeft', onQuitter);
                api.on('readyToClose', onQuitter);
                window.clearTimeout(delaiSecours);
                setPret(true);
            })
            .catch(() => { if (!annule) setEchec(true); });

        return () => {
            annule = true;
            window.clearTimeout(delaiSecours);
            apiRef.current?.dispose();
            apiRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salle, nom]);

    return (
        <div className="space-y-4">
            <div className="relative w-full h-[70vh] md:h-auto md:aspect-video md:min-h-[420px] bg-black/60 border border-white/15 rounded-[15px] overflow-hidden">
                <div ref={conteneurRef} className="absolute inset-0" />
                {!pret && !echec && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                        <span className="w-8 h-8 rounded-full border-2 border-white/15 border-t-[#c5a059] animate-spin" />
                        <p className="text-neutral-400 text-sm font-lato">{t('Opening the room…', 'Ouverture de la salle…')}</p>
                    </div>
                )}
                {echec && (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <a
                            href={salleUrl(salle)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] inline-flex items-center rounded-[15px] bg-[#c5a059] text-[#050505] hover:bg-[#d4b06a] px-5 font-cinzel text-[11px] uppercase tracking-[0.3em] transition-colors"
                        >
                            {t('Open the meeting in a new tab', 'Ouvrir la rencontre dans un nouvel onglet')}
                        </a>
                    </div>
                )}
            </div>
            <button
                type="button"
                onClick={onQuitter}
                className="min-h-[44px] px-5 rounded-[15px] border border-white/15 text-neutral-200 font-cinzel text-[11px] uppercase tracking-[0.3em] hover:border-[#c5a059] hover:text-[#f3e5ab] transition-colors"
            >
                {t('Leave the meeting', 'Quitter la rencontre')}
            </button>
        </div>
    );
};
