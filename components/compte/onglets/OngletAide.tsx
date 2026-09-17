import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { suivreFilSoutien, envoyerMessageSoutien, type MessageSoutien } from '../donnees/soutien';
import { envoyerProbleme } from '../donnees/problemes';

interface OngletAideProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  readOnly?: boolean;
  uidCible?: string;
}

export const OngletAide: React.FC<OngletAideProps> = ({ user, memberProfile, language, readOnly, uidCible }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const uid = uidCible ?? user.uid;

  const [messages, setMessages] = useState<MessageSoutien[]>([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const basFil = useRef<HTMLDivElement>(null);

  const [textePb, setTextePb] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [pbEnvoi, setPbEnvoi] = useState(false);
  const [pbEnvoye, setPbEnvoye] = useState(false);
  const [pbErreur, setPbErreur] = useState<string | null>(null);

  useEffect(() => suivreFilSoutien(uid, setMessages), [uid]);

  useEffect(() => {
    basFil.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const nom = memberProfile.displayName || user.displayName || '';
  const courriel = memberProfile.email || user.email || '';

  const envoyer = async () => {
    const contenu = texte.trim();
    if (!contenu || envoi) return;
    setEnvoi(true);
    setErreur(false);
    try {
      await envoyerMessageSoutien(uid, nom, courriel, contenu);
      setTexte('');
    } catch {
      setErreur(true);
    } finally {
      setEnvoi(false);
    }
  };

  const choisirFichier = (f: File | null) => {
    if (!f) { setFichier(null); setPbErreur(null); return; }
    if (!f.type.startsWith('image/')) { setPbErreur(t('This file isn\'t an image.', 'Ce fichier n\'est pas une image.')); return; }
    if (f.size > 10 * 1024 * 1024) { setPbErreur(t('The image is larger than 10 MB.', 'L\'image dépasse 10 Mo.')); return; }
    setFichier(f);
    setPbErreur(null);
  };

  const envoyerPb = async () => {
    const contenu = textePb.trim();
    if (!contenu || pbEnvoi) return;
    setPbEnvoi(true);
    setPbErreur(null);
    setPbEnvoye(false);
    try {
      await envoyerProbleme(uid, {
        nom,
        courriel,
        texte: contenu,
        page: typeof window !== 'undefined' ? window.location.pathname : '',
        agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ecran: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      }, fichier);
      setPbEnvoye(true);
      setTextePb('');
      setFichier(null);
    } catch {
      setPbErreur(t('The report didn\'t go through. Try again in a moment.', 'Le signalement n\'est pas parti. Réessayez dans un instant.'));
    } finally {
      setPbEnvoi(false);
    }
  };

  const carte = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40';
  const surtitre = 'font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2';

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Help', 'Aide')}
        </h3>
        <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('Write to us', 'Écrivez-nous')}
        </h2>
        <p className="font-lato text-neutral-200">
          {t(
            'This thread goes straight to the Salon team. We answer here, and an email lets you know about the reply as long as the option stays ticked in your preferences.',
            'Ce fil va directement à l\'équipe du Salon. Nous répondons ici, et un courriel vous prévient de la réponse tant que l\'option reste cochée dans vos préférences.'
          )}
        </p>
      </div>

      {/* Fil de messages */}
      <div className={carte}>
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="font-lato text-neutral-400 text-sm py-4">
              {t('No messages yet. Ask your question, whatever it\'s about.', 'Aucun message pour l\'instant. Posez votre question, peu importe le sujet.')}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] px-4 py-3 rounded-xl ${m.auteur === 'equipe' ? 'ml-0' : 'ml-auto'}`}
                style={{ background: m.auteur === 'equipe' ? 'rgba(20,16,10,0.6)' : 'rgba(197,160,89,0.14)', border: '1px solid rgba(197,160,89,0.18)' }}
              >
                <p className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-[#c5a059] mb-1">
                  {m.auteur === 'equipe' ? t('The Salon team', 'L\'équipe du Salon') : t('You', 'Vous')}
                </p>
                <p className="font-lato text-neutral-200 text-sm whitespace-pre-wrap">{m.texte}</p>
              </div>
            ))
          )}
          <div ref={basFil} />
        </div>

        {!readOnly && (
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void envoyer(); }}
            placeholder={t('Your message', 'Votre message')}
            className="flex-1 px-4 py-3 rounded-lg bg-[#0a0808]/60 border border-white/15 text-neutral-200 font-lato text-sm focus:outline-none focus:border-[#c5a059]/50"
          />
          <button
            onClick={envoyer}
            disabled={envoi || !texte.trim()}
            className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-[#d4b06a] transition-colors disabled:opacity-40"
          >
            {t('Send', 'Envoyer')}
          </button>
        </div>
        )}
        {erreur && (
          <p className="font-lato text-red-400 text-sm mt-3">
            {t('The message didn\'t go through. Try again in a moment.', 'Le message n\'est pas parti. Réessayez dans un instant.')}
          </p>
        )}
      </div>

      {/* Problème technique */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Technical problem', 'Problème technique')}
        </h3>
        <h4 className="font-prata text-[#f3e5ab] text-xl mb-3">
          {t('Something isn\'t working', 'Quelque chose ne fonctionne pas')}
        </h4>
        <p className="font-lato text-neutral-300 text-sm mb-5">
          {t('Describe what you were doing and what happened. A screenshot helps us a lot.', 'Décrivez ce que vous faisiez et ce qui s\'est passé. Une capture d\'écran nous aide beaucoup.')}
        </p>

        {pbEnvoye ? (
          <p className="font-lato text-[#c5a059] text-sm">
            {t('Thank you. The report is in our hands.', 'Merci. Le signalement est entre nos mains.')}
          </p>
        ) : !readOnly && (
          <>
            <textarea
              value={textePb}
              onChange={(e) => setTextePb(e.target.value)}
              rows={4}
              placeholder={t('Describe what happened', 'Décrivez ce qui s\'est passé')}
              className="w-full mb-4 px-4 py-3 rounded-lg bg-[#0a0808]/60 border border-white/15 text-neutral-200 font-lato text-sm focus:outline-none focus:border-[#c5a059]/50 resize-y"
            />
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <label className="rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[11px] tracking-widest px-5 py-2 hover:bg-white/5 transition-colors cursor-pointer">
                {fichier ? fichier.name : t('Attach a screenshot', 'Joindre une capture')}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)} />
              </label>
              {fichier && (
                <button onClick={() => choisirFichier(null)} className="font-lato text-neutral-400 text-xs hover:text-neutral-200">
                  {t('Remove', 'Retirer')}
                </button>
              )}
            </div>
            <button
              onClick={envoyerPb}
              disabled={pbEnvoi || !textePb.trim()}
              className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-[#d4b06a] transition-colors disabled:opacity-40"
            >
              {pbEnvoi ? t('Sending…', 'Envoi…') : t('Send the report', 'Envoyer le signalement')}
            </button>
          </>
        )}

        {pbErreur && <p className="font-lato text-red-400 text-sm mt-3">{pbErreur}</p>}
      </div>

    </div>
  );
};
