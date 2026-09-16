// Dernière scène de l'accueil, posée juste avant le pied de page : elle invite
// les gens qui tiennent au lieu à confier leur prochain site à Vexel Webstudio,
// ce qui devient une autre façon de le faire vivre. La copie française a passé
// le vérificateur de voix le 16 septembre 2026 et se garde mot pour mot.
//
// Le visuel réemploie deux vrais actifs : le sigle chrome de Vexel (copié de
// vexel-site/public/vexel-sigil.webp) et le sigle doré du Salon déjà servi par
// le collant du pied de page des profils. Le reflet irisé reprend la recette
// foil de ce même collant (PiedDePage.tsx), masqué sur les seuls traits du sigle
// pour que la couleur reste dans le métal au lieu de se poser sur la surface.
// La page n'emploie pas framer-motion : l'entrée suit donc le patron maison,
// un IntersectionObserver et des transitions CSS sur opacity et transform.

import React, { useEffect, useRef, useState } from 'react';

const VEXEL_URL = 'https://vexelwebstudio.com';
const SIGIL_VEXEL = '/vexel-sigil.webp';
const SIGIL_SALON = '/salon-logo-or.png';

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

export const VexelSoutienSection: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const ref = useRef<HTMLElement>(null);
  // `vu` se verrouille au premier passage (l'entrée ne joue qu'une fois);
  // `enVue` suit l'écran pour que le reflet ne tourne pas hors champ.
  const [vu, setVu] = useState(false);
  const [enVue, setEnVue] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setEnVue(entry.isIntersecting);
        if (entry.isIntersecting) setVu(true);
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const monte = `transition-[opacity,transform] duration-[1100ms] ${EASE} motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
    vu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
  }`;
  const delai = (ms: number) => ({ transitionDelay: `${ms}ms` });

  return (
    <section
      ref={ref}
      aria-labelledby="vexel-soutien-titre"
      className="relative overflow-hidden bg-[#050505] border-t border-[#c5a059]/15 px-6 md:px-12 lg:px-20 py-20 md:py-32"
    >
      {/* Lumière de la pièce : une clé dorée côté texte (le Salon), une lueur
          froide côté sigle (le chrome de Vexel). */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(55% 65% at 10% 20%, rgba(197,160,89,0.12), transparent 70%), radial-gradient(45% 60% at 90% 80%, rgba(245,245,245,0.05), transparent 72%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-14 lg:gap-16 xl:gap-24 items-center">
        <div className="min-w-0">
          <div className={`flex items-center gap-4 mb-7 md:mb-9 ${monte}`} style={delai(0)}>
            <span aria-hidden className="h-px w-12 bg-[#c5a059]" />
            <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
              Vexel Webstudio
            </span>
          </div>

          <h2
            id="vexel-soutien-titre"
            className={`font-prata text-[#f3e5ab] leading-[1.02] tracking-[-0.01em] ${monte}`}
            style={{ fontSize: 'clamp(2.1rem, 4.4vw, 4.4rem)', ...delai(90) }}
          >
            {language === 'EN' ? (
              <>Keep the Salon <span className="text-[#c5a059]">alive</span></>
            ) : (
              <>Faire vivre le Salon <span className="text-[#c5a059]">autrement</span></>
            )}
          </h2>

          <p
            className={`mt-7 md:mt-9 font-lato text-neutral-300 text-[15px] md:text-base leading-[1.85] max-w-[62ch] ${monte}`}
            style={delai(180)}
          >
            {t(
              'Le Salon des Inconnus and Vexel Webstudio come out of the same workshop, and the hands that built the site you are browsing right now also build, for others, websites and applications made entirely to measure. If this place matters to you, trusting the studio with your next site, or with the site of someone close to you who carries a project, becomes another way to keep it alive, and in return you receive a home online drawn for the person who will live in it.',
              "Le Salon des Inconnus et Vexel Webstudio sortent du même atelier, et les mains qui ont construit le site que vous parcourez en ce moment bâtissent aussi, pour d'autres, des sites et des applications entièrement sur mesure. Si ce lieu compte pour vous, confier au studio votre prochain site, ou celui d'une personne de votre entourage qui porte un projet, devient une autre façon de le faire vivre, et vous recevez en échange une maison en ligne dessinée pour celui ou celle qui l'habitera."
            )}
          </p>

          <div className={`mt-10 md:mt-12 ${monte}`} style={delai(270)}>
            <a
              href={VEXEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full sm:w-auto items-center justify-center gap-4 min-h-[52px] px-8 md:px-10 rounded-[15px] bg-[#c5a059] text-[#18181b] font-josefin font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3e5ab]"
            >
              {t('See what Vexel builds', 'Voir ce que Vexel bâtit')}
              <span
                aria-hidden
                className="text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              >
                ↗
              </span>
              <span className="sr-only">{t(' (opens in a new tab)', " (s'ouvre dans un nouvel onglet)")}</span>
            </a>
            <p className="mt-5 font-lato text-[13px] leading-relaxed text-neutral-400 max-w-[50ch]">
              {t(
                'Your quote takes shape on screen over eight questions, and you read it before you send it, without anything binding you.',
                "Votre soumission s'écrit à l'écran en huit questions, et vous la lisez avant de l'envoyer, sans que rien ne vous engage."
              )}
            </p>
          </div>
        </div>

        {/* La plaque : verre sombre bordé d'or, sigle chrome au centre, sigle
            du Salon dans le coin. Décorative, le texte dit déjà tout. */}
        <figure
          aria-hidden
          className={`vx-soutien-plaque relative m-0 aspect-[4/3] lg:aspect-[4/5] rounded-[15px] overflow-hidden transition-[opacity,transform] duration-[1300ms] ${EASE} motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 ${
            vu ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'
          }`}
          style={delai(150)}
        >
          <span
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(60% 55% at 50% 46%, rgba(245,245,245,0.08), transparent 72%)' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[50%] lg:w-[66%] aspect-[900/833]">
              <img
                src={SIGIL_VEXEL}
                width={900}
                height={833}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]"
              />
              <span className={`vx-soutien-foil absolute inset-0 ${enVue ? '' : 'vx-soutien-pause'}`}>
                <span className="vx-soutien-sheen" />
              </span>
            </div>
          </div>
          <img
            src={SIGIL_SALON}
            width={512}
            height={512}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute left-3 bottom-3 md:left-5 md:bottom-5 h-12 md:h-16 w-auto opacity-90"
          />
        </figure>
      </div>

      <style>{`
        .vx-soutien-plaque {
          background:
            linear-gradient(160deg, rgba(243,229,171,0.06) 0%, rgba(255,255,255,0.012) 48%, rgba(245,245,245,0.04) 100%),
            #0a0908;
          box-shadow:
            inset 0 0 0 1px rgba(197,160,89,0.24),
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 50px 90px -50px rgba(197,160,89,0.30);
        }
        .vx-soutien-foil {
          -webkit-mask: url(${SIGIL_VEXEL}) center / contain no-repeat;
          mask: url(${SIGIL_VEXEL}) center / contain no-repeat;
          mix-blend-mode: color;
          opacity: 0.55;
          overflow: hidden;
          pointer-events: none;
        }
        .vx-soutien-sheen {
          position: absolute;
          inset: -50%;
          background: repeating-conic-gradient(from 200deg at 50% 50%, #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
          filter: blur(6px) saturate(1.1);
          animation: vxSoutienDrift 16s cubic-bezier(0.45,0,0.55,1) infinite alternate;
          will-change: transform;
        }
        .vx-soutien-pause .vx-soutien-sheen { animation-play-state: paused; }
        @keyframes vxSoutienDrift {
          from { transform: translate3d(-12%, -8%, 0) rotate(0deg); }
          to   { transform: translate3d(12%, 8%, 0) rotate(40deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vx-soutien-sheen { animation: none; }
        }
      `}</style>
    </section>
  );
};
