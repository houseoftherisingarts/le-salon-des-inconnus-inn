// ─── Le convive d'en face : l'adversaire choisi ─────────────────────
// Le Pai Sho se joue à deux (Alex, 3 octobre) : une seule personne
// s'assoit en face du plateau, le personnage choisi. Les gens de la
// taverne sont partis le 4 octobre; sans personnage, la chaise reste vide.

import { adversaire, figurinesDessin } from '../jeu/adversaires';
import * as THREE from 'three';
import { chargerSculpture } from './sculpture';
import { BASE, HAUT_CONVIVE, Y_PLANCHER } from './mesures';
import type { Camp } from '../jeu/logic';

export class Convives {
  readonly groupe = new THREE.Group();
  private cote: Camp = 'hote';
  private idAdversaire: string | null = null;

  charger(_gestionnaire: THREE.LoadingManager): void {
    // Le personnage gardé au menu s'assoit dès l'ouverture (Iroh sinon).
    let choisi = 'iroh';
    try { choisi = localStorage.getItem('paisho.adversaire') ?? 'iroh'; } catch { /* privé */ }
    this.adversaire(adversaire(choisi) ? choisi : 'iroh');
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

  /** Le personnage `id` (fichier models/convives/<id>.glb) s'assoit en face; `null` vide la chaise. */
  adversaire(id: string | null): void {
    if (id === this.idAdversaire) return;
    this.idAdversaire = id;
    const ancien = this.groupe.children.find((g) => g.userData.perso);
    if (ancien) this.groupe.remove(ancien);
    if (!id) return;
    // Le style choisi d'abord, l'autre jeu de statuettes si le fichier manque.
    const [un, deux] = figurinesDessin() ? [`${id}2`, id] : [id, `${id}2`];
    chargerSculpture(`${BASE}models/convives/${un}.glb?v=${__BUILD__}`, HAUT_CONVIVE)
      .catch(() => chargerSculpture(`${BASE}models/convives/${deux}.glb?v=${__BUILD__}`, HAUT_CONVIVE))
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
      .catch(() => { /* la chaise reste vide */ });
  }
}
