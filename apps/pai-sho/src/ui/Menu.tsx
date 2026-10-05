// ─── Le menu : des panneaux de verre sur la taverne vivante ─────────

import { useEffect, useRef, useState } from 'react';
import { NIVEAUX_POSSIBLES, nomNiveau, type Niveau } from '../moteur/niveaux';
import { nomDadversaire } from '../scene/noms';
import { ADVERSAIRES, ECHELONS, adversaire, figurinesDessin, nomAdversaire, sauverFigurines, vuDEnFace, type Adversaire } from '../jeu/adversaires';
import { adversaireOuvert, avatarOuvert, battus, echelonDe, estBattu, prochainDefi, toutBattu } from '../jeu/progression';
import Volume from './Volume';
import { configDepuis, lireSauvegarde } from '../sauvegarde';
import { Lien, garderAmi, joueurLocal, sauverJoueur, type EtatLien, type Joueur } from '../reseau/pair';
import { rafraichirCompte, renommerCompte, useCompte } from '../reseau/social/compte';
import { LIEN_MS, quitterFile, retirerTable } from '../reseau/social/defis';
import { majProfilJeu } from '../reseau/social/profil';
import { useSocial } from '../reseau/social/useSocial';
import Communaute from './communaute/Communaute';
import { DefiRecu, type JeuDistance } from './communaute/Defis';
import type { Defi } from '../reseau/social/defis';
import { Visage } from './communaute/Visage';
import { TEXTES, type Langue } from './textes';
import type { Camp } from '../jeu/logic';
import type { Depart } from '../App';
import type { ScenePaiSho } from '../scene/scene';
import Skins from './Skins';
import Splash, { ChoixNom } from './Splash';

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

export default function Menu({ langue, son, scene, onLangue, onSon, onLancer, onTutoriel }: Props) {
  const t = TEXTES[langue];
  const fr = langue === 'FR';
  const [niveau, setNiveau] = useState<Niveau>(3);
  // La campagne monte l'échelle une figure à la fois : le premier adversaire
  // ouvert et pas encore battu; toute l'échelle vaincue, elle rejoue le dernier.
  const enCampagne = adversaire(prochainDefi()) ?? ADVERSAIRES[0];
  // La statuette assise en face au menu : la campagne, ou celle qu'on regarde
  // à l'écran des niveaux. Toute statuette se regarde; seules les ouvertes se jouent.
  const [adv, setAdv] = useState<string>(enCampagne.id);
  const perso = adversaire(adv) ?? ADVERSAIRES[0];
  const advOuvert = adversaireOuvert(perso.id);
  // Toute l'échelle vaincue : le niveau se règle à la main, entraînement libre.
  const libre = toutBattu();
  // Où en est la montée : le niveau le plus haut déjà ouvert, et le compte des vaincus.
  let marcheCourante = 0;
  ECHELONS.forEach((e, i) => { if (adversaireOuvert(e[0])) marcheCourante = i; });
  const nbBattus = battus().filter((id) => adversaire(id)).length;
  const [niveauxOuverts, setNiveauxOuverts] = useState(false);
  const [communauteOuverte, setCommunauteOuverte] = useState(false);
  const [avatarsOuverts, setAvatarsOuverts] = useState(false);
  const [nomOuvert, setNomOuvert] = useState(false);
  // Le match qui attend la fin de l'écran « VS ».
  const [vs, setVs] = useState<{ depart: Depart; perso: Adversaire } | null>(null);
  // Le personnage choisi prend place en face de la table dès le menu.
  const [dessin, setDessin] = useState(figurinesDessin);
  useEffect(() => { scene.placerAdversaire(perso?.id ?? null); }, [scene, perso]);
  const changerFigurines = () => {
    sauverFigurines(!dessin); setDessin(!dessin);
    scene.placerAdversaire(null); scene.placerAdversaire(perso?.id ?? null);
  };
  const [cote, setCote] = useState<Camp>('hote');
  const [tourner, setTourner] = useState(true);
  const [joueur, setJoueur] = useState<Joueur>(joueurLocal);
  const [etatLien, setEtatLien] = useState<EtatLien | null>(null);
  const [erreur, setErreur] = useState('');
  const [essai, setEssai] = useState<string | null>(null);
  const [defiVu, setDefiVu] = useState<string | null>(null);
  const lien = useRef<Lien | null>(null);
  const delai = useRef(0);
  const lance = useRef(false);
  const sauvegarde = lireSauvegarde();
  // Connecté, le nom du compte remplace le nom de l'appareil partout : menu, écran VS, « bonjour ».
  const compte = useCompte();
  const uid = compte.user?.uid;
  const social = useSocial(uid);
  const monNom = (uid && compte.nom) || joueur.nom.trim() || t.vous;
  const vignette = (id: string) => `${BASE}models/convives/vignettes/${id}${dessin ? '2' : ''}.webp`;
  /** Le grand portrait (1024 px, fond transparent) de l'écran VS. */
  const grand = (id: string) => `${BASE}models/convives/grands/${id}${dessin ? '2' : ''}.webp`;

  // Un lien ouvert puis abandonné au menu se ferme proprement, et la table
  // publiée ou la place en file s'effacent avec lui (onglet fermé compris).
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const effacer = () => { const u = uidRef.current; if (u) { void quitterFile(u).catch(() => {}); void retirerTable(u).catch(() => {}); } };
  useEffect(() => {
    window.addEventListener('beforeunload', effacer);
    return () => { window.removeEventListener('beforeunload', effacer); window.clearTimeout(delai.current); if (!lance.current) { lien.current?.fermer(); effacer(); } };
  }, []);

  const changerNom = (nom: string) => {
    if (uid) { void renommerCompte(nom).catch(() => {}); setNomOuvert(false); return; }
    const j = { ...joueur, nom: nom.slice(0, 16) };
    setJoueur(j);
    sauverJoueur(j);
    setNomOuvert(false);
  };
  const changerAvatar = (avatar: string | undefined) => {
    const j = { ...joueur, avatar };
    setJoueur(j);
    sauverJoueur(j);
    if (uid) { void majProfilJeu(uid, { avatar: avatar ?? '' }).catch(() => {}); rafraichirCompte(); }
  };

  // Campagne ou adversaire choisi : l'écran « VS » d'abord, la partie ensuite.
  const contre = (a: Adversaire) => {
    const nomAdv = nomAdversaire(a, fr) || nomDadversaire(fr);
    setVs({
      perso: a,
      depart: {
        config: {
          mode: 'maison', niveau: libre ? niveau : a.niveau, campLocal: cote, tourner: false, adversaire: a.id, tempsMs: libre ? undefined : a.tempsMs,
          noms: cote === 'hote' ? { hote: monNom, invite: nomAdv } : { hote: nomAdv, invite: monNom },
        },
      },
    });
  };

  // La leçon : Iroh en face, l'élève tient l'hôte et ouvre.
  const lecon = () => onLancer({
    config: { mode: 'lecon', niveau: 9, campLocal: 'hote', tourner: false, noms: { hote: monNom, invite: 'Iroh' } },
  });

  const aDeux = () => onLancer({
    config: {
      mode: 'deux', niveau: 1, campLocal: 'hote', tourner,
      noms: { hote: t.joueur1, invite: t.joueur2 },
    },
  });

  const distance = (camp: Camp, id = '') => {
    setErreur(''); setEssai(null);
    window.clearTimeout(delai.current);
    lien.current?.fermer();
    const l = new Lien({ ...joueur, nom: monNom }, {
      surEtat: (e, detail) => {
        setEtatLien(e);
        if (e === 'erreur') setErreur(detail === 'id' ? t.erreurId : t.erreurReseau);
      },
      surMessage: (m) => {
        if (m.type !== 'bonjour' || lance.current) return;
        lance.current = true;
        window.clearTimeout(delai.current);
        effacer();
        // La personne en face entre au carnet, sous le nom qu'elle donne.
        const enFace = l.idEnFace();
        if (enFace) garderAmi(enFace, m.nom, joueur.id);
        const autre = m.nom.trim() || t.adversaire;
        // Chacun se voit tel qu'il s'est choisi; l'autre, s'il a pris le même, change de visage d'ici.
        const avatarAutre = vuDEnFace(m.avatar, joueur.avatar);
        onLancer({
          lien: l,
          config: {
            mode: 'distance', niveau: 1, campLocal: camp, tourner: false,
            noms: camp === 'hote' ? { hote: monNom, invite: autre } : { hote: autre, invite: monNom },
            avatars: camp === 'hote' ? { hote: joueur.avatar ?? null, invite: avatarAutre } : { hote: avatarAutre, invite: joueur.avatar ?? null },
          },
        });
      },
    });
    lien.current = l;
    if (camp === 'hote') { l.ouvrir(); return; }
    l.rejoindre(id);
    // Sans relais TURN, certains réseaux ne laissent pas passer le lien : au bout de 20 secondes, on le dit et on offre un nouvel essai.
    delai.current = window.setTimeout(() => {
      if (lance.current || lien.current !== l) return;
      l.fermer(); lien.current = null; setEtatLien(null);
      setErreur(t.social.lienLent); setEssai(id);
    }, LIEN_MS);
  };

  const jeu: JeuDistance = {
    peerId: joueur.id,
    etat: etatLien,
    erreur,
    ouvrir: () => distance('hote'),
    rejoindre: (id) => distance('invite', id.trim()),
    fermer: () => {
      if (lance.current) return;
      window.clearTimeout(delai.current);
      lien.current?.fermer(); lien.current = null;
      setEtatLien(null); setErreur('');
      if (uid) void retirerTable(uid).catch(() => {});
    },
  };
  // Le défi reçu se fige à l'ouverture : accepté, il quitte la liste des défis en attente, mais le dialogue doit rester jusqu'au lien.
  const [defiRecu, setDefiRecu] = useState<Defi | null>(null);
  const prochainDefiRecu = social.defis.find((d) => d.id !== defiVu);
  useEffect(() => { if (!defiRecu && prochainDefiRecu) setDefiRecu(prochainDefiRecu); }, [defiRecu, prochainDefiRecu]);

  return (
    <div className="menu">
      <header className="menu-tete">
        <img src={`${BASE}tuiles/LOTUS.webp`} alt="" className="menu-lotus" />
        <div>
          <h1 className="menu-titre">{t.titre} <span className="menu-beta">{t.beta}</span></h1>
          <p className="menu-sous">{t.sousTitre}</p>
        {sauvegarde && (
          <div className="reprendre verre" data-test="reprendre">
            <span className="carte-aide">
              {[sauvegarde.noms.hote, sauvegarde.noms.invite].map((n) => (n === 'Vous' || n === 'You' ? monNom : n)).join(fr ? ' contre ' : ' vs ')} · {sauvegarde.coups.length} {fr ? 'coups' : 'moves'}
            </span>
            <button
              type="button"
              className="bouton or plein"
              onClick={() => onLancer({ config: configDepuis(sauvegarde), coups: sauvegarde.coups })}
            >
              {t.reprendre}
            </button>
          </div>
        )}
        </div>
        <nav className="menu-outils">
          <button type="button" className="bouton discret" onClick={onTutoriel}>{t.tutoriel}</button>
          <button type="button" className="bouton discret" onClick={onLangue} lang={fr ? 'en' : 'fr'}>{t.langue}</button>
          <button type="button" className={`bouton discret ${son ? 'actif' : ''}`} onClick={onSon} aria-pressed={son}>
            {t.son} {son ? '●' : '○'}
          </button>
          <Volume etiquette={t.volume} />
        </nav>
      </header>

      {/* Un clic sur le titre d'une carte la replie ou la rouvre. */}
      <section className="menu-cartes" onClick={(e) => (e.target as Element).closest('.carte-titre')?.parentElement?.classList.toggle('fermee')}>

        <Skins langue={langue} scene={scene}>
          <div className="skin-rangee" data-test="avatar">
            <span className="etiquette">{t.votreAvatar} <b className="skin-actif">{joueur.avatar && adversaire(joueur.avatar) ? nomAdversaire(adversaire(joueur.avatar)!, fr) : t.sansPersonnage}</b></span>
            <button type="button" className="avatar-actuel" onClick={() => setAvatarsOuverts((x) => !x)} aria-expanded={avatarsOuverts} aria-label={t.votreAvatar} data-test="avatar-ouvrir">
              {joueur.avatar ? <img className="niveau-vignette" src={vignette(joueur.avatar)} alt="" /> : <span className="niveau-vignette avatar-vide"><img src={`${BASE}tuiles/LOTUS.webp`} alt="" /></span>}
            </button>
            {/* Seuls les visages gagnés se portent; le reste attend à l'échelle. */}
            {avatarsOuverts && (
              <div className="avatar-choix">
                <button type="button" className={`perso niveau-perso ${!joueur.avatar ? 'choisi' : ''}`} onClick={() => { changerAvatar(undefined); setAvatarsOuverts(false); }}>
                  <span className="niveau-vignette avatar-vide"><img src={`${BASE}tuiles/LOTUS.webp`} alt="" /></span><span>{t.sansPersonnage}</span>
                </button>
                {ADVERSAIRES.filter((a) => avatarOuvert(a.id)).map((a) => (
                  <button key={a.id} type="button" className={`perso niveau-perso ${joueur.avatar === a.id ? 'choisi' : ''}`} onClick={() => { changerAvatar(a.id); setAvatarsOuverts(false); }} data-test={`porter-${a.id}`}>
                    <img className="niveau-vignette" src={vignette(a.id)} alt="" loading="lazy" /><span>{nomAdversaire(a, fr)}</span>
                  </button>
                ))}
                {!ADVERSAIRES.some((a) => avatarOuvert(a.id)) && <span className="petit">{t.avatarAucun}</span>}
              </div>
            )}
          </div>
          <div className="skin-rangee">
            <span className="etiquette">{t.figurines}</span>
            <div className="bascule" data-test="figurines">
              <button type="button" className={!dessin ? 'choisi' : ''} onClick={() => dessin && changerFigurines()} aria-pressed={!dessin}>{t.peintes}</button>
              <button type="button" className={dessin ? 'choisi' : ''} onClick={() => !dessin && changerFigurines()} aria-pressed={dessin}>{t.dessinAnime}</button>
            </div>
          </div>
        </Skins>

        <article className="carte verre carte-campagne" data-test="campagne">
          <h2 className="carte-titre">{t.campagne}</h2>
          <p className="carte-aide">{t.choisirAdversaire}</p>
          <div className="joueur-ligne">
            <span className="joueur-nom nom-joueur">{monNom}</span>
            <button type="button" className="bouton discret crayon" onClick={() => setNomOuvert(true)} aria-label={t.modifierNom} title={t.modifierNom} data-test="modifier-nom">✎</button>
          </div>
          <div className="progres" data-test="progres">
            <span className="petit">{t.progres(marcheCourante + 1, ECHELONS.length, nbBattus, ADVERSAIRES.length)}</span>
            <span className="progres-barre"><span style={{ width: `${Math.round((nbBattus / ADVERSAIRES.length) * 100)}%` }} /></span>
          </div>
          <div className="defi" data-test="defi">
            <span className="defi-niveau">{t.niveau} {echelonDe(enCampagne.id) + 1}</span>
            <span className="defi-nom">{nomAdversaire(enCampagne, fr)}</span>
          </div>
          <span className="petit perso-mot">«&nbsp;{fr ? perso.motFR : perso.motEN}&nbsp;»</span>
          {!advOuvert && <span className="petit verrou-mot" data-test="verrou">{t.verrouille(ECHELONS.findIndex((e) => e.includes(perso.id)))}</span>}
          {libre && <div className="champ">
            <span className="etiquette">{t.niveau}</span>
            <div className="niveau">
              <button type="button" className="rond" aria-label="-" onClick={() => setNiveau((n) => Math.max(1, n - 1) as Niveau)} disabled={niveau === 1}>−</button>
              <span className="niveau-nom"><b>{niveau}</b> {nomNiveau(niveau, fr)}</span>
              <button type="button" className="rond" aria-label="+" onClick={() => setNiveau((n) => Math.min(10, n + 1) as Niveau)} disabled={niveau === NIVEAUX_POSSIBLES.length}>+</button>
            </div>
          </div>}
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
          <button type="button" className="bouton or plein" onClick={() => contre(enCampagne)} data-test="contre-maison">{t.affronter(nomAdversaire(enCampagne, fr))}</button>
          {libre && <span className="petit campagne-finie" data-test="campagne-finie">{t.campagneFinie(nomAdversaire(enCampagne, fr))}</span>}
          <button type="button" className="bouton discret" onClick={() => setNiveauxOuverts(true)} data-test="niveaux">{t.choisirUnAdversaire}</button>
          <button type="button" className="bouton discret" onClick={lecon} data-test="lecon">{t.lecon}</button>
        </article>


        <article className="carte verre">
          <h2 className="carte-titre">{t.aDeux}</h2>
          <p className="carte-aide">{t.aDeuxAide}</p>
          <label className="case">
            <input type="checkbox" checked={tourner} onChange={(e) => setTourner(e.target.checked)} />
            <span>{t.tourner}</span>
          </label>
          <button type="button" className="bouton plein" onClick={aDeux} data-test="a-deux">{t.jouerDeux}</button>
        </article>

        <article className="carte verre" data-test="communaute">
          <h2 className="carte-titre">{t.communaute}</h2>
          {uid ? (
            <div className="communaute-resume" data-test="communaute-resume">
              <Visage avatar={joueur.avatar} vignette={vignette} />
              <div>
                <span className="joueur-nom nom-joueur">{monNom}</span>
                <span className="petit">{t.social.amisEnLigne(social.amis.filter((a) => a.enLigne).length)}</span>
                {social.nonLus.length > 0 && <span className="petit non-lus">{t.social.nonLus(social.nonLus.length)}</span>}
              </div>
            </div>
          ) : <p className="carte-aide">{t.social.porteAide}</p>}
          <button type="button" className="bouton plein" onClick={() => setCommunauteOuverte(true)} data-test="communaute-ouvrir">{t.ouvrir}</button>
        </article>
      </section>

      {niveauxOuverts && (
        <div className="voile niveaux-voile" onClick={() => setNiveauxOuverts(false)} data-test="niveaux-ecran">
          <section className="niveaux" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.choisirUnAdversaire}>
            <header className="niveaux-tete">
              <div>
                <h2 className="niveaux-titre">{t.choisirUnAdversaire}</h2>
                <p className="petit">{t.choisirUnAdversaireAide}</p>
                <p className="petit">{t.progres(marcheCourante + 1, ECHELONS.length, nbBattus, ADVERSAIRES.length)}</p>
                <span className="progres-barre"><span style={{ width: `${Math.round((nbBattus / ADVERSAIRES.length) * 100)}%` }} /></span>
              </div>
              <button type="button" className="bouton discret" onClick={() => setNiveauxOuverts(false)}>{t.fermer}</button>
            </header>
            <ol className="niveaux-grille" data-test="echelle">
              {ECHELONS.map((e, i) => {
                const ouvert = adversaireOuvert(e[0]);
                const vaincue = e.some(estBattu);
                const courante = i === marcheCourante && !libre;
                return (
                  <li key={i} className={`niveau-carte verre ${ouvert ? '' : 'ferme'} ${courante ? 'courante' : ''} ${vaincue ? 'vaincue' : ''} ${i === ECHELONS.length - 1 ? 'sommet' : ''}`}>
                    <span className="niveau-no">{t.niveau} {i + 1}{vaincue && <i className="coche"> ✓</i>}</span>
                    {!ouvert && <span className="niveau-moteur">🔒 {fr ? 'Verrouillé' : 'Locked'}</span>}
                    {courante && <span className="ici">{t.iciVous}</span>}
                    <span className="niveau-persos">
                      {e.map((id, j) => {
                        const a = adversaire(id);
                        if (!a) return null;
                        return (
                          <span key={id} className="echelon-paire">
                            {j > 0 && <span className="echelon-ou">{fr ? 'ou' : 'or'}</span>}
                            <button type="button" className={`perso niveau-perso ${adv === id ? 'choisi' : ''} ${estBattu(id) ? 'battu' : ''}`} onClick={() => { setAdv(id); setNiveauxOuverts(false); if (ouvert) contre(a); }} data-test={`adv-${id}`}>
                              {/* La figurine photographiée par scripts/vignettes.mjs, dans le style choisi. */}
                              <img className="niveau-vignette" src={vignette(id)} alt="" />
                              <span>{nomAdversaire(a, fr)}{estBattu(id) && <i className="coche"> ✓</i>}</span>
                            </button>
                          </span>
                        );
                      })}
                    </span>
                  </li>
                );
              })}
              <li className="niveau-carte verre ferme korra" data-test="korra">
                <span className="niveau-no">✦ Korra</span>
                <span className="petit">{t.korraBientot}</span>
              </li>
            </ol>
          </section>
        </div>
      )}


      {communauteOuverte && (
        <Communaute langue={langue} compte={compte} social={social} jeu={jeu} joueur={joueur} monNom={monNom}
          battus={nbBattus} total={ADVERSAIRES.length} vignette={vignette} onAvatar={changerAvatar}
          peutReessayer={!!essai} onReessayer={() => essai && distance('invite', essai)}
          onFermer={() => setCommunauteOuverte(false)} />
      )}

      {defiRecu && (
        <DefiRecu key={defiRecu.id} langue={langue} defi={defiRecu} jeu={jeu} onFermer={() => { setDefiVu(defiRecu.id); setDefiRecu(null); }} />
      )}

      {(nomOuvert || (!joueur.nom.trim() && !(uid && compte.nom))) && (
        <ChoixNom langue={langue} initial={uid ? monNom : joueur.nom} max={uid ? 24 : 16} onValider={changerNom}
          onFermer={joueur.nom.trim() || uid ? () => setNomOuvert(false) : undefined} />
      )}

      {vs && (
        <Splash
          langue={langue}
          joueur={monNom}
          imageJoueur={joueur.avatar && adversaire(joueur.avatar) ? grand(joueur.avatar) : undefined}
          adversaire={nomAdversaire(vs.perso, fr)}
          idAdversaire={vs.perso.id}
          imageAdversaire={grand(vs.perso.id)}
          niveau={vs.perso.niveau}
          onFin={() => onLancer(vs.depart)}
        />
      )}
    </div>
  );
}
