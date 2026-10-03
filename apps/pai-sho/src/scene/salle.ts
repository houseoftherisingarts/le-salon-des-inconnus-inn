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
  /** La charpente, cachée dès que la caméra monte au-dessus (sur téléphone, elle recule très haut). */
  haut: THREE.Group;
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
    a.haut.add(p);
    if (croisees) {
      const q = boite(a, m, epais * 0.8, epais * 0.7, R * 2);
      q.position.set(u, Y0 + H - epais * 0.35, 0);
      a.haut.add(q);
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
  const d = dalle(a, m, 0, false);
  d.receiveShadow = true;
  d.onBeforeRender = (_r, _s, camera) => { a.haut.visible = camera.position.y < Y0 + H - 10; };
}

// ── La taverne : pierre, poutres noircies, chandelles et âtre ────────

/** Une image de `scenes/` posée telle quelle sur un mur, à l'endroit ou en miroir. */
function pan(a: Atelier, fichier: string, gestionnaire?: THREE.LoadingManager, miroir = false): THREE.MeshBasicMaterial {
  const t = new THREE.TextureLoader(gestionnaire).load(`${BASE}scenes/${fichier}.jpg`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (miroir) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
  const m = new THREE.MeshBasicMaterial({ map: t, fog: false });
  a.jet.push(t, m);
  return m;
}

function taverne(a: Atelier, gestionnaire?: THREE.LoadingManager): void {
  const matPlafond = a.mat(0x1d120b);
  const matPoutre = a.mat(0x2e1c11);
  const matTable = a.mat(0x4a2c18);
  const matFer = a.mat(0x0d0907);
  const matCire = a.lumiere(0xf3dfb4);

  // Le dallage : de grandes pierres inégales, usées, que les chandelles dorent par endroits.
  const h = hasard(7);
  const dallage = toile(1024, (g) => {
    g.fillStyle = '#0c0806';
    g.fillRect(0, 0, 1024, 1024);
    const teintes = ['#4a3d33', '#3e332b', '#54443a', '#352b25', '#5c4a3c', '#443830'];
    for (let r = 0; r < 8; r++) {
      const haut = 128;
      let x = -h() * 120;
      while (x < 1024) {
        const l = 110 + h() * 150;
        for (const dx of [0, 1024]) {
          g.fillStyle = teintes[Math.floor(h() * teintes.length)];
          g.beginPath();
          g.roundRect(x - dx + 4, r * haut + 4, l - 8, haut - 8, 14);
          g.fill();
          const o = g.createRadialGradient(x - dx + l / 2, r * haut + haut / 2, 8, x - dx + l / 2, r * haut + haut / 2, l * 0.7);
          o.addColorStop(0, 'rgba(255, 170, 96, 0.16)');
          o.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
          g.fillStyle = o;
          g.fill();
        }
        x += l;
      }
    }
    // L'usure : des piqûres claires et sombres dans la pierre.
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = i % 2 ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 210, 160, 0.07)';
      g.fillRect(h() * 1024, h() * 1024, 1 + h() * 3, 1 + h() * 3);
    }
  }, 3, 3);
  sol(a, dallage, 0x9a7c62, 0.9, 0x3a2a1e);
  dalle(a, matPlafond, H, true);
  // Les poutres : larges mais peu hautes, pour que la caméra du téléphone, qui monte haut, passe dessous.
  for (let i = 0; i < 6; i++) {
    const p = boite(a, matPoutre, R * 2, 5, 10);
    p.position.set(0, Y0 + H - 2.5, -R + ((i + 0.5) * R * 2) / 6);
    a.haut.add(p);
  }
  // Les aisseliers : chaque poutre s'appuie sur les murs par deux jambes de force.
  for (let i = 0; i < 6; i++) {
    const z = -R + ((i + 0.5) * R * 2) / 6;
    for (const sx of [-1, 1]) {
      const jambe = boite(a, matPoutre, 26, 5, 5);
      jambe.position.set(sx * (R - 10), Y0 + H - 17, z);
      jambe.rotation.z = sx * Math.PI / 4;
      a.haut.add(jambe);
    }
  }

  const chandelle = (o: THREE.Object3D, halo: number) => {
    const c = rond(a, matCire, 0.35, 1.6);
    c.position.y = 0.8;
    const f = lueur(a, 0xffb347, 3.2, 1);
    f.position.y = 2.3;
    const l = lueur(a, 0xff7a26, halo, 0.42);
    l.position.y = 2.3;
    o.add(c, f, l);
  };

  // Les murs sont peints d'après la salle d'origine : le pignon au soupirail
  // au nord, le long mur aux alcôves de brique sur les trois autres côtés.
  for (let mur = 0; mur < 4; mur++) {
    const miroir = mur === 3;
    const m = mur === 0 ? pan(a, 'taverne-fond', gestionnaire) : pan(a, 'taverne-mur', gestionnaire, miroir);
    auMur(a, panneau(a, m, R * 2, H), mur, 0, H / 2);
    for (const u of [-90, 90]) auMur(a, boite(a, matPoutre, 6, H, 6), mur, u, H / 2, 3);
    if (mur === 0) {
      // Le jour froid du soupirail, qui tombe en brume, et les deux appliques.
      auMur(a, lueur(a, 0x9fc4e6, 70, 0.4), 0, 0, 62, 4);
      auMur(a, lueur(a, 0x9fc4e6, 46, 0.22), 0, 0, 40, 10);
      for (const u of [-50, 50]) auMur(a, lueur(a, 0xff8a30, 30, 0.4), 0, u, 37, 3);
    } else {
      // Les flammes peintes reprennent vie : l'âtre de la deuxième alcôve et les chandelles des poteaux.
      const sens = miroir ? -1 : 1;
      auMur(a, lueur(a, 0xff6a14, 40, 0.7), mur, -22.5 * sens, 20, 3);
      auMur(a, lueur(a, 0xffc35a, 16, 0.8), mur, -22.5 * sens, 19, 3.5);
      for (const u of [-47, 0, 47]) auMur(a, lueur(a, 0xff8a30, 26, 0.38), mur, u, 46, 3);
    }
  }

  // Deux rangs de longues tables de part et d'autre de l'allée, comme sur
  // l'image : des tonneaux pour s'asseoir des deux côtés et des chandelles.
  const tablee = (mur: number, u: number) => {
    const t = auMur(a, new THREE.Group(), mur, u, 0, 30);
    const dessus = boite(a, matTable, 70, 1.4, 11);
    dessus.position.y = 10;
    t.add(dessus);
    for (const x of [-30, 0, 30]) {
      const pied = boite(a, matPoutre, 2, 9.4, 8);
      pied.position.set(x, 4.7, 0);
      t.add(pied);
    }
    for (let i = 0; i < 7; i++) {
      for (const z of [-9, 9]) {
        const tonneau = rond(a, matPoutre, 2.6, 5.5);
        tonneau.position.set(-30 + i * 10, 2.75, z);
        t.add(tonneau);
      }
    }
    for (const x of [-28, -17, -5, 6, 18, 29]) {
      const pose = new THREE.Group();
      pose.position.set(x, 10.7, (x % 3) - 1);
      chandelle(pose, 13);
      t.add(pose);
    }
  };
  tablee(1, -42); tablee(1, 42); tablee(3, -42); tablee(3, 42);

  // La lanterne de fer pendue à sa chaîne, près de l'âtre.
  const lanterne = new THREE.Group();
  lanterne.position.set(-52, Y0 + 50, -40);
  const chaine = boite(a, matFer, 0.4, H - 50, 0.4);
  chaine.position.y = (H - 50) / 2 + 4;
  const coiffe = rond(a, matFer, 2.6, 1.2);
  coiffe.position.y = 4;
  const verre = boite(a, a.lumiere(0xffc46a), 3, 6, 3);
  const socle = rond(a, matFer, 2.4, 0.8);
  socle.position.y = -3.6;
  lanterne.add(chaine, coiffe, verre, socle, lueur(a, 0xff9a3a, 36, 0.5));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const montant = boite(a, matFer, 0.4, 7, 0.4);
    montant.position.set(x * 1.6, 0, z * 1.6);
    lanterne.add(montant);
  }
  a.g.add(lanterne);

  // Les barriques couchées dans le coin du nord-est.
  const matBarrique = a.mat(0x3a2415);
  for (const [u, y] of [[58, 6], [71, 6], [64.5, 16.5]]) {
    const b = rond(a, matBarrique, 6, 13);
    b.rotation.x = Math.PI / 2;
    auMur(a, b, 0, u, y, 9);
  }
}

// ── Le jardin des cerisiers : dehors, la rivière et ses carpes ───────

function cerisiers(a: Atelier): void {
  const h = hasard(11);
  // Le lointain : l'image peinte, enroulée deux fois en miroir pour se fermer sans couture.
  const fond = new THREE.TextureLoader().load(`${BASE}scenes/sakura-salle.jpg`);
  fond.colorSpace = THREE.SRGBColorSpace;
  fond.wrapS = THREE.MirroredRepeatWrapping;
  fond.repeat.x = 2;
  const RL = 170, HL = 228;
  const tour = new THREE.Mesh(
    new THREE.CylinderGeometry(RL, RL, HL, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: fond, side: THREE.BackSide, fog: false }),
  );
  // L'herbe de l'image commence à 86 % de sa hauteur : c'est là que passe le sol.
  tour.position.y = Y0 + HL / 2 - HL * 0.14;
  a.g.add(tour);

  const herbe = toile(256, (g) => {
    g.fillStyle = '#6d9a42';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = i % 3 ? 'rgba(60, 110, 40, 0.16)' : 'rgba(190, 220, 120, 0.16)';
      g.fillRect(h() * 256, h() * 256, 1.5, 3 + h() * 4);
    }
    // Les pétales tombés dans l'herbe.
    g.fillStyle = 'rgba(255, 214, 228, 0.85)';
    for (let i = 0; i < 46; i++) g.fillRect(h() * 256, h() * 256, 2.5, 2);
  }, 16, 16);
  const pre = new THREE.Mesh(new THREE.CircleGeometry(RL, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: herbe, fog: false }));
  pre.position.y = Y0;
  a.g.add(pre);
  a.jet.push(fond, tour.geometry, tour.material as THREE.Material, herbe, pre.geometry, pre.material as THREE.Material);

  // La rivière : un ruban qui serpente au nord de la table, bordé de galets.
  const cours = new THREE.CatmullRomCurve3([[-170, -34], [-110, -62], [-55, -44], [0, -58], [55, -42], [110, -64], [170, -40]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const ruban = (demi: number, y: number, m: THREE.Material): THREE.Mesh => {
    const N = 80, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const p = cours.getPointAt(i / N), tg = cours.getTangentAt(i / N);
      for (const c of [-1, 1]) {
        pos.push(p.x - tg.z * demi * c, y, p.z + tg.x * demi * c);
        uv.push((i / N) * 12, (c + 1) / 2);
      }
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const o = new THREE.Mesh(geo, m);
    o.position.y = Y0;
    a.jet.push(geo, m);
    a.g.add(o);
    return o;
  };
  const onde = toile(256, (g) => {
    const d = g.createLinearGradient(0, 0, 0, 256);
    d.addColorStop(0, '#6fb0a8'); d.addColorStop(0.5, '#3f8fa6'); d.addColorStop(1, '#6fb0a8');
    g.fillStyle = d;
    g.fillRect(0, 0, 256, 256);
    // Les rides : de petits traits clairs couchés dans le sens du courant.
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(235, 250, 255, ${0.1 + h() * 0.25})`;
      g.lineWidth = 1 + h() * 2;
      const x = h() * 256, y = h() * 256, l = 14 + h() * 40;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + 3, x + l, y); g.stroke();
    }
  }, 1, 1);
  a.jet.push(onde);
  ruban(17, 0.04, a.lumiere(0x9a9684));
  const eau = ruban(14, 0.08, new THREE.MeshBasicMaterial({ map: onde, fog: false }));
  eau.frustumCulled = false;

  // Les carpes : un corps, une queue qui bat, et chacune suit le courant à son pas.
  const robes = [[0xf26a1b, 0xffffff], [0xffffff, 0xe0301e], [0xf2a11b, 0xf26a1b], [0xe0301e, 0xffffff], [0x1c1a18, 0xf26a1b]];
  const carpes = Array.from({ length: 11 }, (_, k) => {
    const [corps, tache] = robes[k % robes.length];
    const c = new THREE.Group();
    const dos = new THREE.Mesh(a.boule, a.lumiere(corps));
    dos.scale.set(3, 0.5, 1);
    const marque = new THREE.Mesh(a.boule, a.lumiere(tache));
    marque.scale.set(1.1, 0.55, 0.8);
    marque.position.x = 0.9;
    const queue = new THREE.Group();
    queue.position.x = -2.6;
    const voile = new THREE.Mesh(a.boule, a.lumiere(corps));
    voile.scale.set(1.3, 0.2, 0.9);
    voile.position.x = -1.1;
    queue.add(voile);
    c.add(dos, marque, queue);
    c.scale.setScalar(0.75 + h() * 0.6);
    a.g.add(c);
    return { c, queue, depart: h(), vitesse: (0.012 + h() * 0.014) * (k % 3 ? 1 : -1), bord: (h() - 0.5) * 18, phase: h() * 6 };
  });

  // Les pétales qui tombent, emportés d'un rien par le vent.
  const NP = 220;
  const petales = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) petales.set([(h() - 0.5) * 220, Y0 + h() * 70, (h() - 0.5) * 220], i * 3);
  const geoPetales = new THREE.BufferGeometry();
  geoPetales.setAttribute('position', new THREE.BufferAttribute(petales, 3));
  const matPetales = new THREE.PointsMaterial({ color: 0xffd3e2, size: 0.9, map: a.halo, transparent: true, depthWrite: false, fog: false });
  const pluie = new THREE.Points(geoPetales, matPetales);
  pluie.frustumCulled = false;
  a.g.add(pluie);
  a.jet.push(geoPetales, matPetales);

  // ponytail: l'animation vit dans onBeforeRender de l'eau, donc elle ne tourne
  // que si cette salle est montrée; à sortir vers la boucle de scene.ts si une autre salle s'anime.
  let avant = performance.now();
  eau.onBeforeRender = () => {
    const maintenant = performance.now();
    const dt = Math.min((maintenant - avant) / 1000, 0.1), t = maintenant / 1000;
    avant = maintenant;
    onde.offset.x = -t * 0.12;
    for (const k of carpes) {
      const s = (((k.depart + t * k.vitesse) % 1) + 1) % 1;
      const p = cours.getPointAt(s), tg = cours.getTangentAt(s);
      const cote = k.bord + Math.sin(t * 0.4 + k.phase) * 3;
      k.c.position.set(p.x - tg.z * cote, Y0 + 0.3, p.z + tg.x * cote);
      k.c.rotation.y = Math.atan2(-tg.z, tg.x) + (k.vitesse < 0 ? Math.PI : 0) + Math.sin(t * 3 + k.phase) * 0.12;
      k.queue.rotation.y = Math.sin(t * 7 + k.phase) * 0.6;
    }
    for (let i = 0; i < NP; i++) {
      petales[i * 3] += Math.sin(t + i) * dt * 1.5;
      petales[i * 3 + 1] -= dt * (2 + (i % 5) * 0.5);
      if (petales[i * 3 + 1] < Y0) petales[i * 3 + 1] = Y0 + 70;
    }
    geoPetales.attributes.position.needsUpdate = true;
  };

  // Les cerisiers en fleurs : un tronc penché, deux branches et des nuages de fleurs.
  const matTronc = a.mat(0x5a4034);
  const floraison = toile(128, (g) => {
    g.fillStyle = '#f7a9c4';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = ['#ffe3ec', '#ffc4d8', '#e886a8', '#fff4f7'][i % 4];
      g.beginPath(); g.arc(h() * 128, h() * 128, 1.5 + h() * 3, 0, 7); g.fill();
    }
  }, 5, 3);
  a.jet.push(floraison);
  const fleurs = [0xffffff, 0xffe6ee, 0xffd0e0].map((c) => { const m = a.mat(c); m.map = floraison; return m; });
  for (const [x, z, taille] of [[-78, -92, 1.2], [-20, -100, 1], [46, -96, 1.25], [100, -84, 1], [-112, -8, 1.1], [112, 22, 1.15], [-92, 72, 1.2], [84, 86, 1.1], [0, 112, 1.3]]) {
    const arbre = new THREE.Group();
    arbre.position.set(x, Y0, z);
    arbre.scale.setScalar(taille);
    arbre.rotation.y = h() * 6;
    const tronc = rond(a, matTronc, 2.2, 20);
    tronc.position.y = 10;
    tronc.rotation.z = 0.12;
    arbre.add(tronc);
    for (const s of [-1, 1]) {
      const branche = rond(a, matTronc, 1.1, 18);
      branche.position.set(s * 6, 22, 0);
      branche.rotation.z = -s * 0.7;
      arbre.add(branche);
    }
    for (let k = 0; k < 16; k++) {
      const nuage = new THREE.Mesh(a.boule, fleurs[k % 3]);
      const r = 6 + h() * 6;
      nuage.scale.set(r, r * 0.75, r);
      nuage.position.set((h() - 0.5) * 38, 22 + h() * 18, (h() - 0.5) * 38);
      arbre.add(nuage);
    }
    a.g.add(arbre);
  }

  // Deux lanternes de pierre au bord de l'eau.
  const matPierre = a.mat(0x8f8f86);
  for (const x of [-34, 30]) {
    const p = cours.getPointAt(0.5 + x / 340);
    const l = new THREE.Group();
    l.position.set(p.x, Y0, p.z - 21);
    const base = rond(a, matPierre, 2.2, 1);
    base.position.y = 0.5;
    const pied = rond(a, matPierre, 0.9, 6);
    pied.position.y = 4;
    const cage = boite(a, a.lumiere(0xffe2a8), 2.4, 2.6, 2.4);
    cage.position.y = 8.3;
    const toit = new THREE.Mesh(new THREE.ConeGeometry(3, 2.4, 4), matPierre);
    toit.position.y = 10.8;
    toit.rotation.y = Math.PI / 4;
    a.jet.push(toit.geometry);
    l.add(base, pied, cage, toit);
    a.g.add(l);
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
        g: new THREE.Group(), haut: new THREE.Group(), jet: aJeter, boite: boiteG, rond: rondG, plan: planG, boule: bouleG, halo,
        mat: (couleur) => { const m = new THREE.MeshLambertMaterial({ color: couleur, fog: false }); aJeter.push(m); return m; },
        lumiere: (couleur) => { const m = new THREE.MeshBasicMaterial({ color: couleur, fog: false }); aJeter.push(m); return m; },
      };
      a.g.add(a.haut);
      // Seule la première salle retient l'écran de chargement.
      const decoupe = () => decoupeur(a, d, salles.size ? undefined : gestionnaire);
      if (d === 'taverne') taverne(a, salles.size ? undefined : gestionnaire);
      else if (d === 'sakura') cerisiers(a);
      else if (d === 'the') salonDeThe(a, decoupe());
      else jardinDeThe(a, decoupe());
      scene.add(a.g);
      salles.set(d, a.g);
    }
    for (const [id, g] of salles) g.visible = id === d;
  };
}
