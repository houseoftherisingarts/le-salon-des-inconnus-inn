
import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  collection, collectionGroup, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { WwooferProfile, WwooferVisitRequest, WwooferMessage, WwooferStatus } from '../types';
import { AdminShell, type AdminNavItem } from './AdminShell';
import { NewsletterSection } from './admin/NewsletterSection';
import { MessagesSection } from './admin/MessagesSection';
import { MediaSection } from './admin/MediaSection';
import { ShowOffersSection } from './admin/ShowOffersSection';
import { InspirosphereSection } from './admin/InspirosphereSection';
import type { ShowOffer } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CRMRegistration {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  teamId?: string;
  teamName?: string;
  teams?: { teamId: string; days: string[]; isSupport: boolean; isChefEquipe?: boolean }[];
  roomId?: string;
  roomName?: string;
  arrivalDate?: string;
  departureDate?: string;
  isChefEquipe?: boolean;
  createdAt?: any;
}

interface ShowTicket {
  uid: string;
  displayName: string;
  email: string;
  ticketType: 'single' | 'weekend';
  nights: string[];
  amountCents: number;
  squarePaymentId?: string;
  ticketCode: string;
  createdAt?: any;
}

interface AdminCRMProps {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  user: User | null;
}

const ADMIN_EMAILS = ['houseoftherisingarts@gmail.com', 'alex@lesalondesinconnus.com'];
const EVENT_ID = 'ceilidh-mai-2026';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(ts: any): string {
  if (!ts) return '—';
  const d = ts.toDate?.() ?? new Date(ts.seconds * 1000);
  return d.toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Access Gate (email-based; matches firestore.rules admin check) ──────────

const AccessDenied: React.FC<{ user: User | null; onNavigate: (view: string) => void }> = ({ user, onNavigate }) => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <p className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.5em] mb-3">Le Salon des Inconnus</p>
        <h1 className="font-cinzel text-3xl text-white">Admin CRM</h1>
      </div>
      <div className="border border-white/10 bg-[#0a0a0a] p-8 text-center">
        <p className="font-lato text-sm text-neutral-400 mb-6">
          {user
            ? "Ce compte n'a pas accès à l'administration."
            : "Connexion administrateur requise. Connectez-vous depuis l'accueil."}
        </p>
        <button
          onClick={() => onNavigate('INN')}
          className="w-full py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] transition-all"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  </div>
);

// ─── Feature Requests panel ──────────────────────────────────────────────────
// Consumed by the Artistic CRM "Demandes" tab. Pending requests get a compact
// review card with three surface checkboxes (Café / Mécène / Studio) so the
// admin pre-decides where to feature the artist before clicking Approve.
// Approving flips members/{uid}/admin/flags accordingly + marks the request
// as approved.

type FRPanelRow = {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  askedAt?: any;
  status?: 'pending' | 'approved' | 'declined';
  decidedAt?: any;
  decidedByEmail?: string;
  note?: string;
};

type FRPanelMember = {
  uid: string;
  isArtist?: boolean;
  featureCafe?: boolean;
  featureMecene?: boolean;
  featureCreatorStudio?: boolean;
};

const FeatureRequestsPanel: React.FC<{
  requests: FRPanelRow[];
  members: FRPanelMember[];
  onApprove: (uid: string, surfaces: { cafe: boolean; mecene: boolean; studio: boolean }) => Promise<void> | void;
  onDecline: (uid: string, note?: string) => Promise<void> | void;
}> = ({ requests, members, onApprove, onDecline }) => {
  // Per-card surface checkbox state, keyed by uid. Defaults to all-on so the
  // admin's quickest path is "Approve everywhere."
  const [surfaceState, setSurfaceState] = useState<Record<string, { cafe: boolean; mecene: boolean; studio: boolean }>>({});
  const surfacesFor = (uid: string) =>
    surfaceState[uid] ?? { cafe: true, mecene: true, studio: true };
  const setSurface = (uid: string, key: 'cafe' | 'mecene' | 'studio', value: boolean) =>
    setSurfaceState(prev => ({ ...prev, [uid]: { ...surfacesFor(uid), [key]: value } }));

  const findMember = (uid: string) => members.find(m => m.uid === uid);
  const pending = requests.filter(r => !r.status || r.status === 'pending');
  const resolved = requests.filter(r => r.status === 'approved' || r.status === 'declined');

  return (
    <div className="space-y-10">
      <div>
        <p className="text-neutral-600 text-xs font-lato mb-1">
          Demandes des artistes pour être mis·e·s en avant à travers les espaces des Inconnus.
          Cocher les surfaces souhaitées avant d'approuver — les drapeaux correspondants seront
          activés dans <code className="text-neutral-500">members/{'{uid}'}/admin/flags</code>.
        </p>
      </div>

      {/* Pending */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
            En attente
          </h2>
          <span className="text-[10px] text-neutral-700 font-cinzel uppercase tracking-widest">
            {pending.length} demande{pending.length === 1 ? '' : 's'}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="border border-white/10 bg-[#0a0a0a] p-8 text-center text-neutral-600 text-xs font-lato">
            Aucune demande en attente.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => {
              const surfaces = surfacesFor(r.uid);
              const m = findMember(r.uid);
              return (
                <div key={r.uid} className="border border-white/10 bg-[#0a0a0a] p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    {r.photoURL ? (
                      <img src={r.photoURL} alt="" className="w-12 h-12 rounded-full shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-sm font-cinzel text-[#f3e5ab] shrink-0">
                        {(r.displayName?.[0] || r.email?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-prata text-[#f3e5ab] text-lg leading-tight">
                        {r.displayName || <span className="text-neutral-600 italic">Sans nom</span>}
                      </h3>
                      <p className="text-neutral-500 text-[11px] font-lato">{r.email || '—'}</p>
                      {r.askedAt && (
                        <p className="text-neutral-700 text-[10px] font-lato mt-1">
                          Soumis: {(() => {
                            const d = r.askedAt?.toDate?.() ?? new Date(r.askedAt?.seconds ? r.askedAt.seconds * 1000 : Date.now());
                            return d.toLocaleString('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                          })()}
                        </p>
                      )}
                      {m?.isArtist && (
                        <p className="text-emerald-400/70 text-[10px] font-lato mt-1">
                          Déjà marqué·e comme artiste curaté·e
                        </p>
                      )}
                    </div>

                    {/* Surface checkboxes */}
                    <div className="flex flex-col gap-1.5 text-[11px] font-lato">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={surfaces.cafe}
                          onChange={e => setSurface(r.uid, 'cafe', e.target.checked)}
                          className="accent-fuchsia-400 w-4 h-4"
                        />
                        <span className="text-neutral-300">Café</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={surfaces.mecene}
                          onChange={e => setSurface(r.uid, 'mecene', e.target.checked)}
                          className="accent-fuchsia-400 w-4 h-4"
                        />
                        <span className="text-neutral-300">Mécène · Nos Artistes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={surfaces.studio}
                          onChange={e => setSurface(r.uid, 'studio', e.target.checked)}
                          className="accent-fuchsia-400 w-4 h-4"
                        />
                        <span className="text-neutral-300">Creator Studio · Featured</span>
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onApprove(r.uid, surfaces)}
                        className="px-4 py-2 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all whitespace-nowrap"
                      >
                        ✓ Approuver
                      </button>
                      <button
                        onClick={() => {
                          const note = window.prompt('Raison du refus (optionnel) ?') ?? undefined;
                          onDecline(r.uid, note || undefined);
                        }}
                        className="px-4 py-2 border border-rose-400/40 text-rose-200 font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-rose-500/10 transition-all whitespace-nowrap"
                      >
                        ✗ Refuser
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-cinzel text-neutral-500 text-[10px] uppercase tracking-[0.4em]">Historique</h2>
            <span className="text-[10px] text-neutral-700 font-cinzel uppercase tracking-widest">{resolved.length}</span>
          </div>
          <div className="border border-white/10 bg-[#0a0a0a] divide-y divide-white/5">
            {resolved.map(r => (
              <div key={r.uid} className="px-4 py-3 flex items-center gap-3 text-xs">
                {r.photoURL ? (
                  <img src={r.photoURL} alt="" className="w-7 h-7 rounded-full shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-[10px] font-cinzel text-[#f3e5ab] shrink-0">
                    {(r.displayName?.[0] || r.email?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <span className="flex-1 truncate text-neutral-400 font-lato">
                  {r.displayName || r.email || r.uid}
                </span>
                <span className={`text-[10px] font-cinzel uppercase tracking-[0.3em] ${r.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {r.status === 'approved' ? '✓ Approuvée' : '✗ Refusée'}
                </span>
                {r.decidedByEmail && (
                  <span className="text-neutral-700 text-[10px] font-lato">par {r.decidedByEmail}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ─── Inline editable cell ─────────────────────────────────────────────────────

const EditableCell: React.FC<{
  value: string;
  onSave: (v: string) => void;
}> = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
        className="w-full bg-[#1a1a1a] border border-[#d4af37]/50 text-white text-xs font-lato px-2 py-1 focus:outline-none"
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:text-[#d4af37] transition-colors"
      title="Cliquer pour modifier"
    >
      {value || <span className="text-neutral-700 italic">—</span>}
    </span>
  );
};

// ─── Main CRM ─────────────────────────────────────────────────────────────────

// ─── D20 codes ──────────────────────────────────────────────────────────────
// Each tier has its own subcollection. Adding a code = addDoc with
// { value, used: false }. The dice transaction flips used → true and
// stamps usedBy + usedAt on a winning roll.
type D20Tier = 'good' | 'great' | 'nat20';
// Tone class is the full Tailwind class string so the JIT picks it up.
const D20_TIERS: { id: D20Tier; pct: number; label: string; toneClass: string }[] = [
  { id: 'good',  pct: 5,  label: '5 % · rolls 11–15',  toneClass: 'text-amber-300'   },
  { id: 'great', pct: 10, label: '10 % · rolls 16–19', toneClass: 'text-[#c5a059]'   },
  { id: 'nat20', pct: 20, label: '20 % · Nat 20',      toneClass: 'text-[#f3e5ab]'   },
];

interface D20Code {
  id: string;
  value: string;
  used: boolean;
  usedBy?: string;
  usedAt?: any;
  createdAt?: any;
}

export const AdminCRM: React.FC<AdminCRMProps> = ({ language, onNavigate, user }) => {
  const authed = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  // Two-space CRM: admins pick "Inn" (everything operational — Ceilidh,
  // wwoofing, tickets, etc.) or "Artistic Center" (Members + Creator Studio
  // moderation, growing as Phase 1+ ships). The chooser is the default landing
  // so the admin makes a deliberate choice each session.
  type CrmMode = 'CHOOSE' | 'INN' | 'ARTISTIC';
  const [crmMode, setCrmMode] = useState<CrmMode>('CHOOSE');

  type SectionId =
    | 'dashboard'
    | 'members'
    | 'feature-requests'
    | 'collab-requests'
    | 'inspirosphere'
    | 'woofers'
    | 'tickets'
    | 'emails'
    | 'wwoofing'
    | 'affiliates'
    | 'd20codes'
    | 'newsletter'
    | 'messages'
    | 'media'
    | 'showoffers';
  const [tab, setTab] = useState<SectionId>('dashboard');

  const [registrations, setRegistrations] = useState<CRMRegistration[]>([]);
  const [showTickets, setShowTickets] = useState<ShowTicket[]>([]);
  const [wwoofers, setWwoofers] = useState<WwooferProfile[]>([]);
  const [affiliates, setAffiliates] = useState<Array<{
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    status: 'waiting' | 'accepted' | 'refused';
    code?: string;
    createdAt?: any;
    decidedAt?: any;
  }>>([]);
  // Codes per tier — three live subscriptions
  const [d20Codes, setD20Codes] = useState<Record<D20Tier, D20Code[]>>({ good: [], great: [], nat20: [] });
  // Show offers — kept here just to drive the sidebar badge + dashboard tile.
  // The full list is rendered by ShowOffersSection (which subscribes itself).
  const [showOffers, setShowOffers] = useState<ShowOffer[]>([]);

  // Members directory — admin-only view of every signed-up member, with the
  // curated-artist toggle. The flag lives at members/{uid}/admin/flags.isArtist
  // so users cannot self-promote (rules block writes there for non-admins).
  type MemberRow = {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    membershipType?: string;
    isAdmin?: boolean;
    createdAt?: any;
    isArtist?: boolean;
    featureCafe?: boolean;
    featureMecene?: boolean;
    featureCreatorStudio?: boolean;
  };
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Feature requests submitted from the Creator Studio. Doc id = uid so each
  // user has at most one pending row at a time.
  type FeatureRequestRow = {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    askedAt?: any;
    status?: 'pending' | 'approved' | 'declined';
    decidedAt?: any;
    decidedByEmail?: string;
    note?: string;
  };
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestRow[]>([]);
  type CollabRequestRow = {
    id: string;
    type: 'RESIDENCY' | 'EVENT' | 'PROJECT';
    uid: string;
    uidEmail?: string | null;
    name?: string;
    email?: string;
    idea?: string;
    dates?: string;
    revenueTier?: string;
    needsBursary?: boolean;
    status?: 'new' | 'in_progress' | 'approved' | 'declined' | 'archived';
    createdAt?: any;
    respondedAt?: any;
    adminResponse?: string;
    respondedByEmail?: string;
  };
  const [collabRequests, setCollabRequests] = useState<CollabRequestRow[]>([]);
  // Per-row reply draft (keyed by collabRequest id) — lets the admin compose
  // a response without losing what they typed when switching between rows.
  const [collabReplyDrafts, setCollabReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authed || !db) return;

    const unsub1 = onSnapshot(
      query(collection(db, 'events', EVENT_ID, 'registrations')),
      snap => setRegistrations(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as CRMRegistration)),
      () => {},
    );
    const unsub2 = onSnapshot(
      query(collection(db, 'events', EVENT_ID, 'showTickets'), orderBy('createdAt', 'asc')),
      snap => setShowTickets(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as ShowTicket)),
      () => {},
    );
    const unsub3 = onSnapshot(
      query(collection(db, 'wwoofers')),
      snap => setWwoofers(snap.docs.map(d => ({ ...(d.data() as WwooferProfile), uid: d.id }))),
      () => {},
    );
    const unsub4 = onSnapshot(
      query(collection(db, 'affiliateRequests')),
      snap => setAffiliates(snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }))),
      () => {},
    );
    // Subscribe to each tier's code subcollection. Sorting: unused first
    // (oldest createdAt), used last — so the "next to draw" sits on top.
    const tierUnsubs = D20_TIERS.map((tier) =>
      onSnapshot(
        query(collection(db, 'd20Codes', tier.id, 'codes')),
        snap => setD20Codes(prev => ({
          ...prev,
          [tier.id]: snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
        })),
        () => {},
      ),
    );
    // Show offers — for the badge + dashboard tile only.
    const unsub5 = onSnapshot(
      query(collection(db, 'events', EVENT_ID, 'showOffers'), orderBy('createdAt', 'desc')),
      snap => setShowOffers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as ShowOffer)),
      () => {},
    );
    // Members directory — full membership roster + their per-member admin flags
    // doc (members/{uid}/admin/flags). The flags doc is fetched lazily via a
    // second snapshot per row would be expensive; instead, store flags in a
    // map and merge at render time.
    const unsub6 = onSnapshot(
      query(collection(db, 'members'), orderBy('createdAt', 'desc')),
      snap => {
        const rows: MemberRow[] = snap.docs.map(d => {
          const data = d.data() as any;
          return {
            uid: d.id,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
            membershipType: data.membershipType,
            isAdmin: data.isAdmin,
            createdAt: data.createdAt,
          };
        });
        setMembers(rows);
      },
      () => {},
    );
    // Listen for changes to any member's admin flags doc so the per-row
    // toggles (isArtist + featureCafe / featureMecene / featureCreatorStudio)
    // stay live across tabs and admins.
    const unsub7 = onSnapshot(
      query(collectionGroup(db, 'admin')),
      snap => {
        const flagMap: Record<string, {
          isArtist?: boolean;
          featureCafe?: boolean;
          featureMecene?: boolean;
          featureCreatorStudio?: boolean;
        }> = {};
        snap.docs.forEach(d => {
          if (d.id !== 'flags') return;
          const parent = d.ref.parent.parent;
          if (!parent) return;
          const data = d.data() as any;
          flagMap[parent.id] = {
            isArtist: data.isArtist === true,
            featureCafe: data.featureCafe === true,
            featureMecene: data.featureMecene === true,
            featureCreatorStudio: data.featureCreatorStudio === true,
          };
        });
        setMembers(prev => prev.map(m => ({
          ...m,
          isArtist: flagMap[m.uid]?.isArtist === true,
          featureCafe: flagMap[m.uid]?.featureCafe === true,
          featureMecene: flagMap[m.uid]?.featureMecene === true,
          featureCreatorStudio: flagMap[m.uid]?.featureCreatorStudio === true,
        })));
      },
      () => {},
    );
    // Feature requests inbox.
    const unsub8 = onSnapshot(
      query(collection(db, 'featureRequests'), orderBy('askedAt', 'desc')),
      snap => setFeatureRequests(snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }) as FeatureRequestRow)),
      () => {},
    );
    // Collab requests inbox — Residency / Event / Project submissions from
    // the Creator Studio's COLLABORATE tab. Newest first.
    const unsub9 = onSnapshot(
      query(collection(db, 'collabRequests'), orderBy('createdAt', 'desc')),
      snap => setCollabRequests(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as CollabRequestRow)),
      () => {},
    );
    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9();
      tierUnsubs.forEach(fn => fn());
    };
  }, [authed]);

  // Toggle a member's curated-artist status. Writes members/{uid}/admin/flags
  // — gated to admins by firestore.rules so users cannot self-promote.
  const toggleArtist = useCallback(async (uid: string, next: boolean) => {
    if (!db) return;
    try {
      await setDoc(
        doc(db, 'members', uid, 'admin', 'flags'),
        { isArtist: next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (e) {
      console.error('toggleArtist failed', e);
      alert("Échec de la mise à jour du statut artiste. Vérifiez la console.");
    }
  }, []);

  // Toggle one of the three feature surfaces (Café / Mécène / Creator Studio).
  // Same admin-only path. Independent of isArtist — admin can choose any
  // combination, e.g. "feature in Café only" or "approve as artist but don't
  // surface yet anywhere."
  type FeatureSurface = 'featureCafe' | 'featureMecene' | 'featureCreatorStudio';
  const toggleFeatureFlag = useCallback(async (uid: string, key: FeatureSurface, next: boolean) => {
    if (!db) return;
    try {
      await setDoc(
        doc(db, 'members', uid, 'admin', 'flags'),
        { [key]: next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (e) {
      console.error(`toggle ${key} failed`, e);
      alert("Échec de la mise à jour du drapeau. Vérifiez la console.");
    }
  }, []);

  // Approve a feature request: mark the request as approved + flip the
  // corresponding surface flags. The admin can pre-select which surfaces by
  // checking boxes in the request card before clicking approve. By default
  // all three are surfaced, plus isArtist is set so the user gains
  // publish-grade access in the Creator Studio.
  const approveFeatureRequest = useCallback(async (
    uid: string,
    surfaces: { cafe: boolean; mecene: boolean; studio: boolean },
  ) => {
    if (!db || !user) return;
    try {
      await setDoc(
        doc(db, 'members', uid, 'admin', 'flags'),
        {
          isArtist: true,
          featureCafe: surfaces.cafe,
          featureMecene: surfaces.mecene,
          featureCreatorStudio: surfaces.studio,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await updateDoc(doc(db, 'featureRequests', uid), {
        status: 'approved',
        decidedAt: serverTimestamp(),
        decidedByEmail: user.email ?? null,
      });
    } catch (e) {
      console.error('approveFeatureRequest failed', e);
      alert("Échec de l'approbation. Vérifiez la console.");
    }
  }, [user]);

  const respondToCollabRequest = useCallback(async (
    id: string,
    nextStatus: 'in_progress' | 'approved' | 'declined' | 'archived',
    reply: string,
  ) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'collabRequests', id), {
        status: nextStatus,
        adminResponse: reply || null,
        respondedAt: serverTimestamp(),
        respondedByEmail: user.email ?? null,
      });
      setCollabReplyDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error('respondToCollabRequest failed', e);
      alert('Échec de la réponse. Vérifiez la console.');
    }
  }, [user]);

  const declineFeatureRequest = useCallback(async (uid: string, note?: string) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'featureRequests', uid), {
        status: 'declined',
        decidedAt: serverTimestamp(),
        decidedByEmail: user.email ?? null,
        ...(note ? { note } : {}),
      });
    } catch (e) {
      console.error('declineFeatureRequest failed', e);
      alert("Échec du refus. Vérifiez la console.");
    }
  }, [user]);

  // Add many codes at once. Pasted text is split on newlines/commas; each
  // non-empty line becomes one code doc.
  const addD20Codes = async (tier: D20Tier, raw: string) => {
    if (!db) return;
    const values = Array.from(new Set(
      raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean),
    ));
    if (values.length === 0) return;
    // Skip duplicates already in the pool
    const existing = new Set(d20Codes[tier].map(c => c.value));
    const fresh = values.filter(v => !existing.has(v));
    await Promise.all(fresh.map(value =>
      addDoc(collection(db, 'd20Codes', tier, 'codes'), {
        value,
        used: false,
        createdAt: serverTimestamp(),
      }),
    ));
  };

  const deleteD20Code = async (tier: D20Tier, codeId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'd20Codes', tier, 'codes', codeId));
  };

  // Approve / refuse an affiliate request. Approval requires a non-empty code.
  const handleAffiliateDecision = async (
    uid: string,
    status: 'accepted' | 'refused',
    code?: string,
  ) => {
    if (!db) return;
    if (status === 'accepted' && !code?.trim()) return;
    await updateDoc(doc(db, 'affiliateRequests', uid), {
      status,
      ...(status === 'accepted' ? { code: code!.trim().toUpperCase() } : {}),
      decidedAt: serverTimestamp(),
    } as any);
  };

  const updateReg = useCallback(async (uid: string, fields: Partial<CRMRegistration>) => {
    if (!db) return;
    await updateDoc(doc(db, 'events', EVENT_ID, 'registrations', uid), fields as any);
  }, []);

  const deleteReg = useCallback(async (uid: string) => {
    if (!db || !confirm('Supprimer cette inscription ?')) return;
    await deleteDoc(doc(db, 'events', EVENT_ID, 'registrations', uid));
  }, []);

  const deleteTicket = useCallback(async (uid: string) => {
    if (!db || !confirm('Supprimer ce billet ?')) return;
    await deleteDoc(doc(db, 'events', EVENT_ID, 'showTickets', uid));
  }, []);

  // All unique emails across registrations + showTickets
  const allEmails = (() => {
    const map = new Map<string, { name: string; source: string; email: string }>();
    registrations.forEach(r => {
      if (r.email) map.set(r.email, { email: r.email, name: r.displayName, source: 'Woofer' });
    });
    showTickets.forEach(t => {
      if (t.email) {
        const existing = map.get(t.email);
        map.set(t.email, {
          email: t.email,
          name: t.displayName,
          source: existing ? existing.source + ' + Billet' : 'Billet spectacle',
        });
      }
    });
    return Array.from(map.values());
  })();

  const exportEmails = () => {
    downloadCSV(
      'emails-ceilidh-2026.csv',
      allEmails.map(e => [e.email, e.name, e.source]),
      ['Email', 'Nom', 'Source'],
    );
  };

  const exportWoofers = () => {
    downloadCSV(
      'woofers-ceilidh-2026.csv',
      registrations.map(r => [
        r.displayName,
        r.email,
        r.teamName ?? (r.teams?.filter(m => !m.isSupport).map(m => m.teamId).join(', ') ?? ''),
        r.roomName ?? '',
        r.arrivalDate ?? '',
        r.departureDate ?? '',
      ]),
      ['Nom', 'Email', 'Équipe(s)', 'Hébergement', 'Arrivée', 'Départ'],
    );
  };

  if (!authed) return <AccessDenied user={user} onNavigate={onNavigate} />;

  // Counters for sidebar badges + dashboard tiles
  const counts = {
    woofers: registrations.length,
    tickets: showTickets.length,
    emails: allEmails.length,
    wwoofing: wwoofers.length,
    affiliates: affiliates.filter(a => a.status === 'waiting').length,
    d20codes: D20_TIERS.reduce((n, t) => n + d20Codes[t.id].filter(c => !c.used).length, 0),
    showoffers: showOffers.filter(o => o.status === 'new').length,
  };

  // Sidebar nav, split into two CRM spaces. Inn = everything operational
  // (Ceilidh, wwoofing, tickets, etc). Artistic = Members + Creator Studio
  // moderation (will grow as Phase 1+ ships submission workflows / show
  // offers from artists / etc).
  const innNav: AdminNavItem<SectionId>[] = [
    { id: 'dashboard',  label: 'Tableau de bord', iconPath: 'M3.75 12h6v6h-6V12zm0-8.25h6v6h-6v-6zm10.5 0h6v6h-6v-6zm0 10.5h6v3.75h-6v-3.75z' },
    { id: 'woofers',    label: 'Inscriptions',     badge: counts.woofers,    iconPath: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { id: 'tickets',    label: 'Billets',          badge: `${counts.tickets}/20`, iconPath: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z' },
    { id: 'emails',     label: 'Emails',           badge: counts.emails,     iconPath: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
    { id: 'wwoofing',   label: 'Wwoofing',         badge: counts.wwoofing,   iconPath: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { id: 'showoffers', label: 'Spectacles',       badge: counts.showoffers, iconPath: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' },
    { id: 'affiliates', label: 'Affiliés',         badge: counts.affiliates, iconPath: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244', dividerBefore: true },
    { id: 'd20codes',   label: 'Codes D20',        badge: counts.d20codes,   iconPath: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z' },
    { id: 'newsletter', label: 'Infolettre',       iconPath: 'M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z', dividerBefore: true },
    { id: 'messages',   label: 'Messages',         iconPath: 'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' },
    { id: 'media',      label: 'Médiathèque',      iconPath: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25' },
  ];

  const pendingRequestCount = featureRequests.filter(r => r.status === 'pending' || !r.status).length;
  const pendingCollabCount = collabRequests.filter(r => r.status === 'new' || !r.status).length;
  // Inspirosphere pending-video count is bubbled up from the section
  // component via onPendingCountChange so the sidebar badge stays live
  // without AdminCRM owning the subscription.
  const [inspirospherePending, setInspirospherePending] = useState(0);
  const artisticNav: AdminNavItem<SectionId>[] = [
    { id: 'members',          label: 'Membres',  badge: members.length,        iconPath: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { id: 'feature-requests', label: 'Demandes', badge: pendingRequestCount,  iconPath: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
    { id: 'collab-requests',  label: 'Collabs',  badge: pendingCollabCount,    iconPath: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244' },
    { id: 'inspirosphere',    label: 'Inspirosphère', badge: inspirospherePending, iconPath: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0 0v-4.5m0 0a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 0V12' },
  ];

  const nav = crmMode === 'ARTISTIC' ? artisticNav : innNav;

  // Default landing tab per space — keeps URL/state coherent when switching.
  const enterCrmMode = (mode: 'INN' | 'ARTISTIC') => {
    setCrmMode(mode);
    setTab(mode === 'ARTISTIC' ? 'members' : 'dashboard');
  };

  const handleSignOut = async () => {
    try { await signOut(auth); } catch { /* noop */ }
    onNavigate('INN');
  };

  // ── CRM space chooser ──────────────────────────────────────────────────
  // Two distinct administrative spaces. Inn covers operations (Ceilidh,
  // bookings, wwoofing). Artistic covers the Creator Studio surfaces
  // (artist curation, artist submissions). Each has its own AdminShell
  // instance below, switchable via the "Changer d'espace" button in the
  // sidebar.
  if (crmMode === 'CHOOSE') {
    const onlineNow = members.filter(m => m.isArtist).length;
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-lato">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-3">
              Le Salon des Inconnus
            </p>
            <h1 className="font-prata text-[#f3e5ab] text-4xl md:text-5xl">Espace administratif</h1>
            <p className="font-josefin text-neutral-500 text-xs uppercase tracking-[0.35em] mt-3">
              Choisissez un espace
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inn CRM */}
            <button
              onClick={() => enterCrmMode('INN')}
              className="group relative text-left bg-[#0a0a0a] border border-white/10 hover:border-[#c5a059]/50 hover:-translate-y-1 transition-all p-8 overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 30% 20%, rgba(197,160,89,0.08), transparent 60%)',
                }}
              />
              <div className="relative">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em]">01 — Auberge</span>
                  <span className="font-cinzel text-neutral-700 text-[10px] uppercase tracking-widest">CRM</span>
                </div>
                <h2 className="font-prata text-[#f3e5ab] text-2xl md:text-3xl mb-4 leading-tight">
                  L'Auberge
                </h2>
                <p className="font-lato text-neutral-400 text-sm leading-relaxed mb-8">
                  Inscriptions Ceilidh, billets, wwoofing, affiliés, codes D20, infolettre, médiathèque, spectacles.
                </p>
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                  <div>
                    <p className="font-cinzel text-[#f3e5ab] text-xl">{counts.woofers}</p>
                    <p className="font-josefin text-neutral-600 text-[9px] uppercase tracking-widest mt-1">Inscriptions</p>
                  </div>
                  <div>
                    <p className="font-cinzel text-[#f3e5ab] text-xl">{counts.tickets}</p>
                    <p className="font-josefin text-neutral-600 text-[9px] uppercase tracking-widest mt-1">Billets</p>
                  </div>
                  <div>
                    <p className="font-cinzel text-[#f3e5ab] text-xl">{counts.showoffers}</p>
                    <p className="font-josefin text-neutral-600 text-[9px] uppercase tracking-widest mt-1">Spectacles</p>
                  </div>
                </div>
                <span className="block mt-8 font-cinzel text-[10px] uppercase tracking-[0.35em] text-neutral-500 group-hover:text-[#c5a059] transition-colors">
                  Entrer →
                </span>
              </div>
            </button>

            {/* Artistic CRM */}
            <button
              onClick={() => enterCrmMode('ARTISTIC')}
              className="group relative text-left bg-[#0a0a0a] border border-white/10 hover:border-fuchsia-400/40 hover:-translate-y-1 transition-all p-8 overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 70% 20%, rgba(217,70,239,0.10), transparent 60%)',
                }}
              />
              <div className="relative">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="font-cinzel text-fuchsia-300 text-[9px] uppercase tracking-[0.45em]">02 — Centre Artistique</span>
                  <span className="font-cinzel text-neutral-700 text-[10px] uppercase tracking-widest">CRM</span>
                </div>
                <h2 className="font-prata text-[#f3e5ab] text-2xl md:text-3xl mb-4 leading-tight">
                  Centre Artistique
                </h2>
                <p className="font-lato text-neutral-400 text-sm leading-relaxed mb-8">
                  Annuaire des membres, curation artiste, modération du Creator Studio (lectures, hot seat, soumissions). S'étoffera au fur et à mesure des phases.
                </p>
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                  <div>
                    <p className="font-cinzel text-[#f3e5ab] text-xl">{members.length}</p>
                    <p className="font-josefin text-neutral-600 text-[9px] uppercase tracking-widest mt-1">Membres</p>
                  </div>
                  <div>
                    <p className="font-cinzel text-fuchsia-200 text-xl">{onlineNow}</p>
                    <p className="font-josefin text-neutral-600 text-[9px] uppercase tracking-widest mt-1">Artistes</p>
                  </div>
                  <div>
                    <p className="font-cinzel text-neutral-700 text-xl">—</p>
                    <p className="font-josefin text-neutral-700 text-[9px] uppercase tracking-widest mt-1">À venir</p>
                  </div>
                </div>
                <span className="block mt-8 font-cinzel text-[10px] uppercase tracking-[0.35em] text-neutral-500 group-hover:text-fuchsia-300 transition-colors">
                  Entrer →
                </span>
              </div>
            </button>
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => onNavigate('INN')}
              className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-600 hover:text-neutral-300 transition-colors"
            >
              ↗ Retour au site
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminShell<SectionId>
      user={user!}
      sectionId={tab}
      onSectionChange={setTab}
      nav={nav}
      onBackToSite={() => onNavigate('INN')}
      onSignOut={handleSignOut}
      subtitle={crmMode === 'ARTISTIC' ? 'Centre Artistique' : 'Ceilidh · Mai 2026'}
      onSwitchSpace={() => setCrmMode('CHOOSE')}
    >
      <div>

        {/* ── Tableau de bord — overview tiles ── */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            <p className="text-neutral-500 text-sm font-lato max-w-2xl">
              Vue d'ensemble du Ceilidh de mai 2026. Cliquez sur une tuile pour ouvrir la section complète.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardTile label="Inscriptions"  value={counts.woofers}    accent="text-amber-300"   onClick={() => setTab('woofers')} />
              <DashboardTile label="Billets"       value={`${counts.tickets}/20`} accent="text-[#c5a059]" onClick={() => setTab('tickets')} />
              <DashboardTile label="Emails"        value={counts.emails}     accent="text-neutral-300" onClick={() => setTab('emails')} />
              <DashboardTile label="Wwoofing"      value={counts.wwoofing}   accent="text-emerald-300" onClick={() => setTab('wwoofing')} />
              <DashboardTile label="Demandes affiliés (en attente)" value={counts.affiliates} accent="text-rose-300" onClick={() => setTab('affiliates')} />
              <DashboardTile label="Codes D20 disponibles" value={counts.d20codes} accent="text-[#f3e5ab]" onClick={() => setTab('d20codes')} />
              <DashboardTile label="Spectacles · nouveaux" value={counts.showoffers} accent="text-fuchsia-300" onClick={() => setTab('showoffers')} />
            </div>

            {/* Quick info: most recent registrations */}
            {registrations.length > 0 && (
              <div>
                <h2 className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] mb-3">
                  Inscriptions récentes
                </h2>
                <div className="border border-white/10 bg-[#0a0a0a] divide-y divide-white/5">
                  {[...registrations]
                    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
                    .slice(0, 5)
                    .map(r => (
                      <div key={r.uid} className="px-4 py-3 flex items-center gap-3">
                        {r.photoURL ? (
                          <img src={r.photoURL} alt="" className="w-7 h-7 rounded-full" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-[10px] font-cinzel text-[#f3e5ab]">
                            {(r.displayName?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-200 truncate">{r.displayName}</p>
                          <p className="text-[11px] text-neutral-600 truncate">{r.email}</p>
                        </div>
                        {(r.teamName || r.teams?.[0]?.teamId) && (
                          <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-[#c5a059]/70">
                            {r.teamName || r.teams?.find(m => !m.isSupport)?.teamId}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Woofers tab ── */}
        {tab === 'woofers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-neutral-600 text-xs font-lato">
                Cliquez sur une cellule pour modifier. Les changements sont sauvegardés automatiquement.
              </p>
              <button
                onClick={exportWoofers}
                className="px-4 py-2 border border-white/10 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all"
              >
                ↓ Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-lato border-collapse">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Nom', 'Email', 'Équipe(s)', 'Support', 'Hébergement', 'Arrivée', 'Départ', 'Chef', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-cinzel text-[10px] uppercase tracking-widest text-neutral-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => {
                    const primaryTeams = reg.teams?.filter(m => !m.isSupport).map(m => m.teamId).join(', ') || reg.teamName || '—';
                    const supportTeams = reg.teams?.filter(m => m.isSupport).map(m => m.teamId).join(', ') || '';
                    return (
                      <tr key={reg.uid} className="border-b border-white/5 hover:bg-white/[0.02] group">
                        <td className="py-2.5 px-3 text-white">
                          <EditableCell value={reg.displayName} onSave={v => updateReg(reg.uid, { displayName: v })} />
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400">
                          <EditableCell value={reg.email} onSave={v => updateReg(reg.uid, { email: v })} />
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400">{primaryTeams}</td>
                        <td className="py-2.5 px-3 text-amber-600/80">{supportTeams || '—'}</td>
                        <td className="py-2.5 px-3 text-neutral-400">
                          <EditableCell value={reg.roomName ?? ''} onSave={v => updateReg(reg.uid, { roomName: v })} />
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400">
                          <EditableCell value={reg.arrivalDate ?? ''} onSave={v => updateReg(reg.uid, { arrivalDate: v })} />
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400">
                          <EditableCell value={reg.departureDate ?? ''} onSave={v => updateReg(reg.uid, { departureDate: v })} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {reg.isChefEquipe && <span className="text-[#d4af37]">★</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => deleteReg(reg.uid)}
                            className="text-red-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-[10px] font-cinzel uppercase"
                          >
                            Suppr.
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-700 italic">Aucun woofer inscrit.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Show Tickets tab ── */}
        {tab === 'tickets' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-2 bg-[#d4af37]/60 rounded-full" style={{ width: `${(showTickets.length / 20) * 160}px`, maxWidth: '160px' }} />
                <span className="text-neutral-600 text-xs font-lato">{showTickets.length}/20 places vendues</span>
              </div>
              <button
                onClick={() => downloadCSV('billets-spectacles-2026.csv',
                  showTickets.map(t => [t.displayName, t.email, t.ticketType, t.nights.join(' / '), t.ticketCode, String(t.amountCents / 100) + '$', fmtDate(t.createdAt)]),
                  ['Nom', 'Email', 'Type', 'Soirées', 'Code', 'Montant', 'Date'])}
                className="px-4 py-2 border border-white/10 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all"
              >
                ↓ Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-lato border-collapse">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Nom', 'Email', 'Type', 'Soirées', 'Code Billet', 'Montant', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-cinzel text-[10px] uppercase tracking-widest text-neutral-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showTickets.map(ticket => (
                    <tr key={ticket.uid} className="border-b border-white/5 hover:bg-white/[0.02] group">
                      <td className="py-2.5 px-3 text-white">{ticket.displayName}</td>
                      <td className="py-2.5 px-3 text-neutral-400">{ticket.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-cinzel uppercase tracking-wider ${ticket.ticketType === 'weekend' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-white/10 text-neutral-300'}`}>
                          {ticket.ticketType === 'weekend' ? 'Weekend' : '1 Soir'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500">
                        {ticket.nights.map(n => n.slice(8, 10) + '/05').join(', ')}
                      </td>
                      <td className="py-2.5 px-3 font-cinzel text-[#d4af37] tracking-widest">
                        {ticket.ticketCode}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">{ticket.amountCents / 100}$</td>
                      <td className="py-2.5 px-3 text-neutral-600">{fmtDate(ticket.createdAt)}</td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => deleteTicket(ticket.uid)}
                          className="text-red-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-[10px] font-cinzel uppercase"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  ))}
                  {showTickets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-700 italic">Aucun billet vendu.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Wwoofing tab ── */}
        {tab === 'wwoofing' && (
          <div>
            <p className="text-neutral-600 text-xs font-lato mb-4">
              Demandes de wwoofing — toggler le statut du wwoofer, approuver/refuser leurs visites, et discuter avec eux.
            </p>
            {wwoofers.length === 0 ? (
              <p className="py-12 text-center text-neutral-700 italic">Aucune candidature wwoofer.</p>
            ) : (
              <div className="space-y-3">
                {wwoofers.map(w => (
                  <WwooferAdminRow key={w.uid} profile={w} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Members directory + curated-artist toggle ── */}
        {tab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                <p className="text-neutral-600 text-xs font-lato">
                  Annuaire complet des membres. Cocher « Artiste » accorde l'accès aux fonctionnalités
                  publication du Creator Studio (Lectures, Hot Seat, profil public).
                </p>
                <p className="text-neutral-700 text-[10px] font-lato mt-1">
                  Le drapeau est stocké dans <code className="text-neutral-500">members/{'{uid}'}/admin/flags</code> —
                  les utilisateurs ne peuvent pas se l'attribuer eux-mêmes.
                </p>
              </div>
              <input
                type="search"
                placeholder="Rechercher (nom, email)…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="bg-[#0a0a0a] border border-white/10 px-3 py-2 text-xs text-white font-lato w-64 focus:outline-none focus:border-[#c5a059]"
              />
            </div>

            <div className="border border-white/10 bg-[#0a0a0a] overflow-x-auto">
              <div className="grid grid-cols-[2fr_2fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-[9px] uppercase tracking-widest text-neutral-500 border-b border-white/5 font-cinzel min-w-[1000px]">
                <span>Membre</span>
                <span>Email</span>
                <span>Inscrit</span>
                <span className="text-center">Artiste</span>
                <span className="text-center" title="Featured in the Café">Café</span>
                <span className="text-center" title="Featured in 'Nos Artistes' (Mécène)">Mécène</span>
                <span className="text-center" title="Featured in Creator Studio">Studio</span>
              </div>
              {members
                .filter(m => {
                  if (!memberSearch) return true;
                  const q = memberSearch.toLowerCase();
                  return (m.displayName || '').toLowerCase().includes(q)
                      || (m.email || '').toLowerCase().includes(q);
                })
                .map(m => (
                  <div key={m.uid} className="grid grid-cols-[2fr_2fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] text-xs min-w-[1000px]">
                    <div className="flex items-center gap-3 min-w-0">
                      {m.photoURL ? (
                        <img src={m.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-[10px] font-cinzel text-[#f3e5ab] shrink-0">
                          {(m.displayName?.[0] || m.email?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <span className="text-white truncate font-lato">
                        {m.displayName || <span className="text-neutral-700 italic">—</span>}
                        {m.isAdmin && <span className="ml-2 text-[9px] text-rose-400 uppercase tracking-widest">Admin</span>}
                      </span>
                    </div>
                    <span className="text-neutral-400 truncate font-lato">{m.email || '—'}</span>
                    <span className="text-neutral-600 font-lato">{fmtDate(m.createdAt)}</span>
                    <input
                      type="checkbox"
                      checked={!!m.isArtist}
                      onChange={e => toggleArtist(m.uid, e.target.checked)}
                      className="accent-[#c5a059] w-4 h-4 justify-self-center"
                      title="Curated artist (unlocks Creator Studio publish)"
                    />
                    <input
                      type="checkbox"
                      checked={!!m.featureCafe}
                      onChange={e => toggleFeatureFlag(m.uid, 'featureCafe', e.target.checked)}
                      className="accent-fuchsia-400 w-4 h-4 justify-self-center"
                      title="Feature in the Café"
                    />
                    <input
                      type="checkbox"
                      checked={!!m.featureMecene}
                      onChange={e => toggleFeatureFlag(m.uid, 'featureMecene', e.target.checked)}
                      className="accent-fuchsia-400 w-4 h-4 justify-self-center"
                      title="Feature in 'Nos Artistes' (Mécène space)"
                    />
                    <input
                      type="checkbox"
                      checked={!!m.featureCreatorStudio}
                      onChange={e => toggleFeatureFlag(m.uid, 'featureCreatorStudio', e.target.checked)}
                      className="accent-fuchsia-400 w-4 h-4 justify-self-center"
                      title="Feature in the Creator Studio's Featured Artists row"
                    />
                  </div>
                ))}
              {members.length === 0 && (
                <div className="px-4 py-8 text-center text-neutral-600 text-xs font-lato">
                  Aucun membre inscrit pour l'instant.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Feature requests inbox ── */}
        {tab === 'feature-requests' && (
          <FeatureRequestsPanel
            requests={featureRequests}
            members={members}
            onApprove={approveFeatureRequest}
            onDecline={declineFeatureRequest}
          />
        )}

        {/* ── Collab requests inbox ── */}
        {/* Submissions from the Studio's COLLABORATE tab. Reply text is
            written back to `adminResponse` on the doc; the submitter sees
            it on their Profile inbox in real time. */}
        {tab === 'collab-requests' && (
          <div className="space-y-3">
            {collabRequests.length === 0 ? (
              <p className="text-neutral-500 text-sm font-lato italic py-8 text-center">
                Aucune demande de collaboration pour l'instant.
              </p>
            ) : (
              collabRequests.map(r => {
                const draft = collabReplyDrafts[r.id] ?? r.adminResponse ?? '';
                const status = r.status ?? 'new';
                const statusBadge = status === 'approved'
                  ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                  : status === 'declined'
                    ? 'border-rose-400/40 text-rose-200 bg-rose-500/10'
                    : status === 'in_progress'
                      ? 'border-amber-400/40 text-amber-200 bg-amber-500/10'
                      : status === 'archived'
                        ? 'border-neutral-500/40 text-neutral-400 bg-neutral-500/10'
                        : 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10';
                const typeLabel = r.type === 'RESIDENCY' ? 'Résidence'
                  : r.type === 'EVENT' ? 'Événement'
                  : 'Projet';
                return (
                  <div key={r.id} className="border border-white/10 bg-black/40 rounded-lg p-5">
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 border border-white/15 text-neutral-300 bg-black/40 rounded">
                        {typeLabel}
                      </span>
                      <span className={`text-[10px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 border rounded ${statusBadge}`}>
                        {status}
                      </span>
                      <div className="flex-1 min-w-0" />
                      {r.createdAt?.seconds && (
                        <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
                          {new Date(r.createdAt.seconds * 1000).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 mb-3">
                      <div className="text-xs space-y-1.5">
                        <p><span className="text-neutral-500 uppercase tracking-widest text-[9px] mr-2">Nom</span><span className="text-white">{r.name || '—'}</span></p>
                        <p><span className="text-neutral-500 uppercase tracking-widest text-[9px] mr-2">Email</span><span className="text-white">{r.email || r.uidEmail || '—'}</span></p>
                        {r.dates && <p><span className="text-neutral-500 uppercase tracking-widest text-[9px] mr-2">Dates</span><span className="text-white">{r.dates}</span></p>}
                        {r.revenueTier && <p><span className="text-neutral-500 uppercase tracking-widest text-[9px] mr-2">Tier</span><span className="text-white">{r.revenueTier}{r.needsBursary ? ' · bourse demandée' : ''}</span></p>}
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Idée</p>
                        <p className="text-sm text-neutral-200 font-lato whitespace-pre-wrap leading-relaxed">{r.idea || '—'}</p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <label className="block text-[9px] uppercase tracking-widest text-neutral-500 mb-1.5">
                        Réponse (sera affichée sur le profil du membre)
                      </label>
                      <textarea
                        rows={3}
                        value={draft}
                        onChange={(e) => setCollabReplyDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="w-full bg-black/60 border border-white/15 p-3 text-sm text-white focus:border-[#d4af37] outline-none rounded font-lato"
                        placeholder="Tape ta réponse pour le·la membre…"
                      />
                      <div className="flex flex-wrap gap-2 mt-3 justify-end">
                        <button
                          onClick={() => respondToCollabRequest(r.id, 'in_progress', draft)}
                          className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 rounded"
                        >
                          En cours
                        </button>
                        <button
                          onClick={() => respondToCollabRequest(r.id, 'declined', draft)}
                          className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-rose-400/40 text-rose-200 hover:bg-rose-400/10 rounded"
                        >
                          Refuser
                        </button>
                        <button
                          onClick={() => respondToCollabRequest(r.id, 'approved', draft)}
                          className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10 rounded"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => respondToCollabRequest(r.id, 'archived', draft)}
                          className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-white/15 text-neutral-400 hover:bg-white/5 rounded"
                        >
                          Archiver
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Inspirosphere · user video moderation + curated uploads ── */}
        {tab === 'inspirosphere' && user && (
          <InspirosphereSection
            user={user}
            onPendingCountChange={setInspirospherePending}
          />
        )}

        {/* ── Emails tab ── */}
        {tab === 'emails' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-neutral-600 text-xs font-lato">
                {allEmails.length} adresses uniques — woofers + acheteurs de billets
              </p>
              <button
                onClick={exportEmails}
                className="px-4 py-2 border border-white/10 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all"
              >
                ↓ Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-lato border-collapse">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Email', 'Nom', 'Source'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-cinzel text-[10px] uppercase tracking-widest text-neutral-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allEmails.map(entry => (
                    <tr key={entry.email} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 text-neutral-300">{entry.email}</td>
                      <td className="py-2.5 px-3 text-neutral-500">{entry.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-cinzel uppercase tracking-wider text-neutral-600">{entry.source}</span>
                      </td>
                    </tr>
                  ))}
                  {allEmails.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-neutral-700 italic">Aucun email enregistré.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Affiliates tab — review affiliate requests, approve with code ── */}
        {tab === 'affiliates' && (
          <div className="space-y-3">
            {affiliates.length === 0 && (
              <p className="py-12 text-center text-neutral-700 italic">Aucune demande pour l’instant.</p>
            )}
            {/* Sort: waiting first, then accepted, then refused */}
            {[...affiliates]
              .sort((a, b) => {
                const order = { waiting: 0, accepted: 1, refused: 2 } as Record<string, number>;
                return (order[a.status] ?? 9) - (order[b.status] ?? 9);
              })
              .map((aff) => (
                <AffiliateRow
                  key={aff.uid}
                  aff={aff}
                  onDecide={handleAffiliateDecision}
                />
              ))}
          </div>
        )}

        {/* ── D20 Codes tab — pool management per tier. Used codes are
              struck through; "next to draw" is the topmost unused code. */}
        {tab === 'd20codes' && (
          <div className="space-y-6">
            <p className="text-neutral-600 text-xs font-lato">
              Chaque tirage gagnant prend automatiquement le premier code non-utilisé de la cagnotte concernée
              et le marque comme « brûlé » (impossible à réutiliser). Collez vos codes Hostaway ci-dessous —
              un par ligne, ou séparés par des virgules.
            </p>
            {D20_TIERS.map((tier) => (
              <D20CodePool
                key={tier.id}
                tier={tier}
                codes={d20Codes[tier.id]}
                onAdd={(raw) => addD20Codes(tier.id, raw)}
                onDelete={(id) => deleteD20Code(tier.id, id)}
              />
            ))}
          </div>
        )}

        {/* ── Newsletter / Infolettre — audience builder over existing
              member data. No external API; just lets the admin compose a
              recipient list (CSV / clipboard / mailto). */}
        {tab === 'newsletter' && (
          <NewsletterSection
            registrations={registrations}
            showTickets={showTickets}
            wwoofers={wwoofers}
            affiliates={affiliates}
          />
        )}

        {/* ── Messages — wwoofer threads only. Member-to-member private
              conversations are intentionally excluded for privacy. */}
        {tab === 'messages' && (
          <MessagesSection wwoofers={wwoofers} adminUid={user!.uid} adminEmail={user!.email ?? ''} />
        )}

        {/* ── Médiathèque — Firebase Storage browser under admin/media/. */}
        {tab === 'media' && (
          <MediaSection />
        )}

        {/* ── Spectacles — show offers submitted from /ceilidh. */}
        {tab === 'showoffers' && (
          <ShowOffersSection eventId={EVENT_ID} />
        )}

      </div>
    </AdminShell>
  );
};

// ─── D20 code pool panel — one per tier ─────────────────────────────────────
const D20CodePool: React.FC<{
  tier: { id: D20Tier; pct: number; label: string; toneClass: string };
  codes: D20Code[];
  onAdd: (raw: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ tier, codes, onAdd, onDelete }) => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  // Sort: unused (oldest first) then used (most recent first).
  const sorted = [...codes].sort((a, b) => {
    if (a.used !== b.used) return a.used ? 1 : -1;
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return a.used ? tb - ta : ta - tb;
  });
  const unusedCount = codes.filter(c => !c.used).length;
  const usedCount   = codes.filter(c =>  c.used).length;

  const handleAdd = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    try { await onAdd(input); setInput(''); } finally { setBusy(false); }
  };

  return (
    <div className="border border-white/10 rounded-lg p-4 bg-[#0a0a0a]">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3 className={`font-cinzel text-sm uppercase tracking-[0.3em] ${tier.toneClass}`}>
          {tier.label}
        </h3>
        <p className="text-xs text-neutral-500 font-lato">
          <span className="text-emerald-400">{unusedCount}</span> disponibles ·{' '}
          <span className="text-neutral-600">{usedCount}</span> utilisés
        </p>
      </div>

      {/* Bulk paste */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Collez les codes ici, un par ligne…"
          className="flex-1 bg-[#050505] border border-white/10 text-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#d4af37]/50 placeholder:text-neutral-700"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !input.trim()}
          className="px-4 self-start py-2 bg-[#d4af37] text-black text-xs font-cinzel font-bold uppercase tracking-wider hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors shrink-0"
        >
          {busy ? '…' : 'Ajouter'}
        </button>
      </div>

      {/* Codes list */}
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-neutral-700 italic text-xs">Aucun code dans la cagnotte.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {sorted.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs font-mono border ${
                c.used
                  ? 'border-white/5 bg-black/40 text-neutral-700 line-through'
                  : 'border-[#d4af37]/30 bg-[#1a1208]/40 text-[#f3e5ab]'
              }`}
              title={c.used ? `Utilisé par ${c.usedBy ?? '?'}` : 'Disponible'}
            >
              <span className="truncate">{c.value}</span>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-300 transition-all px-1"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Dashboard tile — small clickable stat card ─────────────────────────────
const DashboardTile: React.FC<{
  label: string;
  value: number | string;
  accent: string;
  onClick: () => void;
}> = ({ label, value, accent, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left p-5 border border-white/10 bg-[#0a0a0a] hover:border-[#c5a059]/40 hover:-translate-y-0.5 transition-all"
  >
    <p className="font-cinzel text-neutral-600 text-[9px] uppercase tracking-[0.4em] mb-2">{label}</p>
    <p className={`font-prata text-3xl ${accent}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
  </button>
);

// ─── Affiliate row — accept-with-code or refuse ──────────────────────────────
const AffiliateRow: React.FC<{
  aff: {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    status: 'waiting' | 'accepted' | 'refused';
    code?: string;
  };
  onDecide: (uid: string, status: 'accepted' | 'refused', code?: string) => Promise<void>;
}> = ({ aff, onDecide }) => {
  const [code, setCode] = useState(aff.code ?? '');
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try { await onDecide(aff.uid, 'accepted', code); } finally { setBusy(false); }
  };
  const refuse = async () => {
    setBusy(true);
    try { await onDecide(aff.uid, 'refused'); } finally { setBusy(false); }
  };
  const statusColor =
    aff.status === 'waiting'  ? 'text-amber-300 bg-amber-900/20 border-amber-700/40'
  : aff.status === 'accepted' ? 'text-emerald-300 bg-emerald-900/20 border-emerald-700/40'
  : 'text-red-300 bg-red-900/20 border-red-700/40';

  return (
    <div className="border border-white/8 bg-[#0a0a0a] p-4 flex flex-wrap items-center gap-4">
      {/* Avatar + identity */}
      <div className="flex items-center gap-3 min-w-[220px]">
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-cinzel text-[#f3e5ab]"
          style={{
            background: aff.photoURL ? `url(${aff.photoURL}) center/cover` : '#1f1810',
            border: '1px solid rgba(243,229,171,0.45)',
          }}
        >
          {!aff.photoURL && (aff.displayName?.[0] || aff.email?.[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-cinzel truncate">{aff.displayName || '—'}</p>
          <p className="text-neutral-600 text-[10px] font-lato truncate">{aff.email || '—'}</p>
        </div>
      </div>

      {/* Status pill */}
      <span className={`text-[10px] font-cinzel uppercase tracking-[0.3em] px-2.5 py-1 rounded-full border ${statusColor}`}>
        {aff.status === 'waiting' ? 'En attente' : aff.status === 'accepted' ? 'Approuvé' : 'Refusé'}
      </span>

      {/* Existing code (if accepted) */}
      {aff.status === 'accepted' && aff.code && (
        <span className="text-[#d4af37] font-prata tracking-[0.2em] text-base">{aff.code}</span>
      )}

      {/* Actions: accept-with-code or refuse */}
      {aff.status === 'waiting' && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={20}
            className="bg-[#141414] border border-white/10 text-[#f3e5ab] px-3 py-2 font-cinzel tracking-[0.2em] text-sm uppercase focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-700 w-32"
          />
          <button
            onClick={accept}
            disabled={busy || !code.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-cinzel text-[10px] uppercase tracking-widest transition-colors"
          >
            Approuver
          </button>
          <button
            onClick={refuse}
            disabled={busy}
            className="px-4 py-2 border border-red-700/40 hover:bg-red-950/30 disabled:opacity-40 text-red-300 font-cinzel text-[10px] uppercase tracking-widest transition-colors"
          >
            Refuser
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Wwoofing admin row ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<WwooferStatus, string> = {
  pending:  'border-yellow-400/50 text-yellow-300 bg-yellow-400/10',
  approved: 'border-green-400/50 text-green-300 bg-green-400/10',
  declined: 'border-red-400/50 text-red-300 bg-red-400/10',
};

const WwooferAdminRow: React.FC<{ profile: WwooferProfile }> = ({ profile }) => {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<WwooferVisitRequest[]>([]);
  const [messages, setMessages] = useState<WwooferMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !db) return;
    const unsub1 = onSnapshot(
      query(collection(db, 'wwoofers', profile.uid, 'visitRequests'), orderBy('createdAt', 'desc')),
      snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WwooferVisitRequest)),
      () => {},
    );
    const unsub2 = onSnapshot(
      query(collection(db, 'wwoofers', profile.uid, 'messages'), orderBy('createdAt', 'asc')),
      snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WwooferMessage)),
      () => {},
    );
    return () => { unsub1(); unsub2(); };
  }, [open, profile.uid]);

  const setProfileStatus = async (status: WwooferStatus) => {
    if (!db) return;
    await updateDoc(doc(db, 'wwoofers', profile.uid), { status, updatedAt: serverTimestamp() });
  };

  const decideRequest = async (reqId: string, status: WwooferStatus) => {
    if (!db) return;
    await updateDoc(doc(db, 'wwoofers', profile.uid, 'visitRequests', reqId), {
      status,
      decidedAt: serverTimestamp(),
      decidedByEmail: 'admin',
    });
  };

  const sendReply = async () => {
    if (!db) return;
    const trimmed = reply.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'wwoofers', profile.uid, 'messages'), {
        text: trimmed,
        fromAdmin: true,
        authorEmail: 'admin',
        createdAt: serverTimestamp(),
      });
      setReply('');
    } finally {
      setSending(false);
    }
  };

  const status = profile.status ?? 'pending';

  return (
    <div className="border border-white/10 bg-[#0a0a0a] rounded-lg">
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 text-left flex-1">
          <span className="text-neutral-500 text-xs">{open ? '▾' : '▸'}</span>
          <div>
            <div className="font-cinzel text-white text-sm">{profile.displayName}</div>
            <div className="text-[11px] text-neutral-500">{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-cinzel uppercase tracking-widest ${STATUS_BADGE[status]}`}>
            {status}
          </span>
          <button
            onClick={() => setProfileStatus('approved')}
            className={`px-2.5 py-1 text-[10px] font-cinzel uppercase tracking-widest border rounded-full transition-colors ${
              status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'border-white/10 text-neutral-500 hover:text-green-300'
            }`}
          >
            ✓ Approuver
          </button>
          <button
            onClick={() => setProfileStatus('declined')}
            className={`px-2.5 py-1 text-[10px] font-cinzel uppercase tracking-widest border rounded-full transition-colors ${
              status === 'declined' ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'border-white/10 text-neutral-500 hover:text-red-300'
            }`}
          >
            ✕ Refuser
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-400">
            {profile.city && <div><span className="text-neutral-600">Ville :</span> {profile.city}{profile.country ? `, ${profile.country}` : ''}</div>}
            {profile.age != null && <div><span className="text-neutral-600">Âge :</span> {profile.age}</div>}
            {profile.languages?.length ? <div><span className="text-neutral-600">Langues :</span> {profile.languages.join(', ')}</div> : null}
            {profile.preferredTasks?.length ? <div><span className="text-neutral-600">Tâches :</span> {profile.preferredTasks.join(', ')}</div> : null}
            {profile.accommodationPreference && <div><span className="text-neutral-600">Hébergement :</span> {profile.accommodationPreference}</div>}
            {profile.dietaryRestrictions && <div><span className="text-neutral-600">Diète :</span> {profile.dietaryRestrictions}</div>}
            {profile.allergies && <div><span className="text-neutral-600">Allergies :</span> {profile.allergies}</div>}
            {profile.healthNotes && <div className="md:col-span-2"><span className="text-neutral-600">Santé :</span> {profile.healthNotes}</div>}
            {profile.experience && <div className="md:col-span-2"><span className="text-neutral-600">Expérience :</span> {profile.experience}</div>}
            {profile.motivations && <div className="md:col-span-2 italic">"{profile.motivations}"</div>}
            {profile.needs && <div className="md:col-span-2"><span className="text-neutral-600">Besoins :</span> {profile.needs}</div>}
            {(profile.emergencyContactName || profile.emergencyContactPhone) && (
              <div className="md:col-span-2">
                <span className="text-neutral-600">Urgence :</span> {profile.emergencyContactName ?? '—'} {profile.emergencyContactPhone ? `(${profile.emergencyContactPhone})` : ''}
              </div>
            )}
          </div>

          <div>
            <div className="font-cinzel text-[11px] uppercase tracking-widest text-[#d4af37] mb-2">Demandes de visite</div>
            {requests.length === 0 ? (
              <div className="text-neutral-700 italic">Aucune demande.</div>
            ) : (
              <div className="space-y-2">
                {requests.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-black/40 border border-white/5 rounded p-2 flex-wrap gap-2">
                    <div className="text-neutral-300">
                      {r.startDate} → {r.endDate} · {r.numberOfDays} j
                      {r.notes ? <span className="text-neutral-500 italic"> · {r.notes}</span> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-cinzel uppercase tracking-widest ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                      <label className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <input
                          type="checkbox"
                          checked={r.status === 'approved'}
                          onChange={(e) => decideRequest(r.id, e.target.checked ? 'approved' : 'pending')}
                        />
                        Approuver
                      </label>
                      <button
                        onClick={() => decideRequest(r.id, 'declined')}
                        className="text-[10px] font-cinzel uppercase text-red-400/80 hover:text-red-300"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="font-cinzel text-[11px] uppercase tracking-widest text-[#d4af37] mb-2">Messages</div>
            <div className="bg-black/40 border border-white/5 rounded p-3 max-h-60 overflow-y-auto space-y-1.5 mb-2">
              {messages.length === 0 ? (
                <div className="text-neutral-700 italic">Aucun message.</div>
              ) : (
                messages.map(m => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] px-2 py-1.5 rounded text-[12px] ${
                      m.fromAdmin
                        ? 'bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#f3e5ab] ml-auto'
                        : 'bg-white/5 border border-white/10 text-neutral-200 mr-auto'
                    }`}
                  >
                    {m.text}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
                placeholder="Répondre…"
                className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="px-3 py-1.5 bg-[#d4af37] text-black text-[10px] font-cinzel font-bold uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
