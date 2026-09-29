// Livres.tsx : la bibliographie. Le premier livre de la liste tient la une,
// en volume, avec son résumé entier et ses libraires; les autres suivent en
// grille, couverture d'abord, jusqu'à trente.

import { Section, Apparait, Externe, Fleche, type SectionProps } from './commun';
import { lienHttpsValide, type Livre } from '@/espace/types';
import { Livre3D } from './Livre3D';

function Libraires({ livre, petit }: { livre: Livre; petit?: boolean }) {
  const liens = (livre.libraires ?? []).filter((l) => l.nom?.trim() && lienHttpsValide(l.url));
  if (!liens.length) return null;
  return (
    <ul className={`flex flex-wrap ${petit ? 'gap-x-4 gap-y-1' : 'gap-2'}`} aria-label={`Se procurer ${livre.titre}`}>
      {liens.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className={petit ? 'es-lien inline-flex min-h-[40px] items-center gap-1.5 text-[0.9375rem]' : 'es-bouton-ligne !min-h-[44px] !px-4'}>
            {l.nom} <Externe className="h-3.5 w-3.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Couverture({ livre }: { livre: Livre }) {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[4px] bg-[color:var(--es-bg-3)] shadow-[0_24px_40px_-24px_var(--es-ombre)] transition-transform duration-500 ease-out group-hover:-translate-y-1.5">
      {livre.couverture?.url
        ? <img src={livre.couverture.url} alt={livre.titre} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        : <span className="es-display absolute inset-x-5 bottom-5 text-[1.375rem] leading-tight">{livre.titre}</span>}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[7%]" style={{ background: 'linear-gradient(90deg, var(--es-page-ombre), transparent)' }} />
    </div>
  );
}

export function Livres({ espace }: SectionProps) {
  const livres = (espace.contenu?.livres ?? []).filter((l) => l.titre?.trim());
  if (!livres.length) return null;
  const avecExtrait = new Set((espace.contenu?.extraits ?? []).filter((x) => x.texte?.trim()).map((x) => x.livre));
  const extraitsOuverts = espace.sections?.extraits !== false;
  const [une, ...autres] = livres;
  // Peu de livres : des fiches couchées sur deux colonnes, pour qu'aucune ligne ne reste à moitié vide.
  const couche = autres.length <= 2;
  const nom = espace.contenu?.nom?.trim();

  return (
    <Section id="livres" label="Livres" titre={livres.length > 1 ? 'La bibliothèque' : 'Le livre'}>
      <div className="grid items-center gap-12 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-20">
        <Apparait>
          <div className="mx-auto w-[min(64vw,20rem)] md:w-[min(28vw,22rem)]" style={{ perspective: 1400 }}>
            <div className="transition-transform duration-700 ease-out [transform-style:preserve-3d] [transform:rotateY(-22deg)_rotateX(4deg)] hover:[transform:rotateY(-8deg)_rotateX(2deg)]">
              <Livre3D titre={une.titre} couverture={une.couverture?.url} auteur={nom} />
            </div>
          </div>
        </Apparait>
        <Apparait delai={0.1}>
          {(une.mention || une.annee) && (
            <p className="es-label text-[color:var(--es-ink-3)]">{[une.mention, une.annee].filter(Boolean).join(' · ')}</p>
          )}
          <h3 className="es-display mt-4 max-w-[18ch] text-[clamp(2rem,1.5rem+2vw,3.25rem)] leading-[1.04]">{une.titre}</h3>
          {une.resume && (
            <div className="mt-6 max-w-[38rem] space-y-4 text-[1.125rem] leading-[1.75] text-[color:var(--es-ink-2)]">
              {une.resume.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Libraires livre={une} />
            {extraitsOuverts && avecExtrait.has(une.id) && <a href="#extraits" className="es-lien inline-flex min-h-[44px] items-center gap-2 text-[1rem]">Lire un extrait <Fleche /></a>}
          </div>
        </Apparait>
      </div>

      {autres.length > 0 && (
        <ul className={`mt-20 grid gap-y-12 border-t border-[color:var(--es-line)] pt-14 ${couche ? 'gap-x-10 md:grid-cols-2 lg:gap-x-16' : `grid-cols-2 gap-x-5 sm:grid-cols-3 lg:gap-x-8 ${autres.length === 3 ? '' : 'lg:grid-cols-4'}`}`} data-grille-livres>
          {autres.map((l, i) => (
            <li key={l.id} className="group">
              <Apparait delai={(i % 4) * 0.08} className={couche ? 'grid grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] items-start gap-6 md:gap-8' : undefined}>
                <Couverture livre={l} />
                <div>
                <p className={`es-display text-[1.25rem] leading-tight md:text-[1.4rem] ${couche ? "" : "mt-5"}`}>{l.titre}</p>
                {(l.mention || l.annee) && <p className="es-num mt-1 text-[0.875rem] text-[color:var(--es-ink-3)]">{[l.mention, l.annee].filter(Boolean).join(' · ')}</p>}
                {l.resume && <p className="mt-3 line-clamp-5 text-[0.9375rem] leading-relaxed text-[color:var(--es-ink-2)]">{l.resume}</p>}
                <div className="mt-3"><Libraires livre={l} petit /></div>
                </div>
              </Apparait>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
