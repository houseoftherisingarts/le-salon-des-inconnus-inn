// UpsellCard : la carte qui suit chaque onglet du back-office, toujours la
// même, mot pour mot celle de la direction (section 5.6) côté français.

import * as React from 'react';

interface UpsellCardProps {
    language?: 'EN' | 'FR';
}

export const UpsellCard: React.FC<UpsellCardProps> = ({ language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="mt-10 p-6 md:p-8 bg-black/30 border border-[#c5a059]/25 rounded-[15px]">
            <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed max-w-2xl">
                {t(
                    'Looking for something more personal? The Profil Pro gives you a polished template. A Vexel site gives you your own art direction, pages built to your measure, and a team that retouches your site every month. It starts at 350 dollars a month, like every studio client, and you move up to priority treatment at the same time.',
                    'Envie de quelque chose de plus personnalisé ? Le Profil Pro vous donne un gabarit soigné. Un site Vexel vous donne une direction artistique à vous, des pages à votre mesure et une équipe qui retouche votre site chaque mois. Ça commence à 350 $ par mois, comme pour tous les clients du studio, et vous passez du même coup au traitement privilégié.',
                )}
            </p>
            <a
                href="https://vexelwebstudio.com/?origine=profil-pro"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block mt-5 px-6 py-3 border border-[#c5a059]/60 text-[#c5a059] hover:bg-[#c5a059] hover:text-[#050505] font-cinzel text-[11px] uppercase tracking-[0.3em] transition-colors rounded-[15px]"
            >
                {t('See what Vexel would build for you', 'Voir ce que Vexel ferait pour vous')}
            </a>
        </div>
    );
};
