// Extraits.tsx : la section Extraits sous ses trois formes. Grand écran : le
// livre ouvert dont les feuilles tournent au défilement (LivreOuvert). Téléphone :
// des feuillets qui se tournent d'un geste horizontal, dans une seule bande qui
// défile (aucun défileur imbriqué). Mouvement réduit : le texte en colonnes.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Section, Apparait, Fleche, nomDe, type SectionProps } from './commun';
import { LivreOuvert } from './LivreOuvert';
import { Page, STYLE_PAGE, usePagination } from './Page';
import { extraitsLisibles, type ExtraitLisible } from './pagination';

function useMedia(requete: string): boolean {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(requete).matches);
  useEffect(() => {
    const mq = window.matchMedia(requete);
    const f = () => setOk(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [requete]);
  return ok;
}

const STYLE_FEUILLETS = `
.al-feuillet{flex:0 0 min(84vw,400px);width:min(84vw,400px);aspect-ratio:5/7.3;border-radius:4px;box-shadow:0 30px 50px -30px var(--es-ombre);will-change:transform;}
.al-bande{scrollbar-width:none;overscroll-behavior-x:contain;padding-inline:calc((100% - min(84vw,400px)) / 2);}
.al-bande::-webkit-scrollbar{display:none;}
`;

function Feuillets({ extraits, nom }: { extraits: ExtraitLisible[]; nom: string }) {
  const { temoin, pages } = usePagination(extraits);
  const bande = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = pages.length + 1;

  // Chaque feuillet pivote selon sa distance au centre : celui du milieu est à plat,
  // ses voisins se relèvent comme une page qu'on tourne.
  useEffect(() => {
    const el = bande.current;
    if (!el) return;
    let raf = 0;
    const peindre = () => {
      raf = 0;
      const centre = el.scrollLeft + el.clientWidth / 2;
      let proche = 0;
      let min = Infinity;
      el.querySelectorAll<HTMLElement>('[data-feuillet]').forEach((it, i) => {
        const d = Math.max(-1, Math.min(1, (it.offsetLeft + it.offsetWidth / 2 - centre) / it.offsetWidth));
        it.style.transformOrigin = d < 0 ? 'right center' : 'left center';
        it.style.transform = `perspective(1100px) rotateY(${(-d * 32).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.06).toFixed(3)})`;
        if (Math.abs(d) < min) { min = Math.abs(d); proche = i; }
      });
      setIndex(proche);
    };
    const f = () => { if (!raf) raf = requestAnimationFrame(peindre); };
    // Les pages arrivent après la mesure : l'accrochage garderait sinon la dernière
    // feuille (le colophon, seule présente au départ) sous les yeux.
    el.scrollLeft = 0;
    peindre();
    el.addEventListener('scroll', f, { passive: true });
    window.addEventListener('resize', f);
    return () => { el.removeEventListener('scroll', f); window.removeEventListener('resize', f); cancelAnimationFrame(raf); };
  }, [pages.length]);

  const tourner = (sens: -1 | 1) => {
    const el = bande.current;
    const it = el?.querySelector<HTMLElement>('[data-feuillet]');
    if (el && it) el.scrollBy({ left: sens * (it.offsetWidth + 16), behavior: 'smooth' });
  };

  return (
    <div className="relative -mx-5">
      <style>{STYLE_PAGE + STYLE_FEUILLETS}</style>
      <div ref={temoin} aria-hidden className="al-feuillet pointer-events-none absolute left-0 top-0" style={{ visibility: 'hidden' }}>
        <Page cote="droite" tete="" folio={0} className="h-full w-full" />
      </div>
      <div ref={bande} className="al-bande relative flex snap-x snap-mandatory gap-4 overflow-x-auto py-6" aria-label="Pages des extraits, à faire glisser" data-bande-feuillets>
        {pages.map((p, k) => (
          <div key={k} className="al-feuillet snap-center overflow-hidden" data-feuillet>
            <Page page={p} folio={k + 1} cote={k % 2 ? 'gauche' : 'droite'} tete={k % 2 ? nom : p.livre ?? p.titre} className="h-full w-full" />
          </div>
        ))}
        <div className="al-feuillet snap-center overflow-hidden" data-feuillet>
          <Page cote="droite" tete="" className="h-full w-full">
            <div className="flex h-full flex-col justify-center text-left">
              <p className="al-titre">La suite est dans le livre</p>
              <p className="text-[color:var(--es-page-ink-2)]">Ces pages s’arrêtent ici, mais l’histoire continue chez votre libraire.</p>
              <a href="#livres" className="es-bouton mt-7 self-start">Voir les livres <Fleche /></a>
            </div>
          </Page>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 px-5">
        <button type="button" onClick={() => tourner(-1)} disabled={index === 0} className="es-bouton-ligne !min-h-[44px] !px-4 disabled:opacity-30" aria-label="Page précédente">
          <Fleche className="h-4 w-4 rotate-180" />
        </button>
        <p className="es-num text-[0.9375rem] text-[color:var(--es-ink-2)]" aria-live="polite">Page {Math.min(index + 1, total)} sur {total}</p>
        <button type="button" onClick={() => tourner(1)} disabled={index >= total - 1} className="es-bouton-ligne !min-h-[44px] !px-4 disabled:opacity-30" aria-label="Page suivante">
          <Fleche />
        </button>
      </div>
    </div>
  );
}

function Colonnes({ extraits }: { extraits: ExtraitLisible[] }) {
  return (
    <div className="space-y-16">
      {extraits.map((x) => (
        <Apparait key={x.id}>
          <article className="border-t border-[color:var(--es-line-fort)] pt-8">
            <h3 className="es-display text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-tight">{x.titre}</h3>
            {x.livre && x.livre !== x.titre && <p className="mt-2 text-[0.9375rem] text-[color:var(--es-ink-3)]">tiré de {x.livre}</p>}
            <div className="mt-8 gap-12 text-[1.0625rem] leading-[1.75] text-[color:var(--es-ink-2)] md:columns-2" lang="fr" data-extraits-colonnes>
              {x.paragraphes.map((p, i) => <p key={i} className={i ? 'mt-4' : ''}>{p}</p>)}
            </div>
          </article>
        </Apparait>
      ))}
    </div>
  );
}

export function Extraits({ config, fallbackDisplayName }: SectionProps) {
  const extraits = useMemo(() => extraitsLisibles(config), [config]);
  const sans = useReducedMotion();
  const mobile = useMedia('(max-width: 767px)');
  if (!extraits.length) return null;
  const nom = nomDe(config, fallbackDisplayName);

  if (sans) {
    return <Section id="extraits" label="Extraits" titre="Premières pages" ton="fond-2"><Colonnes extraits={extraits} /></Section>;
  }
  if (mobile) {
    return (
      <Section id="extraits" label="Extraits" titre="Premières pages" ton="fond-2" className="overflow-x-clip">
        <Feuillets extraits={extraits} nom={nom} />
      </Section>
    );
  }
  return (
    <section id="extraits" data-section="extraits" className="relative w-full scroll-mt-[68px] border-t border-[color:var(--es-line)] bg-[color:var(--es-bg-2)]">
      <LivreOuvert extraits={extraits} nom={nom} />
    </section>
  );
}
