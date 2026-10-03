// ─── Le décor : la salle, la table, la lumière ──────────────────────

import * as THREE from 'three';
import type { IdDecor } from '../skins';
import { ombreDeContact } from './bois';
import { BASE, RAYON_FACE, Y_PLANCHER } from './mesures';

type Jetable = { dispose(): void };

// Chaque salle a sa lumière : la taverne reste dans l'ombre des torches,
// le salon de thé garde sa pénombre, et le jardin de thé s'ouvre au jour,
// beige pâle, bambou et tatami.
const AMBIANCES: Record<IdDecor, {
  fond: number; salle: number; dessus: number; chant: number;
  ambiante: [number, number]; cielSol: [number, number, number];
  lanterne: [number, number]; torches: [number, number, number]; froide: number;
}> = {
  taverne: {
    fond: 0x0d0805, salle: 0x8a7562, dessus: 0xb8977a, chant: 0x3a2414,
    ambiante: [0xffd2a0, 0.6], cielSol: [0xffc98a, 0x2a160c, 1.05],
    lanterne: [0xffc488, 1500], torches: [0xff8a3a, 900, 700], froide: 160,
  },
  the: {
    fond: 0x0d0805, salle: 0x8a7562, dessus: 0xb8977a, chant: 0x3a2414,
    ambiante: [0xffd2a0, 0.6], cielSol: [0xffc98a, 0x2a160c, 1.05],
    lanterne: [0xffc488, 1500], torches: [0xff8a3a, 900, 700], froide: 160,
  },
  jardin: {
    fond: 0xe6d8bc, salle: 0xffffff, dessus: 0xffffff, chant: 0xc9a56c,
    ambiante: [0xfff3df, 0.95], cielSol: [0xfff7ea, 0xcbb690, 1.25],
    lanterne: [0xfff0d6, 1100], torches: [0xffe0b0, 110, 90], froide: 40,
  },
};

/** Un dessus de table en bois blond, à larges planches et au fil discret. */
function boisBlond(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  const teintes = ['#e3c896', '#dcbf8a', '#e8cfa0', '#d8b981'];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = teintes[i];
    g.fillRect(0, i * 128, 512, 128);
    // Le fil du bois : de longues veines pâles et brunes, jamais droites.
    for (let k = 0; k < 26; k++) {
      const y = i * 128 + 4 + ((k * 37 + i * 53) % 120);
      g.strokeStyle = k % 3 ? 'rgba(150, 110, 60, 0.13)' : 'rgba(255, 244, 214, 0.2)';
      g.lineWidth = 1 + (k % 2);
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(170, y + ((k * 7) % 9) - 4, 340, y - ((k * 5) % 9) + 4, 512, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(110, 78, 40, 0.45)';
    g.fillRect(0, i * 128, 512, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1.6);
  t.anisotropy = 8;
  return t;
}

/** Les pavés de la taverne : sombres, arrondis, luisants, comme ceux du fond. */
function dalles(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0908';
  g.fillRect(0, 0, 512, 512);
  const teintes = ['#3b3632', '#33302d', '#443d37', '#2c2927', '#3f3935', '#4a423a'];
  let n = 0;
  for (let r = 0; r < 8; r++) {
    // Chaque rang a ses largeurs : 3, 4 ou 5 pavés, décalés d'un rang à l'autre.
    const parRang = 3 + ((r * 2 + 1) % 3);
    const l = 512 / parRang, decal = (r % 2) * l * 0.5;
    for (let k = -1; k <= parRang; k++) {
      const x = k * l + decal, y = r * 64;
      n++;
      g.fillStyle = teintes[(n * 7 + r) % teintes.length];
      g.beginPath();
      g.roundRect(x + 4, y + 4, l - 8, 56, 16);
      g.fill();
      // Le dessus bombé accroche la lumière des torches.
      const reflet = g.createLinearGradient(0, y + 4, 0, y + 60);
      reflet.addColorStop(0, 'rgba(255, 190, 120, 0.16)');
      reflet.addColorStop(0.5, 'rgba(255, 190, 120, 0)');
      reflet.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      g.fillStyle = reflet;
      g.beginPath();
      g.roundRect(x + 4, y + 4, l - 8, 56, 16);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(11, 11);
  t.anisotropy = 8;
  return t;
}

/** Des tatamis de paille tressée, posés en quinconce, bordés d'un galon sombre. */
function tatami(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  // Deux rangs de nattes (256 × 256 chacune dans la texture), le second décalé d'une demi-natte.
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
      g.fillStyle = '#2f3a2c';
      g.fillRect(x, y, 512, 7);
      g.fillRect(x, y + 249, 512, 7);
      g.fillStyle = 'rgba(70, 58, 32, 0.5)';
      g.fillRect(x, y + 7, 2, 242);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 10);
  t.anisotropy = 8;
  return t;
}

/** Bâtit la salle, la table et la lumière; rend la fonction qui change la salle. */
export function batirDecor(
  scene: THREE.Scene, racine: THREE.Group, gestionnaire: THREE.LoadingManager, aJeter: Jetable[], decor: IdDecor,
): (decor: IdDecor) => void {
  const texture = (url: string, repeter = 1): THREE.Texture => {
    const t = new THREE.TextureLoader(gestionnaire).load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeter !== 1) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = repeter; }
    aJeter.push(t);
    return t;
  };

  // La taverne enroulée sur un cylindre ouvert vers l'intérieur,
  // assombrie pour que la table reste le sujet.
  const geoSalle = new THREE.CylinderGeometry(95, 95, 80, 64, 1, true);
  const matSalle = new THREE.MeshBasicMaterial({
    map: texture(`${BASE}scenes/${decor}-salle.jpg`, 3),
    side: THREE.BackSide, fog: false, depthWrite: false, color: 0x8a7562,
  });
  const salle = new THREE.Mesh(geoSalle, matSalle);
  salle.position.y = Y_PLANCHER + 34;
  salle.renderOrder = -1;
  scene.add(salle);
  const geoSol = new THREE.CircleGeometry(95, 64).rotateX(-Math.PI / 2);
  // Le sol se voit jusqu'au mur : il porte sa propre lueur et la brume ne
  // l'éteint pas, sinon la table flotte sur un disque noir.
  const pierre = dalles();
  const matSol = new THREE.MeshStandardMaterial({ map: pierre, emissiveMap: pierre, emissive: 0x30261e, roughness: 0.95, fog: false });
  const planches = new THREE.TextureLoader(gestionnaire).load(`${BASE}textures/table-bois.webp`);
  planches.colorSpace = THREE.SRGBColorSpace;
  planches.wrapS = planches.wrapT = THREE.RepeatWrapping;
  planches.repeat.set(7, 9);
  planches.anisotropy = 8;
  const matPlancher = new THREE.MeshStandardMaterial({ map: planches, emissiveMap: planches, emissive: 0x5a4632, roughness: 0.8, fog: false });
  const paille = tatami();
  const matTatami = new THREE.MeshStandardMaterial({ map: paille, roughness: 0.95, fog: false });
  const sol = new THREE.Mesh(geoSol, matSol);
  sol.position.y = Y_PLANCHER;
  sol.receiveShadow = true;
  scene.add(sol);

  // La table, ses quatre pieds dans l'ombre et l'ombre de contact du plateau.
  const carte = texture(`${BASE}textures/table-bois.webp`);
  carte.wrapS = carte.wrapT = THREE.RepeatWrapping;
  carte.repeat.set(2, 1.6);
  const geoTable = new THREE.BoxGeometry(40, 1.6, 34);
  const matDessus = new THREE.MeshStandardMaterial({ map: carte, roughness: 0.62, metalness: 0.02, color: 0xb8977a });
  const blond = boisBlond();
  const matChant = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.8 });
  const table = new THREE.Mesh(geoTable, [matChant, matChant, matDessus, matChant, matChant, matChant]);
  table.position.y = -0.8;
  table.receiveShadow = true;
  racine.add(table);
  const geoPied = new THREE.BoxGeometry(1.6, -Y_PLANCHER - 1.6, 1.6);
  for (const [x, z] of [[-17, -14], [17, -14], [-17, 14], [17, 14]]) {
    const p = new THREE.Mesh(geoPied, matChant);
    p.position.set(x, (Y_PLANCHER - 1.6) / 2, z);
    racine.add(p);
  }
  const ombre = ombreDeContact(256, 0.7);
  const geoOmbre = new THREE.PlaneGeometry(RAYON_FACE * 2.7, RAYON_FACE * 2.7).rotateX(-Math.PI / 2);
  const matOmbre = new THREE.MeshBasicMaterial({ map: ombre, transparent: true, depthWrite: false });
  const o = new THREE.Mesh(geoOmbre, matOmbre);
  o.position.y = 0.01;
  racine.add(o);
  aJeter.push(geoSalle, matSalle, geoSol, matSol, pierre, planches, matPlancher, paille, matTatami, blond, geoTable, matDessus, matChant, geoPied, ombre, geoOmbre, matOmbre);

  // La lumière : une lanterne au-dessus de la table porte les ombres
  // douces, deux torches aux murs et une lueur froide détachent les volumes.
  const ambiante = new THREE.AmbientLight(0xffd2a0, 0.35);
  const cielSol = new THREE.HemisphereLight(0xffc98a, 0x1a0d07, 0.7);
  scene.add(ambiante, cielSol);
  const lanterne = new THREE.SpotLight(0xffc488, 1400, 90, Math.PI / 4.2, 0.6, 2);
  lanterne.position.set(-3, 30, 6);
  lanterne.target.position.set(0, 0, 0);
  lanterne.castShadow = true;
  lanterne.shadow.mapSize.set(2048, 2048);
  lanterne.shadow.bias = -0.0004;
  lanterne.shadow.radius = 4;
  lanterne.shadow.camera.near = 10;
  lanterne.shadow.camera.far = 60;
  scene.add(lanterne, lanterne.target);
  const torcheA = new THREE.PointLight(0xff7a2a, 500, 70, 2);
  torcheA.position.set(-24, 14, -18);
  const torcheB = new THREE.PointLight(0xff6a1a, 400, 70, 2);
  torcheB.position.set(24, 12, 16);
  const froide = new THREE.PointLight(0x6f86ff, 120, 60, 2);
  froide.position.set(10, 22, -20);
  scene.add(torcheA, torcheB, froide);

  const ambiance = (d: IdDecor) => {
    const a = AMBIANCES[d];
    scene.background = new THREE.Color(a.fond);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.setHex(a.fond);
      // Au grand jour, la brume recule pour ne pas voiler la table.
      scene.fog.near = d === 'jardin' ? 130 : 70;
      scene.fog.far = d === 'jardin' ? 260 : 150;
    }
    matSalle.color.setHex(a.salle);
    matDessus.color.setHex(a.dessus);
    matChant.color.setHex(a.chant);
    matDessus.map = d === 'jardin' ? blond : carte;
    matDessus.needsUpdate = true;
    sol.material = d === 'jardin' ? matTatami : d === 'the' ? matPlancher : matSol;
    ambiante.color.setHex(a.ambiante[0]); ambiante.intensity = a.ambiante[1];
    cielSol.color.setHex(a.cielSol[0]); cielSol.groundColor.setHex(a.cielSol[1]); cielSol.intensity = a.cielSol[2];
    lanterne.color.setHex(a.lanterne[0]); lanterne.intensity = a.lanterne[1];
    torcheA.color.setHex(a.torches[0]); torcheB.color.setHex(a.torches[0]);
    torcheA.intensity = a.torches[1]; torcheB.intensity = a.torches[2];
    froide.intensity = a.froide;
  };
  ambiance(decor);

  // La salle au choix : la texture et la lumière se remplacent, le cylindre reste.
  let salleActuelle = decor;
  return (d: IdDecor) => {
    if (d === salleActuelle) return;
    salleActuelle = d;
    ambiance(d);
    const t = new THREE.TextureLoader().load(`${BASE}scenes/${d}-salle.jpg`, () => { matSalle.map = t; matSalle.needsUpdate = true; });
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 3;
    aJeter.push(t);
  };
}
