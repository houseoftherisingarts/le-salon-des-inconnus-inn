// ─── Le choix des skins : le plateau et les tuiles ─────────────────
// Une carte du menu, deux rangées de vignettes. Les vignettes ne sont
// pas des photos : le plateau est peint par le même pinceau que la face
// de la scène, en petit, et la tuile est la vignette du lotus relue
// comme le shader la relit. Ce qu'on voit ici est donc ce qu'on aura.

import { useEffect, useState } from 'react';
import type { ScenePaiSho } from '../scene/scene';
import { toileFace } from '../scene/plateauTexture';
import { logoDe } from '../scene/habillage';
import { TEINTES_TUILES } from '../scene/matieres';
import { PAS, RAYON_FACE } from '../scene/mesures';
import {
  DECORS, PLATEAUX, TUILES, choisirSkin, debloques, skinChoisi,
  type IdDecor, type IdPlateau, type IdTuiles, type Skin,
} from '../skins';
import type { Camp } from '../jeu/logic';
import './skins.css';

const BASE = import.meta.env.BASE_URL;

const TEXTES = {
  FR: { titre: 'Plateau et tuiles', plateau: 'Le plateau', tuiles: 'Les tuiles', salle: 'La salle', verrou: 'Au café-jeux du Salon' },
  EN: { titre: 'Board and tiles', plateau: 'The board', tuiles: 'The tiles', salle: 'The room', verrou: 'At the Salon’s game café' },
};

// Les vignettes se peignent une fois par session.
const vignettes = new Map<string, Promise<string>>();
const memo = (cle: string, f: () => Promise<string>): Promise<string> => {
  if (!vignettes.has(cle)) vignettes.set(cle, f());
  return vignettes.get(cle)!;
};

const vignettePlateau = (id: IdPlateau) => memo(`p:${id}`, async () => {
  const logo = await logoDe(id);
  return toileFace(id, RAYON_FACE, PAS, logo, 256, true).couleur.toDataURL('image/webp', 0.9);
});

/** Un hex en trois composantes 0..1. */
const rvb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lisse = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** La tuile du lotus relue pour un camp : la même relecture que le shader. */
function relire(img: HTMLImageElement, id: IdTuiles, camp: Camp, T: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d')!;
  g.beginPath(); g.arc(T / 2, T * 0.49, T * 0.47, 0, Math.PI * 2); g.clip();
  g.drawImage(img, 0, 0, T, T);
  const d = g.getImageData(0, 0, T, T);
  const p = d.data;
  if (id === 'bois') {
    if (camp === 'invite') for (let i = 0; i < p.length; i += 4) { p[i] *= 0x7a / 255; p[i + 1] *= 0x52 / 255; p[i + 2] *= 0x30 / 255; }
  } else {
    const t = TEINTES_TUILES[id][camp];
    const [s, k, f] = [rvb(t.sombre), rvb(t.clair), rvb(t.incruste ?? t.clair)];
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i] / 255, v = p[i + 1] / 255, b = p[i + 2] / 255;
      const hi = Math.max(r, v, b), lo = Math.min(r, v, b);
      const masque = lisse(0.48, 0.6, (hi - lo) / Math.max(hi, 1e-4));
      const cl = 0.2126 * r + 0.7152 * v + 0.0722 * b;
      const u = lisse(0.3, 0.85, cl);
      for (let j = 0; j < 3; j++) {
        const corps = s[j] + (k[j] - s[j]) * u;
        const feuille = Math.min(1, f[j] * (0.45 + 0.75 * cl));
        p[i + j] = (corps + (feuille - corps) * masque) * 255;
      }
    }
  }
  g.putImageData(d, 0, 0);
  if (id === 'nacre') {
    // Le reflet irisé de la nacre, à peine posé.
    const foil = g.createConicGradient(0.6, T / 2, T / 2);
    ['#ff9ecb', '#ffe08a', '#9bffcf', '#8ad4ff', '#c9a4ff', '#ff9ecb'].forEach((col, i) => foil.addColorStop(i / 5, col));
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = 0.45;
    g.fillStyle = foil;
    g.fillRect(0, 0, T, T);
  }
  return c;
}

let lotus: Promise<HTMLImageElement> | null = null;
const vignetteTuiles = (id: IdTuiles) => memo(`t:${id}`, async () => {
  lotus ??= new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = `${BASE}tuiles/LOTUS.webp`; });
  const img = await lotus;
  // Les deux camps côte à côte : l'hôte devant, l'invité derrière.
  const T = 160, c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const g = c.getContext('2d')!;
  g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
  g.drawImage(relire(img, id, 'invite', T), 84, 4);
  g.drawImage(relire(img, id, 'hote', T), 12, 26);
  return c.toDataURL('image/webp', 0.9);
});

function Cadenas() {
  return (
    <svg className="skin-cadenas" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" />
    </svg>
  );
}

interface Choix { id: string; nom: string; ouvert: boolean; image: string | undefined }

function Rangee({ titre, choix, actif, onChoix, verrou, forme }: {
  titre: string; choix: Choix[]; actif: string; onChoix: (id: string) => void; verrou: string; forme: 'rond' | 'paire' | 'large';
}) {
  // Les noms ne tiennent pas sous des vignettes de soixante pixels :
  // seul celui du choix s'affiche, les autres vivent dans l'infobulle.
  const nom = choix.find((c) => c.id === actif)?.nom ?? '';
  return (
    <div className="skin-rangee">
      <span className="etiquette">{titre} <b className="skin-actif">{nom}</b></span>
      <div className={`skin-grille skin-${forme}`}>
        {choix.map((c) => (
          <button
            key={c.id} type="button" disabled={!c.ouvert}
            className={`skin-choix ${c.id === actif ? 'choisi' : ''}`}
            aria-pressed={c.id === actif} aria-label={c.ouvert ? c.nom : `${c.nom} · ${verrou}`}
            title={c.ouvert ? c.nom : `${c.nom} · ${verrou}`}
            onClick={() => onChoix(c.id)}
          >
            <span className="skin-image">
              {c.image && <img src={c.image} alt="" />}
              {!c.ouvert && <Cadenas />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Skins({ langue, scene }: { langue: 'FR' | 'EN'; scene: ScenePaiSho }) {
  const t = TEXTES[langue];
  const fr = langue === 'FR';
  const [skin, setSkin] = useState<Skin>(skinChoisi);
  const [ouverts] = useState(debloques);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let vivant = true;
    const poser = (cle: string) => (url: string) => { if (vivant) setImages((x) => ({ ...x, [cle]: url })); };
    for (const p of PLATEAUX) void vignettePlateau(p.id).then(poser(`p:${p.id}`));
    for (const u of TUILES) void vignetteTuiles(u.id).then(poser(`t:${u.id}`)).catch(() => {});
    return () => { vivant = false; };
  }, []);

  const choisir = (s: Skin) => {
    setSkin(s);
    choisirSkin(s);
    scene.appliquerSkin(s);
  };
  const aVerrou = [...PLATEAUX, ...TUILES].some((x) => !ouverts.has(x.id));

  return (
    <article className="carte verre carte-skins">
      <h2 className="carte-titre">{t.titre}</h2>
      <Rangee
        titre={t.plateau} forme="rond" actif={skin.plateau} verrou={t.verrou}
        choix={PLATEAUX.map((p) => ({ id: p.id, nom: fr ? p.nomFR : p.nomEN, ouvert: ouverts.has(p.id), image: images[`p:${p.id}`] }))}
        onChoix={(id) => choisir({ ...skin, plateau: id as IdPlateau })}
      />
      <Rangee
        titre={t.tuiles} forme="paire" actif={skin.tuiles} verrou={t.verrou}
        choix={TUILES.map((u) => ({ id: u.id, nom: fr ? u.nomFR : u.nomEN, ouvert: ouverts.has(u.id), image: images[`t:${u.id}`] }))}
        onChoix={(id) => choisir({ ...skin, tuiles: id as IdTuiles })}
      />
      <Rangee
        titre={t.salle} forme="large" actif={skin.decor} verrou={t.verrou}
        choix={DECORS.map((d) => ({ id: d.id, nom: fr ? d.nomFR : d.nomEN, ouvert: true, image: `${BASE}scenes/${d.id}-salle.jpg` }))}
        onChoix={(id) => choisir({ ...skin, decor: id as IdDecor })}
      />
      {aVerrou && <p className="skin-mention"><Cadenas />{t.verrou}</p>}
    </article>
  );
}
