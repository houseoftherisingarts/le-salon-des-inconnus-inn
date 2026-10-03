// ─── La salle en trois dimensions ───────────────────────────────────
// Quatre murs, un plafond, un sol et des meubles posés pour de vrai : la
// caméra tourne dans une pièce, plus devant une image enroulée. Les images
// de `scenes/` ne servent plus que de matière (un pan de mur, un plancher).

import * as THREE from 'three';
import type { IdDecor } from '../skins';
import { BASE, Y_PLANCHER } from './mesures';

type Jetable = { dispose(): void };

/** Demi-côté et hauteur de la pièce. La caméra ne s'éloigne jamais à plus de 78 du centre. */
const R = 90;
const H = 84;
const Y0 = Y_PLANCHER;

/** Les quatre murs : nord, est, sud, ouest. [x, z, rotation] du mur vu de l'intérieur. */
const MURS = [[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]] as const;

interface Atelier {
  g: THREE.Group;
  jet: Jetable[];
  boite: THREE.BoxGeometry;
  rond: THREE.CylinderGeometry;
  plan: THREE.PlaneGeometry;
  boule: THREE.SphereGeometry;
  halo: THREE.Texture;
  mat: (couleur: number) => THREE.MeshLambertMaterial;
  lumiere: (couleur: number) => THREE.MeshBasicMaterial;
}

function toile(taille: number, dessin: (g: CanvasRenderingContext2D) => void, rx: number, ry: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  dessin(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
}

/** Un hasard qui rend toujours la même suite : la salle ne change pas d'une visite à l'autre. */
function hasard(graine: number): () => number {
  let s = graine;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Pose `o` contre le mur `mur`, à `u` du milieu (vers la droite), à `y` du sol et à `recul` du mur. */
function auMur<T extends THREE.Object3D>(a: Atelier, o: T, mur: number, u: number, y: number, recul = 0): T {
  const [dx, dz, rot] = MURS[mur];
  const d = R - recul;
  o.position.set(dx * d + Math.cos(rot) * u, Y0 + y, dz * d - Math.sin(rot) * u);
  o.rotation.y = rot;
  a.g.add(o);
  return o;
}

function boite(a: Atelier, m: THREE.Material, l: number, h: number, p: number): THREE.Mesh {
  const o = new THREE.Mesh(a.boite, m);
  o.scale.set(l, h, p);
  return o;
}

function rond(a: Atelier, m: THREE.Material, rayon: number, h: number): THREE.Mesh {
  const o = new THREE.Mesh(a.rond, m);
  o.scale.set(rayon, h, rayon);
  return o;
}

function panneau(a: Atelier, m: THREE.Material, l: number, h: number): THREE.Mesh {
  const o = new THREE.Mesh(a.plan, m);
  o.scale.set(l, h, 1);
  return o;
}

/** Une lueur qui se voit de partout : flamme, lanterne, fenêtre. */
function lueur(a: Atelier, couleur: number, taille: number, force = 0.6): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: a.halo, color: couleur, opacity: force, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  a.jet.push(m);
  const s = new THREE.Sprite(m);
  s.scale.set(taille, taille, 1);
  return s;
}

/** Le plafond, tourné vers le bas, et le sol, tourné vers le haut. */
function dalle(a: Atelier, m: THREE.Material, y: number, versLeBas: boolean): THREE.Mesh {
  const o = panneau(a, m, R * 2, R * 2);
  o.rotation.x = versLeBas ? Math.PI / 2 : -Math.PI / 2;
  o.position.y = Y0 + y;
  a.g.add(o);
  return o;
}

/** Les poutres du plafond, dans un sens puis dans l'autre. */
function poutres(a: Atelier, m: THREE.Material, n: number, epais: number, croisees: boolean): void {
  for (let i = 0; i < n; i++) {
    const u = -R + ((i + 0.5) * R * 2) / n;
    const p = boite(a, m, R * 2, epais, epais * 0.8);
    p.position.set(0, Y0 + H - epais / 2, u);
    a.g.add(p);
    if (croisees) {
      const q = boite(a, m, epais * 0.8, epais * 0.7, R * 2);
      q.position.set(u, Y0 + H - epais * 0.35, 0);
      a.g.add(q);
    }
  }
}

/**
 * Découpe un morceau de l'image de la salle et le pose sur une matière.
 * L'image n'est chargée qu'une fois; chaque morceau en est un clone recadré.
 */
function decoupeur(a: Atelier, d: IdDecor, gestionnaire?: THREE.LoadingManager) {
  const attente: (() => void)[] = [];
  let prete = false;
  const source = new THREE.TextureLoader(gestionnaire).load(`${BASE}scenes/${d}-salle.jpg`, () => {
    prete = true;
    attente.forEach((f) => f());
  });
  source.colorSpace = THREE.SRGBColorSpace;
  a.jet.push(source);
  return (m: THREE.MeshBasicMaterial, x: number, y: number, l: number, h: number, miroir = false): void => {
    const poser = () => {
      const t = source.clone();
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.set(miroir ? -l : l, h);
      t.offset.set(miroir ? x + l : x, 1 - y - h);
      t.needsUpdate = true;
      m.map = t;
      m.needsUpdate = true;
      a.jet.push(t);
    };
    if (prete) poser(); else attente.push(poser);
  };
}

/** Le plancher découpé dans l'image de la salle, posé quatre fois en miroir pour se répéter sans couture. */
function solDuFond(d: IdDecor, x: number, y: number, l: number, h: number, n: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(n, n);
  const image = new Image();
  image.onload = () => {
    const g = c.getContext('2d')!;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      g.setTransform(sx, 0, 0, sy, 512, 512);
      g.drawImage(image, x * image.width, y * image.height, l * image.width, h * image.height, 0, 0, 512, 512);
    }
    t.needsUpdate = true;
  };
  image.src = `${BASE}scenes/${d}-salle.jpg`;
  return t;
}

/** Un sol qui porte sa propre lueur : la lanterne n'éclaire que la table. */
function sol(a: Atelier, carte: THREE.Texture, teinte: number, force: number, base = 0x3a3a3a): void {
  const m = new THREE.MeshStandardMaterial({ color: base, map: carte, emissiveMap: carte, emissive: teinte, emissiveIntensity: force, roughness: 0.95, fog: false });
  a.jet.push(carte, m);
  dalle(a, m, 0, false).receiveShadow = true;
}

// ── La taverne : pierre, poutres noircies, chandelles et âtre ────────

function taverne(a: Atelier): void {
  const h = hasard(7);
  const pierre = toile(512, (g) => {
    g.fillStyle = '#140d09';
    g.fillRect(0, 0, 512, 512);
    const teintes = ['#6b5340', '#5c4636', '#75593f', '#4f3c2e', '#66503c', '#7d6046'];
    for (let r = 0; r < 8; r++) {
      let x = -h() * 90;
      while (x < 512) {
        const l = 70 + h() * 90;
        g.fillStyle = teintes[Math.floor(h() * teintes.length)];
        g.beginPath();
        g.roundRect(x + 3, r * 64 + 3, l - 6, 58, 7);
        g.fill();
        // Chaque pierre prend la lumière par le haut et garde de l'ombre en bas.
        const o = g.createLinearGradient(0, r * 64, 0, r * 64 + 64);
        o.addColorStop(0, 'rgba(255, 196, 130, 0.18)');
        o.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
        o.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
        g.fillStyle = o;
        g.fill();
        x += l;
      }
    }
  }, 3.4, 1.6);
  const matMur = new THREE.MeshBasicMaterial({ map: pierre, color: 0x9a7d66, fog: false });
  const matPlafond = a.mat(0x1d120b);
  const matPoutre = a.mat(0x2e1c11);
  const matTable = a.mat(0x4a2c18);
  const matSombre = a.lumiere(0x050302);
  const matCire = a.lumiere(0xf3dfb4);
  a.jet.push(pierre, matMur);

  sol(a, solDuFond('taverne', 0.5, 0.74, 0.11, 0.22, 6), 0xa06a42, 0.75, 0x3a2a1e);
  dalle(a, matPlafond, H, true);
  poutres(a, matPoutre, 6, 7, false);

  const chandelle = (o: THREE.Object3D, halo: number) => {
    const c = rond(a, matCire, 0.35, 1.6);
    c.position.y = 0.8;
    const f = lueur(a, 0xffb347, 3.2, 1);
    f.position.y = 2.3;
    const l = lueur(a, 0xff7a26, halo, 0.42);
    l.position.y = 2.3;
    o.add(c, f, l);
  };

  for (let mur = 0; mur < 4; mur++) {
    auMur(a, panneau(a, matMur, R * 2, H), mur, 0, H / 2);
    // Les poteaux de charpente, et une chandelle à bras sur chacun.
    for (const u of [-90, -45, 0, 45, 90]) {
      auMur(a, boite(a, matPoutre, 5, H, 5), mur, u, H / 2, 2.5);
      if (Math.abs(u) === 90 || (mur === 0 && u === 0)) continue;
      const bras = auMur(a, new THREE.Group(), mur, u, 30, 6.5);
      const support = boite(a, matPoutre, 1.6, 0.6, 3);
      support.position.z = -1;
      bras.add(support);
      chandelle(bras, 34);
    }
  }

  // Le mur du nord : une porte basse dans l'ombre et, tout en haut, le soupirail.
  auMur(a, panneau(a, matSombre, 26, 40), 0, 0, 20, 0.3);
  const arc = new THREE.Mesh(new THREE.CircleGeometry(13, 24, 0, Math.PI), matSombre);
  a.jet.push(arc.geometry);
  auMur(a, arc, 0, 0, 40, 0.3);
  auMur(a, panneau(a, a.lumiere(0xcfe4f0), 12, 14), 0, 0, 64, 0.3);
  auMur(a, boite(a, matPoutre, 0.9, 14, 0.9), 0, 0, 64, 0.6);
  auMur(a, boite(a, matPoutre, 12, 0.9, 0.9), 0, 0, 64, 0.6);
  auMur(a, lueur(a, 0x9fc4e6, 60, 0.35), 0, 0, 62, 3);

  // L'âtre, à l'ouest : une bouche noire, un linteau et le feu.
  auMur(a, panneau(a, matSombre, 34, 26), 3, -22, 13, 0.3);
  auMur(a, boite(a, matPoutre, 42, 5, 6), 3, -22, 28.5, 3);
  auMur(a, lueur(a, 0xff6a14, 30, 0.95), 3, -22, 7, 3);
  auMur(a, lueur(a, 0xffc35a, 14, 1), 3, -22, 5, 3.5);
  auMur(a, lueur(a, 0xff5a10, 90, 0.3), 3, -22, 14, 6);

  // Les longues tables le long des murs, leurs tonneaux pour s'asseoir, leurs chandelles.
  const tablee = (mur: number, u: number) => {
    const t = auMur(a, new THREE.Group(), mur, u, 0, 13);
    const dessus = boite(a, matTable, 62, 1.4, 9);
    dessus.position.y = 10;
    t.add(dessus);
    for (const x of [-27, 27]) {
      const pied = boite(a, matPoutre, 2, 9.4, 7);
      pied.position.set(x, 4.7, 0);
      t.add(pied);
    }
    for (let i = 0; i < 6; i++) {
      const tonneau = rond(a, matPoutre, 2.5, 5.5);
      tonneau.position.set(-25 + i * 10, 2.75, 8);
      t.add(tonneau);
    }
    for (const x of [-18, 2, 21]) {
      const pose = new THREE.Group();
      pose.position.set(x, 10.7, (x % 3) - 1);
      chandelle(pose, 16);
      t.add(pose);
    }
  };
  tablee(1, -40); tablee(1, 40); tablee(2, -40); tablee(2, 40); tablee(3, 42);

  // Les barriques couchées dans le coin du nord-est.
  const matBarrique = a.mat(0x3a2415);
  for (const [u, y] of [[58, 6], [71, 6], [64.5, 16.5]]) {
    const b = rond(a, matBarrique, 6, 13);
    b.rotation.x = Math.PI / 2;
    auMur(a, b, 0, u, y, 9);
  }
}

// ── Le salon de thé : boiseries sombres, porte de lune, lanternes ────

function salonDeThe(a: Atelier, decoupe: ReturnType<typeof decoupeur>): void {
  const treillis = toile(256, (g) => {
    g.fillStyle = '#4a2814';
    g.fillRect(0, 0, 256, 256);
    // Un jour chaud derrière le treillis, puis les baguettes de bois par-dessus.
    const jour = g.createRadialGradient(128, 128, 10, 128, 128, 170);
    jour.addColorStop(0, 'rgba(255, 176, 96, 0.6)');
    jour.addColorStop(1, 'rgba(255, 168, 84, 0.04)');
    g.fillStyle = jour;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#150a05';
    g.lineWidth = 9;
    g.strokeRect(0, 0, 256, 256);
    g.lineWidth = 5;
    for (const c of [40, 76]) g.strokeRect(c, c, 256 - c * 2, 256 - c * 2);
    g.beginPath();
    for (const p of [0, 256]) { g.moveTo(p, 128); g.lineTo(Math.abs(p - 40), 128); g.moveTo(128, p); g.lineTo(128, Math.abs(p - 40)); }
    g.moveTo(76, 76); g.lineTo(40, 40); g.moveTo(180, 76); g.lineTo(216, 40);
    g.moveTo(76, 180); g.lineTo(40, 216); g.moveTo(180, 180); g.lineTo(216, 216);
    g.stroke();
  }, 15, 7);
  const matTreillis = new THREE.MeshBasicMaterial({ map: treillis, color: 0xffffff, fog: false });
  const matLune = new THREE.MeshBasicMaterial({ color: 0xd8c0a8, fog: false });
  const matBois = a.mat(0x5a321c);
  const matNoir = a.mat(0x2a170e);
  const matBol = a.mat(0x9dc0ad);
  const matTerre = a.mat(0x6a3a22);
  a.jet.push(treillis, matTreillis, matLune);
  decoupe(matLune, 0.16, 0, 0.615, 0.7);

  sol(a, solDuFond('the', 0.235, 0.815, 0.05, 0.07, 9), 0x8a6248, 3);
  dalle(a, matNoir, H, true);
  poutres(a, matBois, 5, 5, true);

  // Un meuble à thé : montants, tablettes, bols de céladon et théières de terre.
  const etagere = (mur: number, u: number) => {
    const e = auMur(a, new THREE.Group(), mur, u, 0, 5);
    const dos = boite(a, matNoir, 24, 52, 1);
    dos.position.set(0, 26, -3);
    e.add(dos);
    for (const x of [-12, 12]) {
      const montant = boite(a, matBois, 1.4, 52, 7);
      montant.position.set(x, 26, 0);
      e.add(montant);
    }
    for (let n = 0; n < 5; n++) {
      const y = 14 + n * 9.5;
      const tablette = boite(a, matBois, 24, 0.9, 7);
      tablette.position.set(0, y, 0);
      e.add(tablette);
      for (let k = 0; k < 5; k++) {
        const theiere = (n + k) % 4 === 0;
        const o = theiere ? new THREE.Mesh(a.boule, matTerre) : rond(a, matBol, 1.1, 1.1);
        if (theiere) o.scale.set(1.5, 1.2, 1.5);
        o.position.set(-8.6 + k * 4.3, y + (theiere ? 1.6 : 1), 0.6);
        e.add(o);
      }
    }
    const coffre = boite(a, matBois, 25, 14, 8);
    coffre.position.set(0, 7, 0);
    e.add(coffre);
  };

  for (let mur = 0; mur < 4; mur++) {
    auMur(a, panneau(a, matTreillis, R * 2, H), mur, 0, H / 2);
    for (const u of [-88, 88]) auMur(a, boite(a, matBois, 5, H, 5), mur, u, H / 2, 2.5);
    auMur(a, boite(a, matBois, R * 2, 4, 3), mur, 0, 2, 1.5);
    if (mur % 2 === 0) {
      // Au nord et au sud, le grand pan à la porte de lune, encadré de bois.
      auMur(a, panneau(a, matLune, 124, H), mur, 0, H / 2, 0.4);
      for (const u of [-63, 63]) auMur(a, boite(a, matBois, 3.5, H, 3.5), mur, u, H / 2, 1.8);
      etagere(mur, -76); etagere(mur, 76);
    } else {
      for (const u of [-52, -18, 18, 52]) etagere(mur, u);
    }
  }

  // Les lanternes de papier pendues aux poutres, rouges et crème.
  const matCorde = a.mat(0x0d0704);
  [[-52, -52, 0], [52, -52, 1], [-52, 52, 1], [52, 52, 0], [0, -62, 1], [0, 62, 0], [-64, 0, 0], [64, 0, 1]].forEach(([x, z, creme], i) => {
    const y = Y0 + 44 + (i % 3) * 4;
    const couleur = creme ? 0xf6d99a : 0xe2492c;
    const corps = new THREE.Mesh(a.boule, a.lumiere(couleur));
    corps.scale.set(3.6, 4.6, 3.6);
    corps.position.set(x, y, z);
    const corde = boite(a, matCorde, 0.25, Y0 + H - y, 0.25);
    corde.position.set(x, (y + Y0 + H) / 2, z);
    for (const dy of [4.6, -4.6]) {
      const coiffe = rond(a, matCorde, 1.7, 0.9);
      coiffe.position.set(x, y + dy, z);
      a.g.add(coiffe);
    }
    const gland = boite(a, a.lumiere(0xb3261a), 0.5, 5, 0.5);
    gland.position.set(x, y - 7.5, z);
    const l = lueur(a, creme ? 0xffc873 : 0xff5a2e, 34, 0.5);
    l.position.set(x, y, z);
    a.g.add(corps, corde, gland, l);
  });

  // Les bambous en pot, dans les quatre coins.
  const matPot = a.mat(0x4d6a66);
  const matBambou = a.mat(0x5d7a3a);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const pot = rond(a, matPot, 4, 8);
    pot.position.set(sx * 74, Y0 + 4, sz * 74);
    a.g.add(pot);
    for (let k = 0; k < 6; k++) {
      const tige = rond(a, matBambou, 0.35, 34 + k * 3);
      tige.position.set(sx * 74 + Math.cos(k * 1.05) * 2, Y0 + 24 + k * 1.5, sz * 74 + Math.sin(k * 1.05) * 2);
      tige.rotation.set(Math.sin(k * 2.1) * 0.09, 0, Math.cos(k * 1.7) * 0.09);
      a.g.add(tige);
    }
  }
}

// ── Le jardin de thé : papier, bois blond, bambou et tatami ──────────

function jardinDeThe(a: Atelier, decoupe: ReturnType<typeof decoupeur>): void {
  const bambou = toile(256, (g) => {
    g.fillStyle = '#d7c08b';
    g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) {
      g.fillStyle = x % 16 ? 'rgba(120, 92, 44, 0.22)' : 'rgba(255, 246, 214, 0.25)';
      g.fillRect(x, 0, 2, 256);
    }
    g.fillStyle = 'rgba(110, 82, 40, 0.3)';
    for (let y = 30; y < 256; y += 64) g.fillRect(0, y, 256, 3);
  }, 9, 9);
  const tatami = toile(512, (g) => {
    // Deux rangs de nattes, le second décalé d'une demi-natte.
    for (let r = 0; r < 2; r++) {
      for (let k = -1; k < 2; k++) {
        const x = k * 512 + r * 256, y = r * 256;
        g.fillStyle = (k + r) % 2 ? '#d6c592' : '#dccb9a';
        g.fillRect(x, y, 512, 256);
        // Le tressage : des brins fins dans le sens court de la natte.
        for (let b = 0; b < 512; b += 3) {
          g.fillStyle = b % 6 ? 'rgba(126, 108, 60, 0.13)' : 'rgba(255, 248, 220, 0.16)';
          g.fillRect(x + b, y, 1, 256);
        }
        // Le galon de tissu sur les deux longs côtés, le joint nu au bout.
        g.fillStyle = '#7d8662';
        g.fillRect(x, y, 512, 4);
        g.fillRect(x, y + 252, 512, 4);
        g.fillStyle = 'rgba(70, 58, 32, 0.5)';
        g.fillRect(x, y + 7, 2, 242);
      }
    }
  }, 5, 10);
  const matBlond = a.mat(0xd9b77e);
  const matPlafond = new THREE.MeshBasicMaterial({ map: bambou, color: 0xe9dcc0, fog: false });
  a.jet.push(bambou, matPlafond);

  sol(a, tatami, 0xffffff, 0.8);
  dalle(a, matPlafond, H, true);
  poutres(a, matBlond, 5, 4, true);

  for (let mur = 0; mur < 4; mur++) {
    // Le pan de mur de l'image : shoji, jardin, alcôve et tablettes; un mur sur deux en miroir.
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    a.jet.push(m);
    decoupe(m, 0.045, 0.215, 0.91, 0.76, mur % 2 === 1);
    auMur(a, panneau(a, m, R * 2, H), mur, 0, H / 2);
    for (const u of [-88, 88]) auMur(a, boite(a, matBlond, 5, H, 5), mur, u, H / 2, 2.5);
    auMur(a, boite(a, matBlond, R * 2, 3, 2.4), mur, 0, 1.5, 1.2);
    auMur(a, boite(a, matBlond, R * 2, 4, 3), mur, 0, H - 2, 1.5);
  }

  // Dans chaque coin, une lampe de papier sur pied et un coussin.
  const matPapier = a.lumiere(0xfff0d0);
  const matCoussin = a.mat(0x7d8a5c);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const x = sx * 76, z = sz * 76;
    const lampe = boite(a, matPapier, 5, 9, 5);
    lampe.position.set(x, Y0 + 9.5, z);
    a.g.add(lampe);
    for (const [px, pz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const pied = boite(a, matBlond, 0.5, 15, 0.5);
      pied.position.set(x + px * 2.6, Y0 + 7.5, z + pz * 2.6);
      a.g.add(pied);
    }
    const l = lueur(a, 0xffd9a0, 26, 0.45);
    l.position.set(x, Y0 + 9.5, z);
    const coussin = boite(a, matCoussin, 9, 1.4, 9);
    coussin.position.set(sx * 60, Y0 + 0.7, sz * 76);
    a.g.add(l, coussin);
  }
}

/** Bâtit les salles à la demande; rend la fonction qui montre la salle voulue. */
export function batirSalles(scene: THREE.Scene, gestionnaire: THREE.LoadingManager, aJeter: Jetable[]): (d: IdDecor) => void {
  const boiteG = new THREE.BoxGeometry(1, 1, 1);
  const rondG = new THREE.CylinderGeometry(1, 1, 1, 16);
  const planG = new THREE.PlaneGeometry(1, 1);
  const bouleG = new THREE.SphereGeometry(1, 16, 12);
  const halo = toile(128, (g) => {
    const d = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    d.addColorStop(0, 'rgba(255, 255, 255, 1)');
    d.addColorStop(0.25, 'rgba(255, 255, 255, 0.45)');
    d.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = d;
    g.fillRect(0, 0, 128, 128);
  }, 1, 1);
  aJeter.push(boiteG, rondG, planG, bouleG, halo);

  const salles = new Map<IdDecor, THREE.Group>();
  return (d: IdDecor) => {
    if (!salles.has(d)) {
      const a: Atelier = {
        g: new THREE.Group(), jet: aJeter, boite: boiteG, rond: rondG, plan: planG, boule: bouleG, halo,
        mat: (couleur) => { const m = new THREE.MeshLambertMaterial({ color: couleur, fog: false }); aJeter.push(m); return m; },
        lumiere: (couleur) => { const m = new THREE.MeshBasicMaterial({ color: couleur, fog: false }); aJeter.push(m); return m; },
      };
      // Seule la première salle retient l'écran de chargement.
      const decoupe = () => decoupeur(a, d, salles.size ? undefined : gestionnaire);
      if (d === 'taverne') taverne(a);
      else if (d === 'the') salonDeThe(a, decoupe());
      else jardinDeThe(a, decoupe());
      scene.add(a.g);
      salles.set(d, a.g);
    }
    for (const [id, g] of salles) g.visible = id === d;
  };
}
