// ─── La face du plateau ─────────────────────────────────────────────
// Un canevas de 2048 pixels peint une fois : l'érable, les quatre
// jardins du losange central, le treillis de 17 lignes coupé aux coins,
// les quatre portes incrustées et un léger brunissage vers le bord. Le
// même dessin, en niveaux de gris, donne la carte de normales qui fait
// accrocher la lumière aux filets incrustés.
//
// Le canevas couvre le disque entier : son centre est le point (0,0),
// le nord en haut, l'est à droite. `rayonMonde` est le rayon du disque
// dans la scène et `pas` l'écart entre deux lignes.

import * as THREE from 'three';
import { carteNormales, grainDeBois } from './bois';

const TAILLE = 2048;
const NOYER = '#3b2414';

/** Les points joués sont ceux où |x| + |y| <= 12, dans le carré de 17. */
const bout = (k: number): number => Math.min(8, 12 - Math.abs(k));

export interface FacePlateau {
  carte: THREE.CanvasTexture;
  normales: THREE.CanvasTexture;
}

export function peindreFacePlateau(rayonMonde: number, pas: number): FacePlateau {
  const S = TAILLE;
  const px = (S / 2) * (pas / rayonMonde);          // pixels par pas
  const X = (x: number) => S / 2 + x * px;
  const Y = (y: number) => S / 2 - y * px;

  const c = grainDeBois({
    taille: S, fond: '#c89a62', veine: '#7a4a22', fibres: 520, noeuds: 2, ondulation: 14, force: 1.25,
  });
  const g = c.getContext('2d')!;

  // Les jardins : rouge brique au nord-est et au sud-ouest, ivoire au
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
  const rouge = 'rgba(148, 38, 26, 0.50)';
  const ivoire = 'rgba(246, 234, 206, 0.55)';
  triangle(1, 1, rouge);
  triangle(-1, -1, rouge);
  triangle(-1, 1, ivoire);
  triangle(1, -1, ivoire);

  // Le filet qui borde le losange, un peu plus épais que le treillis.
  g.strokeStyle = NOYER;
  g.lineWidth = px * 0.06;
  g.beginPath();
  g.moveTo(X(0), Y(7)); g.lineTo(X(7), Y(0)); g.lineTo(X(0), Y(-7)); g.lineTo(X(-7), Y(0)); g.closePath();
  g.stroke();

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
  g.strokeStyle = NOYER;
  g.globalAlpha = 0.9;
  treillis(g, px * 0.045);
  g.globalAlpha = 1;

  // Les portes : un petit cercle incrusté au bout de chaque médiane,
  // cerclé de noyer et rempli de rouge sombre.
  const PORTES = [[0, 8], [8, 0], [0, -8], [-8, 0]];
  for (const [x, y] of PORTES) {
    g.fillStyle = '#7d2418';
    g.beginPath(); g.arc(X(x), Y(y), px * 0.34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = NOYER; g.lineWidth = px * 0.07;
    g.beginPath(); g.arc(X(x), Y(y), px * 0.34, 0, Math.PI * 2); g.stroke();
  }
  // Le point central, une perle de noyer.
  g.fillStyle = NOYER;
  g.beginPath(); g.arc(X(0), Y(0), px * 0.09, 0, Math.PI * 2); g.fill();

  // Le brunissage : le bord du disque fonce, comme un bois patiné par
  // les mains.
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.30, S / 2, S / 2, S * 0.5);
  v.addColorStop(0, 'rgba(40,20,8,0)');
  v.addColorStop(1, 'rgba(40,20,8,0.42)');
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);

  const carte = new THREE.CanvasTexture(c);
  carte.colorSpace = THREE.SRGBColorSpace;
  carte.anisotropy = 8;

  // Le relief : la surface en blanc, les filets et les portes en creux.
  const R = 1024;
  const rc = document.createElement('canvas');
  rc.width = rc.height = R;
  const rg = rc.getContext('2d')!;
  rg.fillStyle = '#fff';
  rg.fillRect(0, 0, R, R);
  rg.scale(R / S, R / S);
  rg.strokeStyle = '#555';
  treillis(rg, px * 0.05);
  rg.lineWidth = px * 0.07;
  rg.beginPath();
  rg.moveTo(X(0), Y(7)); rg.lineTo(X(7), Y(0)); rg.lineTo(X(0), Y(-7)); rg.lineTo(X(-7), Y(0)); rg.closePath();
  rg.stroke();
  for (const [x, y] of PORTES) {
    rg.beginPath(); rg.arc(X(x), Y(y), px * 0.34, 0, Math.PI * 2); rg.stroke();
  }
  const normales = carteNormales(rc, 1.6);

  return { carte, normales };
}
