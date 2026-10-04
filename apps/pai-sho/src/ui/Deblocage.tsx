// ─── « Personnage débloqué », à la manière de Smash ─────────────────
// Écran noir, onde d'or, la vraie figurine qui monte et tourne, le titre
// en typo display, un gong grave; un toucher passe à l'écran suivant.
// Quand une marche s'ouvre en même temps, un second tableau montre les
// deux nouveaux adversaires en silhouette.

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { adversaire, figurinesDessin, nomAdversaire } from '../jeu/adversaires';
import type { Deblocage as Gain } from '../jeu/progression';
import { chargerSculpture } from '../scene/sculpture';
import { TEXTES, type Langue } from './textes';

const BASE = import.meta.env.BASE_URL;

interface Props {
  gain: Gain;
  langue: Langue;
  son: boolean;
  onFermer: () => void;
}

/** Un gong grave, synthétisé : deux partiels qui s'éteignent en trois secondes. */
function gong(): void {
  try {
    const ctx = new AudioContext();
    const sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    sortie.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);
    sortie.connect(ctx.destination);
    for (const [f, g] of [[98, 1], [147, 0.45], [262, 0.2]] as const) {
      const o = ctx.createOscillator();
      const v = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; v.gain.value = g;
      o.connect(v).connect(sortie);
      o.start(); o.stop(ctx.currentTime + 3.3);
    }
    window.setTimeout(() => ctx.close().catch(() => {}), 3600);
  } catch { /* sans audio */ }
}

/** Les figurines `ids` sur un fond transparent; en `ombre`, elles ne sont que des silhouettes. */
function Figurines({ ids, ombre }: { ids: string[]; ombre?: boolean }) {
  const toile = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = toile.current;
    if (!canvas) return;
    const rendu = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendu.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    // La figurine fait 9 de haut et se tient à y = 2,5 : le titre, en bas de l'écran, reste sous ses pieds.
    camera.position.set(0, 7.5, 24);
    camera.lookAt(0, 6.6, 0);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1a0a, ombre ? 0.2 : 1.1));
    const lampe = new THREE.SpotLight(0xffe9c4, ombre ? 0 : 900, 80, 0.5, 0.8);
    lampe.position.set(6, 22, 14);
    scene.add(lampe);
    const dore = new THREE.PointLight(0xd4af37, 160, 60);
    dore.position.set(-8, 4, 6);
    scene.add(dore);
    const groupes: THREE.Group[] = [];
    let vivant = true;
    const ecart = 6.5;
    ids.forEach((id, i) => {
      const [un, deux] = figurinesDessin() ? [`${id}2`, id] : [id, `${id}2`];
      chargerSculpture(`${BASE}models/convives/${un}.glb`, 9)
        .catch(() => chargerSculpture(`${BASE}models/convives/${deux}.glb`, 9))
        .then((g) => {
          if (!vivant) return;
          g.traverse((o) => {
            const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
            if (!m?.isMeshStandardMaterial) return;
            if (ombre) (o as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x0a0604 });
            else { m.metalness = 0; m.roughness = 0.72; m.metalnessMap = null; m.roughnessMap = null; m.needsUpdate = true; }
          });
          g.position.x = (i - (ids.length - 1) / 2) * ecart;
          g.position.y = -3;
          g.userData.phase = i * 1.3;
          scene.add(g);
          groupes.push(g);
        })
        .catch(() => { /* sans figurine, le titre suffit */ });
    });
    const dimensionner = () => {
      const l = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      rendu.setSize(l, h, false);
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
    };
    dimensionner();
    window.addEventListener('resize', dimensionner);
    const debut = performance.now();
    let trame = 0;
    const boucle = () => {
      if (!vivant) return;
      const t = (performance.now() - debut) / 1000;
      for (const g of groupes) {
        // Elle regarde la salle et se balance à peine, comme sur son socle.
        g.rotation.y = ombre ? 0 : Math.sin(t * 0.7 + (g.userData.phase as number)) * 0.5;
        // Elle monte du sol en une seconde et demie, puis flotte à peine.
        g.position.y = -3 + Math.min(1, t / 1.5) ** 0.6 * 5.5 + Math.sin(t * 1.2) * 0.12;
      }
      rendu.render(scene, camera);
      trame = requestAnimationFrame(boucle);
    };
    boucle();
    return () => {
      vivant = false;
      cancelAnimationFrame(trame);
      window.removeEventListener('resize', dimensionner);
      rendu.dispose();
    };
  }, [ids, ombre]);
  return <canvas ref={toile} className="debloque-toile" />;
}

export default function Deblocage({ gain, langue, son, onFermer }: Props) {
  const t = TEXTES[langue];
  const fr = langue === 'FR';
  // Tableau 0 : le personnage gagné. Tableau 1 : la marche ouverte.
  const tableaux = useMemo(() => {
    const l: Array<{ titre: string; ids: string[]; ombre: boolean; sous: string }> = [];
    if (gain.avatars.length) {
      const p = adversaire(gain.perso);
      l.push({
        titre: t.debloque, ids: gain.avatars, ombre: false,
        sous: gain.honneur ? t.irohHonneur : p ? nomAdversaire(p, fr) : gain.perso,
      });
    }
    if (gain.defis.length) {
      l.push({
        titre: t.nouveauxDefis, ids: gain.defis, ombre: true,
        sous: gain.defis.map((id) => { const a = adversaire(id); return a ? nomAdversaire(a, fr) : id; }).join(fr ? ' et ' : ' and '),
      });
    }
    return l;
  }, [gain, t, fr]);
  const [i, setI] = useState(0);
  useEffect(() => { if (son) gong(); }, [i, son]);
  const tableau = tableaux[i];
  if (!tableau) return null;
  const suivant = () => { if (i + 1 < tableaux.length) setI(i + 1); else onFermer(); };
  return (
    <button type="button" className="debloque" onClick={suivant} data-test="debloque" key={i}>
      <span className="debloque-onde" aria-hidden />
      <Figurines ids={tableau.ids} ombre={tableau.ombre} />
      <span className="debloque-titre">{tableau.titre}</span>
      <span className="debloque-nom">{tableau.sous}</span>
      {i === 0 && gain.avatars.length > 0 && !gain.honneur && <span className="debloque-aide">{t.debloqueAide}</span>}
      <small className="debloque-continuer">{t.deblocageContinuer}</small>
    </button>
  );
}
