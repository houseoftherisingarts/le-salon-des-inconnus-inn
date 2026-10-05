// ─── Le profil de joueur ────────────────────────────────────────────
// Une bannière (une des salles du jeu), l'avatar par-dessus (une
// statuette gagnée), le nom du compte, un mot sur soi, la campagne et le
// bilan en ligne. L'éditeur s'ouvre en dialogue.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { majMembre, suivreMembre } from '@inconnus/ui/reseau';
import { ADVERSAIRES, adversaire, nomAdversaire } from '../../jeu/adversaires';
import { avatarOuvert } from '../../jeu/progression';
import { DECORS } from '../../skins';
import { NOM_MAX, NOM_MIN, deconnecter, renommerCompte } from '../../reseau/social/compte';
import { BIO_JEU_MAX, imageBanniere, majProfilJeu, suivreProfilJeu, type ProfilJeu } from '../../reseau/social/profil';
import { TEXTES, type Langue } from '../textes';
import { Visage } from './Visage';

const BASE = import.meta.env.BASE_URL;

interface Props {
  langue: Langue;
  uid: string;
  nom: string;
  avatar?: string;
  battus: number;
  total: number;
  vignette: (id: string) => string;
  onAvatar: (id: string | undefined) => void;
}

export function ProfilCarte({ langue, uid, nom, avatar, battus, total, vignette, onAvatar }: Props) {
  const t = TEXTES[langue].social;
  const [bio, setBio] = useState('');
  const [jeu, setJeu] = useState<ProfilJeu>({});
  const [edition, setEdition] = useState(false);
  useEffect(() => suivreMembre(uid, (m) => setBio(m?.bio ?? '')), [uid]);
  useEffect(() => suivreProfilJeu(uid, setJeu), [uid]);
  // La campagne se joue sur l'appareil : son compte suit le profil.
  useEffect(() => { if (jeu.battus !== battus) void majProfilJeu(uid, { battus }).catch(() => {}); }, [uid, battus, jeu.battus]);

  return (
    <article className="carte verre profil-carte" data-test="profil">
      <div className="profil-banniere" style={{ backgroundImage: `url(${imageBanniere(jeu.banniere)})` }} />
      <div className="profil-entete">
        <Visage avatar={avatar} vignette={vignette} grand />
        <div className="profil-qui">
          <h2 className="carte-titre profil-nom">{nom}</h2>
          <span className="petit">{t.statCampagne(battus, total)}</span>
        </div>
      </div>
      <p className="profil-bio">{bio || <span className="petit">{t.bioVide}</span>}</p>
      <p className="petit profil-bilan">{t.bilan(jeu.victoires ?? 0, jeu.defaites ?? 0)}</p>
      <div className="rangee-boutons">
        <button type="button" className="bouton" onClick={() => setEdition(true)} data-test="profil-modifier">{t.modifierProfil}</button>
        <button type="button" className="bouton discret" onClick={() => void deconnecter()} data-test="deconnexion">{t.seDeconnecter}</button>
      </div>
      {edition && (
        <ProfilEditeur langue={langue} uid={uid} nom={nom} bio={bio} avatar={avatar} banniere={jeu.banniere}
          vignette={vignette} onAvatar={onAvatar} onFermer={() => setEdition(false)} />
      )}
    </article>
  );
}

function ProfilEditeur({ langue, uid, nom: nom0, bio: bio0, avatar, banniere: banniere0, vignette, onAvatar, onFermer }: {
  langue: Langue; uid: string; nom: string; bio: string; avatar?: string; banniere?: string;
  vignette: (id: string) => string; onAvatar: (id: string | undefined) => void; onFermer: () => void;
}) {
  const t = TEXTES[langue].social;
  const fr = langue === 'FR';
  const [nom, setNom] = useState(nom0);
  const [bio, setBio] = useState(bio0);
  const [visage, setVisage] = useState(avatar);
  const [banniere, setBanniere] = useState(banniere0 ?? 'taverne');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const ouverts = ADVERSAIRES.filter((a) => avatarOuvert(a.id));
  const valide = nom.trim().length >= NOM_MIN && nom.trim().length <= NOM_MAX;

  const enregistrer = async () => {
    setOccupe(true); setErreur('');
    try {
      if (nom.trim() !== nom0) await renommerCompte(nom);
      if (bio.trim() !== bio0) await majMembre(uid, { bio: bio.trim().slice(0, BIO_JEU_MAX) });
      await majProfilJeu(uid, { avatar: visage ?? '', banniere });
      if (visage !== avatar) onAvatar(visage);
      onFermer();
    } catch { setErreur(TEXTES[langue].erreurReseau); } finally { setOccupe(false); }
  };

  return createPortal(
    <div className="voile nom-voile" onClick={onFermer}>
      <section className="dialogue verre editeur" role="dialog" aria-modal="true" aria-labelledby="editeur-titre" onClick={(e) => e.stopPropagation()} data-test="profil-editeur">
        <h2 className="dialogue-titre" id="editeur-titre">{t.modifierProfil}</h2>
        <label className="champ">
          <span className="etiquette">{t.nomJoueur}</span>
          <input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={NOM_MAX} />
        </label>
        <label className="champ">
          <span className="etiquette">{t.bio}</span>
          <textarea className="saisie" rows={3} value={bio} maxLength={BIO_JEU_MAX} onChange={(e) => setBio(e.target.value)} />
          <span className="petit compteur">{bio.length} / {BIO_JEU_MAX}</span>
        </label>
        <div className="champ">
          <span className="etiquette">{TEXTES[langue].votreAvatar}</span>
          <div className="editeur-visages">
            <button type="button" className={`perso niveau-perso ${!visage ? 'choisi' : ''}`} onClick={() => setVisage(undefined)} aria-pressed={!visage}>
              <span className="niveau-vignette avatar-vide"><img src={`${BASE}tuiles/LOTUS.webp`} alt="" /></span>
            </button>
            {ouverts.map((a) => (
              <button key={a.id} type="button" className={`perso niveau-perso ${visage === a.id ? 'choisi' : ''}`} onClick={() => setVisage(a.id)}
                aria-pressed={visage === a.id} title={nomAdversaire(a, fr)}>
                <img className="niveau-vignette" src={vignette(a.id)} alt={nomAdversaire(a, fr)} loading="lazy" />
              </button>
            ))}
          </div>
          {!ouverts.length && <span className="petit">{TEXTES[langue].avatarAucun}</span>}
          {visage && adversaire(visage) && <span className="petit">{nomAdversaire(adversaire(visage)!, fr)}</span>}
        </div>
        <div className="champ">
          <span className="etiquette">{t.banniere}</span>
          <div className="editeur-bannieres">
            {DECORS.map((d) => (
              <button key={d.id} type="button" className={`editeur-banniere ${banniere === d.id ? 'choisi' : ''}`} onClick={() => setBanniere(d.id)}
                aria-pressed={banniere === d.id} title={fr ? d.nomFR : d.nomEN} style={{ backgroundImage: `url(${imageBanniere(d.id)})` }}>
                <span>{fr ? d.nomFR : d.nomEN}</span>
              </button>
            ))}
          </div>
        </div>
        {erreur && <p className="etat-lien erreur">{erreur}</p>}
        <div className="dialogue-gestes">
          <button type="button" className="bouton discret" onClick={onFermer}>{TEXTES[langue].annuler}</button>
          <button type="button" className="bouton or" disabled={!valide || occupe} onClick={() => void enregistrer()} data-test="profil-enregistrer">{t.enregistrer}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
