import React, { useEffect, useRef, useState } from 'react';

// Fin de l'accueil, posée juste au-dessus du pied de page : soutenir le Salon en
// confiant un site à Vexel Webstudio. Section à part entière; le collant Vexel
// du pied de page ne bouge pas. Le français est la copie validée, mot pour mot.

const VEXEL_URL = 'https://vexelwebstudio.com';

const COPY = {
  FR: {
    surtitre: 'Vexel Webstudio',
    titre: 'Faire vivre le Salon autrement',
    corps:
      "Le Salon des Inconnus et Vexel Webstudio sortent du même atelier, et les mains qui ont construit le site que vous parcourez en ce moment bâtissent aussi, pour d'autres, des sites et des applications entièrement sur mesure. Si ce lieu compte pour vous, confier au studio votre prochain site, ou celui d'une personne de votre entourage qui porte un projet, devient une autre façon de le faire vivre, et vous recevez en échange une maison en ligne dessinée pour celui ou celle qui l'habitera.",
    bouton: 'Voir ce que Vexel bâtit',
    mention:
      "Votre soumission s'écrit à l'écran en huit questions, et vous la lisez avant de l'envoyer, sans que rien ne vous engage.",
    alt: 'Le bureau de la maison du Salon des Inconnus, un ordinateur ouvert sur la table',
  },
  EN: {
    surtitre: 'Vexel Webstudio',
    titre: 'Another way to keep the Salon alive',
    corps:
      'Le Salon des Inconnus and Vexel Webstudio come out of the same workshop, and the hands that built the site you are browsing right now also build fully custom websites and applications for other people. If this place matters to you, trusting the studio with your next site, or with the site of someone close to you who is carrying a project, becomes another way to keep it alive, and in return you receive a home online designed for the person who will live in it.',
    bouton: 'See what Vexel builds',
    mention:
      'Your quote writes itself on screen in eight questions, and you read it over before sending it, with nothing binding you.',
    alt: 'The study in the house at Le Salon des Inconnus, a laptop open on the desk',
  },
} as const;

// Entrée discrète : opacité + translation seulement, courbe expo, annulée sous
// prefers-reduced-motion (le contenu reste visible même si l'observateur ne part jamais).
const ENTREE =
  'transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0';

export const VexelSupportSection: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
  const c = COPY[language];
  const ref = useRef<HTMLElement>(null);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || vu) return;
    if (typeof IntersectionObserver === 'undefined') { setVu(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVu(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [vu]);

  const monte = (delai: number) => ({
    className: `${ENTREE} ${vu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`,
    style: { transitionDelay: vu ? `${delai}ms` : '0ms' },
  });

  return (
    <section
      ref={ref}
      aria-labelledby="vexel-soutien-titre"
      className="relative bg-[#050505] border-t border-[#c5a059]/10 overflow-hidden"
    >
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
        {/* Texte : premier dans le DOM pour la lecture, à droite sur grand écran. */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <div {...monte(0)}>
            <div className="flex items-center gap-4 mb-7">
              {/* Le sigle argenté de Vexel dans une plaque de verre, liseré irisé du studio. */}
              <span className="vexel-anneau relative inline-flex shrink-0 rounded-[15px] p-px">
                <span className="flex items-center justify-center w-16 h-16 md:w-[72px] md:h-[72px] rounded-[14px] bg-[#0b0a09]/85 backdrop-blur-md">
                  <img
                    src="/vexel-logo.png"
                    alt=""
                    width={329}
                    height={320}
                    loading="lazy"
                    decoding="async"
                    className="w-11 h-11 md:w-12 md:h-12 object-contain drop-shadow-[0_6px_14px_rgba(197,160,89,0.28)]"
                  />
                </span>
              </span>
              <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                {c.surtitre}
              </span>
            </div>
          </div>

          <h2
            id="vexel-soutien-titre"
            {...monte(90)}
            className={`${monte(90).className} font-prata text-[#f3e5ab] leading-[1.04]`}
            style={{ ...monte(90).style, fontSize: 'clamp(1.9rem, 3.6vw, 3.4rem)', letterSpacing: '-0.01em', textWrap: 'balance' }}
          >
            {c.titre}
          </h2>

          <p
            {...monte(180)}
            className={`${monte(180).className} font-lato text-neutral-300 text-[15px] md:text-base leading-[1.85] mt-6 max-w-[60ch]`}
          >
            {c.corps}
          </p>

          <div {...monte(270)} className={`${monte(270).className} mt-9`}>
            <a
              href={VEXEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-[15px] bg-[#c5a059] hover:bg-[#d4b06a] text-[#18181b] font-josefin font-bold text-xs uppercase tracking-[0.3em] px-8 py-4 min-h-[48px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3e5ab]"
            >
              {c.bouton}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </a>
            <p className="font-lato text-neutral-400 text-sm leading-relaxed mt-5 max-w-[52ch]">
              {c.mention}
            </p>
          </div>
        </div>

        {/* Photo réelle du bureau de la maison, à gauche sur grand écran, en tête sur mobile. */}
        <figure
          className={`order-first lg:order-none lg:col-start-1 lg:row-start-1 relative overflow-hidden rounded-[15px] ${ENTREE} ${vu ? 'opacity-100' : 'opacity-0'}`}
          style={{ aspectRatio: '4 / 3' }}
        >
          <img
            src="/media/inn/bureau-shire-1400.webp"
            srcSet="/media/inn/bureau-shire-800.webp 800w, /media/inn/bureau-shire-1400.webp 1400w"
            sizes="(min-width: 1024px) 54vw, 100vw"
            alt={c.alt}
            width={1400}
            height={1050}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:scale-100 ${vu ? 'scale-100' : 'scale-[1.04]'}`}
          />
          <span className="absolute inset-0 pointer-events-none rounded-[15px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(197,160,89,0.25)' }} />
        </figure>
      </div>

      <style>{`
        .vexel-anneau {
          background: linear-gradient(135deg, rgba(255,158,203,0.55), rgba(255,224,138,0.55), rgba(155,255,207,0.5), rgba(138,212,255,0.55), rgba(201,164,255,0.55));
          box-shadow: 0 18px 40px -18px rgba(0,0,0,0.8);
        }
      `}</style>
    </section>
  );
};
