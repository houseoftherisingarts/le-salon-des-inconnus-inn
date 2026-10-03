// ─── Le décor : la salle, la table, la lumière ──────────────────────

import * as THREE from 'three';
import type { IdDecor } from '../skins';
import { ombreDeContact } from './bois';
import { BASE, RAYON_FACE, Y_PLANCHER } from './mesures';

type Jetable = { dispose(): void };

// Chaque salle a sa lumière : la taverne reste dans l'ombre des torches,
// le salon de thé s'ouvre au jour, beige pâle, bambou et tatami.
const AMBIANCES: Record<IdDecor, {
  fond: number; salle: number; dessus: number; chant: number; eclat: number;
  ambiante: [number, number]; cielSol: [number, number, number];
  lanterne: [number, number]; torches: [number, number, number]; froide: number;
}> = {
  taverne: {
    fond: 0x0d0805, salle: 0x8a7562, dessus: 0xb8977a, chant: 0x3a2414, eclat: 0x000000,
    ambiante: [0xffd2a0, 0.35], cielSol: [0xffc98a, 0x1a0d07, 0.7],
    lanterne: [0xffc488, 1400], torches: [0xff7a2a, 500, 400], froide: 120,
  },
  the: {
    fond: 0xe6d8bc, salle: 0xffffff, dessus: 0xffffff, chant: 0xb08a58, eclat: 0x7a6038,
    ambiante: [0xfff3df, 0.95], cielSol: [0xfff7ea, 0xcbb690, 1.25],
    lanterne: [0xfff0d6, 1100], torches: [0xffe0b0, 110, 90], froide: 40,
  },
};

/** Un tatami de paille tressée, bordé de noir sur ses deux longs côtés. */
function tatami(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d9c79a';
  g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = y % 4 ? 'rgba(120, 98, 52, 0.16)' : 'rgba(255, 246, 214, 0.2)';
    g.fillRect(0, y, 256, 1);
  }
  g.fillStyle = '#2b241a';
  g.fillRect(0, 0, 256, 5);
  g.fillRect(0, 123, 256, 5);
  g.fillStyle = 'rgba(90, 72, 40, 0.55)';
  g.fillRect(0, 0, 2, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 20);
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
  const matSol = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 1 });
  const paille = tatami();
  const matTatami = new THREE.MeshStandardMaterial({ map: paille, roughness: 0.95 });
  const sol = new THREE.Mesh(geoSol, matSol);
  sol.position.y = Y_PLANCHER;
  sol.receiveShadow = true;
  scene.add(sol);

  // La table, ses quatre pieds dans l'ombre et l'ombre de contact du plateau.
  const carte = texture(`${BASE}textures/table-bois.webp`);
  carte.wrapS = carte.wrapT = THREE.RepeatWrapping;
  carte.repeat.set(2, 1.6);
  const geoTable = new THREE.BoxGeometry(40, 1.6, 34);
  const matDessus = new THREE.MeshStandardMaterial({ map: carte, emissiveMap: carte, roughness: 0.62, metalness: 0.02, color: 0xb8977a });
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
  aJeter.push(geoSalle, matSalle, geoSol, matSol, paille, matTatami, geoTable, matDessus, matChant, geoPied, ombre, geoOmbre, matOmbre);

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
      scene.fog.near = d === 'the' ? 130 : 70;
      scene.fog.far = d === 'the' ? 260 : 150;
    }
    matSalle.color.setHex(a.salle);
    matDessus.color.setHex(a.dessus);
    matChant.color.setHex(a.chant);
    matDessus.emissive.setHex(a.eclat);
    sol.material = d === 'the' ? matTatami : matSol;
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
