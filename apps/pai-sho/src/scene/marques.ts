// ─── Les marques sur le treillis ────────────────────────────────────
// Les cibles légales en vert, l'anneau d'or de la tuile choisie, les
// halos de survol et de refus, et les fils d'or des harmonies.

import * as THREE from 'three';
import { OR, PAS, Y_FACE, versMonde } from './mesures';
import type { Pt } from '../jeu/plateau';
import type { Camp, Harmonie } from '../jeu/logic';

const MAX_CIBLES = 260;

export class Marques {
  readonly groupe = new THREE.Group();
  cibles = new Set<Pt>();
  selection: Pt | null = null;

  private ciblesMesh: THREE.InstancedMesh;
  private anneau: THREE.Mesh;
  private refus: THREE.Mesh;
  private survol: THREE.Mesh;
  private fils = new THREE.Group();
  private geoFil = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  private matFil = new THREE.MeshBasicMaterial({
    color: OR, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  private matFilGagnant = this.matFil.clone();
  private aJeter: { dispose(): void }[];

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
    this.groupe.add(this.ciblesMesh, this.anneau, this.refus, this.survol, this.fils);
    this.aJeter = [geoDisque, matCible, geoAnneau, this.geoFil, this.matFil, this.matFilGagnant,
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
      const m = new THREE.Mesh(this.geoFil, g ? this.matFilGagnant : this.matFil);
      const ep = g ? 0.09 : 0.035;
      m.scale.set(ep, a.distanceTo(b), ep);
      m.position.copy(a).lerp(b, 0.5);
      m.quaternion.setFromUnitVectors(haut, b.clone().sub(a).normalize());
      m.renderOrder = 1;
      this.fils.add(m);
    }
  }

  /** Le souffle des fils et de l'anneau, à chaque trame. */
  animer(t: number): void {
    this.matFil.opacity = 0.62 + 0.25 * Math.sin(t * 2.2);
    this.matFilGagnant.opacity = 0.7 + 0.3 * Math.sin(t * 5);
    (this.anneau.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 4);
  }

  detruire(): void { for (const x of this.aJeter) x.dispose(); }
}
