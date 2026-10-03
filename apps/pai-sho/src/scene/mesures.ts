// ─── Les mesures de la scène ────────────────────────────────────────
// Repère : un pas de treillis vaut PAS, le point (x, y) du plateau est
// en (x * PAS, dessus, -y * PAS). L'hôte est assis au sud (+z) et
// regarde vers la porte du nord. Le dessus de la table est en y = 0.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { decodeurDraco } from './sculpture';
import { coordX, coordY, type Pt } from '../jeu/plateau';

export const BASE = import.meta.env.BASE_URL;

/** L'écart entre deux lignes du treillis. Tout le reste en découle. */
export const PAS = 1;
/** Diamètre des tuiles GLB livrées par Meshy, mesuré sur leur Box3 :
 *  x et z vont de -0.951 à +0.951 sur les douze modèles (2026-10-02).
 *  Les modèles sont déjà couchés dans le plan XZ (l'épaisseur, de 0.34
 *  à 0.74, est en y) : aucune rotation n'est nécessaire. */
const TUILE_GLB_DIAMETRE = 1.902;
/** Une tuile couvre 0.82 pas : deux voisines ne se touchent pas. */
export const ECHELLE_TUILE = (0.82 * PAS) / TUILE_GLB_DIAMETRE;
/** Le plateau GLB : diamètre 1.902 et hauteur 0.412 en unités du modèle
 *  (Box3, y de -0.205 à +0.206). Le dessus plat a été mesuré au rayon
 *  lancé vers le bas : il est à y = PLATEAU_GLB_DESSUS, plat jusqu'au
 *  rayon PLATEAU_GLB_RAYON_PLAT, où commence la bordure de noyer. */
export const PLATEAU_GLB_DIAMETRE = 1.902;
export const PLATEAU_GLB_BAS = -0.205;
const PLATEAU_GLB_DESSUS = 0.2;
const PLATEAU_GLB_RAYON_PLAT = 0.86;
/** Le rayon du disque peint posé sur le dessus. Le point le plus loin
 *  du centre, (8,4), est à 8.94 pas : le disque garde une marge pour la
 *  tuile qui s'y pose. */
export const RAYON_FACE = 9.75 * PAS;
export const ECHELLE_PLATEAU = RAYON_FACE / PLATEAU_GLB_RAYON_PLAT;
/** Hauteur du dessus du plateau au-dessus de la table (calculée des mesures). */
export const DESSUS = (PLATEAU_GLB_DESSUS - PLATEAU_GLB_BAS) * ECHELLE_PLATEAU;
export const Y_FACE = DESSUS + 0.001;
/** Les convives : hauteur assise et position du plancher sous la table. */
export const HAUT_CONVIVE = 26;
export const Y_PLANCHER = -14;
export const FOV = 38;
/** Le demi-encombrement à cadrer : le treillis fait 16 pas, la bordure
 *  du plateau ajoute le reste. */
export const DEMI_CADRE = (PLATEAU_GLB_DIAMETRE / 2) * ECHELLE_PLATEAU;

export const COULEUR_INVITE = new THREE.Color(0x7a5230);
export const OR = 0xd4af37;

export const versMonde = (p: Pt, y = Y_FACE): THREE.Vector3 =>
  new THREE.Vector3(coordX(p) * PAS, y, -coordY(p) * PAS);

export interface Cadre { gauche: number; droite: number; haut: number; bas: number }

export function chargerGLB(url: string, gestionnaire: THREE.LoadingManager): Promise<THREE.Group> {
  const l = new GLTFLoader(gestionnaire);
  l.setDRACOLoader(decodeurDraco());
  return new Promise((ok, ko) => l.load(url, (g) => ok(g.scene), undefined, ko));
}
