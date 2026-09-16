import React, { useEffect, useState } from 'react';
import {
    CATALOGUE_BADGES, MAX_VITRINE, decernerBadge, exposerBadges, suivreBadgesDe,
    type MesBadges,
} from './badges';

/** La vitrine des badges exposés d'un membre — lecture seule, montée dans
 *  ProfilSocial et PageMembre. */
export const VitrineBadges: React.FC<{ uid: string; language: 'EN' | 'FR' }> = ({ uid, language }) => {
    const [badges, setBadges] = useState<MesBadges>({ obtenus: {}, exposes: [] });
    useEffect(() => suivreBadgesDe(uid, setBadges), [uid]);
    if (badges.exposes.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {badges.exposes.map((id) => {
                const b = CATALOGUE_BADGES[id];
                if (!b) return null;
                return (
                    <span
                        key={id}
                        title={language === 'EN' ? b.nomEn : b.nom}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#c5a059]/40 bg-black/40 backdrop-blur-md px-3 py-1 text-[13px] font-cinzel uppercase tracking-[0.14em] text-[#f3e5ab]"
                    >
                        <span aria-hidden>{b.icone}</span> {language === 'EN' ? b.nomEn : b.nom}
                    </span>
                );
            })}
        </div>
    );
};

/** Le membre choisit sa vitrine parmi les badges qu'il a reçus — cinq au
 *  plus. Monté dans l'onglet « Mon profil » quand moi === true. */
export const SelecteurBadges: React.FC<{ uid: string; language: 'EN' | 'FR' }> = ({ uid, language }) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
    const [badges, setBadges] = useState<MesBadges>({ obtenus: {}, exposes: [] });
    const [enregistrement, setEnregistrement] = useState(false);
    useEffect(() => suivreBadgesDe(uid, setBadges), [uid]);

    const obtenusIds = Object.keys(badges.obtenus);
    if (obtenusIds.length === 0) return null;

    const basculer = async (id: string) => {
        const deja = badges.exposes.includes(id);
        const suivant = deja ? badges.exposes.filter((x) => x !== id) : [...badges.exposes, id].slice(0, MAX_VITRINE);
        setBadges((b) => ({ ...b, exposes: suivant }));
        setEnregistrement(true);
        try { await exposerBadges(uid, suivant); } finally { setEnregistrement(false); }
    };

    return (
        <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5">
            <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
                {t('Your badges: pick up to five to show', 'Vos badges : choisissez-en cinq au plus à exposer')}
            </p>
            <div className="flex flex-wrap gap-2">
                {obtenusIds.map((id) => {
                    const b = CATALOGUE_BADGES[id];
                    if (!b) return null;
                    const expose = badges.exposes.includes(id);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => basculer(id)}
                            disabled={enregistrement || (!expose && badges.exposes.length >= MAX_VITRINE)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-cinzel uppercase tracking-[0.14em] transition-colors disabled:opacity-40 ${
                                expose ? 'border-[#c5a059] bg-[#c5a059]/15 text-[#f3e5ab]' : 'border-white/15 text-neutral-400 hover:border-white/30'
                            }`}
                        >
                            <span aria-hidden>{b.icone}</span> {language === 'EN' ? b.nomEn : b.nom}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/** Le panneau de décernement, visible admin seulement — monté dans ROSTER
 *  pour chaque artiste rattaché à un vrai uid. */
export const PanneauAdminBadges: React.FC<{ uid: string; language: 'EN' | 'FR' }> = ({ uid, language }) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
    const [ouvert, setOuvert] = useState(false);
    const [badges, setBadges] = useState<MesBadges>({ obtenus: {}, exposes: [] });
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => { if (ouvert) return suivreBadgesDe(uid, setBadges); }, [ouvert, uid]);

    const basculer = async (id: string) => {
        setBusyId(id);
        try { await decernerBadge(uid, id, !(id in badges.obtenus)); } finally { setBusyId(null); }
    };

    return (
        <div className="mt-3">
            <button
                type="button"
                onClick={() => setOuvert((v) => !v)}
                className="w-full py-2 text-[13px] font-cinzel uppercase tracking-[0.25em] border border-[#c5a059]/30 bg-[#c5a059]/5 text-[#c5a059] hover:bg-[#c5a059]/15 hover:border-[#c5a059]/60 rounded transition-colors"
            >
                {ouvert ? t('Close badges', 'Fermer les badges') : t('Award a badge', 'Décerner un badge')}
            </button>
            {ouvert && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.values(CATALOGUE_BADGES).map((b) => {
                        const donne = b.id in badges.obtenus;
                        return (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => basculer(b.id)}
                                disabled={busyId === b.id}
                                title={language === 'EN' ? b.nomEn : b.nom}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[13px] font-cinzel uppercase tracking-wider transition-colors disabled:opacity-40 ${
                                    donne ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-neutral-500 hover:border-white/25'
                                }`}
                            >
                                <span aria-hidden>{b.icone}</span>{language === 'EN' ? b.nomEn : b.nom}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
