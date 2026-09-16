// Mouvement de /centre-arts : titres qui montent ligne par ligne, cadres qui
// s'ouvrent, parallaxe douce au bureau, métas en cascade. Aucun pin, aucune
// section collante : le défilement reste natif dans le conteneur de la page,
// d'où le `scroller` sur chaque déclencheur. Tous les états de départ sont posés
// dans la branche « bouge » : sans JavaScript ou en mouvement réduit, tout est visible.
import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useRevelations(ref: RefObject<HTMLDivElement | null>, pret: boolean) {
  useLayoutEffect(() => {
    const scroller = ref.current;
    if (!scroller || !pret) return;
    const mm = gsap.matchMedia(scroller);
    mm.add(
      { bouge: '(prefers-reduced-motion: no-preference)', large: '(min-width: 1024px) and (hover: hover)' },
      (ctx) => {
        const { bouge, large } = ctx.conditions as { bouge: boolean; large: boolean };
        if (!bouge) return;
        const q = (sel: string) => gsap.utils.toArray<HTMLElement>(sel, scroller);
        q('[data-ca-titre]').forEach((titre) => {
          const lignes = titre.querySelectorAll('[data-ca-ligne] > span');
          if (!lignes.length) return;
          gsap.from(lignes, {
            yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09,
            scrollTrigger: { trigger: titre, scroller, start: 'top 88%', once: true },
          });
        });
        q('[data-ca-cadre]').forEach((cadre) => {
          const masque = cadre.querySelector('[data-ca-masque]');
          const image = cadre.querySelector('[data-ca-image]');
          // Quatre valeurs des deux côtés : GSAP n'interpole pas « inset(0px round 15px) ».
          if (masque) gsap.fromTo(masque,
            { clipPath: 'inset(8% 4% 8% 4% round 15px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 15px)', duration: 1.2, ease: 'power3.out',
              scrollTrigger: { trigger: cadre, scroller, start: 'top 85%', once: true } });
          if (large && image) gsap.fromTo(image, { yPercent: -4 }, {
            yPercent: 4, ease: 'none',
            scrollTrigger: { trigger: cadre, scroller, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });
        q('[data-ca-metas]').forEach((groupe) =>
          gsap.from(groupe.children, {
            y: 16, autoAlpha: 0, duration: 0.7, ease: 'power2.out', stagger: 0.06,
            scrollTrigger: { trigger: groupe, scroller, start: 'top 90%', once: true },
          }));
      });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, [ref, pret]);
}
