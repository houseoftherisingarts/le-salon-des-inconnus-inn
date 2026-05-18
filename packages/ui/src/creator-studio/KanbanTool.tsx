import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getApp } from 'firebase/app';
import {
    getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot,
    serverTimestamp, type Firestore,
} from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskStatus = 'BACKLOG' | 'TODO' | 'DOING' | 'STUCK' | 'WAITING' | 'DONE';
type BasketType = 'CREATIVE' | 'PERSONAL' | 'WORK' | 'SERVICE';
type ViewType = 'STUDIO' | 'RESPONSIBILITIES' | 'NOISE';
type ViewMode = 'BOARD' | 'CALENDAR';
type GoalPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'T1' | 'T2' | 'T3' | 'YEAR';

interface Subtask { id: string; title: string; completed: boolean; }
interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    basket: BasketType;
    isUrgent: boolean;
    isImportant: boolean;
    createdAt: number;
    deadline?: number;
    subtasks: Subtask[];
}

interface BoardDoc {
    id: string;
    name: string;
    tasks: Task[];
    goals: Record<GoalPeriod, string>;
    isDefault?: boolean;
    createdAt?: any;
    updatedAt?: any;
}

interface KanbanToolProps {
    onClose?: () => void;
    themeStyles: any;
    /** Owner uid — required to enable Firestore persistence + multi-board. */
    uid: string | null;
    /** Active studio language. Drives every visible string. */
    language: 'EN' | 'FR';
    /** Member tier — unlocks free extra boards from the first paid tier up. */
    membershipTier: string;
    /** Spendable coins — used for the 50-coin extra-board unlock. */
    coins: number;
    /** Callback that deducts coins from the spendable balance. Returns
     *  true on success, false on insufficient funds. */
    spendCoins: (amount: number) => Promise<boolean>;
    /** Theme-aware form chrome bundle (container/input/label/submitOn…). */
    formStyles: {
        container: string; input: string; label: string;
        submitOn: string; submitOff: string;
        chipActive: string; chipInactive: string; accentText: string;
    };
    /** Theme-aware page-title class — neon italic on RAINBOW, cinzel on the rest. */
    pageTitleClass: string;
}

// ─── Economy ────────────────────────────────────────────────────────────────
const NEW_BOARD_COIN_COST = 50;
// Tiers that get an unlimited supply of free extra boards. The first one
// listed is the "first paid tier" the user mentioned in spec.
const TIERS_WITH_FREE_EXTRA_BOARDS = new Set(['NOVICE', 'ARTISAN', 'MAESTRO']);

// ─── Static data (bilingual) ────────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; en: string; fr: string; accent: string; limit?: number }[] = [
    { id: 'BACKLOG', en: 'The Void',     fr: 'Le Vide',         accent: 'from-neutral-700 to-neutral-900' },
    { id: 'TODO',    en: 'Sketching',    fr: 'Esquisse',         accent: 'from-blue-500 to-blue-900',     limit: 4 },
    { id: 'DOING',   en: 'Flow',         fr: 'Flow',             accent: 'from-fuchsia-500 to-purple-900', limit: 3 },
    { id: 'STUCK',   en: 'Stuck',        fr: 'Bloqué',           accent: 'from-red-500 to-red-900' },
    { id: 'WAITING', en: 'Waiting',      fr: 'En attente',       accent: 'from-amber-500 to-amber-900' },
    { id: 'DONE',    en: 'Masterpiece',  fr: 'Chef-d\'œuvre',    accent: 'from-emerald-500 to-emerald-900' },
];

const COLUMN_KICKERS: Record<TaskStatus, { en: string; fr: string }> = {
    BACKLOG: { en: 'Ideas',                fr: 'Idées' },
    TODO:    { en: 'To do today',          fr: "Aujourd'hui" },
    DOING:   { en: 'In flow',              fr: 'En flow' },
    STUCK:   { en: 'Blocked',              fr: 'Bloqué' },
    WAITING: { en: 'External wait',        fr: 'Attente externe' },
    DONE:    { en: 'Done',                 fr: 'Terminé' },
};

const BASKETS: { id: BasketType; en: string; fr: string; dot: string; chip: string; iconPath: string }[] = [
    { id: 'CREATIVE', en: 'Creative', fr: 'Créatif', dot: 'bg-fuchsia-400', chip: 'border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-100',
      iconPath: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245M9.53 16.122a16 16 0 003.388-1.62m-5.043-.025a16 16 0 011.622-3.395m3.42 3.42a16 16 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a16 16 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42' },
    { id: 'PERSONAL', en: 'Personal', fr: 'Personnel', dot: 'bg-emerald-400', chip: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
      iconPath: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A18 18 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z' },
    { id: 'WORK',     en: 'Work', fr: 'Travail', dot: 'bg-blue-400', chip: 'border-blue-400/50 bg-blue-500/10 text-blue-100',
      iconPath: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48 48 0 00-3.413-.387M3.75 14.15a2.18 2.18 0 01-.75-1.661V8.706c0-1.081.768-2.015 1.837-2.175a48 48 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894' },
    { id: 'SERVICE',  en: 'Service', fr: 'Service', dot: 'bg-orange-400', chip: 'border-orange-400/50 bg-orange-500/10 text-orange-100',
      iconPath: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.25 11.25a3.75 3.75 0 117.5 0v1.5h-7.5v-1.5z' },
];

const PERIODS: GoalPeriod[] = ['DAY', 'WEEK', 'MONTH', 'T1', 'T2', 'T3', 'YEAR'];
const periodLabel = (p: GoalPeriod, language: 'EN' | 'FR'): string => {
    const en: Record<GoalPeriod, string> = {
        DAY: 'Today', WEEK: 'This Week', MONTH: 'This Month',
        T1: 'Q1', T2: 'Q2', T3: 'Q3', YEAR: 'This Year',
    };
    const fr: Record<GoalPeriod, string> = {
        DAY: "Aujourd'hui", WEEK: 'Cette semaine', MONTH: 'Ce mois',
        T1: 'T1', T2: 'T2', T3: 'T3', YEAR: 'Cette année',
    };
    return language === 'FR' ? fr[p] : en[p];
};

const EMPTY_GOALS: Record<GoalPeriod, string> = { DAY: '', WEEK: '', MONTH: '', T1: '', T2: '', T3: '', YEAR: '' };

// ─── Firebase helper ────────────────────────────────────────────────────────
function studioDb(): Firestore | null {
    try { return getFirestore(getApp()); } catch { return null; }
}

// Tiny inline glyph for buttons that read better with a vector mark than
// emoji. 24-vbox, 1.6-stroke to match the rest of the studio chrome.
const Glyph: React.FC<{ d: string; size?: number; className?: string }> = ({ d, size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d={d} />
    </svg>
);

// ─── Component ──────────────────────────────────────────────────────────────
export const KanbanTool: React.FC<KanbanToolProps> = ({
    onClose, themeStyles, uid, language, membershipTier,
    coins, spendCoins, formStyles, pageTitleClass,
}) => {
    const t = useCallback((en: string, fr: string) => (language === 'FR' ? fr : en), [language]);

    // ─── Multi-board state ──────────────────────────────────────────────────
    // All of the user's boards, hydrated live from Firestore. Tasks/goals
    // live on the active board doc. When `uid` is null we fall back to a
    // single ephemeral local board so the tool still works for visitors.
    const [boards, setBoards] = useState<BoardDoc[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('kanbanActiveBoardId');
    });
    const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
    const [creatingBoard, setCreatingBoard] = useState(false);
    const [renamingBoard, setRenamingBoard] = useState(false);
    const [renameDraft, setRenameDraft] = useState('');

    // Persist active board choice locally.
    useEffect(() => {
        if (typeof window !== 'undefined' && activeBoardId) {
            localStorage.setItem('kanbanActiveBoardId', activeBoardId);
        }
    }, [activeBoardId]);

    // Live subscription to all of this user's boards. The default board is
    // auto-created on first hydration if none exist.
    useEffect(() => {
        if (!uid) {
            // No-uid fallback: a single ephemeral board with seed tasks so
            // the visual demo isn't empty.
            setBoards([{
                id: 'local',
                name: t('My Board', 'Mon Tableau'),
                isDefault: true,
                tasks: [
                    { id: '1', title: t('Finish oil painting series', 'Finir la série de peintures à l\'huile'), status: 'DOING', basket: 'CREATIVE', isUrgent: true, isImportant: true, createdAt: Date.now(), deadline: Date.now() + 86400000 * 2, subtasks: [] },
                    { id: '2', title: t('Pay studio rent', 'Payer le loyer du studio'), status: 'TODO', basket: 'PERSONAL', isUrgent: true, isImportant: true, createdAt: Date.now(), deadline: Date.now() - 86400000, subtasks: [] },
                ],
                goals: { ...EMPTY_GOALS },
            }]);
            setActiveBoardId('local');
            return;
        }
        const db = studioDb(); if (!db) return;
        const unsub = onSnapshot(
            collection(db, 'members', uid, 'kanban'),
            async (snap) => {
                const list: BoardDoc[] = [];
                snap.forEach(d => {
                    // Skip the legacy 'flags' doc that lives in this subcoll.
                    if (d.id === 'flags') return;
                    const data = d.data() as any;
                    list.push({
                        id: d.id,
                        name: data.name ?? t('Untitled board', 'Tableau sans titre'),
                        tasks: Array.isArray(data.tasks) ? data.tasks : [],
                        goals: { ...EMPTY_GOALS, ...(data.goals ?? {}) },
                        isDefault: !!data.isDefault,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                    });
                });
                // Ensure exactly one default board exists. If the collection
                // is empty, auto-create one — this is the user's "free" board.
                if (list.length === 0) {
                    const seedId = 'default';
                    const seedDoc: BoardDoc = {
                        id: seedId,
                        name: t('My Board', 'Mon Tableau'),
                        isDefault: true,
                        tasks: [],
                        goals: { ...EMPTY_GOALS },
                    };
                    try {
                        await setDoc(
                            doc(db, 'members', uid, 'kanban', seedId),
                            { name: seedDoc.name, isDefault: true, tasks: [], goals: EMPTY_GOALS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
                        );
                    } catch { /* swallow — next snapshot will pick it up */ }
                    list.push(seedDoc);
                }
                // Stable order: default first, then by createdAt asc.
                list.sort((a, b) => {
                    if (a.isDefault && !b.isDefault) return -1;
                    if (!a.isDefault && b.isDefault) return 1;
                    return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
                });
                setBoards(list);
                // If active board was removed or never set, pick the default.
                setActiveBoardId(prev => {
                    if (prev && list.some(b => b.id === prev)) return prev;
                    return list[0]?.id ?? null;
                });
            },
            () => { /* swallow — empty list handles it */ },
        );
        return () => unsub();
    }, [uid, language, t]);

    const activeBoard: BoardDoc | undefined = useMemo(
        () => boards.find(b => b.id === activeBoardId) ?? boards[0],
        [boards, activeBoardId],
    );

    /** Persist a partial patch to the active board. No-op when ephemeral. */
    const writeBoard = useCallback(async (patch: Partial<BoardDoc>) => {
        if (!uid || !activeBoard || activeBoard.id === 'local') return;
        const db = studioDb(); if (!db) return;
        try {
            await setDoc(
                doc(db, 'members', uid, 'kanban', activeBoard.id),
                { ...patch, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch { /* swallow — local optimistic state is the source of truth */ }
    }, [uid, activeBoard]);

    /** Patch active board locally + persist. */
    const patchActiveBoard = useCallback((patch: Partial<BoardDoc>) => {
        setBoards(prev => prev.map(b => b.id === activeBoard?.id ? { ...b, ...patch } : b));
        void writeBoard(patch);
    }, [activeBoard, writeBoard]);

    // ─── Board CRUD ────────────────────────────────────────────────────────
    const tierGrantsFreeBoards = TIERS_WITH_FREE_EXTRA_BOARDS.has(membershipTier);
    const canCreateBoardFree = boards.length === 0 || tierGrantsFreeBoards;
    const canAffordPaidBoard = coins >= NEW_BOARD_COIN_COST;

    const createBoard = useCallback(async (paid: boolean) => {
        if (!uid || creatingBoard) return;
        const db = studioDb(); if (!db) return;
        if (paid) {
            const ok = await spendCoins(NEW_BOARD_COIN_COST);
            if (!ok) return;
        }
        setCreatingBoard(true);
        try {
            const id = `board-${Date.now()}`;
            const name = t(`Board ${boards.length + 1}`, `Tableau ${boards.length + 1}`);
            await setDoc(
                doc(db, 'members', uid, 'kanban', id),
                {
                    name, isDefault: false, tasks: [], goals: EMPTY_GOALS,
                    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                },
            );
            setActiveBoardId(id);
            setShowBoardSwitcher(false);
        } finally {
            setCreatingBoard(false);
        }
    }, [uid, boards.length, t, creatingBoard, spendCoins]);

    const deleteBoardConfirmed = useCallback(async (boardId: string) => {
        if (!uid) return;
        const target = boards.find(b => b.id === boardId);
        if (!target || target.isDefault) return; // never delete the default board
        const db = studioDb(); if (!db) return;
        const ok = confirm(t(
            `Delete "${target.name}" and all its tasks? This cannot be undone.`,
            `Supprimer « ${target.name} » et toutes ses tâches ? Action irréversible.`,
        ));
        if (!ok) return;
        try {
            await deleteDoc(doc(db, 'members', uid, 'kanban', boardId));
            if (activeBoardId === boardId) {
                setActiveBoardId(boards.find(b => b.id !== boardId)?.id ?? null);
            }
        } catch { /* swallow */ }
    }, [uid, boards, activeBoardId, t]);

    const renameActiveBoard = useCallback(async () => {
        if (!activeBoard) return;
        const next = renameDraft.trim();
        if (!next || next === activeBoard.name) {
            setRenamingBoard(false);
            return;
        }
        patchActiveBoard({ name: next });
        setRenamingBoard(false);
    }, [activeBoard, renameDraft, patchActiveBoard]);

    // ─── UI state ──────────────────────────────────────────────────────────
    const [activeView, setActiveView] = useState<ViewType>('STUDIO');
    const [viewMode, setViewMode] = useState<ViewMode>('BOARD');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
    const [currentGoalPeriod, setCurrentGoalPeriod] = useState<GoalPeriod>('DAY');
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date());

    // New-task form state
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newBasket, setNewBasket] = useState<BasketType>('CREATIVE');
    const [newIsUrgent, setNewIsUrgent] = useState(false);
    const [newIsImportant, setNewIsImportant] = useState(false);
    const [newDeadline, setNewDeadline] = useState('');

    // Subtask draft state
    const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    // Closing the board switcher on outside click.
    const switcherRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!showBoardSwitcher) return;
        const onClick = (e: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
                setShowBoardSwitcher(false);
            }
        };
        window.addEventListener('mousedown', onClick);
        return () => window.removeEventListener('mousedown', onClick);
    }, [showBoardSwitcher]);

    // ─── Task mutations (operate on active board) ──────────────────────────
    const tasks = activeBoard?.tasks ?? [];
    const goals = activeBoard?.goals ?? EMPTY_GOALS;

    const replaceTasks = (next: Task[]) => patchActiveBoard({ tasks: next });
    const replaceGoals = (next: Record<GoalPeriod, string>) => patchActiveBoard({ goals: next });

    const addTask = () => {
        if (!newTaskTitle.trim()) return;
        const deadlineTimestamp = newDeadline ? new Date(newDeadline + 'T23:59:59').getTime() : undefined;
        const newTask: Task = {
            id: Date.now().toString(),
            title: newTaskTitle,
            status: 'BACKLOG',
            basket: newBasket,
            isUrgent: newIsUrgent,
            isImportant: newIsImportant,
            createdAt: Date.now(),
            deadline: deadlineTimestamp,
            subtasks: [],
        };
        replaceTasks([...tasks, newTask]);
        setNewTaskTitle('');
        setNewBasket('CREATIVE');
        setNewIsUrgent(false);
        setNewIsImportant(false);
        setNewDeadline('');
        setIsModalOpen(false);
    };

    const deleteTask = (taskId: string) => {
        replaceTasks(tasks.filter(x => x.id !== taskId));
    };

    const addSubtask = (taskId: string) => {
        if (!newSubtaskTitle.trim()) return;
        replaceTasks(tasks.map(x => x.id === taskId
            ? { ...x, subtasks: [...x.subtasks, { id: Date.now().toString(), title: newSubtaskTitle, completed: false }] }
            : x));
        setNewSubtaskTitle('');
        setAddingSubtaskTo(null);
    };
    const toggleSubtask = (taskId: string, subtaskId: string) => {
        replaceTasks(tasks.map(x => x.id === taskId
            ? { ...x, subtasks: x.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) }
            : x));
    };
    const deleteSubtask = (taskId: string, subtaskId: string) => {
        replaceTasks(tasks.map(x => x.id === taskId
            ? { ...x, subtasks: x.subtasks.filter(s => s.id !== subtaskId) }
            : x));
    };

    const cyclePeriod = (direction: 'prev' | 'next') => {
        const idx = PERIODS.indexOf(currentGoalPeriod);
        let next = direction === 'next' ? idx + 1 : idx - 1;
        if (next >= PERIODS.length) next = 0;
        if (next < 0) next = PERIODS.length - 1;
        setCurrentGoalPeriod(PERIODS[next]);
        setIsEditingGoal(false);
    };

    const changeMonth = (offset: number) => {
        const next = new Date(calendarDate);
        next.setMonth(next.getMonth() + offset);
        setCalendarDate(next);
    };

    // ─── Drag & drop ──────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedTaskId(taskId);
    };
    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(status);
    };
    const handleDragLeave = (status: TaskStatus) => {
        setDragOverColumn(prev => prev === status ? null : prev);
    };
    const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        setDraggedTaskId(null);
        setDragOverColumn(null);
        if (!taskId) return;
        replaceTasks(tasks.map(x => x.id === taskId ? { ...x, status: targetStatus } : x));
    };
    const moveTaskManual = (taskId: string, direction: 'left' | 'right') => {
        const order: TaskStatus[] = ['BACKLOG', 'TODO', 'DOING', 'STUCK', 'WAITING', 'DONE'];
        replaceTasks(tasks.map(x => {
            if (x.id !== taskId) return x;
            const i = order.indexOf(x.status);
            const next = direction === 'right' ? i + 1 : i - 1;
            if (next < 0 || next >= order.length) return x;
            return { ...x, status: order[next] };
        }));
    };

    // ─── Filtering + computed bits ────────────────────────────────────────
    const filteredTasks = useMemo(() => tasks.filter(task => {
        if (activeView === 'STUDIO') return task.basket === 'CREATIVE';
        if (activeView === 'RESPONSIBILITIES') return task.basket !== 'CREATIVE' && (task.isImportant || task.isUrgent);
        return task.basket !== 'CREATIVE' && !task.isImportant && !task.isUrgent;
    }), [tasks, activeView]);

    const getPriorityLabel = (u: boolean, i: boolean): { en: string; fr: string; tone: string } => {
        if (u && i) return { en: 'DO NOW', fr: 'FAIRE',     tone: 'text-red-400' };
        if (!u && i) return { en: 'SCHEDULE', fr: 'PLANIFIER', tone: 'text-blue-300' };
        if (u && !i) return { en: 'DELEGATE', fr: 'DÉLÉGUER',  tone: 'text-orange-300' };
        return         { en: 'DROP',     fr: 'JETER',     tone: 'text-neutral-500' };
    };

    const getDeadlineDisplay = (timestamp?: number) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
        const dateString = date.toLocaleDateString(language === 'FR' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
        if (diffDays < 0) return { text: t('Overdue', 'En retard') + ` · ${dateString}`, tone: 'text-red-400 border-red-400/40 bg-red-500/10', glyph: 'M12 9v3.75m0 4.5h.008v.008H12v-.008zM12 3a9 9 0 100 18 9 9 0 000-18z' };
        if (diffDays === 0) return { text: t('Today', "Aujourd'hui"), tone: 'text-orange-300 border-orange-400/40 bg-orange-500/10', glyph: 'M12 8v4l3 3M12 21a9 9 0 100-18 9 9 0 000 18z' };
        if (diffDays <= 3) return { text: dateString, tone: 'text-amber-200 border-amber-400/30 bg-amber-500/10', glyph: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75' };
        return { text: dateString, tone: 'text-neutral-400 border-white/10 bg-white/5', glyph: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75' };
    };

    // ─── Render: calendar view ─────────────────────────────────────────────
    const renderCalendar = () => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const days: React.ReactNode[] = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[100px] border border-white/5 bg-black/30" />);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const ts = new Date(year, month, d).setHours(0, 0, 0, 0);
            const dayTasks = filteredTasks.filter(x => x.deadline && new Date(x.deadline).setHours(0,0,0,0) === ts);
            const isToday = new Date().setHours(0,0,0,0) === ts;
            days.push(
                <div key={d} className={`min-h-[120px] border border-white/10 p-2 relative ${isToday ? 'bg-white/5' : 'bg-[#0e0e0e]'} hover:bg-white/[0.07] transition-colors`}>
                    <span className={`text-xs font-bold tabular-nums ${isToday ? formStyles.accentText : 'text-neutral-500'}`}>{d}</span>
                    <div className="mt-2 space-y-1">
                        {dayTasks.map(task => {
                            const basket = BASKETS.find(b => b.id === task.basket);
                            return (
                                <div key={task.id} className={`text-[9px] px-1.5 py-0.5 rounded border-l-2 truncate cursor-default ${basket?.dot.replace('bg-', 'border-')} bg-white/5 text-neutral-200`}>
                                    {task.title}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        const monthLabel = calendarDate.toLocaleDateString(language === 'FR' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
        const weekdays = language === 'FR'
            ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="flex-1 overflow-y-auto p-6 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl ${pageTitleClass}`} style={{ textTransform: 'capitalize' }}>{monthLabel}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => changeMonth(-1)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-neutral-300 transition-colors">←</button>
                        <button onClick={() => setCalendarDate(new Date())} className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded border transition-colors ${formStyles.chipInactive}`}>
                            {t('Today', "Aujourd'hui")}
                        </button>
                        <button onClick={() => changeMonth(1)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-neutral-300 transition-colors">→</button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-px border border-white/10 bg-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {weekdays.map(day => (
                        <div key={day} className="bg-[#1a1a1a] py-3 text-center text-xs font-cinzel text-neutral-400 uppercase tracking-widest">{day}</div>
                    ))}
                    {days}
                </div>
            </div>
        );
    };

    if (!activeBoard) {
        return (
            <div className={`w-full h-full ${formStyles.container} flex items-center justify-center`}>
                <p className="text-neutral-500 text-sm font-cinzel uppercase tracking-widest animate-pulse">
                    {t('Loading board…', 'Chargement du tableau…')}
                </p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full relative flex flex-col overflow-hidden animate-fadeIn shadow-2xl ${formStyles.container}`}>

            {/* ─── HEADER ─────────────────────────────────────────────── */}
            <header className="flex flex-col border-b border-white/10 bg-black/40 backdrop-blur-md z-20">

                {/* Top bar: board switcher + view filter + view mode + actions */}
                <div className="px-5 py-4 flex flex-wrap items-center gap-4">
                    {/* Board switcher chip */}
                    <div className="relative" ref={switcherRef}>
                        <button
                            type="button"
                            onClick={() => setShowBoardSwitcher(s => !s)}
                            className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border transition-all ${showBoardSwitcher ? 'border-white/40 bg-white/10' : 'border-white/15 bg-black/40 hover:border-white/30 hover:bg-white/5'}`}
                        >
                            <span className="font-cinzel text-xs uppercase tracking-[0.25em] text-white truncate max-w-[180px]">
                                {renamingBoard ? '' : activeBoard.name}
                            </span>
                            <Glyph d="M19.5 8.25l-7.5 7.5-7.5-7.5" size={14} className="text-neutral-400" />
                        </button>
                        {/* Dropdown */}
                        {showBoardSwitcher && (
                            <div className={`absolute top-full left-0 mt-2 w-72 rounded-lg border border-white/15 bg-[#0a0a0a] shadow-2xl z-40 overflow-hidden animate-fadeIn`}>
                                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                                    <span className="text-[9px] font-cinzel uppercase tracking-[0.4em] text-neutral-500">
                                        {t('Boards', 'Tableaux')}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 tabular-nums font-mono">
                                        {boards.length}
                                    </span>
                                </div>
                                <ul className="py-1 max-h-72 overflow-y-auto">
                                    {boards.map(b => (
                                        <li key={b.id}>
                                            <button
                                                type="button"
                                                onClick={() => { setActiveBoardId(b.id); setShowBoardSwitcher(false); }}
                                                className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${b.id === activeBoardId ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${b.id === activeBoardId ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-neutral-600'}`} />
                                                <span className="flex-1 min-w-0 text-sm text-white truncate font-cinzel">{b.name}</span>
                                                {b.isDefault && <span className="text-[9px] uppercase tracking-widest text-[#c5a059]">{t('default', 'défaut')}</span>}
                                                {!b.isDefault && b.id === activeBoardId && (
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => { e.stopPropagation(); deleteBoardConfirmed(b.id); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteBoardConfirmed(b.id); } }}
                                                        className="text-rose-400 hover:text-rose-200 text-xs px-1 cursor-pointer"
                                                        title={t('Delete board', 'Supprimer le tableau')}
                                                    >
                                                        ✕
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {/* New board CTA */}
                                <div className="border-t border-white/10 p-2">
                                    {!uid ? (
                                        <p className="text-[10px] text-neutral-500 px-2 py-1.5 italic">
                                            {t('Sign in to save your board.', 'Connecte-toi pour sauvegarder.')}
                                        </p>
                                    ) : canCreateBoardFree ? (
                                        <button
                                            type="button"
                                            onClick={() => createBoard(false)}
                                            disabled={creatingBoard}
                                            className="w-full px-3 py-2.5 text-left flex items-center gap-2 text-[11px] font-cinzel uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/10 rounded transition-colors"
                                        >
                                            <Glyph d="M12 4.5v15m7.5-7.5h-15" size={14} />
                                            {tierGrantsFreeBoards
                                                ? t('New board (free · your tier)', 'Nouveau tableau (gratuit · ton palier)')
                                                : t('New board (free first)', 'Nouveau tableau (premier gratuit)')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => createBoard(true)}
                                            disabled={creatingBoard || !canAffordPaidBoard}
                                            title={!canAffordPaidBoard ? t(`You need ${NEW_BOARD_COIN_COST} coins.`, `Il faut ${NEW_BOARD_COIN_COST} pièces.`) : ''}
                                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2 text-[11px] font-cinzel uppercase tracking-widest rounded transition-colors ${canAffordPaidBoard ? 'text-amber-100 hover:bg-amber-500/10' : 'text-neutral-600 cursor-not-allowed'}`}
                                        >
                                            <Glyph d="M12 4.5v15m7.5-7.5h-15" size={14} />
                                            <span className="flex-1">{t('Unlock new board', 'Débloquer un tableau')}</span>
                                            <span className={`tabular-nums text-[11px] ${canAffordPaidBoard ? 'text-amber-200' : 'text-neutral-600'}`}>
                                                {NEW_BOARD_COIN_COST}{t(' coins', ' pièces')}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Inline rename of the active board */}
                    {renamingBoard ? (
                        <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={renameActiveBoard}
                            onKeyDown={(e) => { if (e.key === 'Enter') renameActiveBoard(); if (e.key === 'Escape') setRenamingBoard(false); }}
                            className={`w-44 px-2 py-1 text-xs font-cinzel uppercase tracking-widest ${formStyles.input}`}
                        />
                    ) : (
                        uid && (
                            <button
                                type="button"
                                onClick={() => { setRenameDraft(activeBoard.name); setRenamingBoard(true); }}
                                title={t('Rename board', 'Renommer')}
                                className="text-[10px] text-neutral-500 hover:text-white transition-colors"
                            >
                                <Glyph d="M16.86 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.86 4.487zM19.5 7.125l-3.75-3.75" size={14} />
                            </button>
                        )
                    )}

                    {/* View filter chips */}
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 ml-auto">
                        {(['STUDIO', 'RESPONSIBILITIES', 'NOISE'] as ViewType[]).map(v => {
                            const active = activeView === v;
                            const labels: Record<ViewType, { en: string; fr: string }> = {
                                STUDIO: { en: 'Studio', fr: 'Atelier' },
                                RESPONSIBILITIES: { en: 'Responsibilities', fr: 'Responsabilités' },
                                NOISE: { en: 'Noise', fr: 'Bruit' },
                            };
                            return (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setActiveView(v)}
                                    aria-pressed={active}
                                    className={`px-3 py-1.5 text-[11px] font-cinzel uppercase tracking-[0.2em] rounded transition-all ${active ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    {language === 'FR' ? labels[v].fr : labels[v].en}
                                </button>
                            );
                        })}
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                        <button
                            type="button"
                            onClick={() => setViewMode('BOARD')}
                            aria-pressed={viewMode === 'BOARD'}
                            className={`p-2 rounded transition-all ${viewMode === 'BOARD' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'}`}
                            title={t('Board view', 'Vue tableau')}
                        >
                            <Glyph d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('CALENDAR')}
                            aria-pressed={viewMode === 'CALENDAR'}
                            className={`p-2 rounded transition-all ${viewMode === 'CALENDAR' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'}`}
                            title={t('Calendar view', 'Vue calendrier')}
                        >
                            <Glyph d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" size={16} />
                        </button>
                    </div>

                    {/* Methodology + add task + close */}
                    <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        className="text-[10px] uppercase font-cinzel tracking-widest text-neutral-500 hover:text-white transition-colors"
                    >
                        {t('Method', 'Méthode')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className={`flex items-center gap-2 px-4 py-2 text-[11px] font-cinzel uppercase tracking-widest rounded transition-all ${formStyles.submitOn}`}
                    >
                        <Glyph d="M12 4.5v15m7.5-7.5h-15" size={14} />
                        <span>{t('Add task', 'Ajouter')}</span>
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('Close', 'Fermer')}
                            className="w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Goal bar — slimmer, less visually heavy */}
                <div className="px-5 py-3 border-t border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => cyclePeriod('prev')} className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 hover:border-white/40 text-neutral-400 hover:text-white transition-colors text-xs">‹</button>
                        <span className={`text-[10px] font-cinzel uppercase tracking-[0.3em] min-w-[100px] text-center ${formStyles.accentText}`}>
                            {periodLabel(currentGoalPeriod, language)}
                        </span>
                        <button onClick={() => cyclePeriod('next')} className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 hover:border-white/40 text-neutral-400 hover:text-white transition-colors text-xs">›</button>
                    </div>
                    <div className="flex-1 min-w-0">
                        {isEditingGoal ? (
                            <input
                                autoFocus
                                value={goals[currentGoalPeriod]}
                                onChange={(e) => replaceGoals({ ...goals, [currentGoalPeriod]: e.target.value })}
                                onBlur={() => setIsEditingGoal(false)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingGoal(false); }}
                                placeholder={t('Define your purpose…', 'Définis ton intention…')}
                                className={`w-full px-3 py-1.5 text-base font-cinzel ${formStyles.input}`}
                            />
                        ) : (
                            <button
                                onClick={() => setIsEditingGoal(true)}
                                className="w-full text-left text-base font-cinzel text-white hover:text-[#c5a059] transition-colors py-1.5 truncate"
                            >
                                {goals[currentGoalPeriod] || (
                                    <span className="text-white/30 italic font-lato text-sm">
                                        {t('Click to define a goal for this period…', 'Clique pour définir une intention…')}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                    {coins > 0 && uid && (
                        <span className="text-[10px] font-mono text-neutral-500 tabular-nums hidden md:inline-flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#c5a059]" />
                            {coins} {t('coins', 'pièces')}
                        </span>
                    )}
                </div>

                {/* Decorative accent strip — colour follows the active filter */}
                <div className={`h-px w-full transition-colors duration-500 ${
                    activeView === 'STUDIO' ? 'bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent' :
                    activeView === 'RESPONSIBILITIES' ? 'bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent' :
                    'bg-gradient-to-r from-transparent via-neutral-500/40 to-transparent'
                }`} />
            </header>

            {/* ─── MAIN ─────────────────────────────────────────────── */}
            {viewMode === 'CALENDAR' ? renderCalendar() : (
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 relative">
                    <div className="flex gap-4 h-full min-w-[1400px] relative">
                        {COLUMNS.map(col => {
                            const columnTasks = filteredTasks.filter(x => x.status === col.id);
                            const isOverLimit = !!(col.limit && columnTasks.length > col.limit);
                            const isDragOver = dragOverColumn === col.id;
                            return (
                                <div
                                    key={col.id}
                                    onDragOver={(e) => handleDragOver(e, col.id)}
                                    onDragLeave={() => handleDragLeave(col.id)}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                    className={`flex-1 min-w-[260px] flex flex-col rounded-xl border bg-black/40 backdrop-blur-sm overflow-hidden transition-all duration-200 ${
                                        isDragOver ? 'border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.12)] scale-[1.005]' :
                                        isOverLimit ? 'border-red-500/40' : 'border-white/10'
                                    }`}
                                >
                                    {/* Column header */}
                                    <div className="relative px-4 pt-4 pb-3">
                                        <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${col.accent}`} />
                                        <div className="flex items-baseline justify-between mb-1">
                                            <div>
                                                <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-neutral-500 mb-0.5">
                                                    {language === 'FR' ? COLUMN_KICKERS[col.id].fr : COLUMN_KICKERS[col.id].en}
                                                </p>
                                                <h3 className="font-cinzel text-sm text-white uppercase tracking-[0.2em]">
                                                    {language === 'FR' ? col.fr : col.en}
                                                </h3>
                                            </div>
                                            <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded ${isOverLimit ? 'bg-red-500/30 text-red-100 border border-red-400/40' : 'bg-white/8 text-neutral-300 border border-white/10'}`}>
                                                {columnTasks.length}{col.limit ? ` / ${col.limit}` : ''}
                                            </span>
                                        </div>
                                        {isOverLimit && (
                                            <p className="text-[10px] text-red-300 mt-1 font-cinzel uppercase tracking-widest">
                                                ⚠ {t('Over capacity — finish before starting more', 'Trop chargé — termine avant de commencer')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Task list */}
                                    <div className={`flex-1 overflow-y-auto px-3 pb-3 space-y-2 custom-scrollbar transition-colors duration-200 ${isDragOver ? 'bg-white/[0.03]' : ''}`}>
                                        {columnTasks.map((task, idx) => {
                                            const basket = BASKETS.find(b => b.id === task.basket);
                                            const priority = getPriorityLabel(task.isUrgent, task.isImportant);
                                            const deadline = getDeadlineDisplay(task.deadline);
                                            const completedSubs = task.subtasks.filter(s => s.completed).length;
                                            const totalSubs = task.subtasks.length;
                                            return (
                                                <article
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                    style={{ animationDelay: `${idx * 30}ms` }}
                                                    className={`kanban-card group relative bg-[#161616] rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                                        draggedTaskId === task.id
                                                            ? 'opacity-40 border-white/40 scale-[0.98] rotate-[-1deg]'
                                                            : 'border-white/8 hover:border-white/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:-translate-y-0.5'
                                                    }`}
                                                >
                                                    {/* Basket accent strip */}
                                                    <div className={`h-0.5 ${basket?.dot ?? 'bg-white'}`} />

                                                    <div className="p-3">
                                                        {/* Tags row */}
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className={`inline-flex items-center gap-1 text-[9px] uppercase font-cinzel tracking-widest px-1.5 py-0.5 rounded border ${basket?.chip ?? ''}`}>
                                                                <Glyph d={basket?.iconPath ?? ''} size={10} />
                                                                {basket && (language === 'FR' ? basket.fr : basket.en)}
                                                            </span>
                                                            <div className="flex gap-1 ml-auto">
                                                                {task.isUrgent && (
                                                                    <span title={t('Urgent', 'Urgent')} className="text-red-400">
                                                                        <Glyph d="M14 2v6h6M6 2h8l6 6v14H6z M9 13h6 M9 17h6 M9 9h2" size={11} />
                                                                    </span>
                                                                )}
                                                                {task.isImportant && (
                                                                    <span title={t('Important', 'Important')} className="text-amber-300">
                                                                        <Glyph d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.39a.56.56 0 01-.84.6l-4.72-2.88a.56.56 0 00-.59 0L6.98 20.54a.56.56 0 01-.84-.6l1.29-5.39a.56.56 0 00-.18-.56L3.04 10.4a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.47-.35L11.48 3.5z" size={11} />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Title */}
                                                        <p className="text-sm text-white font-lato leading-snug mb-2.5">
                                                            {task.title}
                                                        </p>

                                                        {/* Subtasks summary + add affordance */}
                                                        {(totalSubs > 0 || addingSubtaskTo === task.id) && (
                                                            <div className="border-t border-white/5 pt-2 mb-2">
                                                                {totalSubs > 0 && (
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-[width] duration-500" style={{ width: `${(completedSubs / totalSubs) * 100}%` }} />
                                                                        </div>
                                                                        <span className="text-[9px] text-neutral-500 tabular-nums font-mono">{completedSubs}/{totalSubs}</span>
                                                                    </div>
                                                                )}
                                                                <ul className="space-y-1">
                                                                    {task.subtasks.map(sub => (
                                                                        <li key={sub.id} className="flex items-center gap-2 group/sub">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={sub.completed}
                                                                                onChange={() => toggleSubtask(task.id, sub.id)}
                                                                                className="w-3 h-3 rounded-sm border-white/20 bg-black/50 accent-emerald-400"
                                                                            />
                                                                            <span className={`text-[10px] font-lato flex-1 ${sub.completed ? 'text-neutral-600 line-through' : 'text-neutral-300'}`}>
                                                                                {sub.title}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => deleteSubtask(task.id, sub.id)}
                                                                                className="text-rose-400 opacity-0 group-hover/sub:opacity-100 text-[10px] transition-opacity"
                                                                            >✕</button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                {addingSubtaskTo === task.id && (
                                                                    <div className="mt-1.5 flex gap-1">
                                                                        <input
                                                                            type="text"
                                                                            autoFocus
                                                                            placeholder={t('Subtask…', 'Sous-tâche…')}
                                                                            value={newSubtaskTitle}
                                                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                                            onKeyDown={(e) => e.key === 'Enter' && addSubtask(task.id)}
                                                                            className={`flex-1 px-2 py-0.5 text-[10px] ${formStyles.input}`}
                                                                        />
                                                                        <button onClick={() => addSubtask(task.id)} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 rounded text-white">+</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Footer row */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest font-cinzel ${priority.tone}`}>
                                                                    {language === 'FR' ? priority.fr : priority.en}
                                                                </span>
                                                                {deadline && (
                                                                    <span className={`inline-flex items-center gap-1 text-[9px] font-cinzel uppercase tracking-widest px-1.5 py-0.5 rounded border ${deadline.tone}`}>
                                                                        <Glyph d={deadline.glyph} size={9} />
                                                                        {deadline.text}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => moveTaskManual(task.id, 'left')} className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 rounded transition-colors text-xs" title={t('Move left', 'Reculer')}>←</button>
                                                                <button onClick={() => setAddingSubtaskTo(addingSubtaskTo === task.id ? null : task.id)} className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 rounded transition-colors text-xs" title={t('Subtasks', 'Sous-tâches')}>
                                                                    <Glyph d="M9 12h6m-6 4h6M5 6h14M5 18h14" size={11} />
                                                                </button>
                                                                <button onClick={() => deleteTask(task.id)} className="w-6 h-6 flex items-center justify-center text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 rounded transition-colors text-xs" title={t('Delete', 'Supprimer')}>✕</button>
                                                                <button onClick={() => moveTaskManual(task.id, 'right')} className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 rounded transition-colors text-xs" title={t('Move right', 'Avancer')}>→</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}

                                        {/* Empty state — drop affordance */}
                                        {columnTasks.length === 0 && (
                                            <div className={`h-24 flex items-center justify-center text-xs italic font-lato border-2 border-dashed rounded-lg m-1 transition-all ${
                                                isDragOver ? 'border-white/40 text-white/60 bg-white/[0.03]' : 'border-white/8 text-neutral-700'
                                            }`}>
                                                {isDragOver ? t('Release to drop here', 'Relâche pour déposer') : t('Drop here', 'Déposer ici')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── ADD TASK MODAL ─────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
                    <div className={`w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${formStyles.container}`}>
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <p className={`text-[10px] uppercase tracking-[0.4em] mb-1 ${formStyles.accentText}`}>
                                    {t('NEW TASK', 'NOUVELLE TÂCHE')}
                                </p>
                                <h3 className={`text-2xl ${pageTitleClass}`}>
                                    {t('Declutter your mind', "Vide ton esprit")}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} aria-label={t('Close', 'Fermer')} className="w-9 h-9 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {/* Title */}
                            <div>
                                <label className={formStyles.label}>{t('What needs doing?', 'Quoi faire ?')}</label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder={t('Task description…', 'Description de la tâche…')}
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className={`w-full p-3 text-lg ${formStyles.input}`}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && newTaskTitle.trim()) addTask(); }}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basket selection */}
                                <div>
                                    <label className={formStyles.label}>{t('Basket', 'Panier')}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {BASKETS.map(b => {
                                            const active = newBasket === b.id;
                                            return (
                                                <button
                                                    key={b.id}
                                                    type="button"
                                                    onClick={() => setNewBasket(b.id)}
                                                    aria-pressed={active}
                                                    className={`p-4 rounded-lg border text-left transition-all flex flex-col items-start gap-2 ${active ? `${b.chip} ring-1 ring-white/30 scale-[1.02]` : 'border-white/10 bg-white/[0.02] text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Glyph d={b.iconPath} size={20} />
                                                    <span className="text-sm font-cinzel uppercase tracking-widest">
                                                        {language === 'FR' ? b.fr : b.en}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Priority + deadline */}
                                <div>
                                    <label className={formStyles.label}>{t('Constraints', 'Contraintes')}</label>
                                    <div className={`p-4 rounded-lg border ${themeStyles.border} bg-black/40 space-y-4`}>
                                        <div>
                                            <label className="block text-[9px] font-cinzel uppercase tracking-widest text-neutral-500 mb-1.5">
                                                {t('Deadline (optional)', 'Échéance (optionnel)')}
                                            </label>
                                            <input
                                                type="date"
                                                value={newDeadline}
                                                onChange={(e) => setNewDeadline(e.target.value)}
                                                className={`w-full p-2.5 text-sm ${formStyles.input}`}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNewIsImportant(!newIsImportant)}
                                                aria-pressed={newIsImportant}
                                                className={`p-3 rounded border-2 transition-all flex flex-col items-center gap-1 ${newIsImportant ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/[0.02] text-neutral-500 hover:bg-white/5'}`}
                                            >
                                                <Glyph d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.39a.56.56 0 01-.84.6l-4.72-2.88a.56.56 0 00-.59 0L6.98 20.54a.56.56 0 01-.84-.6l1.29-5.39a.56.56 0 00-.18-.56L3.04 10.4a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.47-.35L11.48 3.5z" size={20} />
                                                <span className="text-[10px] font-cinzel uppercase tracking-widest">{t('Important', 'Important')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewIsUrgent(!newIsUrgent)}
                                                aria-pressed={newIsUrgent}
                                                className={`p-3 rounded border-2 transition-all flex flex-col items-center gap-1 ${newIsUrgent ? 'border-red-400 bg-red-500/15 text-red-100' : 'border-white/10 bg-white/[0.02] text-neutral-500 hover:bg-white/5'}`}
                                            >
                                                <Glyph d="M14 2v6h6M6 2h8l6 6v14H6z M9 13h6 M9 17h6 M9 9h2" size={20} />
                                                <span className="text-[10px] font-cinzel uppercase tracking-widest">{t('Urgent', 'Urgent')}</span>
                                            </button>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                                            <span className="font-cinzel uppercase tracking-widest text-neutral-500">{t('Resulting priority', 'Priorité')}</span>
                                            <span className={`px-2 py-0.5 rounded border border-white/10 bg-white/5 font-cinzel uppercase tracking-widest font-bold ${getPriorityLabel(newIsUrgent, newIsImportant).tone}`}>
                                                {language === 'FR' ? getPriorityLabel(newIsUrgent, newIsImportant).fr : getPriorityLabel(newIsUrgent, newIsImportant).en}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-white/10 flex items-center gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-white/15 text-neutral-300 text-[10px] uppercase tracking-widest hover:bg-white/5 rounded transition-colors">
                                {t('Cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={addTask}
                                disabled={!newTaskTitle.trim()}
                                className={`group flex-1 flex items-center justify-center gap-2 py-3 rounded text-sm transition-all ${newTaskTitle.trim() ? formStyles.submitOn : formStyles.submitOff}`}
                            >
                                <span>{t('Add to board', 'Ajouter au tableau')}</span>
                                <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── METHODOLOGY GUIDE ─────────────────────────────── */}
            {showGuide && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
                    <div className={`max-w-3xl rounded-xl p-8 relative overflow-y-auto max-h-full ${formStyles.container}`}>
                        <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 w-9 h-9 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base">✕</button>
                        <p className={`text-[10px] uppercase tracking-[0.4em] mb-1 ${formStyles.accentText}`}>{t('METHOD', 'MÉTHODE')}</p>
                        <h2 className={`text-3xl mb-6 ${pageTitleClass}`}>{t('The Art of Flow', "L'art du flow")}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-neutral-300 font-lato text-sm leading-relaxed">
                            <section>
                                <h3 className="font-cinzel text-white text-base mb-2 uppercase tracking-widest">1. {t('Visualize', 'Visualiser')}</h3>
                                <p>{t(
                                    'Kanban exists to close the 50 mental tabs you keep open. Dump every idea into The Void — the friction of typing it lets you let go.',
                                    'Le Kanban ferme les 50 onglets mentaux que tu gardes ouverts. Vide tout dans Le Vide — le geste d\'écrire libère.',
                                )}</p>
                            </section>
                            <section>
                                <h3 className="font-cinzel text-white text-base mb-2 uppercase tracking-widest">2. {t('Limit WIP', 'Limiter le WIP')}</h3>
                                <p>{t(
                                    'No more than 3 cards in Flow at once. If you try to do everything, you finish nothing. The board enforces this with a red warning.',
                                    'Pas plus de 3 cartes en Flow à la fois. Si tu essaies tout, tu termines rien. Le tableau te le rappelle en rouge.',
                                )}</p>
                            </section>
                            <section>
                                <h3 className="font-cinzel text-white text-base mb-2 uppercase tracking-widest">3. {t('Eisenhower', 'Eisenhower')}</h3>
                                <p>{t(
                                    'Urgent + important = do now. Important not urgent = schedule. Urgent not important = delegate. Neither = drop.',
                                    'Urgent + important = faire. Important pas urgent = planifier. Urgent pas important = déléguer. Ni l\'un ni l\'autre = jeter.',
                                )}</p>
                            </section>
                            <section>
                                <h3 className="font-cinzel text-white text-base mb-2 uppercase tracking-widest">4. {t('Sprints', 'Sprints')}</h3>
                                <p>{t(
                                    'Pick 1-2 weeks. Commit cards to Masterpiece by the end. Celebrate. Clear the board. Start again.',
                                    'Choisis 1-2 semaines. Engage des cartes vers le Chef-d\'œuvre. Célèbre. Vide. Recommence.',
                                )}</p>
                            </section>
                        </div>
                        <p className="text-sm italic text-center text-neutral-500 mt-6 pt-6 border-t border-white/10">
                            "Stop Starting, Start Finishing."
                        </p>
                    </div>
                </div>
            )}

            {/* ─── Local styles ─────────────────────────────────────── */}
            <style>{`
                @keyframes kanbanCardIn {
                    0%   { opacity: 0; transform: translateY(8px) scale(0.98); }
                    100% { opacity: 1; transform: translateY(0)   scale(1); }
                }
                .kanban-card { animation: kanbanCardIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .kanban-card { animation: none !important; }
                }
            `}</style>
        </div>
    );
};
