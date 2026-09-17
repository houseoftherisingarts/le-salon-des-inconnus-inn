import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { PanneauAdminBadges } from '../../packages/ui/src/reseau';
import { lireSejours, lierReservation, type Sejour } from '../compte/donnees/sejours';
import { lireBillets, type Billets } from '../compte/donnees/billets';
import { lireEtatCreatorStudio } from '../compte/donnees/creatorStudio';
import { lireCoordonnees, lirePreferences } from '../compte/donnees/preferences';
import { lireFilleuls, lireMonParrainage, trouverOuCreerCode } from '../compte/donnees/parrainage';
import EspaceMembrePage from '../compte/EspaceMembrePage';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../AuthModal';

export interface LigneMembre {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  membershipType?: string;
  createdAt?: { toMillis?: () => number };
  joinedAt?: { toMillis?: () => number };
  isArtist?: boolean;
  featureCafe?: boolean;
  featureMecene?: boolean;
  featureCreatorStudio?: boolean;
  maestroEnabled?: boolean;
}

interface FicheMembreProps {
  membre: LigneMembre;
  user: User;
  memberProfile?: MemberProfile;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  onUserChange?: (u: User | null, p: MemberProfile | null) => void;
  onClose: () => void;
}

const STATUT_LABELS: Record<string, { fr: string; en: string }> = {
  pending: { fr: 'Reçue', en: 'Received' },
  approved: { fr: 'Approuvée', en: 'Approved' },
  declined: { fr: 'Fermée', en: 'Closed' },
};

export const FicheMembre: React.FC<FicheMembreProps> = ({
  membre, user, memberProfile, language, onNavigate, onUserChange, onClose,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const uid = membre.uid;
  const adminProfile: MemberProfile = memberProfile ?? {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    isAdmin: true,
    membershipType: 'voyageur',
    createdAt: null,
    consentDate: '',
    consentVersion: '',
  };

  const [telephone, setTelephone] = useState('');
  const [prefs, setPrefs] = useState<{ langue?: string } | null>(null);
  const [sejours, setSejours] = useState<Sejour[] | null>(null);
  const [billets, setBillets] = useState<Billets | null>(null);
  const [studio, setStudio] = useState<{ hasProfile: boolean; isCompleted: boolean; isCuratedArtist: boolean; hasProProfile: boolean; slug?: string } | null>(null);
  const [amis, setAmis] = useState<{ amis: number; demandes: number }>({ amis: 0, demandes: 0 });
  const [communaute, setCommunaute] = useState<string | null>(null);
  const [wwoofing, setWwoofing] = useState<string | null>(null);
  const [codeParrain, setCodeParrain] = useState<string | null>(null);
  const [filleuls, setFilleuls] = useState<{ id: string; nom: string }[]>([]);
  const [invitePar, setInvitePar] = useState<string | null>(null);
  const [voirEspace, setVoirEspace] = useState(false);
  const [rattacher, setRattacher] = useState({ code: '', arrivee: '' });
  const [rattacherEtat, setRattacherEtat] = useState<'idle' | 'ok' | 'non' | 'erreur'>('idle');

  useEffect(() => {
    lireCoordonnees(uid).then((c) => setTelephone(c?.telephone ?? '')).catch(() => {});
    lirePreferences(uid).then((p) => setPrefs(p)).catch(() => {});
    lireSejours(uid).then((r) => setSejours(r.sejours)).catch(() => setSejours([]));
    lireBillets(uid).then(setBillets).catch(() => {});
    lireEtatCreatorStudio(uid).then(setStudio).catch(() => {});
    lireFilleuls(uid).then(setFilleuls).catch(() => {});
    lireMonParrainage(uid).then((p) => setInvitePar(p?.code ?? null)).catch(() => {});
    trouverOuCreerCode(uid).then(setCodeParrain).catch(() => {});

    if (!db) return;
    const unsubComm = onSnapshot(doc(db, 'communityApplications', uid), (s) => setCommunaute(s.exists() ? (s.data().status ?? 'pending') : null));
    const unsubWw = onSnapshot(doc(db, 'wwoofers', uid), (s) => setWwoofing(s.exists() ? (s.data().status ?? 'pending') : null));
    return () => { unsubComm(); unsubWw(); };
  }, [uid]);

  useEffect(() => {
    if (!db) return;
    let actif = true;
    (async () => {
      const [amisSnap, demSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendships'), where('uids', 'array-contains', uid))),
        getDocs(query(collection(db, 'friendships'), where('uids', 'array-contains', uid))),
      ]);
      if (!actif) return;
      const acceptes = amisSnap.docs.filter((d) => d.data().status === 'accepted').length;
      const demandes = demSnap.docs.filter((d) => d.data().status === 'pending' && d.data().requestedBy !== uid).length;
      setAmis({ amis: acceptes, demandes });
    })().catch(() => {});
    return () => { actif = false; };
  }, [uid]);

  const rattacherSejour = async () => {
    if (!rattacher.code || !rattacher.arrivee) return;
    setRattacherEtat('idle');
    try {
      const r = await lierReservation(rattacher.code, rattacher.arrivee, uid);
      setRattacherEtat(r.lie ? 'ok' : 'non');
      if (r.lie) { lireSejours(uid).then((res) => setSejours(res.sejours)).catch(() => {}); }
    } catch {
      setRattacherEtat('erreur');
    }
  };

  const nom = membre.displayName || 'Membre';

  if (voirEspace) {
    return (
      <div className="fixed inset-0 z-[80] bg-[#0a0808] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#c5a059] text-[#0a0808] px-4 py-3 flex items-center justify-between">
          <span className="font-cinzel uppercase text-[12px] tracking-[0.18em]">
            {t(`You are viewing {name}'s space`, `Vous regardez l'espace de {name}`).replace('{name}', nom)}
          </span>
          <button onClick={() => setVoirEspace(false)} className="font-cinzel uppercase text-[11px] tracking-widest px-3 py-1 border border-[#0a0808]/30 rounded-full hover:bg-[#0a0808]/10">
            {t('Close', 'Fermer')}
          </button>
        </div>
        <EspaceMembrePage
          language={language}
          user={user}
          memberProfile={adminProfile}
          onUserChange={onUserChange ?? (() => {})}
          onNavigate={onNavigate}
          vueAdmin={{ uid }}
        />
      </div>
    );
  }

  const section = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5';
  const surtitre = 'font-cinzel text-[11px] uppercase tracking-[0.3em] text-[#c5a059] mb-3';

  return (
    <div className="fixed inset-0 z-[80] bg-[#070707]/98 overflow-y-auto" style={{ paddingBottom: 'var(--bandeau-temoins, 0px)' }}>
      <div className="sticky top-0 z-20 bg-[#0a0808] border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {membre.photoURL ? <img src={membre.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" /> : (
            <div className="w-9 h-9 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-[12px] font-cinzel text-[#f3e5ab]">{(nom[0] || '?').toUpperCase()}</div>
          )}
          <div>
            <p className="font-prata text-[#f3e5ab] text-lg leading-none">{nom}</p>
            <p className="font-lato text-neutral-500 text-xs mt-1">{membre.email || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setVoirEspace(true)} className="rounded-full border border-[#c5a059]/55 px-4 py-2 font-cinzel uppercase text-[11px] tracking-widest text-[#f3e5ab] hover:bg-white/5">
            {t('View their space', 'Voir son espace')}
          </button>
          <button onClick={onClose} aria-label={t('Close', 'Fermer')} className="w-9 h-9 rounded-full border border-white/15 text-neutral-400 hover:text-white">×</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">

        {/* Colonne identité */}
        <div className="flex flex-col gap-6">
          <div className={section}>
            <h3 className={surtitre}>{t('Identity', 'Identité')}</h3>
            <dl className="space-y-2 text-sm font-lato">
              <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t('Type', 'Type')}</dt><dd className="text-neutral-200">{membre.membershipType || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t('Phone', 'Téléphone')}</dt><dd className="text-neutral-200">{telephone || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t('Language', 'Langue')}</dt><dd className="text-neutral-200">{prefs?.langue ?? 'FR'}</dd></div>
            </dl>
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Flags', 'Drapeaux')}</h3>
            <div className="flex flex-wrap gap-2">
              {membre.isArtist && <span className="px-3 py-1 rounded-full border border-purple-400/40 text-purple-300 text-[10px] uppercase font-cinzel tracking-widest">Artiste</span>}
              {membre.featureCafe && <span className="px-3 py-1 rounded-full border border-fuchsia-400/40 text-fuchsia-300 text-[10px] uppercase font-cinzel tracking-widest">Café</span>}
              {membre.featureMecene && <span className="px-3 py-1 rounded-full border border-amber-400/40 text-amber-300 text-[10px] uppercase font-cinzel tracking-widest">Mécène</span>}
              {membre.featureCreatorStudio && <span className="px-3 py-1 rounded-full border border-sky-400/40 text-sky-300 text-[10px] uppercase font-cinzel tracking-widest">Studio</span>}
              {membre.maestroEnabled && <span className="px-3 py-1 rounded-full border border-amber-400/40 text-amber-300 text-[10px] uppercase font-cinzel tracking-widest">Maestro</span>}
              {!membre.isArtist && !membre.featureCafe && !membre.featureMecene && !membre.featureCreatorStudio && !membre.maestroEnabled && (
                <span className="text-neutral-600 text-xs font-lato">{t('No flags.', 'Aucun drapeau.')}</span>
              )}
            </div>
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Badges', 'Badges')}</h3>
            <PanneauAdminBadges uid={uid} language={language} />
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Creator Studio', 'Creator Studio')}</h3>
            {studio ? (
              <p className="font-lato text-neutral-300 text-sm leading-relaxed">
                {studio.hasProProfile
                  ? t('Pro Profile live.', 'Profil Pro en ligne.')
                  : studio.isCompleted
                    ? t('Artist profile complete.', 'Profil d\'artiste complété.')
                    : studio.hasProfile
                      ? t('Artist profile started.', 'Profil d\'artiste commencé.')
                      : t('No artist profile yet.', 'Aucun profil d\'artiste pour l\'instant.')}
                {studio.slug ? ` (${studio.slug})` : ''}
              </p>
            ) : <p className="text-neutral-600 text-xs font-lato">{t('Loading…', 'Chargement…')}</p>}
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Live here', 'Vivre ici')}</h3>
            <p className="font-lato text-neutral-300 text-sm">
              {communaute ? t('Community: {s}', 'Communauté : {s}').replace('{s}', language === 'FR' ? STATUT_LABELS[communaute]?.fr : STATUT_LABELS[communaute]?.en) : t('No community application.', 'Aucune candidature à la communauté.')}
            </p>
            <p className="font-lato text-neutral-300 text-sm mt-1">
              {wwoofing ? t('Wwoofing: {s}', 'Wwoofing : {s}').replace('{s}', language === 'FR' ? STATUT_LABELS[wwoofing]?.fr : STATUT_LABELS[wwoofing]?.en) : t('No wwoofer application.', 'Aucune candidature de wwoofer.')}
            </p>
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Referrals', 'Parrainage')}</h3>
            <p className="font-lato text-neutral-300 text-sm">{codeParrain ? t('Code: {c}', 'Code : {c}').replace('{c}', codeParrain) : t('No code yet.', 'Pas de code.')}</p>
            <p className="font-lato text-neutral-300 text-sm mt-1">{invitePar ? t('Invited by code {c}', 'Invité par le code {c}').replace('{c}', invitePar) : t('Not invited by a code.', 'Pas invité par un code.')}</p>
            {filleuls.length > 0 && (
              <p className="font-lato text-neutral-400 text-xs mt-2">
                {t('Guests: {n}', 'Invités : {n}').replace('{n}', filleuls.map((f) => f.nom).join(', '))}
              </p>
            )}
          </div>
        </div>

        {/* Colonne activité */}
        <div className="flex flex-col gap-6">
          <div className={section}>
            <h3 className={surtitre}>{t('Stays', 'Séjours')}</h3>
            {sejours === null ? <p className="text-neutral-600 text-xs font-lato">{t('Loading…', 'Chargement…')}</p> : sejours.length === 0 ? (
              <p className="font-lato text-neutral-400 text-sm">{t('No stays found.', 'Aucun séjour trouvé.')}</p>
            ) : (
              <div className="space-y-2">
                {sejours.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg" style={{ background: 'rgba(20,16,10,0.5)' }}>
                    <span className="font-lato text-neutral-200 text-sm">{s.chambreFR || `#${s.id}`} · {s.arrivee} → {s.depart}</span>
                    <span className="font-lato text-neutral-500 text-xs">{s.statut}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <input value={rattacher.code} onChange={(e) => setRattacher((r) => ({ ...r, code: e.target.value }))} placeholder={t('Code', 'Code')} className="flex-1 px-3 py-2 rounded-lg bg-[#0a0808]/60 border border-white/15 text-sm font-lato text-neutral-200 focus:outline-none focus:border-[#c5a059]/50" />
              <input value={rattacher.arrivee} onChange={(e) => setRattacher((r) => ({ ...r, arrivee: e.target.value }))} placeholder="AAAA-MM-JJ" className="w-32 px-3 py-2 rounded-lg bg-[#0a0808]/60 border border-white/15 text-sm font-lato text-neutral-200 focus:outline-none focus:border-[#c5a059]/50" />
              <button onClick={rattacherSejour} className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel uppercase text-[11px] tracking-widest px-4 hover:bg-[#d4b06a]">
                {t('Attach', 'Rattacher')}
              </button>
            </div>
            {rattacherEtat === 'ok' && <p className="font-lato text-[#c5a059] text-xs mt-2">{t('Attached.', 'Rattaché.')}</p>}
            {rattacherEtat === 'non' && <p className="font-lato text-red-400 text-xs mt-2">{t('Not found.', 'Introuvable.')}</p>}
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Tickets', 'Billets')}</h3>
            {!billets ? <p className="text-neutral-600 text-xs font-lato">{t('Loading…', 'Chargement…')}</p> : (
              (billets.spectacles.length + billets.inscriptions.length + billets.contributions.length + billets.camping.length) === 0 ? (
                <p className="font-lato text-neutral-400 text-sm">{t('No tickets.', 'Aucun billet.')}</p>
              ) : (
                <p className="font-lato text-neutral-300 text-sm">
                  {billets.spectacles.length} {t('show ticket(s)', 'billet(s)')} · {billets.inscriptions.length} {t('registration(s)', 'inscription(s)')} · {billets.camping.length} {t('campsite(s)', 'emplacement(s)')}
                </p>
              )
            )}
          </div>

          <div className={section}>
            <h3 className={surtitre}>{t('Community', 'Communauté')}</h3>
            <p className="font-lato text-neutral-300 text-sm">
              {t('{n} friend(s), {m} pending request(s)', '{n} ami(s), {m} demande(s) en attente').replace('{n}', String(amis.amis)).replace('{m}', String(amis.demandes))}
            </p>
          </div>

          <FilAide uid={uid} language={language} nom={nom} />
        </div>
      </div>
    </div>
  );
};

// ─── Le fil d'aide du membre, intégré à la fiche ──────────────────────────────
const FilAide: React.FC<{ uid: string; language: 'EN' | 'FR'; nom: string }> = ({ uid, language, nom }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [messages, setMessages] = useState<{ id: string; auteur: string; texte: string }[]>([]);
  const [reponse, setReponse] = useState('');

  useEffect(() => {
    if (!db) return;
    return onSnapshot(query(collection(db, 'soutien', uid, 'messages')), (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [uid]);

  const repondre = async () => {
    if (!reponse.trim() || !db) return;
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'soutien', uid, 'messages'), { auteur: 'equipe', texte: reponse.trim(), creeLe: serverTimestamp() });
    setReponse('');
  };

  const resoudre = async () => {
    if (!db) return;
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'soutien', uid), { statut: 'resolu' }, { merge: true });
  };

  return (
    <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel text-[11px] uppercase tracking-[0.3em] text-[#c5a059]">{t('Help thread', 'Fil d\'aide')}</h3>
        <button onClick={resoudre} className="font-cinzel uppercase text-[10px] tracking-widest text-neutral-400 hover:text-[#c5a059]">{t('Mark resolved', 'Marquer résolu')}</button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {messages.length === 0 ? <p className="font-lato text-neutral-500 text-sm">{t('No messages.', 'Aucun message.')}</p> : messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-lg ${m.auteur === 'equipe' ? 'ml-0' : 'ml-auto'}`} style={{ background: m.auteur === 'equipe' ? 'rgba(20,16,10,0.6)' : 'rgba(197,160,89,0.14)' }}>
            <p className="font-lato text-neutral-200 text-sm whitespace-pre-wrap">{m.texte}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={reponse} onChange={(e) => setReponse(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void repondre(); }} placeholder={t('Reply as the team', 'Répondre au nom de l\'équipe')} className="flex-1 px-3 py-2 rounded-lg bg-[#0a0808]/60 border border-white/15 text-sm font-lato text-neutral-200 focus:outline-none focus:border-[#c5a059]/50" />
        <button onClick={repondre} disabled={!reponse.trim()} className="rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel uppercase text-[11px] tracking-widest px-4 hover:bg-[#d4b06a] disabled:opacity-40">{t('Send', 'Envoyer')}</button>
      </div>
    </div>
  );
};
