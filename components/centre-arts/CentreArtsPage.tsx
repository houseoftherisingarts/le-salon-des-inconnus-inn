// /centre-arts (vague 5, 16 septembre 2026) : page éditoriale qui défile, à la
// manière de Fortiche. Titres géants en Prata qui remplissent leur cadre et en
// mordent le bas, bascules noir, crème et or au changement de sujet, métas
// libellé/valeur sous les photos, un seul aplat or (Creator Studio). Vraies
// photos seulement, servies en WebP (scripts/centre-arts-images.sh). Canon du
// Salon : Prata, Cinzel, Lato, noir chaud, crème #f3e5ab, or antique #c5a059.
// Aucune italique, aucun élément collant : seul SiteHeader est fixe.

import React, { useRef } from 'react';
import { SiteFooter } from '../SiteFooter';
import { useRevelations } from './useRevelations';
import {
  BILLETS, CHEMINS, IMAGES, S1, S2, S3, S4, S5, S6, S7, TITRES,
  type ImageCA, type Langue, type Meta, type Titre, type Txt,
} from './contenu';

type Nav = (view: string) => void;
type Ton = 'noir' | 'creme' | 'or';

const CSS = `
.ca-racine{--ca-noir:#0a0808;--ca-noir-pied:#050505;--ca-creme:#f3e5ab;--ca-or:#c5a059;--ca-bronze:#6b4e1c;--ca-bronze-nuit:#3d2a0c;
  --ca-gouttiere:clamp(16px,3.9vw,56px);--ca-gap:clamp(16px,2vw,32px);background:var(--ca-noir);font-family:'Lato',sans-serif;-webkit-font-smoothing:antialiased}
.ca-section{padding:clamp(72px,9vw,160px) var(--ca-gouttiere)}
.ca-noir{background:var(--ca-noir);color:#d4d4d4;--ca-titre:var(--ca-creme);--ca-sous:var(--ca-or);--ca-lib:#a3a3a3;--ca-val:var(--ca-or);--ca-filet:rgba(243,229,171,.15);--ca-focus:var(--ca-creme)}
.ca-creme{background:var(--ca-creme);color:rgba(10,8,8,.86);--ca-titre:var(--ca-noir);--ca-sous:var(--ca-bronze);--ca-lib:rgba(10,8,8,.6);--ca-val:var(--ca-bronze);--ca-filet:rgba(10,8,8,.15);--ca-focus:var(--ca-noir)}
.ca-or{background:var(--ca-or);color:rgba(10,8,8,.86);--ca-titre:var(--ca-noir);--ca-sous:var(--ca-bronze-nuit);--ca-lib:rgba(10,8,8,.7);--ca-val:var(--ca-bronze-nuit);--ca-filet:rgba(10,8,8,.18);--ca-focus:var(--ca-noir)}
.ca-racine a:focus-visible,.ca-racine button:focus-visible{outline:2px solid var(--ca-focus);outline-offset:3px;border-radius:4px}
.ca-grille{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--ca-gap)}
.ca-grille>*{grid-column:1/-1}
@media (min-width:1024px){.ca-g-1-6{grid-column:1/7!important}.ca-g-7-12{grid-column:7/13!important}.ca-g-1-5{grid-column:1/6!important}}
.ca-surtitre{display:flex;align-items:center;gap:16px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.35em;text-transform:uppercase;color:var(--ca-sous);margin-bottom:clamp(20px,2.4vw,36px)}
.ca-surtitre::before{content:'';flex:none;width:40px;height:1px;background:currentColor}
.ca-sous{font-family:'Prata',serif;text-transform:uppercase;font-size:clamp(1.15rem,2.2vw,1.9rem);letter-spacing:.02em;line-height:1.15;color:var(--ca-sous);text-wrap:balance}
.ca-corps{font-size:clamp(1rem,.35vw + .92rem,1.1875rem);line-height:1.75;max-width:60ch}
.ca-conteneur{container-type:inline-size;position:relative}
.ca-titre{margin:0;font-weight:400;color:var(--ca-titre)}
.ca-jeu{--ca-retrait:clamp(12px,2.4cqi,40px);display:block;font-family:'Prata',serif;text-transform:uppercase;letter-spacing:-.01em;line-height:.9;
  font-size:clamp(2.5rem,9vw,9rem);font-size:min(calc((100cqi - 2 * var(--ca-retrait)) / var(--ca-em)),12.5rem);padding-inline:var(--ca-retrait)}
.ca-jeu-bureau{display:none}
@media (min-width:768px){.ca-jeu-bureau{display:block}.ca-jeu-tel{display:none}}
.ca-ligne{display:block;overflow:hidden;white-space:nowrap;padding-top:.12em;margin-top:-.12em}
.ca-ligne>span{display:block}
.ca-morsure .ca-jeu,.ca-morsure-tel .ca-jeu{position:relative;z-index:2;margin-top:calc(-1 * ((var(--ca-lignes) - 1) * .9em + .5em))}
@media (min-width:1024px){.ca-morsure-tel .ca-jeu{margin-top:0}.ca-seul-tel{display:none}}
.ca-seul-bureau{display:none}
@media (min-width:1024px){.ca-seul-bureau{display:block}}
.ca-dessus .ca-jeu{margin-bottom:clamp(20px,3vw,48px)}
.ca-cadre{margin:0;position:relative}
.ca-masque{position:relative;overflow:hidden;border-radius:15px;clip-path:inset(0% 0% 0% 0% round 15px);aspect-ratio:var(--ca-ratio-tel);background:#1a1614}
@media (min-width:768px){.ca-masque{aspect-ratio:var(--ca-ratio-bureau)}}
.ca-image{position:absolute;left:0;right:0;top:-5%;width:100%;height:110%;object-fit:cover;transition:transform .7s cubic-bezier(.22,1,.36,1)}
.ca-image-zoom{display:block;position:absolute;inset:0;transition:transform .7s cubic-bezier(.22,1,.36,1)}
.ca-voile{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top,rgba(10,8,8,.72) 0%,rgba(10,8,8,0) 45%)}
@media (hover:hover){.ca-cadre-vivant:hover .ca-image-zoom{transform:scale(1.03)}}
.ca-metas-bande{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px var(--ca-gap);margin-top:clamp(24px,3vw,44px)}
@media (min-width:1024px){.ca-metas-bande{grid-template-columns:repeat(4,minmax(0,1fr))}.ca-metas-bande.ca-trois{grid-template-columns:repeat(3,minmax(0,1fr))}}
.ca-lib{display:block;font-family:'Cinzel',serif;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:var(--ca-lib);margin-bottom:6px}
.ca-val{display:block;font-family:'Prata',serif;text-transform:uppercase;font-size:clamp(1rem,1.5vw,1.35rem);line-height:1.25;color:var(--ca-val);overflow-wrap:anywhere}
.ca-val.ca-normale{text-transform:none;letter-spacing:0}
.ca-lien-val{text-decoration:none;background-image:linear-gradient(currentColor,currentColor);background-repeat:no-repeat;background-position:0 100%;background-size:0% 1px;transition:background-size .4s cubic-bezier(.22,1,.36,1)}
.ca-fleche{display:inline-block;transition:transform .4s cubic-bezier(.22,1,.36,1)}
@media (hover:hover){a.ca-meta:hover .ca-lien-val,a.ca-rangee:hover .ca-lien-val{background-size:100% 1px}a.ca-meta:hover .ca-fleche,a.ca-rangee:hover .ca-fleche{transform:translateX(4px)}}
.ca-rangees{list-style:none;margin:clamp(28px,3.5vw,56px) 0 0;padding:0;border-bottom:1px solid var(--ca-filet)}
.ca-rangee{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 16px;align-items:center;padding:20px 0;border-top:1px solid var(--ca-filet);color:inherit;text-decoration:none}
.ca-rangee .ca-lib{grid-column:1;margin:0}.ca-rangee .ca-val{grid-column:1}.ca-rangee .ca-fleche{grid-column:2;grid-row:1/3;color:var(--ca-val);font-size:1.25rem}
@media (min-width:768px){.ca-rangee{grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--ca-gap);padding:26px 0}.ca-rangee .ca-lib{grid-column:1/5}.ca-rangee .ca-val{grid-column:5/12}.ca-rangee .ca-fleche{grid-column:12;grid-row:1;justify-self:end}}
.ca-bouton{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:50px;padding:0 28px;border-radius:9999px;font-family:'Cinzel',serif;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.22em;text-decoration:none;white-space:nowrap;transition:background-color .2s,transform .16s ease-out}
.ca-bouton:active{transform:scale(.97)}
.ca-noir .ca-bouton{background:var(--ca-or);color:var(--ca-noir);box-shadow:0 6px 24px rgba(197,160,89,.28)}
.ca-noir .ca-bouton:hover{background:#d8b878}
.ca-creme .ca-bouton,.ca-or .ca-bouton{background:var(--ca-noir);color:var(--ca-creme)}
.ca-creme .ca-bouton:hover,.ca-or .ca-bouton:hover{background:#2a2420}
@media (max-width:389px){.ca-bouton{letter-spacing:.12em;padding:0 18px}}
.ca-billets{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin:clamp(28px,3.5vw,56px) calc(-1 * var(--ca-gouttiere)) 0;padding:0 var(--ca-gouttiere) 8px;overscroll-behavior-x:contain;scrollbar-width:none;list-style:none}
.ca-billets::-webkit-scrollbar{display:none}
.ca-billet{flex:0 0 78%;scroll-snap-align:start;margin:0;transition:transform .4s cubic-bezier(.22,1,.36,1)}
.ca-billet img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:15px;transition:box-shadow .4s cubic-bezier(.22,1,.36,1)}
@media (min-width:1024px){.ca-billets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--ca-gap);overflow:visible;margin-inline:0;padding:0}.ca-billet{flex:none}}
@media (hover:hover){.ca-billet:hover{transform:translateY(-6px)}.ca-billet:hover img{box-shadow:0 18px 40px rgba(10,8,8,.25)}}
.ca-adresses{display:grid;grid-template-columns:1fr;gap:28px;margin-top:clamp(32px,4vw,64px);font-family:'Cinzel',serif;font-weight:700;text-transform:uppercase;font-size:15px;letter-spacing:.12em;line-height:1.7;color:var(--ca-creme)}
@media (min-width:640px){.ca-adresses{grid-template-columns:repeat(3,minmax(0,1fr));text-align:center}}
.ca-bande-couleurs{background:var(--ca-noir-pied);display:flex;justify-content:flex-end;padding:0 var(--ca-gouttiere)}
.ca-bande-couleurs span{width:24px;height:24px}
@media (prefers-reduced-motion:reduce){.ca-image,.ca-image-zoom,.ca-billet,.ca-billet img,.ca-fleche,.ca-lien-val{transition:none}}
`;

const txt = (v: Txt, langue: Langue) => v[langue];

const clic = (onNavigate: Nav, vue: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  onNavigate(vue);
};

const TitreGeant: React.FC<{
  titre: Titre; langue: Langue; niveau: 'h1' | 'h2' | 'h3'; morsure?: 'toujours' | 'tel'; className?: string;
}> = ({ titre, langue, niveau: Balise, morsure, className = '' }) => {
  const jeux = titre[langue];
  const texte = jeux.bureau.lignes.join(' ');
  const classe = morsure === 'toujours' ? 'ca-morsure' : morsure === 'tel' ? 'ca-morsure-tel' : 'ca-dessus';
  return (
    <Balise className={`ca-titre ${classe} ${className}`} data-ca-titre="">
      <span className="sr-only">{texte}</span>
      {(['bureau', 'tel'] as const).map((cle) => (
        <span key={cle} aria-hidden className={`ca-jeu ca-jeu-${cle}`}
          style={{ '--ca-em': jeux[cle].em, '--ca-lignes': jeux[cle].lignes.length } as React.CSSProperties}>
          {jeux[cle].lignes.map((ligne) => (
            <span key={ligne} data-ca-ligne="" className="ca-ligne"><span>{ligne}</span></span>
          ))}
        </span>
      ))}
    </Balise>
  );
};

const Cadre: React.FC<{
  image: ImageCA; langue: Langue; sizes?: string; prioritaire?: boolean; voile?: boolean; vivant?: boolean;
}> = ({ image, langue, sizes = '100vw', prioritaire, voile, vivant }) => {
  const max = image.largeurs[image.largeurs.length - 1];
  return (
    <figure data-ca-cadre="" className={`ca-cadre ${vivant ? 'ca-cadre-vivant' : ''}`}>
      <div data-ca-masque="" className="ca-masque"
        style={{ '--ca-ratio-bureau': image.ratioBureau, '--ca-ratio-tel': image.ratioTel } as React.CSSProperties}>
        <span className="ca-image-zoom">
          <img
            data-ca-image=""
            className="ca-image"
            src={`${image.base}-${image.largeurs[1] ?? max}.webp`}
            srcSet={image.largeurs.map((l) => `${image.base}-${l}.webp ${l}w`).join(', ')}
            sizes={sizes}
            width={image.w}
            height={image.h}
            alt={txt(image.alt, langue)}
            decoding="async"
            loading={prioritaire ? 'eager' : 'lazy'}
            {...(prioritaire ? { fetchpriority: 'high' } : {})}
            style={{ objectPosition: image.position ?? '50% 50%' }}
          />
        </span>
        {voile && <span aria-hidden className="ca-voile" />}
      </div>
    </figure>
  );
};

const Metas: React.FC<{
  items: Meta[]; langue: Langue; onNavigate: Nav; disposition: 'bande' | 'rangees'; className?: string;
}> = ({ items, langue, onNavigate, disposition, className = '' }) => {
  const rendre = (m: Meta, cle: number) => {
    const href = m.href ?? (m.vue ? CHEMINS[m.vue] : undefined);
    const lien = Boolean(href);
    const valeur = (
      <span className={`ca-val ${m.casseNormale ? 'ca-normale' : ''}`}>
        <span className={lien ? 'ca-lien-val' : ''}>{txt(m.valeur, langue)}</span>
        {lien && disposition === 'bande' && <span aria-hidden className="ca-fleche">&nbsp;→</span>}
      </span>
    );
    const contenu = (
      <>
        <span className="ca-lib">{txt(m.libelle, langue)}</span>
        {valeur}
        {lien && disposition === 'rangees' && <span aria-hidden className="ca-fleche">→</span>}
      </>
    );
    const classe = disposition === 'bande' ? 'ca-meta' : 'ca-rangee';
    const Enveloppe = disposition === 'bande' ? 'div' : 'li';
    if (!href) return <Enveloppe key={cle}><div className={classe}>{contenu}</div></Enveloppe>;
    const nouvelOnglet = m.externe;
    return (
      <Enveloppe key={cle}>
        <a
          href={href}
          className={classe}
          style={disposition === 'bande' ? { color: 'inherit', textDecoration: 'none', display: 'block' } : undefined}
          {...(nouvelOnglet ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...(m.vue && !m.externe ? { onClick: clic(onNavigate, m.vue) } : {})}
        >
          {contenu}
        </a>
      </Enveloppe>
    );
  };
  if (disposition === 'bande') {
    return (
      <div data-ca-metas="" className={`ca-metas-bande ${items.length === 3 ? 'ca-trois' : ''} ${className}`}>
        {items.map(rendre)}
      </div>
    );
  }
  return <ul data-ca-metas="" className={`ca-rangees ${className}`}>{items.map(rendre)}</ul>;
};

const Surtitre: React.FC<{ texte: Txt; langue: Langue; comme?: 'p' | 'h3' }> = ({ texte, langue, comme: B = 'p' }) => (
  <B className="ca-surtitre">{txt(texte, langue)}</B>
);

const Bouton: React.FC<{ texte: Txt; langue: Langue; href: string; vue?: string; onNavigate: Nav }> = ({ texte, langue, href, vue, onNavigate }) => (
  <a href={href} className="ca-bouton" {...(vue ? { onClick: clic(onNavigate, vue) } : {})}>
    {txt(texte, langue)} <span aria-hidden>→</span>
  </a>
);

const BandeCouleurs = () => (
  <div className="ca-bande-couleurs" aria-hidden>
    {['var(--ca-creme)', 'var(--ca-or)', 'var(--ca-bronze)', 'var(--ca-bronze-nuit)', 'var(--ca-noir)'].map((c, i) => (
      <span key={i} style={{ background: c, boxShadow: i === 4 ? 'inset 0 0 0 1px rgba(243,229,171,.2)' : undefined }} />
    ))}
  </div>
);

export const CentreArtsPage: React.FC<{ language: Langue; pret: boolean; onNavigate: Nav }> = ({ language: langue, pret, onNavigate }) => {
  const ref = useRef<HTMLDivElement>(null);
  useRevelations(ref, pret);
  const p = { langue, onNavigate };

  return (
    <div key={langue} ref={ref} data-ca-page="" className="ca-racine fixed inset-0 z-50 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
      <style>{CSS}</style>
      <main>
        {/* S1 · Ouverture */}
        <section data-ca-section="ouverture" className="ca-section ca-noir" style={{ paddingTop: 'calc(56px + clamp(24px, 4vw, 56px))' }}>
          <Surtitre texte={S1.surtitre} langue={langue} />
          <div className="ca-conteneur">
            <Cadre image={IMAGES.ouverture} langue={langue} prioritaire voile />
            <TitreGeant titre={TITRES.ouverture} langue={langue} niveau="h1" morsure="toujours" />
          </div>
          <div className="ca-grille" style={{ marginTop: 'clamp(20px, 2.5vw, 40px)' }}>
            <p className="ca-sous ca-g-1-6">{txt(S1.sousTitre, langue)}</p>
            <p className="ca-corps ca-g-7-12">{txt(S1.texte, langue)}</p>
          </div>
          <Metas items={S1.metas} disposition="bande" {...p} />
        </section>

        {/* S2 · Le lieu */}
        <section data-ca-section="lieu" className="ca-section ca-creme">
          <Surtitre texte={S2.surtitre} langue={langue} />
          <div className="ca-conteneur">
            <TitreGeant titre={TITRES.lieu} langue={langue} niveau="h2" />
          </div>
          <Cadre image={IMAGES.maison} langue={langue} />
          <Metas items={S2.metas} disposition="bande" {...p} />
          <div className="ca-grille" style={{ marginTop: 'clamp(48px, 6vw, 112px)', alignItems: 'end' }}>
            <div className="ca-g-1-5"><Cadre image={IMAGES.bibliotheque} langue={langue} sizes="(min-width: 1024px) 42vw, 100vw" /></div>
            <div className="ca-g-7-12">
              <p className="ca-sous" style={{ marginBottom: 24 }}>{txt(S2.sousTitre, langue)}</p>
              <p className="ca-corps" style={{ marginBottom: 'clamp(28px, 3vw, 48px)' }}>{txt(S2.texte, langue)}</p>
              <Cadre image={IMAGES.salle} langue={langue} sizes="(min-width: 1024px) 42vw, 100vw" />
            </div>
          </div>
        </section>

        {/* S3 · Résidences */}
        <section data-ca-section="residences" className="ca-section ca-noir">
          <Surtitre texte={S3.surtitre} langue={langue} />
          <div className="ca-conteneur">
            <TitreGeant titre={TITRES.residences} langue={langue} niveau="h2" />
          </div>
          <div className="ca-grille">
            <p className="ca-sous ca-g-1-6">{txt(S3.sousTitre, langue)}</p>
            <div className="ca-g-7-12">
              <p className="ca-corps" style={{ marginBottom: 28 }}>{txt(S3.texte, langue)}</p>
              <a href={txt(S3.mailto, langue)} className="ca-bouton">{txt(S3.bouton, langue)} <span aria-hidden>→</span></a>
            </div>
          </div>

          <div style={{ marginTop: 'clamp(72px, 9vw, 160px)' }}>
            <Surtitre texte={S3.surtitreFiches} langue={langue} />
            <article>
              <div className="ca-conteneur">
                <Cadre image={IMAGES.kamy} langue={langue} voile vivant />
                <TitreGeant titre={TITRES.kamy} langue={langue} niveau="h3" morsure="toujours" />
              </div>
              <div className="ca-grille" style={{ marginTop: 'clamp(12px, 2vw, 28px)' }}>
                <p className="ca-corps ca-g-7-12">{txt(S3.kamy.texte, langue)}</p>
              </div>
              <Metas items={S3.kamy.metas} disposition="bande" {...p} />
            </article>

            <article className="ca-grille" style={{ marginTop: 'clamp(72px, 9vw, 160px)', alignItems: 'end' }}>
              <div className="ca-g-1-5 ca-conteneur">
                <Cadre image={IMAGES.nolin} langue={langue} sizes="(min-width: 1024px) 42vw, 100vw" voile vivant />
                <TitreGeant titre={TITRES.nolin} langue={langue} niveau="h3" morsure="tel" className="ca-seul-tel" />
              </div>
              <div className="ca-g-7-12">
                <div className="ca-conteneur ca-seul-bureau">
                  <TitreGeant titre={TITRES.nolin} langue={langue} niveau="h3" />
                </div>
                <p className="ca-corps">{txt(S3.nolin.texte, langue)}</p>
                <Metas items={S3.nolin.metas} disposition="bande" className="ca-trois" {...p} />
              </div>
            </article>

            <article style={{ marginTop: 'clamp(72px, 9vw, 160px)' }}>
              <div className="ca-conteneur">
                <Cadre image={IMAGES.alex} langue={langue} voile vivant />
                <TitreGeant titre={TITRES.alex} langue={langue} niveau="h3" morsure="toujours" />
              </div>
              <div className="ca-grille" style={{ marginTop: 'clamp(12px, 2vw, 28px)' }}>
                <p className="ca-corps ca-g-7-12">{txt(S3.alex.texte, langue)}</p>
              </div>
              <Metas items={S3.alex.metas} disposition="bande" {...p} />
            </article>
            <Metas items={S3.cloture} disposition="rangees" {...p} />
          </div>
        </section>

        {/* S4 · Sur scène */}
        <section data-ca-section="scene" className="ca-section ca-creme">
          <Surtitre texte={S4.surtitre} langue={langue} />
          <div className="ca-conteneur">
            <TitreGeant titre={TITRES.scene} langue={langue} niveau="h2" />
          </div>
          <div className="ca-grille">
            <p className="ca-sous ca-g-1-6">{txt(S4.sousTitre, langue)}</p>
            <p className="ca-corps ca-g-7-12">{txt(S4.texte, langue)}</p>
          </div>
          <div style={{ marginTop: 'clamp(56px, 7vw, 120px)' }}>
            <Surtitre texte={S4.surtitreCeilidh} langue={langue} comme="h3" />
            <Metas items={S4.metasCeilidh} disposition="bande" {...p} />
            <ul className="ca-billets">
              {BILLETS.map((b) => (
                <li key={b.img} className="ca-billet">
                  <figure style={{ margin: 0 }}>
                    <img
                      src={`/media/centre-arts/${b.img}-1080.webp`}
                      srcSet={`/media/centre-arts/${b.img}-540.webp 540w, /media/centre-arts/${b.img}-1080.webp 1080w`}
                      sizes="(min-width: 1024px) 31vw, 78vw"
                      width={1080} height={1350} alt={txt(b.alt, langue)} loading="lazy" decoding="async"
                    />
                    <figcaption style={{ marginTop: 14 }}>
                      <span className="ca-lib">{txt(b.quand, langue)}</span>
                      <span className="ca-val" style={{ color: 'var(--ca-noir)' }}>{b.nom}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 'clamp(56px, 7vw, 120px)' }}>
            <Surtitre texte={S4.surtitreAteliers} langue={langue} comme="h3" />
            <Metas items={S4.ateliers} disposition="rangees" {...p} />
          </div>
        </section>

        {/* S5 · Les mécènes */}
        <section data-ca-section="mecenes" className="ca-section ca-noir">
          <Surtitre texte={S5.surtitre} langue={langue} />
          <div className="ca-conteneur">
            <Cadre image={IMAGES.mecenes} langue={langue} voile vivant />
            <TitreGeant titre={TITRES.mecenes} langue={langue} niveau="h2" morsure="toujours" />
          </div>
          <div className="ca-grille" style={{ marginTop: 'clamp(20px, 2.5vw, 40px)' }}>
            <p className="ca-sous ca-g-1-6">{txt(S5.sousTitre, langue)}</p>
            <div className="ca-g-7-12">
              <p className="ca-corps" style={{ marginBottom: 28 }}>{txt(S5.texte, langue)}</p>
              <Bouton texte={S5.bouton} href="/mecene" vue="MECENE" {...p} />
            </div>
          </div>
          <Metas items={S5.rangees} disposition="rangees" {...p} />
        </section>

        {/* S6 · Creator Studio, le seul aplat or de la page */}
        <section data-ca-section="creator" className="ca-section ca-or">
          <p className="ca-surtitre" style={{ color: 'rgba(10,8,8,.7)' }}>{txt(S6.surtitre, langue)}</p>
          <div className="ca-conteneur">
            <TitreGeant titre={TITRES.creator} langue={langue} niveau="h2" />
          </div>
          <div className="ca-grille" style={{ alignItems: 'center' }}>
            <div className="ca-g-7-12" style={{ gridRow: 1 }}>
              <Cadre image={IMAGES.murale} langue={langue} sizes="(min-width: 1024px) 42vw, 100vw" />
            </div>
            <div className="ca-g-1-6 lg:row-start-1">
              <p className="ca-sous" style={{ marginBottom: 24 }}>{txt(S6.sousTitre, langue)}</p>
              <p className="ca-corps" style={{ marginBottom: 28 }}>{txt(S6.texte, langue)}</p>
              <Bouton texte={S6.bouton} href="/creator" vue="CREATOR_STUDIO" {...p} />
            </div>
          </div>
          <div style={{ marginTop: 'clamp(56px, 7vw, 120px)' }}>
            <p className="ca-surtitre" style={{ color: 'rgba(10,8,8,.7)' }}>{txt(S6.surtitreRangees, langue)}</p>
            <Metas items={S6.rangees} disposition="rangees" {...p} />
          </div>
        </section>

        {/* S7 · Venir à Namur : la maison est au bas de la photo, le titre reste au-dessus */}
        <section data-ca-section="namur" className="ca-section ca-noir">
          <Surtitre texte={S7.surtitre} langue={langue} />
          <div className="ca-conteneur">
            <TitreGeant titre={TITRES.namur} langue={langue} niveau="h2" />
          </div>
          <p className="ca-sous" style={{ marginBottom: 'clamp(24px, 3vw, 48px)' }}>{txt(S7.sousTitre, langue)}</p>
          <Cadre image={IMAGES.namur} langue={langue} />
          <address className="ca-adresses not-italic" data-ca-metas="">
            {S7.adresses.map((col, i) => (
              <div key={i}>{col.map((ligne, j) => <span key={j} className="block">{txt(ligne, langue)}</span>)}</div>
            ))}
          </address>
          <Metas items={S7.rangees} disposition="rangees" {...p} />
        </section>
      </main>

      <BandeCouleurs />
      <SiteFooter viewKey="CENTRE_ARTS" language={langue} sansH1 onNavigate={onNavigate} />
    </div>
  );
};

export default CentreArtsPage;
