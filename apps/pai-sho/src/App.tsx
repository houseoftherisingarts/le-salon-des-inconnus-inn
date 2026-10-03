// ─── L'application : la scène vivante et ce qui flotte par-dessus ───
// La scène 3D naît une fois et ne meurt qu'à la fermeture. Le menu et
// la partie sont des panneaux de verre posés sur elle, et passer de
// l'un à l'autre ne recharge rien.
//
// Avant la table, trois écrans d'entrée (Alex, 3 octobre 2026) : « Bonne
// fête Kamy » dans le programme Mac seulement, puis « Le Salon des
// Inconnus & Vexel Webstudio présentent », puis l'intro de marque, le
// titre qui s'écrit lettre à lettre, le lotus blanc et la musique.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScenePaiSho } from './scene/scene';
import { TEXTES, langueSauvee, sauverLangue, type Langue } from './ui/textes';
import { couperMusique, estElectron, jouerMusique, sauverSon, sonSauve } from './audio';
import Menu from './ui/Menu';
import Partie from './ui/Partie';
import Tutoriel, { tutorielVu, marquerTutorielVu } from './ui/Tutoriel';
import type { Config } from './sauvegarde';
import type { Lien } from './reseau/pair';

const BASE = import.meta.env.BASE_URL;

type Ecran = 'intro' | 'menu' | 'partie';
type Etape = 'kamy' | 'presentent' | 'marque' | 'fini';

export interface Depart {
  config: Config;
  coups?: string[];
  lien?: Lien;
}

// `?intro=1` force les trois écrans (captures), `?intro=0` les saute;
// les tests automatisés (webdriver) vont droit à la marque.
function etapeInitiale(): Etape {
  const force = new URLSearchParams(location.search).get('intro');
  if (force === '1') return 'kamy';
  if (force === '0' || navigator.webdriver) return 'marque';
  return estElectron() ? 'kamy' : 'presentent';
}

export default function App() {
  const conteneur = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<ScenePaiSho | null>(null);
  const [progres, setProgres] = useState(0);
  const [charge, setCharge] = useState(false);
  const [etape, setEtape] = useState<Etape>(etapeInitiale);
  const [ecran, setEcran] = useState<Ecran>('intro');
  const [rideau, setRideau] = useState(true);
  const [langue, setLangue] = useState<Langue>(langueSauvee);
  const [son, setSon] = useState(sonSauve);
  const [depart, setDepart] = useState<Depart | null>(null);
  const [tuto, setTuto] = useState(false);
  // Chaque partie lancée porte un numéro neuf : « Nouvelle partie »
  // remonte la partie de zéro même quand la configuration ne change pas.
  const [manche, setManche] = useState(0);
  const t = TEXTES[langue];

  // La scène, une seule fois. Elle charge pendant les écrans d'entrée.
  useEffect(() => {
    const el = conteneur.current!;
    const s = new ScenePaiSho(el, { surProgres: setProgres });
    setScene(s);
    (window as unknown as { __scene: ScenePaiSho }).__scene = s;
    let vivant = true;
    s.pret.then(() => { if (vivant) setCharge(true); });
    return () => { vivant = false; s.detruire(); };
  }, []);

  // La marque lance la musique, puis laisse 2,6 s au titre et au lotus.
  useEffect(() => {
    if (etape !== 'marque') return;
    jouerMusique();
    couperMusique(!son);
    const id = window.setTimeout(() => setEtape('fini'), 2600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape]);

  // Le rideau se lève quand la table est prête et que l'intro a fini,
  // puis la caméra traverse la salle jusqu'à la table.
  useEffect(() => {
    if (!charge || etape !== 'fini' || !scene) return;
    let vivant = true;
    setRideau(false);
    scene.entree(2.4).then(() => {
      if (!vivant) return;
      setEcran('menu');
      scene.deriver(true);
    });
    return () => { vivant = false; };
  }, [charge, etape, scene]);

  useEffect(() => {
    document.documentElement.lang = langue === 'FR' ? 'fr' : 'en';
    sauverLangue(langue);
  }, [langue]);

  useEffect(() => { sauverSon(son); couperMusique(!son); }, [son]);

  // Au menu, le plateau se loge entre le titre et les cartes : il reste
  // entier à l'écran au lieu de passer sous le verre. Seules les cartes
  // sous le plateau comptent, celles du tiers central; la grande carte
  // de gauche peut monter plus haut sans repousser la caméra au loin.
  useEffect(() => {
    if (ecran !== 'menu' || !scene) return;
    const mesurer = () => {
      const tete = document.querySelector('.menu-tete')?.getBoundingClientRect();
      const toutes = [...document.querySelectorAll('.menu-cartes > *')].map((c) => c.getBoundingClientRect());
      const centre = toutes.filter((r) => r.right > window.innerWidth / 3 && r.left < (window.innerWidth * 2) / 3);
      const hauts = (centre.length ? centre : toutes).map((r) => r.top);
      if (!tete || !hauts.length) return;
      scene.cadrer({ gauche: 0, droite: 0, haut: tete.bottom + 8, bas: Math.max(0, window.innerHeight - Math.min(...hauts) + 8) });
    };
    const id = window.setTimeout(mesurer, 60);
    window.addEventListener('resize', mesurer);
    return () => { window.clearTimeout(id); window.removeEventListener('resize', mesurer); };
  }, [ecran, scene]);

  const lancer = useCallback((d: Depart) => {
    setDepart(d);
    setManche((n) => n + 1);
    setEcran('partie');
    if (!tutorielVu('paisho')) window.setTimeout(() => setTuto(true), 1600);
  }, []);

  const versMenu = useCallback(() => {
    setEcran('menu');
    setDepart(null);
    scene?.deriver(true);
  }, [scene]);

  const marque = etape === 'marque' || etape === 'fini';

  return (
    <div className="app">
      <div ref={conteneur} className="scene" />

      {etape === 'kamy' && (
        <div className="prelude" onAnimationEnd={() => setEtape('presentent')} data-test="prelude-kamy">
          <p>{t.bonneFete}</p>
        </div>
      )}
      {etape === 'presentent' && (
        <div className="prelude" onAnimationEnd={() => setEtape('marque')} data-test="prelude-presentent">
          <p>{t.salonEtVexel[0]}<br />{t.salonEtVexel[1]}</p>
          <small>{t.presentent}</small>
        </div>
      )}

      <div className={`rideau ${rideau ? '' : 'leve'} ${marque ? 'marque' : ''}`} aria-hidden={!rideau}>
        {marque && (
          <>
            <img src={`${BASE}tuiles/LOTUS.webp`} alt="" className="rideau-lotus" />
            <p className="rideau-titre" aria-label={t.titre}>
              {[...t.titre].map((c, i) => (
                <span key={i} style={{ animationDelay: `${0.6 + i * 0.14}s` }}>{c === ' ' ? ' ' : c}</span>
              ))}
            </p>
            <div className="rideau-barre"><span style={{ width: `${Math.round(progres * 100)}%` }} /></div>
            <p className="rideau-texte">{t.chargement}</p>
          </>
        )}
      </div>

      {ecran === 'menu' && scene && (
        <Menu
          langue={langue}
          son={son}
          scene={scene}
          onLangue={() => setLangue((l) => (l === 'FR' ? 'EN' : 'FR'))}
          onSon={() => setSon((x) => !x)}
          onLancer={lancer}
          onTutoriel={() => setTuto(true)}
        />
      )}

      {ecran === 'partie' && scene && depart && (
        <Partie
          key={manche}
          scene={scene}
          depart={depart}
          langue={langue}
          onMenu={versMenu}
          onNouvelle={() => { setDepart({ config: { ...depart.config }, lien: depart.lien }); setManche((n) => n + 1); }}
          son={son}
          onTutoriel={() => setTuto(true)}
        />
      )}

      <Tutoriel
        langue={langue}
        ouvert={tuto}
        onFermer={() => { setTuto(false); marquerTutorielVu('paisho'); }}
      />
    </div>
  );
}
