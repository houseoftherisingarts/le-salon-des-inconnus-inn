
import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, onSnapshot,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { AuthModal, type MemberProfile, type MembershipType } from './AuthModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CeilidhPageProps {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
}

type TaskStatus = 'todo' | 'inprogress' | 'done';

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedToName?: string;
  order: number;
  createdBy: string;
}

interface CeilidhTeamData {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  emoji: string;
  memberCount?: number;
  chefEquipeUid?: string;
  chefEquipeName?: string;
}

interface CeilidhRegistration {
  uid: string;
  displayName: string;
  email: string;
  teamId: string;
  teamName: string;
  isChefEquipe: boolean;
  roomId: string;
  roomName: string;
  arrivalDate: string;
  createdAt: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_ID = 'ceilidh-mai-2026';
const ADMIN_EMAIL = 'houseoftherisingarts@gmail.com';

const TEAMS: CeilidhTeamData[] = [
  { id: 'peinture', name: 'Painting Team', name_fr: 'Team Peinture', emoji: '🎨',
    description: 'Victorian-style room renovation: sanding, painting, and interior decoration.',
    description_fr: 'Rénovation des chambres de l\'auberge en style victorien : sablage, peinture et décoration intérieure.' },
  { id: 'bouffe', name: 'Kitchen Team', name_fr: 'Team Bouffe', emoji: '🍳',
    description: 'Feed the whole crowd: meal prep, snacks, water, and keeping the space warm and inviting.',
    description_fr: 'Nourrir tout ce beau monde : préparer les repas, apporter eau et collations, garder l\'espace propre et convivial.' },
  { id: 'jardins', name: 'Garden Team', name_fr: 'Team Jardins', emoji: '🌱',
    description: 'Tilling, weeding, planting, tending the greenhouse — connecting with the land.',
    description_fr: 'Labourer, désherber, planter, profiter du dehors, aider à l\'autosuffisance de l\'espace, préparer la serre.' },
  { id: 'sous-sol', name: 'Basement Team', name_fr: 'Team Sous-Sol', emoji: '🏗️',
    description: 'Clear the basement, pour cement bags, lay a floor.',
    description_fr: 'Tout sortir du sous-sol, couler des poches de ciment, poser un plancher.' },
  { id: 'dehors', name: 'Outdoors Team', name_fr: 'Team Dehors', emoji: '🪵',
    description: 'Build benches, fire pits, relaxation areas, wood storage, footbridges — outdoor crafting.',
    description_fr: 'Créer des bancs, aménager les ronds de feu, des espaces de relaxation, construire des abris à bûches, fabriquer des ponceaux.' },
  { id: 'arts', name: 'Arts Team', name_fr: 'Team Arts', emoji: '🎵',
    description: 'Animate the community: music, murals, performance. Can be combined with other teams.',
    description_fr: 'Animer tout ce beau monde, jouer de la musique, réaliser des murales. Peut se combiner avec d\'autres équipes.' },
];

const ROOMS = [
  { id: 'ecrivaine', name: "L'Écrivaine", name_fr: "L'Écrivaine", capacity: 3, icon: '✍️' },
  { id: 'musicienne', name: 'La Musicienne', name_fr: 'La Musicienne', capacity: 3, icon: '🎸' },
  { id: 'theatre', name: "L'Amphithéâtre", name_fr: "L'Amphithéâtre", capacity: 3, icon: '🎭' },
  { id: 'cinema', name: 'La Cinéaste', name_fr: 'La Cinéaste', capacity: 3, icon: '🎬' },
  { id: 'solarium', name: 'Solarium', name_fr: 'Solarium', capacity: 4, icon: '☀️' },
  { id: 'massage', name: 'Massage Room', name_fr: 'Salle de Massage', capacity: 2, icon: '💆' },
  { id: 'yurt', name: 'Yurt / Ger', name_fr: 'Yourte / Ger', capacity: 5, icon: '⛺' },
  { id: 'tiny', name: 'Tiny House', name_fr: 'Tiny House', capacity: 5, icon: '🏡' },
  { id: 'bus', name: 'Supertramp Bus', name_fr: 'Supertramp Bus', capacity: 1, icon: '🚌' },
  { id: 'prospector', name: 'Prospector Tent', name_fr: 'Tente Prospecteur', capacity: 4, icon: '🏕️' },
  { id: 'tent', name: 'Bring My Own Tent', name_fr: 'Apporter Ma Propre Tente', capacity: 10, icon: '⛺' },
];

const ARRIVAL_DATES = [
  { id: '2026-05-21', label: 'Jeudi 21 Mai (Arrivée Facultative)', label_en: 'Thursday May 21 (Optional Early Arrival)' },
  { id: '2026-05-22', label: 'Vendredi 22 Mai', label_en: 'Friday May 22' },
  { id: '2026-05-23', label: 'Samedi 23 Mai (Journée)', label_en: 'Saturday May 23 (Day Only)' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isAdmin = (user: User | null) => user?.email === ADMIN_EMAIL;

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionDivider = () => (
  <div className="flex items-center justify-center gap-4 my-16 opacity-40">
    <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
    <div className="w-2 h-2 rotate-45 border border-[#d4af37]"></div>
    <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
  </div>
);

// ─── Kanban Board (Admin Only) ────────────────────────────────────────────────

const KanbanBoard: React.FC<{ teamId: string; language: 'EN' | 'FR' }> = ({ teamId, language }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'events', EVENT_ID, 'teams', teamId, 'tasks'),
      orderBy('order', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as KanbanTask));
    });
    return unsub;
  }, [teamId]);

  const addTask = async () => {
    if (!db || !newTitle.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'events', EVENT_ID, 'teams', teamId, 'tasks'), {
        title: newTitle.trim(),
        status: 'todo' as TaskStatus,
        order: tasks.length,
        createdBy: auth?.currentUser?.uid || 'admin',
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
    } finally {
      setAdding(false);
    }
  };

  const moveTask = async (taskId: string, status: TaskStatus) => {
    if (!db) return;
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId), { status });
  };

  const deleteTask = async (taskId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId));
  };

  const columns: { status: TaskStatus; label: string; label_fr: string; color: string }[] = [
    { status: 'todo', label: 'To Do', label_fr: 'À Faire', color: 'border-neutral-600' },
    { status: 'inprogress', label: 'In Progress', label_fr: 'En Cours', color: 'border-yellow-600' },
    { status: 'done', label: 'Done', label_fr: 'Terminé', color: 'border-green-700' },
  ];

  return (
    <div className="mt-6">
      {/* Add task */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder={t('New task title...', 'Titre de la nouvelle tâche...')}
          className="flex-1 bg-[#1a1a1a] border border-white/10 text-white px-3 py-2 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600"
        />
        <button
          onClick={addTask}
          disabled={adding || !newTitle.trim()}
          className="px-4 py-2 bg-[#d4af37] text-black text-sm font-cinzel font-bold uppercase tracking-wider hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
        >
          {t('Add', 'Ajouter')}
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} className={`bg-[#0a0a0a] border ${col.color} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-cinzel text-sm uppercase tracking-widest text-neutral-400">
                  {language === 'FR' ? col.label_fr : col.label}
                </h4>
                <span className="text-xs text-neutral-600 bg-white/5 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-[#141414] border border-white/5 p-3 group">
                    <p className="text-white text-sm font-lato leading-snug">{task.title}</p>
                    {task.assignedToName && (
                      <p className="text-neutral-600 text-xs mt-1 font-lato">→ {task.assignedToName}</p>
                    )}
                    {/* Move buttons */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {col.status !== 'todo' && (
                        <button onClick={() => moveTask(task.id, col.status === 'done' ? 'inprogress' : 'todo')}
                          className="text-xs text-neutral-500 hover:text-white px-2 py-0.5 border border-white/10 hover:border-white/30 transition-colors">←</button>
                      )}
                      {col.status !== 'done' && (
                        <button onClick={() => moveTask(task.id, col.status === 'todo' ? 'inprogress' : 'done')}
                          className="text-xs text-neutral-500 hover:text-white px-2 py-0.5 border border-white/10 hover:border-white/30 transition-colors">→</button>
                      )}
                      <button onClick={() => deleteTask(task.id)}
                        className="ml-auto text-xs text-red-800 hover:text-red-400 px-2 py-0.5 border border-red-900/30 hover:border-red-700/50 transition-colors">✕</button>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-neutral-700 text-xs font-lato italic py-2 text-center">
                    {t('Empty', 'Vide')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Team Card ────────────────────────────────────────────────────────────────

const TeamCard: React.FC<{
  team: CeilidhTeamData;
  language: 'EN' | 'FR';
  user: User | null;
  userRegistration: CeilidhRegistration | null;
  onRegisterToTeam: (teamId: string) => void;
}> = ({ team, language, user, userRegistration, onRegisterToTeam }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [expanded, setExpanded] = useState(false);
  const isUserInTeam = userRegistration?.teamId === team.id;
  const isUserAdmin = isAdmin(user);

  return (
    <div className={`border transition-all duration-300 ${isUserInTeam ? 'border-[#d4af37]' : 'border-white/10 hover:border-[#d4af37]/40'} bg-[#0a0a0a]`}>
      {/* Card Header */}
      <button
        className="w-full flex items-start gap-4 p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-3xl mt-0.5">{team.emoji}</span>
        <div className="flex-1">
          <h3 className="font-cinzel text-white text-base md:text-lg tracking-wide">
            {language === 'FR' ? team.name_fr : team.name}
          </h3>
          <p className="text-neutral-500 text-sm font-lato mt-1 leading-snug">
            {language === 'FR' ? team.description_fr : team.description}
          </p>
          {team.chefEquipeName && (
            <p className="text-[#d4af37] text-xs font-cinzel mt-2 uppercase tracking-widest">
              {t('Chef d\'équipe', 'Chef d\'équipe')}: {team.chefEquipeName}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
          {isUserInTeam && (
            <span className="text-xs bg-[#d4af37] text-black px-2 py-0.5 font-cinzel uppercase tracking-wider">
              {t('My Team', 'Mon Équipe')}
            </span>
          )}
          <span className="text-neutral-600 text-lg transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ⌄
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/5 p-5">
          {/* Register button (if logged in and not already in this team) */}
          {user && !isUserInTeam && !userRegistration && (
            <button
              onClick={() => onRegisterToTeam(team.id)}
              className="w-full mb-4 py-3 bg-transparent border border-[#d4af37] text-[#d4af37] font-cinzel text-sm uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all duration-300"
            >
              {t('Join This Team', 'Rejoindre Cette Équipe')}
            </button>
          )}
          {user && userRegistration && !isUserInTeam && (
            <p className="text-neutral-600 text-sm font-lato italic mb-4 text-center">
              {t('You are already registered in another team.', 'Vous êtes déjà inscrit dans une autre équipe.')}
            </p>
          )}
          {!user && (
            <button
              onClick={() => onRegisterToTeam(team.id)}
              className="w-full mb-4 py-3 bg-transparent border border-[#d4af37]/50 text-[#d4af37]/70 font-cinzel text-sm uppercase tracking-widest hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300"
            >
              {t('Sign in to Join', 'Se connecter pour rejoindre')}
            </button>
          )}

          {/* Member count */}
          <div className="flex items-center gap-2 text-neutral-600 text-xs font-lato mb-4">
            <span>👥</span>
            <span>{team.memberCount} {t('member(s) registered', 'membre(s) inscrit(s)')}</span>
          </div>

          {/* Admin Kanban */}
          {isUserAdmin && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-white/5"></div>
                <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-widest">Admin — Kanban</span>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <KanbanBoard teamId={team.id} language={language} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Registration Modal ───────────────────────────────────────────────────────

const RegistrationModal: React.FC<{
  teamId: string;
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  roomBookings: Record<string, number>;
  onClose: () => void;
  onSuccess: (reg: CeilidhRegistration) => void;
}> = ({ teamId, language, user, memberProfile, roomBookings, onClose, onSuccess }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const team = TEAMS.find(t => t.id === teamId)!;
  const [isChefEquipe, setIsChefEquipe] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedArrival, setSelectedArrival] = useState('2026-05-22');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedRoom) { setError(t('Please select a room.', 'Veuillez choisir un hébergement.')); return; }
    if (!db) { setError('Firebase non configuré'); return; }
    setLoading(true);
    setError('');
    try {
      const room = ROOMS.find(r => r.id === selectedRoom)!;
      const reg: CeilidhRegistration = {
        uid: user.uid,
        displayName: memberProfile.displayName,
        email: memberProfile.email,
        teamId,
        teamName: language === 'FR' ? team.name_fr : team.name,
        isChefEquipe,
        roomId: selectedRoom,
        roomName: language === 'FR' ? room.name_fr : room.name,
        arrivalDate: selectedArrival,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid), reg);
      // If chef, update team doc
      if (isChefEquipe) {
        await setDoc(
          doc(db, 'events', EVENT_ID, 'teams', teamId),
          { chefEquipeUid: user.uid, chefEquipeName: memberProfile.displayName },
          { merge: true },
        );
      }
      // Update member count on team
      const teamRef = doc(db, 'events', EVENT_ID, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      const currentCount = teamSnap.exists() ? (teamSnap.data().memberCount || 0) : 0;
      await setDoc(teamRef, { id: teamId, memberCount: currentCount + 1 }, { merge: true });
      onSuccess(reg);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-[#d4af37]/30 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/60"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/60"></div>

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.4em]">Ceilidh de Mai 2026</span>
              <h2 className="font-cinzel text-2xl text-white mt-1">
                {language === 'FR' ? team.name_fr : team.name} {team.emoji}
              </h2>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white text-xl">×</button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-lato">{error}</div>}

          {/* Chef d'équipe */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setIsChefEquipe(!isChefEquipe)}
                className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${isChefEquipe ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/20 group-hover:border-[#d4af37]/50'}`}
              >
                {isChefEquipe && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div>
                <span className="font-cinzel text-white text-sm">{t('Volunteer as Team Leader', 'Me proposer comme Chef d\'Équipe')}</span>
                <p className="text-neutral-600 text-xs font-lato mt-0.5">
                  {t('Coordinate the team during the weekend.', 'Coordonner l\'équipe durant le weekend.')}
                </p>
              </div>
            </label>
          </div>

          {/* Arrival date */}
          <div className="mb-6">
            <p className="font-cinzel text-white text-sm mb-3 uppercase tracking-widest">{t('Arrival', 'Arrivée')}</p>
            <div className="space-y-2">
              {ARRIVAL_DATES.map(d => (
                <label key={d.id} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setSelectedArrival(d.id)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedArrival === d.id ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/20 group-hover:border-[#d4af37]/50'}`}
                  >
                    {selectedArrival === d.id && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                  </div>
                  <span className="text-neutral-300 text-sm font-lato">
                    {language === 'FR' ? d.label : d.label_en}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Room selection */}
          <div className="mb-8">
            <p className="font-cinzel text-white text-sm mb-3 uppercase tracking-widest">{t('Accommodation', 'Hébergement')}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {ROOMS.map(room => {
                const booked = roomBookings[room.id] || 0;
                const available = room.capacity - booked;
                const isFull = available <= 0;
                return (
                  <button
                    key={room.id}
                    disabled={isFull}
                    onClick={() => !isFull && setSelectedRoom(room.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 border text-left transition-all
                      ${selectedRoom === room.id ? 'border-[#d4af37] bg-[#d4af37]/10'
                        : isFull ? 'border-white/5 opacity-30 cursor-not-allowed'
                        : 'border-white/10 hover:border-[#d4af37]/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{room.icon}</span>
                      <div>
                        <div className="text-white text-sm font-lato">{language === 'FR' ? room.name_fr : room.name}</div>
                        <div className={`text-xs font-lato mt-0.5 ${isFull ? 'text-red-600' : 'text-neutral-600'}`}>
                          {isFull ? t('Full', 'Complet') : `${available} ${t('spot(s) available', 'place(s) disponible(s)')}`}
                        </div>
                      </div>
                    </div>
                    {selectedRoom === room.id && <span className="text-[#d4af37] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !selectedRoom}
            className="w-full py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? t('Registering...', 'Inscription en cours...') : t('Confirm Registration', 'Confirmer l\'Inscription')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const CeilidhPage: React.FC<CeilidhPageProps> = ({ onNavigate, language, user, memberProfile, onUserChange, onShowPrivacy }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [showAuth, setShowAuth] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [userRegistration, setUserRegistration] = useState<CeilidhRegistration | null>(null);
  const [roomBookings, setRoomBookings] = useState<Record<string, number>>({});
  const [teams, setTeams] = useState<CeilidhTeamData[]>(TEAMS);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Load user registration
  useEffect(() => {
    if (!user || !db) { setUserRegistration(null); return; }
    const ref = doc(db, 'events', EVENT_ID, 'registrations', user.uid);
    const unsub = onSnapshot(ref, snap => {
      setUserRegistration(snap.exists() ? snap.data() as CeilidhRegistration : null);
    });
    return unsub;
  }, [user]);

  // Load room bookings (real-time count per room)
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'events', EVENT_ID, 'registrations'), snap => {
      const counts: Record<string, number> = {};
      snap.forEach(d => {
        const reg = d.data() as CeilidhRegistration;
        if (reg.roomId) counts[reg.roomId] = (counts[reg.roomId] || 0) + 1;
      });
      setRoomBookings(counts);
    });
    return unsub;
  }, []);

  // Load team member counts and chef info
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'events', EVENT_ID, 'teams'), snap => {
      const updates: Record<string, Partial<CeilidhTeamData>> = {};
      snap.forEach(d => {
        updates[d.id] = d.data();
      });
      setTeams(prev => prev.map(team => ({
        ...team,
        memberCount: updates[team.id]?.memberCount || 0,
        chefEquipeName: updates[team.id]?.chefEquipeName,
        chefEquipeUid: updates[team.id]?.chefEquipeUid,
      })));
    });
    return unsub;
  }, []);

  const handleRegisterToTeam = useCallback((teamId: string) => {
    if (!user) {
      setPendingTeamId(teamId);
      setShowAuth(true);
      return;
    }
    if (!memberProfile) {
      setPendingTeamId(teamId);
      setShowAuth(true);
      return;
    }
    setPendingTeamId(teamId);
    setShowRegistration(true);
  }, [user, memberProfile]);

  const handleAuthSuccess = useCallback((newUser: User, newProfile: MemberProfile) => {
    onUserChange(newUser, newProfile);
    setShowAuth(false);
    if (pendingTeamId) {
      setShowRegistration(true);
    }
  }, [onUserChange, pendingTeamId]);

  const handleRegistrationSuccess = (reg: CeilidhRegistration) => {
    setShowRegistration(false);
    setPendingTeamId(null);
    setRegistrationSuccess(true);
    setUserRegistration(reg);
  };

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    onUserChange(null, null);
    setUserRegistration(null);
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 font-sans selection:bg-[#d4af37] selection:text-black custom-scrollbar">

      {/* Textures */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paisley.png')]"></div>

      {/* Header */}
      <header className="fixed top-0 w-full z-[100] bg-[#050505]/90 border-b border-[#d4af37]/15 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('EVENTS')}>
            <span className="text-[#d4af37] text-xl">←</span>
            <span className="font-cinzel text-[#d4af37] text-sm hidden md:block tracking-widest">{t('Events', 'Événements')}</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <div className="text-white text-xs font-cinzel">{memberProfile?.displayName || user.displayName}</div>
                  <div className="text-neutral-600 text-[10px] font-lato uppercase tracking-wider">{memberProfile?.membershipType}</div>
                </div>
                <button onClick={handleSignOut} className="text-neutral-500 text-xs font-cinzel uppercase tracking-wider hover:text-white transition-colors border border-white/10 px-3 py-1.5 hover:border-white/30">
                  {t('Sign Out', 'Déconnexion')}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="px-4 py-2 border border-[#d4af37]/40 text-[#d4af37] font-cinzel text-xs uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all duration-300">
                {t('Member Space', 'Espace Membre')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20">

        {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[80vh] flex items-end pb-20 overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg"
              alt="Maison Favier"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-black/40"></div>
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-6 w-full">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px w-10 bg-[#d4af37]"></div>
              <span className="text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.5em]">
                {t('Maison Favier · Namur, QC', 'Maison Favier · Namur, QC')}
              </span>
            </div>
            <h1 className="font-cinzel text-5xl md:text-8xl text-white mb-4 leading-tight" style={{ textShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
              Grand Ceilidh<br />de Mai
            </h1>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="text-[#d4af37] font-cinzel text-xl md:text-2xl">21 – 25 Mai 2026</span>
              <span className="text-neutral-500 text-sm font-lato">(Kay-lee)</span>
            </div>
            <p className="font-lato text-neutral-300 text-lg md:text-xl max-w-2xl leading-relaxed mb-8">
              {t(
                'Spectacles · Woofing · Banquet · Community · Art',
                'Spectacles · Woofing · Banquet · Communauté · Art',
              )}
            </p>
            {!userRegistration ? (
              <button
                onClick={() => { if (!user) setShowAuth(true); else window.scrollTo({ top: document.getElementById('teams')?.offsetTop || 0, behavior: 'smooth' }); }}
                className="px-10 py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-[0.2em] hover:bg-[#f3e5ab] transition-all hover:scale-105 active:scale-95"
              >
                {t('Register Now', 'S\'inscrire Maintenant')}
              </button>
            ) : (
              <div className="inline-flex items-center gap-3 px-6 py-4 border border-[#d4af37] bg-[#d4af37]/10">
                <span className="text-[#d4af37] text-xl">✓</span>
                <div>
                  <div className="font-cinzel text-[#d4af37] text-sm uppercase tracking-widest">{t('You are registered', 'Vous êtes inscrit(e)')}</div>
                  <div className="text-neutral-400 text-xs font-lato mt-0.5">
                    {userRegistration.teamName} · {userRegistration.roomName}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-6">

          {/* ── 2. SCHEDULE ─────────────────────────────────────────────── */}
          <section className="py-16">
            <SectionDivider />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              {[
                { date: 'Jeu 21 Mai', title: t('Optional Arrival', 'Arrivée Facultative'), sub: t('Woofers who want to arrive early', 'Pour les woofers qui veulent s\'installer'), icon: '🌙' },
                { date: 'Ven 22 Mai', title: '9AM – 6PM', sub: t('Work · Dinner · Show 6PM & 9PM', 'Travail · Souper · Spectacle 18h et 21h'), icon: '🎸' },
                { date: 'Sam 23 Mai', title: '9AM – 6PM', sub: t('Work · Dinner · Show 6:30PM', 'Travail · Souper · Spectacle 18h30'), icon: '🎭' },
                { date: 'Dim 24 Mai', title: '9AM – 6PM', sub: t('Work · Show 9AM · Banquet', 'Travail · Spectacle 9h · Banquet'), icon: '🥂' },
              ].map((day, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/8 p-6">
                  <div className="text-2xl mb-3">{day.icon}</div>
                  <div className="font-cinzel text-[#d4af37] text-sm uppercase tracking-widest mb-2">{day.date}</div>
                  <div className="font-cinzel text-white text-base mb-2">{day.title}</div>
                  <div className="text-neutral-500 text-xs font-lato leading-relaxed">{day.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3. TWO WAYS TO COME ──────────────────────────────────────── */}
          <section className="py-8">
            <SectionDivider />
            <div className="text-center mb-12">
              <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">{t('Participation', 'Participation')}</span>
              <h2 className="font-cinzel text-3xl md:text-5xl text-white mt-3">{t('Two Ways to Come', 'Deux Façons de Venir')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shows Only */}
              <div className="border border-white/10 p-8">
                <div className="text-3xl mb-4">🎵</div>
                <h3 className="font-cinzel text-xl text-white mb-4">{t('Shows Only', 'Spectacles Seulement')}</h3>
                <p className="text-neutral-400 font-lato text-sm leading-relaxed mb-6">
                  {t(
                    'Come only for the festivities — no work required. This helps too!',
                    'Il vous est possible de ne venir qu\'aux festivités sans travailler toute la journée. Cela aide aussi\u00a0!',
                  )}
                </p>
                <div className="space-y-2 text-sm font-lato">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-neutral-500">{t('1 Show', '1 Spectacle')}</span>
                    <span className="text-[#d4af37] font-bold">10$</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-neutral-500">{t('Weekend Pass (3 Shows)', 'Passe Weekend (3 Spectacles)')}</span>
                    <span className="text-[#d4af37] font-bold">20$</span>
                  </div>
                </div>
                <p className="text-neutral-600 text-xs font-lato mt-4 italic">
                  {t('Show-only guests wishing to eat are invited to bring food in Potluck style.', 'Les personnes venues pour les spectacles uniquement et souhaitant manger sont priées d\'apporter leur nourriture en formule Potluck.')}
                </p>
              </div>

              {/* Woofer */}
              <div className="border border-[#d4af37]/30 p-8 bg-[#d4af37]/5">
                <div className="text-3xl mb-4">🪚</div>
                <h3 className="font-cinzel text-xl text-white mb-4">{t('As a Woofer', 'En Contribuant (Woofing)')}</h3>
                <p className="text-neutral-400 font-lato text-sm leading-relaxed mb-6">
                  {t(
                    'By joining one of the support teams, you receive all 3 shows, food, and lodging as a thank-you.',
                    'En s\'inscrivant dans une des équipes de soutien, vous recevrez les 3 spectacles, la nourriture et l\'hébergement en remerciement.',
                  )}
                </p>
                <div className="space-y-2 text-sm font-lato">
                  {[
                    ['3 Shows', '3 Spectacles'],
                    ['Full Board (Meals)', 'Pension Complète (Repas)'],
                    ['Lodging on site', 'Hébergement sur place'],
                  ].map(([en, fr], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[#d4af37]">✓</span>
                      <span className="text-neutral-300">{language === 'FR' ? fr : en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── 4. WHAT IS A CEILIDH ─────────────────────────────────────── */}
          <section className="py-8">
            <SectionDivider />
            <div className="text-center mb-12">
              <h2 className="font-cinzel text-3xl md:text-4xl text-white">
                {t('The Ceilidh, the Woofing — What Is This?', 'Le Ceilidh, le Woofing — Quoi que c\'est\u00a0?')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm font-lato text-neutral-400 leading-relaxed">
              <div>
                <h4 className="font-cinzel text-[#d4af37] text-xs uppercase tracking-widest mb-3">{t('What is Woofing?', 'C\'est quoi le Woofing\u00a0?')}</h4>
                <p>
                  {t(
                    'Traditionally, Woofing is the practice of volunteering on organic farms or intentional community spaces in exchange for food and lodging. A cultural exchange experience that lets volunteers discover alternative lifestyles without monetary cost.',
                    'Traditionnellement, le Woofing est une pratique qui consiste à travailler bénévolement dans des fermes biologiques ou des lieux liés à la communauté intentionnelle, en échange du gîte et du couvert. Une expérience d\'échange culturel qui permet aux bénévoles de découvrir des modes de vie alternatifs sans frais monétaires.',
                  )}
                </p>
              </div>
              <div>
                <h4 className="font-cinzel text-[#d4af37] text-xs uppercase tracking-widest mb-3">{t('What is a Ceilidh?', 'C\'est quoi un Ceilidh\u00a0?')}</h4>
                <p>
                  {t(
                    'Ceilidh (pronounced "kay-lee") is a Gaelic word from the Scottish tradition. While it is today mainly associated with festive gatherings with music, dance, and stories, it once had a utilitarian dimension: rural communities organized these gatherings to accomplish collective tasks — harvesting, building, weaving. The work was followed by celebrations.',
                    'Ceilidh (prononcé "kay-lee") est un mot gaélique qui désigne une tradition écossaise. Bien que le ceilidh soit aujourd\'hui principalement associé à des rassemblements festifs avec musique, danse et histoires, il avait autrefois une dimension utilitaire : les communautés rurales organisaient ces rencontres pour accomplir des tâches collectives — récolter, construire, tisser. Ces moments de travail étaient suivis de célébrations.',
                  )}
                </p>
              </div>
              <div>
                <h4 className="font-cinzel text-[#d4af37] text-xs uppercase tracking-widest mb-3">{t('Our Version', 'Notre Version')}</h4>
                <p>
                  {t(
                    'We have decided to organize a Grand Woofing Weekend and add our own flavour — dinner, shows, jam sessions, and games — bringing it closer to the traditional Ceilidh. The Grand Ceilidh de Mai is an occasion to contribute to a community call, to support a place, an idea, a vision, and good-hearted people.',
                    'Nous avons décidé d\'organiser un Grand Woofing en ajoutant à notre sauce le concept : souper, spectacle, jam et jeux, le rapprochant du Ceilidh traditionnel. Le Grand Ceilidh de Mai, c\'est l\'occasion de contribuer à un appel communautaire, de soutenir un lieu, une idée, une vision et des gens de cœur.',
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* ── 5. THE SPACE ─────────────────────────────────────────────── */}
          <section className="py-8">
            <SectionDivider />
            <div className="text-center mb-12">
              <h2 className="font-cinzel text-3xl text-white">{t('The Space', 'Le Lieu')}</h2>
              <p className="text-neutral-500 font-lato text-sm mt-2">{t('Natural, Authentic, Ancestral', 'Naturel, Vrai, Ancestral')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs font-lato text-neutral-500">
              {[
                ['Jacuzzi / Spa', 'Jacuzzi / Spa', '♨️'],
                ['Stream & Forest', 'Ruisseau & Forêt', '🌊'],
                ['Fire Pits', 'Ronds de Feu', '🔥'],
                ['Forest Terrace', 'Terrasse en Forêt', '🌲'],
                ['Gardens & Greenhouse', 'Jardins & Serre', '🌿'],
                ['Nearby Lake', 'Lac à Proximité', '🏊'],
                ['Piano Bar', 'Piano Bar', '🎹'],
                ['Camping', 'Camping', '⛺'],
              ].map(([en, fr, icon]) => (
                <div key={en} className="p-4 border border-white/5 bg-[#080808]">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div>{language === 'FR' ? fr : en}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 6. TEAMS ─────────────────────────────────────────────────── */}
          <section id="teams" className="py-8">
            <SectionDivider />
            <div className="text-center mb-12">
              <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">{t('Volunteer', 'Bénévolat')}</span>
              <h2 className="font-cinzel text-3xl md:text-5xl text-white mt-3">{t('Woofing Teams', 'Équipes de Woofing')}</h2>
              <p className="text-neutral-500 font-lato text-sm mt-3 max-w-xl mx-auto">
                {t(
                  'Choose a team, register, and optionally volunteer as team leader.',
                  'Choisissez une équipe, inscrivez-vous et proposez-vous éventuellement comme chef d\'équipe.',
                )}
              </p>
            </div>

            {/* Registered banner */}
            {registrationSuccess && (
              <div className="mb-6 p-5 border border-[#d4af37] bg-[#d4af37]/10 text-center">
                <div className="font-cinzel text-[#d4af37] text-lg mb-1">🎉 {t('Registration confirmed!', 'Inscription confirmée\u00a0!')}</div>
                <p className="text-neutral-400 font-lato text-sm">
                  {t('See you on May 21–25, 2026.', 'À bientôt du 21 au 25 mai 2026.')}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  language={language}
                  user={user}
                  userRegistration={userRegistration}
                  onRegisterToTeam={handleRegisterToTeam}
                />
              ))}
            </div>
          </section>

          {/* ── 7. LODGING OVERVIEW ──────────────────────────────────────── */}
          <section className="py-8">
            <SectionDivider />
            <div className="text-center mb-12">
              <h2 className="font-cinzel text-3xl text-white">{t('Lodging', 'Hébergement')}</h2>
              <p className="text-neutral-500 font-lato text-sm mt-2">
                {t('Included for Woofers · Tent camping possible', 'Inclus pour les Woofers · Camping en tente possible')}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ROOMS.map(room => {
                const booked = roomBookings[room.id] || 0;
                const available = room.capacity - booked;
                const pct = Math.round((booked / room.capacity) * 100);
                return (
                  <div key={room.id} className="border border-white/8 bg-[#0a0a0a] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{room.icon}</span>
                      <span className="font-cinzel text-white text-xs">{language === 'FR' ? room.name_fr : room.name}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-700' : pct >= 75 ? 'bg-yellow-600' : 'bg-[#d4af37]'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-lato text-neutral-600">
                      {available > 0 ? `${available}/${room.capacity} ${t('available', 'disponible')}` : t('Full', 'Complet')}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 8. CONTACT ───────────────────────────────────────────────── */}
          <section className="py-16 text-center">
            <SectionDivider />
            <h2 className="font-cinzel text-2xl text-white mb-4">{t('Questions?', 'Des Questions\u00a0?')}</h2>
            <p className="text-neutral-500 font-lato text-sm mb-6">
              {t('Between 10am and 7pm', 'Entre 10h et 19h')}
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 font-lato text-[#d4af37]">
              <a href="tel:+15144183450" className="hover:text-white transition-colors">514 418 3450</a>
              <span className="hidden md:block text-neutral-700">·</span>
              <a href="mailto:Alex@lesalondesinconnus.com" className="hover:text-white transition-colors">Alex@lesalondesinconnus.com</a>
            </div>
          </section>

        </div>
      </main>

      {/* ── Auth Modal ───────────────────────────────────────────────────── */}
      {showAuth && (
        <AuthModal
          language={language}
          onClose={() => { setShowAuth(false); setPendingTeamId(null); }}
          onAuthSuccess={handleAuthSuccess}
          onShowPrivacy={onShowPrivacy}
        />
      )}

      {/* ── Registration Modal ───────────────────────────────────────────── */}
      {showRegistration && pendingTeamId && user && memberProfile && (
        <RegistrationModal
          teamId={pendingTeamId}
          language={language}
          user={user}
          memberProfile={memberProfile}
          roomBookings={roomBookings}
          onClose={() => { setShowRegistration(false); setPendingTeamId(null); }}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4af37; }
      `}</style>
    </div>
  );
};
