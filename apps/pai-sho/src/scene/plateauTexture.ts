// ─── La face du plateau ─────────────────────────────────────────────
// Un canevas de 2048 pixels peint une fois : le fond (érable, acier ou
// érable pâle selon le skin), les quatre jardins du losange central, le
// logo en marqueterie pour les plateaux de marque, le treillis de 17
// lignes coupé aux coins, les quatre portes incrustées et un léger
// brunissage vers le bord. Le même dessin, en niveaux de gris, donne la
// carte de normales qui fait accrocher la lumière aux filets incrustés.
//
// Le canevas couvre le disque entier : son centre est le point (0,0),
// le nord en haut, l'est à droite. `rayonMonde` est le rayon du disque
// dans la scène et `pas` l'écart entre deux lignes.

import * as THREE from 'three';
import { carteNormales, grainDeBois } from './bois';
import type { IdPlateau } from '../skins';

const TAILLE = 2048;
const NOYER = '#3b2414';

/** Les cinq teintes du foil de l'autocollant Vexel. */
const FOIL = ['#ff9ecb', '#ffe08a', '#9bffcf', '#8ad4ff', '#c9a4ff'];

/** Les points joués sont ceux où |x| + |y| <= 12, dans le carré de 17. */
const bout = (k: number): number => Math.min(8, 12 - Math.abs(k));

interface Palette {
  fond: (S: number) => HTMLCanvasElement;
  rouge: string;
  ivoire: string;
  filet: string;
  /** Une ombre sous le filet : le trait gravé dans le métal. */
  ombreFilet?: string;
  treillisAlpha: number;
  porte: string;
  porteBord: string;
  perle: string;
  brunissage: string;
  /** Le logo en marqueterie : sa teinte, son opacité et sa hauteur en pas. */
  logo?: { teinte: string | ((S: number) => HTMLCanvasElement); alpha: number; pas: number };
  irise?: boolean;
}

/** L'acier tourné : des stries concentriques et deux reflets en éventail. */
function acierBrosse(S: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#474d55';
  g.fillRect(0, 0, S, S);
  // Le reflet anisotrope peint : un éventail clair et un sombre, comme
  // la lumière couchée sur un disque passé au tour.
  const eventail = g.createConicGradient(0.5, S / 2, S / 2);
  const arrets: Array<[number, string]> = [
    [0, 'rgba(255,255,255,0.06)'], [0.12, 'rgba(0,0,0,0.12)'], [0.25, 'rgba(255,255,255,0.02)'],
    [0.5, 'rgba(255,255,255,0.07)'], [0.62, 'rgba(0,0,0,0.12)'], [0.75, 'rgba(255,255,255,0.02)'], [1, 'rgba(255,255,255,0.06)'],
  ];
  for (const [p, col] of arrets) eventail.addColorStop(p, col);
  g.fillStyle = eventail;
  g.fillRect(0, 0, S, S);
  // Les stries : beaucoup de cercles fins, clairs ou sombres.
  const n = Math.round(S * 0.9);
  for (let i = 0; i < n; i++) {
    const r = Math.random() * S * 0.72;
    g.globalAlpha = 0.03 + Math.random() * 0.07;
    g.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    g.lineWidth = (0.5 + Math.random() * 1.2) * (S / 2048);
    g.beginPath(); g.arc(S / 2, S / 2, r, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

const PALETTES: Record<IdPlateau, Palette> = {
  bois: {
    fond: (S) => grainDeBois({ taille: S, fond: '#c89a62', veine: '#7a4a22', fibres: 520, noeuds: 2, ondulation: 14, force: 1.25 }),
    rouge: 'rgba(148, 38, 26, 0.50)', ivoire: 'rgba(246, 234, 206, 0.55)',
    filet: NOYER, treillisAlpha: 0.9, porte: '#7d2418', porteBord: NOYER, perle: NOYER,
    brunissage: 'rgba(40,20,8,0.42)',
  },
  vexel: {
    fond: acierBrosse,
    rouge: 'rgba(122, 26, 34, 0.40)', ivoire: 'rgba(228, 234, 242, 0.13)',
    filet: '#d6dde6', ombreFilet: 'rgba(6, 8, 10, 0.6)', treillisAlpha: 0.6,
    porte: '#4e1218', porteBord: '#cfd6de', perle: '#eef2f6',
    brunissage: 'rgba(4,6,8,0.55)',
    logo: { teinte: '#dde3ea', alpha: 0.62, pas: 8.4 },
    irise: true,
  },
  salon: {
    fond: (S) => grainDeBois({ taille: S, fond: '#ead5ad', veine: '#b88c5c', fibres: 480, noeuds: 2, ondulation: 12, force: 1.0 }),
    rouge: 'rgba(186, 96, 74, 0.30)', ivoire: 'rgba(255, 252, 244, 0.60)',
    filet: '#4a2e18', treillisAlpha: 0.85, porte: '#c5a059', porteBord: '#4a2e18', perle: '#3b2414',
    brunissage: 'rgba(110,72,36,0.20)',
    // La marqueterie du Salon : le logo découpé dans un placage de noyer.
    logo: { teinte: (S) => grainDeBois({ taille: S, fond: '#6e4426', veine: '#3a2212', fibres: 260, noeuds: 1, force: 1.4 }), alpha: 0.36, pas: 11.5 },
  },
};

/** Le logo en silhouette, rempli d'une teinte ou d'un placage. */
function silhouette(logo: CanvasImageSource, taille: number, remplissage: string | ((S: number) => HTMLCanvasElement)): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const g = c.getContext('2d')!;
  g.drawImage(logo, 0, 0, taille, taille);
  g.globalCompositeOperation = 'source-in';
  if (typeof remplissage === 'string') { g.fillStyle = remplissage; g.fillRect(0, 0, taille, taille); }
  else g.drawImage(remplissage(taille), 0, 0);
  return c;
}

export interface ToileFace {
  couleur: HTMLCanvasElement;
  /** Le relief en niveaux de gris, absent des vignettes. */
  relief: HTMLCanvasElement | null;
  /** La rugosité (canal vert), seulement pour le métal. */
  rugosite: HTMLCanvasElement | null;
}

/**
 * Peint la face d'un plateau. `logo` est l'image de la marque (le
 * plateau de bois n'en a pas). Avec `vignette`, seule la couleur se
 * peint, pour les petites images du menu.
 */
export function toileFace(
  plateau: IdPlateau, rayonMonde: number, pas: number,
  logo: CanvasImageSource | null, taille = TAILLE, vignette = false,
): ToileFace {
  const P = PALETTES[plateau];
  const S = taille;
  const px = (S / 2) * (pas / rayonMonde);          // pixels par pas
  const X = (x: number) => S / 2 + x * px;
  const Y = (y: number) => S / 2 - y * px;

  const c = P.fond(S);
  const g = c.getContext('2d')!;

  // Les jardins : rouge au nord-est et au sud-ouest, blanc au
  // nord-ouest et au sud-est. Les sommets du losange sont à ±7.
  const triangle = (sx: number, sy: number, couleur: string) => {
    g.fillStyle = couleur;
    g.beginPath();
    g.moveTo(X(0), Y(0));
    g.lineTo(X(7 * sx), Y(0));
    g.lineTo(X(0), Y(7 * sy));
    g.closePath();
    g.fill();
  };
  triangle(1, 1, P.rouge);
  triangle(-1, -1, P.rouge);
  triangle(-1, 1, P.ivoire);
  triangle(1, -1, P.ivoire);

  // Le logo, sous le treillis : les lignes et les points passent par-dessus.
  const cote = P.logo ? Math.round(px * P.logo.pas) : 0;
  const forme = P.logo && logo ? silhouette(logo, cote, P.logo.teinte) : null;
  if (P.logo && forme) {
    const x0 = S / 2 - cote / 2, y0 = S / 2 - cote / 2;
    // Une ombre décalée d'un rien : le bord de l'incrustation.
    const ombre = silhouette(forme, cote, 'rgba(0,0,0,1)');
    g.globalAlpha = P.logo.alpha * 0.5;
    g.drawImage(ombre, x0 + px * 0.025, y0 + px * 0.03);
    g.globalAlpha = P.logo.alpha;
    g.drawImage(forme, x0, y0);
    g.globalAlpha = 1;
  }

  const losange = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(X(0), Y(7)); ctx.lineTo(X(7), Y(0)); ctx.lineTo(X(0), Y(-7)); ctx.lineTo(X(-7), Y(0)); ctx.closePath();
    ctx.stroke();
  };
  // Le treillis : seules les lignes jouables, chacune coupée là où le
  // plateau s'arrête.
  const treillis = (ctx: CanvasRenderingContext2D, largeur: number) => {
    ctx.lineWidth = largeur;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = -8; k <= 8; k++) {
      const b = bout(k);
      ctx.moveTo(X(-b), Y(k)); ctx.lineTo(X(b), Y(k));
      ctx.moveTo(X(k), Y(-b)); ctx.lineTo(X(k), Y(b));
    }
    ctx.stroke();
  };
  // Sur le métal, le trait gravé a son ombre : un filet sombre plus
  // large, puis le trait clair par-dessus.
  if (P.ombreFilet) {
    g.strokeStyle = P.ombreFilet;
    g.lineWidth = px * 0.085; losange(g);
    treillis(g, px * 0.07);
  }
  // Le filet qui borde le losange, un peu plus épais que le treillis.
  g.strokeStyle = P.filet;
  g.lineWidth = px * 0.06;
  losange(g);
  g.globalAlpha = P.treillisAlpha;
  treillis(g, px * 0.045);
  g.globalAlpha = 1;

  // Les portes : un petit cercle incrusté au bout de chaque médiane.
  const PORTES = [[0, 8], [8, 0], [0, -8], [-8, 0]];
  for (const [x, y] of PORTES) {
    g.fillStyle = P.porte;
    g.beginPath(); g.arc(X(x), Y(y), px * 0.34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = P.porteBord; g.lineWidth = px * 0.07;
    g.beginPath(); g.arc(X(x), Y(y), px * 0.34, 0, Math.PI * 2); g.stroke();
  }
  // Le point central, une perle. Sur un plateau à logo, un cerne sombre
  // la détache du dessin qu'elle recouvre.
  if (P.logo) {
    g.fillStyle = P.ombreFilet ?? 'rgba(59,36,20,0.35)';
    g.beginPath(); g.arc(X(0), Y(0), px * 0.17, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = P.perle;
  g.beginPath(); g.arc(X(0), Y(0), px * (P.logo ? 0.11 : 0.09), 0, Math.PI * 2); g.fill();

  // Le brunissage : le bord du disque fonce, comme un bois patiné par
  // les mains ou un acier qui s'éloigne de la lampe.
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.30, S / 2, S / 2, S * 0.5);
  v.addColorStop(0, P.brunissage.replace(/[\d.]+\)$/, '0)'));
  v.addColorStop(1, P.brunissage);
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);

  // Le liseré irisé de Vexel : un anneau fin au pied de la bordure.
  const anneau = (ctx: CanvasRenderingContext2D, style: string | CanvasGradient) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = S * 0.007;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.487, 0, Math.PI * 2); ctx.stroke();
  };
  if (P.irise) {
    const foil = g.createConicGradient(0, S / 2, S / 2);
    [...FOIL, ...FOIL, FOIL[0]].forEach((col, i, l) => foil.addColorStop(i / (l.length - 1), col));
    g.globalAlpha = 0.9;
    anneau(g, foil);
    g.globalAlpha = 1;
  }
  if (vignette) return { couleur: c, relief: null, rugosite: null };

  // Le relief : la surface en blanc, les filets et les portes en creux,
  // le logo à peine plus bas que le champ.
  const R = 1024;
  const rc = document.createElement('canvas');
  rc.width = rc.height = R;
  const rg = rc.getContext('2d')!;
  rg.fillStyle = '#fff';
  rg.fillRect(0, 0, R, R);
  rg.scale(R / S, R / S);
  if (forme) rg.drawImage(silhouette(forme, cote, '#b4b4b4'), S / 2 - cote / 2, S / 2 - cote / 2);
  rg.strokeStyle = '#555';
  treillis(rg, px * 0.05);
  rg.lineWidth = px * 0.07;
  losange(rg);
  for (const [x, y] of PORTES) {
    rg.beginPath(); rg.arc(X(x), Y(y), px * 0.34, 0, Math.PI * 2); rg.stroke();
  }

  // La rugosité du métal : le champ brossé, le logo poli comme un miroir
  // (c'est lui qui fait l'incrustation de métal dans le métal), les
  // traits gravés plus mats.
  let rugosite: HTMLCanvasElement | null = null;
  if (P.ombreFilet) {
    rugosite = document.createElement('canvas');
    rugosite.width = rugosite.height = R;
    const ug = rugosite.getContext('2d')!;
    ug.fillStyle = 'rgb(112,112,112)';
    ug.fillRect(0, 0, R, R);
    ug.scale(R / S, R / S);
    if (forme) ug.drawImage(silhouette(forme, cote, 'rgb(30,30,30)'), S / 2 - cote / 2, S / 2 - cote / 2);
    ug.strokeStyle = 'rgb(190,190,190)';
    treillis(ug, px * 0.06);
    if (P.irise) anneau(ug, 'rgb(25,25,25)');
  }
  return { couleur: c, relief: rc, rugosite };
}

export interface FacePlateau {
  carte: THREE.CanvasTexture;
  normales: THREE.CanvasTexture;
  rugosite: THREE.CanvasTexture | null;
}

export function peindreFacePlateau(rayonMonde: number, pas: number, plateau: IdPlateau = 'bois', logo: CanvasImageSource | null = null): FacePlateau {
  const t = toileFace(plateau, rayonMonde, pas, logo);
  const carte = new THREE.CanvasTexture(t.couleur);
  carte.colorSpace = THREE.SRGBColorSpace;
  carte.anisotropy = 8;
  const normales = carteNormales(t.relief!, 1.6);
  const rugosite = t.rugosite ? new THREE.CanvasTexture(t.rugosite) : null;
  return { carte, normales, rugosite };
}
