// ─── Le décor : la salle, la table, la lumière ──────────────────────

import * as THREE from 'three';
import { ombreDeContact } from './bois';
import { BASE, RAYON_FACE, Y_PLANCHER } from './mesures';

type Jetable = { dispose(): void };

export function batirDecor(
  scene: THREE.Scene, racine: THREE.Group, gestionnaire: THREE.LoadingManager, aJeter: Jetable[],
): void {
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
    map: texture(`${BASE}scenes/taverne-salle.jpg`, 3),
    side: THREE.BackSide, fog: false, depthWrite: false, color: 0x8a7562,
  });
  const salle = new THREE.Mesh(geoSalle, matSalle);
  salle.position.y = Y_PLANCHER + 34;
  salle.renderOrder = -1;
  scene.add(salle);
  const geoSol = new THREE.CircleGeometry(95, 64).rotateX(-Math.PI / 2);
  const matSol = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 1 });
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
  aJeter.push(geoSalle, matSalle, geoSol, matSol, geoTable, matDessus, matChant, geoPied, ombre, geoOmbre, matOmbre);

  // La lumière : une lanterne au-dessus de la table porte les ombres
  // douces, deux torches aux murs et une lueur froide détachent les volumes.
  scene.add(new THREE.AmbientLight(0xffd2a0, 0.35));
  scene.add(new THREE.HemisphereLight(0xffc98a, 0x1a0d07, 0.7));
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
}
