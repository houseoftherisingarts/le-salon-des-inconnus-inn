// Dernière scène du hub du Creator Studio : l'invitation à confier sa galerie
// d'artiste à Vexel Webstudio. Pendant de VexelSoutienSection sur l'accueil,
// mais habillée par le thème actif du studio au lieu du canon doré du Salon.
//
// Aucun jeton inventé : le titre, le corps et la mention passent par les
// classes que la coquille remappe déjà pour chaque thème (font-cinzel,
// font-prata + text-white, font-lato + text-neutral-300/400), l'accent du
// titre prend themeStyles.highlight, et le cadre comme le bouton reprennent
// les couleurs des formStyles d'ArtistHub, sans leurs italiques.
// La copie française est celle d'Alex, gardée mot pour mot.

import React, { useEffect, useRef, useState } from 'react';
import type { CreatorTheme } from './CreatorStudioShell';

const VEXEL_ARTISTE_URL = 'https://vexelwebstudio.com/artiste';
const SIGIL_VEXEL = '/vexel-sigil.webp';

const HABIT: Record<CreatorTheme, { cadre: string; lueur: string; filet: string; bouton: string }> = {
    RAINBOW: {
        cadre: 'bg-black/40 backdrop-blur-md border border-white/15 rounded-[15px] shadow-[0_0_60px_rgba(217,70,239,0.15)]',
        lueur: 'rgba(34,211,238,0.20)',
        filet: 'bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300',
        bouton: 'rounded-[15px] bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-300 text-black hover:brightness-110',
    },
    RED: {
        cadre: 'bg-[#0a0000] border-2 border-red-900/60 rounded-sm',
        lueur: 'rgba(220,38,38,0.24)',
        filet: 'bg-red-600',
        bouton: 'rounded-sm bg-red-900 hover:bg-red-700 text-white border border-red-500',
    },
    BLUE_PUNK: {
        cadre: 'bg-[#120a1f] border border-fuchsia-500/40 rounded-sm',
        lueur: 'rgba(34,211,238,0.20)',
        filet: 'bg-cyan-400',
        // text-cyan-50 et non text-white : la coquille repeint .font-cinzel.text-white en cyan, illisible sur le fuchsia.
        bouton: 'rounded-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-cyan-50 border border-cyan-400/40',
    },
    CLASSY: {
        cadre: 'bg-[#091428] border-2 border-[#c8aa6e]/50 rounded',
        lueur: 'rgba(200,170,110,0.24)',
        filet: 'bg-[#c8aa6e]',
        bouton: 'rounded bg-[#c8aa6e] hover:bg-[#d4b876] text-[#091428]',
    },
    CHROMATIC: {
        cadre: 'bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.15)]',
        lueur: 'rgba(59,130,246,0.22)',
        filet: 'bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400',
        bouton: 'rounded-xl bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 text-black hover:brightness-110',
    },
    COMIC: {
        cadre: 'bg-[#1e1e24] border-2 border-black shadow-[6px_6px_0px_#facc15] rounded-sm',
        lueur: 'rgba(250,204,21,0.16)',
        filet: 'bg-[#facc15]',
        // text-black et non text-white : la coquille repeint .font-cinzel.text-white en jaune cerclé de noir, illisible à 12 px sur le rouge.
        bouton: 'rounded-sm bg-[#ef4444] text-black border-2 border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000]',
    },
};

export const VexelInvitationStudio: React.FC<{
    language: 'EN' | 'FR';
    theme: CreatorTheme;
    themeStyles: { highlight: string };
}> = ({ language, theme, themeStyles }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const h = HABIT[theme] ?? HABIT.RAINBOW;
    const ref = useRef<HTMLElement>(null);
    // `vu` se verrouille au premier passage; `enVue` met le reflet en pause hors champ.
    const [vu, setVu] = useState(false);
    const [enVue, setEnVue] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => {
            setEnVue(e.isIntersecting);
            if (e.isIntersecting) setVu(true);
        }, { threshold: 0.12 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const monte = `transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        vu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`;

    return (
        <section
            ref={ref}
            aria-labelledby="vx-studio-titre"
            className="relative z-10 w-full lg:max-w-[95%] mx-auto px-4 pt-6 pb-20 md:pb-28"
        >
            <div className={`relative overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-10 lg:gap-14 p-5 sm:p-10 lg:p-12 ${h.cadre}`}>
                <div className={`min-w-0 ${monte}`}>
                    <div className="flex items-center gap-4 mb-6 md:mb-8">
                        <span aria-hidden className={`h-px w-12 ${h.filet}`} />
                        <span className={`font-cinzel uppercase text-[12px] tracking-[0.4em] ${themeStyles.highlight}`}>
                            Vexel Webstudio
                        </span>
                    </div>

                    <h2
                        id="vx-studio-titre"
                        className="font-prata text-white leading-[1.1] text-[clamp(1.125rem,5.2vw,2.75rem)] lg:text-[clamp(1.5rem,2.8vw,2.75rem)]"
                    >
                        {language === 'FR' ? (
                            <>Un site à votre nom qui vend <span className={`whitespace-nowrap ${themeStyles.highlight}`}>vos œuvres</span></>
                        ) : (
                            <>A site in your name that sells <span className={`whitespace-nowrap ${themeStyles.highlight}`}>your work</span></>
                        )}
                    </h2>

                    <p className="mt-6 md:mt-8 font-lato text-neutral-300 text-[15px] md:text-base leading-[1.85] max-w-[62ch]">
                        {t(
                            "Your profile settles you into the Salon's community, and the day your work calls for an address of its own, Vexel Webstudio builds you a custom gallery where your pieces sell directly, with payment built in. No marketplace slips in between you and the people who buy your work, and your list of buyers belongs to you. Vexel and the Salon share the same founder, so trusting your site to the studio also keeps alive the place that welcomes you.",
                            "Votre profil vous installe dans la communauté du Salon, et le jour où votre travail réclame une adresse bien à lui, Vexel Webstudio vous bâtit une galerie sur mesure où vos œuvres se vendent directement, avec le paiement intégré. Aucune place de marché ne se glisse entre vous et les gens qui achètent votre travail, et la liste de vos acheteurs vous appartient. Vexel et le Salon ont le même fondateur, si bien que confier votre site au studio revient aussi à faire vivre le lieu qui vous accueille.",
                        )}
                    </p>

                    <div className="mt-9 md:mt-11">
                        <a
                            href={VEXEL_ARTISTE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group inline-flex w-full sm:w-auto items-center justify-center gap-4 min-h-[52px] px-8 md:px-10 font-cinzel font-bold text-[12px] uppercase tracking-[0.25em] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${h.bouton}`}
                        >
                            {t('See the artist gallery', "Voir la galerie d'artiste")}
                            <span aria-hidden className="text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none">↗</span>
                            <span className="sr-only">{t(' (opens in a new tab)', " (s'ouvre dans un nouvel onglet)")}</span>
                        </a>
                        <p className="mt-5 font-lato text-[13px] leading-relaxed text-neutral-400 max-w-[52ch]">
                            {t(
                                'The studio starts with a proof page that already features one of your pieces, before you commit to anything.',
                                "Le studio commence par une page de preuve qui présente déjà l'une de vos œuvres, avant tout engagement de votre part.",
                            )}
                        </p>
                    </div>
                </div>

                {/* Le sigle chrome de Vexel sur une lueur à la couleur du thème,
                    avec le reflet foil du collant masqué sur ses seuls traits.
                    Décoratif : le texte dit déjà tout. */}
                <figure
                    aria-hidden
                    className={`relative m-0 aspect-[4/3] lg:aspect-square flex items-center justify-center transition-[opacity,transform] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 ${
                        vu ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'
                    }`}
                    style={{ background: `radial-gradient(55% 55% at 50% 50%, ${h.lueur}, transparent 72%)`, transitionDelay: '150ms' }}
                >
                    <div className="relative w-[46%] lg:w-[62%] aspect-[900/833]">
                        <img
                            src={SIGIL_VEXEL}
                            width={900}
                            height={833}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]"
                        />
                        <span className={`vx-studio-foil absolute inset-0 ${enVue ? '' : 'vx-studio-pause'}`}>
                            <span className="vx-studio-sheen" />
                        </span>
                    </div>
                </figure>
            </div>

            <style>{`
                .vx-studio-foil {
                    -webkit-mask: url(${SIGIL_VEXEL}) center / contain no-repeat;
                    mask: url(${SIGIL_VEXEL}) center / contain no-repeat;
                    mix-blend-mode: color;
                    opacity: 0.55;
                    overflow: hidden;
                    pointer-events: none;
                }
                .vx-studio-sheen {
                    position: absolute;
                    inset: -50%;
                    background: repeating-conic-gradient(from 200deg at 50% 50%, #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
                    filter: blur(6px) saturate(1.1);
                    animation: vxStudioDrift 16s cubic-bezier(0.45,0,0.55,1) infinite alternate;
                    will-change: transform;
                }
                .vx-studio-pause .vx-studio-sheen { animation-play-state: paused; }
                @keyframes vxStudioDrift {
                    from { transform: translate3d(-12%, -8%, 0) rotate(0deg); }
                    to   { transform: translate3d(12%, 8%, 0) rotate(40deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .vx-studio-sheen { animation: none; }
                }
            `}</style>
        </section>
    );
};
