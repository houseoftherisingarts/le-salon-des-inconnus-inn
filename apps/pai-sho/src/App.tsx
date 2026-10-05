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
import { couperMusique, estElectron, jouerMusique, reglerVolume, sauverSon, sonSauve, volumeSauve } from './audio';
import Menu from './ui/Menu';
import Partie from './ui/Partie';
import Tutoriel, { tutorielVu, marquerTutorielVu } from './ui/Tutoriel';
import type { Config } from './sauvegarde';
import type { Lien } from './reseau/pair';

const BASE = import.meta.env.BASE_URL;

type Ecran = 'intro' | 'menu' | 'partie';
type Etape = 'porte' | 'kamy' | 'presentent' | 'marque' | 'fini';

export interface Depart {
  config: Config;
  coups?: string[];
  lien?: Lien;
}

// `?pour=zach` : la table offerte à Zach Burnham, l'auteur du Skud Pai
// Sho. « Hello Zach » remplace « Bonne fête Kamy », sur le web aussi, et
// « Zach's Skud » coiffe le titre de la marque.
const POUR = new URLSearchParams(location.search).get('pour');
const ZACH = POUR === 'zach';
// `?pour=kamy` : le cadeau de Kamy joué dans le navigateur, avec son salut.
const KAMY = POUR === 'kamy';

// `?intro=1` force les trois écrans (captures), `?intro=0` les saute;
// les tests automatisés (webdriver) vont droit à la marque.
function etapeInitiale(): Etape {
  const force = new URLSearchParams(location.search).get('intro');
  if (force === '1') return 'kamy';
  if (force === '0' || navigator.webdriver) return 'marque';
  // Sur le web, une porte d'abord : le navigateur ne laisse partir la
  // musique qu'après un geste, et ce geste la lance sous les écrans d'entrée.
  return estElectron() ? 'kamy' : 'porte';
}
const apresPorte: Etape = ZACH || KAMY ? 'kamy' : 'presentent';

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

  // Le programme Mac joue sans geste : la musique part dès le premier écran.
  useEffect(() => {
    if (!estElectron()) return;
    jouerMusique();
    couperMusique(!sonSauve());
  }, []);

  // La marque lance la musique (si elle ne joue pas déjà), puis laisse 2,6 s au titre et au lotus.
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
      const W = window.innerWidth, H = window.innerHeight;
      const tete = document.querySelector('.menu-tete')?.getBoundingClientRect();
      const toutes = [...document.querySelectorAll('.menu-cartes > *')].map((c) => c.getBoundingClientRect());
      // Sur grand écran, les cartes hautes de gauche (style, campagne) forment une colonne :
      // le plateau se loge à leur droite au lieu de passer sous leur verre.
      const hautes = W >= 1200 ? toutes.filter((r) => r.top < H * 0.45 && r.left < W / 2) : [];
      const gauche = hautes.length ? Math.max(...hautes.map((r) => r.right)) + 16 : 0;
      const sous = gauche ? toutes.filter((r) => r.left >= gauche - 16) : toutes.filter((r) => r.right > W / 3 && r.left < (W * 2) / 3);
      const hauts = (sous.length ? sous : toutes).map((r) => r.top);
      if (!tete || !hauts.length) return;
      // La table garde au moins 38 % de la hauteur, quoi que les cartes
      // prennent : sur une fenêtre basse, elle passe sous le verre plutôt
      // que de s'enfuir au loin en disque noir.
      const haut = tete.bottom + 8;
      const bas = Math.min(H - Math.min(...hauts) + 8, H - haut - H * 0.38);
      scene.cadrer({ gauche, droite: 0, haut, bas: Math.max(0, bas) });
    };
    // Une mesure tôt, une autre quand l'entrée du menu (0,9 s) a fini de faire monter les cartes.
    const ids = [60, 1000].map((ms) => window.setTimeout(mesurer, ms));
    window.addEventListener('resize', mesurer);
    return () => { ids.forEach((i) => window.clearTimeout(i)); window.removeEventListener('resize', mesurer); };
  }, [ecran, scene]);

  const lancer = useCallback((d: Depart) => {
    setDepart(d);
    setManche((n) => n + 1);
    setEcran('partie');
    if (d.config.mode !== 'lecon' && !tutorielVu('paisho')) window.setTimeout(() => setTuto(true), 1600);
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

      {etape === 'porte' && (
        <button
          type="button"
          className="prelude porte"
          data-test="porte"
          autoFocus
          onClick={() => {
            // Entrer, c'est demander la musique : un son coupé ou un volume à zéro
            // gardés d'une autre visite ne laissent pas la table muette.
            setSon(true);
            if (volumeSauve() < 0.05) reglerVolume(0.55);
            jouerMusique();
            couperMusique(false);
            setEtape(apresPorte);
          }}
        >
          <img src={`${BASE}tuiles/LOTUS.webp`} alt="" className="rideau-lotus" />
          <small>{t.entrer}</small>
        </button>
      )}
      {etape === 'kamy' && (
        <div className="prelude" onAnimationEnd={() => setEtape('presentent')} data-test="prelude-kamy">
          <p className={ZACH ? 'salut' : undefined}>{ZACH ? 'Hello Zach' : t.bonneFete}</p>
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
            {ZACH && <p className="rideau-surtitre">Zach's <b>Skud</b></p>}
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
