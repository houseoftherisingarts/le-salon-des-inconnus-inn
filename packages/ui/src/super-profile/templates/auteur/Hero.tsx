// Hero.tsx : l'entrée du gabarit Auteur. Le nom en très grand à gauche; à
// droite, le livre le plus récent en volume, qui flotte doucement et se tourne
// vers le lecteur au premier défilement pendant que son halo s'allume. Avec une
// bannière, la photo couvre l'écran derrière les deux. Sans livre, le portrait
// prend la place du volume.

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { EASE, Fleche, type SectionProps } from './commun';
import { Livre3D } from './Livre3D';

function tailleNom(nom: string): string {
  const n = nom.length;
  if (n <= 12) return 'clamp(3.4rem, 1.6rem + 8.4vw, 9.5rem)';
  if (n <= 22) return 'clamp(2.9rem, 1.3rem + 5.6vw, 7rem)';
  return 'clamp(2.4rem, 1.2rem + 4.2vw, 5.5rem)';
}

export function Hero({ espace }: SectionProps) {
  const c = espace.contenu ?? {};
  const nom = c.nom?.trim() || 'Votre nom';
  const banniere = c.banniere?.url;
  const livre = (c.livres ?? []).find((l) => l.titre?.trim());
  const aExtraits = (c.extraits ?? []).some((x) => x.texte?.trim()) && espace.sections?.extraits !== false;
  const ref = useRef<HTMLElement>(null);
  const sans = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const tourne = useTransform(scrollYProgress, [0, 0.6], [-34, -8]);
  const penche = useTransform(scrollYProgress, [0, 0.6], [10, 2]);
  const monte = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const halo = useTransform(scrollYProgress, [0, 0.5], [0.45, 1]);
  const photo = useTransform(scrollYProgress, [0, 1], [1.08, 1]);

  const entree = (i: number) =>
    sans ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, delay: 0.35 + i * 0.1, ease: EASE } };

  const objet = livre ? (
    <motion.div className="relative mx-auto w-[min(62vw,19rem)] md:w-[min(26vw,23rem)]" style={sans ? undefined : { y: monte }}>
      <motion.div aria-hidden className="absolute -inset-[30%] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, var(--es-glow), transparent 62%)', opacity: sans ? 0.8 : halo }} />
      <motion.div
        initial={sans ? false : { opacity: 0, y: 60, rotateZ: -4 }}
        animate={sans ? undefined : { opacity: 1, y: [0, -12, 0], rotateZ: 0 }}
        transition={sans ? undefined : { opacity: { duration: 1.2, delay: 0.55, ease: EASE }, rotateZ: { duration: 1.2, delay: 0.55, ease: EASE }, y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.6 } }}
        style={{ perspective: 1400 }}
      >
        <span aria-hidden className="absolute -bottom-8 left-[8%] right-[2%] h-10 rounded-[50%] blur-2xl" style={{ background: 'var(--es-ombre)' }} />
        <motion.div style={sans ? { rotateY: -18, rotateX: 4 } : { rotateY: tourne, rotateX: penche }} className="[transform-style:preserve-3d]" data-hero-livre>
          <Livre3D titre={livre.titre} couverture={livre.couverture?.url} auteur={nom} style={{ ['--ep' as string]: '36px' }} />
        </motion.div>
      </motion.div>
      <p className="relative mt-10 text-center text-[0.9375rem]" style={{ opacity: 0.8 }}>
        <span className="es-label !text-[0.8125rem]">Le plus récent</span>
        <span className="es-display mt-2 block text-[1.375rem] leading-tight">{livre.titre}</span>
      </p>
    </motion.div>
  ) : c.portrait?.url ? (
    <img src={c.portrait.url} alt="" className="mx-auto aspect-[4/5] w-full max-w-[26rem] rounded-[var(--es-radius)] object-cover" />
  ) : null;

  return (
    <header ref={ref} id="accueil" className="relative flex min-h-[100svh] w-full items-center overflow-hidden px-5 pb-16 pt-28 md:px-10 md:pb-20 md:pt-32" data-sombre-hero={banniere ? true : undefined}>
      {banniere ? (
        <>
          <motion.img src={banniere} alt="" className="absolute inset-0 h-full w-full object-cover" style={sans ? undefined : { scale: photo }} fetchPriority="high" />
          <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(100deg, var(--es-voile) 10%, transparent 80%), linear-gradient(180deg, transparent 50%, var(--es-voile) 100%)' }} />
        </>
      ) : (
        <div aria-hidden className="pointer-events-none absolute -left-[25vw] top-[10%] h-[70vw] w-[70vw] rounded-full opacity-70 blur-3xl" style={{ background: 'radial-gradient(circle, var(--es-tint), transparent 65%)' }} />
      )}
      <div className="relative mx-auto grid w-full max-w-[1320px] items-center gap-16 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]" style={banniere ? { color: 'var(--es-sur-photo)' } : undefined} data-hero-sur-photo={banniere ? true : undefined}>
        <div>
          <motion.h1 {...entree(0)} className="es-display leading-[0.96]" style={{ fontSize: tailleNom(nom) }} data-hero-titre>{nom}</motion.h1>
          {c.accroche && (
            <motion.p {...entree(1)} className="mt-7 max-w-[36rem] text-[1.125rem] leading-relaxed md:text-[1.3125rem]" style={{ opacity: 0.86 }}>{c.accroche}</motion.p>
          )}
          <motion.div {...entree(2)} className="mt-10 flex flex-wrap gap-3">
            {aExtraits && <a href="#extraits" className="es-bouton">Lire un extrait <Fleche /></a>}
            {livre && <a href="#livres" className={banniere ? 'es-bouton-ligne !border-current !text-inherit backdrop-blur-md' : 'es-bouton-ligne'}>Les livres</a>}
          </motion.div>
        </div>
        {objet}
      </div>
    </header>
  );
}
