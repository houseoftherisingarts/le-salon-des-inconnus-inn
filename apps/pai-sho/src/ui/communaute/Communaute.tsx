// ─── La section Communauté ──────────────────────────────────────────
// Alex, 4 octobre 2026 : « a social media section similar to the one we
// made for krystine ». Connecté : le profil, les amis, les messages et le
// jeu en ligne. Déconnecté : la porte du compte et le jeu à distance tel
// qu'il était, avec le nom local et le carnet d'amis de l'appareil.

import { useState } from 'react';
import type { Compte } from '../../reseau/social/compte';
import { publierTable } from '../../reseau/social/defis';
import type { Fil } from '../../reseau/social/discussions';
import type { Ami as AmiEnLigne, Social } from '../../reseau/social/useSocial';
import { amis as lireAmis, idValide, oublierAmi, type Ami, type Joueur } from '../../reseau/pair';
import { TEXTES, type Langue } from '../textes';
import { AmisCarte } from './Amis';
import { DefiEnvoye, Recherche, type JeuDistance } from './Defis';
import { FilOuvert, MessagesCarte } from './Discussions';
import Porte from './Porte';
import { ProfilCarte } from './Profil';

interface Props {
  langue: Langue;
  compte: Compte;
  social: Social;
  jeu: JeuDistance;
  joueur: Joueur;
  monNom: string;
  battus: number;
  total: number;
  vignette: (id: string) => string;
  onAvatar: (id: string | undefined) => void;
  onReessayer: () => void;
  peutReessayer: boolean;
  onFermer: () => void;
}

export default function Communaute(p: Props) {
  const { langue, compte, social, jeu, joueur, monNom } = p;
  const t = TEXTES[langue];
  const s = t.social;
  const uid = compte.user?.uid;
  const [porte, setPorte] = useState(false);
  const [fil, setFil] = useState<Fil | null>(null);
  const [defie, setDefie] = useState<AmiEnLigne | null>(null);
  const [recherche, setRecherche] = useState(false);
  const [idAutre, setIdAutre] = useState('');
  const [carnet, setCarnet] = useState<Ami[]>(lireAmis);
  const [copie, setCopie] = useState(false);
  const [publiee, setPubliee] = useState(false);
  const occupe = jeu.etat === 'attente' || jeu.etat === 'connexion';

  const ouvrirTable = () => {
    jeu.ouvrir();
    if (uid) void publierTable(uid, monNom.slice(0, 24), jeu.peerId).then(() => setPubliee(true)).catch(() => {});
  };
  const copier = () => {
    navigator.clipboard?.writeText(joueur.id).then(() => { setCopie(true); window.setTimeout(() => setCopie(false), 1600); }).catch(() => {});
  };

  return (
    <div className="voile niveaux-voile" onClick={p.onFermer} data-test="communaute-ecran">
      <section className="niveaux communaute" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.communaute}>
        <header className="niveaux-tete">
          <div>
            <h2 className="niveaux-titre">{t.communaute}</h2>
            <p className="petit">{uid ? t.communauteAide : s.porteAide}</p>
          </div>
          <button type="button" className="bouton discret" onClick={p.onFermer}>{t.fermer}</button>
        </header>
        <div className="communaute-grille">
          {uid ? (
            <>
              <ProfilCarte langue={langue} uid={uid} nom={monNom} avatar={joueur.avatar} battus={p.battus} total={p.total} vignette={p.vignette} onAvatar={p.onAvatar} />
              <AmisCarte langue={langue} uid={uid} monNom={monNom} social={social} vignette={p.vignette} occupe={jeu.etat === 'connexion'}
                onEcrire={(a) => setFil({ type: 'dm', id: [uid, a.uid].sort().join('__'), titre: a.nom, autreUid: a.uid })}
                onDefier={setDefie} onRejoindre={jeu.rejoindre} />
              <MessagesCarte langue={langue} uid={uid} monNom={monNom} social={social} onOuvrir={setFil} />
            </>
          ) : (
            <article className="carte verre compte-carte" data-test="compte">
              <h2 className="carte-titre">{s.votreCompte}</h2>
              <p className="carte-aide">{s.compteAide}</p>
              <ul className="compte-atouts">{s.atouts.map((a) => <li key={a}>{a}</li>)}</ul>
              {compte.pret && <button type="button" className="bouton or plein" onClick={() => setPorte(true)} data-test="se-connecter">{s.seConnecter}</button>}
            </article>
          )}

          <article className="carte verre jeu-carte" data-test="distance">
            <h2 className="carte-titre">{t.aDistance}</h2>
            <p className="carte-aide">{t.aDistanceAide}</p>
            {uid
              ? <button type="button" className="bouton or plein" onClick={() => setRecherche(true)} disabled={occupe} data-test="defier-inconnu">{s.defierInconnu}</button>
              : <p className="petit">{s.inconnuConnexion}</p>}
            <button type="button" className="bouton plein" onClick={ouvrirTable} disabled={jeu.etat === 'attente'} data-test="ouvrir-table">{t.ouvrirTable}</button>
            {publiee && jeu.etat === 'attente' && <p className="petit" data-test="table-publiee">{s.tablePubliee}</p>}
            <div className="champ">
              <span className="etiquette">{t.votreId}</span>
              <div className="ligne-id">
                <code className="id">{joueur.id}</code>
                <button type="button" className="bouton discret" onClick={copier}>{copie ? t.copie : t.copier}</button>
              </div>
            </div>
            <label className="champ">
              <span className="etiquette">{t.idAdversaire}</span>
              <div className="ligne-id ligne-code">
                <input className="saisie" value={idAutre} onChange={(e) => setIdAutre(e.target.value)} placeholder="paisho-xxxxxxxx" spellCheck={false} autoCapitalize="off" />
                <button type="button" className="bouton contour" onClick={() => jeu.rejoindre(idAutre)} disabled={!idValide(idAutre) || idAutre.trim() === joueur.id} data-test="rejoindre-code">{s.rejoindreCode}</button>
              </div>
            </label>
            {/* Déconnecté, le carnet de l'appareil garde les joueurs rencontrés; connecté, les amis du compte le remplacent. */}
            {!uid && (
              <div className="champ">
                <span className="etiquette">{t.amis}</span>
                {carnet.length > 0 && <ul className="amis">
                  {carnet.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="bouton discret ami" onClick={() => { setIdAutre(a.id); jeu.rejoindre(a.id); }} disabled={occupe} data-test={`ami-${a.id}`}>
                        <span>{a.nom || t.adversaire}</span>
                        <code>{a.id}</code>
                      </button>
                      <button type="button" className="bouton discret" onClick={() => setCarnet(oublierAmi(a.id))} aria-label={`${t.oublier} ${a.nom || a.id}`}>×</button>
                    </li>
                  ))}
                </ul>}
                <span className="petit">{t.amisAide}</span>
              </div>
            )}
            {jeu.etat === 'attente' && !defie && !recherche && <p className="etat-lien">{t.attente}</p>}
            {jeu.etat === 'connexion' && <p className="etat-lien">{t.connexion}</p>}
            {jeu.erreur && <p className="etat-lien erreur">{jeu.erreur}</p>}
            {p.peutReessayer && <button type="button" className="bouton" onClick={p.onReessayer}>{s.reessayer}</button>}
          </article>
        </div>
      </section>

      {porte && <Porte langue={langue} nomLocal={joueur.nom} onFermer={() => setPorte(false)} />}
      {uid && fil && <FilOuvert langue={langue} uid={uid} monNom={monNom} fil={fil} social={social} onFermer={() => setFil(null)} />}
      {uid && defie && <DefiEnvoye langue={langue} uid={uid} monNom={monNom} ami={defie} jeu={jeu} onFermer={() => setDefie(null)} />}
      {uid && recherche && <Recherche langue={langue} uid={uid} monNom={monNom} bloques={social.bloques} jeu={jeu} onFermer={() => setRecherche(false)} />}
    </div>
  );
}
