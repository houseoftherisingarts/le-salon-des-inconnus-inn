// ─── La scène : la taverne, la table, le plateau, les tuiles ────────
// Une seule classe tient tout ce qui se dessine. La page lui donne un
// état de partie et des cibles à montrer, elle lui rend des clics sur
// des points du plateau. Rien ici ne connaît les règles au-delà de la
// lecture d'un état : c'est l'arbitre qui décide, la scène montre.
//
// Repère : un pas de treillis vaut PAS, le point (x, y) du plateau est
// en (x * PAS, dessus, -y * PAS). L'hôte est assis au sud (+z) et
// regarde vers la porte du nord.

import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { decodeurDraco, chargerSculpture } from './sculpture';
import { peindreFacePlateau } from './plateauTexture';
import { ombreDeContact } from './bois';
import { coordX, coordY, estJouable, indice, type Pt } from '../jeu/plateau';
import {
  TYPES, harmonies, tuileEn, type Camp, type Coup, type EtatPaiSho, type Harmonie, type TypeTuile,
} from '../jeu/logic';

const BASE = import.meta.env.BASE_URL;

// ── Les constantes mesurées ─────────────────────────────────────────
/** L'écart entre deux lignes du treillis. Tout le reste en découle. */
export const PAS = 1;
/** Diamètre des tuiles GLB livrées par Meshy, mesuré sur leur Box3 :
 *  x et z vont de -0.951 à +0.951 sur les douze modèles (2026-10-02).
 *  Les modèles sont déjà couchés dans le plan XZ, l'épaisseur est en y. */
const TUILE_GLB_DIAMETRE = 1.902;
/** Une tuile couvre 0.82 pas : deux voisines ne se touchent pas. */
const ECHELLE_TUILE = (0.82 * PAS) / TUILE_GLB_DIAMETRE;
/** Le plateau GLB : diamètre 1.902 et hauteur 0.412 en unités du modèle
 *  (Box3, y de -0.205 à +0.206). Le dessus plat a été mesuré au rayon
 *  lancé vers le bas : il est à y = PLATEAU_GLB_DESSUS, plat jusqu'au
 *  rayon PLATEAU_GLB_RAYON_PLAT, où commence la bordure de noyer. */
const PLATEAU_GLB_DIAMETRE = 1.902;
const PLATEAU_GLB_BAS = -0.205;
const PLATEAU_GLB_DESSUS = 0.2;
const PLATEAU_GLB_RAYON_PLAT = 0.86;
/** Le rayon du disque peint posé sur le dessus. Le point le plus loin
 *  du centre, (8,4), est à 8.94 pas : le disque garde une marge pour la
 *  tuile qui s'y pose. */
export const RAYON_FACE = 9.75 * PAS;
const ECHELLE_PLATEAU = RAYON_FACE / PLATEAU_GLB_RAYON_PLAT;
/** Hauteur du dessus du plateau au-dessus de la table (calculée des mesures). */
export const DESSUS = (PLATEAU_GLB_DESSUS - PLATEAU_GLB_BAS) * ECHELLE_PLATEAU;
const Y_FACE = DESSUS + 0.001;
/** Les convives : hauteur assise et position du plancher sous la table. */
const HAUT_CONVIVE = 26;
const Y_PLANCHER = -14;
const FOV = 38;
/** Le demi-encombrement à cadrer : le treillis fait 16 pas, la bordure
 *  du plateau ajoute le reste. */
const DEMI_CADRE = (PLATEAU_GLB_DIAMETRE / 2) * ECHELLE_PLATEAU;

const COULEUR_INVITE = new THREE.Color(0x7a5230);
const OR = 0xd4af37;

export const versMonde = (p: Pt, y = Y_FACE): THREE.Vector3 =>
  new THREE.Vector3(coordX(p) * PAS, y, -coordY(p) * PAS);

export interface Cadre { gauche: number; droite: number; haut: number; bas: number }

export interface OptionsScene {
  surProgres?: (fraction: number) => void;
}

interface ObjetTuile { obj: THREE.Object3D; type: TypeTuile; camp: Camp }

function chargerGLB(url: string, gestionnaire: THREE.LoadingManager): Promise<THREE.Group> {
  const l = new GLTFLoader(gestionnaire);
  l.setDRACOLoader(decodeurDraco());
  return new Promise((ok, ko) => l.load(url, (g) => ok(g.scene), undefined, ko));
}

export class ScenePaiSho {
  readonly pret: Promise<void>;
  /** Le clic sur un point du plateau, ou null hors du treillis. */
  surClic: (p: Pt | null) => void = () => {};

  private el: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  private gestionnaire = new THREE.LoadingManager();
  private horloge = new THREE.Clock();
  private raf = 0;
  private observateur: ResizeObserver;
  private aJeter: { dispose(): void }[] = [];

  // Caméra sphérique.
  private theta = 0;
  private phi = 0.86;
  private rayon = 30;
  private zoom = 1;
  private cadre: Cadre = { gauche: 0, droite: 0, haut: 0, bas: 0 };
  private derive = false;

  // Le plateau et ses tuiles.
  private racine = new THREE.Group();
  private prototypes = new Map<string, THREE.Object3D>();
  private tuiles = new Map<Pt, ObjetTuile>();
  private reserves = new THREE.Group();
  private fils = new THREE.Group();
  private convives = new THREE.Group();
  private ciblesMesh: THREE.InstancedMesh;
  private ciblesPts = new Set<Pt>();
  private anneauSelection: THREE.Mesh;
  private haloRefus: THREE.Mesh;
  private haloSurvol: THREE.Mesh;
  private matFil: THREE.MeshBasicMaterial;
  private matFilGagnant: THREE.MeshBasicMaterial;
  private geoFil = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  private plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y_FACE);
  private rayCaster = new THREE.Raycaster();
  private selection: Pt | null = null;
  private dernierEtat: EtatPaiSho | null = null;
  private anneauGagnant: Camp | null = null;

  constructor(el: HTMLElement, o: OptionsScene = {}) {
    this.el = el;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    r.domElement.className = 'scene-canevas';
    el.appendChild(r.domElement);
    this.renderer = r;

    this.scene.background = new THREE.Color(0x0d0805);
    this.scene.fog = new THREE.Fog(0x0d0906, 70, 150);
    this.scene.add(this.racine);
    this.racine.add(this.reserves, this.fils, this.convives);

    // Le chargement : la page suit la progression, et rien ne reste
    // bloqué plus de quinze secondes même si un fichier ne répond pas.
    const pret = new Promise<void>((ok) => {
      this.gestionnaire.onProgress = (_u, n, total) => o.surProgres?.(total ? n / total : 1);
      this.gestionnaire.onLoad = () => { o.surProgres?.(1); ok(); };
      this.gestionnaire.onError = () => { /* un fichier manquant garde son remplaçant */ };
      window.setTimeout(ok, 15000);
    });

    this.batirSalle();
    this.batirTable();
    this.batirLumieres();
    const plateauPret = this.batirPlateau();
    const tuilesPretes = this.chargerTuiles();
    this.chargerConvives();

    // Les marques posées sur le treillis.
    const geoDisque = new THREE.CircleGeometry(0.3 * PAS, 32).rotateX(-Math.PI / 2);
    const matCible = new THREE.MeshBasicMaterial({ color: 0x6fe39a, transparent: true, opacity: 0.55, depthWrite: false });
    this.ciblesMesh = new THREE.InstancedMesh(geoDisque, matCible, 260);
    this.ciblesMesh.count = 0;
    this.ciblesMesh.renderOrder = 2;
    this.ciblesMesh.frustumCulled = false;
    this.racine.add(this.ciblesMesh);

    const geoAnneau = new THREE.RingGeometry(0.44 * PAS, 0.56 * PAS, 48).rotateX(-Math.PI / 2);
    this.anneauSelection = new THREE.Mesh(geoAnneau, new THREE.MeshBasicMaterial({
      color: OR, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.haloRefus = new THREE.Mesh(geoAnneau, new THREE.MeshBasicMaterial({
      color: 0xd8382a, transparent: true, opacity: 0.85, depthWrite: false,
    }));
    this.haloSurvol = new THREE.Mesh(geoAnneau, new THREE.MeshBasicMaterial({
      color: 0x9cf5bd, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    for (const m of [this.anneauSelection, this.haloRefus, this.haloSurvol]) {
      m.visible = false; m.renderOrder = 3; this.racine.add(m);
    }
    this.matFil = new THREE.MeshBasicMaterial({
      color: OR, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.matFilGagnant = this.matFil.clone();
    this.aJeter.push(geoDisque, matCible, geoAnneau, this.geoFil, this.matFil, this.matFilGagnant,
      this.anneauSelection.material as THREE.Material, this.haloRefus.material as THREE.Material,
      this.haloSurvol.material as THREE.Material);

    this.pret = Promise.all([pret, plateauPret, tuilesPretes]).then(() => {});

    this.observateur = new ResizeObserver(() => this.redimensionner());
    this.observateur.observe(el);
    this.redimensionner();
    this.brancherGestes();
    this.boucle();
  }

  // ── La salle, la table, la lumière ────────────────────────────────

  private texture(url: string, repeter = 1): THREE.Texture {
    const t = new THREE.TextureLoader(this.gestionnaire).load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeter !== 1) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = repeter; }
    this.aJeter.push(t);
    return t;
  }

  private batirSalle(): void {
    // La taverne enroulée sur un cylindre ouvert vers l'intérieur,
    // assombrie pour que la table reste le sujet.
    const geo = new THREE.CylinderGeometry(95, 95, 80, 64, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture(`${BASE}scenes/taverne-salle.jpg`, 3),
      side: THREE.BackSide, fog: false, depthWrite: false, color: 0x8a7562,
    });
    const salle = new THREE.Mesh(geo, mat);
    salle.position.y = Y_PLANCHER + 34;
    salle.renderOrder = -1;
    this.scene.add(salle);
    const geoSol = new THREE.CircleGeometry(95, 64).rotateX(-Math.PI / 2);
    const matSol = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 1 });
    const sol = new THREE.Mesh(geoSol, matSol);
    sol.position.y = Y_PLANCHER;
    sol.receiveShadow = true;
    this.scene.add(sol);
    this.aJeter.push(geo, mat, geoSol, matSol);
  }

  private batirTable(): void {
    const carte = this.texture(`${BASE}textures/table-bois.webp`);
    carte.wrapS = carte.wrapT = THREE.RepeatWrapping;
    carte.repeat.set(2, 1.6);
    const geo = new THREE.BoxGeometry(40, 1.6, 34);
    const matDessus = new THREE.MeshStandardMaterial({ map: carte, roughness: 0.62, metalness: 0.02, color: 0xb8977a });
    const matChant = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.8 });
    const table = new THREE.Mesh(geo, [matChant, matChant, matDessus, matChant, matChant, matChant]);
    table.position.y = -0.8;
    table.receiveShadow = true;
    this.racine.add(table);
    // Quatre pieds sous la table, dans l'ombre.
    const geoPied = new THREE.BoxGeometry(1.6, -Y_PLANCHER - 1.6, 1.6);
    for (const [x, z] of [[-17, -14], [17, -14], [-17, 14], [17, 14]]) {
      const p = new THREE.Mesh(geoPied, matChant);
      p.position.set(x, (Y_PLANCHER - 1.6) / 2, z);
      this.racine.add(p);
    }
    // L'ombre de contact sous le plateau.
    const ombre = ombreDeContact(256, 0.7);
    const geoOmbre = new THREE.PlaneGeometry(RAYON_FACE * 2.7, RAYON_FACE * 2.7).rotateX(-Math.PI / 2);
    const matOmbre = new THREE.MeshBasicMaterial({ map: ombre, transparent: true, depthWrite: false });
    const o = new THREE.Mesh(geoOmbre, matOmbre);
    o.position.y = 0.01;
    this.racine.add(o);
    this.aJeter.push(geo, matDessus, matChant, geoPied, ombre, geoOmbre, matOmbre);
  }

  private batirLumieres(): void {
    this.scene.add(new THREE.AmbientLight(0xffd2a0, 0.35));
    this.scene.add(new THREE.HemisphereLight(0xffc98a, 0x1a0d07, 0.7));
    // La lanterne au-dessus de la table porte les ombres douces.
    const lanterne = new THREE.SpotLight(0xffc488, 1400, 90, Math.PI / 4.2, 0.6, 2);
    lanterne.position.set(-3, 30, 6);
    lanterne.target.position.set(0, 0, 0);
    lanterne.castShadow = true;
    lanterne.shadow.mapSize.set(2048, 2048);
    lanterne.shadow.bias = -0.0004;
    lanterne.shadow.radius = 4;
    lanterne.shadow.camera.near = 10;
    lanterne.shadow.camera.far = 60;
    this.scene.add(lanterne, lanterne.target);
    // Deux torches aux murs et une lueur froide pour détacher les volumes.
    const torcheA = new THREE.PointLight(0xff7a2a, 500, 70, 2);
    torcheA.position.set(-24, 14, -18);
    const torcheB = new THREE.PointLight(0xff6a1a, 400, 70, 2);
    torcheB.position.set(24, 12, 16);
    const froide = new THREE.PointLight(0x6f86ff, 120, 60, 2);
    froide.position.set(10, 22, -20);
    this.scene.add(torcheA, torcheB, froide);
  }

  // ── Le plateau ────────────────────────────────────────────────────

  private async batirPlateau(): Promise<void> {
    const face = peindreFacePlateau(RAYON_FACE, PAS);
    const geoFace = new THREE.CircleGeometry(RAYON_FACE, 128).rotateX(-Math.PI / 2);
    const matFace = new THREE.MeshStandardMaterial({
      map: face.carte, normalMap: face.normales, normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.55, metalness: 0,
    });
    const disque = new THREE.Mesh(geoFace, matFace);
    disque.position.y = Y_FACE;
    disque.receiveShadow = true;
    this.racine.add(disque);
    this.aJeter.push(face.carte, face.normales, geoFace, matFace);

    try {
      const cadre = await chargerGLB(`${BASE}models/plateau.glb`, this.gestionnaire);
      cadre.scale.setScalar(ECHELLE_PLATEAU);
      cadre.position.y = -PLATEAU_GLB_BAS * ECHELLE_PLATEAU;
      cadre.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.racine.add(cadre);
      this.mesurerPlateau(cadre);
    } catch {
      // Le cadre manque : un cylindre de noyer le remplace le temps qu'il arrive.
      const geo = new THREE.CylinderGeometry(DEMI_CADRE, DEMI_CADRE * 1.02, DESSUS, 96);
      const mat = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.6 });
      const m = new THREE.Mesh(geo, mat);
      m.position.y = DESSUS / 2;
      m.castShadow = m.receiveShadow = true;
      this.racine.add(m);
      this.aJeter.push(geo, mat);
    }
  }

  /** Outil de calibrage : lance des rayons vers le bas sur le cadre et
   *  publie la hauteur du dessus selon le rayon. Les nombres obtenus
   *  sont figés plus haut ; la fonction reste pour le prochain modèle. */
  private mesurerPlateau(cadre: THREE.Object3D): void {
    const rc = new THREE.Raycaster();
    const mesures: { r: number; y: number | null }[] = [];
    cadre.updateMatrixWorld(true);
    const rmax = (PLATEAU_GLB_DIAMETRE / 2) * ECHELLE_PLATEAU;
    for (let k = 0; k <= 40; k++) {
      const r = (rmax * k) / 40;
      rc.set(new THREE.Vector3(r, 50, 0.01), new THREE.Vector3(0, -1, 0));
      const h = rc.intersectObject(cadre, true)[0];
      mesures.push({ r: r / ECHELLE_PLATEAU, y: h ? h.point.y / ECHELLE_PLATEAU + PLATEAU_GLB_BAS : null });
    }
    (window as unknown as { __mesurePlateau: unknown }).__mesurePlateau = mesures;
  }

  // ── Les tuiles ────────────────────────────────────────────────────

  private async chargerTuiles(): Promise<void> {
    await Promise.all(TYPES.map(async (t) => {
      let modele: THREE.Object3D;
      try {
        const g = await chargerGLB(`${BASE}models/tuiles/${t}.glb`, this.gestionnaire);
        g.scale.setScalar(ECHELLE_TUILE);
        const b = new THREE.Box3().setFromObject(g);
        const c = b.getCenter(new THREE.Vector3());
        g.position.set(-c.x, -b.min.y, -c.z);
        modele = g;
      } catch {
        modele = this.remplacant(t);
      }
      modele.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      for (const camp of ['hote', 'invite'] as Camp[]) {
        const env = new THREE.Group();
        const copie = modele.clone(true);
        // Chaque camp a ses matériaux : l'hôte garde l'érable nu,
        // l'invité est teinté en noyer.
        copie.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          if (camp === 'invite') mat.color.multiply(COULEUR_INVITE);
          m.material = mat;
          this.aJeter.push(mat);
        });
        env.add(copie);
        this.prototypes.set(`${t}:${camp}`, env);
      }
    }));
    if (this.dernierEtat) this.afficher(this.dernierEtat);
  }

  /** Le remplaçant d'une tuile dont le modèle n'est pas encore livré. */
  private remplacant(t: TypeTuile): THREE.Object3D {
    const geo = new THREE.CylinderGeometry(0.41 * PAS, 0.41 * PAS, 0.18 * PAS, 40);
    geo.translate(0, 0.09 * PAS, 0);
    const icone = this.texture(`${BASE}tuiles/${t}.webp`);
    const bord = new THREE.MeshStandardMaterial({ color: 0xd9b07a, roughness: 0.5 });
    const dessus = new THREE.MeshStandardMaterial({ map: icone, roughness: 0.5 });
    this.aJeter.push(geo, bord, dessus);
    return new THREE.Mesh(geo, [bord, dessus, bord]);
  }

  private nouvelleTuile(t: TypeTuile, camp: Camp): THREE.Object3D {
    const p = this.prototypes.get(`${t}:${camp}`);
    return p ? p.clone(true) : new THREE.Group();
  }

  private chargerConvives(): void {
    const noms = ['dame', 'moine', 'colporteur'];
    noms.forEach((nom, i) => {
      chargerSculpture(`${BASE}models/convives/${nom}.glb`, HAUT_CONVIVE, this.gestionnaire)
        .then((g) => {
          g.userData.rang = i;
          this.convives.add(g);
          this.placerConvives(this.coteConvives);
        })
        .catch(() => { /* la partie se joue aussi sans spectateurs */ });
    });
  }

  private coteConvives: Camp = 'hote';

  /** Les spectateurs s'assoient en face du joueur `camp`. */
  placerConvives(camp: Camp): void {
    this.coteConvives = camp;
    const base = camp === 'hote' ? Math.PI : 0;
    const angles = [0, 0.62, -0.62];
    for (const g of this.convives.children) {
      const a = base + angles[g.userData.rang as number];
      const r = 22;
      g.position.set(Math.sin(a) * r, Y_PLANCHER, Math.cos(a) * r);
      g.lookAt(0, Y_PLANCHER, 0);
    }
  }

  // ── L'état de la partie ───────────────────────────────────────────

  /**
   * Pose l'état. Avec `coup`, le mouvement s'anime : la tuile se lève,
   * glisse et se repose, la tuile prise s'efface. Le reste se rattrape
   * par différence, case par case.
   */
  afficher(e: EtatPaiSho, coup?: Coup): Promise<void> {
    this.dernierEtat = e;
    const anims: Promise<void>[] = [];
    if (coup?.type === 'deplacer') {
      const mobile = this.tuiles.get(coup.de);
      if (mobile) {
        const prise = this.tuiles.get(coup.a);
        if (prise) { this.tuiles.delete(coup.a); anims.push(this.effacer(prise.obj)); }
        this.tuiles.delete(coup.de);
        this.tuiles.set(coup.a, mobile);
        anims.push(this.glisser(mobile.obj, versMonde(coup.a)));
      }
    }
    // La différence : ce qui n'est plus là s'efface, ce qui manque arrive.
    for (const [p, t] of [...this.tuiles]) {
      const vrai = tuileEn(e, p);
      if (!vrai || vrai.type !== t.type || vrai.camp !== t.camp) {
        this.tuiles.delete(p);
        anims.push(this.effacer(t.obj));
      }
    }
    for (let y = -8; y <= 8; y++) {
      for (let x = -8; x <= 8; x++) {
        if (!estJouable(x, y)) continue;
        const p = indice(x, y);
        const vrai = tuileEn(e, p);
        if (!vrai || this.tuiles.has(p)) continue;
        const obj = this.nouvelleTuile(vrai.type, vrai.camp);
        const cible = versMonde(p);
        this.racine.add(obj);
        this.tuiles.set(p, { obj, type: vrai.type, camp: vrai.camp });
        if (coup) {
          obj.position.set(cible.x, cible.y + 2.2, cible.z);
          anims.push(new Promise((ok) => {
            gsap.to(obj.position, { y: cible.y, duration: 0.45, ease: 'bounce.out', onComplete: () => ok() });
          }));
        } else obj.position.copy(cible);
      }
    }
    const v = e.verdict;
    this.anneauGagnant = v && v.type === 'victoire' && v.raison === 'anneau' ? v.camp : null;
    this.poserFils(harmonies(e));
    this.poserReserves(e);
    return Promise.all(anims).then(() => {});
  }

  private glisser(obj: THREE.Object3D, cible: THREE.Vector3): Promise<void> {
    const d = Math.hypot(cible.x - obj.position.x, cible.z - obj.position.z);
    return new Promise((ok) => {
      gsap.timeline({ onComplete: () => ok() })
        .to(obj.position, { y: cible.y + 0.9, duration: 0.18, ease: 'power2.out' })
        .to(obj.position, { x: cible.x, z: cible.z, duration: 0.3 + d * 0.035, ease: 'power2.inOut' })
        .to(obj.position, { y: cible.y, duration: 0.2, ease: 'power2.in' });
    });
  }

  private effacer(obj: THREE.Object3D): Promise<void> {
    // Des matériaux propres à la tuile qui part, pour ne pas éteindre
    // toutes ses sœurs qui partagent les mêmes.
    const mats: THREE.Material[] = [];
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const liste = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => {
        const c = x.clone(); c.transparent = true; mats.push(c); return c;
      });
      m.material = Array.isArray(m.material) ? liste : liste[0];
    });
    const etat = { o: 1 };
    return new Promise((ok) => {
      gsap.to(etat, {
        o: 0, duration: 0.5, delay: 0.25, ease: 'power1.in',
        onUpdate: () => { for (const m of mats) m.opacity = etat.o; obj.position.y += 0.004; },
        onComplete: () => { obj.removeFromParent(); for (const m of mats) m.dispose(); ok(); },
      });
    });
  }

  private poserFils(liste: Harmonie[]): void {
    for (const f of [...this.fils.children]) f.removeFromParent();
    const haut = new THREE.Vector3(0, 1, 0);
    for (const h of liste) {
      const a = versMonde(h.a, Y_FACE + 0.06);
      const b = versMonde(h.b, Y_FACE + 0.06);
      const gagnant = this.anneauGagnant === h.camp;
      const m = new THREE.Mesh(this.geoFil, gagnant ? this.matFilGagnant : this.matFil);
      const l = a.distanceTo(b);
      const ep = gagnant ? 0.09 : 0.035;
      m.scale.set(ep, l, ep);
      m.position.copy(a).lerp(b, 0.5);
      m.quaternion.setFromUnitVectors(haut, b.clone().sub(a).normalize());
      m.renderOrder = 1;
      this.fils.add(m);
    }
  }

  /** Les tuiles en main, empilées par type dans le plateau de chaque joueur. */
  private poserReserves(e: EtatPaiSho): void {
    for (const f of [...this.reserves.children]) f.removeFromParent();
    const ech = 0.85;
    for (const camp of ['hote', 'invite'] as Camp[]) {
      const z = camp === 'hote' ? 13.6 : -13.6;
      const sens = camp === 'hote' ? 1 : -1;
      TYPES.forEach((t, k) => {
        const n = e.reserve[camp][t];
        const x = sens * (k - 5.5) * 1.05;
        for (let i = 0; i < n; i++) {
          const o = this.nouvelleTuile(t, camp);
          o.scale.setScalar(ech);
          o.position.set(x, i * 0.2, z);
          this.reserves.add(o);
        }
      });
    }
  }

  /** Les cibles légales en vert, la tuile choisie cerclée d'or. */
  montrerCibles(points: Pt[], selection: Pt | null): void {
    this.ciblesPts = new Set(points);
    this.selection = selection;
    const m = new THREE.Matrix4();
    let n = 0;
    for (const p of this.ciblesPts) {
      if (n >= 260) break;
      const v = versMonde(p, Y_FACE + 0.012);
      m.makeTranslation(v.x, v.y, v.z);
      this.ciblesMesh.setMatrixAt(n++, m);
    }
    this.ciblesMesh.count = n;
    this.ciblesMesh.instanceMatrix.needsUpdate = true;
    if (selection === null) this.anneauSelection.visible = false;
    else {
      this.anneauSelection.position.copy(versMonde(selection, Y_FACE + 0.02));
      this.anneauSelection.visible = true;
    }
    this.haloRefus.visible = false;
    this.haloSurvol.visible = false;
  }

  // ── La caméra ─────────────────────────────────────────────────────

  /** Le rayon qui fait tenir le plateau entier dans la zone libre de l'écran. */
  private rayonCadrage(): number {
    const W = Math.max(1, this.el.clientWidth), H = Math.max(1, this.el.clientHeight);
    const libreW = Math.max(120, W - this.cadre.gauche - this.cadre.droite);
    const libreH = Math.max(120, H - this.cadre.haut - this.cadre.bas);
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Le plateau penché se raccourcit en hauteur, mais son bord proche
    // grossit avec la perspective : 0.92 et 1.12 ont été mesurés sur les
    // captures pour garder une marge égale tout autour.
    const rV = (DEMI_CADRE * 0.92) / (t * (libreH / H));
    const rH = (DEMI_CADRE * 1.12) / (t * (libreW / H));
    return Math.max(rV, rH);
  }

  private poserCamera(): void {
    const r = this.rayon * this.zoom;
    this.camera.position.set(
      r * Math.sin(this.phi) * Math.sin(this.theta),
      r * Math.cos(this.phi),
      r * Math.sin(this.phi) * Math.cos(this.theta),
    );
    this.camera.lookAt(0, 0.4, 0);
  }

  private redimensionner(): void {
    const W = this.el.clientWidth, H = this.el.clientHeight;
    if (!W || !H) return;
    this.renderer.setSize(W, H);
    this.camera.aspect = W / H;
    // Le décalage de la vue centre le plateau dans la zone que les
    // panneaux laissent libre, sans déplacer la caméra.
    const dx = (this.cadre.gauche - this.cadre.droite) / 2;
    const dy = (this.cadre.haut - this.cadre.bas) / 2;
    this.camera.setViewOffset(W, H, -dx, -dy, W, H);
    this.camera.updateProjectionMatrix();
    this.rayon = this.rayonCadrage();
    this.poserCamera();
  }

  /** Les marges, en pixels, que les panneaux de l'interface occupent. */
  cadrer(c: Cadre): void {
    const a = { ...this.cadre };
    gsap.to(a, {
      ...c, duration: 0.6, ease: 'power2.out',
      onUpdate: () => { this.cadre = { ...a }; this.redimensionner(); },
    });
  }

  /** L'entrée : de la salle entière jusqu'à la table. */
  entree(duree = 2.4): Promise<void> {
    const r0 = this.zoom;
    this.zoom = 2.6;
    this.phi = 1.25;
    this.theta = -0.9;
    this.poserCamera();
    void r0;
    return new Promise((ok) => {
      gsap.to(this, {
        zoom: 1, phi: 0.86, theta: -0.25, duration: duree, ease: 'power3.inOut',
        onUpdate: () => this.poserCamera(), onComplete: () => ok(),
      });
    });
  }

  /** Une lente promenade autour de la table pendant le menu. */
  deriver(oui: boolean): void { this.derive = oui; }

  /** Le demi-tour cinématique vers le côté d'un joueur. */
  tournerVers(camp: Camp, duree = 1.4): Promise<void> {
    this.derive = false;
    const cible = camp === 'hote' ? 0 : Math.PI;
    // Le plus court chemin autour de la table.
    let d = (cible - this.theta) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return new Promise((ok) => {
      gsap.to(this, {
        theta: this.theta + d, phi: 0.86, zoom: 1, duration: duree, ease: 'power2.inOut',
        onUpdate: () => this.poserCamera(), onComplete: () => ok(),
      });
    });
  }

  // ── Les gestes ────────────────────────────────────────────────────

  private pointDepuisEcran(cx: number, cy: number): Pt | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.rayCaster.setFromCamera(ndc, this.camera);
    const v = new THREE.Vector3();
    if (!this.rayCaster.ray.intersectPlane(this.plan, v)) return null;
    const x = Math.round(v.x / PAS), y = Math.round(-v.z / PAS);
    if (!estJouable(x, y)) return null;
    if (Math.hypot(v.x / PAS - x, -v.z / PAS - y) > 0.48) return null;
    return indice(x, y);
  }

  /** Les coordonnées d'écran d'un point du plateau (outillage et tests). */
  ecranDe(p: Pt): { x: number; y: number } {
    const v = versMonde(p).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  private brancherGestes(): void {
    const c = this.renderer.domElement;
    const pointeurs = new Map<number, { x: number; y: number }>();
    let depart: { x: number; y: number } | null = null;
    let deplace = false;
    let ecart0 = 0;

    const bas = (e: PointerEvent) => {
      c.setPointerCapture(e.pointerId);
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointeurs.size === 1) { depart = { x: e.clientX, y: e.clientY }; deplace = false; }
      if (pointeurs.size === 2) {
        const [a, b] = [...pointeurs.values()];
        ecart0 = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const bouge = (e: PointerEvent) => {
      const avant = pointeurs.get(e.pointerId);
      if (!avant) { this.survoler(this.pointDepuisEcran(e.clientX, e.clientY)); return; }
      if (pointeurs.size === 2) {
        pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pointeurs.values()];
        const ecart = Math.hypot(a.x - b.x, a.y - b.y);
        if (ecart0 > 0) this.zoomer(ecart0 / ecart);
        ecart0 = ecart;
        deplace = true;
        return;
      }
      const dx = e.clientX - avant.x, dy = e.clientY - avant.y;
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 6) deplace = true;
      if (deplace) {
        this.derive = false;
        this.theta -= dx * 0.006;
        this.phi = THREE.MathUtils.clamp(this.phi - dy * 0.005, 0.25, 1.32);
        this.poserCamera();
      }
    };
    const haut = (e: PointerEvent) => {
      const etaitSeul = pointeurs.size === 1;
      pointeurs.delete(e.pointerId);
      if (etaitSeul && !deplace) this.surClic(this.pointDepuisEcran(e.clientX, e.clientY));
      if (pointeurs.size === 0) depart = null;
    };
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      this.zoomer(Math.exp(e.deltaY * 0.0012));
    };
    c.addEventListener('pointerdown', bas);
    c.addEventListener('pointermove', bouge);
    c.addEventListener('pointerup', haut);
    c.addEventListener('pointercancel', haut);
    c.addEventListener('wheel', molette, { passive: false });
    c.style.touchAction = 'none';
  }

  private zoomer(f: number): void {
    this.zoom = THREE.MathUtils.clamp(this.zoom * f, 0.45, 1.5);
    this.poserCamera();
  }

  private survoler(p: Pt | null): void {
    this.haloRefus.visible = false;
    this.haloSurvol.visible = false;
    const actif = this.selection !== null || this.ciblesPts.size > 0;
    this.renderer.domElement.style.cursor = p !== null && (this.ciblesPts.has(p) || this.tuiles.has(p)) ? 'pointer' : 'default';
    if (p === null || !actif || p === this.selection) return;
    const h = this.ciblesPts.has(p) ? this.haloSurvol : this.selection !== null ? this.haloRefus : null;
    if (!h) return;
    h.position.copy(versMonde(p, Y_FACE + 0.025));
    h.visible = true;
  }

  // ── La boucle ─────────────────────────────────────────────────────

  private boucle = (): void => {
    this.raf = requestAnimationFrame(this.boucle);
    const dt = Math.min(this.horloge.getDelta(), 0.1);
    const t = this.horloge.elapsedTime;
    if (this.derive) { this.theta += dt * 0.05; this.poserCamera(); }
    this.matFil.opacity = 0.62 + 0.25 * Math.sin(t * 2.2);
    this.matFilGagnant.opacity = 0.7 + 0.3 * Math.sin(t * 5);
    (this.anneauSelection.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 4);
    this.renderer.render(this.scene, this.camera);
  };

  /** Une image tout de suite, sans attendre la prochaine trame (captures). */
  rendre(): void { this.renderer.render(this.scene, this.camera); }

  detruire(): void {
    cancelAnimationFrame(this.raf);
    this.observateur.disconnect();
    gsap.killTweensOf(this);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) m.geometry.dispose();
    });
    for (const x of this.aJeter) x.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
