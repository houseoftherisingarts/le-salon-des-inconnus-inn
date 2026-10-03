// ─── Les marques sur le treillis ────────────────────────────────────
// Les cibles légales en vert, l'anneau d'or de la tuile choisie, les
// halos de survol et de refus, et les fils d'or des harmonies.

import * as THREE from 'three';
import { OR, PAS, Y_FACE, versMonde } from './mesures';
import type { Pt } from '../jeu/plateau';
import type { Camp, Harmonie } from '../jeu/logic';

const MAX_CIBLES = 260;
/** L'or presque blanc du cœur d'un fil, et son pendant bruni pour les plateaux pâles. */
const COEUR = 0xfff0b8;
const COEUR_BRUNI = 0x7a5200;

export class Marques {
  readonly groupe = new THREE.Group();
  cibles = new Set<Pt>();
  selection: Pt | null = null;

  private ciblesMesh: THREE.InstancedMesh;
  private anneau: THREE.Mesh;
  private refus: THREE.Mesh;
  private survol: THREE.Mesh;
  /** Les suggestions : un anneau d'or fin sur chaque tuile ou case qui peut former une harmonie. */
  private suggestionsMesh: THREE.InstancedMesh;
  private fils = new THREE.Group();
  private geoFil = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  // Un fil d'harmonie se dessine en deux couches : un halo large et doux,
  // puis un cœur fin et clair, avec une perle de lumière à chaque bout.
  private matFil = new THREE.MeshBasicMaterial({
    color: OR, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  private matFilGagnant = this.matFil.clone();
  private matCoeur = new THREE.MeshBasicMaterial({
    color: COEUR, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  private geoPerle = new THREE.SphereGeometry(1, 16, 12);
  /** Les halos pleins sous les anneaux, allumés pendant la leçon seulement. */
  private halosMesh: THREE.InstancedMesh;
  private suggeres: Pt[] = [];
  private fort = false;
  private aJeter: { dispose(): void }[];
  private aJeterPlus: { dispose(): void }[] = [];

  constructor() {
    const geoDisque = new THREE.CircleGeometry(0.3 * PAS, 32).rotateX(-Math.PI / 2);
    const matCible = new THREE.MeshBasicMaterial({ color: 0x6fe39a, transparent: true, opacity: 0.55, depthWrite: false });
    this.ciblesMesh = new THREE.InstancedMesh(geoDisque, matCible, MAX_CIBLES);
    this.ciblesMesh.count = 0;
    this.ciblesMesh.renderOrder = 2;
    this.ciblesMesh.frustumCulled = false;

    const geoAnneau = new THREE.RingGeometry(0.44 * PAS, 0.56 * PAS, 48).rotateX(-Math.PI / 2);
    const mat = (color: number, opacity: number, additif = false) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
      blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.anneau = new THREE.Mesh(geoAnneau, mat(OR, 0.95, true));
    this.refus = new THREE.Mesh(geoAnneau, mat(0xd8382a, 0.85));
    this.survol = new THREE.Mesh(geoAnneau, mat(0x9cf5bd, 0.9));
    for (const m of [this.anneau, this.refus, this.survol]) { m.visible = false; m.renderOrder = 3; }
    const geoSuggestion = new THREE.RingGeometry(0.5 * PAS, 0.64 * PAS, 48).rotateX(-Math.PI / 2);
    this.suggestionsMesh = new THREE.InstancedMesh(geoSuggestion, mat(OR, 0.9, true), MAX_CIBLES);
    this.suggestionsMesh.count = 0;
    this.suggestionsMesh.renderOrder = 2;
    this.suggestionsMesh.frustumCulled = false;
    const geoHalo = new THREE.CircleGeometry(0.86 * PAS, 40).rotateX(-Math.PI / 2);
    this.halosMesh = new THREE.InstancedMesh(geoHalo, mat(OR, 0.3, true), MAX_CIBLES);
    this.halosMesh.count = 0;
    this.halosMesh.renderOrder = 2;
    this.halosMesh.frustumCulled = false;
    this.groupe.add(this.halosMesh);
    this.aJeterPlus = [geoHalo, this.halosMesh.material as THREE.Material];
    this.groupe.add(this.ciblesMesh, this.suggestionsMesh, this.anneau, this.refus, this.survol, this.fils);
    this.aJeter = [geoDisque, matCible, geoAnneau, geoSuggestion, this.suggestionsMesh.material as THREE.Material,
      this.geoFil, this.matFil, this.matFilGagnant, this.matCoeur, this.geoPerle,
      this.anneau.material as THREE.Material, this.refus.material as THREE.Material,
      this.survol.material as THREE.Material];
  }

  montrer(points: Pt[], selection: Pt | null): void {
    this.cibles = new Set(points);
    this.selection = selection;
    const m = new THREE.Matrix4();
    let n = 0;
    for (const p of this.cibles) {
      if (n >= MAX_CIBLES) break;
      const v = versMonde(p, Y_FACE + 0.012);
      this.ciblesMesh.setMatrixAt(n++, m.makeTranslation(v.x, v.y, v.z));
    }
    this.ciblesMesh.count = n;
    this.ciblesMesh.instanceMatrix.needsUpdate = true;
    this.anneau.visible = selection !== null;
    if (selection !== null) this.anneau.position.copy(versMonde(selection, Y_FACE + 0.02));
    this.refus.visible = this.survol.visible = false;
  }

  /**
   * Les anneaux de suggestion, sur les tuiles qui peuvent former une harmonie
   * ou sur leurs cases d'arrivée. `fort` (la leçon) ajoute un halo plein sous
   * chaque anneau et le fait battre, pour que le coup attendu saute aux yeux.
   */
  suggerer(points: Pt[], fort = false): void {
    this.suggeres = [...new Set(points)].slice(0, MAX_CIBLES);
    this.fort = fort;
    this.poserSuggestions(1);
  }

  private poserSuggestions(echelle: number): void {
    const m = new THREE.Matrix4();
    const taille = new THREE.Vector3(echelle, 1, echelle);
    const droit = new THREE.Quaternion();
    this.suggeres.forEach((p, i) => {
      this.suggestionsMesh.setMatrixAt(i, m.compose(versMonde(p, Y_FACE + 0.016), droit, taille));
      if (this.fort) this.halosMesh.setMatrixAt(i, m.compose(versMonde(p, Y_FACE + 0.014), droit, taille));
    });
    this.suggestionsMesh.count = this.suggeres.length;
    this.suggestionsMesh.instanceMatrix.needsUpdate = true;
    this.halosMesh.count = this.fort ? this.suggeres.length : 0;
    this.halosMesh.instanceMatrix.needsUpdate = true;
  }

  /** Vert sur une cible, rouge ailleurs quand une tuile est choisie. */
  survoler(p: Pt | null): void {
    this.refus.visible = this.survol.visible = false;
    const actif = this.selection !== null || this.cibles.size > 0;
    if (p === null || !actif || p === this.selection) return;
    const h = this.cibles.has(p) ? this.survol : this.selection !== null ? this.refus : null;
    if (!h) return;
    h.position.copy(versMonde(p, Y_FACE + 0.025));
    h.visible = true;
  }

  /** Un fil d'or par harmonie, plus épais sur l'anneau gagnant. */
  poserFils(liste: Harmonie[], gagnant: Camp | null): void {
    for (const f of [...this.fils.children]) f.removeFromParent();
    const haut = new THREE.Vector3(0, 1, 0);
    for (const h of liste) {
      const a = versMonde(h.a, Y_FACE + 0.06);
      const b = versMonde(h.b, Y_FACE + 0.06);
      const g = gagnant === h.camp;
      const sens = new THREE.Quaternion().setFromUnitVectors(haut, b.clone().sub(a).normalize());
      const milieu = a.clone().lerp(b, 0.5);
      const long = a.distanceTo(b);
      const trait = (mat: THREE.Material, ep: number, ordre: number) => {
        const m = new THREE.Mesh(this.geoFil, mat);
        m.scale.set(ep, long, ep);
        m.position.copy(milieu);
        m.quaternion.copy(sens);
        m.renderOrder = ordre;
        this.fils.add(m);
      };
      trait(g ? this.matFilGagnant : this.matFil, g ? 0.11 : 0.06, 1);
      trait(this.matCoeur, g ? 0.03 : 0.016, 2);
      for (const bout of [a, b]) {
        const perle = new THREE.Mesh(this.geoPerle, this.matCoeur);
        perle.scale.setScalar(g ? 0.075 : 0.05);
        perle.position.copy(bout);
        perle.renderOrder = 2;
        this.fils.add(perle);
      }
    }
  }

  /**
   * Sur un plateau pâle, l'or additif se perd dans le bois clair : les
   * fils et l'anneau passent alors en or bruni, posé sans addition, et
   * les cibles prennent un vert plus profond.
   */
  adapterAuFond(clair: boolean): void {
    const ors = [this.matFil, this.matFilGagnant, this.anneau.material as THREE.MeshBasicMaterial,
      this.suggestionsMesh.material as THREE.MeshBasicMaterial, this.halosMesh.material as THREE.MeshBasicMaterial];
    this.matCoeur.color.setHex(clair ? COEUR_BRUNI : COEUR);
    this.matCoeur.blending = clair ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.matCoeur.needsUpdate = true;
    for (const m of ors) {
      m.color.setHex(clair ? 0xa8740a : OR);
      m.blending = clair ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.needsUpdate = true;
    }
    (this.ciblesMesh.material as THREE.MeshBasicMaterial).color.setHex(clair ? 0x23874c : 0x6fe39a);
    (this.survol.material as THREE.MeshBasicMaterial).color.setHex(clair ? 0x23874c : 0x9cf5bd);
  }

  /** Le souffle des fils et de l'anneau, à chaque trame. */
  animer(t: number): void {
    this.matFil.opacity = 0.3 + 0.12 * Math.sin(t * 2.2);
    this.matFilGagnant.opacity = 0.45 + 0.25 * Math.sin(t * 5);
    this.matCoeur.opacity = 0.85 + 0.15 * Math.sin(t * 2.2);
    (this.anneau.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 4);
    (this.suggestionsMesh.material as THREE.MeshBasicMaterial).opacity = this.fort ? 1 : 0.7 + 0.3 * Math.sin(t * 2.6);
    if (this.fort && this.suggeres.length) {
      const souffle = Math.sin(t * 3.4);
      (this.halosMesh.material as THREE.MeshBasicMaterial).opacity = 0.34 + 0.2 * souffle;
      this.poserSuggestions(1.12 + 0.14 * souffle);
    }
  }

  detruire(): void { for (const x of [...this.aJeter, ...this.aJeterPlus]) x.dispose(); }
}
