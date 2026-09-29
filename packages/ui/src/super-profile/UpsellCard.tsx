// UpsellCard : la carte qui suit chaque onglet du back-office, toujours la
// même. Le texte reprend la direction (section 5.6); le prix suit la grille
// Vexel du 29 septembre 2026 : la Base à 300 $ par mois, spécial 2026, au
// lieu de 350 $. Le bouton ouvre la création de compte Vexel sur la Base.

import * as React from 'react';

interface UpsellCardProps {
    language?: 'EN' | 'FR';
}

const LIEN_VEXEL = 'https://vexelwebstudio.com/compte?formule=base&origine=creator-studio';

export const UpsellCard: React.FC<UpsellCardProps> = ({ language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="mt-10 p-6 md:p-8 bg-black/30 border border-[#c5a059]/25 rounded-[15px]">
            <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed max-w-2xl">
                {t(
                    'Looking for something more personal? The Profil Pro gives you a polished template. A Vexel site gives you your own art direction, pages built to your measure, and a team that retouches your site every month, and you move up to priority treatment at the same time.',
                    'Envie de quelque chose de plus personnalisé ? Le Profil Pro vous donne un gabarit soigné. Un site Vexel vous donne une direction artistique à vous, des pages à votre mesure et une équipe qui retouche votre site chaque mois, et vous passez du même coup au traitement privilégié.',
                )}
            </p>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-lato text-neutral-300">
                <span className="text-sm">{t('From', 'À partir de')}</span>
                <s className="text-neutral-500 text-base">350 $</s>
                <span className="font-prata text-[#f3e5ab] text-3xl">300 $</span>
                <span className="text-sm">{t('a month, 2026 special', 'par mois, spécial 2026')}</span>
            </p>
            <a
                href={LIEN_VEXEL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block mt-5 px-6 py-3 border border-[#c5a059]/60 text-[#c5a059] hover:bg-[#c5a059] hover:text-[#050505] font-cinzel text-[13px] uppercase tracking-[0.3em] transition-colors rounded-[15px]"
            >
                {t('See what Vexel would build for you', 'Voir ce que Vexel ferait pour vous')}
            </a>
        </div>
    );
};
