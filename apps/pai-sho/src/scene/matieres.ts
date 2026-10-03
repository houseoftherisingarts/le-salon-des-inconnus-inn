// ─── Les matières des skins ─────────────────────────────────────────
// Les tuiles et le cadre sont des GLB peints : du bois clair, et pour
// les tuiles un motif à la feuille d'or. Un skin ne touche jamais à la
// géométrie ni à la gravure. Il relit la couleur peinte dans le shader :
// la saturation sépare la feuille d'or du bois (l'or est bien plus
// saturé), la clarté donne le modelé, et chacun reçoit sa nouvelle
// teinte, son métal et sa rugosité. La gravure reste donc lisible sur
// toutes les matières, puisque c'est elle qui porte le contraste.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { IdPlateau, IdTuiles } from '../skins';
import type { Camp } from '../jeu/logic';

export interface Teinte {
  /** Le corps, du creux le plus sombre au relief le plus clair. */
  sombre: string;
  clair: string;
  /** La nouvelle couleur de la feuille d'or, si le motif en a une. */
  incruste?: string;
  metal: number;
  rugosite: number;
  metalIncruste?: number;
  rugositeIncruste?: number;
  /** L'irisation de la nacre et le vernis de la pierre polie. */
  irise?: number;
  vernis?: number;
  reflets?: number;
  /** La plage de clarté (sRGB) étalée entre sombre et clair. */
  plage?: [number, number];
}

const DECLARATIONS = /* glsl */ `
uniform vec3 uSombre;
uniform vec3 uClair;
uniform vec3 uIncruste;
uniform float uMasque;
uniform vec2 uPlage;
uniform vec2 uMetal;
uniform vec2 uRugosite;
`;

const RELECTURE = /* glsl */ `
float masqueIncruste = 0.0;
#ifdef USE_MAP
  vec4 texel = texture2D( map, vMapUv );
  vec3 srgb = pow( max( texel.rgb, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) );
  float haut = max( max( srgb.r, srgb.g ), srgb.b );
  float bas = min( min( srgb.r, srgb.g ), srgb.b );
  float saturation = ( haut - bas ) / max( haut, 1e-4 );
  float clarte = dot( srgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  masqueIncruste = uMasque * smoothstep( 0.48, 0.6, saturation );
  vec3 corps = mix( uSombre, uClair, smoothstep( uPlage.x, uPlage.y, clarte ) );
  vec3 feuille = uIncruste * ( 0.45 + 0.75 * clarte );
  diffuseColor.rgb *= mix( corps, feuille, masqueIncruste );
#endif
`;

/** Une matière neuve tirée d'une matière GLB : même carte, autre teinte. */
export function teinter(base: THREE.MeshStandardMaterial, t: Teinte, env: THREE.Texture): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    map: base.map, normalMap: base.normalMap, normalScale: base.normalScale.clone(), side: base.side,
    metalness: t.metal, roughness: t.rugosite, envMap: env, envMapIntensity: t.reflets ?? 0.7,
    iridescence: t.irise ?? 0, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520],
    clearcoat: t.vernis ?? 0, clearcoatRoughness: 0.08,
  });
  const u = {
    uSombre: { value: new THREE.Color(t.sombre) },
    uClair: { value: new THREE.Color(t.clair) },
    uIncruste: { value: new THREE.Color(t.incruste ?? t.clair) },
    uMasque: { value: t.incruste ? 1 : 0 },
    uPlage: { value: new THREE.Vector2(...(t.plage ?? [0.3, 0.85])) },
    uMetal: { value: new THREE.Vector2(t.metal, t.metalIncruste ?? t.metal) },
    uRugosite: { value: new THREE.Vector2(t.rugosite, t.rugositeIncruste ?? t.rugosite) },
  };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.fragmentShader = s.fragmentShader
      .replace('void main() {', `${DECLARATIONS}\nvoid main() {`)
      .replace('#include <map_fragment>', RELECTURE)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix( uRugosite.x, uRugosite.y, masqueIncruste );')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = mix( uMetal.x, uMetal.y, masqueIncruste );');
  };
  return m;
}

/** Les tuiles : l'hôte reste la matière claire, l'invité la sombre,
 *  comme l'érable et le noyer du jeu de bois. */
export const TEINTES_TUILES: Record<Exclude<IdTuiles, 'bois'>, Record<Camp, Teinte>> = {
  nacre: {
    hote: { sombre: '#b9b2ad', clair: '#fffaf4', incruste: '#e2b84c', metal: 0, rugosite: 0.22,
      metalIncruste: 1, rugositeIncruste: 0.3, irise: 1, vernis: 0.7, reflets: 0.8 },
    invite: { sombre: '#1e2228', clair: '#5d6670', incruste: '#d9dee6', metal: 0, rugosite: 0.22,
      metalIncruste: 1, rugositeIncruste: 0.28, irise: 1, vernis: 0.7, reflets: 0.8 },
  },
  obsidienne: {
    hote: { sombre: '#141317', clair: '#3e3a45', incruste: '#dfe3ea', metal: 0, rugosite: 0.16,
      metalIncruste: 1, rugositeIncruste: 0.25, vernis: 1, reflets: 0.55 },
    invite: { sombre: '#040406', clair: '#18171d', incruste: '#d8ae48', metal: 0, rugosite: 0.12,
      metalIncruste: 1, rugositeIncruste: 0.28, vernis: 1, reflets: 0.9 },
  },
  cuivre: {
    hote: { sombre: '#7a3e20', clair: '#df8c58', incruste: '#2c1a12', metal: 1, rugosite: 0.3,
      metalIncruste: 0.2, rugositeIncruste: 0.6, reflets: 0.9 },
    invite: { sombre: '#2e1a10', clair: '#6e4128', incruste: '#e8c270', metal: 1, rugosite: 0.34,
      metalIncruste: 1, rugositeIncruste: 0.3, reflets: 0.9 },
  },
};

/** Le cadre sculpté : la même relecture, sans feuille d'or. */
export const TEINTES_CADRE: Record<Exclude<IdPlateau, 'bois'>, Teinte> = {
  vexel: { sombre: '#101216', clair: '#9aa4b0', metal: 0.9, rugosite: 0.36, reflets: 0.65, plage: [0.1, 0.95] },
  salon: { sombre: '#7e6246', clair: '#efe3cc', metal: 0, rugosite: 0.6, plage: [0.1, 0.95] },
};

/** La salle neutre que les métaux reflètent, préfiltrée une fois. */
export function environnement(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pm = new THREE.PMREMGenerator(renderer);
  const salle = new RoomEnvironment();
  const t = pm.fromScene(salle, 0.04).texture;
  salle.dispose();
  pm.dispose();
  return t;
}

/**
 * La carte d'anisotropie de l'acier tourné : en chaque point, la
 * direction du brossage est tangente au cercle qui passe par lui, et
 * le reflet s'étire en rayons comme sur un vrai disque passé au tour.
 */
export function anisotropieTournee(taille = 256): THREE.DataTexture {
  const d = new Uint8Array(taille * taille * 4);
  const c = (taille - 1) / 2;
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      const dx = x - c, dy = y - c;
      const l = Math.hypot(dx, dy) || 1;
      const i = (y * taille + x) * 4;
      d[i] = Math.round((-dy / l * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((dx / l * 0.5 + 0.5) * 255);
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(d, taille, taille);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
