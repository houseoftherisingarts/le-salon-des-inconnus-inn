// ─── La scène : la taverne, la table, le plateau, les tuiles ────────
// Une seule classe tient tout ce qui se dessine. La page lui donne un
// état de partie et des cibles à montrer, elle lui rend des clics sur
// des points du plateau. Rien ici ne connaît les règles au-delà de la
// lecture d'un état : c'est l'arbitre qui décide, la scène montre.
// Le repère et les mesures vivent dans mesures.ts.

import * as THREE from 'three';
import gsap from 'gsap';
import { chargerSculpture } from './sculpture';
import { peindreFacePlateau } from './plateauTexture';
import { batirDecor } from './decor';
import { Marques } from './marques';
import { brancherGestes } from './gestes';
import {
  BASE, COULEUR_INVITE, DEMI_CADRE, ECHELLE_PLATEAU, ECHELLE_TUILE, FOV, HAUT_CONVIVE, PAS,
  PLATEAU_GLB_BAS, PLATEAU_GLB_DIAMETRE, RAYON_FACE, Y_FACE, Y_PLANCHER, chargerGLB, versMonde,
  type Cadre,
} from './mesures';
import { estJouable, indice, type Pt } from '../jeu/plateau';
import {
  TYPES, harmonies, tuileEn, type Camp, type Coup, type EtatPaiSho, type TypeTuile,
} from '../jeu/logic';

export { versMonde, type Cadre } from './mesures';

export interface OptionsScene {
  surProgres?: (fraction: number) => void;
}

interface ObjetTuile { obj: THREE.Object3D; type: TypeTuile; camp: Camp }

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
  private convives = new THREE.Group();
  private marques = new Marques();
  private plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y_FACE);
  private rayCaster = new THREE.Raycaster();
  private dernierEtat: EtatPaiSho | null = null;

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
    this.racine.add(this.reserves, this.marques.groupe, this.convives);

    // Le chargement : la page suit la progression, et rien ne reste
    // bloqué plus de quinze secondes même si un fichier ne répond pas.
    const pret = new Promise<void>((ok) => {
      this.gestionnaire.onProgress = (_u, n, total) => o.surProgres?.(total ? n / total : 1);
      this.gestionnaire.onLoad = () => { o.surProgres?.(1); ok(); };
      this.gestionnaire.onError = () => { /* un fichier manquant garde son remplaçant */ };
      window.setTimeout(ok, 15000);
    });

    batirDecor(this.scene, this.racine, this.gestionnaire, this.aJeter);
    const plateauPret = this.batirPlateau();
    const tuilesPretes = this.chargerTuiles();
    this.chargerConvives();


    this.pret = Promise.all([pret, plateauPret, tuilesPretes]).then(() => {});

    this.observateur = new ResizeObserver(() => this.redimensionner());
    this.observateur.observe(el);
    this.redimensionner();
    brancherGestes(r.domElement, {
      survol: (x, y) => this.survoler(this.pointDepuisEcran(x, y)),
      clic: (x, y) => this.surClic(this.pointDepuisEcran(x, y)),
      tourner: (dx, dy) => {
        this.derive = false;
        this.theta -= dx * 0.006;
        this.phi = THREE.MathUtils.clamp(this.phi - dy * 0.005, 0.25, 1.32);
        this.poserCamera();
      },
      zoomer: (f) => this.zoomer(f),
    });
    this.boucle();
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
      // Sans le cadre sculpté, le disque peint reste seul sur la table.
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
        modele = await chargerGLB(`${BASE}models/tuiles/${t}.glb`, this.gestionnaire);
      } catch {
        return;
      }
      modele.scale.setScalar(ECHELLE_TUILE);
      const b = new THREE.Box3().setFromObject(modele);
      const c = b.getCenter(new THREE.Vector3());
      modele.position.set(-c.x, -b.min.y, -c.z);
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
    this.marques.poserFils(harmonies(e), v && v.type === 'victoire' && v.raison === 'anneau' ? v.camp : null);
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
  montrerCibles(points: Pt[], selection: Pt | null): void { this.marques.montrer(points, selection); }

  private survoler(p: Pt | null): void {
    const m = this.marques;
    this.renderer.domElement.style.cursor = p !== null && (m.cibles.has(p) || this.tuiles.has(p)) ? 'pointer' : 'default';
    m.survoler(p);
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
    this.zoom = 2.6;
    this.phi = 1.25;
    this.theta = -0.9;
    this.poserCamera();
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

  private zoomer(f: number): void {
    this.zoom = THREE.MathUtils.clamp(this.zoom * f, 0.45, 1.5);
    this.poserCamera();
  }

  // ── La boucle ─────────────────────────────────────────────────────

  private boucle = (): void => {
    this.raf = requestAnimationFrame(this.boucle);
    const dt = Math.min(this.horloge.getDelta(), 0.1);
    const t = this.horloge.elapsedTime;
    if (this.derive) { this.theta += dt * 0.05; this.poserCamera(); }
    this.marques.animer(t);
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
    this.marques.detruire();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
