// ─── La partie : le contrôleur et ce qui flotte autour du plateau ───
// L'état vit ici. Chaque coup, qu'il vienne d'un clic, de la maison ou
// de l'autre joueur à distance, passe par l'arbitre (`appliquerCoup`)
// avant d'être montré, écrit dans le journal et sauvé.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appliquerCoup, coupLegal, texteVerdict, TEXTES_ARBITRE } from '../jeu/arbitre';
import {
  coupDepuisTexte, coupEnTexte, coupsLegaux, harmonies, jouer,
  type Bonus, type Camp, type Coup, type EtatPaiSho, type TypeTuile,
} from '../jeu/logic';
import { choisirCoup } from '../jeu/cpu';
import { nouveauPenseur, type Penseur } from '../moteur/penseur';
import { nomNiveau } from '../moteur/niveaux';
import { ADVERSAIRES } from '../jeu/adversaires';
import type { Pt } from '../jeu/plateau';
import { LARGEUR_TELEPHONE, type ScenePaiSho } from '../scene/scene';
import { effacerSauvegarde, rejouer, sauver } from '../sauvegarde';
import type { EtatLien, Message } from '../reseau/pair';
import type { Depart } from '../App';
import { TEXTES, type Langue } from './textes';
import { Reserve, Journal, PanneauRegles, PanneauBonus } from './Panneaux';
import Fiches from './Fiches';

type Choix =
  | { type: 'aucun' }
  | { type: 'tuile'; de: Pt }
  | { type: 'reserve'; tuile: TypeTuile }
  | { type: 'bonus'; candidats: Coup[]; tuile: TypeTuile | null; etape: 0 | 1; point: Pt | null };

interface Props {
  scene: ScenePaiSho;
  depart: Depart;
  langue: Langue;
  onMenu: () => void;
  onNouvelle: () => void;
  onTutoriel: () => void;
  son: boolean;
}

// Le toc d'une tuile de bois posée sur le plateau : un bruit bref
// filtré autour de 900 Hz, sans fichier à charger.
let audio: AudioContext | null = null;
function toc(): void {
  try {
    audio ??= new AudioContext();
    const n = Math.floor(audio.sampleRate * 0.09);
    const tampon = audio.createBuffer(1, n, audio.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    const src = audio.createBufferSource();
    const filtre = audio.createBiquadFilter();
    filtre.type = 'bandpass'; filtre.frequency.value = 900; filtre.Q.value = 3;
    const gain = audio.createGain();
    gain.gain.value = 0.9;
    src.buffer = tampon;
    src.connect(filtre).connect(gain).connect(audio.destination);
    src.start();
  } catch { /* pas de son, la partie continue */ }
}

const autre = (c: Camp): Camp => (c === 'hote' ? 'invite' : 'hote');
const premierPoint = (b: Bonus): Pt => (b.type === 'accent' ? b.a : b.porte);

const CLE_SUGGESTIONS = 'paisho.suggestions';
const suggestionsSauvees = (): boolean => { try { return localStorage.getItem(CLE_SUGGESTIONS) !== '0'; } catch { return true; } };

/** Les coups simples (sans bonus) qui font naître une harmonie pour le camp au trait, là où la tuile arrive. */
function coupsHarmonieux(e: EtatPaiSho, legaux: Coup[]): Coup[] {
  const bons: Coup[] = [];
  for (const c of legaux) {
    if (c.type === 'deplacer' && c.bonus) continue;
    const arrivee = c.type === 'planter' ? c.porte : c.a;
    const apres = jouer(e, c);
    if (harmonies(apres).some((h) => h.camp === e.tour && (h.a === arrivee || h.b === arrivee))) bons.push(c);
  }
  return bons;
}

export default function Partie({ scene, depart, langue, onMenu, onNouvelle, onTutoriel, son }: Props) {
  const t = TEXTES[langue];
  const fr = langue === 'FR';
  const { config, lien } = depart;
  const initial = useMemo(() => rejouer(depart.coups ?? []), [depart]);
  const [etat, setEtat] = useState<EtatPaiSho>(initial.etat);
  const [coups, setCoups] = useState<string[]>(initial.coups);
  const [choix, setChoix] = useState<Choix>({ type: 'aucun' });
  const [occupe, setOccupe] = useState(false);
  const [reflechit, setReflechit] = useState(false);
  const [abandon, setAbandon] = useState<Camp | null>(null);
  const [regles, setRegles] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [etatLien, setEtatLien] = useState<EtatLien>(lien ? 'connecte' : 'fini');
  const [journalOuvert, setJournalOuvert] = useState(false);
  const penseur = useRef<Penseur | null>(null);
  const etatRef = useRef(etat);
  const coupsRef = useRef(coups);
  const sonRef = useRef(son);
  sonRef.current = son;
  etatRef.current = etat;
  coupsRef.current = coups;

  const estLocal = useCallback((c: Camp) => config.mode === 'deux' || c === config.campLocal, [config]);
  const fini = etat.verdict !== null || abandon !== null;
  const aMoi = !fini && !occupe && estLocal(etat.tour);
  const legaux = useMemo(() => (aMoi ? coupsLegaux(etat) : []), [aMoi, etat]);
  // Les suggestions : un anneau d'or sur chaque tuile qui peut former une
  // harmonie, puis sur les cases d'arrivée qui la forment une fois la
  // tuile choisie. Le réglage se garde d'une partie à l'autre.
  const [suggestions, setSuggestions] = useState<boolean>(suggestionsSauvees);
  const basculerSuggestions = () => {
    setSuggestions((s) => { try { localStorage.setItem(CLE_SUGGESTIONS, s ? '0' : '1'); } catch { /* privé */ } return !s; });
  };
  const harmonieux = useMemo(() => (suggestions && aMoi ? coupsHarmonieux(etat, legaux) : []), [suggestions, aMoi, etat, legaux]);
  const suggerees = useMemo(() => new Set(harmonieux.filter((c) => c.type === 'planter').map((c) => (c as { tuile: TypeTuile }).tuile)), [harmonieux]);
  // Outillage des tests de bout en bout : les coups jouables et l'état,
  // lus par le script de captures pour savoir où cliquer.
  useEffect(() => {
    (window as unknown as { __partie: unknown }).__partie = { legaux, etat, coups, choix: choix.type };
  });

  // Encadré dans le café-jeux du Salon, le jeu annonce la fin de chaque
  // partie à la page qui l'héberge, qui verse les pétales.
  useEffect(() => {
    if (!fini || window.parent === window) return;
    const gagnant = abandon ? autre(abandon) : etat.verdict?.type === 'victoire' ? etat.verdict.camp : null;
    window.parent.postMessage({ type: 'paisho:partie', gagnee: gagnant === config.campLocal, contre: config.mode, niveau: config.niveau }, '*');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fini]);

  // ── La mise en place ──────────────────────────────────────────────
  useEffect(() => {
    penseur.current = nouveauPenseur();
    scene.deriver(false);
    const cote = config.mode === 'deux' ? initial.etat.tour : config.campLocal;
    scene.placerConvives(config.mode === 'deux' ? 'hote' : config.campLocal);
    // Le personnage choisi au menu s'assoit en face; à deux ou à distance, la dame reprend sa place.
    const nomAdv = config.noms[autre(config.campLocal)];
    scene.placerAdversaire(config.mode === 'maison' ? ADVERSAIRES.find((a) => a.nom === nomAdv)?.id ?? null : null);
    scene.afficher(initial.etat);
    scene.montrerCibles([], null);
    void scene.tournerVers(cote, 1.6);
    return () => {
      penseur.current?.fermer();
      scene.montrerCibles([], null);
    };
  }, [scene, config, initial]);

  // Les panneaux disent à la scène quelle place ils prennent.
  useEffect(() => {
    const mesurer = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const r = (s: string) => document.querySelector(s)?.getBoundingClientRect();
      const g = r('.hud-gauche'), d = r('.hud-droite'), h = r('.hud-haut'), b = r('.hud-bas');
      if (W <= LARGEUR_TELEPHONE) {
        scene.cadrer({ gauche: 0, droite: 0, haut: h ? h.bottom + 4 : 0, bas: b ? H - b.top + 4 : 0 });
      } else {
        scene.cadrer({
          gauche: g ? g.right + 8 : 0, droite: d ? W - d.left + 8 : 0, haut: h ? h.bottom + 4 : 0, bas: 16,
        });
      }
    };
    const id = window.setTimeout(mesurer, 50);
    window.addEventListener('resize', mesurer);
    return () => { window.clearTimeout(id); window.removeEventListener('resize', mesurer); };
  }, [scene]);

  // ── Jouer un coup ─────────────────────────────────────────────────
  const jouerCoup = useCallback(async (c: Coup, venuDeLoin = false) => {
    const avant = etatRef.current;
    const apres = appliquerCoup(avant, c);
    if (apres === avant) return false;
    const texte = coupEnTexte(c);
    const liste = [...coupsRef.current, texte];
    etatRef.current = apres;
    coupsRef.current = liste;
    setChoix({ type: 'aucun' });
    scene.montrerCibles([], null);
    setOccupe(true);
    setEtat(apres);
    setCoups(liste);
    if (lien && !venuDeLoin) lien.envoyer({ type: 'coup', texte, n: liste.length - 1 });
    if (config.mode !== 'distance') {
      if (apres.verdict) effacerSauvegarde();
      else sauver(config, liste);
    }
    await scene.afficher(apres, c);
    if (sonRef.current) toc();
    if (config.mode === 'deux' && config.tourner && !apres.verdict) await scene.tournerVers(apres.tour);
    setOccupe(false);
    return true;
  }, [scene, lien, config]);

  // ── La maison ─────────────────────────────────────────────────────
  useEffect(() => {
    if (config.mode !== 'maison' || fini || occupe) return;
    const p = penseur.current;
    if (!p) return;
    if (estLocal(etat.tour)) {
      p.anticiper('paisho', 'defaut', etat, config.niveau);
      return;
    }
    let vivant = true;
    setReflechit(true);
    const debut = performance.now();
    p.demanderCoup<Coup>('paisho', 'defaut', etat, config.niveau).then(async (c) => {
      if (!vivant) return;
      // Le repli : si le travailleur n'a rien rendu, la machine
      // réfléchit ici même plutôt que de laisser la partie en plan.
      const coup = c && coupLegal(etat, c) ? c : choisirCoup(etat, config.niveau);
      // Un temps de réflexion visible, même quand la réponse est instantanée.
      const reste = 650 - (performance.now() - debut);
      if (reste > 0) await new Promise((ok) => window.setTimeout(ok, reste));
      if (!vivant) return;
      setReflechit(false);
      if (coup) await jouerCoup(coup);
    });
    return () => { vivant = false; setReflechit(false); };
  }, [etat, fini, occupe, config, estLocal, jouerCoup]);

  // ── L'autre joueur, à distance ────────────────────────────────────
  const recevoir = useCallback((m: Message) => {
    if (m.type === 'coup') {
      let c: Coup | null = null;
      try { c = coupDepuisTexte(m.texte); } catch { c = null; }
      if (m.n !== coupsRef.current.length || !c || !coupLegal(etatRef.current, c)) {
        // Un désaccord : l'hôte fait foi et renvoie sa liste.
        if (config.campLocal === 'hote') lien?.envoyer({ type: 'resync', coups: coupsRef.current });
        else lien?.envoyer({ type: 'demandeResync' });
        return;
      }
      void jouerCoup(c, true);
    } else if (m.type === 'demandeResync') {
      lien?.envoyer({ type: 'resync', coups: coupsRef.current });
    } else if (m.type === 'resync') {
      const r = rejouer(m.coups);
      if (r.coups.length !== m.coups.length) return;
      etatRef.current = r.etat;
      coupsRef.current = r.coups;
      setEtat(r.etat);
      setCoups(r.coups);
      setAbandon(null);
      setChoix({ type: 'aucun' });
      void scene.afficher(r.etat);
    } else if (m.type === 'abandon') {
      setAbandon(autre(config.campLocal));
    } else if (m.type === 'bonjour' && config.campLocal === 'hote') {
      // L'invité revient après une coupure : il reçoit toute la partie.
      lien?.envoyer({ type: 'resync', coups: coupsRef.current });
    }
  }, [config, lien, jouerCoup, scene]);

  useEffect(() => {
    if (!lien) return;
    lien.e = { surEtat: (e) => setEtatLien(e), surMessage: recevoir };
  }, [lien, recevoir]);

  useEffect(() => () => lien?.fermer(), [lien]);

  // ── Les choix du joueur ───────────────────────────────────────────
  const ciblesDe = useCallback((ch: Choix): Pt[] => {
    if (ch.type === 'tuile') {
      return [...new Set(legaux.filter((c) => c.type === 'deplacer' && c.de === ch.de).map((c) => (c as { a: Pt }).a))];
    }
    if (ch.type === 'reserve') {
      return [...new Set(legaux.filter((c) => c.type === 'planter' && c.tuile === ch.tuile).map((c) => (c as { porte: Pt }).porte))];
    }
    if (ch.type === 'bonus' && ch.tuile) {
      const bs = ch.candidats.map((c) => (c as { bonus?: Bonus }).bonus).filter((b): b is Bonus => !!b && b.tuile === ch.tuile);
      if (ch.etape === 0) return [...new Set(bs.map(premierPoint))];
      return [...new Set(bs.filter((b) => b.type === 'accent' && b.a === ch.point && b.vers !== undefined).map((b) => (b as { vers: Pt }).vers))];
    }
    return [];
  }, [legaux]);

  useEffect(() => {
    scene.montrerCibles(ciblesDe(choix), choix.type === 'tuile' ? choix.de : null);
  }, [choix, ciblesDe, scene]);

  const annulerBonus = useCallback(() => {
    setChoix({ type: 'aucun' });
    void scene.afficher(etatRef.current);
  }, [scene]);

  const choisirBonus = useCallback((tuile: TypeTuile | null) => {
    if (choix.type !== 'bonus') return;
    const sans = choix.candidats.find((c) => c.type === 'deplacer' && !c.bonus)!;
    if (tuile === null) { void jouerCoup(sans); return; }
    const avec = choix.candidats.filter((c) => c.type === 'deplacer' && c.bonus?.tuile === tuile);
    if (avec.length === 1) { void jouerCoup(avec[0]); return; }
    setChoix({ ...choix, tuile, etape: 0, point: null });
  }, [choix, jouerCoup]);

  const clic = useCallback((p: Pt | null) => {
    if (!aMoi) return;
    if (choix.type === 'bonus') {
      if (!choix.tuile || p === null || !ciblesDe(choix).includes(p)) return;
      const avec = choix.candidats.filter((c) => {
        const b = c.type === 'deplacer' ? c.bonus : undefined;
        if (!b || b.tuile !== choix.tuile) return false;
        return choix.etape === 0 ? premierPoint(b) === p : b.type === 'accent' && b.a === choix.point && b.vers === p;
      });
      if (avec.length === 1) void jouerCoup(avec[0]);
      else if (avec.length > 1) setChoix({ ...choix, etape: 1, point: p });
      return;
    }
    if (p !== null && choix.type !== 'aucun' && ciblesDe(choix).includes(p)) {
      if (choix.type === 'reserve') {
        const c = legaux.find((x) => x.type === 'planter' && x.tuile === choix.tuile && x.porte === p);
        if (c) void jouerCoup(c);
        return;
      }
      if (choix.type === 'tuile') {
        const candidats = legaux.filter((x) => x.type === 'deplacer' && x.de === choix.de && x.a === p);
        if (candidats.length === 1) { void jouerCoup(candidats[0]); return; }
        // Plusieurs coups partagent ce trajet : une harmonie est née et
        // un geste de plus s'offre. La tuile se pose tout de suite, le
        // panneau propose le bonus.
        const sans = candidats.find((x) => x.type === 'deplacer' && !x.bonus)!;
        void scene.afficher(jouer(etatRef.current, sans), sans);
        setChoix({ type: 'bonus', candidats, tuile: null, etape: 0, point: null });
        return;
      }
    }
    // Une de mes tuiles qui peut bouger devient la sélection.
    if (p !== null && legaux.some((c) => c.type === 'deplacer' && c.de === p)) {
      setChoix({ type: 'tuile', de: p });
      return;
    }
    setChoix({ type: 'aucun' });
  }, [aMoi, choix, ciblesDe, legaux, jouerCoup, scene]);

  useEffect(() => { scene.surClic = clic; }, [scene, clic]);

  const choisirReserve = (tuile: TypeTuile) => {
    if (!aMoi || choix.type === 'bonus') return;
    setChoix(choix.type === 'reserve' && choix.tuile === tuile ? { type: 'aucun' } : { type: 'reserve', tuile });
  };

  const abandonner = () => {
    setConfirmer(false);
    const qui = config.mode === 'deux' ? etat.tour : config.campLocal;
    setAbandon(qui);
    penseur.current?.arreter();
    effacerSauvegarde();
    lien?.envoyer({ type: 'abandon' });
  };

  const nouvelle = () => {
    if (lien) lien.envoyer({ type: 'resync', coups: [] });
    effacerSauvegarde();
    if (lien) recevoir({ type: 'resync', coups: [] });
    else onNouvelle();
  };

  // ── Ce que la page dit ────────────────────────────────────────────
  const nom = (c: Camp) => config.noms[c];
  const plantables = new Set(legaux.filter((c) => c.type === 'planter').map((c) => (c as { tuile: TypeTuile }).tuile));
  const ta = TEXTES_ARBITRE[langue];
  let titreFin = '', texteFin = '';
  if (abandon) {
    titreFin = ta.titreVictoire;
    texteFin = config.mode === 'distance' && abandon === config.campLocal ? t.abandonVous
      : config.mode === 'maison' && abandon === config.campLocal ? t.abandonVous : t.abandonLui(nom(abandon));
  } else if (etat.verdict) {
    titreFin = etat.verdict.type === 'victoire' ? ta.titreVictoire : ta.titreNulle;
    texteFin = texteVerdict(etat.verdict, fr) ?? '';
  }
  const vainqueur = abandon ? autre(abandon) : etat.verdict?.type === 'victoire' ? etat.verdict.camp : null;
  // Le joueur seul devant son écran qui perd lit « Défaite », pas « Victoire ».
  if (vainqueur && config.mode !== 'deux' && vainqueur !== config.campLocal) titreFin = t.defaite;

  let consigne = '';
  if (aMoi) {
    if (choix.type === 'bonus') consigne = choix.tuile ? t.bonusCible : '';
    else if (choix.type === 'reserve') consigne = t.choisirPorte;
    else if (etat.numero === 0) consigne = t.ouverture;
  }

  const statut = config.mode === 'maison'
    ? `${t.niveau} ${config.niveau} · ${nomNiveau(config.niveau, fr)}`
    : config.mode === 'distance' ? (etatLien === 'connecte' ? t.connecte : etatLien === 'perdu' ? t.perdue : t.partieDistance)
      : t.aDeux;

  const reserve = (c: Camp) => (
    <Reserve
      etat={etat} camp={c} langue={langue} nom={nom(c)}
      actif={aMoi && etat.tour === c && choix.type !== 'bonus'}
      plantables={plantables}
      choisie={choix.type === 'reserve' && etat.tour === c ? choix.tuile : null}
      onChoisir={choisirReserve}
    />
  );
  // À deux, les panneaux de côté gardent l'ordre de la barre du haut
  // (l'hôte à gauche) ; la feuille du téléphone montre la main au trait.
  const basLocal: Camp = config.mode === 'deux' ? 'hote' : config.campLocal;
  const mainAuTrait: Camp = config.mode === 'deux' ? etat.tour : config.campLocal;

  return (
    <div className={`hud ${fini ? 'fini' : ''}`}>
      <header className="hud-haut verre">
        {(['hote', 'invite'] as Camp[]).map((c) => (
          <div key={c} className={`joueur ${etat.tour === c && !fini ? 'au-trait' : ''} ${c}`}>
            <span className="pastille" aria-hidden />
            <span className="joueur-nom">{nom(c)}</span>
            <span className="joueur-role">{c === 'hote' ? t.hote : t.invite}</span>
            {etat.tour === c && !fini && (
              <span className="joueur-etat">{reflechit && !estLocal(c) ? <>{t.reflechit}<i className="points" /></> : t.auTrait}</span>
            )}
          </div>
        ))}
        <p className="statut">{statut}</p>
        <nav className="hud-boutons">
          <button type="button" className="bouton discret" onClick={() => setRegles(true)}>{t.regles}</button>
          <button type="button" className="bouton discret" onClick={onTutoriel}>{t.tutoriel}</button>
          <button type="button" className="bouton discret" onClick={() => setConfirmer(true)} disabled={fini}>{t.abandonner}</button>
          <button type="button" className="bouton discret" onClick={onMenu}>{t.menu}</button>
        </nav>
      </header>

      <aside className="hud-gauche">
        <div data-tuto="reserve">{reserve(basLocal)}</div>
        <Fiches langue={langue} />
      </aside>

      <aside className="hud-droite">
        {reserve(autre(basLocal))}
        <div data-tuto="journal" className="journal-bloc"><Journal coups={coups} langue={langue} /></div>
      </aside>

      <footer className="hud-bas verre">
        <div className="bas-reserve">{reserve(mainAuTrait)}<Fiches langue={langue} /></div>
        <div className="bas-boutons">
          <button type="button" className="bouton discret" onClick={() => setJournalOuvert((x) => !x)}>{t.journal}</button>
          <button type="button" className="bouton discret" onClick={() => setRegles(true)}>{t.regles}</button>
          <button type="button" className="bouton discret" onClick={() => setConfirmer(true)} disabled={fini}>{t.abandonner}</button>
          <button type="button" className="bouton discret" onClick={onMenu}>{t.menu}</button>
        </div>
        {journalOuvert && <Journal coups={coups} langue={langue} />}
      </footer>

      {consigne && <p className="consigne verre">{consigne}</p>}

      {aMoi && choix.type === 'bonus' && !choix.tuile && (
        <PanneauBonus candidats={choix.candidats} langue={langue} onChoisir={choisirBonus} onAnnuler={annulerBonus} />
      )}
      {aMoi && choix.type === 'bonus' && choix.tuile && (
        <div className="bonus-annuler">
          <button type="button" className="bouton discret" onClick={() => setChoix({ ...choix, tuile: null, etape: 0, point: null })}>{t.annuler}</button>
        </div>
      )}

      {config.mode === 'distance' && (etatLien === 'perdu' || etatLien === 'fini') && !fini && (
        <div className="bandeau verre" role="status">
          <p>{etatLien === 'perdu' ? t.perdue : t.perdueFin}</p>
          {etatLien === 'fini' && <button type="button" className="bouton or" onClick={onMenu}>{t.menu}</button>}
        </div>
      )}

      {confirmer && (
        <div className="voile" onClick={() => setConfirmer(false)}>
          <div className="dialogue verre" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialogue-titre">{t.confirmerAbandon}</h2>
            <div className="dialogue-gestes">
              <button type="button" className="bouton discret" onClick={() => setConfirmer(false)}>{t.non}</button>
              <button type="button" className="bouton or" onClick={abandonner}>{t.oui}</button>
            </div>
          </div>
        </div>
      )}

      {fini && !occupe && (
        <div className="voile verdict">
          <div className="dialogue verre">
            <h2 className="dialogue-titre">{titreFin}</h2>
            {vainqueur && <p className="verdict-nom">{t.remporte(nom(vainqueur))}</p>}
            <p className="dialogue-texte">{texteFin}</p>
            <div className="dialogue-gestes">
              <button type="button" className="bouton discret" onClick={onMenu}>{t.menu}</button>
              <button type="button" className="bouton or" onClick={nouvelle}>{t.nouvellePartie}</button>
            </div>
          </div>
        </div>
      )}

      {regles && <PanneauRegles langue={langue} onFermer={() => setRegles(false)} />}
    </div>
  );
}
