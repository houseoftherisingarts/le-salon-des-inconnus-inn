import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { db } from '../../../firebase';
import { doc, collection, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { TEAMS, LODGING, LODGING_GROUPS, ChatRoom } from '../../CeilidhPage';
import { EVENT_ID } from '../../CeilidhShared';

// MonCeilidhPanneau : panneau déplacé depuis ProfilePage. Mêmes choix
// d'équipe, de lit et d'arrivée, mêmes salons de discussion que /ceilidh.
// La lecture des inscriptions se fait ici (le document du membre + toutes les
// inscriptions pour griser les équipes et lits complets). Le champ email ne
// s'écrit plus sur l'inscription (voir firestore.rules).

interface MonCeilidhPanneauProps {
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
}

const ALL_WORK_DAYS = ['2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'];

const ARRIVAL_DAYS_OPTIONS = [
  { id: '2026-05-21', en: 'Thu, May 21', fr: 'Jeu, 21 mai' },
  { id: '2026-05-22', en: 'Fri, May 22', fr: 'Ven, 22 mai' },
  { id: '2026-05-23', en: 'Sat, May 23', fr: 'Sam, 23 mai' },
  { id: '2026-05-24', en: 'Sun, May 24', fr: 'Dim, 24 mai' },
];

export const MonCeilidhPanneau: React.FC<MonCeilidhPanneauProps> = ({ language, user, memberProfile }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [registration, setRegistration] = useState<any>(null);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);

  useEffect(() => {
    if (!db) return;
    const unsubOwn = onSnapshot(
      doc(db, 'events', EVENT_ID, 'registrations', user.uid),
      (snap) => setRegistration(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    );
    const unsubAll = onSnapshot(
      collection(db, 'events', EVENT_ID, 'registrations'),
      (snap) => setAllRegistrations(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }))),
    );
    return () => { unsubOwn(); unsubAll(); };
  }, [user.uid]);

  const currentTeamId = (registration?.teams?.[0]?.teamId as string | undefined) ?? '';
  const currentRoomId = (registration?.roomId as string | undefined) ?? '';

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
      const m = LODGING.find((l) => l.nameEn === r.roomName || l.nameFr === r.roomName);
      if (m) roomCounts.set(m.id, (roomCounts.get(m.id) || 0) + 1);
    }
  });
  const isTeamFull = (id: string, max: number) => (teamCounts.get(id) || 0) >= max && id !== currentTeamId;
  const isRoomFull = (id: string, cap: number) => (roomCounts.get(id) || 0) >= cap && id !== currentRoomId;

  const [savingTeam, setSavingTeam] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingArrival, setSavingArrival] = useState(false);

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

  const currentArrivalDate = (registration?.arrivalDate as string | undefined) ?? '';
  const currentArrivalTime = (registration?.arrivalTime as string | undefined) ?? '';
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

  const fieldStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
    border: '1px solid rgba(200,170,110,0.22)',
    borderRadius: '14px',
  };

  if (!registration) return null;

  return (
    <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c8aa6e]/40">
      <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c8aa6e] mb-2 flex items-center gap-2">
        <div className="h-px w-10 bg-[#c8aa6e]" />
        Grand Ceilidh de Mai 2026
      </h3>
      <h2 className="font-prata text-[#f0e6d2] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-6">
        {t('My Ceilidh', 'Mon Ceilidh')}
      </h2>

      <div className="space-y-6">
        {/* Quick pickers: team + bed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 md:p-6" style={fieldStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-cinzel text-[#c8aa6e] text-[10px] uppercase tracking-[0.45em]">
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
              className="w-full bg-black/40 text-[#f0e6d2] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c8aa6e] transition-colors"
              style={{ border: '1px solid rgba(200,170,110,0.3)' }}
            >
              <option value="">{t('Choose a team', 'Choisir une équipe')}</option>
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

          <div className="p-5 md:p-6" style={fieldStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-cinzel text-[#c8aa6e] text-[10px] uppercase tracking-[0.45em]">
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
              className="w-full bg-black/40 text-[#f0e6d2] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c8aa6e] transition-colors"
              style={{ border: '1px solid rgba(200,170,110,0.3)' }}
            >
              <option value="">{t('Choose a bed', 'Choisir un lit')}</option>
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

        {/* Arrival day + time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 md:p-6" style={fieldStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-cinzel text-[#c8aa6e] text-[10px] uppercase tracking-[0.45em]">
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
              className="w-full bg-black/40 text-[#f0e6d2] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c8aa6e] transition-colors"
              style={{ border: '1px solid rgba(200,170,110,0.3)' }}
            >
              <option value="">{t('Choose a day', 'Choisir un jour')}</option>
              {ARRIVAL_DAYS_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>{language === 'FR' ? d.fr : d.en}</option>
              ))}
            </select>
          </div>

          <div className="p-5 md:p-6" style={fieldStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-cinzel text-[#c8aa6e] text-[10px] uppercase tracking-[0.45em]">
                {t('Arrival time', 'Heure d\'arrivée')}
              </span>
            </div>
            <input
              type="time"
              value={currentArrivalTime}
              onChange={(e) => setArrival({ arrivalTime: e.target.value })}
              className="w-full bg-black/40 text-[#f0e6d2] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c8aa6e] transition-colors"
              style={{ border: '1px solid rgba(200,170,110,0.3)' }}
            />
            <p className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.25em] mt-2">
              {t('Visible on your public profile', 'Visible sur votre profil public')}
            </p>
          </div>
        </div>

        {/* Chat rooms: general + team */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChatRoom
            path={`events/${EVENT_ID}/chats/general/messages`}
            title={t('General chat', 'Salon général')}
            emptyEn="No messages yet. Say hi."
            emptyFr="Pas de message. Dites bonjour."
            language={language}
            user={user}
            onRequireAuth={() => {}}
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
            emptyEn="No messages yet. Start the conversation."
            emptyFr="Pas de message. Lancez la discussion."
            language={language}
            user={user}
            onRequireAuth={() => {}}
            locked={!currentTeamId}
            lockedHintEn="Pick a team above to unlock its private chat."
            lockedHintFr="Choisissez une équipe ci-dessus pour ouvrir son salon privé."
          />
        </div>
      </div>
    </div>
  );
};
