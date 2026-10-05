// ─── Les messages : fils à deux et salons de groupe ─────────────────
// La carte liste les fils (non lus en or) et les salons; un fil s'ouvre
// en dialogue, avec la liste des messages et la saisie. Un salon montre
// ses membres, invite un ami, ou se quitte.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { marquerConversationLue, ouvrirConversation } from '@inconnus/ui/reseau';
import {
  NOM_SALON_MAX, TEXTE_MAX, creerSalon, envoyerMessage, inviterAuSalon, quitterSalon, suivreConversations, suivreMessages,
  type ConversationJeu, type Fil, type MessageFil,
} from '../../reseau/social/discussions';
import type { Social } from '../../reseau/social/useSocial';
import { TEXTES, type Langue } from '../textes';

export function MessagesCarte({ langue, uid, social, onOuvrir }: {
  langue: Langue; uid: string; social: Social; onOuvrir: (f: Fil) => void;
}) {
  const t = TEXTES[langue].social;
  const [fils, setFils] = useState<ConversationJeu[]>([]);
  const [creation, setCreation] = useState(false);
  useEffect(() => suivreConversations(uid, setFils), [uid]);
  const visibles = fils.filter((f) => !social.bloques.includes(f.autreUid));

  return (
    <article className="carte verre messages-carte" data-test="messages">
      <h2 className="carte-titre">{t.messages}{social.nonLus.length > 0 && <b className="pastille">{social.nonLus.length}</b>}</h2>
      <ul className="liste-sociale">
        {visibles.map((f) => (
          <li key={f.id}>
            <button type="button" className={`fil-ligne ${f.nonLu ? 'non-lu' : ''}`} onClick={() => onOuvrir({ type: 'dm', id: f.id, titre: f.autreNom, autreUid: f.autreUid })} data-test={`fil-${f.autreUid}`}>
              <span className="ligne-nom">{f.autreNom}</span>
              {f.nonLu && <b className="pastille">•</b>}
            </button>
          </li>
        ))}
        {social.salons.map((s) => (
          <li key={s.id}>
            <button type="button" className="fil-ligne salon" onClick={() => onOuvrir({ type: 'salon', id: s.id, titre: s.nom })} data-test={`salon-${s.id}`}>
              <span className="ligne-nom">#{' '}{s.nom}</span>
              <span className="petit">{t.membres(s.members.length)}</span>
            </button>
          </li>
        ))}
      </ul>
      {!visibles.length && !social.salons.length && <p className="petit">{t.messagesVide}</p>}
      <button type="button" className="bouton plein" onClick={() => setCreation(true)} data-test="creer-groupe">{t.creerGroupe}</button>
      {creation && <CreerGroupe langue={langue} uid={uid} social={social} onFermer={() => setCreation(false)} onCree={(f) => { setCreation(false); onOuvrir(f); }} />}
    </article>
  );
}

function CreerGroupe({ langue, uid, social, onFermer, onCree }: {
  langue: Langue; uid: string; social: Social; onFermer: () => void; onCree: (f: Fil) => void;
}) {
  const t = TEXTES[langue].social;
  const [nom, setNom] = useState('');
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const monNom = social.amis.length ? '' : '';
  const creer = async () => {
    const invites = social.amis.filter((a) => choisis.has(a.uid)).map((a) => ({ uid: a.uid, nom: a.nom }));
    const id = await creerSalon(uid, monNom, nom, invites);
    onCree({ type: 'salon', id, titre: nom.trim() });
  };
  return createPortal(
    <div className="voile nom-voile" onClick={onFermer}>
      <section className="dialogue verre" role="dialog" aria-modal="true" aria-labelledby="groupe-titre" onClick={(e) => e.stopPropagation()} data-test="groupe-dialogue">
        <h2 className="dialogue-titre" id="groupe-titre">{t.creerGroupe}</h2>
        <label className="champ">
          <span className="etiquette">{t.nomGroupe}</span>
          <input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={NOM_SALON_MAX} autoFocus data-test="groupe-nom" />
        </label>
        <div className="champ">
          <span className="etiquette">{t.inviterAmis}</span>
          {social.amis.length ? (
            <div className="persos">
              {social.amis.map((a) => (
                <button key={a.uid} type="button" className={`perso ${choisis.has(a.uid) ? 'choisi' : ''}`} aria-pressed={choisis.has(a.uid)}
                  onClick={() => setChoisis((s) => { const n = new Set(s); if (n.has(a.uid)) n.delete(a.uid); else n.add(a.uid); return n; })}>{a.nom}</button>
              ))}
            </div>
          ) : <span className="petit">{t.amisVide}</span>}
        </div>
        <div className="dialogue-gestes">
          <button type="button" className="bouton discret" onClick={onFermer}>{TEXTES[langue].annuler}</button>
          <button type="button" className="bouton or" disabled={!nom.trim()} onClick={() => void creer()} data-test="groupe-creer">{t.creer}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

/** Un fil ouvert. Pour un fil à deux, `autre` sert à le créer au premier message. */
export function FilOuvert({ langue, uid, monNom, fil, social, onFermer }: {
  langue: Langue; uid: string; monNom: string; fil: Fil; social: Social; onFermer: () => void;
}) {
  const t = TEXTES[langue].social;
  const [messages, setMessages] = useState<MessageFil[]>([]);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState('');
  const bas = useRef<HTMLDivElement>(null);
  const salon = fil.type === 'salon' ? social.salons.find((s) => s.id === fil.id) : undefined;

  useEffect(() => suivreMessages(fil, setMessages), [fil.type, fil.id]);
  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'end' });
    if (fil.type === 'dm' && messages.length) void marquerConversationLue(fil.id, uid).catch(() => {});
  }, [messages.length, fil.type, fil.id, uid]);

  const envoyer = async () => {
    setErreur('');
    try {
      if (fil.type === 'dm' && fil.autreUid) {
        // Le fil se crée (ou se rafraîchit) ici; refusé si l'un a fait taire l'autre.
        const id = await ouvrirConversation(uid, monNom, null, fil.autreUid, fil.titre, null);
        if (!id) { setErreur(t.envoiRefuse); return; }
      }
      await envoyerMessage(fil, uid, monNom, texte);
      setTexte('');
    } catch { setErreur(t.envoiRefuse); }
  };

  const invitables = salon ? social.amis.filter((a) => !salon.members.includes(a.uid)) : [];
  return createPortal(
    <div className="voile nom-voile" onClick={onFermer}>
      <section className="dialogue verre fil" role="dialog" aria-modal="true" aria-labelledby="fil-titre" onClick={(e) => e.stopPropagation()} data-test="fil">
        <header className="fil-tete">
          <h2 className="dialogue-titre" id="fil-titre">{fil.type === 'salon' ? `# ${fil.titre}` : fil.titre}</h2>
          <button type="button" className="bouton discret" onClick={onFermer}>{TEXTES[langue].fermer}</button>
        </header>
        {salon && (
          <div className="fil-salon">
            <span className="petit">{Object.entries(salon.noms ?? {}).filter(([u]) => salon.members.includes(u)).map(([, n]) => n || '…').join(' · ') || t.membres(salon.members.length)}</span>
            {invitables.length > 0 && (
              <select className="saisie" value="" onChange={(e) => { const a = invitables.find((x) => x.uid === e.target.value); if (a) void inviterAuSalon(salon.id, a); }} aria-label={t.inviter} data-test="fil-inviter">
                <option value="">{t.inviter}</option>
                {invitables.map((a) => <option key={a.uid} value={a.uid}>{a.nom}</option>)}
              </select>
            )}
            <button type="button" className="bouton discret" onClick={() => { void quitterSalon(salon.id, uid); onFermer(); }}>{t.quitter}</button>
          </div>
        )}
        <div className="fil-messages" data-test="fil-messages">
          {messages.map((m) => (
            <p key={m.id} className={`bulle ${m.uid === uid ? 'moi' : ''}`}>
              {m.uid !== uid && fil.type === 'salon' && <b>{m.displayName || '…'}</b>}
              <span>{m.text}</span>
            </p>
          ))}
          {!messages.length && <p className="petit">{t.filVide}</p>}
          <div ref={bas} />
        </div>
        {erreur && <p className="etat-lien erreur">{erreur}</p>}
        <form className="fil-saisie" onSubmit={(e) => { e.preventDefault(); if (texte.trim()) void envoyer(); }}>
          <textarea className="saisie" rows={2} value={texte} maxLength={TEXTE_MAX} placeholder={t.ecrireMessage} onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texte.trim()) void envoyer(); } }} data-test="fil-saisie" />
          <button type="submit" className="bouton or" disabled={!texte.trim()} data-test="fil-envoyer">{t.envoyer}</button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
