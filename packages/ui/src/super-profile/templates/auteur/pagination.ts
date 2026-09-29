// pagination.ts : découpe les extraits en pages de livre, en mesurant le vrai
// rendu. Un élément caché de la taille exacte d'une zone de texte reçoit les
// mots un à un (recherche par dichotomie) jusqu'à déborder; chaque extrait
// commence sur une page neuve. Le résultat suit donc la police, la taille de
// l'écran et la longueur réelle des mots, là où un compte de caractères mentirait.

import type { LivreProfilPro, SuperProfileConfig } from '../../types';

export interface BlocPage {
  type: 'titre' | 'para';
  texte: string;
  /** Premier paragraphe d'un extrait : il porte la lettrine. */
  lettrine?: boolean;
  /** Suite d'un paragraphe commencé sur la page d'avant : sans alinéa. */
  suite?: boolean;
  /** Paragraphe coupé en bas de page : sa dernière ligne se justifie. */
  coupe?: boolean;
}

export interface PageLivre {
  extrait: string;
  titre: string;
  livre?: string;
  blocs: BlocPage[];
}

export interface ExtraitLisible {
  id: string;
  titre: string;
  /** Le titre du livre, s'il est rattaché à un livre. */
  livre?: string;
  livreId?: string;
  paragraphes: string[];
}

/** La clé d'un livre, à laquelle un extrait se rattache : son id, sinon son titre. */
export const cleLivre = (l: LivreProfilPro) => l.id || l.titre;

/** Les extraits non vides de l'espace, avec le titre de leur livre. */
export function extraitsLisibles(config: SuperProfileConfig): ExtraitLisible[] {
  const livres = config.livres ?? [];
  return (config.extraits ?? [])
    .map((x) => {
      const livre = x.livre ? livres.find((l) => cleLivre(l) === x.livre || l.titre === x.livre) : undefined;
      return {
        id: x.id,
        titre: x.titre?.trim() || livre?.titre || 'Extrait',
        livre: livre?.titre,
        livreId: livre ? cleLivre(livre) : undefined,
        paragraphes: (x.texte ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean),
      };
    })
    .filter((x) => x.paragraphes.length > 0);
}

export function classeBloc(b: BlocPage): string {
  if (b.type === 'titre') return 'al-titre';
  return ['al-para', b.lettrine && 'al-lettrine', b.suite && 'al-suite', b.coupe && 'al-coupe'].filter(Boolean).join(' ');
}

function remplir(mesure: HTMLElement, blocs: BlocPage[]) {
  mesure.replaceChildren(
    ...blocs.map((b) => {
      const el = document.createElement(b.type === 'titre' ? 'h3' : 'p');
      el.className = classeBloc(b);
      el.textContent = b.texte;
      return el;
    }),
  );
}

function tient(mesure: HTMLElement, blocs: BlocPage[]): boolean {
  remplir(mesure, blocs);
  return mesure.scrollHeight <= mesure.clientHeight + 1;
}

export function paginer(mesure: HTMLElement, extraits: ExtraitLisible[]): PageLivre[] {
  const pages: PageLivre[] = [];
  if (mesure.clientHeight < 40) return pages;

  for (const x of extraits) {
    let blocs: BlocPage[] = [{ type: 'titre', texte: x.titre }];
    const tourner = () => {
      pages.push({ extrait: x.id, titre: x.titre, livre: x.livre, blocs });
      blocs = [];
    };

    x.paragraphes.forEach((para, ip) => {
      const mots = para.split(/\s+/).filter(Boolean);
      let debut = 0;
      while (debut < mots.length) {
        const morceau = (n: number): BlocPage => ({
          type: 'para',
          texte: mots.slice(debut, debut + n).join(' '),
          lettrine: ip === 0 && debut === 0,
          suite: debut > 0,
          coupe: debut + n < mots.length,
        });
        const reste = mots.length - debut;
        let n = 0;
        if (tient(mesure, [...blocs, morceau(reste)])) n = reste;
        else {
          let bas = 0;
          let haut = reste - 1;
          while (bas < haut) {
            const milieu = Math.ceil((bas + haut) / 2);
            if (tient(mesure, [...blocs, morceau(milieu)])) bas = milieu;
            else haut = milieu - 1;
          }
          n = bas;
        }
        if (n === 0) {
          // Rien n'entre : la page est pleine. Sur une page vide, un mot passe quand même.
          if (blocs.length) { tourner(); continue; }
          n = 1;
        }
        blocs.push(morceau(n));
        debut += n;
        if (debut < mots.length) tourner();
      }
    });
    if (blocs.length) tourner();
  }
  mesure.replaceChildren();
  return pages;
}
