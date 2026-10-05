// ─── Les amis ───────────────────────────────────────────────────────
// Les amis du compte (collection friendships du kit), en ligne d'abord,
// avec leurs tables ouvertes; les demandes reçues et envoyées; la
// recherche par nom; et, pour chacun, écrire, défier, retirer, faire
// taire ou signaler.

import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { accepterAmitie, bloquer, debloquer, demanderAmitie, retirerAmitie, signaler } from '@inconnus/ui/reseau';
import { chercherMembres } from '../../reseau/social/profil';
import type { Ami, Social } from '../../reseau/social/useSocial';
import { TEXTES, type Langue } from '../textes';
import { Visage } from './Visage';

interface Props {
  langue: Langue;
  uid: string;
  monNom: string;
  social: Social;
  vignette: (id: string) => string;
  occupe: boolean;
  onEcrire: (a: { uid: string; nom: string }) => void;
  onDefier: (a: Ami) => void;
  onRejoindre: (peerId: string) => void;
}

export function AmisCarte({ langue, uid, monNom, social, vignette, occupe, onEcrire, onDefier, onRejoindre }: Props) {
  const t = TEXTES[langue].social;
  const [texte, setTexte] = useState('');
  const [trouves, setTrouves] = useState<{ uid: string; nom: string }[] | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [aSignaler, setASignaler] = useState<{ uid: string; nom: string } | null>(null);
  const connus = new Set(social.liens.flatMap((l) => l.uids));
  // Ni les amis déjà liés ni les joueurs réduits au silence : « personne » ne paraît qu'après une vraie recherche vide.
  const nouveaux = trouves?.filter((r) => !connus.has(r.uid) && !social.bloques.includes(r.uid)) ?? null;

  const chercher = async (e: FormEvent) => {
    e.preventDefault();
    setTrouves(await chercherMembres(texte, uid).catch(() => []));
  };
  const ajouter = (a: { uid: string; nom: string }) => void demanderAmitie(uid, monNom, undefined, a.uid, a.nom).catch(() => {});

  return (
    <article className="carte verre amis-carte" data-test="amis">
      <h2 className="carte-titre">{TEXTES[langue].amis}</h2>

      {social.tables.map((tb) => (
        <div key={tb.uid} className="table-ouverte" data-test={`table-${tb.uid}`}>
          <span><b className="nom-joueur">{tb.nom}</b> {t.tableSuite}</span>
          <button type="button" className="bouton or" disabled={occupe} onClick={() => onRejoindre(tb.peerId)}>{TEXTES[langue].rejoindre}</button>
        </div>
      ))}

      {social.recues.length > 0 && (
        <div className="champ">
          <span className="etiquette">{t.demandesRecues}</span>
          <ul className="liste-sociale">
            {social.recues.map((r) => (
              <li key={r.uid} data-test={`demande-${r.uid}`}>
                <span className="ligne-nom nom-joueur">{r.nom}</span>
                <button type="button" className="bouton or" onClick={() => void accepterAmitie(uid, r.uid)} data-test="accepter-ami">{t.accepter}</button>
                <button type="button" className="bouton discret" onClick={() => void retirerAmitie(uid, r.uid)}>{t.refuser}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="liste-sociale" data-test="liste-amis">
        {social.amis.map((a) => (
          <li key={a.uid} className="ami-ligne">
            <button type="button" className="ami-qui" onClick={() => setOuvert(ouvert === a.uid ? null : a.uid)} aria-expanded={ouvert === a.uid}>
              <Visage avatar={a.avatar} vignette={vignette} enLigne={a.enLigne} />
              <span className="ligne-nom nom-joueur">{a.nom}</span>
              <span className="petit">{a.enLigne ? t.enLigne : t.horsLigne}</span>
            </button>
            <div className="ami-gestes">
              <button type="button" className="bouton" onClick={() => onEcrire(a)} data-test={`ecrire-${a.uid}`}>{t.ecrire}</button>
              <button type="button" className="bouton or" disabled={occupe} onClick={() => onDefier(a)} data-test={`defier-${a.uid}`}>{t.defier}</button>
            </div>
            {ouvert === a.uid && (
              <div className="ami-plus">
                <button type="button" className="bouton discret" onClick={() => void retirerAmitie(uid, a.uid)}>{t.retirer}</button>
                <button type="button" className="bouton discret" onClick={() => void bloquer(uid, a.uid)}>{t.bloquer}</button>
                <button type="button" className="bouton discret" onClick={() => setASignaler(a)}>{t.signaler}</button>
              </div>
            )}
          </li>
        ))}
        {social.envoyees.map((e) => (
          <li key={e.uid} className="ami-ligne attente">
            <span className="ligne-nom nom-joueur">{e.nom}</span>
            <span className="petit">{t.enAttente}</span>
            <button type="button" className="bouton discret" onClick={() => void retirerAmitie(uid, e.uid)}>{TEXTES[langue].annuler}</button>
          </li>
        ))}
      </ul>
      {!social.amis.length && !social.envoyees.length && <p className="petit">{t.amisVide}</p>}

      <form className="champ" onSubmit={chercher}>
        <span className="etiquette">{t.chercherJoueur}</span>
        <div className="ligne-id">
          <input className="saisie" value={texte} onChange={(e) => { setTexte(e.target.value); setTrouves(null); }} maxLength={24} placeholder={t.nomJoueur} data-test="chercher" />
          <button type="submit" className="bouton discret" disabled={texte.trim().length < 2}>{t.chercher}</button>
        </div>
      </form>
      {nouveaux && (nouveaux.length ? (
        <ul className="liste-sociale" data-test="resultats">
          {nouveaux.map((r) => (
            <li key={r.uid}>
              <span className="ligne-nom nom-joueur">{r.nom}</span>
              <button type="button" className="bouton" onClick={() => { ajouter(r); setTexte(''); setTrouves(null); }} data-test={`ajouter-${r.uid}`}>{t.ajouter}</button>
            </li>
          ))}
        </ul>
      ) : <p className="petit" data-test="aucun">{t.aucunResultat}</p>)}

      {social.bloques.length > 0 && (
        <details className="bloques">
          <summary className="petit">{t.bloques(social.bloques.length)}</summary>
          <ul className="liste-sociale">
            {social.bloques.map((b) => (
              <li key={b}><code className="petit">{b.slice(0, 8)}</code><button type="button" className="bouton discret" onClick={() => void debloquer(uid, b)}>{t.debloquer}</button></li>
            ))}
          </ul>
        </details>
      )}

      {aSignaler && <Signaler langue={langue} uid={uid} monNom={monNom} cible={aSignaler} onFermer={() => setASignaler(null)} />}
    </article>
  );
}

/** Signaler un membre à l'équipe du Salon (collection signalements du kit). */
export function Signaler({ langue, uid, monNom, cible, onFermer }: {
  langue: Langue; uid: string; monNom: string; cible: { uid: string; nom: string }; onFermer: () => void;
}) {
  const t = TEXTES[langue].social;
  const [raison, setRaison] = useState('');
  const [fait, setFait] = useState(false);
  const envoyer = async () => {
    await signaler({ parUid: uid, parNom: monNom, cible: 'membre', cibleId: cible.uid, raison: `[Pai Sho] ${raison.trim()}` }).catch(() => {});
    setFait(true);
  };
  return createPortal(
    <div className="voile nom-voile" onClick={onFermer}>
      <section className="dialogue verre" role="dialog" aria-modal="true" aria-labelledby="signaler-titre" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialogue-titre" id="signaler-titre">{t.signalerTitre(cible.nom)}</h2>
        {fait ? <p className="dialogue-texte">{t.signale}</p> : (
          <>
            <p className="dialogue-texte">{t.signalerAide}</p>
            <textarea className="saisie" rows={4} maxLength={1900} value={raison} onChange={(e) => setRaison(e.target.value)} aria-label={t.signaler} />
          </>
        )}
        <div className="dialogue-gestes">
          <button type="button" className="bouton discret" onClick={onFermer}>{TEXTES[langue].fermer}</button>
          {!fait && <button type="button" className="bouton or" disabled={raison.trim().length < 3} onClick={() => void envoyer()}>{t.envoyer}</button>}
        </div>
      </section>
    </div>,
    document.body,
  );
}
