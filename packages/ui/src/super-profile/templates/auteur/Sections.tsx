// Sections.tsx : les sections de lecture du gabarit Auteur (événements et
// salons, presse, bio), portées de Vexel Space et branchées sur le document
// du Profil Pro. Chacune ne se rend que si elle a de quoi montrer.

import { Section, Apparait, Externe, nomDe, type SectionProps } from './commun';
import { lienHttpsValide, type EvenementEspace as Evenement } from '../../types';

/** La date du jour en AAAA-MM-JJ, à l'heure locale. */
function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function morceaux(iso: string) {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, (m || 1) - 1, j || 1);
  if (Number.isNaN(d.getTime())) return null;
  return {
    jour: String(d.getDate()),
    mois: d.toLocaleDateString('fr-CA', { month: 'long' }),
    annee: String(d.getFullYear()),
    semaine: d.toLocaleDateString('fr-CA', { weekday: 'long' }),
  };
}

function Ligne({ e, passe }: { e: Evenement; passe?: boolean }) {
  const d = morceaux(e.date);
  return (
    <li className={`grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-5 gap-y-3 border-b border-[color:var(--es-line-fort)] py-7 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:gap-x-10 ${passe ? 'opacity-60' : ''}`}>
      <p className="es-num leading-none">
        <span className="es-display block text-[2.75rem] md:text-[3.5rem]">{d?.jour ?? ''}</span>
        <span className="es-label mt-2 block !text-[0.8125rem] !tracking-[0.14em] text-[color:var(--es-accent-texte)]">{d ? `${d.mois} ${d.annee}` : e.date}</span>
      </p>
      <div className="min-w-0">
        <p className="es-display text-[1.5rem] leading-tight md:text-[1.75rem]">{e.titre}</p>
        {d && <p className="mt-1 text-[0.9375rem] capitalize text-[color:var(--es-ink-3)]">{d.semaine}</p>}
      </div>
      <p className="col-start-2 text-[1rem] leading-relaxed text-[color:var(--es-ink-2)] md:col-start-auto">{e.lieu}</p>
      {!passe && lienHttpsValide(e.lien) ? (
        <a href={e.lien} target="_blank" rel="noopener noreferrer" className="es-bouton-ligne col-start-2 justify-self-start md:col-start-auto">Détails <Externe /></a>
      ) : <span className="hidden md:block" />}
    </li>
  );
}

export function Evenements({ config }: SectionProps) {
  const tous = (config.evenements ?? []).filter((e) => e.titre?.trim() && e.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!tous.length) return null;
  const jour = aujourdhui();
  const aVenir = tous.filter((e) => e.date >= jour);
  const passes = tous.filter((e) => e.date < jour).reverse().slice(0, 4);
  return (
    <Section id="evenements" label="Événements et salons" titre={aVenir.length ? 'Où me rencontrer' : 'Rencontres passées'} ton="fond">
      {aVenir.length > 0 && (
        <ul className="border-t border-[color:var(--es-line-fort)]">
          {aVenir.map((e) => <Ligne key={e.id} e={e} />)}
        </ul>
      )}
      {passes.length > 0 && (
        <div className={aVenir.length ? 'mt-16' : ''}>
          {aVenir.length > 0 && <p className="es-label mb-4 text-[color:var(--es-ink-3)]">Déjà passés</p>}
          <ul className="border-t border-[color:var(--es-line-fort)]">
            {passes.map((e) => <Ligne key={e.id} e={e} passe />)}
          </ul>
        </div>
      )}
    </Section>
  );
}

export function Presse({ config }: SectionProps) {
  const articles = (config.presse ?? [])
    .filter((a) => a.citation?.trim())
    .map((a, i) => ({ id: String(i), media: a.source?.trim() ?? '', citation: a.citation, lien: a.lienArticle }));
  const epk = lienHttpsValide(config.lienEPK) ? config.lienEPK : undefined;
  if (!articles.length) return null;
  return (
    <Section id="presse" label="Presse" titre="On en parle" ton="fond-2" aside={epk && <a href={epk} target="_blank" rel="noopener noreferrer" className="es-bouton-ligne justify-self-start">Dossier de presse <Externe /></a>}>
      <ul className="grid gap-5 md:grid-cols-2">
        {articles.map((a, i) => (
          <li key={a.id} className={i === 0 && articles.length % 2 === 1 ? 'md:col-span-2' : ''}>
            <Apparait delai={(i % 2) * 0.08} className="h-full">
              <figure className="es-verre flex h-full flex-col justify-between gap-8 p-7 md:p-10">
                {a.citation && (
                  <blockquote className={`es-display leading-[1.2] ${i === 0 && articles.length % 2 === 1 ? 'text-[clamp(1.6rem,1.2rem+1.6vw,2.6rem)]' : 'text-[clamp(1.35rem,1.1rem+0.9vw,1.9rem)]'}`}>
                    <span aria-hidden className="text-[color:var(--es-accent-texte)]">« </span>{a.citation}<span aria-hidden className="text-[color:var(--es-accent-texte)]"> »</span>
                  </blockquote>
                )}
                <figcaption className="flex flex-wrap items-center justify-between gap-4">
                  <span className="es-label text-[color:var(--es-ink-2)]">{a.media}</span>
                  {lienHttpsValide(a.lien) && <a href={a.lien} target="_blank" rel="noopener noreferrer" className="es-lien inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem]">Lire l’article <Externe /></a>}
                </figcaption>
              </figure>
            </Apparait>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Bio({ config, fallbackDisplayName }: SectionProps) {
  const texte = config.bio?.trim();
  if (!texte) return null;
  const portrait = config.hero?.url;
  return (
    <Section id="bio" label="Bio">
      <div className={`grid items-center gap-12 ${portrait ? 'md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-20' : ''}`}>
        {portrait && (
          <Apparait>
            <img src={portrait} alt={nomDe(config, fallbackDisplayName)} loading="lazy" className="aspect-[4/5] w-full rounded-[var(--es-radius)] object-contain" />
          </Apparait>
        )}
        <Apparait delai={0.1}>
          <h2 className="es-display max-w-[16ch] text-[clamp(2.1rem,1.4rem+3vw,4.25rem)] leading-[1.02]">{nomDe(config, fallbackDisplayName)}</h2>
          <div className="mt-8 max-w-[38rem] space-y-5 text-[1.125rem] leading-[1.75] text-[color:var(--es-ink-2)]">
            {texte.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </Apparait>
      </div>
    </Section>
  );
}
