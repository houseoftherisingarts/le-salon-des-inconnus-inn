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
/** Une tuile couvre 0.9 pas : deux voisines ne se touchent pas, et à
 *  0.82 elles se lisaient comme des pions plats sur les captures. */
export const ECHELLE_TUILE = (0.9 * PAS) / TUILE_GLB_DIAMETRE;
/** Le relief sculpté est accentué en hauteur pour se lire de loin. */
export const RELIEF_TUILE = 1.35;
/** Hauteur GLB minimale d'une tuile (disque et relief) : W3 fait 0.44, le
 *  rhododendron 0.355 et le lotus 0.338 étaient des galettes à côté des autres
 *  (mesure du 2026-10-05); scene.ts étire en y ce qui est plus mince. */
export const TUILE_GLB_HAUTEUR_MIN = 0.44;
/** Le plateau GLB : diamètre 1.902 et hauteur 0.412 en unités du modèle
 *  (Box3, y de -0.205 à +0.206). Le dessus a été mesuré le 2026-10-02 par
 *  des rayons lancés vers le bas, tous les 0.005 de rayon et sur huit
 *  angles : il est plat entre y = 0.1693 et y = 0.1716 jusqu'au rayon
 *  0.860, puis la bordure monte d'un coup à 0.190 dès 0.865 (crête à
 *  0.204 vers 0.90). Le disque peint se pose juste au-dessus du point
 *  plat le plus haut et s'arrête au pied de la bordure. */
export const PLATEAU_GLB_DIAMETRE = 1.902;
export const PLATEAU_GLB_BAS = -0.205;
const PLATEAU_GLB_DESSUS = 0.172;
const PLATEAU_GLB_RAYON_PLAT = 0.862;
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
