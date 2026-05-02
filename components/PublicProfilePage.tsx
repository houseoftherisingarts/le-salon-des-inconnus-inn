
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp,
  collection, query, where, getDocs, addDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfilePageProps {
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  targetUid: string;
  onNavigate: (view: string) => void;
  onStartDM: (conversationId: string) => void;
  onRequireAuth: () => void;
}

type FriendStatus = 'none' | 'pending-sent' | 'pending-received' | 'friends';

const MEMBERSHIP_LABELS: Record<string, { en: string; fr: string; color: string }> = {
  'voyageur':          { en: 'Voyageur',        fr: 'Voyageur',           color: 'text-sky-300'     },
  'artiste':           { en: 'Artiste',          fr: 'Artiste',            color: 'text-purple-300'  },
  'membre-communaute': { en: 'Community Member', fr: 'Membre Communauté',  color: 'text-emerald-300' },
  'resident':          { en: 'Resident',         fr: 'Résident',           color: 'text-amber-300'   },
  'woofer':            { en: 'Woofer',           fr: 'Woofer',             color: 'text-rose-300'    },
};

function friendshipId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

function dmId(uid1: string, uid2: string): string {
  return 'dm_' + [uid1, uid2].sort().join('_');
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({
  language,
  user,
  memberProfile,
  targetUid,
  onNavigate,
  onStartDM,
  onRequireAuth,
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendLoading, setFriendLoading] = useState(false);
  const [commonEvents, setCommonEvents] = useState<string[]>([]);
  // Target's Ceilidh registration — used to surface arrival day + time, team, lodging.
  const [targetReg, setTargetReg] = useState<any | null>(null);

  const isSelf = user?.uid === targetUid;

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db!, 'members', targetUid));
        if (snap.exists()) setProfile(snap.data() as MemberProfile);
        // Pull their Ceilidh registration too — public-read per Firestore rules.
        const regSnap = await getDoc(doc(db!, 'events', 'ceilidh-mai-2026', 'registrations', targetUid));
        if (regSnap.exists()) setTargetReg(regSnap.data());
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, [targetUid]);

  // Load friendship status
  useEffect(() => {
    if (!db || !user || isSelf) return;
    const load = async () => {
      try {
        const fSnap = await getDoc(doc(db!, 'friendships', friendshipId(user.uid, targetUid)));
        if (fSnap.exists()) {
          const data = fSnap.data();
          if (data.status === 'accepted') {
            setFriendStatus('friends');
          } else if (data.requestedBy === user.uid) {
            setFriendStatus('pending-sent');
          } else {
            setFriendStatus('pending-received');
          }
        }
      } catch (_) {}
    };
    load();
  }, [user, targetUid, isSelf]);

  // Load common event registrations
  useEffect(() => {
    if (!db || !user || isSelf) return;
    const load = async () => {
      try {
        const [mySnap, theirSnap] = await Promise.all([
          getDocs(query(collection(db!, 'events', 'ceilidh-mai-2026', 'registrations'), where('uid', '==', user.uid))),
          getDocs(query(collection(db!, 'events', 'ceilidh-mai-2026', 'registrations'), where('uid', '==', targetUid))),
        ]);
        if (!mySnap.empty && !theirSnap.empty) {
          setCommonEvents(['Grand Ceilidh de Mai 2026']);
        }
      } catch (_) {}
    };
    load();
  }, [user, targetUid, isSelf]);

  const handleAddFriend = async () => {
    if (!user || !db) { onRequireAuth(); return; }
    setFriendLoading(true);
    try {
      const fId = friendshipId(user.uid, targetUid);
      await setDoc(doc(db, 'friendships', fId), {
        uids: [user.uid, targetUid].sort(),
        status: 'pending',
        requestedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setFriendStatus('pending-sent');
    } catch (_) {}
    setFriendLoading(false);
  };

  const handleAcceptFriend = async () => {
    if (!user || !db) return;
    setFriendLoading(true);
    try {
      await setDoc(doc(db, 'friendships', friendshipId(user.uid, targetUid)), {
        uids: [user.uid, targetUid].sort(),
        status: 'accepted',
        requestedBy: targetUid,
        createdAt: serverTimestamp(),
      }, { merge: true });
      setFriendStatus('friends');
    } catch (_) {}
    setFriendLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!user || !db) return;
    setFriendLoading(true);
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId(user.uid, targetUid)));
      setFriendStatus('none');
    } catch (_) {}
    setFriendLoading(false);
  };

  const handleMessage = async () => {
    if (!user || !db) { onRequireAuth(); return; }
    const convId = dmId(user.uid, targetUid);
    try {
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          type: 'dm',
          members: [user.uid, targetUid].sort(),
          memberProfiles: {
            [user.uid]: { displayName: memberProfile?.displayName ?? 'Member', photoURL: memberProfile?.photoURL ?? '' },
            [targetUid]: { displayName: profile?.displayName ?? 'Member', photoURL: profile?.photoURL ?? '' },
          },
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      onStartDM(convId);
      onNavigate('MESSAGING');
    } catch (_) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-600 font-cinzel">{t('Member not found.', 'Membre introuvable.')}</p>
        <button onClick={() => onNavigate('INN')} className="text-[#d4af37] text-xs font-cinzel uppercase tracking-widest hover:text-white transition-colors">
          ← {t('Home', 'Accueil')}
        </button>
      </div>
    );
  }

  const initials = profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const membership = MEMBERSHIP_LABELS[profile.membershipType] ?? MEMBERSHIP_LABELS['voyageur'];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-lato overflow-y-auto">

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => onNavigate('INN')}
          className="text-neutral-600 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-600">
          {t('Member Profile', 'Profil Membre')}
        </span>
        {isSelf && (
          <button
            onClick={() => onNavigate('MY_PROFILE')}
            className="ml-auto text-[10px] font-cinzel text-[#d4af37]/70 hover:text-[#d4af37] uppercase tracking-widest transition-colors"
          >
            {t('Edit my profile →', 'Modifier mon profil →')}
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto px-6 py-10 space-y-8">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#d4af37]/40">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#d4af37]/15 flex items-center justify-center">
                <span className="text-2xl font-cinzel font-bold text-[#d4af37]">{initials}</span>
              </div>
            )}
          </div>

          <div>
            <p className={`text-xs font-cinzel uppercase tracking-widest ${membership.color}`}>
              {language === 'FR' ? membership.fr : membership.en}
            </p>
            <h1 className="font-cinzel text-2xl text-white mt-1">{profile.displayName}</h1>
          </div>

          {/* Action buttons */}
          {!isSelf && user && (
            <div className="flex gap-3 mt-1 flex-wrap justify-center">
              <button
                onClick={handleMessage}
                className="flex items-center gap-2 px-5 py-2 border border-[#d4af37]/40 text-[#d4af37] font-cinzel text-xs uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                {t('Message', 'Message')}
              </button>

              {friendStatus === 'none' && (
                <button
                  onClick={handleAddFriend}
                  disabled={friendLoading}
                  className="flex items-center gap-2 px-5 py-2 border border-white/20 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-white/40 hover:text-white disabled:opacity-40 transition-all"
                >
                  + {t('Add Friend', 'Ajouter')}
                </button>
              )}
              {friendStatus === 'pending-sent' && (
                <button
                  onClick={handleRemoveFriend}
                  disabled={friendLoading}
                  className="flex items-center gap-2 px-5 py-2 border border-white/10 text-neutral-600 font-cinzel text-xs uppercase tracking-widest hover:border-red-700/40 hover:text-red-400 disabled:opacity-40 transition-all"
                >
                  {t('Request sent', 'Demande envoyée')}
                </button>
              )}
              {friendStatus === 'pending-received' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptFriend}
                    disabled={friendLoading}
                    className="px-4 py-2 bg-emerald-700/30 border border-emerald-600/40 text-emerald-300 font-cinzel text-xs uppercase tracking-widest hover:bg-emerald-700/50 disabled:opacity-40 transition-all"
                  >
                    {t('Accept', 'Accepter')}
                  </button>
                  <button
                    onClick={handleRemoveFriend}
                    disabled={friendLoading}
                    className="px-4 py-2 border border-white/10 text-neutral-600 font-cinzel text-xs uppercase tracking-widest hover:text-red-400 disabled:opacity-40 transition-all"
                  >
                    {t('Decline', 'Refuser')}
                  </button>
                </div>
              )}
              {friendStatus === 'friends' && (
                <button
                  onClick={handleRemoveFriend}
                  disabled={friendLoading}
                  className="flex items-center gap-2 px-5 py-2 border border-emerald-700/40 text-emerald-400 font-cinzel text-xs uppercase tracking-widest hover:border-red-700/40 hover:text-red-400 disabled:opacity-40 transition-all"
                >
                  ✓ {t('Friends', 'Amis')}
                </button>
              )}
            </div>
          )}

          {!user && !isSelf && (
            <button
              onClick={onRequireAuth}
              className="mt-2 text-[10px] font-cinzel text-neutral-600 hover:text-[#d4af37] uppercase tracking-widest transition-colors"
            >
              {t('Sign in to connect →', 'Se connecter pour interagir →')}
            </button>
          )}
        </div>

        {/* Ceilidh attendance — arrival day + time + team + lodging.
            Visible to everyone so people know when this person arrives. */}
        {targetReg && (
          <div className="border border-[#d4af37]/30 bg-[#d4af37]/5 p-5">
            <p className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-[#d4af37]/80 mb-3">
              {t('Coming to the Ceilidh', 'Présent·e au Ceilidh')}
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {targetReg.arrivalDate && (
                <div>
                  <p className="text-neutral-600 font-cinzel text-[9px] uppercase tracking-[0.3em] mb-1">
                    {t('Arrival', 'Arrivée')}
                  </p>
                  <p className="text-neutral-200 font-lato">
                    {(() => {
                      const d = String(targetReg.arrivalDate);
                      const map: Record<string, { en: string; fr: string }> = {
                        '2026-05-21': { en: 'Thu, May 21', fr: 'Jeu, 21 mai' },
                        '2026-05-22': { en: 'Fri, May 22', fr: 'Ven, 22 mai' },
                        '2026-05-23': { en: 'Sat, May 23', fr: 'Sam, 23 mai' },
                        '2026-05-24': { en: 'Sun, May 24', fr: 'Dim, 24 mai' },
                        '2026-05-25': { en: 'Mon, May 25', fr: 'Lun, 25 mai' },
                      };
                      const lab = map[d];
                      return lab ? (language === 'FR' ? lab.fr : lab.en) : d;
                    })()}
                    {targetReg.arrivalTime && (
                      <span className="text-neutral-500"> · {targetReg.arrivalTime}</span>
                    )}
                  </p>
                </div>
              )}
              {targetReg.teamName && (
                <div>
                  <p className="text-neutral-600 font-cinzel text-[9px] uppercase tracking-[0.3em] mb-1">
                    {t('Team', 'Équipe')}
                  </p>
                  <p className="text-neutral-200 font-lato">{targetReg.teamName}</p>
                </div>
              )}
              {targetReg.roomName && (
                <div>
                  <p className="text-neutral-600 font-cinzel text-[9px] uppercase tracking-[0.3em] mb-1">
                    {t('Lodging', 'Hébergement')}
                  </p>
                  <p className="text-neutral-200 font-lato">{targetReg.roomName}</p>
                </div>
              )}
              {targetReg.departureDate && (
                <div>
                  <p className="text-neutral-600 font-cinzel text-[9px] uppercase tracking-[0.3em] mb-1">
                    {t('Departure', 'Départ')}
                  </p>
                  <p className="text-neutral-200 font-lato">{targetReg.departureDate}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Common events */}
        {commonEvents.length > 0 && (
          <div className="border border-white/8 p-5">
            <p className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-500 mb-3">
              {t('Events in Common', 'Événements en Commun')}
            </p>
            <div className="space-y-2">
              {commonEvents.map(ev => (
                <div key={ev} className="flex items-center gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/60 shrink-0" />
                  <span className="text-neutral-300 font-lato">{ev}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Membership info only */}
        <div className="border border-white/8 p-5">
          <p className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-500 mb-3">
            {t('About', 'À Propos')}
          </p>
          <div className="flex items-center gap-3">
            <div className={`text-sm font-cinzel ${membership.color}`}>
              {language === 'FR' ? membership.fr : membership.en}
            </div>
            {profile.isAdmin && (
              <span className="text-[9px] font-cinzel uppercase tracking-widest bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>
          <p className="text-neutral-700 text-xs font-lato mt-1">
            {t('Member since', 'Membre depuis')}{' '}
            {profile.createdAt?.toDate
              ? new Date(profile.createdAt.toDate()).toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long' })
              : '—'}
          </p>
        </div>

      </div>
    </div>
  );
};
