// ─── Le convive d'en face : la dame, ou l'adversaire choisi ───────────
// Le Pai Sho se joue à deux (Alex, 3 octobre) : une seule personne
// s'assoit en face du plateau. La dame par défaut; quand le joueur choisit
// un personnage, celui-ci prend sa place et la dame s'efface.

import * as THREE from 'three';
import { chargerSculpture } from './sculpture';
import { BASE, HAUT_CONVIVE, Y_PLANCHER } from './mesures';
import type { Camp } from '../jeu/logic';

export class Convives {
  readonly groupe = new THREE.Group();
  private cote: Camp = 'hote';
  private idAdversaire: string | null = null;

  charger(gestionnaire: THREE.LoadingManager): void {
    ['dame'].forEach((nom, i) => {
      chargerSculpture(`${BASE}models/convives/${nom}.glb`, HAUT_CONVIVE, gestionnaire)
        .then((g) => {
          g.userData.rang = i;
          g.visible = !(i === 0 && this.idAdversaire);
          this.groupe.add(g);
          this.placer(this.cote);
        })
        .catch(() => { /* la partie se joue aussi sans spectateurs */ });
    });
  }

  /** Les spectateurs s'assoient en face du joueur `camp`. */
  placer(camp: Camp): void {
    this.cote = camp;
    const base = camp === 'hote' ? Math.PI : 0;
    const angles = [0, 0.62, -0.62];
    for (const g of this.groupe.children) {
      const a = base + angles[g.userData.rang as number];
      const r = 22;
      g.position.set(Math.sin(a) * r, Y_PLANCHER, Math.cos(a) * r);
      g.lookAt(0, Y_PLANCHER, 0);
    }
  }

  /** Le personnage `id` (fichier models/convives/<id>.glb) s'assoit en face; `null` rend sa place à la dame. */
  adversaire(id: string | null): void {
    if (id === this.idAdversaire) return;
    this.idAdversaire = id;
    const ancien = this.groupe.children.find((g) => g.userData.perso);
    if (ancien) this.groupe.remove(ancien);
    const dame = this.groupe.children.find((g) => g.userData.rang === 0);
    if (dame) dame.visible = !id;
    if (!id) return;
    chargerSculpture(`${BASE}models/convives/${id}.glb`, HAUT_CONVIVE)
      .then((g) => {
        if (this.idAdversaire !== id) return;
        g.userData.rang = 0;
        g.userData.perso = id;
        // Meshy pose une carte métal qui noircit les figurines : mat partout.
        g.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m?.isMeshStandardMaterial) { m.metalness = 0; m.roughness = 0.72; m.metalnessMap = null; m.roughnessMap = null; m.needsUpdate = true; }
        });
        this.groupe.add(g);
        this.placer(this.cote);
      })
      .catch(() => { if (dame) dame.visible = true; });
  }
}
