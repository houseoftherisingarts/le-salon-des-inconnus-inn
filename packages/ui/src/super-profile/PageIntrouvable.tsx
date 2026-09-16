// PageIntrouvable : l'état « pas-trouve » / « en-pause » de ProfilProPage,
// habillé selon l'univers qui la sert. Une seule adresse peut tomber ici pour
// deux raisons à la fois : une adresse qui ne correspond à rien du tout, ou un
// slug de Profil Pro qui n'existe pas (ou plus) — la copie couvre les deux
// sans distinguer, puisque le visiteur ne sait de toute façon pas laquelle
// des deux il a touchée.
//
//   • site="auberge" (components/SuperProfilePage.tsx, lesalondesinconnus.com)
//     La scène : la nuit tombée sur le manoir de Namur, une clé qui ne tourne
//     dans aucune serrure. Photo réelle du site (golden drone), assombrie.
//   • site="atelier" (apps/salon/src/App.tsx, inconnus-salon.web.app)
//     La scène : un cadre resté vide sur le mur de l'atelier, le portrait pas
//     encore peint. Pas de photo : le champ noir + lueur dorée déjà en usage
//     dans LoadingOrb, avec l'emblème du Salon en filigrane dans le cadre.
//
// Même emblème doré (/media/logo.png, présent dans les deux builds), même
// typographie (Cinzel / Prata / Lato déjà chargées par les deux sites).

import * as React from 'react';
import { motion } from 'framer-motion';

export interface PageIntrouvableProps {
    site: 'auberge' | 'atelier';
    /** true = le profil existe mais son propriétaire l'a mis en pause;
     *  false = rien à cette adresse. */
    enPause: boolean;
    language?: 'EN' | 'FR';
    onNavigateHome: () => void;
}

const COPIE = {
    auberge: {
        eyebrow: 'Le Salon des Inconnus',
        introuvable: {
            titre: { fr: 'Page introuvable', en: 'Page not found' },
            corps: {
                fr: 'La clé que vous tenez ne tourne dans aucune serrure de cette auberge, et cette adresse ne correspond pas non plus à un profil d’artiste que nous connaissons.',
                en: 'The key you are holding turns no lock in this inn, and this address does not match an artist profile we know of either.',
            },
            ligne: {
                fr: 'Vérifiez l’adresse que vous avez suivie, elle a peut-être changé depuis votre dernier passage à Namur.',
                en: 'Check the address you followed, it may have changed since your last visit to Namur.',
            },
            bouton: { fr: 'Retour au Salon', en: 'Back to the Salon' },
        },
        enPause: {
            titre: { fr: 'Cette page est en pause', en: 'This page is paused' },
            corps: {
                fr: 'Cet artiste a fermé sa porte pour un temps, sans en jeter la clé.',
                en: 'This artist has closed their door for a while, without throwing away the key.',
            },
            ligne: {
                fr: 'Retournez au Salon en attendant son retour.',
                en: 'Head back to the Salon while you wait for their return.',
            },
            bouton: { fr: 'Retour au Salon', en: 'Back to the Salon' },
        },
    },
    atelier: {
        eyebrow: 'Creator Studio',
        introuvable: {
            titre: { fr: 'Page introuvable', en: 'Page not found' },
            corps: {
                fr: 'Cette toile est restée vierge, et cette adresse ne correspond ni à une page de l’atelier ni à un profil d’artiste que nous connaissons.',
                en: 'This canvas has stayed blank, and this address matches neither a page of the studio nor an artist profile we know of.',
            },
            ligne: {
                fr: 'Le lien que vous avez suivi a peut-être changé depuis votre dernier passage.',
                en: 'The link you followed may have changed since your last visit.',
            },
            bouton: { fr: 'Retour au studio', en: 'Back to the studio' },
        },
        enPause: {
            titre: { fr: 'Cette page est en pause', en: 'This page is paused' },
            corps: {
                fr: 'Cet artiste a rangé ses pinceaux pour un temps, sans quitter l’atelier pour de bon.',
                en: 'This artist has put down their brushes for a while, without leaving the studio for good.',
            },
            ligne: {
                fr: 'Retournez au studio en attendant son retour.',
                en: 'Head back to the studio while you wait for their return.',
            },
            bouton: { fr: 'Retour au studio', en: 'Back to the studio' },
        },
    },
} as const;

export const PageIntrouvable: React.FC<PageIntrouvableProps> = ({ site, enPause, language = 'FR', onNavigateHome }) => {
    const lang = language === 'FR' ? 'fr' : 'en';
    const table = COPIE[site][enPause ? 'enPause' : 'introuvable'];
    const estAuberge = site === 'auberge';

    // Hébergement en réécriture « ** » : l'adresse inconnue répond 200, donc la
    // page le dit elle-même aux robots (soft 404 hors index), puis rend la main.
    React.useEffect(() => {
        const el = document.querySelector('meta[name="robots"]');
        if (!el) return;
        const avant = el.getAttribute('content');
        el.setAttribute('content', 'noindex, follow');
        return () => { if (avant !== null) el.setAttribute('content', avant); };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-30 overflow-hidden bg-[#050505]"
        >
            {/* Fond : photo réelle du manoir assombrie côté auberge, champ noir
                + lueur dorée côté atelier (même registre que LoadingOrb). */}
            {estAuberge ? (
                <>
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: "url('/media/inn/golden%20drone%20copy.jpg')" }}
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(5,5,5,0.72) 0%, rgba(5,5,5,0.85) 45%, rgba(5,5,5,0.96) 100%)',
                        }}
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                            background: 'radial-gradient(ellipse 60% 50% at 50% 38%, rgba(197,160,89,0.16), transparent 70%)',
                        }}
                    />
                </>
            ) : (
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse 55% 45% at 50% 34%, rgba(197,160,89,0.14), transparent 70%),' +
                            'linear-gradient(180deg, #0a0a0a 0%, #050505 55%, #030303 100%)',
                    }}
                />
            )}

            <div className="relative w-full h-full flex flex-col items-center justify-center px-6 py-16 text-center">
                <p className="font-cinzel text-[#c5a059] text-[13px] uppercase tracking-[0.5em] mb-6">
                    {COPIE[site].eyebrow}
                </p>

                {/* Auberge : la clé qui ne tourne dans aucune porte, portée par
                    l'emblème. Atelier : le cadre resté vide sur le mur. */}
                {estAuberge ? (
                    <motion.img
                        initial={{ opacity: 0, scale: 0.85, rotate: -14 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        src="/media/logo.png"
                        alt=""
                        aria-hidden
                        className="w-16 md:w-20 h-auto object-contain mb-6 drop-shadow-[0_0_18px_rgba(197,160,89,0.35)]"
                    />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="w-[132px] h-[164px] md:w-[152px] md:h-[188px] mb-7 rounded-[15px] border border-[#c5a059]/30 bg-gradient-to-b from-[#141414] to-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex items-center justify-center"
                    >
                        <img
                            src="/media/logo.png"
                            alt=""
                            aria-hidden
                            className="w-12 h-auto object-contain opacity-30"
                        />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-lg"
                >
                    <h1 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl leading-tight mb-4">
                        {table.titre[lang]}
                    </h1>
                    <p className="font-lato text-neutral-300 text-[15px] leading-relaxed mb-3">
                        {table.corps[lang]}
                    </p>
                    <p className="font-lato text-neutral-400 text-sm mb-9">
                        {table.ligne[lang]}
                    </p>

                    <button
                        type="button"
                        onClick={onNavigateHome}
                        className="px-6 py-3 rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md text-neutral-200 font-cinzel text-[13px] uppercase tracking-[0.35em] transition-all hover:border-[#c5a059] hover:text-[#f3e5ab] hover:scale-[1.02]"
                    >
                        {table.bouton[lang]}
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};
