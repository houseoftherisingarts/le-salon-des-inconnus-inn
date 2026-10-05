// ─── La porte du compte ─────────────────────────────────────────────
// Le même patron que chez Krystine et au Salon : courriel et mot de
// passe en trois modes (connexion, inscription, oubli), Google en plus
// sur le web. Le nom choisi à la première visite devient le nom du
// compte à l'inscription. Dans le programme Mac (file://), la popup
// Google n'a pas de domaine autorisé : le bouton n'y paraît pas.

import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { loginWithEmail, loginWithGoogle, messageErreur, sendPasswordReset, signUpWithEmail } from '@inconnus/ui/reseau';
import { estElectron } from '../../audio';
import { NOM_MAX, NOM_MIN, rafraichirCompte } from '../../reseau/social/compte';
import { TEXTES, type Langue } from '../textes';

type Mode = 'connexion' | 'inscription' | 'oubli';

export default function Porte({ langue, nomLocal, onFermer }: { langue: Langue; nomLocal: string; onFermer: () => void }) {
  const t = TEXTES[langue].social;
  const [mode, setMode] = useState<Mode>('connexion');
  const [courriel, setCourriel] = useState('');
  const [mdp, setMdp] = useState('');
  const [nom, setNom] = useState(nomLocal.slice(0, NOM_MAX));
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [occupe, setOccupe] = useState(false);
  const nomValide = nom.trim().length >= NOM_MIN && nom.trim().length <= NOM_MAX;

  const agir = async (geste: () => Promise<unknown>) => {
    setErreur(''); setInfo(''); setOccupe(true);
    try { await geste(); } catch (e) {
      setErreur(messageErreur(String((e as { code?: string })?.code ?? ''), langue));
    } finally { setOccupe(false); }
  };

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'oubli') void agir(async () => { await sendPasswordReset(courriel); setInfo(t.lienEnvoye); });
    else if (mode === 'inscription') void agir(async () => { await signUpWithEmail(courriel, mdp, nom.trim()); rafraichirCompte(); onFermer(); });
    else void agir(async () => { await loginWithEmail(courriel, mdp); onFermer(); });
  };

  const titre = mode === 'inscription' ? t.creerCompte : mode === 'oubli' ? t.oubli : t.seConnecter;
  return createPortal(
    <div className="voile nom-voile" onClick={onFermer} data-test="porte-compte">
      <form className="dialogue verre porte-compte" role="dialog" aria-modal="true" aria-labelledby="porte-titre"
        onClick={(e) => e.stopPropagation()} onSubmit={soumettre}>
        <h2 className="dialogue-titre" id="porte-titre">{titre}</h2>
        <p className="dialogue-texte">{t.porteAide}</p>
        {mode === 'inscription' && (
          <label className="champ">
            <span className="etiquette">{t.nomJoueur}</span>
            <input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={NOM_MAX} required data-test="porte-nom" />
          </label>
        )}
        <label className="champ">
          <span className="etiquette">{t.courriel}</span>
          <input className="saisie" type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} autoComplete="email" required autoFocus data-test="porte-courriel" />
        </label>
        {mode !== 'oubli' && (
          <label className="champ">
            <span className="etiquette">{t.motDePasse}</span>
            <input className="saisie" type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} minLength={6} required
              autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'} data-test="porte-mdp" />
          </label>
        )}
        {erreur && <p className="etat-lien erreur" role="alert">{erreur}</p>}
        {info && <p className="etat-lien">{info}</p>}
        <button type="submit" className="bouton or plein" disabled={occupe || (mode === 'inscription' && !nomValide)} data-test="porte-valider">
          {mode === 'oubli' ? t.envoyerLien : titre}
        </button>
        {mode !== 'oubli' && !estElectron() && (
          <button type="button" className="bouton plein" disabled={occupe} onClick={() => void agir(async () => { if (await loginWithGoogle()) onFermer(); })}>
            {t.avecGoogle}
          </button>
        )}
        <div className="porte-liens">
          {mode === 'connexion' && <button type="button" className="bouton lien" onClick={() => setMode('inscription')} data-test="porte-inscription">{t.pasDeCompte}</button>}
          {mode !== 'connexion' && <button type="button" className="bouton lien" onClick={() => setMode('connexion')}>{t.dejaCompte}</button>}
          {mode === 'connexion' && <button type="button" className="bouton lien" onClick={() => setMode('oubli')}>{t.oubli}</button>}
        </div>
      </form>
    </div>,
    document.body,
  );
}
