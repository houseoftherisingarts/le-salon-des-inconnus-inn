// ─── L'application : la scène vivante et ce qui flotte par-dessus ───
// La scène 3D naît une fois et ne meurt qu'à la fermeture. Le menu et
// la partie sont des panneaux de verre posés sur elle, et passer de
// l'un à l'autre ne recharge rien.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScenePaiSho } from './scene/scene';
import { TEXTES, langueSauvee, sauverLangue, type Langue } from './ui/textes';
import Menu from './ui/Menu';
import Partie from './ui/Partie';
import Tutoriel, { tutorielVu, marquerTutorielVu } from './ui/Tutoriel';
import type { Config } from './sauvegarde';
import type { Lien } from './reseau/pair';

const BASE = import.meta.env.BASE_URL;

type Ecran = 'intro' | 'menu' | 'partie';

export interface Depart {
  config: Config;
  coups?: string[];
  lien?: Lien;
}

const CLE_SON = 'paisho.son';

export default function App() {
  const conteneur = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<ScenePaiSho | null>(null);
  const [progres, setProgres] = useState(0);
  const [ecran, setEcran] = useState<Ecran>('intro');
  const [rideau, setRideau] = useState(true);
  const [langue, setLangue] = useState<Langue>(langueSauvee);
  const [son, setSon] = useState(() => { try { return localStorage.getItem(CLE_SON) !== '0'; } catch { return true; } });
  const [depart, setDepart] = useState<Depart | null>(null);
  const [tuto, setTuto] = useState(false);
  // Chaque partie lancée porte un numéro neuf : « Nouvelle partie »
  // remonte la partie de zéro même quand la configuration ne change pas.
  const [manche, setManche] = useState(0);
  const t = TEXTES[langue];

  // La scène, une seule fois. L'entrée en matière attend au moins
  // 0.8 s de préchargeur et la fin du chargement, puis la caméra
  // traverse la salle jusqu'à la table.
  useEffect(() => {
    const el = conteneur.current!;
    const s = new ScenePaiSho(el, { surProgres: setProgres });
    setScene(s);
    (window as unknown as { __scene: ScenePaiSho }).__scene = s;
    let vivant = true;
    const minimum = new Promise((ok) => window.setTimeout(ok, 800));
    Promise.all([s.pret, minimum]).then(() => {
      if (!vivant) return;
      setRideau(false);
      s.entree(2.4).then(() => {
        if (!vivant) return;
        setEcran('menu');
        s.deriver(true);
      });
    });
    return () => { vivant = false; s.detruire(); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = langue === 'FR' ? 'fr' : 'en';
    sauverLangue(langue);
  }, [langue]);

  useEffect(() => { try { localStorage.setItem(CLE_SON, son ? '1' : '0'); } catch { /* privé */ } }, [son]);

  const lancer = useCallback((d: Depart) => {
    setDepart(d);
    setManche((n) => n + 1);
    setEcran('partie');
    if (!tutorielVu('paisho')) window.setTimeout(() => setTuto(true), 1600);
  }, []);

  const versMenu = useCallback(() => {
    setEcran('menu');
    setDepart(null);
    scene?.cadrer({ gauche: 0, droite: 0, haut: 0, bas: 0 });
    scene?.deriver(true);
  }, [scene]);

  return (
    <div className="app">
      <div ref={conteneur} className="scene" />

      <div className={`rideau ${rideau ? '' : 'leve'}`} aria-hidden={!rideau}>
        <img src={`${BASE}tuiles/LOTUS.webp`} alt="" className="rideau-lotus" />
        <p className="rideau-titre">{t.titre}</p>
        <div className="rideau-barre"><span style={{ width: `${Math.round(progres * 100)}%` }} /></div>
        <p className="rideau-texte">{t.chargement}</p>
      </div>

      {ecran === 'menu' && scene && (
        <Menu
          langue={langue}
          son={son}
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
