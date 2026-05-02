
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField,
  collection, getDocs, addDoc, onSnapshot,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { AuthModal, type MemberProfile, type MembershipType } from './AuthModal';
import { ContributionPanel } from './ContributionPanel';
import { ShowTicketModal } from './ShowTicketModal';
import { LiquidGlassCycler } from './LiquidGlassCycler';

// Photos that cycle through the Ceilidh hero's liquid-glass carousel.
const CEILIDH_HERO_IMAGES = [
  'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png',
  'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg',
  'https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg',
  'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg',
  'https://storage.googleapis.com/salondesinconnus/inn/yourte.png',
];

interface ShowTicket {
  uid: string;
  displayName: string;
  email: string;
  ticketType: 'single' | 'weekend';
  nights: string[];
  amountCents: number;
  ticketCode: string;
  createdAt?: any;
}

const SHOW_CAPACITY = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CeilidhPageProps {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
  onViewProfile?: (uid: string) => void;
}

type TaskStatus = 'todo' | 'inprogress' | 'done';

type TaskPriority = 'priority' | 'nice';

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface ClaimedMember {
  uid: string;
  name: string;
  photo?: string;
}

export type TaskWeather = 'fair' | 'rain';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToName?: string;
  order: number;
  createdBy: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByPhoto?: string;
  subtasks?: Subtask[];
  /** How many members are needed to fully staff this task (default 1). */
  peopleRequired?: number;
  /** Members who have claimed this task. Capped at peopleRequired. */
  claimedBy?: ClaimedMember[];
  /** Which board this task belongs to: fair-weather (default) or rain-day. */
  weather?: TaskWeather;
}

export interface CeilidhTeamData {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  emoji: string;
  maxMembers?: number;
  memberCount?: number;
  chefEquipeUid?: string;
  chefEquipeName?: string;
}

export interface TeamMembership {
  teamId: string;
  days: string[];       // work days: '2026-05-22', '2026-05-23', etc.
  isSupport: boolean;
  isChefEquipe?: boolean;
}

export interface CeilidhRegistration {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  teams?: TeamMembership[];  // multi-team memberships
  teamId?: string;           // backwards compat: primary team
  teamName?: string;
  isChefEquipe?: boolean;
  roomId?: string;
  roomName?: string;
  arrivalDate?: string;
  departureDate?: string;
  createdAt: any;
}

export interface CeilidhNeed {
  id: string;
  emoji: string;
  title: string;
  description?: string;
  quantity?: string;
  urgent?: boolean;
  claims?: Record<string, { displayName: string; photoURL?: string }>;
  createdAt?: any;
  createdBy?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByPhoto?: string;
}

export interface Carpool {
  id?: string;
  driverUid: string;
  driverName: string;
  driverEmail?: string;
  driverPhoto?: string;
  city: string;
  totalSeats: number;
  availableSeats: number;
  passengers: { uid: string; name: string }[];
  createdAt: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const EVENT_ID = 'ceilidh-mai-2026';
// Both addresses get full admin powers (post needs, delete any task, gold ribbon).
// Keeping ADMIN_EMAIL exported for backwards-compat with code that imports the
// single-string form.
export const ADMIN_EMAILS = ['houseoftherisingarts@gmail.com', 'alex@lesalondesinconnus.com'];
export const ADMIN_EMAIL = ADMIN_EMAILS[0];
export const isAdminEmail = (email: string | null | undefined) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

export const TEAMS: CeilidhTeamData[] = [
  { id: 'peinture',   name: 'Painting Team',       name_fr: 'Team Peinture',         emoji: '🎨', maxMembers: 4,
    description: 'Sand and paint the façade of the house and the gallery.',
    description_fr: 'Gratter. Peindre la façade de la maison, la galerie.' },
  { id: 'bouffe',     name: 'Kitchen Team',         name_fr: 'Team Bouffe',            emoji: '🍳', maxMembers: 3,
    description: 'Feed the whole crowd: meal prep, snacks, water, and keeping the space warm and inviting.',
    description_fr: 'Nourrir tout ce beau monde : préparer les repas, apporter eau et collations, garder l\'espace propre et convivial.' },
  { id: 'jardins',    name: 'Garden Team',          name_fr: 'Team Jardins',           emoji: '🌱', maxMembers: 4,
    description: 'Tilling, weeding, planting, tending the greenhouse — connecting with the land.',
    description_fr: 'Labourer, désherber, planter, profiter du dehors, aider à l\'autosuffisance de l\'espace, préparer la serre.' },
  { id: 'grange',     name: 'Barn Team',            name_fr: 'Team Grange',            emoji: '🏚️', maxMembers: 6,
    description: 'Sort barn wood, remove nails, burn the unusable wood.',
    description_fr: 'Trier le bois de grange, retirer des clous, brûler le bois pu bon.' },
  { id: 'dehors',     name: 'Outdoors Team',        name_fr: 'Team Dehors',            emoji: '🪵', maxMembers: 4,
    description: 'Build benches, fire pits, relaxation areas, wood storage, footbridges — outdoor crafting.',
    description_fr: 'Créer des bancs, aménager les ronds de feu, des espaces de relaxation, construire des abris à bûches, fabriquer des ponceaux.' },
  { id: 'arts',       name: 'Performing Arts Team', name_fr: 'Team Arts de la Scène',  emoji: '🎵',
    description: 'Animate the community: music, murals, performance. Can be combined with other teams.',
    description_fr: 'Animer tout ce beau monde, jouer de la musique, réaliser des murales. Peut se combiner avec d\'autres équipes.' },
  { id: 'mini-maison',name: 'Mini House Team',      name_fr: 'Team Mini Maison',       emoji: '🏠', maxMembers: 4,
    description: 'Renovations: finishing the mini house, making it welcoming, and furnishing it with elements from the trailer.',
    description_fr: 'Rénovations : finition de la mini maison et la rendre accueillante, l\'aménager avec les éléments de la roulotte.' },
  { id: 'foret',       name: 'Forest Team',          name_fr: 'Team Forêt',             emoji: '🪓', maxMembers: 5,
    description: 'Clear fallen and dead trees, cut and split firewood to stock up the property for the year.',
    description_fr: 'Dégager les arbres tombés et morts, couper et fendre le bois de chauffage pour approvisionner la propriété pour l\'année.' },
  { id: 'preparation', name: 'Preparation Team',     name_fr: 'Team Préparation',       emoji: '📋', maxMembers: 4,
    description: 'Pre-event prep: buying supplies, coordinating materials, setting up the site before everyone arrives.',
    description_fr: 'Préparation avant le Ceilidh : acheter le matériel nécessaire, coordonner la logistique et installer le site avant l\'arrivée de tout le monde.' },
];

export const ROOMS = [
  { id: 'ecrivaine', name: "L'Écrivaine", name_fr: "L'Écrivaine", capacity: 3, icon: '✍️', description_en: 'Double bed + single bed', description_fr: 'Lit double + lit simple' },
  { id: 'musicienne', name: 'La Musicienne', name_fr: 'La Musicienne', capacity: 3, icon: '🎸', description_en: 'Double bed + single bed', description_fr: 'Lit double + lit simple' },
  { id: 'theatre', name: "L'Amphithéâtre", name_fr: "L'Amphithéâtre", capacity: 3, icon: '🎭', description_en: 'Double bed + cot', description_fr: 'Lit double + lit de camp' },
  { id: 'cinema', name: 'La Cinéaste', name_fr: 'La Cinéaste', capacity: 3, icon: '🎬', description_en: 'Double bed + cot', description_fr: 'Lit double + lit de camp' },
  { id: 'solarium', name: 'Solarium', name_fr: 'Solarium', capacity: 4, icon: '☀️', description_en: '2 single beds + 2 couches', description_fr: '2 lits simples + 2 divans' },
  { id: 'massage', name: 'Massage Room', name_fr: 'Salle de Massage', capacity: 2, icon: '💆', description_en: 'Double bed', description_fr: 'Lit double' },
  { id: 'yurt', name: 'Yurt / Ger', name_fr: 'Yourte / Ger', capacity: 5, icon: '⛺', description_en: 'Shared space · floor mattresses', description_fr: 'Espace commun · matelas au sol' },
  { id: 'tiny', name: 'Tiny House', name_fr: 'Tiny House', capacity: 5, icon: '🏡', description_en: 'Loft bed + 4 sleeping spots', description_fr: 'Lit mezzanine + 4 couchages' },
  { id: 'bus', name: 'Supertramp Bus', name_fr: 'Supertramp Bus', capacity: 1, icon: '🚌', description_en: 'Custom double bed', description_fr: 'Lit double aménagé' },
  { id: 'prospector', name: 'Prospector Tent', name_fr: 'Tente Prospecteur', capacity: 4, icon: '🏕️', description_en: 'Canvas tent · 4 sleeping spots', description_fr: 'Tente canvas · 4 couchages' },
  { id: 'tent', name: 'Bring My Own Tent', name_fr: 'Apporter Ma Propre Tente', capacity: 10, icon: '⛺', description_en: 'Your own gear', description_fr: 'Votre propre équipement' },
  { id: 'campervan', name: 'My Camper Van', name_fr: 'Mon Van / Camping-car', capacity: 6, icon: '🚐', description_en: 'Your own van / camper', description_fr: 'Votre propre van / camping-car' },
];

const ARRIVAL_DATES = [
  { id: '2026-05-21', label: 'Jeudi 21 Mai (Arrivée Facultative)', label_en: 'Thursday May 21 (Optional Early Arrival)' },
  { id: '2026-05-22', label: 'Vendredi 22 Mai', label_en: 'Friday May 22' },
  { id: '2026-05-23', label: 'Samedi 23 Mai (Journée)', label_en: 'Saturday May 23 (Day Only)' },
];

const DEPARTURE_DATES = [
  { id: '2026-05-22', label: 'Vendredi 22 Mai (Soir)', label_en: 'Friday May 22 (Evening)' },
  { id: '2026-05-23', label: 'Samedi 23 Mai (Soir)', label_en: 'Saturday May 23 (Evening)' },
  { id: '2026-05-24', label: 'Dimanche 24 Mai (Soir)', label_en: 'Sunday May 24 (Evening)' },
  { id: '2026-05-25', label: 'Lundi 25 Mai — avant 11h (Départ Final)', label_en: 'Monday May 25 — by 11am (Final Departure)' },
];

export const EVENT_DAYS = [
  { id: '2026-05-21', label: 'Jeu 21', label_en: 'Thu 21' },
  { id: '2026-05-22', label: 'Ven 22', label_en: 'Fri 22' },
  { id: '2026-05-23', label: 'Sam 23', label_en: 'Sat 23' },
  { id: '2026-05-24', label: 'Dim 24', label_en: 'Sun 24' },
  { id: '2026-05-25', label: 'Lun 25 (11h)', label_en: 'Mon 25 (11am)' },
];

// Days on which team work happens (Fri–Mon; Thu is early-arrival only)
const WORK_DAYS = [
  { id: '2026-05-22', label: 'Vendredi 22 mai', label_en: 'Friday May 22' },
  { id: '2026-05-23', label: 'Samedi 23 mai',   label_en: 'Saturday May 23' },
  { id: '2026-05-24', label: 'Dimanche 24 mai', label_en: 'Sunday May 24' },
  { id: '2026-05-25', label: 'Lundi 25 mai',    label_en: 'Monday May 25' },
];

export const TEAM_COLORS: Record<string, string> = {
  'peinture':    '#7c3aed',
  'bouffe':      '#d97706',
  'jardins':     '#059669',
  'grange':      '#78350f',
  'dehors':      '#b45309',
  'arts':        '#db2777',
  'mini-maison': '#0891b2',
  'foret':       '#166534',
  'preparation': '#1e40af',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isAdmin = (user: User | null) => isAdminEmail(user?.email);

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionDivider = () => (
  <div className="flex items-center justify-center gap-4 my-16 opacity-40">
    <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
    <div className="w-2 h-2 rotate-45 border border-[#d4af37] section-divider-diamond cursor-default"></div>
    <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
  </div>
);

// ─── Kanban Board (Admin Only) ────────────────────────────────────────────────

export const KanbanBoard: React.FC<{
  teamId: string;
  language: 'EN' | 'FR';
  user: User | null;
  /** Whether the current user is a primary or support member of this team.
      When false, the kanban renders in read-only browse mode — no add,
      no claim, no edit, no delete. Members see the full editing surface. */
  isUserInTeam?: boolean;
}> = ({ teamId, language, user, isUserInTeam = true }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('priority');
  const [newPeopleRequired, setNewPeopleRequired] = useState<number>(1);
  const [adding, setAdding] = useState(false);
  // subtask add state: keyed by task id
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  // Active weather board: 'fair' (Beau temps) or 'rain' (En cas de pluie).
  const [activeWeather, setActiveWeather] = useState<TaskWeather>('fair');
  // Inline title-edit state, keyed by task id.
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'events', EVENT_ID, 'teams', teamId, 'tasks'),
      orderBy('order', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as KanbanTask));
    }, () => {});
    return unsub;
  }, [teamId]);

  const addTask = async () => {
    if (!db || !newTitle.trim() || !user) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'events', EVENT_ID, 'teams', teamId, 'tasks'), {
        title: newTitle.trim(),
        status: 'todo' as TaskStatus,
        priority: newPriority,
        order: tasks.length,
        createdBy: user.uid,
        createdByEmail: user.email ?? '',
        // Stamp the author's identity on the task — we can render a real avatar
        // on the card without needing a separate users-by-uid lookup at read time.
        createdByName:  user.displayName ?? '',
        createdByPhoto: user.photoURL ?? '',
        subtasks: [],
        peopleRequired: Math.max(1, newPeopleRequired),
        claimedBy: [],
        // New tasks are filed under whichever weather board is currently active.
        weather: activeWeather,
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewPeopleRequired(1);
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

  const saveTitleEdit = async (taskId: string) => {
    const next = editTitleValue.trim();
    setEditingTaskId(null);
    if (!db || !next) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || next === task.title) return;
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId), { title: next });
  };

  const updatePeopleRequired = async (taskId: string, n: number) => {
    if (!db) return;
    const safe = Math.max(1, Math.min(20, Math.floor(n) || 1));
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId), { peopleRequired: safe });
  };

  const toggleClaim = async (task: KanbanTask) => {
    if (!db || !user) return;
    const current = task.claimedBy ?? [];
    const already = current.find(c => c.uid === user.uid);
    let next: ClaimedMember[];
    if (already) {
      next = current.filter(c => c.uid !== user.uid);
    } else {
      const cap = task.peopleRequired ?? 1;
      if (current.length >= cap) return; // task is full
      next = [
        ...current,
        { uid: user.uid, name: user.displayName ?? user.email ?? '?', photo: user.photoURL ?? undefined },
      ];
    }
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', task.id), { claimedBy: next });
  };

  const addSubtask = async (taskId: string) => {
    const title = (subtaskInputs[taskId] ?? '').trim();
    if (!db || !title) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const existing = task.subtasks ?? [];
    const newSubtask: Subtask = { id: Date.now().toString(36), title, done: false };
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId), {
      subtasks: [...existing, newSubtask],
    });
    setSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    if (!db) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = (task.subtasks ?? []).map(s =>
      s.id === subtaskId ? { ...s, done: !s.done } : s,
    );
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId), { subtasks: updated });
  };

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    if (!db) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = (task.subtasks ?? []).filter(s => s.id !== subtaskId);
    await updateDoc(doc(db, 'events', EVENT_ID, 'teams', teamId, 'tasks', taskId), { subtasks: updated });
  };

  const columns: { status: TaskStatus; label: string; label_fr: string; color: string }[] = [
    { status: 'todo',       label: 'To Do',       label_fr: 'À Faire',  color: 'border-neutral-600' },
    { status: 'inprogress', label: 'In Progress',  label_fr: 'En Cours', color: 'border-yellow-600'  },
    { status: 'done',       label: 'Done',         label_fr: 'Terminé',  color: 'border-green-700'   },
  ];

  const rows: { priority: TaskPriority; label: string; label_fr: string; accent: string }[] = [
    { priority: 'priority', label: 'Priority',      label_fr: 'Priorité',       accent: 'text-rose-400 border-rose-900/40 bg-rose-950/20' },
    { priority: 'nice',     label: 'Would be nice', label_fr: 'Ce serait bien', accent: 'text-sky-400 border-sky-900/40 bg-sky-950/20'   },
  ];

  const canDelete = (task: KanbanTask) =>
    isAdminEmail(user?.email) || task.createdBy === user?.uid;

  // NOTE: Defined as a plain render function (NOT a component) on purpose.
  // If this were a React.FC declared inside KanbanBoard, every keystroke that
  // updates state in the parent (e.g. typing in a subtask input) would create
  // a new component identity → React unmounts/remounts the card → inputs
  // inside lose focus. As a render function it just produces JSX inline.
  const renderTaskCard = (task: KanbanTask, col: typeof columns[0]) => {
    const isAdminCard = isAdminEmail(task.createdByEmail);
    const subtasks = task.subtasks ?? [];
    const doneCount = subtasks.filter(s => s.done).length;
    const isExpanded = expandedSubtasks[task.id] ?? false;
    const peopleRequired = task.peopleRequired ?? 1;
    const claimed = task.claimedBy ?? [];
    const isFull = claimed.length >= peopleRequired;
    const userClaimed = !!user && claimed.some(c => c.uid === user.uid);
    // Edit/claim/delete actions require team membership. Admins (by email)
    // bypass that check so they can moderate any board.
    const isAdminUser = !!user && isAdminEmail(user.email);
    const canInteract = isAdminUser || isUserInTeam;
    const canEdit = canInteract && !!user && (isAdminUser || task.createdBy === user.uid);
    const isEditingTitle = editingTaskId === task.id;

    return (
      <div className={`relative bg-[#141414] border p-3 group ${isAdminCard ? 'border-[#d4af37]/40' : 'border-white/20'}`}>
        {/* Admin ribbon — only on tasks created by an admin email */}
        {isAdminCard && (
          <span
            className="absolute -top-2 -right-1 px-2 py-0.5 rounded-sm font-cinzel text-[8px] uppercase tracking-[0.35em] text-[#1a1208]"
            style={{
              background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
              boxShadow: '0 2px 8px rgba(197,160,89,0.5)',
            }}
            aria-label="Admin"
          >
            Admin
          </span>
        )}
        {/* Card header: title + creator avatar */}
        <div className="flex items-start justify-between gap-2 mb-1">
          {isEditingTitle ? (
            <input
              autoFocus
              type="text"
              value={editTitleValue}
              onChange={e => setEditTitleValue(e.target.value)}
              onBlur={() => saveTitleEdit(task.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); saveTitleEdit(task.id); }
                else if (e.key === 'Escape') { e.preventDefault(); setEditingTaskId(null); }
              }}
              className="flex-1 bg-[#1a1a1a] border border-[#d4af37]/40 text-white text-sm font-lato px-2 py-1 focus:outline-none focus:border-[#d4af37]"
            />
          ) : (
            <p
              onClick={() => { if (canEdit) { setEditTitleValue(task.title); setEditingTaskId(task.id); } }}
              className={`text-white text-sm font-lato leading-snug flex-1 ${canEdit ? 'cursor-text hover:text-[#f3e5ab]' : ''}`}
              title={canEdit ? t('Click to edit', 'Cliquer pour modifier') : undefined}
            >
              {task.title}
            </p>
          )}
          {/* Creator avatar — photo if available, otherwise initial. Title attr
              shows the creator's name so hovering reveals who put this here. */}
          <span
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-cinzel uppercase"
            title={task.createdByName || task.createdByEmail || (isAdminCard ? 'Admin' : t('Member', 'Membre'))}
            style={{
              background: task.createdByPhoto ? `url(${task.createdByPhoto}) center/cover` : '#1f1810',
              border: `1px solid ${isAdminCard ? 'rgba(243,229,171,0.6)' : 'rgba(255,255,255,0.18)'}`,
              color: '#f3e5ab',
            }}
          >
            {!task.createdByPhoto && (task.createdByName?.[0] || task.createdByEmail?.[0] || '?').toUpperCase()}
          </span>
        </div>

        {task.assignedToName && (
          <p className="text-neutral-600 text-xs font-lato">→ {task.assignedToName}</p>
        )}

        {/* Capacity row: people-required count + claimed avatars + claim button */}
        <div className="flex items-center gap-2 mt-2">
          {/* People required — editable for admins/creators */}
          {canEdit ? (
            <div className="flex items-center gap-0.5 text-[10px] font-cinzel text-neutral-500">
              <span>👥</span>
              <button
                onClick={() => updatePeopleRequired(task.id, peopleRequired - 1)}
                disabled={peopleRequired <= 1}
                className="px-1 hover:text-white disabled:opacity-30"
                aria-label={t('Decrease', 'Diminuer')}
              >−</button>
              <span className="w-4 text-center text-neutral-300">{peopleRequired}</span>
              <button
                onClick={() => updatePeopleRequired(task.id, peopleRequired + 1)}
                className="px-1 hover:text-white"
                aria-label={t('Increase', 'Augmenter')}
              >+</button>
            </div>
          ) : (
            <span className="text-[10px] font-cinzel text-neutral-500" title={t('People needed', 'Personnes requises')}>
              👥 {peopleRequired}
            </span>
          )}

          {/* Claimed-by avatars */}
          {claimed.length > 0 && (
            <div className="flex -space-x-1.5">
              {claimed.slice(0, 5).map(c => (
                <span
                  key={c.uid}
                  title={c.name}
                  className="w-5 h-5 rounded-full border border-[#0a0a0a] flex items-center justify-center text-[9px] font-cinzel uppercase text-[#f3e5ab]"
                  style={{
                    background: c.photo ? `url(${c.photo}) center/cover` : '#1f1810',
                  }}
                >
                  {!c.photo && (c.name[0] || '?').toUpperCase()}
                </span>
              ))}
              {claimed.length > 5 && (
                <span className="w-5 h-5 rounded-full bg-[#1f1810] border border-[#0a0a0a] flex items-center justify-center text-[9px] text-neutral-400">
                  +{claimed.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Claim / unclaim — only for members of this team (or admin) */}
          {user && canInteract && (
            <button
              onClick={() => toggleClaim(task)}
              disabled={!userClaimed && isFull}
              className={`ml-auto text-[10px] font-cinzel uppercase tracking-wider px-2 py-0.5 border transition-colors ${
                userClaimed
                  ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-[#f3e5ab] hover:bg-[#d4af37]/25'
                  : isFull
                    ? 'border-white/8 text-neutral-700 cursor-not-allowed'
                    : 'border-white/15 text-neutral-400 hover:border-[#d4af37]/50 hover:text-[#f3e5ab]'
              }`}
            >
              {userClaimed
                ? t('✓ Claimed', '✓ Pris')
                : isFull
                  ? t('Full', 'Complet')
                  : t('+ Claim', '+ Prendre')}
            </button>
          )}
        </div>

        {/* Subtasks summary + toggle */}
        {subtasks.length > 0 && (
          <button
            onClick={() => setExpandedSubtasks(prev => ({ ...prev, [task.id]: !isExpanded }))}
            className="flex items-center gap-1.5 mt-2 text-[10px] font-cinzel text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
            {doneCount}/{subtasks.length} {t('subtasks', 'sous-tâches')}
            {/* mini progress bar */}
            <div className="flex-1 max-w-[48px] h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4af37]/50 rounded-full"
                style={{ width: subtasks.length ? `${(doneCount / subtasks.length) * 100}%` : '0%' }}
              />
            </div>
          </button>
        )}

        {/* Subtask list */}
        {isExpanded && subtasks.length > 0 && (
          <div className="mt-2 space-y-1 pl-1">
            {subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 group/st">
                <button
                  onClick={() => toggleSubtask(task.id, s.id)}
                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                    s.done ? 'border-[#d4af37]/50 bg-[#d4af37]/20' : 'border-white/15 hover:border-white/30'
                  }`}
                >
                  {s.done && <span className="text-[#d4af37] text-[8px] leading-none">✓</span>}
                </button>
                <span className={`text-xs font-lato flex-1 ${s.done ? 'line-through text-neutral-700' : 'text-neutral-400'}`}>
                  {s.title}
                </span>
                <button
                  onClick={() => deleteSubtask(task.id, s.id)}
                  className="text-[10px] text-red-900 hover:text-red-500 opacity-0 group-hover/st:opacity-100 transition-all"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add subtask input — members only */}
        {(isExpanded || subtasks.length === 0) && user && canInteract && (
          <div className="flex gap-1 mt-2">
            <input
              type="text"
              value={subtaskInputs[task.id] ?? ''}
              onChange={e => setSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); addSubtask(task.id); } }}
              placeholder={t('+ subtask…', '+ sous-tâche…')}
              className="flex-1 bg-transparent border-b border-white/10 text-neutral-500 text-[10px] font-lato py-0.5 focus:outline-none focus:border-[#d4af37]/40 focus:text-white placeholder:text-neutral-700 transition-colors"
            />
            {(subtaskInputs[task.id] ?? '').trim() && (
              <button
                onClick={() => addSubtask(task.id)}
                className="text-[10px] text-[#d4af37] font-cinzel hover:text-white transition-colors"
              >
                {t('Add', 'Aj.')}
              </button>
            )}
          </div>
        )}

        {/* Move + delete controls */}
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {col.status !== 'todo' && (
            <button onClick={() => moveTask(task.id, col.status === 'done' ? 'inprogress' : 'todo')}
              className="text-xs text-neutral-500 hover:text-white px-2 py-0.5 border border-white/10 hover:border-white/30 transition-colors">←</button>
          )}
          {col.status !== 'done' && (
            <button onClick={() => moveTask(task.id, col.status === 'todo' ? 'inprogress' : 'done')}
              className="text-xs text-neutral-500 hover:text-white px-2 py-0.5 border border-white/10 hover:border-white/30 transition-colors">→</button>
          )}
          {canDelete(task) && (
            <button onClick={() => deleteTask(task.id)}
              className="ml-auto text-xs text-red-800 hover:text-red-400 px-2 py-0.5 border border-red-900/30 hover:border-red-700/50 transition-colors">✕</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      {/* Weather toggle — flips between the fair-weather and rain-day boards.
          Tasks are filtered by their .weather field; new tasks inherit the
          currently-active weather. Pre-existing tasks without a weather
          field default to 'fair'. */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <button
          onClick={() => setActiveWeather('fair')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border transition-all ${
            activeWeather === 'fair'
              ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-[#f3e5ab]'
              : 'border-white/10 text-neutral-500 hover:text-neutral-300'
          }`}
        >
          ☀ {t('Fair weather', 'Beau temps')}
        </button>
        <button
          onClick={() => setActiveWeather('rain')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border transition-all ${
            activeWeather === 'rain'
              ? 'border-sky-500/60 bg-sky-950/40 text-sky-300'
              : 'border-white/10 text-neutral-500 hover:text-neutral-300'
          }`}
        >
          ☂ {t('In case of rain', 'En cas de pluie')}
        </button>
      </div>

      {/* Browse-mode banner — shown to non-members. Makes it clear that
          viewing the kanban is read-only and that "Choose this team" above
          is the explicit commitment. */}
      {user && !isUserInTeam && !isAdminEmail(user.email) && (
        <div className="mb-4 px-3 py-2 border border-white/10 bg-white/[0.02] text-center">
          <p className="text-[10px] font-cinzel uppercase tracking-widest text-neutral-500">
            {t('Browse mode — read-only', 'Mode aperçu — lecture seule')}
          </p>
          <p className="text-[10px] font-lato text-neutral-600 mt-0.5">
            {t('Press "Choose this team" above to participate.',
               'Appuyez sur « Choisir cette équipe » plus haut pour participer.')}
          </p>
        </div>
      )}

      {/* Add task form — members only (or admin) */}
      {user && (isUserInTeam || isAdminEmail(user.email)) ? (
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-2">
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
              className="px-4 py-2 bg-[#d4af37] text-black text-sm font-cinzel font-bold uppercase tracking-wider hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors shrink-0"
            >
              {t('Add', 'Ajouter')}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setNewPriority('priority')}
              className={`px-3 py-1 text-[10px] font-cinzel uppercase tracking-widest border transition-all ${
                newPriority === 'priority'
                  ? 'border-rose-600/60 bg-rose-950/40 text-rose-400'
                  : 'border-white/8 text-neutral-600 hover:text-neutral-400'
              }`}
            >● {t('Priority', 'Priorité')}</button>
            <button
              onClick={() => setNewPriority('nice')}
              className={`px-3 py-1 text-[10px] font-cinzel uppercase tracking-widest border transition-all ${
                newPriority === 'nice'
                  ? 'border-sky-600/60 bg-sky-950/40 text-sky-400'
                  : 'border-white/8 text-neutral-600 hover:text-neutral-400'
              }`}
            >◇ {t('Would be nice', 'Ce serait bien')}</button>
            {/* People-required for the new task */}
            <div className="flex items-center gap-0.5 text-[10px] font-cinzel text-neutral-500 border border-white/8 px-2 py-1">
              <span>👥</span>
              <button
                type="button"
                onClick={() => setNewPeopleRequired(n => Math.max(1, n - 1))}
                disabled={newPeopleRequired <= 1}
                className="px-1 hover:text-white disabled:opacity-30"
              >−</button>
              <span className="w-4 text-center text-neutral-300">{newPeopleRequired}</span>
              <button
                type="button"
                onClick={() => setNewPeopleRequired(n => Math.min(20, n + 1))}
                className="px-1 hover:text-white"
              >+</button>
            </div>
            <span className="text-[9px] text-neutral-700 font-lato ml-auto">
              {isAdminEmail(user.email) ? '◈ admin' : t('◇ member', '◇ membre')}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-neutral-700 text-xs font-lato text-center mb-4 italic">
          {t('Sign in to add tasks.', 'Connectez-vous pour ajouter des tâches.')}
        </p>
      )}

      {/* Board: two rows × three columns. Filter by current weather first;
          tasks with no weather field default to 'fair' (legacy data). */}
      {rows.map(row => {
        const weatherTasks = tasks.filter(task => (task.weather ?? 'fair') === activeWeather);
        const rowTasks = weatherTasks.filter(task => (task.priority ?? 'priority') === row.priority);
        if (rowTasks.length === 0 && row.priority === 'nice') return null;
        return (
          <div key={row.priority} className="mb-6">
            <div className={`flex items-center gap-2 mb-3 px-2 py-1 border-l-2 ${row.accent}`}>
              <span className="text-[10px] font-cinzel uppercase tracking-[0.25em]">
                {language === 'FR' ? row.label_fr : row.label}
              </span>
              <span className="text-[10px] text-neutral-700">
                ({rowTasks.length} {rowTasks.length === 1 ? t('task', 'tâche') : t('tasks', 'tâches')})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {columns.map(col => {
                const colTasks = rowTasks.filter(tk => tk.status === col.status);
                return (
                  <div key={col.status} className={`bg-[#0a0a0a] border ${col.color} p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-cinzel text-xs uppercase tracking-widest text-neutral-500">
                        {language === 'FR' ? col.label_fr : col.label}
                      </h4>
                      <span className="text-[10px] text-neutral-700 bg-white/5 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map(task => (
                        <React.Fragment key={task.id}>{renderTaskCard(task, col)}</React.Fragment>
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
      })}
    </div>
  );
};

// ─── Performance Board (Arts Team) ───────────────────────────────────────────

const PERFORMANCE_NIGHTS = [
  { id: '2026-05-22', label: 'Vendredi 22 Mai', label_en: 'Friday May 22', time: '18h – 19h30' },
  { id: '2026-05-23', label: 'Samedi 23 Mai', label_en: 'Saturday May 23', time: '18h30 – 20h' },
  { id: '2026-05-24', label: 'Dimanche 24 Mai', label_en: 'Sunday May 24', time: '18h – 19h30' },
];

interface Performance {
  id: string;
  uid: string;
  name: string;
  title: string;
  description?: string;
  duration?: string;
  technicalNeeds?: string;
  nights: string[];
  createdAt: any;
}

const PerformanceBoard: React.FC<{ language: 'EN' | 'FR'; user: User | null }> = ({ language, user }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [technicalNeeds, setTechnicalNeeds] = useState('');
  const [selectedNights, setSelectedNights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    let active = true;
    const q = query(
      collection(db, 'events', EVENT_ID, 'performances'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(
      q,
      snap => { if (active) setPerformances(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Performance)); },
      err  => { if (active) console.error('performances snapshot:', err.message); },
    );
    return () => { active = false; unsub(); };
  }, []);

  const toggleNight = (id: string) => {
    setSelectedNights(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!user || !db) return;
    if (!title.trim()) { setError(t('Please enter an act title.', 'Veuillez entrer un titre pour votre numéro.')); return; }
    if (selectedNights.length === 0) { setError(t('Please select at least one night.', 'Veuillez choisir au moins une soirée.')); return; }
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'events', EVENT_ID, 'performances'), {
        uid: user.uid,
        name: user.displayName || 'Artiste',
        title: title.trim(),
        description: description.trim(),
        duration: duration.trim(),
        technicalNeeds: technicalNeeds.trim(),
        nights: selectedNights,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setDescription('');
      setDuration('');
      setTechnicalNeeds('');
      setSelectedNights([]);
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (perfId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'events', EVENT_ID, 'performances', perfId));
  };

  const myPerf = user ? performances.find(p => p.uid === user.uid) : null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-[#db2777] text-xs font-cinzel uppercase tracking-widest">
          {t('Evening Shows · 1h30', 'Spectacles du Soir · 1h30')}
        </span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <p className="text-neutral-600 text-xs font-lato mb-5 text-center">
        {t(
          'Each evening right after work — propose your act and choose your night(s).',
          'Chaque soir juste après le travail — proposez votre numéro et choisissez votre(vos) soirée(s).',
        )}
      </p>

      {/* Night columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {PERFORMANCE_NIGHTS.map(night => {
          const acts = performances.filter(p => p.nights.includes(night.id));
          return (
            <div key={night.id} className="bg-[#0a0a0a] border border-[#db2777]/20 p-4">
              <div className="mb-3">
                <div className="font-cinzel text-[#db2777] text-xs uppercase tracking-widest">
                  {language === 'FR' ? night.label : night.label_en}
                </div>
                <div className="text-neutral-600 text-[10px] font-lato mt-0.5">{night.time}</div>
              </div>
              <div className="space-y-2">
                {acts.length === 0 && (
                  <div className="text-neutral-700 text-xs font-lato italic text-center py-2">
                    {t('No acts yet', 'Aucun numéro pour l\'instant')}
                  </div>
                )}
                {acts.map(act => (
                  <div key={act.id} className="bg-[#141414] border border-white/5 p-2.5 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-xs font-cinzel truncate">{act.title}</p>
                        <p className="text-neutral-500 text-[10px] font-lato mt-0.5">{act.name}</p>
                        {act.duration && (
                          <p className="text-[#db2777]/70 text-[10px] font-cinzel mt-1">⏱ {act.duration}</p>
                        )}
                        {act.description && (
                          <p className="text-neutral-600 text-[10px] font-lato mt-0.5 leading-snug">{act.description}</p>
                        )}
                        {act.technicalNeeds && (
                          <p className="text-yellow-700/70 text-[10px] font-lato mt-0.5 leading-snug">⚙ {act.technicalNeeds}</p>
                        )}
                      </div>
                      {user && (act.uid === user.uid || isAdminEmail(user.email)) && (
                        <button
                          onClick={() => handleDelete(act.id)}
                          className="text-red-800 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Propose form */}
      {!myPerf && user && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border border-[#db2777]/40 text-[#db2777] font-cinzel text-xs uppercase tracking-widest hover:bg-[#db2777] hover:text-white transition-all duration-300"
        >
          {t('Propose an Act', 'Proposer un Numéro')}
        </button>
      )}

      {!user && (
        <p className="text-center text-neutral-600 text-xs font-lato italic">
          {t('Sign in to propose an act.', 'Connectez-vous pour proposer un numéro.')}
        </p>
      )}

      {myPerf && (
        <div className="p-3 bg-[#db2777]/10 border border-[#db2777]/30 text-center">
          <p className="text-[#db2777] text-xs font-cinzel uppercase tracking-widest">
            {t('Your act is proposed', 'Votre numéro est proposé')} ✓
          </p>
          <button
            onClick={() => handleDelete(myPerf.id)}
            className="text-red-600/60 text-[10px] font-lato mt-1 hover:text-red-400 transition-colors underline"
          >
            {t('Remove', 'Retirer')}
          </button>
        </div>
      )}

      {showForm && (
        <div className="border border-[#db2777]/30 bg-[#0a0a0a] p-5 space-y-4">
          {error && <p className="text-red-400 text-xs font-lato">{error}</p>}

          <div>
            <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-1.5">
              {t('Act Title *', 'Titre du Numéro *')}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('e.g. Folk guitar set, Stand-up, Dance…', 'ex: Set de guitare folk, Stand-up, Danse…')}
              className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#db2777]/50 placeholder:text-neutral-700"
            />
          </div>

          <div>
            <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-1.5">
              {t('Short Description (optional)', 'Courte Description (facultatif)')}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('Instruments, style, genre…', 'Instruments, style, genre…')}
              maxLength={140}
              className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#db2777]/50 placeholder:text-neutral-700"
            />
          </div>

          <div>
            <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-1.5">
              {t('Duration (optional)', 'Durée du numéro (facultatif)')}
            </label>
            <input
              type="text"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder={t('e.g. 20 min, 45 min…', 'ex: 20 min, 45 min…')}
              maxLength={40}
              className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#db2777]/50 placeholder:text-neutral-700"
            />
          </div>

          <div>
            <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-1.5">
              {t('Technical Needs (optional)', 'Besoins techniques (facultatif)')}
            </label>
            <textarea
              value={technicalNeeds}
              onChange={e => setTechnicalNeeds(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder={t(
                'e.g. Microphone, PA system, extension cord, specific lighting…',
                'ex: Microphone, système de son, rallonge électrique, éclairage particulier…',
              )}
              className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#db2777]/50 placeholder:text-neutral-700 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-2">
              {t('Which Night(s)? *', 'Quelle(s) Soirée(s) ? *')}
            </label>
            <div className="space-y-2">
              {PERFORMANCE_NIGHTS.map(night => (
                <label key={night.id} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleNight(night.id)}
                    className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${selectedNights.includes(night.id) ? 'border-[#db2777] bg-[#db2777]' : 'border-white/20 group-hover:border-[#db2777]/50'}`}
                  >
                    {selectedNights.includes(night.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                  <span className="text-neutral-300 text-sm font-lato">
                    {language === 'FR' ? night.label : night.label_en}
                    <span className="text-neutral-600 ml-2 text-xs">{night.time}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowForm(false); setError(''); }}
              className="flex-1 py-2.5 border border-white/15 text-neutral-500 font-cinzel text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              {t('Cancel', 'Annuler')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 bg-[#db2777] text-white font-cinzel font-bold text-xs uppercase tracking-widest hover:bg-[#f472b6] disabled:opacity-40 transition-colors"
            >
              {loading ? t('Saving…', 'Enregistrement…') : t('Propose', 'Proposer')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Ceilidh Needs Section ───────────────────────────────────────────────────

export const NeedsSection: React.FC<{
  language: 'EN' | 'FR';
  user: User | null;
  needs: CeilidhNeed[];
  onRequireAuth: () => void;
}> = ({ language, user, needs, onRequireAuth }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const admin = isAdminEmail(user?.email);

  const [showForm, setShowForm] = useState(false);
  const [emoji, setEmoji]       = useState('🔧');
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgent, setUrgent]     = useState(false);
  const [saving, setSaving]     = useState(false);
  // Tracks which needs are mid-claim toggle (prevents double-click)
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const handleAdd = async () => {
    if (!db || !title.trim()) return;
    if (!user) { onRequireAuth(); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'events', EVENT_ID, 'needs'), {
        emoji: emoji.trim() || '🔧',
        title: title.trim(),
        description: description.trim(),
        quantity: quantity.trim(),
        urgent,
        claims: {},
        createdAt: serverTimestamp(),
        // Stamp the author's identity so we can render an avatar + ribbon
        // on the need card without a separate users-by-uid lookup.
        createdBy: user.uid,
        createdByEmail: user.email ?? '',
        createdByName:  user.displayName ?? '',
        createdByPhoto: user.photoURL ?? '',
      });
      setEmoji('🔧'); setTitle(''); setDesc(''); setQuantity(''); setUrgent(false);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'events', EVENT_ID, 'needs', id));
  };

  const handleClaim = async (need: CeilidhNeed) => {
    if (!user) { onRequireAuth(); return; }
    if (!db || claiming[need.id]) return;
    setClaiming(prev => ({ ...prev, [need.id]: true }));
    try {
      const alreadyClaimed = !!need.claims?.[user.uid];
      await updateDoc(doc(db, 'events', EVENT_ID, 'needs', need.id), {
        [`claims.${user.uid}`]: alreadyClaimed
          ? deleteField()
          : { displayName: user.displayName ?? 'Membre', photoURL: user.photoURL ?? '' },
      });
    } finally {
      setClaiming(prev => ({ ...prev, [need.id]: false }));
    }
  };

  return (
    <section className="py-16 px-6 md:px-12 lg:px-20">
      <SectionDivider />
      <ScrollFade>
        <div className="text-center mb-10">
          <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">
            {t('Community', 'Communauté')}
          </span>
          <h2 className="font-cinzel text-3xl md:text-4xl text-white mt-3">
            {t('Ceilidh Needs', 'Les Besoins du Ceilidh')}
          </h2>
          <p className="text-neutral-500 font-lato text-sm mt-3 max-w-xl mx-auto leading-relaxed">
            {t(
              'If you happen to have one of these things, we would be deeply grateful if you\'d bring it along.',
              'Si vous avez une de ces choses, nous serons remplis de gratitude si vous vouliez bien les amener.',
            )}
          </p>
        </div>
      </ScrollFade>

      {needs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-w-5xl mx-auto">
          {needs.map((need, i) => {
            const claimants = Object.entries(need.claims ?? {});
            const isClaimed = user ? !!need.claims?.[user.uid] : false;
            return (
              <ScrollFade key={need.id} delay={i * 50}>
                <div className={`relative flex flex-col border bg-[#0a0a0a] p-5 group transition-all duration-300 ${
                  isClaimed
                    ? 'border-[#d4af37]/50 shadow-[0_0_16px_rgba(212,175,55,0.06)]'
                    : need.urgent
                    ? 'border-amber-700/50 hover:border-amber-500/60'
                    : 'border-white/8 hover:border-[#d4af37]/30'
                }`}>
                  {/* Urgent badge */}
                  {need.urgent && !isClaimed && (
                    <div className="absolute top-3 right-10 text-[9px] font-cinzel uppercase tracking-widest text-amber-500 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-700/40">
                      {t('Needed', 'Nécessaire')}
                    </div>
                  )}

                  {/* Admin gold ribbon — when an admin email posted this need */}
                  {isAdminEmail(need.createdByEmail) && (
                    <span
                      className="absolute -top-2 left-3 px-2 py-0.5 rounded-sm font-cinzel text-[8px] uppercase tracking-[0.35em] text-[#1a1208]"
                      style={{
                        background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                        boxShadow: '0 2px 8px rgba(197,160,89,0.5)',
                      }}
                      aria-label="Admin"
                    >
                      Admin
                    </span>
                  )}

                  {/* Creator avatar */}
                  {need.createdBy && (
                    <span
                      className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-cinzel uppercase pointer-events-none"
                      title={need.createdByName || need.createdByEmail || ''}
                      style={{
                        background: need.createdByPhoto ? `url(${need.createdByPhoto}) center/cover` : '#1f1810',
                        border: `1px solid ${isAdminEmail(need.createdByEmail) ? 'rgba(243,229,171,0.6)' : 'rgba(255,255,255,0.18)'}`,
                        color: '#f3e5ab',
                      }}
                    >
                      {!need.createdByPhoto && (need.createdByName?.[0] || need.createdByEmail?.[0] || '?').toUpperCase()}
                    </span>
                  )}

                  {/* Delete — admin OR original creator can remove */}
                  {(admin || need.createdBy === user?.uid) && (
                    <button
                      onClick={() => handleDelete(need.id)}
                      className="absolute top-3 right-3 text-red-800 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                    >✕</button>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-3xl mb-3">{need.emoji}</div>
                    <h4 className="font-cinzel text-white text-sm mb-1">{need.title}</h4>
                    {need.quantity && (
                      <p className="text-[#d4af37]/70 text-[10px] font-cinzel uppercase tracking-widest mb-1">
                        × {need.quantity}
                      </p>
                    )}
                    {need.description && (
                      <p className="text-neutral-500 text-xs font-lato leading-relaxed">{need.description}</p>
                    )}
                  </div>

                  {/* Claimants strip */}
                  {claimants.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[9px] font-cinzel uppercase tracking-widest text-neutral-700 mb-2">
                        {t('Bringing it', 'L\'apporte')} ({claimants.length})
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {claimants.map(([uid, info]) => (
                          <div key={uid} className="flex items-center gap-1.5 bg-white/5 rounded-full pl-0.5 pr-2.5 py-0.5">
                            <MiniAvatar name={info.displayName} photoURL={info.photoURL} size={20} />
                            <span className="text-[10px] font-lato text-neutral-400 leading-none">
                              {info.displayName.split(' ')[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Claim button */}
                  <button
                    onClick={() => handleClaim(need)}
                    disabled={claiming[need.id]}
                    className={`mt-4 w-full py-2 border font-cinzel text-xs uppercase tracking-widest transition-all duration-200 ${
                      isClaimed
                        ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]'
                        : 'border-white/10 text-neutral-600 hover:border-[#d4af37]/50 hover:text-[#d4af37]/80'
                    } disabled:opacity-40`}
                  >
                    {isClaimed
                      ? `✓ ${t('I\'ll bring it', 'Je l\'apporte')}`
                      : t('I\'ll bring this', 'Je peux l\'apporter')}
                  </button>
                </div>
              </ScrollFade>
            );
          })}
        </div>
      )}

      {needs.length === 0 && (
        <div className="text-center text-neutral-700 font-lato text-sm italic mb-8">
          {t('No items listed yet.', 'Aucun article listé pour l\'instant.')}
        </div>
      )}

      {/* Add-a-need is open to any signed-in member; signed-out users get the
          auth modal first. The card shows the author's avatar + an "Admin"
          ribbon when posted by the admin emails. */}
      {!showForm && (
        <div className="text-center">
          <button
            onClick={() => user ? setShowForm(true) : onRequireAuth()}
            className="px-6 py-3 border border-dashed border-[#d4af37]/40 text-[#d4af37]/60 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37] hover:text-[#d4af37] transition-all"
          >
            + {t('Add a Need', 'Ajouter un Besoin')}
          </button>
        </div>
      )}

      {showForm && (
        <div className="max-w-lg mx-auto border border-[#d4af37]/20 bg-[#0a0a0a] p-6 space-y-4">
          <p className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-600">
            {t('New Item', 'Nouvel Article')}
          </p>
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-[9px] font-cinzel text-neutral-700 uppercase tracking-widest block mb-1">Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={4}
                className="w-full bg-[#141414] border border-white/10 text-white text-center px-2 py-2 font-lato text-lg focus:outline-none focus:border-[#d4af37]/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-cinzel text-neutral-700 uppercase tracking-widest block mb-1">
                {t('Title *', 'Titre *')}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('e.g. Nacelle, Chainsaw…', 'ex: Nacelle, Tronçonneuse…')}
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[9px] font-cinzel text-neutral-700 uppercase tracking-widest block mb-1">
                {t('Quantity (optional)', 'Quantité (facultatif)')}
              </label>
              <input
                type="text"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="1, 2–3, plusieurs…"
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setUrgent(!urgent)}>
                <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${urgent ? 'border-amber-500 bg-amber-500/20' : 'border-white/20'}`}>
                  {urgent && <span className="text-amber-400 text-[9px] font-bold">✓</span>}
                </div>
                <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-widest">
                  {t('Urgent', 'Nécessaire')}
                </span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-[9px] font-cinzel text-neutral-700 uppercase tracking-widest block mb-1">
              {t('Details (optional)', 'Détails (facultatif)')}
            </label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder={t('Size, model, specific type…', 'Taille, modèle, type précis…')}
              className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 font-lato text-sm focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border border-white/10 text-neutral-600 font-cinzel text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              {t('Cancel', 'Annuler')}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all"
            >
              {saving ? t('Adding…', 'Ajout…') : t('Add', 'Ajouter')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

// ─── Team Card ────────────────────────────────────────────────────────────────

const TeamCard: React.FC<{
  team: CeilidhTeamData;
  language: 'EN' | 'FR';
  user: User | null;
  userRegistration: CeilidhRegistration | null;
  primaryMembers: CeilidhRegistration[];
  supportMembers: CeilidhRegistration[];
  onRegisterToTeam: (teamId: string) => void;
  onLeaveTeam: (teamId: string) => void;
  onViewProfile?: (uid: string) => void;
}> = ({ team, language, user, userRegistration, primaryMembers, supportMembers, onRegisterToTeam, onLeaveTeam, onViewProfile }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [expanded, setExpanded] = useState(false);

  const isUserPrimary = primaryMembers.some(m => m.uid === user?.uid);
  const isUserSupport = supportMembers.some(m => m.uid === user?.uid);
  const isUserInTeam  = isUserPrimary || isUserSupport;
  const isFull = !!(team.maxMembers && primaryMembers.length >= team.maxMembers);
  const isUserAdmin = isAdmin(user);

  return (
    <div className={`border transition-all duration-300 group/card ${isUserInTeam ? 'border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.08)]' : 'border-white/10 hover:border-[#d4af37]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,175,55,0.07)]'} bg-[#0a0a0a]`}>
      {/* Card Header */}
      <button
        className="w-full flex items-start gap-4 p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-3xl mt-0.5 transition-transform duration-300 group-hover/card:scale-125 inline-block">{team.emoji}</span>
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

          {/* Not logged in */}
          {!user && (
            <button
              onClick={() => onRegisterToTeam(team.id)}
              className="w-full mb-4 py-3 bg-transparent border border-[#d4af37]/50 text-[#d4af37]/70 font-cinzel text-sm uppercase tracking-widest hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300"
            >
              {t('Sign in to Join', 'Se connecter pour rejoindre')}
            </button>
          )}

          {/* Logged in — primary member of this team */}
          {user && isUserPrimary && (
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => onRegisterToTeam(team.id)}
                className="flex-1 py-2.5 bg-transparent border border-white/20 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37]/60 hover:text-[#d4af37] transition-all"
              >
                {t('Edit Days', 'Modifier les Jours')}
              </button>
              <button
                onClick={() => onLeaveTeam(team.id)}
                className="flex-1 py-2.5 bg-transparent border border-red-900/50 text-red-500/70 font-cinzel text-xs uppercase tracking-widest hover:border-red-600 hover:text-red-400 transition-all"
              >
                {t('Leave Team', 'Quitter l\'Équipe')}
              </button>
            </div>
          )}

          {/* Logged in — support member only */}
          {user && !isUserPrimary && isUserSupport && (
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => onRegisterToTeam(team.id)}
                className="flex-1 py-2.5 bg-transparent border border-amber-700/40 text-amber-400/70 font-cinzel text-xs uppercase tracking-widest hover:border-amber-500 hover:text-amber-300 transition-all"
              >
                {t('Edit Support Days', 'Modifier les Jours de Soutien')}
              </button>
              <button
                onClick={() => onLeaveTeam(team.id)}
                className="flex-1 py-2.5 bg-transparent border border-red-900/50 text-red-500/70 font-cinzel text-xs uppercase tracking-widest hover:border-red-600 hover:text-red-400 transition-all"
              >
                {t('Remove', 'Retirer')}
              </button>
            </div>
          )}

          {/* Logged in — not in this team: choose-to-commit CTA. Browsing
              the kanban below is read-only until this button is pressed. */}
          {user && !isUserInTeam && (
            <button
              onClick={() => { if (!isFull) onRegisterToTeam(team.id); }}
              disabled={isFull}
              className={`w-full mb-4 py-3.5 bg-transparent border-2 font-cinzel text-sm uppercase tracking-widest transition-all duration-300 ${
                isFull
                  ? 'border-white/10 text-neutral-700 cursor-not-allowed'
                  : 'border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black'
              }`}
            >
              {isFull ? t('Team Full', 'Équipe Complète') : t('Choose this team', 'Choisir cette équipe')}
            </button>
          )}

          {/* Capacity bar */}
          {team.maxMembers ? (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] font-cinzel text-neutral-600 mb-1.5 uppercase tracking-widest">
                <span>👥 {primaryMembers.length}/{team.maxMembers} {t('members', 'membres')}</span>
                {isFull && <span className="text-red-500/70">{t('Full', 'Complet')}</span>}
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (primaryMembers.length / team.maxMembers) * 100)}%`,
                    backgroundColor: isFull ? '#ef4444' : '#d4af37',
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-neutral-600 text-xs font-lato mb-3">
              <span>👥</span>
              <span>{primaryMembers.length} {t('member(s) registered', 'membre(s) inscrit(s)')}</span>
            </div>
          )}

          {/* Primary member list */}
          {primaryMembers.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {primaryMembers.map(m => {
                const membership = m.teams?.find(mb => mb.teamId === team.id && !mb.isSupport);
                return (
                  <div key={m.uid} className="flex items-center gap-2 text-xs font-lato text-neutral-400">
                    <MiniAvatar name={m.displayName} photoURL={m.photoURL} size={22} onClick={onViewProfile ? () => onViewProfile(m.uid) : undefined} />
                    <span className="truncate flex-1">{m.displayName}</span>
                    {membership?.isChefEquipe && <span className="text-[#d4af37] text-[10px] shrink-0">★ chef</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Support / backup member list */}
          {supportMembers.length > 0 && (
            <div className="mb-4 pl-3 border-l border-amber-900/30">
              <div className="text-[9px] font-cinzel uppercase tracking-widest text-amber-700/70 mb-1.5">
                {t('Support / Backup', 'Soutien / Relève')}
              </div>
              <div className="space-y-1">
                {supportMembers.map(m => (
                  <div key={m.uid} className="flex items-center gap-2 text-[11px] font-lato text-neutral-600">
                    <MiniAvatar name={m.displayName} photoURL={m.photoURL} size={18} onClick={onViewProfile ? () => onViewProfile(m.uid) : undefined} />
                    <span className="truncate flex-1">{m.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance board for arts team */}
          {team.id === 'arts' && (
            <PerformanceBoard language={language} user={user} />
          )}

          {/* Kanban board — visible to all logged-in members */}
          {team.id !== 'arts' && user && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-neutral-600 text-[10px] font-cinzel uppercase tracking-widest">
                  {t('Tasks', 'Tâches')}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <KanbanBoard
                teamId={team.id}
                language={language}
                user={user}
                isUserInTeam={isUserInTeam}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Team Registration Modal ──────────────────────────────────────────────────

const TeamRegistrationModal: React.FC<{
  teamId: string;
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  userRegistration: CeilidhRegistration | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ teamId, language, user, memberProfile, userRegistration, onClose, onSuccess }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const team = TEAMS.find(tm => tm.id === teamId)!;

  // Pre-fill days from existing membership for this team (if editing)
  const existingMembership = userRegistration?.teams?.filter(m => m.teamId === teamId) ?? [];
  const existingDays = Array.from(new Set(existingMembership.flatMap(m => m.days)));
  const existingChef = existingMembership.some(m => m.isChefEquipe && !m.isSupport);

  const [selectedDays, setSelectedDays] = useState<string[]>(
    existingDays.length > 0 ? existingDays : WORK_DAYS.map(d => d.id),
  );
  const [isChefEquipe, setIsChefEquipe] = useState(existingChef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute conflicts: days where user already has a different primary team
  const otherPrimaryByDay: Record<string, string> = {};
  (userRegistration?.teams ?? [])
    .filter(m => m.teamId !== teamId && !m.isSupport)
    .forEach(m => m.days.forEach(d => {
      const teamLabel = TEAMS.find(tm => tm.id === m.teamId);
      otherPrimaryByDay[d] = teamLabel ? (language === 'FR' ? teamLabel.name_fr : teamLabel.name) : m.teamId;
    }));
  // Backwards compat: teamId without teams array
  if (!userRegistration?.teams && userRegistration?.teamId && userRegistration.teamId !== teamId) {
    WORK_DAYS.forEach(d => {
      if (!otherPrimaryByDay[d.id]) {
        const tl = TEAMS.find(tm => tm.id === userRegistration.teamId);
        otherPrimaryByDay[d.id] = tl ? (language === 'FR' ? tl.name_fr : tl.name) : userRegistration.teamId!;
      }
    });
  }

  const primaryDays   = selectedDays.filter(d => !otherPrimaryByDay[d]);
  const conflictDays  = selectedDays.filter(d =>  otherPrimaryByDay[d]);

  const toggleDay = (dayId: string) =>
    setSelectedDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId],
    );

  const handleSubmit = async () => {
    if (!db) { setError('Firebase non configuré'); return; }
    if (selectedDays.length === 0) {
      setError(t('Select at least one day.', 'Sélectionnez au moins un jour.'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Remove previous entries for this team, keep others
      const otherTeams = (userRegistration?.teams ?? []).filter(m => m.teamId !== teamId);

      const newMemberships: TeamMembership[] = [];
      if (primaryDays.length > 0) newMemberships.push({ teamId, days: primaryDays, isSupport: false, isChefEquipe });
      if (conflictDays.length > 0) newMemberships.push({ teamId, days: conflictDays, isSupport: true });

      const updatedTeams = [...otherTeams, ...newMemberships];
      const firstPrimary = updatedTeams.find(m => !m.isSupport);

      await setDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid), {
        uid: user.uid,
        displayName: memberProfile.displayName,
        email: memberProfile.email,
        ...(memberProfile.photoURL ? { photoURL: memberProfile.photoURL } : {}),
        teams: updatedTeams,
        teamId: firstPrimary?.teamId ?? deleteField(),
        teamName: firstPrimary
          ? (language === 'FR'
              ? TEAMS.find(tm => tm.id === firstPrimary.teamId)?.name_fr
              : TEAMS.find(tm => tm.id === firstPrimary.teamId)?.name) ?? deleteField()
          : deleteField(),
        isChefEquipe: updatedTeams.some(m => m.isChefEquipe && !m.isSupport),
        createdAt: serverTimestamp(),
      }, { merge: true });

      if (isChefEquipe && primaryDays.length > 0) {
        await setDoc(
          doc(db, 'events', EVENT_ID, 'teams', teamId),
          { chefEquipeUid: user.uid, chefEquipeName: memberProfile.displayName },
          { merge: true },
        );
      }
      onSuccess();
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

          {/* Work-day selection */}
          <div className="mb-6">
            <p className="font-cinzel text-white text-xs uppercase tracking-[0.25em] mb-3">
              {t('Which days will you work on this team?', 'Quels jours travaillez-vous dans cette équipe\u00a0?')}
            </p>
            <div className="space-y-2">
              {WORK_DAYS.map(d => {
                const isSelected   = selectedDays.includes(d.id);
                const conflictName = otherPrimaryByDay[d.id];
                return (
                  <label
                    key={d.id}
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => toggleDay(d.id)}
                  >
                    {/* checkbox */}
                    <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? conflictName ? 'border-amber-500 bg-amber-500/20' : 'border-[#d4af37] bg-[#d4af37]'
                        : 'border-white/20 group-hover:border-[#d4af37]/50'
                    }`}>
                      {isSelected && <span className={`text-[9px] font-bold leading-none ${conflictName ? 'text-amber-300' : 'text-black'}`}>✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-neutral-300 text-sm font-lato">
                        {language === 'FR' ? d.label : d.label_en}
                      </span>
                      {conflictName && isSelected && (
                        <span className="ml-2 text-[10px] text-amber-500/80 font-cinzel">
                          ⚠ {t('conflict with', 'conflit avec')} {conflictName} — {t('support/backup', 'support/relève')}
                        </span>
                      )}
                      {conflictName && !isSelected && (
                        <span className="ml-2 text-[10px] text-neutral-700 font-lato">
                          ({t('you have', 'vous avez')} {conflictName})
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Support explainer */}
            {conflictDays.length > 0 && (
              <div className="mt-4 p-3 border border-amber-700/40 bg-amber-950/20 text-amber-300/80 text-xs font-lato leading-relaxed">
                {t(
                  `Days marked ⚠ will add you as support/backup — you can be called on if the primary team needs a hand or if a spot opens up.`,
                  `Les jours marqués ⚠ vous ajouteront comme membre de soutien/relève — vous pourrez être sollicité(e) si l'équipe principale a besoin d'aide ou si une place se libère.`,
                )}
              </div>
            )}
          </div>

          {/* Chef d'équipe — only if there are primary days */}
          {primaryDays.length > 0 && (
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsChefEquipe(!isChefEquipe)}>
                <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors ${isChefEquipe ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/20 group-hover:border-[#d4af37]/50'}`}>
                  {isChefEquipe && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <div>
                  <span className="font-cinzel text-white text-sm">{t('Volunteer as Team Leader', 'Me proposer comme Chef d\'Équipe')}</span>
                  <p className="text-neutral-600 text-xs font-lato mt-0.5">
                    {t('Coordinate the team during the event.', 'Coordonner l\'équipe durant l\'événement.')}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Summary line */}
          {selectedDays.length > 0 && (
            <div className="mb-5 text-xs font-lato text-neutral-500">
              {primaryDays.length > 0 && (
                <span className="text-[#d4af37]/70">{t('Primary:', 'Principal\u00a0:')} {primaryDays.length} {t('day(s)', 'jour(s)')}</span>
              )}
              {primaryDays.length > 0 && conflictDays.length > 0 && <span className="mx-2">·</span>}
              {conflictDays.length > 0 && (
                <span className="text-amber-500/70">{t('Support:', 'Soutien\u00a0:')} {conflictDays.length} {t('day(s)', 'jour(s)')}</span>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || selectedDays.length === 0}
            className="w-full py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all"
          >
            {loading ? t('Saving…', 'Enregistrement…') : t('Confirm', 'Confirmer')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Room Registration Modal ──────────────────────────────────────────────────

const RoomRegistrationModal: React.FC<{
  roomId: string;
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  onClose: () => void;
  onSuccess: (reg: Partial<CeilidhRegistration>) => void;
}> = ({ roomId, language, user, memberProfile, onClose, onSuccess }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const room = ROOMS.find(r => r.id === roomId)!;
  const [selectedArrival, setSelectedArrival] = useState('2026-05-22');
  const [selectedDeparture, setSelectedDeparture] = useState('2026-05-25');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!db) { setError('Firebase non configuré'); return; }
    if (selectedDeparture < selectedArrival) { setError(t('Departure must be after arrival.', 'Le départ doit être après l\'arrivée.')); return; }
    setLoading(true);
    setError('');
    try {
      const regUpdate: Partial<CeilidhRegistration> = {
        uid: user.uid,
        displayName: memberProfile.displayName,
        email: memberProfile.email,
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        roomId: room.id,
        roomName: language === 'FR' ? room.name_fr : room.name,
        arrivalDate: selectedArrival,
        departureDate: selectedDeparture,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid), regUpdate, { merge: true });
      onSuccess(regUpdate);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const DatePicker: React.FC<{ label: string; dates: typeof ARRIVAL_DATES; selected: string; onSelect: (id: string) => void }> = ({ label, dates, selected, onSelect }) => (
    <div className="text-left mb-6">
      <p className="font-cinzel text-white text-xs mb-3 uppercase tracking-widest">{label}</p>
      <div className="space-y-2">
        {dates.map(d => (
          <label key={d.id} className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => onSelect(d.id)}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${selected === d.id ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/20 group-hover:border-[#d4af37]/50'}`}
            >
              {selected === d.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </div>
            <span className="text-neutral-300 text-sm font-lato">{language === 'FR' ? d.label : d.label_en}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-[#d4af37]/30 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{room.icon}</div>
            <h2 className="font-cinzel text-2xl text-white">{language === 'FR' ? room.name_fr : room.name}</h2>
            <p className="text-neutral-500 text-xs font-cinzel uppercase tracking-widest mt-1">{t('Accommodation', 'Hébergement')}</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-lato">{error}</div>}

          <DatePicker
            label={t('Arrival', 'Arrivée')}
            dates={ARRIVAL_DATES}
            selected={selectedArrival}
            onSelect={setSelectedArrival}
          />
          <DatePicker
            label={t('Departure', 'Départ')}
            dates={DEPARTURE_DATES}
            selected={selectedDeparture}
            onSelect={setSelectedDeparture}
          />

          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-3 border border-white/20 text-white font-cinzel text-sm uppercase tracking-widest hover:border-white/50 transition-colors">
              {t('Cancel', 'Annuler')}
            </button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-50 transition-colors">
              {loading ? t('Confirming...', 'Confirmation...') : t('Confirm', 'Confirmer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Abundance / Non-monetary Contribution Section ───────────────────────────

interface AbundanceOffer {
  uid: string;
  name: string;
  photoURL?: string;
  offer: string;
  createdAt: any;
}

export const AbundanceSection: React.FC<{
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onRequireAuth: () => void;
  onViewProfile?: (uid: string) => void;
}> = ({ language, user, memberProfile, onRequireAuth, onViewProfile }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [offers, setOffers] = useState<AbundanceOffer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    let active = true;
    const q = query(
      collection(db, 'events', EVENT_ID, 'abundance'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(
      q,
      snap => { if (active) setOffers(snap.docs.map(d => d.data() as AbundanceOffer)); },
      err  => { if (active) console.error('abundance snapshot:', err.message); },
    );
    return () => { active = false; unsub(); };
  }, []);

  const myOffer = user ? offers.find(o => o.uid === user.uid) : null;

  const handleSubmit = async () => {
    if (!user || !memberProfile) return onRequireAuth();
    if (!offerText.trim()) return;
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const photo = user.photoURL || (memberProfile as any).photoURL || null;
      await setDoc(doc(db, 'events', EVENT_ID, 'abundance', user.uid), {
        uid: user.uid,
        name: memberProfile.displayName,
        ...(photo ? { photoURL: photo } : {}),
        offer: offerText.trim(),
        createdAt: serverTimestamp(),
      });
      setOfferText('');
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'events', EVENT_ID, 'abundance', user.uid));
    setShowForm(false);
  };

  return (
    <div className="mt-12 border-t border-white/5 pt-10">
      <div className="text-center mb-6">
        <p className="font-cinzel text-[#d4af37] text-sm uppercase tracking-[0.3em]">
          {t('Contribute Something Else?', 'Vous pouvez contribuer autre chose\u00a0?')}
        </p>
        <p className="text-neutral-500 font-lato text-xs mt-3 max-w-lg mx-auto leading-relaxed">
          {t(
            'Share publicly what you can offer from your zone of abundance — a boar if you\'re a butcher, a keg of beer if you\'re a bartender, a performance if you\'re an artist, scaffolding and tools if you\'re a builder…',
            'Partagez publiquement ce que vous pouvez offrir depuis votre zone d\'abondance — un sanglier si vous êtes boucher, un fût de bière si vous êtes barman, un spectacle si vous êtes artiste, de l\'échafaudage ou une nacelle si vous êtes constructeur…',
          )}
        </p>
      </div>

      {offers.length > 0 && (
        <div className="max-w-lg mx-auto space-y-2 mb-6">
          {offers.map(offer => (
            <div key={offer.uid} className="flex items-start gap-3 bg-[#0a0a0a] border border-white/8 p-3">
              <MiniAvatar name={offer.name} photoURL={offer.photoURL} size={28} onClick={onViewProfile ? () => onViewProfile(offer.uid) : undefined} />
              <div className="min-w-0 flex-1">
                <p className="text-neutral-300 text-xs font-cinzel">{offer.name}</p>
                <p className="text-neutral-500 text-xs font-lato mt-0.5 leading-relaxed">{offer.offer}</p>
              </div>
              {user && offer.uid === user.uid && (
                <button onClick={handleDelete} className="text-red-800 hover:text-red-400 text-xs transition-colors shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {!myOffer && !showForm && (
          <button
            onClick={() => user ? setShowForm(true) : onRequireAuth()}
            className="w-full py-3 border border-[#d4af37]/40 text-[#d4af37]/70 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37] hover:text-[#d4af37] transition-all"
          >
            {t('Share What I Can Offer', 'Partager Ce Que Je Peux Offrir')}
          </button>
        )}

        {myOffer && !showForm && (
          <div className="text-center">
            <p className="text-[#d4af37] text-xs font-cinzel uppercase tracking-widest mb-2">
              {t('Your offer is shared', 'Votre offre est partagée')} ✓
            </p>
            <button
              onClick={() => { setOfferText(myOffer.offer); setShowForm(true); }}
              className="text-neutral-600 text-[10px] font-lato hover:text-neutral-400 underline transition-colors"
            >
              {t('Edit', 'Modifier')}
            </button>
          </div>
        )}

        {showForm && (
          <div className="border border-white/10 bg-[#0a0a0a] p-5 space-y-4">
            {error && <p className="text-red-400 text-xs font-lato">{error}</p>}
            <div>
              <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-2">
                {t('What can you contribute?', 'Qu\'est-ce que vous pouvez apporter\u00a0?')}
              </label>
              <textarea
                value={offerText}
                onChange={e => setOfferText(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder={t(
                  'e.g. A keg of home-brewed beer, scaffolding for the barn, a folk music set for the evening…',
                  'ex: Un fût de bière maison, de l\'échafaudage pour la grange, un set de musique folk pour le soir…',
                )}
                className="w-full bg-[#141414] border border-white/10 text-white px-4 py-3 font-lato text-sm focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-700 resize-none"
              />
              <p className="text-neutral-700 text-[10px] font-lato mt-1 text-right">{offerText.length}/200</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 py-2.5 border border-white/15 text-neutral-500 font-cinzel text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                {t('Cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !offerText.trim()}
                className="flex-1 py-2.5 bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
              >
                {loading ? t('Saving…', 'Enregistrement…') : t('Share', 'Partager')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Covoiturage Section ────────────────────────────────────────────────────────

export const CovoiturageSection: React.FC<{
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  carpools: Carpool[];
  onRequireAuth: () => void;
}> = ({ language, user, memberProfile, carpools, onRequireAuth }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const [showPropose, setShowPropose] = useState(false);
  const [city, setCity] = useState('');
  const [seats, setSeats] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDriver = user ? carpools.some(c => c.driverUid === user.uid) : false;
  const myCarpool = user ? carpools.find(c => (c.passengers || []).some(p => p.uid === user.uid)) : null;

  const handlePropose = async () => {
    if (!user || !memberProfile) return onRequireAuth();
    if (!city.trim()) { setError(t('Please enter a city', 'Veuillez entrer une ville')); return; }
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const docRef = collection(db, 'events', EVENT_ID, 'carpools');
      await addDoc(docRef, {
        driverUid: user.uid,
        driverName: memberProfile.displayName,
        driverEmail: user.email ?? '',
        driverPhoto: user.photoURL ?? memberProfile.photoURL ?? '',
        city: city.trim(),
        totalSeats: seats,
        availableSeats: seats,
        passengers: [],
        createdAt: serverTimestamp(),
      });
      setShowPropose(false);
      setCity('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (carpool: Carpool) => {
    if (!user || !memberProfile) return onRequireAuth();
    if (carpool.availableSeats <= 0) return;
    if (isDriver || myCarpool) return; // Prevent multiple bookings
    if (!db) return;
    
    try {
      const cRef = doc(db, 'events', EVENT_ID, 'carpools', carpool.id!);
      await updateDoc(cRef, {
        availableSeats: carpool.availableSeats - 1,
        passengers: [...(carpool.passengers || []), { uid: user.uid, name: memberProfile.displayName }]
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleLeave = async (carpool: Carpool) => {
    if (!user || !db) return;
    try {
      const cRef = doc(db, 'events', EVENT_ID, 'carpools', carpool.id!);
      await updateDoc(cRef, {
        availableSeats: carpool.availableSeats + 1,
        passengers: (carpool.passengers || []).filter(p => p.uid !== user.uid)
      });
    } catch (e: any) {
      console.error(e);
    }
  };
  
  const handleCancelDrive = async (carpoolId: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'events', EVENT_ID, 'carpools', carpoolId));
    } catch(e: any) {
      console.error(e);
    }
  };

  return (
    <section className="py-8 px-6 md:px-12 lg:px-20 bg-[#050505]">
      <SectionDivider />
      <div className="text-center mb-12">
        <h2 className="font-cinzel text-3xl text-white">{t('Carpooling', 'Covoiturage')}</h2>
        <p className="text-neutral-500 font-lato text-sm mt-2">
          {t('Offer or join a ride to Namur, QC', 'Proposez ou rejoignez un trajet vers Namur, QC')}
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {!showPropose && !isDriver && (
          <div className="text-center mb-10">
            <button 
              onClick={() => user ? setShowPropose(true) : onRequireAuth()}
              className="px-6 py-3 border border-[#d4af37] text-[#d4af37] font-cinzel text-sm uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-colors"
            >
              {t('Propose a Lift', 'Proposer un Covoiturage')}
            </button>
          </div>
        )}

        {showPropose && (
          <div className="border border-white/10 bg-[#0a0a0a] p-6 mb-10">
            <h3 className="font-cinzel text-xl text-white mb-4">{t('New Ride Offer', 'Nouvelle Offre de Trajet')}</h3>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-2">{t('Departure City', 'Ville de Départ')}</label>
                <input 
                  type="text" 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  placeholder="Ex: Montréal, QC"
                  className="w-full bg-[#141414] border border-white/10 text-white px-4 py-2 font-lato focus:outline-none focus:border-[#d4af37]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-2">{t('Available Seats', 'Places Disponibles')}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setSeats(num)}
                      className={`flex-1 py-2 border font-lato transition-all ${seats === num ? 'border-[#d4af37] bg-[#d4af37]/10 text-white' : 'border-white/10 text-neutral-500 hover:border-white/30'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowPropose(false)} className="px-6 py-2 border border-white/20 text-neutral-400 font-cinzel text-sm uppercase tracking-widest hover:text-white transition-colors">
                {t('Cancel', 'Annuler')}
              </button>
              <button 
                onClick={handlePropose} 
                disabled={loading}
                className="px-6 py-2 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] transition-colors disabled:opacity-50"
              >
                {loading ? t('Creating...', 'Création...') : t('Confirm Offer', 'Confirmer l\'Offre')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {carpools.length === 0 ? (
            <div className="text-center text-neutral-600 font-lato italic">
              {t('No carpools available yet.', 'Aucun covoiturage disponible pour le moment.')}
            </div>
          ) : (
            carpools.map(cp => {
              const passengers = cp.passengers || [];
              const amIDriver = user && cp.driverUid === user.uid;
              const amIPassenger = user && passengers.some(p => p.uid === user.uid);
              const isFull = cp.availableSeats === 0;

              const driverIsAdmin = isAdminEmail(cp.driverEmail);
              return (
                <div key={cp.id} className={`relative border p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${amIDriver || amIPassenger ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-white/8 bg-[#0a0a0a]'}`}>
                  {driverIsAdmin && (
                    <span
                      className="absolute -top-2 left-3 px-2 py-0.5 rounded-sm font-cinzel text-[8px] uppercase tracking-[0.35em] text-[#1a1208]"
                      style={{
                        background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                        boxShadow: '0 2px 8px rgba(197,160,89,0.5)',
                      }}
                      aria-label="Admin"
                    >
                      Admin
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span className="text-xl">🚗</span>
                      <h4 className="font-cinzel text-white text-lg">{cp.city}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 text-sm font-lato mt-1">
                      {/* Driver avatar */}
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-cinzel uppercase shrink-0"
                        title={cp.driverName}
                        style={{
                          background: cp.driverPhoto ? `url(${cp.driverPhoto}) center/cover` : '#1f1810',
                          border: `1px solid ${driverIsAdmin ? 'rgba(243,229,171,0.6)' : 'rgba(255,255,255,0.18)'}`,
                          color: '#f3e5ab',
                        }}
                      >
                        {!cp.driverPhoto && (cp.driverName?.[0] || '?').toUpperCase()}
                      </span>
                      <span>{t('Driver:', 'Conducteur:')} <span className="text-neutral-300">{cp.driverName}</span></span>
                    </div>
                    {passengers.length > 0 && (
                      <div className="text-neutral-600 text-xs font-lato mt-2">
                        {t('Passengers:', 'Passagers:')} {passengers.map(p => p.name).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 min-w-[140px]">
                    <div className="text-xs font-cinzel tracking-widest uppercase">
                      {amIDriver ? (
                        <span className="text-[#d4af37]">{t('Your Car', 'Votre Voiture')}</span>
                      ) : (
                        <span className={isFull ? 'text-red-500' : 'text-neutral-400'}>
                          {cp.availableSeats}/{cp.totalSeats} {t('seats', 'places')}
                        </span>
                      )}
                    </div>
                    
                    {amIDriver ? (
                      <button onClick={() => handleCancelDrive(cp.id!)} className="text-xs text-red-500 border border-red-500/30 px-3 py-1 hover:bg-red-500/10 transition-colors">
                        {t('Cancel Ride', 'Annuler le Trajet')}
                      </button>
                    ) : amIPassenger ? (
                      <button onClick={() => handleLeave(cp)} className="text-xs text-neutral-400 border border-white/20 px-3 py-1 hover:text-white transition-colors">
                        {t('Leave Ride', 'Quitter')}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleJoin(cp)}
                        disabled={isFull || isDriver || !!myCarpool}
                        className={`text-xs px-4 py-2 font-cinzel font-bold uppercase tracking-widest transition-all
                          ${isFull ? 'bg-white/5 text-neutral-600 cursor-not-allowed' : (isDriver || !!myCarpool) ? 'opacity-0 pointer-events-none' : 'bg-[#d4af37] text-black hover:bg-[#f3e5ab]'}`}
                      >
                        {isFull ? t('Full', 'Complet') : t('Join', 'Rejoindre')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Mini Avatar ─────────────────────────────────────────────────────────────

const MiniAvatar: React.FC<{ name: string; photoURL?: string; size?: number; onClick?: () => void }> = ({ name, photoURL, size = 20, onClick }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const clickCls = onClick ? 'cursor-pointer hover:opacity-75 transition-opacity' : '';
  return photoURL ? (
    <img
      src={photoURL}
      alt={name}
      className={`rounded-full object-cover shrink-0 border border-white/10 ${clickCls}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    />
  ) : (
    <div
      className={`rounded-full shrink-0 bg-[#d4af37]/20 flex items-center justify-center border border-[#d4af37]/30 ${clickCls}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <span className="text-[#d4af37] font-cinzel font-bold leading-none" style={{ fontSize: size * 0.38 }}>
        {initials}
      </span>
    </div>
  );
};

// ─── Scroll Fade ─────────────────────────────────────────────────────────────

const ScrollFade: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};

// ─── Presence Timeline (Gantt) ────────────────────────────────────────────────

export const PresenceTimeline: React.FC<{
  registrations: CeilidhRegistration[];
  language: 'EN' | 'FR';
  onViewProfile?: (uid: string) => void;
}> = ({ registrations, language, onViewProfile }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  if (registrations.length === 0) return null;

  const N = EVENT_DAYS.length; // 5

  const dayIdx = (dateStr: string) => {
    const i = EVENT_DAYS.findIndex(d => d.id === dateStr);
    return i < 0 ? 1 : i; // default to index 1 (Fri 22) if not found
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-widest">
          {t('Who is there, when', 'Qui est là, quand')}
        </span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Day header */}
      <div className="flex items-center mb-2 pl-1">
        <div className="w-[140px] md:w-[180px] shrink-0" />
        <div className="flex-1 flex">
          {EVENT_DAYS.map(day => (
            <div key={day.id} className="flex-1 text-center text-[10px] font-cinzel text-neutral-600 uppercase tracking-wide">
              {language === 'FR' ? day.label : day.label_en}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt rows */}
      <div className="space-y-1.5">
        {registrations.map((reg, i) => {
          const color = reg.teamId ? TEAM_COLORS[reg.teamId] || '#d4af37' : '#d4af37';
          const arr = dayIdx(reg.arrivalDate || '2026-05-22');
          const dep = dayIdx(reg.departureDate || '2026-05-25');
          const leftPct = (arr / N) * 100;
          const widthPct = ((dep - arr + 1) / N) * 100;

          return (
            <ScrollFade key={reg.uid || i} delay={i * 40}>
              <div className="flex items-center gap-3 group">
                {/* Name */}
                <div className="w-[140px] md:w-[180px] shrink-0 flex items-center gap-2 min-w-0">
                  <MiniAvatar name={reg.displayName} photoURL={reg.photoURL} size={20} onClick={onViewProfile && reg.uid ? () => onViewProfile(reg.uid) : undefined} />
                  <span className="text-xs font-lato text-neutral-400 truncate group-hover:text-neutral-200 transition-colors">
                    {reg.displayName}
                    {reg.isChefEquipe && <span className="ml-1 text-[#d4af37]/60 text-[10px]">★</span>}
                  </span>
                </div>

                {/* Track */}
                <div className="flex-1 relative h-6 rounded-sm overflow-hidden bg-white/[0.03]">
                  {/* Day tick lines */}
                  {EVENT_DAYS.map((_, j) => j > 0 && (
                    <div key={j} className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
                      style={{ left: `${(j / N) * 100}%` }} />
                  ))}
                  {/* Stay bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded-full transition-opacity duration-300 group-hover:opacity-90"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: color,
                      opacity: 0.65,
                      boxShadow: `0 0 8px ${color}40`,
                    }}
                  />
                </div>
              </div>
            </ScrollFade>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-3">
        {Object.entries(TEAM_COLORS).map(([id, color]) => {
          const team = TEAMS.find(t => t.id === id);
          if (!team) return null;
          const count = registrations.filter(r => r.teamId === id).length;
          if (count === 0) return null;
          return (
            <div key={id} className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-lato">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
              {language === 'FR' ? team.name_fr : team.name} ({count})
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const CeilidhPage: React.FC<CeilidhPageProps> = ({ onNavigate, language, user, memberProfile, onUserChange, onShowPrivacy, onViewProfile }) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const teamsRef = React.useRef<HTMLElement>(null);

  const [activePanel, setActivePanel] = useState<string>('event');
  const [showAuth, setShowAuth] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showRoomRegistration, setShowRoomRegistration] = useState(false);
  const [userRegistration, setUserRegistration] = useState<CeilidhRegistration | null>(null);
  const [roomBookings, setRoomBookings] = useState<Record<string, number>>({});
  const [allRegistrations, setAllRegistrations] = useState<CeilidhRegistration[]>([]);
  const [teams, setTeams] = useState<CeilidhTeamData[]>(TEAMS);
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showTickets, setShowTickets] = useState<ShowTicket[]>([]);
  const [showBuyTicketModal, setShowBuyTicketModal] = useState(false);
  const [needs, setNeeds] = useState<CeilidhNeed[]>([]);

  const userShowTicket = showTickets.find(t => t.uid === user?.uid) ?? null;
  const showSpotsLeft = SHOW_CAPACITY - showTickets.length;

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

  // Load all registrations (real-time) — room counts + timeline + names
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'events', EVENT_ID, 'registrations'), snap => {
      const regs: CeilidhRegistration[] = [];
      const counts: Record<string, number> = {};
      snap.forEach(d => {
        const reg = d.data() as CeilidhRegistration;
        regs.push(reg);
        if (reg.roomId) counts[reg.roomId] = (counts[reg.roomId] || 0) + 1;
      });
      setAllRegistrations(regs);
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

  // Load carpools
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'events', EVENT_ID, 'carpools'), snap => {
      const cps: Carpool[] = [];
      const getTime = (t: any) => t?.toMillis?.() || t?.seconds * 1000 || 0;
      snap.forEach(d => cps.push({ id: d.id, ...d.data() } as Carpool));
      setCarpools(cps.sort((a,b) => getTime(b.createdAt) - getTime(a.createdAt)));
    });
    return unsub;
  }, []);

  // Load show tickets (public read — tracks remaining spots)
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'events', EVENT_ID, 'showTickets'), snap => {
      setShowTickets(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as ShowTicket));
    }, () => {});
    return unsub;
  }, []);

  // Load ceilidh needs
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'events', EVENT_ID, 'needs'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setNeeds(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CeilidhNeed));
    }, () => {});
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

  const handleRegisterRoom = useCallback((roomId: string) => {
    if (!user || !memberProfile) {
      setPendingRoomId(roomId);
      setShowAuth(true);
      return;
    }
    setPendingRoomId(roomId);
    setShowRoomRegistration(true);
  }, [user, memberProfile]);

  const handleAuthSuccess = useCallback((newUser: User, newProfile: MemberProfile) => {
    onUserChange(newUser, newProfile);
    setShowAuth(false);
    if (pendingTeamId) {
      setShowRegistration(true);
    }
    if (pendingRoomId) {
      setShowRoomRegistration(true);
    }
  }, [onUserChange, pendingTeamId, pendingRoomId]);

  const handleRegistrationSuccess = (reg?: Partial<CeilidhRegistration>) => {
    setShowRegistration(false);
    setShowRoomRegistration(false);
    setPendingTeamId(null);
    setPendingRoomId(null);
    setRegistrationSuccess(true);
    if (reg) setUserRegistration(prev => ({ ...prev, ...reg }) as CeilidhRegistration);
  };

  const handleCancelTeam = useCallback(async (teamId: string) => {
    if (!user || !db || !userRegistration) return;
    const updatedTeams = (userRegistration.teams ?? []).filter(m => m.teamId !== teamId);
    const firstPrimary = updatedTeams.find(m => !m.isSupport);
    const stillHasRoom = !!userRegistration.roomId;
    try {
      if (updatedTeams.length === 0 && !stillHasRoom) {
        await deleteDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid));
      } else {
        await updateDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid), {
          teams: updatedTeams,
          teamId: firstPrimary?.teamId ?? deleteField(),
          teamName: firstPrimary
            ? (language === 'FR'
                ? TEAMS.find(tm => tm.id === firstPrimary.teamId)?.name_fr
                : TEAMS.find(tm => tm.id === firstPrimary.teamId)?.name) ?? deleteField()
            : deleteField(),
          isChefEquipe: updatedTeams.some(m => m.isChefEquipe && !m.isSupport),
        });
      }
    } catch (e: any) {
      console.error('Cancel team error:', e);
    }
  }, [user, userRegistration, language]);

  const handleCancelRoom = useCallback(async () => {
    if (!user || !db || !userRegistration?.roomId) return;
    const stillHasTeam = !!userRegistration.teamId;
    try {
      if (!stillHasTeam) {
        await deleteDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid));
      } else {
        await updateDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid), {
          roomId: deleteField(),
          roomName: deleteField(),
        });
      }
    } catch (e: any) {
      console.error('Cancel room error:', e);
    }
  }, [user, userRegistration]);

  const handleCancelAll = useCallback(async () => {
    if (!user || !db) return;
    try {
      if (userRegistration?.teamId) {
        const teamRef = doc(db, 'events', EVENT_ID, 'teams', userRegistration.teamId);
        const snap = await getDoc(teamRef);
        const current = snap.exists() ? (snap.data().memberCount || 1) : 1;
        await setDoc(teamRef, { memberCount: Math.max(0, current - 1) }, { merge: true });
      }
      await deleteDoc(doc(db, 'events', EVENT_ID, 'registrations', user.uid));
    } catch (e: any) {
      console.error('Cancel all error:', e);
    }
  }, [user, userRegistration]);

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-neutral-200 font-sans selection:bg-[#d4af37] selection:text-black overflow-hidden">

      {/* Textures */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/paisley.png')]" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-[100] bg-[#050505]/90 border-b border-[#d4af37]/15 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('EVENTS')}>
            <span className="text-[#d4af37] text-xl">←</span>
            <span className="font-cinzel text-[#d4af37] text-sm hidden md:block tracking-widest">{t('Events', 'Événements')}</span>
          </div>
        </div>
      </header>

      {/* ── Image Accordion ────────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 bottom-0 flex flex-row" style={{ top: '57px' }}>
        {([
          { id: 'event',       fr: "L'Événement",  en: "The Event",   image: 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg' },
          { id: 'programme',   fr: 'Programme',    en: 'Programme',   image: 'https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg' },
          { id: 'equipes',     fr: 'Équipes',      en: 'Teams',       image: 'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg' },
          { id: 'hebergement', fr: 'Hébergement',  en: 'Lodging',     image: 'https://storage.googleapis.com/salondesinconnus/inn/yourte.png' },
          { id: 'pratique',    fr: 'Pratique',     en: 'Practical',   image: 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg' },
        ] as const).map(panel => {
          const isActive = activePanel === panel.id;
          return (
            <div
              key={panel.id}
              className={`relative h-full overflow-hidden transition-all duration-700 ease-in-out ${
                isActive
                  ? 'flex-1'
                  : 'w-[52px] hover:w-[88px] cursor-pointer'
              }`}
              style={{
                flexShrink: isActive ? 1 : 0,
              }}
              onClick={() => !isActive && setActivePanel(panel.id)}
            >
              {/* Background image — hidden on the active 'event' panel because the
                  LiquidGlassCycler hero handles its own imagery (avoids duplicate photo). */}
              <img
                src={panel.image}
                alt={panel.fr}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                style={{
                  opacity: isActive ? (panel.id === 'event' ? 0 : 0.7) : 0.9,
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                }}
              />
              {/* Gradient overlay — bottom only, just enough for text contrast */}
              <div
                className="absolute inset-0 transition-all duration-700"
                style={{ background: isActive
                  ? 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(5,5,5,0.55) 100%)'
                  : 'rgba(5,5,5,0.25)'
                }}
              />
              {/* Right separator */}
              {!isActive && <div className="absolute inset-y-0 right-0 w-px bg-[#d4af37]/12" />}

              {/* Inactive: clickable strip — clear affordance, readable label */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-white/[0.06]"
                style={{ opacity: isActive ? 0 : 1, pointerEvents: isActive ? 'none' : 'auto' }}
              >
                {/* Vertical label — full opacity with shadow for legibility on any bg */}
                <span
                  className="font-cinzel text-white text-[11px] uppercase tracking-[0.4em] whitespace-nowrap group-hover:text-[#d4af37] transition-colors duration-300"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    textShadow: '0 1px 8px rgba(0,0,0,0.9)',
                  }}
                >
                  {language === 'FR' ? panel.fr : panel.en}
                </span>
                {/* Click hint — small pulsing dot, gold, draws the eye */}
                <span
                  aria-hidden
                  className="block w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse group-hover:scale-150 transition-transform duration-300"
                />
              </div>

              {/* Active: scrollable content */}
              <div
                className="relative h-full overflow-y-auto custom-scrollbar transition-opacity duration-500"
                style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
              >

                {panel.id === 'event' && (
                  <div className="mx-3 md:mx-6 lg:mx-10 my-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                    {/* ── 1. HERO — same liquid-glass photo cycler as the Inn page ────── */}
                    <section className="relative min-h-screen overflow-hidden">
                      {/* Photo cycler: cycles through Ceilidh-relevant photos every 5s */}
                      <LiquidGlassCycler images={CEILIDH_HERO_IMAGES} />

                      {/* Bottom gradient anchors the text — image stays open above */}
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none z-[2]"
                        style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0,0,0,0.6) 78%, rgba(0,0,0,0.92) 100%)' }}
                      />

                      {/* Content — bottom-anchored over the cycler (same layout pattern as Inn) */}
                      <div className="absolute inset-x-0 bottom-0 z-10 max-w-[1200px] mx-auto px-6 md:px-12 pb-12 md:pb-20 flex flex-col items-center text-center">

                        {/* Eyebrow */}
                        <div className="hero-line-1 mb-4 md:mb-6 flex items-center gap-3 md:gap-4">
                          <div className="h-px w-10 md:w-14 bg-[#d4af37]" />
                          <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.5em] whitespace-nowrap">
                            {t('Maison Favier · Namur, QC', 'Maison Favier · Namur, QC')}
                          </span>
                          <div className="h-px w-10 md:w-14 bg-[#d4af37]" />
                        </div>

                        {/* Title */}
                        <h1
                          className="hero-line-2 font-cinzel text-white uppercase leading-[0.95] tracking-[-0.01em] mb-4 md:mb-6"
                          style={{ fontSize: 'clamp(2.5rem, 8vw, 8.5rem)', textShadow: '0 0 40px rgba(0,0,0,0.7)' }}
                        >
                          {t('Grand Ceilidh', 'Grand Ceilidh')}<br />{t('de Mai', 'de Mai')}
                        </h1>

                        {/* Date + tagline */}
                        <div className="hero-line-3 mb-6 md:mb-8">
                          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-2">
                            <span className="shimmer-text font-cinzel text-xl md:text-2xl font-bold">21 – 25 Mai 2026</span>
                            <span className="text-neutral-500 text-sm font-lato">(Kay-lee)</span>
                          </div>
                          <p className="font-lato text-neutral-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed tracking-wide" style={{ textShadow: '0 0 20px rgba(0,0,0,0.7)' }}>
                            {t(
                              'Spectacles · Woofing · Banquet · Community · Art',
                              'Spectacles · Woofing · Banquet · Communauté · Art',
                            )}
                          </p>
                        </div>

                        {/* CTA */}
                        <div className="hero-line-4 flex flex-col items-center gap-3">
                          {!userRegistration ? (
                            <button
                              onClick={() => {
                                if (!user) { setShowAuth(true); return; }
                                setActivePanel('programme');
                              }}
                              className="btn-pulse px-10 py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-[0.3em] hover:bg-[#f3e5ab] transition-all hover:scale-105 active:scale-95"
                            >
                              {t('Register Now', "S'inscrire Maintenant")}
                            </button>
                          ) : (
                            <>
                              <div className="inline-flex items-center gap-3 px-6 py-4 border border-[#d4af37] bg-[#d4af37]/10">
                                <span className="text-[#d4af37] text-xl">✓</span>
                                <div className="text-left">
                                  <div className="font-cinzel text-[#d4af37] text-sm uppercase tracking-widest">{t('You are registered', 'Vous êtes inscrit(e)')}</div>
                                  <div className="text-neutral-400 text-xs font-lato mt-0.5">
                                    {userRegistration.teams && userRegistration.teams.length > 0
                                      ? userRegistration.teams
                                          .filter(m => !m.isSupport)
                                          .map(m => TEAMS.find(tm => tm.id === m.teamId)?.[language === 'FR' ? 'name_fr' : 'name'] ?? m.teamId)
                                          .join(' · ')
                                      : userRegistration.teamName}
                                    {userRegistration.roomName && ` · ${userRegistration.roomName}`}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={handleCancelAll}
                                className="text-[10px] text-red-500/50 hover:text-red-400 font-cinzel uppercase tracking-widest transition-colors underline underline-offset-2"
                              >
                                {t('Cancel my participation', 'Annuler ma participation')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </section>

                    
                    {/* ── 2. SCHEDULE ─────────────────────────────────────────────── */}
                    <section className="py-16 px-6 md:px-12 lg:px-20">
                      <SectionDivider />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                        {[
                          { date: 'Jeu 21 Mai', title: t('Optional Arrival', 'Arrivée Facultative'), sub: t('Woofers who want to arrive early', 'Pour les woofers qui veulent s\'installer'), icon: '🌙' },
                          { date: 'Ven 22 Mai', title: '9AM – 6PM', sub: t('Work · Dinner · Show 6PM & 9PM', 'Travail · Souper · Spectacle 18h et 21h'), icon: '🎸' },
                          { date: 'Sam 23 Mai', title: '9AM – 6PM', sub: t('Work · Dinner · Show 6:30PM', 'Travail · Souper · Spectacle 18h30'), icon: '🎭' },
                          { date: 'Dim 24 Mai', title: '9AM – 6PM', sub: t('Work · Dinner · Show · Banquet', 'Travail · Souper · Spectacle · Banquet'), icon: '🥂' },
                          { date: 'Lun 25 Mai', title: t('Optional Departure', 'Départ Facultatif'), sub: t('Before 11am · Farewell', 'Avant 11h · Au revoir'), icon: '🌅' },
                        ].map((day, i) => (
                          <ScrollFade key={i} delay={i * 80}>
                            <div className="bg-[#0a0a0a] border border-white/8 p-6 group hover:border-[#d4af37]/30 hover:-translate-y-1 transition-all duration-300 cursor-default h-full">
                              <div className="text-2xl mb-3 transition-transform duration-300 group-hover:scale-125">{day.icon}</div>
                              <div className="font-cinzel text-[#d4af37] text-sm uppercase tracking-widest mb-2">{day.date}</div>
                              <div className="font-cinzel text-white text-base mb-2">{day.title}</div>
                              <div className="text-neutral-500 text-xs font-lato leading-relaxed">{day.sub}</div>
                            </div>
                          </ScrollFade>
                        ))}
                      </div>
                    </section>

                  </div>
                )}

                {panel.id === 'programme' && (
                  <div className="mx-3 md:mx-6 lg:mx-10 my-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden pb-12">
                    {/* ── 2b. C'EST QUOI CONCRÈTEMENT ─────────────────────────────── */}
                    <section className="py-16 px-6 md:px-12 lg:px-20">
                      <SectionDivider />
                      <ScrollFade>
                        <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/55 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] px-8 py-6 text-center mb-12">
                          <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">Programme</span>
                          <h2 className="font-cinzel text-3xl md:text-4xl text-white mt-3">
                            {t('What does it look like?', 'C\'est quoi concrètement\u00a0?')}
                          </h2>
                        </div>
                      </ScrollFade>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                          {
                            icon: '🔨',
                            titleEn: 'Work', titleFr: 'Travail',
                            lines: [
                              t('9am to 6pm · All 3 Days', '9h à 18h · Les 3 Jours'),
                              t('With a lunch break', 'Avec pause dîner'),
                            ],
                          },
                          {
                            icon: '🍽️',
                            titleEn: 'Dinner & Festivities', titleFr: 'Souper et Festivités',
                            lines: [
                              t('Starting at 6pm · Friday, Saturday & Sunday', 'À partir de 18h · Vendredi, Samedi et Dimanche'),
                            ],
                          },
                          {
                            icon: '🎸',
                            titleEn: 'Show & Jam', titleFr: 'Spectacle et Jam',
                            lines: [
                              t('On the outdoor terrace', 'Sur la terrasse Dehors'),
                              t('Option to come for shows only (fee applies)', 'Possibilité de venir uniquement pour le spectacle moyennant frais'),
                              t('Band TBA', 'Band à venir'),
                            ],
                          },
                          {
                            icon: '♨️',
                            titleEn: 'Relaxation', titleFr: 'Moments Détente',
                            lines: [
                              t('Jacuzzi · Cozy fire pit · Board games', 'Jacuzzi · Tas de pwel · Jeux de société'),
                            ],
                          },
                          {
                            icon: '🌿',
                            titleEn: 'Nature & Spa Space', titleFr: 'Espace Nature et Spa',
                            lines: [
                              t('Stream · Forest Terrace · Gardens', 'Ruisseau · Terrasse en Forêt · Jardins'),
                              t('Fire pit · Nearby lake', 'Rond de Feu · Lac à proximité'),
                            ],
                          },
                          {
                            icon: '🛏️',
                            titleEn: 'Sleep', titleFr: 'Dormir',
                            lines: [
                              t('Room · Yurt / Ger · Converted Bus', 'Chambre · Yourte / Ger · Bus Converti'),
                              t('Prospector Tent · Tiny House', 'Tente Prospecteur · Tiny House'),
                              t('Or bring your own tent / van', 'Ou apportez votre propre tente / van'),
                            ],
                          },
                        ].map((card, i) => (
                          <ScrollFade key={i} delay={i * 70}>
                            <div className="border border-white/8 bg-[#0a0a0a] p-6 hover:border-[#d4af37]/30 transition-all duration-300 group h-full">
                              <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110">{card.icon}</div>
                              <h3 className="font-cinzel text-white text-sm uppercase tracking-widest mb-3">
                                {language === 'FR' ? card.titleFr : card.titleEn}
                              </h3>
                              <ul className="space-y-1.5">
                                {card.lines.map((line, j) => (
                                  <li key={j} className="text-neutral-500 text-xs font-lato leading-relaxed flex items-start gap-2">
                                    <span className="text-[#d4af37]/40 shrink-0">—</span>
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </ScrollFade>
                        ))}
                      </div>
                    </section>

                    {/* ── 3. TWO WAYS TO COME ──────────────────────────────────────── */}
                    <section>
                      <div className="px-6 md:px-12 lg:px-20 pb-10">
                        <SectionDivider />
                        <ScrollFade>
                          <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/55 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] px-8 py-6 text-center mb-4">
                            <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">{t('Participation', 'Participation')}</span>
                            <h2 className="font-cinzel text-3xl md:text-5xl text-white mt-3">{t('Two Ways to Come', 'Deux Façons de Venir')}</h2>
                          </div>
                        </ScrollFade>
                      </div>
                      {/* Full-bleed split panels */}
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <ScrollFade>
                          <div className="relative overflow-hidden min-h-[520px] flex flex-col justify-center p-10 md:p-14 lg:p-20">
                            <div className="absolute inset-0">
                              <video src="https://storage.googleapis.com/salondesinconnus/inn/Temp%20video%20site.mov" autoPlay muted loop playsInline className="w-full h-full object-cover opacity-30" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-[#050505]/50" />
                              <div className="absolute inset-y-0 right-0 w-px bg-white/5 hidden md:block" />
                            </div>
                            <div className="relative z-10">
                              <div className="text-3xl mb-5">🎵</div>
                              <h3 className="font-cinzel text-2xl text-white mb-4">{t('Shows Only', 'Spectacles Seulement')}</h3>
                              <p className="text-neutral-400 font-lato text-sm leading-relaxed mb-6 max-w-sm">
                                {t(
                                  'Come only for the festivities — no work required. This helps too!',
                                  'Il vous est possible de ne venir qu\'aux festivités sans travailler toute la journée. Cela aide aussi\u00a0!',
                                )}
                              </p>
                              <div className="space-y-2 text-sm font-lato max-w-sm mb-6">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                  <span className="text-neutral-500">{t('1 Show', '1 Spectacle')}</span>
                                  <span className="text-[#d4af37] font-bold">10$</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                  <span className="text-neutral-500">{t('Weekend Pass (3 Shows)', 'Passe Weekend (3 Spectacles)')}</span>
                                  <span className="text-[#d4af37] font-bold">20$</span>
                                </div>
                              </div>

                              {/* Spot counter */}
                              <div className="mb-4 max-w-sm">
                                <div className="flex items-center justify-between text-[10px] font-cinzel uppercase tracking-widest text-neutral-600 mb-1.5">
                                  <span>{t('Show-only spots', 'Places spectateurs')}</span>
                                  <span className={showSpotsLeft <= 3 ? 'text-red-400' : 'text-[#d4af37]/70'}>
                                    {showSpotsLeft > 0 ? `${showSpotsLeft}/20 ${t('left', 'restantes')}` : t('Sold out', 'Complet')}
                                  </span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(showTickets.length / 20) * 100}%`,
                                      backgroundColor: showSpotsLeft <= 3 ? '#ef4444' : '#d4af37',
                                      opacity: 0.6,
                                    }}
                                  />
                                </div>
                              </div>

                              {/* User already has a ticket */}
                              {userShowTicket ? (
                                <div className="max-w-sm p-4 border border-[#d4af37]/40 bg-[#d4af37]/5">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[#d4af37]">✓</span>
                                    <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-widest">
                                      {t('Your ticket', 'Votre billet')}
                                    </span>
                                  </div>
                                  <p className="font-cinzel text-lg text-white tracking-[0.2em]">{userShowTicket.ticketCode}</p>
                                  <p className="text-neutral-500 text-[10px] font-lato mt-1">
                                    {userShowTicket.ticketType === 'weekend' ? t('Weekend Pass · All 3 shows', 'Passe Weekend · 3 spectacles') : t('Single show', '1 spectacle')}
                                  </p>
                                </div>
                              ) : showSpotsLeft > 0 ? (
                                <button
                                  onClick={() => {
                                    if (!user) { setShowAuth(true); return; }
                                    setShowBuyTicketModal(true);
                                  }}
                                  className="max-w-sm w-full py-3 border border-[#d4af37] text-[#d4af37] font-cinzel text-sm uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all duration-300"
                                >
                                  {t('Buy Tickets', 'Acheter des Billets')}
                                </button>
                              ) : (
                                <div className="max-w-sm py-3 border border-red-900/50 text-red-500/70 font-cinzel text-sm uppercase tracking-widest text-center">
                                  {t('Sold Out', 'Complet')}
                                </div>
                              )}

                              <p className="text-neutral-600 text-xs font-lato mt-5 italic max-w-sm">
                                {t('Show-only guests wishing to eat are invited to bring food in Potluck style.', 'Les personnes venues pour les spectacles uniquement et souhaitant manger sont priées d\'apporter leur nourriture en formule Potluck.')}
                              </p>
                            </div>
                          </div>
                        </ScrollFade>

                        <ScrollFade delay={150}>
                          <div className="relative overflow-hidden min-h-[520px] flex flex-col justify-center p-10 md:p-14 lg:p-20">
                            <div className="absolute inset-0">
                              <img src="https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png" alt="" className="w-full h-full object-cover opacity-25" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-[#050505]/40" />
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#d4af37]/5" />
                            </div>
                            <div className="relative z-10">
                              <div className="text-3xl mb-5">🪚</div>
                              <h3 className="font-cinzel text-2xl text-white mb-4">{t('As a Woofer', 'En Contribuant (Woofing)')}</h3>
                              <p className="text-neutral-400 font-lato text-sm leading-relaxed mb-6 max-w-sm">
                                {t(
                                  'By joining one of the support teams, you receive all 3 shows, food, and lodging as a thank-you.',
                                  'En s\'inscrivant dans une des équipes de soutien, vous recevrez les 3 spectacles, la nourriture et l\'hébergement en remerciement.',
                                )}
                              </p>
                              <div className="space-y-3 text-sm font-lato">
                                {[
                                  ['3 Shows', '3 Spectacles'],
                                  ['Full Board (Meals)', 'Pension Complète (Repas)'],
                                  ['Lodging on site', 'Hébergement sur place'],
                                ].map(([en, fr], idx) => (
                                  <div key={idx} className="flex items-center gap-3">
                                    <span className="text-[#d4af37] text-base">✓</span>
                                    <span className="text-neutral-300">{language === 'FR' ? fr : en}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </ScrollFade>
                      </div>
                    </section>

                    {/* ── 4. WHAT IS A CEILIDH ─────────────────────────────────────── */}
                    <section className="grid grid-cols-1 md:grid-cols-2">
                      <div className="flex flex-col justify-center py-16 md:py-24 px-8 md:px-14 lg:px-20 order-last md:order-first">
                        <ScrollFade>
                          <h2 className="font-cinzel text-xl md:text-3xl text-white mb-10 leading-snug">
                            {language === 'FR'
                              ? 'Le Ceilidh, le Woofing,\nquoi que c\'est que ceci\u00a0?'
                              : 'The Ceilidh, the Woofing —\nWhat Is This?'}
                          </h2>
                        </ScrollFade>
                        <div className="space-y-8 text-sm font-lato text-neutral-400 leading-relaxed">
                          {[
                            {
                              titleEn: 'What is Woofing?', titleFr: 'C\'est quoi le Woofing\u00a0?',
                              textEn: 'Traditionally, Woofing is the practice of volunteering on organic farms, or spaces linked to sustainable agriculture, intentional community, or art — in exchange for food and lodging. It is a cultural exchange and sharing experience that lets volunteers (called woofers) discover alternative lifestyles, travel without monetary cost, learn environmentally respectful practices, and participate in a collective project.',
                              textFr: 'Traditionnellement, le Woofing est une pratique qui consiste à travailler bénévolement dans des fermes biologiques, ou des lieux liés à l\'agriculture durable, à la communauté intentionnelle ou à l\'art, en échange du gîte et du couvert. C\'est une expérience d\'échange culturel et de partage, qui permet aux bénévoles (appelés woofers) de découvrir des modes de vie alternatifs, de voyager sans frais monétaires, d\'apprendre des pratiques agricoles respectueuses de l\'environnement, et de participer à un projet collectif.',
                            },
                            {
                              titleEn: 'A Bit of History', titleFr: 'Un peu d\'histoire',
                              textEn: 'Community work calls have existed for a long time — moments where people unite to help a collective project, share know-how, and strengthen human bonds around a common goal. Many cultures had forms of communal work and mutual aid, because great tasks could not be accomplished alone. People took turns giving each other "big pushes" throughout the year.',
                              textFr: 'Les appels communautaires de corvées existent depuis longtemps. Ce sont des moments où l\'on s\'unit pour aider un projet collectif, partager des savoir-faire, et renforcer les liens humains autour d\'un objectif commun. Plusieurs cultures avaient des formes de travail commun et d\'entraide car, les gros travaux ne pouvant s\'accomplir seul, les gens se relayaient pour donner des "gros coups" dans l\'année.',
                            },
                            {
                              titleEn: 'Bringing Back the Working Ceilidh', titleFr: 'Ramener le "Ceilidh" Travailleur',
                              textEn: 'Ceilidh (pronounced "kay-lee") is a Gaelic word from the Scottish tradition. While today mainly associated with festive gatherings with music, dance, and stories, it once had a utilitarian dimension. Rural communities organized these gatherings to harvest, build homes and barns, or card wool — followed by celebrations that strengthened community bonds and made the hard work feel worthwhile.',
                              textFr: 'Ceilidh (prononcé "kay-lee") est un mot gaélique qui désigne une tradition Écossaise. Bien que le ceilidh soit aujourd\'hui principalement associé à des rassemblements festifs avec de la musique, de la danse et des histoires, il avait autrefois une dimension utilitaire. Les communautés rurales organisaient ces rencontres pour accomplir des tâches collectives — récolter les moissons, construire ou réparer des maisons et des granges, fileter la laine. Ces moments de travail étaient suivis de célébrations, renforçant les liens communautaires et rendant le travail moins pénible.',
                            },
                            {
                              titleEn: 'Our Version', titleFr: 'Une version Inconnue',
                              textEn: 'We decided to organize a Grand Woofing and add our own flavour — dinner, shows, jam sessions, and games — bringing it closer to the traditional Ceilidh. All weekend we will work together to beautify and support this place, and each evening we will celebrate with a convivial dinner followed by a show and a jam.\n\nThe Grand Ceilidh de Mai is an occasion to contribute to a community call, to support a place, an idea, a vision and good-hearted people. You are welcome whether you come from far away or are local. Join us for a moment of sharing, joy, and collaboration!',
                              textFr: 'Cette année, nous avons décidé d\'organiser un Grand Woofing et d\'enjoliver à notre sauce le concept en ajoutant souper, spectacle, jam et jeux, le rapprochant du Ceilidh traditionnel. Pendant tout un weekend, nous travaillerons ensemble pour embellir et soutenir le lieu, et chaque soir, nous célébrerons avec un souper convivial suivi d\'un spectacle et d\'un jam musical.\n\nLe Grand Ceilidh de Mai, c\'est l\'occasion de contribuer à un appel communautaire, de soutenir un lieu, une idée, une vision et des gens de cœur. Vous êtes les bienvenu(e)s, que vous veniez de loin ou que vous soyez de la région. Rejoignez-nous pour un moment de partage, de joie et de collaboration\u00a0!',
                            },
                          ].map((block, i) => (
                            <ScrollFade key={i} delay={i * 100}>
                              <div>
                                <h4 className="font-cinzel text-[#d4af37] text-xs uppercase tracking-widest mb-2">
                                  {language === 'FR' ? block.titleFr : block.titleEn}
                                </h4>
                                <p className="whitespace-pre-line">{language === 'FR' ? block.textFr : block.textEn}</p>
                              </div>
                            </ScrollFade>
                          ))}
                        </div>
                      </div>
                      {/* Right: photo */}
                      <div className="relative min-h-[420px] overflow-hidden">
                        <img
                          src="https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg"
                          alt="Campfire at Maison Favier"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] md:from-transparent to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#050505] hidden md:block" />
                      </div>
                    </section>

                    {/* Next → équipes */}
                    <div className="flex justify-center pb-16 px-6">
                      <button
                        onClick={() => setActivePanel('equipes')}
                        className="group flex items-center gap-3 px-8 py-3 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/5 text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.3em] transition-all"
                      >
                        {t('Next: Teams', 'Suivant : Équipes')}
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    </div>

                  </div>
                )}

                {panel.id === 'equipes' && (
                  <div className="mx-3 md:mx-6 lg:mx-10 my-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                    {/* ── 6. TEAMS ─────────────────────────────────────────────────── */}
                    <section id="teams" ref={teamsRef} className="py-16 px-6 md:px-12 lg:px-20">
                      <SectionDivider />
                      <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/55 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] px-8 py-6 text-center mb-12">
                        <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">{t('Volunteer', 'Bénévolat')}</span>
                        <h2 className="font-cinzel text-3xl md:text-5xl text-white mt-3">{t('Woofing Teams', 'Équipes de Woofing')}</h2>
                        <p className="text-neutral-300 font-lato text-sm mt-3 max-w-xl mx-auto">
                          {t(
                            'Choose a team, register, and optionally volunteer as team leader.',
                            'Choisissez une équipe, inscrivez-vous et proposez-vous éventuellement comme chef d\'équipe.',
                          )}
                        </p>
                      </div>

                      {registrationSuccess && (
                        <div className="mb-6 p-5 border border-[#d4af37] bg-[#d4af37]/10 text-center">
                          <div className="font-cinzel text-[#d4af37] text-lg mb-1">🎉 {t('Registration confirmed!', 'Inscription confirmée\u00a0!')}</div>
                          <p className="text-neutral-400 font-lato text-sm">
                            {t('See you on May 21–25, 2026.', 'À bientôt du 21 au 25 mai 2026.')}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {teams.map((team, i) => {
                          const primaryMembers = allRegistrations.filter(r =>
                            r.teams?.some(m => m.teamId === team.id && !m.isSupport) ||
                            (!r.teams && r.teamId === team.id),
                          );
                          const supportMembers = allRegistrations.filter(r =>
                            r.teams?.some(m => m.teamId === team.id && m.isSupport),
                          );
                          return (
                            <ScrollFade key={team.id} delay={i * 60}>
                              <TeamCard
                                team={team}
                                language={language}
                                user={user}
                                userRegistration={userRegistration}
                                primaryMembers={primaryMembers}
                                supportMembers={supportMembers}
                                onRegisterToTeam={handleRegisterToTeam}
                                onLeaveTeam={handleCancelTeam}
                                onViewProfile={onViewProfile}
                              />
                            </ScrollFade>
                          );
                        })}
                      </div>
                    </section>

                    {/* ── 6b. PRESENCE TIMELINE — wrapped in glass card so the timeline stays
                            readable against any background image bleed-through */}
                    {allRegistrations.length > 0 && (
                      <section className="pb-16 px-6 md:px-12 lg:px-20">
                        <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md shadow-[0_30px_60px_rgba(0,0,0,0.4)] p-6 md:p-8">
                          <PresenceTimeline registrations={allRegistrations} language={language} onViewProfile={onViewProfile} />
                        </div>
                      </section>
                    )}

                    {/* Next → hébergement */}
                    <div className="flex justify-center pb-16 px-6">
                      <button
                        onClick={() => setActivePanel('hebergement')}
                        className="group flex items-center gap-3 px-8 py-3 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/5 text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.3em] transition-all"
                      >
                        {t('Next: Lodging', 'Suivant : Hébergement')}
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    </div>

                  </div>
                )}

                {panel.id === 'hebergement' && (
                  <div className="mx-3 md:mx-6 lg:mx-10 my-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                    {/* ── 7. LODGING OVERVIEW ──────────────────────────────────────── */}
                    <section className="py-16 px-6 md:px-12 lg:px-20">
                      <SectionDivider />
                      <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/55 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] px-8 py-6 text-center mb-12">
                        <h2 className="font-cinzel text-3xl text-white">{t('Choose Your Lodging', 'Choisissez votre Hébergement')}</h2>
                        <p className="text-neutral-300 font-lato text-sm mt-2">
                          {t('Included for Woofers · Tent camping possible', 'Inclus pour les Woofers · Camping en tente possible')}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {ROOMS.map((room, ri) => {
                          const booked = roomBookings[room.id] || 0;
                          const available = room.capacity - booked;
                          const isFull = available <= 0;
                          const pct = Math.round((booked / room.capacity) * 100);
                          const occupants = allRegistrations.filter(r => r.roomId === room.id);
                          const isMyRoom = userRegistration?.roomId === room.id;
                          const roomPhotos: Record<string, string> = {
                            ecrivaine: 'https://storage.googleapis.com/salondesinconnus/inn/ecrivaine%20banana.jpg',
                            musicienne: 'https://storage.googleapis.com/salondesinconnus/inn/musicienne%20banana%202.jpg',
                            theatre: 'https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg',
                            cinema: 'https://storage.googleapis.com/salondesinconnus/inn/cineast%20banana%202.jpg',
                            yurt: 'https://storage.googleapis.com/salondesinconnus/inn/yourte.png',
                            tiny: 'https://storage.googleapis.com/salondesinconnus/inn/For%20site%20temp%20mini%20(1).jpg',
                          };
                          const photo = roomPhotos[room.id];
                          return (
                            <ScrollFade key={room.id} delay={ri * 40}>
                              <div
                                className={`border bg-[#0a0a0a] overflow-hidden transition-all duration-300 ${
                                  isMyRoom
                                    ? 'border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                                    : isFull
                                    ? 'border-white/5 opacity-60'
                                    : 'border-white/8 hover:border-[#d4af37]/40 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,175,55,0.06)] cursor-pointer'
                                }`}
                                onClick={() => !isFull && !isMyRoom && handleRegisterRoom(room.id)}
                              >
                                {photo && (
                                  <div className="relative h-24 overflow-hidden">
                                    <img src={photo} alt={room.name} className="w-full h-full object-cover opacity-60 transition-transform duration-700 hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                  </div>
                                )}
                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{room.icon}</span>
                                      <span className="font-cinzel text-white text-xs">{language === 'FR' ? room.name_fr : room.name}</span>
                                    </div>
                                    {isMyRoom && (
                                      <span className="text-[#d4af37] text-[10px] font-cinzel uppercase tracking-widest leading-none">
                                        {t('My Room', 'Ma Chambre')}
                                      </span>
                                    )}
                                  </div>
                                  {'description_fr' in room && (
                                    <p className="text-neutral-600 text-[10px] font-lato mb-2">
                                      {language === 'FR' ? (room as any).description_fr : (room as any).description_en}
                                    </p>
                                  )}
                                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <div
                                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-700' : pct >= 75 ? 'bg-yellow-600' : 'bg-[#d4af37]'}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <div className="text-xs font-lato text-neutral-600 mb-1">
                                    {available > 0 ? `${available}/${room.capacity} ${t('available', 'disponible')}` : t('Full', 'Complet')}
                                  </div>
                                  {occupants.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                      {/* Mini timeline — day ticks */}
                                      <div className="flex items-center pl-[20px] gap-0 mb-0.5">
                                        {EVENT_DAYS.map(day => (
                                          <div key={day.id} className="flex-1 text-center text-[8px] font-cinzel text-neutral-700 uppercase">
                                            {language === 'FR' ? day.label.split(' ')[0] : day.label_en.split(' ')[0]}
                                          </div>
                                        ))}
                                      </div>
                                      {occupants.map(o => {
                                        const N = EVENT_DAYS.length;
                                        const arrIdx = EVENT_DAYS.findIndex(d => d.id === (o.arrivalDate || '2026-05-22'));
                                        const depIdx = EVENT_DAYS.findIndex(d => d.id === (o.departureDate || '2026-05-25'));
                                        const arr = arrIdx < 0 ? 1 : arrIdx;
                                        const dep = depIdx < 0 ? N - 1 : depIdx;
                                        const color = o.teamId ? TEAM_COLORS[o.teamId] || '#d4af37' : '#d4af37';
                                        return (
                                          <div key={o.uid} className="flex items-center gap-1.5">
                                            <MiniAvatar name={o.displayName} photoURL={o.photoURL} size={16} onClick={onViewProfile && o.uid ? () => onViewProfile(o.uid) : undefined} />
                                            <div className="flex-1 relative h-4 bg-white/[0.03] rounded-sm overflow-hidden">
                                              {EVENT_DAYS.map((_, j) => j > 0 && (
                                                <div key={j} className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
                                                  style={{ left: `${(j / N) * 100}%` }} />
                                              ))}
                                              <div
                                                className="absolute top-0.5 bottom-0.5 rounded-full"
                                                style={{
                                                  left: `${(arr / N) * 100}%`,
                                                  width: `${((dep - arr + 1) / N) * 100}%`,
                                                  backgroundColor: color,
                                                  opacity: 0.6,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {isMyRoom && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-2" onClick={e => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleRegisterRoom(room.id)}
                                        className="flex-1 py-1.5 text-[10px] font-cinzel uppercase tracking-wider border border-white/15 text-neutral-500 hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all"
                                      >
                                        {t('Edit', 'Modifier')}
                                      </button>
                                      <button
                                        onClick={handleCancelRoom}
                                        className="flex-1 py-1.5 text-[10px] font-cinzel uppercase tracking-wider border border-red-900/40 text-red-600/70 hover:border-red-600 hover:text-red-400 transition-all"
                                      >
                                        {t('Leave', 'Quitter')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ScrollFade>
                          );
                        })}
                      </div>
                    </section>

                    {/* Next → pratique */}
                    <div className="flex justify-center pb-16 px-6">
                      <button
                        onClick={() => setActivePanel('pratique')}
                        className="group flex items-center gap-3 px-8 py-3 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/5 text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.3em] transition-all"
                      >
                        {t('Next: Practical', 'Suivant : Pratique')}
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    </div>

                  </div>
                )}

                {panel.id === 'pratique' && (
                  <div className="mx-3 md:mx-6 lg:mx-10 my-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                    {/* ── 8. COVOITURAGE ───────────────────────────────────────────── */}
                    <CovoiturageSection
                      language={language}
                      user={user}
                      memberProfile={memberProfile}
                      carpools={carpools}
                      onRequireAuth={() => setShowAuth(true)}
                    />

                    {/* ── 8b. CEILIDH NEEDS ───────────────────────────────────────── */}
                    <NeedsSection language={language} user={user} needs={needs} onRequireAuth={() => setShowAuth(true)} />

                    {/* ── 9. CONTRIBUTE ───────────────────────────────────────────── */}
                    <section className="py-16 px-6 md:px-12 lg:px-20 bg-[#050505]">
                      <SectionDivider />
                      <ScrollFade>
                        <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/55 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] px-8 py-6 text-center mb-10">
                          <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">
                            {t('Support', 'Soutenir')}
                          </span>
                          <h2 className="font-cinzel text-3xl md:text-4xl text-white mt-3">
                            {t('Contribute', 'Contribuer')}
                          </h2>
                        </div>
                        <div className="max-w-lg mx-auto">
                          <ContributionPanel
                            language={language}
                            user={user}
                            onRequireAuth={() => setShowAuth(true)}
                          />
                          <AbundanceSection
                            language={language}
                            user={user}
                            memberProfile={memberProfile}
                            onRequireAuth={() => setShowAuth(true)}
                            onViewProfile={onViewProfile}
                          />
                        </div>
                      </ScrollFade>
                    </section>

                    {/* ── MAP / ADDRESS — full-width, softer dark-mode filter ────── */}
                    <section className="pt-12 pb-0">
                      <ScrollFade>
                        <div className="text-center mb-6 px-6">
                          <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em]">{t('Location', 'Lieu')}</span>
                          <h2 className="font-cinzel text-2xl md:text-3xl text-white mt-3">Maison Favier</h2>
                          <p className="text-neutral-500 font-lato text-sm mt-2">826 Côte à Favier · Namur, QC J0V 1N0</p>
                        </div>
                        <div className="relative w-full border-y border-white/10" style={{ height: 'min(55vh, 520px)' }}>
                          <iframe
                            src="https://www.openstreetmap.org/export/embed.html?bbox=-75.0%2C45.85%2C-74.85%2C45.95&layer=mapnik&marker=45.897%2C-74.912"
                            className="w-full h-full block"
                            title="Maison Favier"
                            loading="lazy"
                            style={{ filter: 'invert(88%) hue-rotate(180deg) saturate(0.55) brightness(0.85)' }}
                          />
                        </div>
                        <div className="mt-3 mb-6 text-center px-6">
                          <a
                            href="https://www.openstreetmap.org/?mlat=45.897&mlon=-74.912#map=14/45.897/-74.912"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-lato text-neutral-500 hover:text-[#d4af37] transition-colors"
                          >
                            {t('View on map', 'Voir sur la carte')} →
                          </a>
                        </div>
                      </ScrollFade>
                    </section>

                    {/* ── 10. CONTACT ──────────────────────────────────────────────── */}
                    <section className="relative py-24 text-center overflow-hidden">
                      <div className="absolute inset-0">
                        <img
                          src="https://storage.googleapis.com/salondesinconnus/inn/us%20copy.jpg"
                          alt=""
                          className="w-full h-full object-cover opacity-15"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]/60" />
                      </div>
                      <div className="relative z-10 px-6">
                        <SectionDivider />
                        <ScrollFade>
                          <h2 className="font-cinzel text-2xl text-white mb-4">{t('Questions?', 'Des Questions\u00a0?')}</h2>
                          <p className="text-neutral-500 font-lato text-sm mb-6">
                            {t('Between 10am and 7pm', 'Entre 10h et 19h')}
                          </p>
                          <div className="flex flex-col md:flex-row items-center justify-center gap-6 font-lato text-[#d4af37]">
                            <a href="tel:+15144183450" className="hover:text-white transition-colors">514 418 3450</a>
                            <span className="hidden md:block text-neutral-700">·</span>
                            <a href="mailto:Alex@lesalondesinconnus.com" className="hover:text-white transition-colors">Alex@lesalondesinconnus.com</a>
                          </div>
                        </ScrollFade>
                      </div>
                    </section>


                  </div>
                )}


              </div>
            </div>
          );
        })}
      </div>

            {/* ── Auth Modal ───────────────────────────────────────────────────── */}
      {showAuth && (
        <AuthModal
          language={language}
          onClose={() => { setShowAuth(false); setPendingTeamId(null); }}
          onAuthSuccess={handleAuthSuccess}
          onShowPrivacy={onShowPrivacy}
        />
      )}

      {/* ── Show Ticket Modal ────────────────────────────────────────────── */}
      {showBuyTicketModal && user && memberProfile && (
        <ShowTicketModal
          language={language}
          user={user}
          memberProfile={memberProfile}
          spotsLeft={showSpotsLeft}
          onClose={() => setShowBuyTicketModal(false)}
          onSuccess={() => setShowBuyTicketModal(false)}
        />
      )}

      {/* ── Registration Modal ───────────────────────────────────────────── */}
      {showRegistration && pendingTeamId && user && memberProfile && (
        <TeamRegistrationModal
          teamId={pendingTeamId}
          language={language}
          user={user}
          memberProfile={memberProfile}
          userRegistration={userRegistration}
          onClose={() => { setShowRegistration(false); setPendingTeamId(null); }}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* ── Room Registration Modal ──────────────────────────────────────── */}
      {showRoomRegistration && pendingRoomId && user && memberProfile && (
        <RoomRegistrationModal
          roomId={pendingRoomId}
          language={language}
          user={user}
          memberProfile={memberProfile}
          onClose={() => { setShowRoomRegistration(false); setPendingRoomId(null); }}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4af37; }

        @keyframes ceilidh-hero-in {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-line-1 { animation: ceilidh-hero-in 0.9s ease forwards; animation-delay: 0.1s; opacity: 0; }
        .hero-line-2 { animation: ceilidh-hero-in 0.9s ease forwards; animation-delay: 0.3s; opacity: 0; }
        .hero-line-3 { animation: ceilidh-hero-in 0.9s ease forwards; animation-delay: 0.5s; opacity: 0; }
        .hero-line-4 { animation: ceilidh-hero-in 0.9s ease forwards; animation-delay: 0.7s; opacity: 0; }
        .hero-img    { animation: hero-scale 18s ease-in-out infinite alternate; }
        @keyframes hero-scale {
          from { transform: scale(1); }
          to   { transform: scale(1.06); }
        }

        @keyframes gold-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.25); }
          50%       { box-shadow: 0 0 0 8px rgba(212,175,55,0); }
        }
        .btn-pulse { animation: gold-pulse 2.4s ease-in-out infinite; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #d4af37 0%, #f3e5ab 40%, #d4af37 60%, #a07820 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .section-divider-diamond {
          transition: transform 0.4s ease;
        }
        .section-divider-diamond:hover {
          transform: rotate(90deg) scale(1.3);
        }

        @keyframes details-beam-sweep {
          0%   { transform: translateX(-160%); opacity: 0; }
          8%   { opacity: 1; }
          35%  { transform: translateX(160%);  opacity: 0; }
          100% { transform: translateX(160%);  opacity: 0; }
        }
        .details-beam {
          animation: details-beam-sweep 25s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 1.2s;
        }
        .details-btn:hover .details-beam {
          animation-duration: 7s;
        }
      `}</style>
    </div>
  );
};
