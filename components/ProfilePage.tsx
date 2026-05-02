
import React, { useState, useRef, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, updateDoc, collection, getDocs, query, where, limit, getDoc, onSnapshot, setDoc, serverTimestamp, runTransaction, arrayUnion, Timestamp, deleteField } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';
import { TEAMS, LODGING, LODGING_GROUPS, ChatRoom } from './CeilidhPageTest2';
import { EVENT_ID } from './CeilidhPage';
import { D20Roller, type D20Result } from './D20Roller';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfilePageProps {
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  onNavigate: (view: string) => void;
  onProfileUpdate: (profile: MemberProfile) => void;
  onShowPrivacy?: () => void;
}

const MEMBERSHIP_LABELS: Record<string, { en: string; fr: string; color: string }> = {
  'voyageur':          { en: 'Voyageur',          fr: 'Voyageur',             color: 'text-sky-300'     },
  'artiste':           { en: 'Artiste',            fr: 'Artiste',              color: 'text-purple-300'  },
  'membre-communaute': { en: 'Community Member',   fr: 'Membre Communauté',    color: 'text-emerald-300' },
  'resident':          { en: 'Resident',           fr: 'Résident',             color: 'text-amber-300'   },
  'woofer':            { en: 'Woofer',             fr: 'Woofer',               color: 'text-rose-300'    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfilePage: React.FC<ProfilePageProps> = ({
  language,
  user,
  memberProfile,
  onNavigate,
  onProfileUpdate,
  onShowPrivacy,
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [displayName, setDisplayName] = useState(memberProfile.displayName);
  const [phone, setPhone] = useState(memberProfile.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(memberProfile.photoURL ?? user.photoURL ?? '');

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [showTicket, setShowTicket] = useState<any>(null);
  // ALL registrations across the event — needed by Mon Ceilidh dropdowns to
  // grey out full rooms / teams. Public read per Firestore rules.
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live-subscribe to the user's registration doc so any changes (whether made
  // here or on /ceilidh) reflect immediately. The doc id IS the uid, so we read
  // the single doc rather than running a where('uid','==',uid) query — that
  // also dodges any inconsistency where teamId is stamped on .teams[] but the
  // top-level mirror is stale.
  useEffect(() => {
    if (!db) { setRegistrationsLoading(false); return; }
    const ref = doc(db, 'events', 'ceilidh-mai-2026', 'registrations', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setRegistrations(snap.exists() ? [{ id: snap.id, ...snap.data() }] : []);
        setRegistrationsLoading(false);
      },
      () => { setRegistrationsLoading(false); },
    );
    // Show ticket — one-shot is fine (it's terminal state once paid).
    (async () => {
      try {
        const ticketSnap = await getDoc(doc(db!, 'events', 'ceilidh-mai-2026', 'showTickets', user.uid));
        if (ticketSnap.exists()) setShowTicket(ticketSnap.data());
      } catch (_) {}
    })();
    // All registrations — drives the "full" greyout in the Mon Ceilidh dropdowns.
    const unsubAll = onSnapshot(
      collection(db, 'events', 'ceilidh-mai-2026', 'registrations'),
      (snap) => setAllRegistrations(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }))),
    );
    return () => { unsub(); unsubAll(); };
  }, [user.uid]);

  const handleSave = async () => {
    if (!db || !auth) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const fields: Partial<MemberProfile> = {
        displayName: displayName.trim() || memberProfile.displayName,
        phone: phone.trim() || undefined,
      };
      await updateDoc(doc(db, 'members', user.uid), fields);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: fields.displayName });
      }
      const updated = { ...memberProfile, ...fields };
      onProfileUpdate(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (_) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !db || !auth?.currentUser) return;
    setPhotoUploading(true);
    try {
      const fileRef = storageRef(storage, `members/${user.uid}/avatar`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'members', user.uid), { photoURL: url });
      await updateProfile(auth.currentUser, { photoURL: url });
      setCurrentPhotoURL(url);
      onProfileUpdate({ ...memberProfile, photoURL: url });
    } catch (_) {}
    setPhotoUploading(false);
  };

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    if (!auth) return;
    setSigningOut(true);
    try { await signOut(auth); onNavigate('INN'); } finally { setSigningOut(false); }
  };

  // ── Affiliate request — live subscribe to the user's own request doc ─────
  const [affiliate, setAffiliate] = useState<null | {
    status: 'waiting' | 'accepted' | 'refused';
    code?: string;
    decidedAt?: any;
    createdAt?: any;
  }>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);

  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'affiliateRequests', user.uid);
    return onSnapshot(ref, (snap) => {
      setAffiliate(snap.exists() ? (snap.data() as any) : null);
    });
  }, [user.uid]);

  const requestAffiliate = async () => {
    if (!db || affiliateLoading) return;
    setAffiliateLoading(true);
    try {
      await setDoc(doc(db, 'affiliateRequests', user.uid), {
        uid: user.uid,
        displayName: memberProfile.displayName || user.displayName || '',
        email: memberProfile.email || user.email || '',
        photoURL: memberProfile.photoURL || user.photoURL || '',
        status: 'waiting',
        createdAt: serverTimestamp(),
      }, { merge: true });
    } finally {
      setAffiliateLoading(false);
    }
  };

  // ── COMMUNAUTE coupon — click-to-copy ─────────────────────────────────────
  const [couponCopied, setCouponCopied] = useState(false);
  const copyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 1800);
    });
  };

  // ── Weekly D20 roll ──────────────────────────────────────────────────────
  // The rebate codes are pre-loaded in Firestore at /d20Codes/{tier}/codes/*,
  // one document per code with { value, used: false }. On a winning roll a
  // transaction marks the first unused code as used and records the result
  // on the user's d20 doc. Surcharges (Nat 1) are recorded but not codes.
  // Cooldown = 7 days from lastRollAt (also enforced by Firestore rules).
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  type D20Entry = {
    roll: number;
    rebatePct: number;             // -1 | 0 | 5 | 10 | 20
    tier: D20Result['tier'];
    code?: string;                 // present iff a code was assigned
    rolledAt: any;                 // Firestore Timestamp
  };
  const [d20Doc, setD20Doc] = useState<{
    lastRollAt?: any;
    history?: D20Entry[];
    pendingSurchargePct?: number;  // sum of Nat-1 +1% events
  } | null>(null);
  const [d20Pending, setD20Pending] = useState(false);
  const [d20Error, setD20Error] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'd20Rolls', user.uid);
    return onSnapshot(ref, (snap) => {
      setD20Doc(snap.exists() ? (snap.data() as any) : {});
    });
  }, [user.uid]);

  // Tier → Firestore subcollection of unused codes. Add codes to these
  // collections in advance via the admin tool / Hostaway export.
  const tierCollection = (tier: D20Result['tier']): string | null => {
    switch (tier) {
      case 'good':   return 'd20Codes/good/codes';   // 5%
      case 'great':  return 'd20Codes/great/codes';  // 10%
      case 'nat-20': return 'd20Codes/nat20/codes';  // 20%
      default: return null; // 'nothing' or 'crit-fail' — no code drawn
    }
  };

  const handleD20Result = async (result: D20Result) => {
    if (!db || d20Pending) return;
    setD20Pending(true);
    setD20Error(null);

    const userDocRef = doc(db, 'd20Rolls', user.uid);
    const tierColl = tierCollection(result.tier);

    try {
      // For tiers that get a code, find the first unused code OUTSIDE the
      // transaction (queries inside transactions are limited), then claim
      // it inside a transaction by id so the read+write pair is atomic.
      let claimedCodeValue: string | undefined;
      let claimedCodeId: string | undefined;
      if (tierColl) {
        const q = query(
          collection(db, tierColl),
          where('used', '==', false),
          limit(1),
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error(language === 'FR'
            ? 'Plus aucun code disponible pour ce niveau. Contactez l’hôte.'
            : 'No more codes available at this tier. Please contact the host.');
        }
        claimedCodeId = snap.docs[0].id;
      }

      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userDocRef);
        const data = (userSnap.exists() ? userSnap.data() : {}) as any;
        // Server-side cooldown check — defence in depth on top of the rule.
        const lastTs: Timestamp | undefined = data.lastRollAt;
        if (lastTs && Date.now() - lastTs.toMillis() < COOLDOWN_MS) {
          throw new Error(language === 'FR'
            ? 'Vous avez déjà lancé cette semaine.'
            : 'You\'ve already rolled this week.');
        }

        // Claim the code, if any
        if (claimedCodeId && tierColl) {
          const codeRef = doc(db, tierColl, claimedCodeId);
          const codeSnap = await tx.get(codeRef);
          if (!codeSnap.exists() || codeSnap.data().used) {
            // Race: another roll grabbed it first. Bail; user can re-try.
            throw new Error(language === 'FR'
              ? 'Course de codes — réessayez dans un instant.'
              : 'Code race — please try again in a moment.');
          }
          claimedCodeValue = codeSnap.data().value as string;
          tx.update(codeRef, {
            used: true,
            usedBy: user.uid,
            usedAt: serverTimestamp(),
          });
        }

        const entry: any = {
          roll: result.roll,
          rebatePct: result.rebatePct,
          tier: result.tier,
          rolledAt: Timestamp.now(),
        };
        if (claimedCodeValue) entry.code = claimedCodeValue;

        const update: any = {
          uid: user.uid,
          displayName: memberProfile.displayName || user.displayName || '',
          email: memberProfile.email || user.email || '',
          lastRollAt: serverTimestamp(),
          history: arrayUnion(entry),
        };
        if (result.tier === 'crit-fail') {
          // Sum of Nat-1 surcharges; the host applies this to the next invoice.
          update.pendingSurchargePct = (data.pendingSurchargePct ?? 0) + 1;
        }
        tx.set(userDocRef, update, { merge: true });
      });
    } catch (e: any) {
      setD20Error(e?.message ?? String(e));
    } finally {
      setD20Pending(false);
    }
  };

  // Live ticker so the cooldown countdown updates every second. We only
  // run the interval when actually on cooldown so we're not burning CPU
  // when the user can roll freely.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastRollMs: number | null = d20Doc?.lastRollAt?.toMillis?.() ?? null;
  const msUntilNext = lastRollMs ? Math.max(0, (lastRollMs + COOLDOWN_MS) - nowMs) : 0;
  const onCooldown = msUntilNext > 0;
  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onCooldown]);

  // Format dd:hh:mm:ss with two-digit padding past the day count.
  const cooldownParts = (() => {
    const days  = Math.floor(msUntilNext / 86_400_000);
    const hours = Math.floor((msUntilNext % 86_400_000) / 3_600_000);
    const mins  = Math.floor((msUntilNext % 3_600_000) / 60_000);
    const secs  = Math.floor((msUntilNext % 60_000) / 1_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { days, hours, mins, secs, padded: { hours: pad(hours), mins: pad(mins), secs: pad(secs) } };
  })();

  // ── Time-travel reset — type 'meditate' to clear the cooldown ──────────
  // Honor-system: the password is hardcoded client-side. The dice
  // transaction still revalidates, so resetting then rolling is one round
  // of writes — never an unbounded flood.
  const TIME_TRAVEL_PASSWORD = 'meditate';
  const [travelInput, setTravelInput] = useState('');
  const [travelStatus, setTravelStatus] = useState<'idle' | 'wrong'>('idle');
  const handleTimeTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (travelInput.trim().toLowerCase() !== TIME_TRAVEL_PASSWORD) {
      setTravelStatus('wrong');
      // Clear the wrong-password flash after a beat so a retry doesn't feel sticky.
      setTimeout(() => setTravelStatus('idle'), 1200);
      return;
    }
    setTravelInput('');
    setTravelStatus('idle');
    // Remove the lastRollAt field — the cooldown evaporates immediately.
    await setDoc(doc(db, 'd20Rolls', user.uid), {
      lastRollAt: deleteField(),
    } as any, { merge: true });
  };

  // Most recent code/result — surfaced under the dice for easy copy.
  const lastEntry: D20Entry | null = (d20Doc?.history && d20Doc.history.length)
    ? d20Doc.history[d20Doc.history.length - 1] as D20Entry
    : null;


  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const membership = MEMBERSHIP_LABELS[memberProfile.membershipType] ?? MEMBERSHIP_LABELS['voyageur'];

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-white overflow-y-auto custom-scrollbar selection:bg-[#c5a059] selection:text-black">
      <div>
        {/* ── HERO BAND — editorial intro with avatar + identity ──────────── */}
        <section className="relative bg-[#050505] pt-24 md:pt-32 pb-12 md:pb-16 px-6 md:px-12 lg:px-20 overflow-hidden border-b border-[#c5a059]/10">
          {/* Soft gold radial backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(197,160,89,0.10) 0%, transparent 65%)',
            }}
          />
          <div className="relative max-w-[1400px] mx-auto">
            <button
              onClick={() => onNavigate('INN')}
              className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] hover:text-[#f3e5ab] transition-colors mb-8 inline-block"
            >
              ← {t('Back to the Inn', "Retour à l'auberge")}
            </button>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-8 md:gap-12">
              {/* Avatar */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative shrink-0 group"
                aria-label={t('Change photo', 'Changer la photo')}
              >
                <div
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden"
                  style={{
                    border: '2px solid rgba(243,229,171,0.55)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 0 60px rgba(197,160,89,0.18)',
                  }}
                >
                  {currentPhotoURL ? (
                    <img src={currentPhotoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1f1810' }}>
                      <span className="text-3xl md:text-4xl font-prata text-[#f3e5ab]">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {photoUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="font-cinzel text-[#f3e5ab] text-[9px] uppercase tracking-[0.4em]">
                      {t('Change', 'Changer')}
                    </span>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </button>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <span className="font-cinzel text-[#c5a059] text-[10px] md:text-xs uppercase tracking-[0.55em] block mb-3">
                  {t('Member Space', 'Espace Membre')}
                </span>
                <h1
                  className="font-prata uppercase text-[#f3e5ab] leading-[0.9] tracking-[-0.01em] mb-3"
                  style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
                >
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-cinzel text-[10px] uppercase tracking-[0.4em] px-3 py-1 rounded-full"
                    style={{
                      color: '#f3e5ab',
                      background: 'rgba(197,160,89,0.15)',
                      border: '1px solid rgba(197,160,89,0.4)',
                    }}
                  >
                    {language === 'FR' ? membership.fr : membership.en}
                  </span>
                  {memberProfile.isAdmin && (
                    <span
                      className="font-cinzel uppercase tracking-[0.4em] px-3 py-1 rounded-full text-[#1a1208]"
                      style={{
                        fontSize: '10px',
                        background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                        boxShadow: '0 2px 8px rgba(197,160,89,0.5)',
                      }}
                    >
                      Admin
                    </span>
                  )}
                  {(memberProfile.email || memberProfile.phone) && (
                    <span className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.2em] truncate">
                      {memberProfile.email || memberProfile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
        <section className="bg-[#050505] py-12 md:py-16 px-6 md:px-12 lg:px-20">
          <div className="max-w-[1400px] mx-auto">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-5">
              {t('Quick access', 'Accès rapide')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <DashboardTile
                onClick={() => onNavigate('MESSAGING')}
                eyebrow={t('Inbox', 'Boîte de réception')}
                title={t('Messages', 'Messages')}
                body={t('DMs and group conversations', 'Messages directs et conversations de groupe')}
                icon="✉"
              />
              <DashboardTile
                onClick={() => onNavigate('CEILIDH')}
                eyebrow={t('21–25 May 2026', '21–25 mai 2026')}
                title={t('Ceilidh de Mai', 'Ceilidh de Mai')}
                body={t('Programme · teams · lodging · chats', 'Programme · équipes · hébergement · chats')}
                icon="✮"
              />
              <DashboardTile
                onClick={() => onNavigate('WWOOFING')}
                eyebrow={t('Live & work', 'Vivre & travailler')}
                title={t('Wwoofing', 'Wwoofing')}
                body={t('Stay longer in exchange for work', 'Rester plus longtemps en échange de travail')}
                icon="⚑"
              />
            </div>
          </div>
        </section>

        {/* ── EDIT PROFILE + EVENTS — two columns on desktop, stacked on mobile ─ */}
        <section className="bg-[#050505] py-12 md:py-16 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 md:gap-8">

            {/* Edit profile card */}
            <div
              className="p-6 md:p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
                border: '1px solid rgba(197,160,89,0.2)',
              }}
            >
              <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-4">
                {t('Edit profile', 'Modifier le profil')}
              </span>
              <div className="space-y-5">
                <div>
                  <label className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em] block mb-2">
                    {t('Display name', 'Nom affiché')}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
                    style={{ border: '1px solid rgba(197,160,89,0.3)' }}
                  />
                </div>

                <div>
                  <label className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em] block mb-2">
                    {t('Phone', 'Téléphone')}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t('e.g. +1 514 555 0000', 'ex. +1 514 555 0000')}
                    className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors placeholder:text-neutral-600"
                    style={{ border: '1px solid rgba(197,160,89,0.3)' }}
                  />
                </div>

                <div>
                  <label className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em] block mb-2">
                    {t('Email', 'Courriel')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={memberProfile.email}
                      disabled
                      className="flex-1 bg-black/30 text-neutral-500 px-4 py-3 rounded-lg font-josefin text-sm cursor-not-allowed"
                      style={{ border: '1px solid rgba(197,160,89,0.15)' }}
                    />
                    <span className="font-cinzel text-neutral-600 text-[9px] uppercase tracking-[0.35em] shrink-0">
                      {t('Managed by Google', 'Géré par Google')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 rounded-lg font-cinzel text-[#1a1208] text-[10px] uppercase tracking-[0.45em] disabled:opacity-40 transition-transform hover:scale-[1.02] active:scale-[0.99]"
                    style={{
                      background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                      boxShadow: '0 4px 16px rgba(197,160,89,0.4)',
                    }}
                  >
                    {saving ? t('Saving…', 'Sauvegarde…') : t('Save changes', 'Sauvegarder')}
                  </button>
                  {saveStatus === 'saved' && (
                    <span className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em]">{t('Saved', 'Sauvegardé')}</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="font-cinzel text-red-400 text-[10px] uppercase tracking-[0.4em]">{t('Error', 'Erreur')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Events / registrations card */}
            <div
              className="p-6 md:p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
                border: '1px solid rgba(197,160,89,0.2)',
              }}
            >
              <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-4">
                {t('My events', 'Mes événements')}
              </span>

              {registrationsLoading ? (
                <div className="flex items-center gap-3 text-neutral-500 text-sm py-6">
                  <div className="w-4 h-4 border-2 border-neutral-700 border-t-[#c5a059] rounded-full animate-spin" />
                  {t('Loading…', 'Chargement…')}
                </div>
              ) : registrations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-josefin text-neutral-400 text-sm leading-relaxed">
                    {t('No registrations yet.', "Aucune inscription pour l'instant.")}
                  </p>
                  <button
                    onClick={() => onNavigate('CEILIDH')}
                    className="mt-4 font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] hover:text-[#f3e5ab] transition-colors"
                  >
                    {t('Open Ceilidh de Mai 2026', 'Ouvrir le Ceilidh de Mai 2026')} →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.map(reg => (
                    <div
                      key={reg.id}
                      className="p-5 rounded-xl"
                      style={{ background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(197,160,89,0.18)' }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] block mb-1">
                            Grand Ceilidh de Mai 2026
                          </span>
                          <p className="font-prata text-[#f3e5ab] text-base">
                            {language === 'FR' ? 'Inscription confirmée' : 'Registration confirmed'}
                          </p>
                        </div>
                        <span
                          className="font-cinzel uppercase tracking-[0.35em] px-2 py-1 rounded-full text-[#3a7d44] shrink-0"
                          style={{ fontSize: '9px', background: 'rgba(58,125,68,0.15)', border: '1px solid rgba(58,125,68,0.4)' }}
                        >
                          ✓ {t('Registered', 'Inscrit·e')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {reg.teamName && (
                          <Datum label={t('Team', 'Équipe')} value={reg.teamName} />
                        )}
                        {reg.roomName && (
                          <Datum label={t('Lodging', 'Hébergement')} value={reg.roomName} />
                        )}
                        {reg.arrivalDate && (
                          <Datum label={t('Arrival', 'Arrivée')} value={reg.arrivalDate} />
                        )}
                        {reg.departureDate && (
                          <Datum label={t('Departure', 'Départ')} value={reg.departureDate} />
                        )}
                      </div>
                      {reg.isChefEquipe && (
                        <p className="mt-3 font-cinzel text-[#d4af37] text-[10px] uppercase tracking-[0.4em]">
                          ★ {t('Team leader', "Chef d'équipe")}
                        </p>
                      )}
                      <button
                        onClick={() => onNavigate('CEILIDH')}
                        className="mt-4 font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em] hover:text-[#f3e5ab] transition-colors"
                      >
                        {t('View event page', 'Voir la page événement')} →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── SHOW TICKET — only when paid ─────────────────────────────────── */}
        {showTicket && (
          <section className="bg-[#050505] py-12 md:py-16 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
            <div className="max-w-3xl mx-auto">
              <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-4">
                {t('Show ticket', 'Billet spectacle')}
              </span>
              <div
                className="p-6 md:p-8 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(50,40,22,0.85) 0%, rgba(28,22,12,0.95) 100%)',
                  border: '1px solid rgba(243,229,171,0.5)',
                  boxShadow: '0 0 60px rgba(197,160,89,0.18)',
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] block mb-1">
                      Grand Ceilidh de Mai 2026
                    </span>
                    <p className="font-prata text-[#f3e5ab] text-lg md:text-xl">
                      {showTicket.ticketType === 'weekend' ? t('Weekend pass · 3 shows', 'Passe weekend · 3 spectacles') : t('Single show', '1 spectacle')}
                    </p>
                    {showTicket.ticketType === 'single' && showTicket.nights?.length > 0 && (
                      <p className="font-josefin text-neutral-300 text-xs uppercase tracking-[0.25em] mt-1">
                        {showTicket.nights.map((n: string) => n.slice(8, 10) + '/05').join(' · ')}
                      </p>
                    )}
                  </div>
                  <span
                    className="font-cinzel uppercase tracking-[0.35em] px-2 py-1 rounded-full text-[#3a7d44] shrink-0"
                    style={{ fontSize: '9px', background: 'rgba(58,125,68,0.15)', border: '1px solid rgba(58,125,68,0.4)' }}
                  >
                    ✓ {t('Paid', 'Payé')}
                  </span>
                </div>

                <div
                  className="rounded-xl p-5 text-center printable-ticket"
                  style={{ background: '#050505', border: '1px solid rgba(243,229,171,0.3)' }}
                >
                  <p className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.45em] mb-2">
                    {t('Your code — show at the door', "Votre code — à présenter à l'entrée")}
                  </p>
                  <p className="font-prata text-[#d4af37] my-3" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '0.3em' }}>
                    {showTicket.ticketCode}
                  </p>
                  <p className="font-josefin text-neutral-500 text-[9px] uppercase tracking-[0.25em]">
                    Maison Favier · Namur QC · 21–25 {t('May', 'mai')}
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full mt-5 py-3 rounded-lg font-cinzel text-neutral-300 text-[10px] uppercase tracking-[0.45em] hover:text-[#f3e5ab] hover:bg-[#c5a059]/10 transition-all"
                  style={{ border: '1px solid rgba(197,160,89,0.4)' }}
                >
                  {t('Print ticket', 'Imprimer le billet')}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── MON CEILIDH — chats + quick team/bed pickers (only when registered) ── */}
        {registrations.length > 0 && (
          <section className="bg-[#050505] py-12 md:py-16 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
            <div className="max-w-[1400px] mx-auto">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-2">
                    Grand Ceilidh de Mai 2026
                  </span>
                  <h3
                    className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em]"
                    style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}
                  >
                    {t('My Ceilidh', 'Mon Ceilidh')}
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('CEILIDH')}
                  className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] hover:text-[#f3e5ab] transition-colors"
                >
                  {t('Open the booklet', 'Ouvrir le livret')} →
                </button>
              </div>

              <MyCeilidhPanel
                language={language}
                user={user}
                memberProfile={memberProfile}
                registration={registrations[0]}
                allRegistrations={allRegistrations}
              />
            </div>
          </section>
        )}

        {/* ── COMMUNITY PERKS — coupon + affiliate program ────────────────── */}
        <section className="bg-[#050505] py-12 md:py-16 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
          <div className="max-w-[1400px] mx-auto">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-5">
              {t('Community perks', 'Avantages communauté')}
            </span>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

              {/* COMMUNAUTE static coupon */}
              <div
                className="p-6 md:p-8 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(50,40,22,0.85) 0%, rgba(28,22,12,0.95) 100%)',
                  border: '1px solid rgba(243,229,171,0.45)',
                  boxShadow: '0 0 60px rgba(197,160,89,0.15)',
                }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em]">
                    {t('Promo code', 'Code promo')}
                  </span>
                  <span className="font-prata text-[#f3e5ab] text-2xl">10%</span>
                </div>
                <p className="font-josefin text-neutral-300 text-sm leading-relaxed mb-5">
                  {t(
                    'For everyone who chooses to stay with us. Use this code on any reservation.',
                    "Pour toutes celles et ceux qui choisissent de rester chez nous. Utilisez ce code lors d'une réservation.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => copyCoupon('COMMUNAUTE')}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-lg transition-all hover:bg-black/20"
                  style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}
                >
                  <span className="font-prata text-[#d4af37] text-xl tracking-[0.3em]">COMMUNAUTE</span>
                  <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em]">
                    {couponCopied ? t('Copied ✓', 'Copié ✓') : t('Tap to copy', 'Toucher pour copier')}
                  </span>
                </button>
              </div>

              {/* Affiliate program */}
              <div
                className="p-6 md:p-8 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
                  border: '1px solid rgba(197,160,89,0.22)',
                }}
              >
                <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] block mb-3">
                  {t('Affiliate program', 'Programme affilié')}
                </span>
                <h4
                  className="font-prata uppercase text-[#f3e5ab] leading-tight mb-3"
                  style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)' }}
                >
                  {t(
                    'Become an affiliate · earn 10% on stays of 2 nights or more',
                    'Devenir affilié · gagner 10% par réservation de 2 jours ou plus',
                  )}
                </h4>
                <p className="font-josefin text-neutral-400 text-sm leading-relaxed mb-5">
                  {t(
                    'Share a personal code with your network. We pay you 10% of every booking that uses it (minimum 2 nights).',
                    'Partagez un code personnel avec votre réseau. Nous vous versons 10% sur chaque réservation qui l’utilise (minimum 2 nuits).',
                  )}
                </p>

                {/* State machine: no request | waiting | accepted (show code) | refused */}
                {!affiliate && (
                  <button
                    type="button"
                    onClick={requestAffiliate}
                    disabled={affiliateLoading}
                    className="w-full px-5 py-3.5 rounded-lg font-cinzel text-[#1a1208] text-[10px] uppercase tracking-[0.45em] disabled:opacity-40 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                      boxShadow: '0 4px 16px rgba(197,160,89,0.4)',
                    }}
                  >
                    {affiliateLoading
                      ? t('Sending…', 'Envoi…')
                      : t('Request to become an affiliate', 'Demander à devenir affilié')}
                  </button>
                )}

                {affiliate?.status === 'waiting' && (
                  <div
                    className="px-5 py-4 rounded-lg flex items-center gap-3"
                    style={{ background: 'rgba(8,6,4,0.55)', border: '1px solid rgba(197,160,89,0.4)' }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-[#c5a059]"
                      style={{ animation: 'profilePulse 2.2s ease-in-out infinite' }}
                      aria-hidden
                    />
                    <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.4em]">
                      {t('Waiting for approval', 'En attente d’approbation')}
                    </span>
                  </div>
                )}

                {affiliate?.status === 'accepted' && affiliate.code && (
                  <div className="space-y-3">
                    <p className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em]">
                      ✓ {t('You’re an affiliate', 'Vous êtes affilié·e')}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyCoupon(affiliate.code!)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-lg transition-all hover:bg-black/20"
                      style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}
                    >
                      <span className="font-prata text-[#d4af37] text-xl tracking-[0.3em]">
                        {affiliate.code}
                      </span>
                      <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em]">
                        {couponCopied ? t('Copied ✓', 'Copié ✓') : t('Tap to copy', 'Toucher pour copier')}
                      </span>
                    </button>
                  </div>
                )}

                {affiliate?.status === 'refused' && (
                  <div
                    className="px-5 py-4 rounded-lg"
                    style={{ background: 'rgba(8,6,4,0.55)', border: '1px solid rgba(220,90,90,0.3)' }}
                  >
                    <p className="font-cinzel text-red-400/80 text-[10px] uppercase tracking-[0.4em]">
                      {t('Request not approved at this time', 'Demande non approuvée pour l’instant')}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
          <style>{`
            @keyframes profilePulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%      { opacity: 0.5; transform: scale(1.4); }
            }
          `}</style>
        </section>

        {/* ── WEEKLY D20 ROLL ───────────────────────────────────────────────
            Once per week, the member rolls a 3D D20. Codes are drawn
            atomically from a Firestore pool so each rebate code is one-time.
            Nat 1 records a pending surcharge instead of issuing a code. */}
        <section className="bg-[#050505] py-12 md:py-16 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
              <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block">
                {t('Weekly roll', 'Lancer hebdomadaire')}
              </span>
              {d20Doc?.pendingSurchargePct ? (
                <span className="font-cinzel text-rose-400/80 text-[10px] uppercase tracking-[0.4em]">
                  {t('Pending surcharge', 'Majoration en attente')}: +{d20Doc.pendingSurchargePct}%
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
              {/* The 3D dice */}
              <div
                className="p-5 md:p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.85) 100%)',
                  border: '1px solid rgba(197,160,89,0.22)',
                }}
              >
                <D20Roller
                  language={language}
                  disabled={onCooldown || d20Pending}
                  disabledMessage={d20Pending ? t('Saving…', 'Enregistrement…') : undefined}
                  onResult={handleD20Result}
                />
                {d20Error && (
                  <p className="mt-3 text-center font-josefin text-rose-400 text-xs">
                    {d20Error}
                  </p>
                )}

                {/* Live cooldown ticker — only shown after a first roll
                    while the 7-day timer is still running. */}
                {onCooldown && (
                  <div className="mt-5 text-center">
                    <p className="font-cinzel text-[#c5a059]/80 text-[9px] uppercase tracking-[0.45em] mb-2">
                      {t('Next roll in', 'Prochain lancer dans')}
                    </p>
                    <div className="inline-flex items-baseline gap-2 font-prata text-[#f3e5ab]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <span className="text-2xl">{cooldownParts.days}</span>
                      <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">
                        {t('d', 'j')}
                      </span>
                      <span className="text-2xl">{cooldownParts.padded.hours}</span>
                      <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">h</span>
                      <span className="text-2xl">{cooldownParts.padded.mins}</span>
                      <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">m</span>
                      <span className="text-2xl">{cooldownParts.padded.secs}</span>
                      <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">s</span>
                    </div>

                    {/* Time-travel passphrase. Discreet — small italic prompt,
                        only the input grows when focused. Wrong password
                        flashes red briefly. */}
                    <form onSubmit={handleTimeTravel} className="mt-5 flex justify-center">
                      <input
                        type="password"
                        value={travelInput}
                        onChange={(e) => { setTravelInput(e.target.value); setTravelStatus('idle'); }}
                        placeholder={t('time travel…', 'voyage temporel…')}
                        className={`bg-transparent border-b text-center font-josefin text-[11px] tracking-[0.25em] w-44 py-1 focus:outline-none transition-colors ${
                          travelStatus === 'wrong'
                            ? 'border-rose-500 text-rose-400 placeholder:text-rose-500/40'
                            : 'border-white/10 text-neutral-400 hover:border-white/20 focus:border-[#c5a059]/60 focus:text-[#f3e5ab] placeholder:text-neutral-700'
                        }`}
                      />
                    </form>
                  </div>
                )}
              </div>

              {/* The "what you can win" panel + last code */}
              <div
                className="p-6 md:p-8 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(50,40,22,0.4) 0%, rgba(20,16,10,0.85) 100%)',
                  border: '1px solid rgba(243,229,171,0.2)',
                }}
              >
                <h4
                  className="font-prata uppercase text-[#f3e5ab] leading-tight mb-4"
                  style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)' }}
                >
                  {t('What the dice decides', 'Ce que les dés décident')}
                </h4>

                <ul className="space-y-2.5 font-josefin text-sm mb-6">
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="font-cinzel text-rose-400 text-[10px] uppercase tracking-[0.4em]">1 · {t('Crit fail', 'Échec critique')}</span>
                    <span className="text-rose-300/80 text-xs">+1% {t('on the invoice', 'sur la facture')}</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="font-cinzel text-neutral-500 text-[10px] uppercase tracking-[0.4em]">2 – 10</span>
                    <span className="text-neutral-500 text-xs">{t('Nothing', 'Rien')}</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="font-cinzel text-amber-300 text-[10px] uppercase tracking-[0.4em]">11 – 15</span>
                    <span className="text-amber-200 text-xs">5% {t('rebate code', 'code de rabais')}</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">16 – 19</span>
                    <span className="text-[#d4af37] text-xs">10% {t('rebate code', 'code de rabais')}</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.4em]">20 · Nat 20</span>
                    <span className="text-[#f3e5ab] text-xs font-bold">20% {t('rebate code', 'code de rabais')}</span>
                  </li>
                </ul>

                <p className="font-josefin text-neutral-500 text-[11px] leading-relaxed mb-5">
                  {t(
                    'One roll per week. Each rebate code is one-time and drawn from a finite pool — first to roll, first served.',
                    'Un lancer par semaine. Chaque code de rabais est unique et tiré d\'un nombre limité — premier arrivé, premier servi.',
                  )}
                </p>

                {/* Last code panel — copy-ready */}
                {lastEntry?.code && (
                  <div className="mt-2">
                    <p className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em] mb-2">
                      ✓ {t('Your latest code', 'Votre dernier code')} · {lastEntry.rebatePct}%
                    </p>
                    <button
                      type="button"
                      onClick={() => copyCoupon(lastEntry.code!)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-lg transition-all hover:bg-black/20"
                      style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}
                    >
                      <span className="font-prata text-[#d4af37] text-xl tracking-[0.3em]">{lastEntry.code}</span>
                      <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em]">
                        {couponCopied ? t('Copied ✓', 'Copié ✓') : t('Tap to copy', 'Toucher pour copier')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── ACCOUNT FOOTER ───────────────────────────────────────────────── */}
        <section className="bg-[#050505] py-10 md:py-14 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <button
              onClick={() => onShowPrivacy && onShowPrivacy()}
              className="font-cinzel text-neutral-500 text-[10px] uppercase tracking-[0.45em] hover:text-[#f3e5ab] transition-colors"
            >
              {t('Privacy policy', 'Politique de confidentialité')}
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="font-cinzel text-red-400/70 text-[10px] uppercase tracking-[0.45em] hover:text-red-300 transition-colors disabled:opacity-40"
            >
              {signingOut ? t('Signing out…', 'Déconnexion…') : t('Sign out', 'Déconnexion')}
            </button>
          </div>
        </section>

        {/* Bottom safe area */}
        <div className="h-20 bg-[#050505]" />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Tiles + Atoms
// ─────────────────────────────────────────────────────────────────────────

const DashboardTile: React.FC<{
  eyebrow: string; title: string; body: string; icon: string;
  onClick: () => void;
}> = ({ eyebrow, title, body, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group text-left p-6 rounded-2xl transition-all hover:-translate-y-0.5"
    style={{
      background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
      border: '1px solid rgba(197,160,89,0.22)',
    }}
  >
    <div className="flex items-start justify-between mb-4">
      <span className="font-prata text-[#c5a059] text-2xl leading-none" aria-hidden>{icon}</span>
      <span className="font-cinzel text-neutral-300 text-[10px] uppercase tracking-[0.45em] group-hover:text-[#f3e5ab] transition-colors">
        →
      </span>
    </div>
    <span className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.5em] block mb-2">
      {eyebrow}
    </span>
    <p className="font-prata uppercase text-[#f3e5ab] leading-tight mb-2" style={{ fontSize: '1.1rem' }}>
      {title}
    </p>
    <p className="font-josefin text-neutral-400 text-xs uppercase leading-relaxed" style={{ letterSpacing: '0.18em' }}>
      {body}
    </p>
  </button>
);

const Datum: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.4em] mb-1">{label}</p>
    <p className="font-josefin text-[#f3e5ab] text-sm">{value}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MyCeilidhPanel — embedded picker + chats for registered members.
//
// Lets the user change their team and bed without leaving the dashboard, and
// shows the same general + team-specific chat panes as the Ceilidh page itself.
// Writes go to events/{EVENT_ID}/registrations/{uid} (the same doc the user
// already owns), so changes propagate live to /ceilidh.
// ─────────────────────────────────────────────────────────────────────────────

const MyCeilidhPanel: React.FC<{
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  registration: any;
  allRegistrations: any[];
}> = ({ language, user, memberProfile, registration, allRegistrations }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  // The user's currently-picked team + room are derived from the registration.
  const currentTeamId = (registration?.teams?.[0]?.teamId as string | undefined) ?? '';
  const currentRoomId = (registration?.roomId as string | undefined) ?? '';

  // Live counts per team / room. Don't count the user themselves so they can
  // always re-select their own current pick (no false "full" lockout).
  const otherRegs = allRegistrations.filter((r) => r.uid !== user.uid);
  const teamCounts = new Map<string, number>();
  otherRegs.forEach((r) => {
    (r.teams || []).forEach((m: any) => {
      if (!m?.teamId) return;
      teamCounts.set(m.teamId, (teamCounts.get(m.teamId) || 0) + 1);
    });
  });
  const roomCounts = new Map<string, number>();
  otherRegs.forEach((r) => {
    if (r.roomId) roomCounts.set(r.roomId, (roomCounts.get(r.roomId) || 0) + 1);
    else if (r.roomName) {
      // Legacy regs may use roomName instead of roomId — map back where possible.
      const m = LODGING.find((l) => l.nameEn === r.roomName || l.nameFr === r.roomName);
      if (m) roomCounts.set(m.id, (roomCounts.get(m.id) || 0) + 1);
    }
  });
  const isTeamFull = (id: string, max: number) => (teamCounts.get(id) || 0) >= max && id !== currentTeamId;
  const isRoomFull = (id: string, cap: number) => (roomCounts.get(id) || 0) >= cap && id !== currentRoomId;

  const [savingTeam, setSavingTeam] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  // Default work-days when joining a team — full Fri–Mon arc.
  const ALL_WORK_DAYS = ['2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'];

  const setTeam = async (teamId: string) => {
    if (!db || !teamId) return;
    setSavingTeam(true);
    try {
      const team = TEAMS.find((x) => x.id === teamId);
      await setDoc(
        doc(db, `events/${EVENT_ID}/registrations`, user.uid),
        {
          uid: user.uid,
          displayName: memberProfile.displayName || user.displayName || '',
          email: memberProfile.email || user.email || '',
          photoURL: memberProfile.photoURL || user.photoURL || '',
          teams: [{ teamId, days: ALL_WORK_DAYS, isSupport: false }],
          teamId,
          teamName: team
            ? language === 'FR' ? team.nameFr : team.nameEn
            : '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } finally {
      setSavingTeam(false);
    }
  };

  const setRoom = async (roomId: string) => {
    if (!db || !roomId) return;
    setSavingRoom(true);
    try {
      const room = LODGING.find((l) => l.id === roomId);
      await setDoc(
        doc(db, `events/${EVENT_ID}/registrations`, user.uid),
        {
          roomId,
          roomName: room
            ? language === 'FR' ? room.nameFr : room.nameEn
            : '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } finally {
      setSavingRoom(false);
    }
  };

  // Arrival day + time — captured at signup-or-edit and shown on the public
  // profile so others know when to expect this person.
  const currentArrivalDate = (registration?.arrivalDate as string | undefined) ?? '';
  const currentArrivalTime = (registration?.arrivalTime as string | undefined) ?? '';
  const [savingArrival, setSavingArrival] = useState(false);
  const setArrival = async (next: { arrivalDate?: string; arrivalTime?: string }) => {
    if (!db) return;
    setSavingArrival(true);
    try {
      await setDoc(
        doc(db, `events/${EVENT_ID}/registrations`, user.uid),
        { ...next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } finally {
      setSavingArrival(false);
    }
  };
  const ARRIVAL_DAYS_OPTIONS = [
    { id: '2026-05-21', en: 'Thu, May 21',  fr: 'Jeu, 21 mai' },
    { id: '2026-05-22', en: 'Fri, May 22',  fr: 'Ven, 22 mai' },
    { id: '2026-05-23', en: 'Sat, May 23',  fr: 'Sam, 23 mai' },
    { id: '2026-05-24', en: 'Sun, May 24',  fr: 'Dim, 24 mai' },
  ];

  const fieldStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
    border: '1px solid rgba(197,160,89,0.22)',
    borderRadius: '14px',
  };

  return (
    <div className="space-y-6">
      {/* Quick pickers — team + bed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team picker */}
        <div className="p-5 md:p-6" style={fieldStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em]">
              {t('My team', 'Mon équipe')}
            </span>
            {savingTeam && (
              <span className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.35em]">
                {t('Saving…', 'Enregistrement…')}
              </span>
            )}
          </div>
          <select
            value={currentTeamId}
            onChange={(e) => setTeam(e.target.value)}
            className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
            style={{ border: '1px solid rgba(197,160,89,0.3)' }}
          >
            <option value="">{t('— Choose a team —', '— Choisir une équipe —')}</option>
            {TEAMS.map((team) => {
              const full = isTeamFull(team.id, team.maxMembers);
              const count = (teamCounts.get(team.id) || 0) + (team.id === currentTeamId ? 1 : 0);
              const label = `${team.emoji}  ${language === 'FR' ? team.nameFr : team.nameEn}  · ${count}/${team.maxMembers}${full ? ` · ${t('full', 'complète')}` : ''}`;
              return (
                <option key={team.id} value={team.id} disabled={full}>{label}</option>
              );
            })}
          </select>
        </div>

        {/* Bed picker */}
        <div className="p-5 md:p-6" style={fieldStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em]">
              {t('My bed', 'Mon lit')}
            </span>
            {savingRoom && (
              <span className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.35em]">
                {t('Saving…', 'Enregistrement…')}
              </span>
            )}
          </div>
          <select
            value={currentRoomId}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
            style={{ border: '1px solid rgba(197,160,89,0.3)' }}
          >
            <option value="">{t('— Choose a bed —', '— Choisir un lit —')}</option>
            {LODGING_GROUPS.map((g) => (
              <optgroup key={g.id} label={language === 'FR' ? g.fr : g.en}>
                {LODGING.filter((l) => l.group === g.id).map((l) => {
                  const full = isRoomFull(l.id, l.capacity);
                  const count = (roomCounts.get(l.id) || 0) + (l.id === currentRoomId ? 1 : 0);
                  const label = `${l.icon}  ${language === 'FR' ? l.nameFr : l.nameEn}  · ${count}/${l.capacity}${full ? ` · ${t('full', 'complet')}` : ''}`;
                  return (
                    <option key={l.id} value={l.id} disabled={full}>{label}</option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Arrival day + time — visible on your public profile so others know
          when to expect you. Saved on the registration doc. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 md:p-6" style={fieldStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em]">
              {t('Arrival day', "Jour d'arrivée")}
            </span>
            {savingArrival && (
              <span className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.35em]">
                {t('Saving…', 'Enregistrement…')}
              </span>
            )}
          </div>
          <select
            value={currentArrivalDate}
            onChange={(e) => setArrival({ arrivalDate: e.target.value })}
            className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
            style={{ border: '1px solid rgba(197,160,89,0.3)' }}
          >
            <option value="">{t('— Choose a day —', '— Choisir un jour —')}</option>
            {ARRIVAL_DAYS_OPTIONS.map((d) => (
              <option key={d.id} value={d.id}>{language === 'FR' ? d.fr : d.en}</option>
            ))}
          </select>
        </div>

        <div className="p-5 md:p-6" style={fieldStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em]">
              {t('Arrival time', 'Heure d\'arrivée')}
            </span>
          </div>
          <input
            type="time"
            value={currentArrivalTime}
            onChange={(e) => setArrival({ arrivalTime: e.target.value })}
            className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
            style={{ border: '1px solid rgba(197,160,89,0.3)' }}
          />
          <p className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.25em] mt-2">
            {t('Visible on your public profile', 'Visible sur votre profil public')}
          </p>
        </div>
      </div>

      {/* Chat rooms — general + team. Mirror the Ceilidh page chats so the
          conversation lives wherever the member is. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChatRoom
          path={`events/${EVENT_ID}/chats/general/messages`}
          title={t('General chat', 'Salon général')}
          emptyEn="No messages yet — say hi."
          emptyFr="Pas de message — dites bonjour."
          language={language}
          user={user}
          onRequireAuth={() => { /* user is already authed at this point */ }}
        />
        <ChatRoom
          path={currentTeamId ? `events/${EVENT_ID}/teamChats/${currentTeamId}/messages` : ''}
          title={
            currentTeamId
              ? `${t('Team chat', 'Salon d’équipe')} · ${
                  language === 'FR'
                    ? TEAMS.find((x) => x.id === currentTeamId)?.nameFr
                    : TEAMS.find((x) => x.id === currentTeamId)?.nameEn
                }`
              : t('Team chat', 'Salon d’équipe')
          }
          emptyEn="No messages yet — start the conversation."
          emptyFr="Pas de message — lancez la discussion."
          language={language}
          user={user}
          onRequireAuth={() => {}}
          locked={!currentTeamId}
          lockedHintEn="Pick a team above to unlock its private chat."
          lockedHintFr="Choisissez une équipe ci-dessus pour ouvrir son salon privé."
        />
      </div>
    </div>
  );
};
