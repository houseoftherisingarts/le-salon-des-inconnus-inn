// AtelierTheme : la palette, la paire de polices et la couleur d'accent de
// l'espace. Un clic sur une palette ou une paire s'écrit tout de suite;
// l'accent libre s'écrit à la sortie du champ, seulement s'il est un
// #rrggbb valide. Ne s'affiche que pour une famille qui a plus d'un thème.

import * as React from 'react';
import { familleGabarit } from './artistes';
import { THEMES, accentValide, resoudreTheme } from './themes';
import type { ArtistType, SuperProfileConfig, ThemeEspace } from './types';
import { AIDE, CHAMP, EtatEcriture, useEcritureImmediate } from './atelierCommun';

interface Props {
    uid: string;
    config: SuperProfileConfig;
    type: ArtistType;
    language?: 'EN' | 'FR';
}

export const AtelierTheme: React.FC<Props> = ({ uid, config, type, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const famille = familleGabarit(type);
    const registre = THEMES[famille];
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [theme, setTheme] = React.useState<ThemeEspace>(config.theme ?? {});
    const [accent, setAccent] = React.useState(config.theme?.accent ?? '');

    React.useEffect(() => {
        setTheme(config.theme ?? {});
        setAccent(config.theme?.accent ?? '');
    }, [config.theme]);

    // Les polices des paires se chargent ici pour que chaque bouton se montre dans sa propre voix.
    React.useEffect(() => {
        registre.fonts.forEach((f) => {
            const id = `es-fonts-${f.id}`;
            if (document.getElementById(id)) return;
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = resoudreTheme(famille, { fonts: f.id }).urlFonts;
            document.head.appendChild(link);
        });
    }, [registre, famille]);

    // L'accent s'écrit un court moment après le dernier changement, s'il est valide.
    const themeRef = React.useRef(theme);
    themeRef.current = theme;
    React.useEffect(() => {
        const v = accent.trim();
        if (!accentValide(v) || v === (themeRef.current.accent ?? '')) return;
        const minuterie = window.setTimeout(() => {
            const suivant = { ...themeRef.current, accent: v };
            setTheme(suivant);
            void ecrire({ theme: suivant });
        }, 700);
        return () => window.clearTimeout(minuterie);
    }, [accent, ecrire]);

    if (registre.palettes.length < 2 && registre.fonts.length < 2) return null;

    const resolu = resoudreTheme(famille, theme);
    const choisir = (patch: ThemeEspace) => {
        const suivant = { ...theme, ...patch };
        setTheme(suivant);
        void ecrire({ theme: suivant });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <span className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-400">{t('Look', 'Allure')}</span>
                <EtatEcriture etat={etat} language={language} />
            </div>

            <div>
                <p className={`${AIDE} mb-2`}>{t('Palette', 'Palette')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {registre.palettes.map((p) => {
                        const actif = resolu.palette.id === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => choisir({ palette: p.id })}
                                aria-pressed={actif}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-colors ${actif ? 'border-[#c5a059]' : 'border-white/10 hover:border-white/25'}`}
                            >
                                <span className="relative w-9 h-9 rounded-full border border-white/20 shrink-0" style={{ background: p.bg }}>
                                    <span className="absolute right-0 bottom-0 w-4 h-4 rounded-full border-2" style={{ background: p.accent, borderColor: p.bg }} />
                                </span>
                                <span className="font-lato text-sm text-[#f3e5ab]">{p.nom}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className={`${AIDE} mb-2`}>{t('Typefaces', 'Polices')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {registre.fonts.map((f) => {
                        const actif = resolu.paire.id === f.id;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => choisir({ fonts: f.id })}
                                aria-pressed={actif}
                                className={`text-left px-4 py-3 rounded-[10px] border transition-colors ${actif ? 'border-[#c5a059]' : 'border-white/10 hover:border-white/25'}`}
                            >
                                <span className="block text-2xl text-[#f3e5ab] leading-none" style={{ fontFamily: f.display, fontWeight: f.poidsDisplay }}>Aa</span>
                                <span className="block mt-2 text-[13px] text-neutral-400" style={{ fontFamily: f.body }}>{f.nom}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className={`${AIDE} mb-2`}>{t('Accent colour (optional)', "Couleur d'accent (facultative)")}</p>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        aria-label={t('Pick the accent', "Choisir l'accent")}
                        value={accentValide(accent) ? accent : resolu.palette.accent}
                        onChange={(e) => setAccent(e.target.value)}
                        className="w-11 h-11 rounded-[10px] border border-white/15 bg-transparent cursor-pointer"
                    />
                    <input
                        type="text"
                        value={accent}
                        placeholder={resolu.palette.accent}
                        onChange={(e) => setAccent(e.target.value)}
                        className={`${CHAMP} max-w-[10rem] font-mono`}
                        aria-invalid={accent !== '' && !accentValide(accent)}
                    />
                    {theme.accent && (
                        <button type="button" onClick={() => { setAccent(''); choisir({ accent: '' }); }} className="text-[13px] text-neutral-400 hover:text-[#c5a059] underline font-lato">
                            {t('Palette accent', "Accent de la palette")}
                        </button>
                    )}
                </div>
                {accent !== '' && !accentValide(accent) && (
                    <p className="text-rose-300 text-[13px] mt-2 font-lato">{t('Use the #rrggbb form.', 'Utilisez la forme #rrggbb.')}</p>
                )}
            </div>
        </div>
    );
};
