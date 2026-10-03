// ─── L'habillage : le plateau et les matières du skin choisi ───────
// Le disque peint, le cadre sculpté et les matières des tuiles changent
// avec le skin ; la géométrie, elle, ne change jamais. La scène garde
// ses tuiles et demande ici la matière de chacune.

import * as THREE from 'three';
import { peindreFacePlateau } from './plateauTexture';
import { TEINTES_CADRE, TEINTES_TUILES, anisotropieTournee, environnement, teinter } from './matieres';
import {
  BASE, ECHELLE_PLATEAU, PAS, PLATEAU_GLB_BAS, RAYON_FACE, Y_FACE, chargerGLB,
} from './mesures';
import type { Marques } from './marques';
import type { Camp } from '../jeu/logic';
import type { IdPlateau, Skin } from '../skins';

/** Les logos en marqueterie, chargés une seule fois. */
const logos = new Map<IdPlateau, Promise<HTMLImageElement | null>>();
export function logoDe(p: IdPlateau): Promise<HTMLImageElement | null> {
  if (p === 'bois') return Promise.resolve(null);
  let l = logos.get(p);
  if (!l) {
    l = new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = `${BASE}marques/${p}.png`;
    });
    logos.set(p, l);
  }
  return l;
}

/** La matière GLB d'origine de chaque maille du cadre. */
const bases = new WeakMap<THREE.Object3D, THREE.MeshStandardMaterial>();

const libere = (m: THREE.Material | THREE.Material[]) => (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());

export class Habillage {
  skin: Skin;
  private disque: THREE.Mesh;
  private cadre: THREE.Object3D | null = null;
  private env: THREE.Texture | null = null;
  private aniso: THREE.DataTexture | null = null;
  private textures: THREE.Texture[] = [];
  private matsCadre: THREE.Material[] = [];
  private matsTuiles = new Map<string, THREE.Material>();
  private ancienTuiles: THREE.Material[] = [];
  private jeton = 0;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private racine: THREE.Group,
    private gestionnaire: THREE.LoadingManager,
    private marques: Marques,
    skin: Skin,
  ) {
    this.skin = skin;
    const geo = new THREE.CircleGeometry(RAYON_FACE, 128).rotateX(-Math.PI / 2);
    this.disque = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
    this.disque.position.y = Y_FACE;
    this.disque.receiveShadow = true;
    racine.add(this.disque);
  }

  private reflets(): THREE.Texture {
    return (this.env ??= environnement(this.renderer));
  }

  /** Le disque peint et le cadre sculpté, avec le skin du moment. */
  async batir(): Promise<void> {
    const peint = this.peindre();
    try {
      const cadre = await chargerGLB(`${BASE}models/plateau.glb`, this.gestionnaire);
      cadre.scale.setScalar(ECHELLE_PLATEAU);
      cadre.position.y = -PLATEAU_GLB_BAS * ECHELLE_PLATEAU;
      cadre.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        bases.set(m, m.material as THREE.MeshStandardMaterial);
      });
      this.racine.add(cadre);
      this.cadre = cadre;
      this.teindreCadre();
    } catch {
      // Sans le cadre sculpté, le disque peint reste seul sur la table.
    }
    await peint;
  }

  /** Change le skin. Rend vrai si les tuiles doivent changer de matière. */
  appliquer(s: Skin): boolean {
    const avant = this.skin;
    this.skin = s;
    if (s.plateau !== avant.plateau) { void this.peindre(); this.teindreCadre(); }
    if (s.tuiles === avant.tuiles) return false;
    this.ancienTuiles.push(...this.matsTuiles.values());
    this.matsTuiles.clear();
    return true;
  }

  /** Les anciennes matières de tuiles, une fois que plus rien ne les porte. */
  oublierAnciennes(): void {
    for (const m of this.ancienTuiles) m.dispose();
    this.ancienTuiles = [];
  }

  /** La matière d'une tuile pour le skin du moment. `base` est la
   *  matière du bois, déjà teinte en noyer pour l'invité ; le skin n'en
   *  garde que les cartes, jamais la couleur. */
  matiereTuile(base: THREE.MeshStandardMaterial, camp: Camp): THREE.Material {
    const id = this.skin.tuiles;
    if (id === 'bois') return base;
    let m = this.matsTuiles.get(base.uuid);
    if (!m) {
      m = teinter(base, TEINTES_TUILES[id][camp], this.reflets());
      this.matsTuiles.set(base.uuid, m);
    }
    return m;
  }

  private teindreCadre(): void {
    if (!this.cadre) return;
    const id = this.skin.plateau;
    const neufs: THREE.Material[] = [];
    this.cadre.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const base = bases.get(m)!;
      if (id === 'bois') { m.material = base; return; }
      const t = teinter(base, TEINTES_CADRE[id], this.reflets());
      m.material = t;
      neufs.push(t);
    });
    for (const x of this.matsCadre) x.dispose();
    this.matsCadre = neufs;
  }

  private async peindre(): Promise<void> {
    const n = ++this.jeton;
    const id = this.skin.plateau;
    const logo = await logoDe(id);
    if (n !== this.jeton) return;
    const face = peindreFacePlateau(RAYON_FACE, PAS, id, logo);
    let mat: THREE.Material;
    if (id === 'vexel') {
      this.aniso ??= anisotropieTournee();
      mat = new THREE.MeshPhysicalMaterial({
        map: face.carte, normalMap: face.normales, normalScale: new THREE.Vector2(0.7, 0.7),
        roughnessMap: face.rugosite, roughness: 1, metalness: 0.88,
        envMap: this.reflets(), envMapIntensity: 0.38,
        anisotropy: 0.55, anisotropyMap: this.aniso,
      });
    } else {
      // Le bois est verni (Alex, 3 octobre) : une couche claire brillante
      // par-dessus le grain, qui attrape les lanternes sans blanchir le bois.
      mat = new THREE.MeshPhysicalMaterial({
        map: face.carte, normalMap: face.normales, normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: id === 'salon' ? 0.5 : 0.55, metalness: 0,
        clearcoat: 1, clearcoatRoughness: 0.12,
        envMap: this.reflets(), envMapIntensity: 0.55,
      });
    }
    libere(this.disque.material);
    for (const t of this.textures) t.dispose();
    this.textures = [face.carte, face.normales, ...(face.rugosite ? [face.rugosite] : [])];
    this.disque.material = mat;
    this.marques.adapterAuFond(false);
  }

  detruire(): void {
    libere(this.disque.material);
    this.disque.geometry.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of [...this.matsCadre, ...this.matsTuiles.values(), ...this.ancienTuiles]) m.dispose();
    this.env?.dispose();
    this.aniso?.dispose();
  }
}
