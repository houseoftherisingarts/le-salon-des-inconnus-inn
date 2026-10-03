// ─── Le menu : des panneaux de verre sur la taverne vivante ─────────

import { useEffect, useRef, useState } from 'react';
import { NIVEAUX_POSSIBLES, nomNiveau, type Niveau } from '../moteur/niveaux';
import { nomDadversaire } from '../scene/noms';
import { ADVERSAIRES, adversaire } from '../jeu/adversaires';
import { configDepuis, lireSauvegarde } from '../sauvegarde';
import { Lien, idValide, joueurLocal, sauverJoueur, type EtatLien, type Joueur } from '../reseau/pair';
import { TEXTES, type Langue } from './textes';
import type { Camp } from '../jeu/logic';
import type { Depart } from '../App';
import type { ScenePaiSho } from '../scene/scene';
import Skins from './Skins';

const BASE = import.meta.env.BASE_URL;

interface Props {
  langue: Langue;
  son: boolean;
  scene: ScenePaiSho;
  onLangue: () => void;
  onSon: () => void;
  onLancer: (d: Depart) => void;
  onTutoriel: () => void;
}

const CLE_ADVERSAIRE = 'paisho.adversaire';

export default function Menu({ langue, son, scene, onLangue, onSon, onLancer, onTutoriel }: Props) {
  const t = TEXTES[langue];
  const fr = langue === 'FR';
  const [niveau, setNiveau] = useState<Niveau>(3);
  // « maison » ou l'identifiant d'un personnage; le choix se garde.
  const [adv, setAdv] = useState<string>(() => { try { return localStorage.getItem(CLE_ADVERSAIRE) ?? 'maison'; } catch { return 'maison'; } });
  const perso = adversaire(adv);
  const niveauJoue: Niveau = perso ? perso.niveau : niveau;
  const choisirAdv = (id: string) => { setAdv(id); try { localStorage.setItem(CLE_ADVERSAIRE, id); } catch { /* privé */ } };
  // Le personnage choisi prend place en face de la table dès le menu.
  useEffect(() => { scene.placerAdversaire(perso?.id ?? null); }, [scene, perso]);
  const [cote, setCote] = useState<Camp>('hote');
  const [tourner, setTourner] = useState(true);
  const [joueur, setJoueur] = useState<Joueur>(joueurLocal);
  const [idAutre, setIdAutre] = useState('');
  const [etatLien, setEtatLien] = useState<EtatLien | null>(null);
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState(false);
  const lien = useRef<Lien | null>(null);
  const lance = useRef(false);
  const sauvegarde = lireSauvegarde();
  const monNom = joueur.nom.trim() || t.vous;

  // Un lien ouvert puis abandonné au menu se ferme proprement.
  useEffect(() => () => { if (!lance.current) lien.current?.fermer(); }, []);

  const changerNom = (nom: string) => {
    const j = { ...joueur, nom: nom.slice(0, 24) };
    setJoueur(j);
    sauverJoueur(j);
  };

  const contreMaison = () => {
    const nomAdv = perso ? perso.nom : nomDadversaire(fr);
    onLancer({
      config: {
        mode: 'maison', niveau: niveauJoue, campLocal: cote, tourner: false,
        noms: cote === 'hote' ? { hote: monNom, invite: nomAdv } : { hote: nomAdv, invite: monNom },
      },
    });
  };

  const aDeux = () => onLancer({
    config: {
      mode: 'deux', niveau: 1, campLocal: 'hote', tourner,
      noms: { hote: t.joueur1, invite: t.joueur2 },
    },
  });

  const distance = (camp: Camp) => {
    setErreur('');
    lien.current?.fermer();
    const l = new Lien(joueur, {
      surEtat: (e, detail) => {
        setEtatLien(e);
        if (e === 'erreur') setErreur(detail === 'id' ? t.erreurId : t.erreurReseau);
      },
      surMessage: (m) => {
        if (m.type !== 'bonjour' || lance.current) return;
        lance.current = true;
        const autre = m.nom.trim() || t.adversaire;
        onLancer({
          lien: l,
          config: {
            mode: 'distance', niveau: 1, campLocal: camp, tourner: false,
            noms: camp === 'hote' ? { hote: monNom, invite: autre } : { hote: autre, invite: monNom },
          },
        });
      },
    });
    lien.current = l;
    if (camp === 'hote') l.ouvrir();
    else l.rejoindre(idAutre);
  };

  const copier = () => {
    navigator.clipboard?.writeText(joueur.id).then(() => {
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="menu">
      <header className="menu-tete">
        <img src={`${BASE}tuiles/LOTUS.webp`} alt="" className="menu-lotus" />
        <div>
          <h1 className="menu-titre">{t.titre}</h1>
          <p className="menu-sous">{t.sousTitre}</p>
        </div>
        <nav className="menu-outils">
          <button type="button" className="bouton discret" onClick={onTutoriel}>{t.tutoriel}</button>
          <button type="button" className="bouton discret" onClick={onLangue} lang={fr ? 'en' : 'fr'}>{t.langue}</button>
          <button type="button" className={`bouton discret ${son ? 'actif' : ''}`} onClick={onSon} aria-pressed={son}>
            {t.son} {son ? '●' : '○'}
          </button>
        </nav>
      </header>

      <section className="menu-cartes">
        {sauvegarde && (
          <article className="carte verre carte-reprendre">
            <h2 className="carte-titre">{t.reprendre}</h2>
            <p className="carte-aide">
              {sauvegarde.noms.hote} · {sauvegarde.noms.invite}
              <br />
              {sauvegarde.coups.length} {fr ? 'coups joués' : 'moves played'}
            </p>
            <button
              type="button"
              className="bouton or plein"
              onClick={() => onLancer({ config: configDepuis(sauvegarde), coups: sauvegarde.coups })}
            >
              {t.reprendre}
            </button>
          </article>
        )}

        <article className="carte verre">
          <h2 className="carte-titre">{t.contreMaison}</h2>
          <p className="carte-aide">{t.choisirAdversaire}</p>
          <div className="champ">
            <span className="etiquette">{t.adversaire}</span>
            <div className="persos" role="radiogroup">
              <button type="button" className={`perso ${adv === 'maison' ? 'choisi' : ''}`} role="radio" aria-checked={adv === 'maison'} onClick={() => choisirAdv('maison')}>{t.maison}</button>
              {ADVERSAIRES.map((a) => (
                <button key={a.id} type="button" className={`perso ${adv === a.id ? 'choisi' : ''}`} role="radio" aria-checked={adv === a.id} onClick={() => choisirAdv(a.id)} data-test={`adv-${a.id}`}>{a.nom}</button>
              ))}
            </div>
            {perso && <span className="petit perso-mot">« {fr ? perso.motFR : perso.motEN} »</span>}
          </div>
          <div className="champ">
            <span className="etiquette">{t.niveau}</span>
            <div className="niveau">
              <button type="button" className="rond" aria-label="-" onClick={() => setNiveau((n) => Math.max(1, n - 1) as Niveau)} disabled={!!perso || niveau === 1}>−</button>
              <span className="niveau-nom"><b>{niveauJoue}</b> {nomNiveau(niveauJoue, fr)}</span>
              <button type="button" className="rond" aria-label="+" onClick={() => setNiveau((n) => Math.min(10, n + 1) as Niveau)} disabled={!!perso || niveau === NIVEAUX_POSSIBLES.length}>+</button>
            </div>
          </div>
          <div className="champ">
            <span className="etiquette">{t.votreCote}</span>
            <div className="bascule">
              {(['hote', 'invite'] as Camp[]).map((c) => (
                <button key={c} type="button" className={cote === c ? 'choisi' : ''} onClick={() => setCote(c)} aria-pressed={cote === c}>
                  {c === 'hote' ? t.hote : t.invite}
                </button>
              ))}
            </div>
            <span className="petit">{cote === 'hote' ? t.hoteAide : t.inviteAide}</span>
          </div>
          <button type="button" className="bouton or plein" onClick={contreMaison} data-test="contre-maison">{t.jouerMaison}</button>
        </article>

        <Skins langue={langue} scene={scene} />

        <article className="carte verre">
          <h2 className="carte-titre">{t.aDeux}</h2>
          <p className="carte-aide">{t.aDeuxAide}</p>
          <label className="case">
            <input type="checkbox" checked={tourner} onChange={(e) => setTourner(e.target.checked)} />
            <span>{t.tourner}</span>
          </label>
          <button type="button" className="bouton plein" onClick={aDeux} data-test="a-deux">{t.jouerDeux}</button>
        </article>

        <article className="carte verre">
          <h2 className="carte-titre">{t.aDistance}</h2>
          <p className="carte-aide">{t.aDistanceAide}</p>
          <label className="champ">
            <span className="etiquette">{t.votreNom}</span>
            <input className="saisie" value={joueur.nom} maxLength={24} onChange={(e) => changerNom(e.target.value)} placeholder={t.vous} />
          </label>
          <div className="champ">
            <span className="etiquette">{t.votreId}</span>
            <div className="ligne-id">
              <code className="id">{joueur.id}</code>
              <button type="button" className="bouton discret" onClick={copier}>{copie ? t.copie : t.copier}</button>
            </div>
          </div>
          <button type="button" className="bouton plein" onClick={() => distance('hote')} disabled={etatLien === 'attente'}>{t.ouvrirTable}</button>
          <label className="champ">
            <span className="etiquette">{t.idAdversaire}</span>
            <div className="ligne-id">
              <input className="saisie" value={idAutre} onChange={(e) => setIdAutre(e.target.value)} placeholder="paisho-xxxxxxxx" spellCheck={false} autoCapitalize="off" />
              <button type="button" className="bouton discret" onClick={() => distance('invite')} disabled={!idValide(idAutre) || idAutre.trim() === joueur.id}>{t.rejoindre}</button>
            </div>
          </label>
          {etatLien === 'attente' && <p className="etat-lien">{t.attente}</p>}
          {etatLien === 'connexion' && <p className="etat-lien">{t.connexion}</p>}
          {erreur && <p className="etat-lien erreur">{erreur}</p>}
        </article>
      </section>
    </div>
  );
}
