// Centre d'arts et communauté : la scène de l'accueil qui ouvre sur le centre
// d'arts et le Creator Studio (vague 2 de l'écosystème, 16 septembre 2026).
// Vraie photo d'un tournage devant la Maison Favier (media/Artistes/vignes et
// cam.jpg, 2800 px), servie en WebP à trois largeurs. La photo est en largeur :
// bandeau plein cadre sur grand écran, image au-dessus du texte sur téléphone.
// Entrée au patron maison (IntersectionObserver et transitions CSS), comme
// VexelSoutienSection. Les textes s'appuient sur des faits déjà écrits dans
// config/seo.content.ts et config/seo.config.ts, et ont passé verifier.py.

import React, { useEffect, useRef, useState } from 'react';

const SRC = '/media/centre-arts/tournage-manoir';
const SRCSET = `${SRC}-960.webp 960w, ${SRC}-1600.webp 1600w, ${SRC}-2400.webp 2400w`;
const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

export const CentreArtsCommunauteSection: React.FC<{
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
}> = ({ language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const ref = useRef<HTMLElement>(null);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const monte = `transition-[opacity,transform] duration-[1100ms] ${EASE} motion-reduce:transition-none ${vu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;
  const delai = (ms: number) => ({ transitionDelay: `${ms}ms` });

  const aller = (view: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(view);
  };

  return (
    <section
      ref={ref}
      aria-labelledby="centre-arts-titre"
      className="relative w-full overflow-hidden bg-[#050505] border-t border-[#c5a059]/15 lg:min-h-[88svh] lg:flex lg:items-end"
    >
      {/* Photo : bandeau au-dessus du texte sur téléphone, plein cadre sur grand écran */}
      <div className="relative w-full aspect-[3/2] lg:absolute lg:inset-0 lg:aspect-auto">
        <img
          src={`${SRC}-1600.webp`}
          srcSet={SRCSET}
          sizes="100vw"
          alt={t(
            'A film shoot in the garden in front of Maison Favier, home of Le Salon des Inconnus',
            'Un tournage dans le jardin devant la Maison Favier, où vit Le Salon des Inconnus'
          )}
          loading="lazy"
          decoding="async"
          width={2800}
          height={1861}
          className={`absolute inset-0 w-full h-full object-cover object-[60%_center] transition-transform duration-[2400ms] ${EASE} motion-reduce:transition-none ${vu ? 'scale-100' : 'scale-[1.06]'}`}
        />
        {/* Voile : fond du texte sur grand écran, fondu vers le noir sur téléphone */}
        <span aria-hidden className="absolute inset-0 pointer-events-none lg:hidden" style={{ background: 'linear-gradient(to bottom, rgba(5,5,5,0) 55%, rgba(5,5,5,1) 100%)' }} />
        <span aria-hidden className="absolute inset-0 pointer-events-none hidden lg:block" style={{ background: 'linear-gradient(90deg, rgba(5,5,5,0.94) 0%, rgba(5,5,5,0.78) 32%, rgba(5,5,5,0.25) 62%, rgba(5,5,5,0) 100%), linear-gradient(to top, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0) 45%)' }} />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-16 pt-2 lg:py-24">
        <div className="max-w-[760px]">
          <div className={`flex items-center gap-4 mb-6 ${monte}`}>
            <span className="h-px w-12 bg-[#c5a059]" aria-hidden />
            <span className="font-cinzel uppercase text-[#c5a059] text-[12px] tracking-[0.25em] sm:tracking-[0.4em] whitespace-nowrap">
              {t('Arts centre & community', "Centre d'arts et communauté")}
            </span>
          </div>

          <h2
            id="centre-arts-titre"
            className={`font-prata text-[#f3e5ab] leading-[1.06] tracking-[-0.01em] mb-7 ${monte}`}
            style={{ fontSize: 'clamp(2.1rem, 4.2vw, 4rem)', ...delai(120) }}
          >
            {t('A manor that welcomes artists', 'Un manoir qui accueille les artistes')}
          </h2>

          <div className={`max-w-[600px] space-y-5 font-lato text-neutral-200 text-[16px] md:text-[17px] leading-[1.8] ${monte}`} style={delai(240)}>
            <p>
              {t(
                'Beyond the rooms, Maison Favier houses an artists’ centre where emerging, professional and multidisciplinary artists in residence cross paths with musicians and entrepreneurs, so live performances are part of the life of the house.',
                "Au-delà des chambres, la Maison Favier abrite un centre d'artistes où se croisent des artistes émergents, professionnels et multidisciplinaires en résidence, des musiciens et des entrepreneurs, si bien que les spectacles vivants font partie de la vie de la maison."
              )}
            </p>
            <p>
              {t(
                'The arts centre brings together buyers and patrons on one side and, on the other, artists, who find in the Creator Studio a workspace to build their profile and publish their writing.',
                "Le centre d'arts réunit d'un côté les acheteurs et les mécènes, et de l'autre les artistes, qui trouvent au Creator Studio un espace de travail pour bâtir leur profil et publier leurs écrits."
              )}
            </p>
          </div>

          <div className={`mt-10 flex flex-col sm:flex-row gap-3 ${monte}`} style={delai(360)}>
            <a
              href="/centre-arts"
              onClick={aller('CENTRE_ARTS')}
              className="inline-flex items-center justify-center gap-3 min-h-[50px] px-5 sm:px-7 whitespace-nowrap rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.12em] sm:tracking-[0.22em] shadow-[0_6px_24px_rgba(197,160,89,0.28)] hover:bg-[#d4b06a] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3e5ab] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              {t('Discover the arts centre', "Découvrir le centre d'arts")} <span aria-hidden className="hidden sm:inline">→</span>
            </a>
            <a
              href="/creator"
              onClick={aller('CREATOR_STUDIO')}
              className="inline-flex items-center justify-center gap-3 min-h-[50px] px-5 sm:px-7 whitespace-nowrap rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 backdrop-blur-md text-[#f3e5ab] font-cinzel font-bold uppercase text-[12px] tracking-[0.12em] sm:tracking-[0.22em] hover:border-[#c5a059] hover:bg-[#0a0808]/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3e5ab] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              {t('Enter the Creator Studio', 'Entrer au Creator Studio')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CentreArtsCommunauteSection;
