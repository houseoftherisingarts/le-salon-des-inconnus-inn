// ─── Défier un ami, être défié, chercher un inconnu ─────────────────
// Trois dialogues qui finissent tous sur le lien PeerJS du menu. Celui
// qui attend tient la table ouverte sous son identifiant; l'autre la
// rejoint. Quand l'autre a dit oui mais que le lien ne s'ouvre pas en
// 20 secondes, le dialogue le dit et propose de réessayer : sans relais
// TURN, certains réseaux bloquent le jeu de pair à pair.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFI_MS, FILE_MS, LIEN_MS, apparier, entrerFile, lancerDefi, quitterFile, repondreDefi, suivreDefi, suivrePlace,
  type Defi,
} from '../../reseau/social/defis';
import type { Ami } from '../../reseau/social/useSocial';
import type { EtatLien } from '../../reseau/pair';
import { TEXTES, type Langue } from '../textes';

/** Ce que le menu prête aux dialogues : sa table et son lien uniques. */
export interface JeuDistance {
  peerId: string;
  etat: EtatLien | null;
  erreur: string;
  ouvrir: () => void;
  rejoindre: (peerId: string) => void;
  fermer: () => void;
}

const BASE = import.meta.env.BASE_URL;
const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function useHorloge(): number {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setN(Date.now()), 500); return () => window.clearInterval(id); }, []);
  return n;
}

function Cadre({ titre, texte, children, test }: { titre: string; texte: ReactNode; children: ReactNode; test: string }) {
  return createPortal(
    <div className="voile nom-voile defi-voile" data-test={test}>
      <section className="dialogue verre defi-dialogue" role="dialog" aria-modal="true" aria-labelledby={`${test}-titre`}>
        <img src={`${BASE}tuiles/LOTUS.webp`} alt="" className="defi-lotus" />
        <h2 className="dialogue-titre" id={`${test}-titre`}>{titre}</h2>
        <p className="dialogue-texte">{texte}</p>
        <div className="dialogue-gestes">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

/** Le défi lancé à un ami : la table s'ouvre, le défi part, on attend. */
export function DefiEnvoye({ langue, uid, monNom, ami, jeu, onFermer }: {
  langue: Langue; uid: string; monNom: string; ami: Ami; jeu: JeuDistance; onFermer: () => void;
}) {
  const t = TEXTES[langue].social;
  const maintenant = useHorloge();
  const [defi, setDefi] = useState<Defi | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [depart, setDepart] = useState(Date.now());
  const [accepteLe, setAccepteLe] = useState(0);
  const [echec, setEchec] = useState('');
  const essai = useRef(0);

  const lancer = () => {
    const n = ++essai.current;
    setEchec(''); setDefi(null); setAccepteLe(0); setDepart(Date.now());
    jeu.ouvrir();
    lancerDefi(uid, monNom.slice(0, 24), jeu.peerId, ami.uid)
      .then((i) => { if (n === essai.current) setId(i); })
      .catch(() => setEchec(t.defiImpossible));
  };
  useEffect(() => { lancer(); return () => { essai.current++; jeu.fermer(); }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => (id ? suivreDefi(id, (d) => { setDefi(d); if (d?.status === 'accepted') setAccepteLe((x) => x || Date.now()); }) : undefined), [id]);

  const statut = defi?.status;
  const expire = !accepteLe && maintenant - depart > DEFI_MS;
  const lent = accepteLe > 0 && maintenant - accepteLe > LIEN_MS;
  useEffect(() => {
    if (expire && id && statut === 'pending') void repondreDefi(id, 'expired').catch(() => {});
    if (expire || statut === 'declined' || lent) jeu.fermer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expire, statut, lent]);

  const fin = echec || (statut === 'declined' ? t.defiRefuse(ami.nom) : expire ? t.defiExpire : lent ? t.lienLent : jeu.erreur);
  return (
    <Cadre test="defi-envoye" titre={t.defiEnvoye(ami.nom)}
      texte={fin || (accepteLe ? TEXTES[langue].connexion : `${t.defiAttente} ${mmss(DEFI_MS - (maintenant - depart))}`)}>
      <button type="button" className="bouton discret" onClick={() => { if (id && statut === 'pending') void repondreDefi(id, 'expired').catch(() => {}); onFermer(); }}>
        {fin ? TEXTES[langue].fermer : TEXTES[langue].annuler}
      </button>
      {fin && <button type="button" className="bouton or" onClick={lancer} data-test="defi-relancer">{t.reessayer}</button>}
    </Cadre>
  );
}

/** Un défi reçu : accepter rejoint la table de celui qui défie. */
export function DefiRecu({ langue, defi, jeu, onFermer }: { langue: Langue; defi: Defi; jeu: JeuDistance; onFermer: () => void }) {
  const t = TEXTES[langue].social;
  const maintenant = useHorloge();
  const [accepteLe, setAccepteLe] = useState(0);
  const accepter = () => {
    setAccepteLe(Date.now());
    void repondreDefi(defi.id, 'accepted').catch(() => {});
    jeu.rejoindre(defi.peerId);
  };
  const lent = accepteLe > 0 && maintenant - accepteLe > LIEN_MS;
  useEffect(() => () => { if (accepteLe) jeu.fermer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [accepteLe]);
  return (
    <Cadre test="defi-recu" titre={t.defiRecu(defi.nomDe)} texte={lent ? t.lienLent : jeu.erreur || (accepteLe ? TEXTES[langue].connexion : t.defiRecuAide)}>
      {!accepteLe && <button type="button" className="bouton discret" onClick={() => { void repondreDefi(defi.id, 'declined').catch(() => {}); onFermer(); }}>{t.refuser}</button>}
      {!accepteLe && <button type="button" className="bouton or" onClick={accepter} data-test="defi-accepter">{t.accepter}</button>}
      {accepteLe > 0 && <button type="button" className="bouton discret" onClick={onFermer}>{TEXTES[langue].fermer}</button>}
      {(lent || jeu.erreur) && <button type="button" className="bouton or" onClick={accepter}>{t.reessayer}</button>}
    </Cadre>
  );
}

/** La file d'attente : on tient sa table ouverte et on cherche plus ancien que soi. */
export function Recherche({ langue, uid, monNom, bloques, jeu, onFermer }: {
  langue: Langue; uid: string; monNom: string; bloques: string[]; jeu: JeuDistance; onFermer: () => void;
}) {
  const t = TEXTES[langue].social;
  const maintenant = useHorloge();
  const [depart, setDepart] = useState(Date.now());
  const [trouveLe, setTrouveLe] = useState(0);
  const [tour, setTour] = useState(0);
  const nom = monNom.slice(0, 24);

  useEffect(() => {
    let vivant = true, trouve = false;
    setDepart(Date.now()); setTrouveLe(0);
    jeu.ouvrir();
    const chercher = async () => {
      if (!vivant || trouve) return;
      const p = await apparier(uid, nom, bloques).catch(() => null);
      if (!vivant || trouve || !p) return;
      trouve = true; setTrouveLe(Date.now());
      jeu.rejoindre(p.peerId);
    };
    void entrerFile(uid, nom, jeu.peerId).then(chercher);
    const id = window.setInterval(() => void chercher(), 4000);
    // Un autre m'a pris : il rejoint ma table, j'attends son « bonjour ».
    const fin = suivrePlace(uid, (p) => { if (p?.prisPar && !trouve) { trouve = true; setTrouveLe(Date.now()); } });
    return () => { vivant = false; window.clearInterval(id); fin(); void quitterFile(uid); jeu.fermer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const vide = !trouveLe && maintenant - depart > FILE_MS;
  const lent = trouveLe > 0 && maintenant - trouveLe > LIEN_MS;
  useEffect(() => { if (vide || lent) { void quitterFile(uid); jeu.fermer(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [vide, lent]);

  const fin = vide ? t.rechercheVide : lent ? t.lienLent : jeu.erreur;
  return (
    <Cadre test="recherche" titre={t.recherche}
      texte={fin || (trouveLe ? t.rechercheTrouve : `${t.rechercheAide} ${mmss(FILE_MS - (maintenant - depart))}`)}>
      <button type="button" className="bouton discret" onClick={onFermer}>{fin ? TEXTES[langue].fermer : TEXTES[langue].annuler}</button>
      {fin && <button type="button" className="bouton or" onClick={() => setTour((n) => n + 1)} data-test="recherche-relancer">{t.reessayer}</button>}
    </Cadre>
  );
}
