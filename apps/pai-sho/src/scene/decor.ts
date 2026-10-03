// ─── Le décor : la salle, la table, la lumière ──────────────────────

import * as THREE from 'three';
import type { IdDecor } from '../skins';
import { ombreDeContact } from './bois';
import { BASE, RAYON_FACE, Y_PLANCHER } from './mesures';
import { batirSalles } from './salle';

type Jetable = { dispose(): void };

// Chaque salle a sa lumière : la taverne reste dans l'ombre des torches,
// le salon de thé garde sa pénombre, et le jardin de thé s'ouvre au jour,
// beige pâle, bambou et tatami.
const AMBIANCES: Record<IdDecor, {
  fond: number; dessus: number; chant: number;
  ambiante: [number, number]; cielSol: [number, number, number];
  lanterne: [number, number]; torches: [number, number, number]; froide: number;
}> = {
  taverne: {
    fond: 0x0d0805, dessus: 0xb8977a, chant: 0x3a2414,
    ambiante: [0xffd2a0, 0.6], cielSol: [0xffc98a, 0x2a160c, 1.05],
    lanterne: [0xffc488, 1500], torches: [0xff8a3a, 900, 700], froide: 160,
  },
  the: {
    fond: 0x0d0805, dessus: 0xb8977a, chant: 0x3a2414,
    ambiante: [0xffd2a0, 0.6], cielSol: [0xffc98a, 0x2a160c, 1.05],
    lanterne: [0xffc488, 1500], torches: [0xff8a3a, 900, 700], froide: 160,
  },
  jardin: {
    fond: 0xe6d8bc, dessus: 0xffffff, chant: 0xc9a56c,
    ambiante: [0xfff3df, 0.95], cielSol: [0xfff7ea, 0xcbb690, 1.25],
    lanterne: [0xfff0d6, 1100], torches: [0xffe0b0, 110, 90], froide: 40,
  },
  sakura: {
    fond: 0xa9d8fd, dessus: 0xffffff, chant: 0xc9a56c,
    ambiante: [0xfff3ea, 1], cielSol: [0xeaf4ff, 0x9cc070, 1.3],
    lanterne: [0xfff4e0, 1100], torches: [0xffe0c0, 110, 90], froide: 40,
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

  // La salle : quatre murs, un plafond, un sol et des meubles (salle.ts).
  const montrerSalle = batirSalles(scene, gestionnaire, aJeter);

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
  aJeter.push(blond, geoTable, matDessus, matChant, geoPied, ombre, geoOmbre, matOmbre);

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
    const jour = d === 'jardin' || d === 'sakura';
    scene.background = new THREE.Color(a.fond);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.setHex(a.fond);
      // Au grand jour, la brume recule pour ne pas voiler la table.
      scene.fog.near = jour ? 130 : 70;
      scene.fog.far = jour ? 260 : 150;
    }
    matDessus.color.setHex(a.dessus);
    matChant.color.setHex(a.chant);
    matDessus.map = jour ? blond : carte;
    matDessus.needsUpdate = true;
    montrerSalle(d);
    ambiante.color.setHex(a.ambiante[0]); ambiante.intensity = a.ambiante[1];
    cielSol.color.setHex(a.cielSol[0]); cielSol.groundColor.setHex(a.cielSol[1]); cielSol.intensity = a.cielSol[2];
    lanterne.color.setHex(a.lanterne[0]); lanterne.intensity = a.lanterne[1];
    torcheA.color.setHex(a.torches[0]); torcheB.color.setHex(a.torches[0]);
    torcheA.intensity = a.torches[1]; torcheB.intensity = a.torches[2];
    froide.intensity = a.froide;
  };
  ambiance(decor);

  let salleActuelle = decor;
  return (d: IdDecor) => {
    if (d === salleActuelle) return;
    salleActuelle = d;
    ambiance(d);
  };
}
