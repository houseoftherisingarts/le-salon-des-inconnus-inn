import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LiquidGlassCycler } from './LiquidGlassCycler';
import { ContributionPanel } from './ContributionPanel';
import { ShowTicketModal } from './ShowTicketModal';
import type { MemberProfile } from './AuthModal';
import {
  EVENT_ID,
  PresenceTimeline,
  KanbanBoard,
  NeedsSection,
  CovoiturageSection,
  AbundanceSection,
  type CeilidhRegistration,
  type Carpool,
  type CeilidhNeed,
} from './CeilidhPage';

// ─────────────────────────────────────────────────────────────────────────────
// CeilidhPageTest2 — Avenue B: "Le Livret du Ceilidh"
// Cinematic chapter cards. 5 large landscape covers stack vertically; click
// expands a chapter to fullscreen with its dense interactive content. A bottom
// dock shows the 5 chapter seals — gold-filled when complete, hollow when not.
//
// This is a DESIGN PREVIEW: only chapter 01 (L'Événement) is fully fleshed out;
// the other four show a tasteful "Preview" panel so the mechanism reads.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange?: (user: User | null, profile?: MemberProfile | null) => void;
  onShowPrivacy?: () => void;
  onViewProfile?: (uid: string) => void;
}

type ChapterStatus = 'locked' | 'inprogress' | 'done';

interface Chapter {
  id: string;
  num: string;
  titleEn: string;
  titleFr: string;
  taglineEn: string;
  taglineFr: string;
  image: string;
  status: ChapterStatus;
}

const HERO_IMAGES = [
  'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg',
  'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg',
  'https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg',
];

const CHAPTERS: Chapter[] = [
  {
    id: 'event',
    num: '01',
    titleEn: 'The Event',
    titleFr: "L'Événement",
    taglineEn: 'May 21–25, 2026 · Maison Favier',
    taglineFr: '21–25 mai 2026 · Maison Favier',
    image: 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg',
    status: 'inprogress',
  },
  {
    id: 'programme',
    num: '02',
    titleEn: 'Programme',
    titleFr: 'Programme',
    taglineEn: '5 days · 30+ shared moments',
    taglineFr: '5 jours · 30+ moments partagés',
    image: 'https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg',
    status: 'inprogress',
  },
  {
    id: 'teams',
    num: '03',
    titleEn: 'The Teams',
    titleFr: 'Les Équipes',
    taglineEn: '8 teams · pick yours',
    taglineFr: '8 équipes · choisissez la vôtre',
    image: 'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg',
    status: 'inprogress',
  },
  {
    id: 'lodging',
    num: '04',
    titleEn: 'Lodging',
    titleFr: 'Hébergement',
    taglineEn: '11 spaces · 50 sleeping spots',
    taglineFr: '11 espaces · 50 couchages',
    image: 'https://storage.googleapis.com/salondesinconnus/inn/yourte.png',
    status: 'done',
  },
  {
    id: 'practical',
    num: '05',
    titleEn: 'Practical',
    titleFr: 'Pratique',
    taglineEn: 'How to get here · what to bring',
    taglineFr: 'Comment venir · quoi apporter',
    image: 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg',
    status: 'inprogress',
  },
];

const STATUS_COPY: Record<ChapterStatus, { en: string; fr: string; color: string }> = {
  locked:     { en: 'Locked',      fr: 'Verrouillé',     color: '#5a4a36' },
  inprogress: { en: 'In Progress', fr: 'En cours',       color: '#c5a059' },
  done:       { en: 'Complete',    fr: 'Complété',       color: '#3a7d44' },
};

// ─────────────────────────────────────────────────────────────────────────────

export const CeilidhPageTest2: React.FC<Props> = ({
  language, onNavigate, user, memberProfile, onViewProfile,
}) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // ── Live data — registrations / carpools / needs all subscribed via onSnapshot.
  // Drives the team rosters (who is in each team), the PresenceTimeline (who comes
  // when), and the carpool/needs panels in Pratique.
  const [registrations, setRegistrations] = useState<CeilidhRegistration[]>([]);
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [needs, setNeeds] = useState<CeilidhNeed[]>([]);

  useEffect(() => {
    const unsubReg = onSnapshot(
      collection(db, `events/${EVENT_ID}/registrations`),
      (snap) => setRegistrations(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }))),
    );
    const unsubCar = onSnapshot(
      collection(db, `events/${EVENT_ID}/carpools`),
      (snap) => setCarpools(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    const unsubNeeds = onSnapshot(
      collection(db, `events/${EVENT_ID}/needs`),
      (snap) => setNeeds(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    return () => { unsubReg(); unsubCar(); unsubNeeds(); };
  }, []);

  // Build a map: teamId → list of registrants on that team (primary or support).
  // Dedupe per (uid + teamId) so a user with both a primary and a support entry
  // for the same team appears once — primary wins. Without this, React warns about
  // duplicate keys.
  const teamRoster = useMemo(() => {
    const byTeam = new Map<string, Map<string, { uid: string; name: string; photoURL?: string; role: 'primary' | 'support' }>>();
    registrations.forEach((reg) => {
      (reg.teams || []).forEach((mem: any) => {
        if (!mem?.teamId) return;
        const teamMap = byTeam.get(mem.teamId) || new Map();
        const role: 'primary' | 'support' = mem.isSupport ? 'support' : 'primary';
        const existing = teamMap.get(reg.uid);
        if (!existing || (existing.role === 'support' && role === 'primary')) {
          teamMap.set(reg.uid, {
            uid: reg.uid,
            name: reg.displayName || reg.email || '—',
            photoURL: reg.photoURL,
            role,
          });
        }
        byTeam.set(mem.teamId, teamMap);
      });
    });
    const out = new Map<string, { uid: string; name: string; photoURL?: string; role: 'primary' | 'support' }[]>();
    byTeam.forEach((v, k) => out.set(k, [...v.values()]));
    return out;
  }, [registrations]);

  // Auth gate — first chapter open + locked-chapter taps both prompt for login.
  // If the user is signed in via Firebase, skip the modal entirely.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!user);
  useEffect(() => { if (user) setIsLoggedIn(true); }, [user]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const chapters: Chapter[] = isLoggedIn
    ? CHAPTERS.map((c) => (c.status === 'locked' ? { ...c, status: 'inprogress' as ChapterStatus } : c))
    : CHAPTERS;

  const activeChapter = openId ? chapters.find((c) => c.id === openId) : null;
  const showLoginModal = pendingId !== null && !isLoggedIn;

  // Click intent from a chapter card OR a dock dot. Centralises the auth gate.
  const handleChapterIntent = (id: string) => {
    if (!isLoggedIn) {
      // Any intent — including locked — triggers login the first time.
      setPendingId(id);
      return;
    }
    const target = chapters.find((c) => c.id === id);
    if (!target || target.status === 'locked') return;
    setOpenId(id);
  };

  const handleLoginConfirm = () => {
    setIsLoggedIn(true);
    // Open whatever they were heading toward (provided it's not still locked).
    if (pendingId) {
      const target = CHAPTERS.find((c) => c.id === pendingId);
      // After login the locked status becomes inprogress in `chapters`, so we open.
      if (target) setOpenId(pendingId);
    }
    setPendingId(null);
  };
  const handleLoginCancel = () => setPendingId(null);

  // ESC closes the open chapter
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  // Lock body scroll when chapter is open
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.style.overflowY = openId ? 'hidden' : 'auto';
  }, [openId]);

  const completeCount = chapters.filter((c) => c.status === 'done').length;
  const inProgressCount = chapters.filter((c) => c.status === 'inprogress').length;

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-[#050505] text-white overflow-y-auto custom-scrollbar selection:bg-[#c5a059] selection:text-black"
      data-ceilidh-test2
    >
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[640px] overflow-hidden">
        <div className="absolute inset-0 ceilidh2-kenburns">
          <LiquidGlassCycler images={HERO_IMAGES} intervalMs={6000} />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(5,5,5,0.35) 0%, rgba(5,5,5,0.15) 30%, rgba(5,5,5,0.7) 78%, rgba(5,5,5,0.95) 100%)',
          }}
        />
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col justify-end pb-20 md:pb-28">
          <div className="ceilidh2-eyebrow flex items-center gap-4 mb-5">
            <button
              onClick={() => onNavigate('INN')}
              className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] hover:text-[#f3e5ab] transition-colors"
            >
              ← {t('Back to the Inn', "Retour à l'auberge")}
            </button>
          </div>
          <div className="ceilidh2-eyebrow flex items-center gap-3 mb-5">
            <div className="ceilidh2-rule h-px bg-[#f3e5ab]" />
            <span
              className="font-cinzel text-[#f3e5ab] text-[10px] md:text-xs uppercase tracking-[0.55em]"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              {t('21 — 25 May 2026 · Maison Favier · Namur, QC', '21 — 25 mai 2026 · Maison Favier · Namur, QC')}
            </span>
          </div>
          <h1
            className="ceilidh2-title font-prata uppercase leading-[0.86] tracking-[-0.015em] text-[#f3e5ab] mb-6"
            style={{
              fontSize: 'clamp(3rem, 11vw, 11rem)',
              textShadow: '0 6px 40px rgba(0,0,0,0.7)',
            }}
          >
            {t('The Grand', 'Le Grand')}<br />Ceilidh
          </h1>
          <p
            className="ceilidh2-tagline font-josefin text-neutral-200 max-w-2xl uppercase mb-10"
            style={{ letterSpacing: '0.18em', fontSize: 'clamp(0.85rem, 1.1vw, 1.05rem)', textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
          >
            {t(
              'Five days of art, work, food, and gathering — open the chapters below to step in.',
              "Cinq jours d'art, de travail, de cuisine et de rassemblement — ouvrez les chapitres ci-dessous pour entrer.",
            )}
          </p>
          <div className="ceilidh2-ctas flex flex-wrap items-center gap-3">
            <a
              href="#livret"
              className="px-10 py-4 bg-[#c5a059] text-[#18181b] font-josefin font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all"
              style={{ boxShadow: '0 6px 24px rgba(197,160,89,0.35)' }}
            >
              {t('Open the Booklet', 'Ouvrir le livret')}
            </a>
            <span className="font-cinzel text-neutral-400 text-[10px] uppercase tracking-[0.4em]">
              {completeCount} / 5 {t('chapters', 'chapitres')}
            </span>
          </div>
        </div>

        {/* Scroll cue — bottom-centered, fades in last */}
        <div className="ceilidh2-scroll absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10" aria-hidden>
          <span className="text-[#f3e5ab]/60 font-cinzel text-[9px] uppercase tracking-[0.5em]">
            {t('Scroll', 'Défiler')}
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-[#f3e5ab]/60 to-transparent ceilidh2-scroll-line" />
        </div>
      </section>

      {/* ── LIVRET — chapter stack ──────────────────────────────────────── */}
      <section id="livret" className="cv-auto relative bg-[#050505] py-20 md:py-28 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1400px] mx-auto">
          {/* Editorial header — restored to the centred full-width treatment.
              Progress lives in the persistent bottom dock so the title doesn't have to share. */}
          <div className="text-center mb-12 md:mb-20">
            <span className="font-cinzel text-[#c5a059] text-[10px] md:text-xs uppercase tracking-[0.55em] block mb-4">
              {t('The Booklet', 'Le Livret')}
            </span>
            <h2
              className="font-prata uppercase text-[#f3e5ab] leading-[0.9] tracking-[-0.01em] mb-5"
              style={{ fontSize: 'clamp(2.75rem, 8.5vw, 8rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
              {t('Five Chapters', 'Cinq Chapitres')}
            </h2>
            <p className="font-josefin text-neutral-400 text-xs md:text-sm uppercase tracking-[0.35em] max-w-xl mx-auto">
              {t(
                'Tap any chapter to step into it.',
                'Touchez un chapitre pour y entrer.',
              )}
            </p>
          </div>

          {/* Chapter cards stack */}
          <div className="space-y-10 md:space-y-14">
            {chapters.map((c, i) => (
              <ChapterCard
                key={c.id}
                chapter={c}
                index={i}
                language={language}
                onOpen={() => handleChapterIntent(c.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer spacer so the dock doesn't overlap the last chapter */}
      <div className="h-32 bg-[#050505]" />

      {/* ── PERSISTENT PROGRESS DOCK ────────────────────────────────────── */}
      <ProgressDock
        chapters={chapters}
        activeId={openId}
        completeCount={completeCount}
        inProgressCount={inProgressCount}
        language={language}
        onJump={handleChapterIntent}
      />

      {/* ── FULLSCREEN CHAPTER OVERLAY ──────────────────────────────────── */}
      {activeChapter && (() => {
        // Compute the next chapter in sequence, if any. Used by the in-chapter
        // "Continue → Chapter NN" button so the user can flow through the booklet
        // without bouncing back to the stack between every step.
        const idx = chapters.findIndex((c) => c.id === activeChapter.id);
        const nextChapter = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
        return (
          <ChapterFullscreen
            chapter={activeChapter}
            nextChapter={nextChapter}
            language={language}
            onClose={() => setOpenId(null)}
            onNext={nextChapter ? () => setOpenId(nextChapter.id) : null}
            user={user}
            memberProfile={memberProfile}
            registrations={registrations}
            teamRoster={teamRoster}
            carpools={carpools}
            needs={needs}
            onRequireAuth={() => setPendingId(activeChapter.id)}
            onViewProfile={onViewProfile}
            onNavigate={onNavigate}
          />
        );
      })()}

      {/* ── LOGIN GATE — shown for first chapter open + locked taps ─────── */}
      {showLoginModal && (
        <LoginModal
          chapter={CHAPTERS.find((c) => c.id === pendingId) ?? null}
          language={language}
          onConfirm={handleLoginConfirm}
          onCancel={handleLoginCancel}
        />
      )}

      {/* Page styles */}
      <style>{`
        .ceilidh2-eyebrow { opacity: 0; animation: c2FadeUp 0.7s ease-out 0.1s forwards; }
        .ceilidh2-rule    { width: 0;  animation: c2RuleGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s forwards; }
        @keyframes c2RuleGrow { to { width: 64px; } }
        .ceilidh2-title   { opacity: 0; transform: translate3d(0, 32px, 0); animation: c2TitleIn 1.2s cubic-bezier(0.22,1,0.36,1) 0.7s forwards; }
        @keyframes c2TitleIn { to { opacity: 1; transform: translate3d(0,0,0); } }
        .ceilidh2-tagline { opacity: 0; animation: c2FadeUp 0.9s ease-out 1.1s forwards; }
        .ceilidh2-ctas    { opacity: 0; animation: c2FadeUp 0.7s ease-out 1.35s forwards; }
        @keyframes c2FadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        /* Hero Ken Burns */
        .ceilidh2-kenburns { animation: c2KenBurns 22s ease-in-out infinite alternate; }
        @keyframes c2KenBurns {
          0%   { transform: scale(1.02) translate3d(0, 0, 0); }
          100% { transform: scale(1.09) translate3d(-1%, -0.5%, 0); }
        }

        /* Chapter card lift + gold edge on hover */
        .chapter-card {
          transition: transform 0.7s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease, border-color 0.5s ease;
        }
        .chapter-card:not(.is-locked):hover {
          transform: translateY(-8px);
          border-color: rgba(243,229,171,0.55) !important;
          box-shadow: 0 36px 100px rgba(0,0,0,0.6), 0 0 80px rgba(197,160,89,0.18);
        }
        .chapter-card.is-locked { cursor: not-allowed; }
        .chapter-card.is-locked:hover { transform: none; }

        /* Cover photo subtle zoom + grade on hover */
        .chapter-card .cover-photo {
          transition: transform 1.2s cubic-bezier(0.22,1,0.36,1), filter 0.6s ease;
        }
        .chapter-card:not(.is-locked):hover .cover-photo {
          transform: scale(1.05);
          filter: brightness(1.05) saturate(1.08);
        }

        /* CTA pill — arrow slides on hover */
        .chapter-card .card-cta { transition: background 0.4s ease, border-color 0.4s ease; }
        .chapter-card:not(.is-locked):hover .card-cta {
          background: rgba(197,160,89,0.85);
          color: #1a1208;
          border-color: rgba(243,229,171,0.7);
        }
        .chapter-card .card-cta-arrow { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); }
        .chapter-card:not(.is-locked):hover .card-cta-arrow { transform: translateX(4px); }

        /* Hero scroll cue */
        .ceilidh2-scroll      { opacity: 0; animation: c2FadeIn 0.9s ease-out 1.7s forwards; }
        .ceilidh2-scroll-line { animation: c2ScrollPulse 2.4s ease-in-out infinite; }
        @keyframes c2ScrollPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.6); transform-origin: top; }
          50%      { opacity: 1;   transform: scaleY(1);   transform-origin: top; }
        }
        @keyframes c2FadeIn { to { opacity: 1; } }

        /* Magazine essay — Ceilidh / Woofing block.
           Two-column justified body, ornament-flanked titles, gilded drop cap. */
        .essay-spread .essay-rule {
          width: 80px; height: 1px;
          background: linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent);
        }
        .essay-spread .essay-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.9rem;
          font-size: 11px;
          margin-bottom: 1.4rem;
        }
        .essay-spread .essay-title-text { padding: 0 0.5rem; }
        .essay-spread .essay-ornament {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 1.1rem;
          color: rgba(212,175,55,0.55);
          letter-spacing: 0;
        }
        .essay-spread .essay-body {
          column-count: 1;
          column-gap: 2.5rem;
          column-rule: 1px solid rgba(197,160,89,0.18);
          text-align: justify;
          hyphens: auto;
          font-size: 0.95rem;
          line-height: 1.75;
        }
        @media (min-width: 768px) {
          .essay-spread .essay-body { column-count: 2; font-size: 1rem; }
        }
        /* Drop cap (enluminure) — floated so the body wraps; Cormorant Garamond
           Bold Italic in gold with a soft glow, like an old folio. */
        .essay-spread .essay-dropcap {
          float: left;
          font-family: 'Cormorant Garamond', 'MedievalSharp', serif;
          font-style: italic;
          font-weight: 700;
          font-size: 4.2em;
          line-height: 0.85;
          padding: 0.08em 0.16em 0 0;
          margin-top: 0.05em;
          color: #d4af37;
          text-shadow: 0 2px 16px rgba(212,175,55,0.32);
        }
        .essay-spread .essay-block { break-inside: avoid; }

        /* Progress dock */
        .dock-seal {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s ease, box-shadow 0.4s ease;
        }
        .dock-seal:hover { transform: scale(1.15); }
        .dock-seal.active {
          transform: scale(1.3);
          box-shadow: 0 0 24px rgba(243, 229, 171, 0.65);
        }

        /* Fullscreen overlay enter */
        .chapter-fullscreen {
          animation: c2OverlayIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes c2OverlayIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        @media (prefers-reduced-motion: reduce) {
          .ceilidh2-eyebrow, .ceilidh2-rule, .ceilidh2-title, .ceilidh2-tagline, .ceilidh2-ctas,
          .ceilidh2-scroll, .ceilidh2-scroll-line {
            opacity: 1 !important; transform: none !important; animation: none !important;
          }
          .ceilidh2-rule    { width: 64px !important; }
          .ceilidh2-kenburns { animation: none !important; transform: scale(1.02) !important; }
          .chapter-fullscreen { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ChapterCard — large landscape cover with title + status seal
// ─────────────────────────────────────────────────────────────────────────────

const ChapterCard: React.FC<{
  chapter: Chapter;
  index: number;
  language: 'EN' | 'FR';
  onOpen: () => void;
}> = ({ chapter, index, language, onOpen }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const isLocked = chapter.status === 'locked';
  const status = STATUS_COPY[chapter.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isLocked}
      className={`chapter-card relative w-full block text-left overflow-hidden ${isLocked ? 'is-locked' : ''}`}
      style={{
        height: 'clamp(440px, 56vw, 720px)',
        borderRadius: '20px',
        border: '1px solid rgba(197,160,89,0.25)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        background: '#0a0807',
      }}
      aria-label={`${chapter.num} · ${language === 'EN' ? chapter.titleEn : chapter.titleFr}`}
    >
      {/* Cover photo */}
      <img
        src={chapter.image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="cover-photo absolute inset-0 w-full h-full object-cover"
        style={{ borderRadius: '20px', filter: isLocked ? 'grayscale(0.6) brightness(0.55)' : undefined }}
      />
      {/* Bottom-up gradient for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: '20px',
          background:
            'linear-gradient(180deg, rgba(8,6,4,0.35) 0%, rgba(8,6,4,0.05) 30%, rgba(8,6,4,0.7) 78%, rgba(8,6,4,0.92) 100%)',
        }}
      />
      {/* Top-left gold light wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: '20px',
          background: 'radial-gradient(ellipse 70% 50% at 22% 12%, rgba(243,229,171,0.18) 0%, transparent 65%)',
        }}
      />

      {/* Editorial stencil chapter number — giant, sits at top-left as a graphic mark.
          Pointer-events:none so the underlying button still receives clicks. */}
      <span
        aria-hidden
        className="absolute top-4 md:top-6 left-5 md:left-10 z-10 font-prata text-[#c5a059] leading-none pointer-events-none"
        style={{
          fontSize: 'clamp(4.5rem, 10.5vw, 11rem)',
          opacity: isLocked ? 0.5 : 0.95,
          letterSpacing: '-0.05em',
          textShadow: '0 8px 36px rgba(0,0,0,0.75), 0 0 100px rgba(197,160,89,0.22)',
        }}
      >
        {chapter.num}
      </span>
      {/* "Chapitre" eyebrow + status seal — top-right corner */}
      <div className="absolute top-5 md:top-7 right-5 md:right-7 z-10 flex items-center gap-3">
        <span className="font-cinzel text-[#f3e5ab]/70 text-[9px] uppercase tracking-[0.5em] hidden md:inline">
          {t('Chapter', 'Chapitre')}
        </span>
        <StatusSeal status={chapter.status} language={language} />
      </div>

      {/* Bottom: title + tagline + CTA */}
      <div className="absolute bottom-6 md:bottom-9 left-6 md:left-10 right-6 md:right-10 z-10">
        <h3
          className="font-prata uppercase text-[#f3e5ab] leading-[0.86] tracking-[-0.012em] mb-3"
          style={{ fontSize: 'clamp(2.4rem, 6.5vw, 6.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.7)' }}
        >
          {language === 'EN' ? chapter.titleEn : chapter.titleFr}
        </h3>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p
            className="font-josefin text-neutral-200 uppercase max-w-xl"
            style={{ fontSize: 'clamp(0.72rem, 0.95vw, 0.9rem)', letterSpacing: '0.28em', textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
          >
            {language === 'EN' ? chapter.taglineEn : chapter.taglineFr}
          </p>
          {!isLocked && (
            <span
              className="card-cta inline-flex items-center gap-3 font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em] px-4 py-2 rounded-full"
              style={{
                background: 'rgba(8,6,4,0.55)',
                border: '1px solid rgba(243,229,171,0.35)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {t('Enter', 'Entrer')}
              <span className="card-cta-arrow" aria-hidden>→</span>
            </span>
          )}
        </div>
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-full bg-black/60 border border-[#c5a059]/30 backdrop-blur">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">
              {t('Locked · Sign in', 'Verrouillé · Connectez-vous')}
            </span>
          </div>
        </div>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatusSeal — small badge in the corner of each chapter card
// ─────────────────────────────────────────────────────────────────────────────

const StatusSeal: React.FC<{ status: ChapterStatus; language: 'EN' | 'FR' }> = ({ status, language }) => {
  const meta = STATUS_COPY[status];

  // "Done" = a real gold seal — circular, filled, with a check. Feels rewarding,
  // visually distinct from in-progress / locked which share a dot+pill pattern.
  if (status === 'done') {
    return (
      <div
        className="flex items-center justify-center"
        aria-label={language === 'EN' ? meta.en : meta.fr}
        title={language === 'EN' ? meta.en : meta.fr}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 25%, #f3e5ab 0%, #c5a059 55%, #8b6e3a 100%)',
          border: '2px solid rgba(243,229,171,0.7)',
          boxShadow:
            '0 6px 24px rgba(197,160,89,0.6), 0 0 40px rgba(197,160,89,0.25), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 8px rgba(0,0,0,0.32)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M3.5 9.5 L7 13 L14.5 5"
            stroke="#1a1208"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(8, 6, 4, 0.7)',
        border: `1px solid ${meta.color}55`,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: meta.color,
          boxShadow: status === 'inprogress' ? `0 0 10px ${meta.color}` : undefined,
          animation: status === 'inprogress' ? 'c2SealPulse 2.2s ease-in-out infinite' : undefined,
        }}
        aria-hidden
      />
      <span
        className="font-cinzel uppercase tracking-[0.35em] text-[9px]"
        style={{ color: meta.color }}
      >
        {language === 'EN' ? meta.en : meta.fr}
      </span>
      <style>{`
        @keyframes c2SealPulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%      { transform: scale(1.45); opacity: 0.55; }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProgressDock — persistent bottom strip with 5 seals
// ─────────────────────────────────────────────────────────────────────────────

const ProgressDock: React.FC<{
  chapters: Chapter[];
  activeId: string | null;
  completeCount: number;
  inProgressCount: number;
  language: 'EN' | 'FR';
  onJump: (id: string) => void;
}> = ({ chapters, activeId, completeCount, inProgressCount, language, onJump }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[300] px-4 pb-4 md:pb-6 pointer-events-none"
      aria-label={t('Progress', 'Progression')}
    >
      <div
        className="mx-auto max-w-3xl flex items-center gap-4 px-6 py-4 pointer-events-auto"
        style={{
          background: 'rgba(8, 6, 4, 0.85)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          border: '1px solid rgba(197,160,89,0.3)',
          borderRadius: '999px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}
      >
        <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] whitespace-nowrap hidden md:inline">
          {completeCount}/5 {t('done', 'fait')}
        </span>
        <div className="flex items-center gap-3 flex-1 justify-center">
          {chapters.map((c) => {
            const isActive = c.id === activeId;
            const meta = STATUS_COPY[c.status];
            const filled = c.status === 'done';
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onJump(c.id)}
                className={`dock-seal ${isActive ? 'active' : ''}`}
                aria-label={`${c.num} · ${language === 'EN' ? c.titleEn : c.titleFr}`}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: filled ? meta.color : 'transparent',
                  border: `1.5px solid ${meta.color}`,
                  cursor: c.status === 'locked' ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="sr-only">{c.titleEn}</span>
              </button>
            );
          })}
        </div>
        <span className="font-cinzel text-[#c5a059]/60 text-[10px] uppercase tracking-[0.4em] hidden md:inline">
          {inProgressCount} {t('open', 'en cours')}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ChapterFullscreen — fullscreen overlay with chapter content
// Only chapter 'event' is fully fleshed out; others show a Preview placeholder.
// ─────────────────────────────────────────────────────────────────────────────

const ChapterFullscreen: React.FC<{
  chapter: Chapter;
  nextChapter: Chapter | null;
  language: 'EN' | 'FR';
  onClose: () => void;
  onNext: (() => void) | null;
  user: User | null;
  memberProfile: MemberProfile | null;
  registrations: CeilidhRegistration[];
  teamRoster: Map<string, { uid: string; name: string; photoURL?: string; role: 'primary' | 'support' }[]>;
  carpools: Carpool[];
  needs: CeilidhNeed[];
  onRequireAuth: () => void;
  onViewProfile?: (uid: string) => void;
  onNavigate: (view: string) => void;
}> = ({
  chapter, nextChapter, language, onClose, onNext,
  user, memberProfile, registrations, teamRoster, carpools, needs,
  onRequireAuth, onViewProfile, onNavigate,
}) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  return (
    <div
      className="chapter-fullscreen fixed inset-0 z-[60] bg-[#050505] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`${chapter.num} · ${language === 'EN' ? chapter.titleEn : chapter.titleFr}`}
    >
      {/* Fixed close — pinned to the viewport, NOT to the scrollable content,
          so it's always reachable no matter how far down the user scrolls inside the chapter. */}
      <button
        onClick={onClose}
        className="fixed top-5 right-5 md:top-6 md:right-6 z-[70] w-12 h-12 rounded-full flex items-center justify-center font-cinzel text-[#f3e5ab] hover:bg-black/60 transition-colors"
        style={{
          background: 'rgba(8,6,4,0.75)',
          border: '1px solid rgba(197,160,89,0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          fontSize: '20px',
        }}
        aria-label={t('Close', 'Fermer')}
      >
        ✕
      </button>
      {/* Cover hero — full-bleed photo */}
      <section className="relative h-[60vh] min-h-[460px] overflow-hidden">
        <img
          src={chapter.image}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.2) 30%, rgba(5,5,5,0.7) 80%, #050505 100%)',
          }}
        />
        {/* (X close moved out of the cover section — see fixed close button below the body) */}
        {/* Title block */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 h-full flex flex-col justify-end pb-12 md:pb-16">
          <div className="flex items-baseline gap-4 mb-4">
            <span
              className="font-prata text-[#c5a059] leading-none"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 3rem)' }}
            >
              {chapter.num}
            </span>
            <span className="font-cinzel text-[#f3e5ab]/70 text-[10px] uppercase tracking-[0.5em]">
              {t('Chapter', 'Chapitre')} · {language === 'EN' ? STATUS_COPY[chapter.status].en : STATUS_COPY[chapter.status].fr}
            </span>
          </div>
          <h2
            className="font-prata uppercase text-[#f3e5ab] leading-[0.86] tracking-[-0.015em] mb-3"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 8rem)', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}
          >
            {language === 'EN' ? chapter.titleEn : chapter.titleFr}
          </h2>
          <p
            className="font-josefin text-neutral-200 uppercase max-w-2xl"
            style={{ fontSize: 'clamp(0.8rem, 1vw, 1rem)', letterSpacing: '0.22em' }}
          >
            {language === 'EN' ? chapter.taglineEn : chapter.taglineFr}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-[1100px] mx-auto px-6 md:px-12 py-16 md:py-24">
        {chapter.id === 'event'      && <EventChapterBody     language={language} />}
        {chapter.id === 'programme'  && <ProgrammeChapterBody language={language} />}
        {chapter.id === 'teams'      && (
          <TeamsChapterBody
            language={language}
            user={user}
            teamRoster={teamRoster}
            registrations={registrations}
            onViewProfile={onViewProfile}
          />
        )}
        {chapter.id === 'lodging'    && (
          <LodgingChapterBody
            language={language}
            registrations={registrations}
            onViewProfile={onViewProfile}
          />
        )}
        {chapter.id === 'practical'  && (
          <PracticalChapterBody
            language={language}
            user={user}
            memberProfile={memberProfile}
            carpools={carpools}
            needs={needs}
            onRequireAuth={onRequireAuth}
            onViewProfile={onViewProfile}
            onNavigate={onNavigate}
          />
        )}
        {/* End-of-chapter nav — primary "continue" button drives flow through the
            booklet; secondary "close" returns to the stack. On the last chapter
            the next button is hidden and only close remains. */}
        <div className="mt-20 md:mt-24 flex flex-col items-center gap-6">
          {nextChapter && onNext && (
            <button
              onClick={onNext}
              className="next-chapter-cta group relative flex items-center justify-between gap-6 md:gap-10 w-full max-w-2xl px-7 md:px-9 py-5 md:py-6 rounded-2xl text-left overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(50,40,22,0.9) 0%, rgba(28,22,12,0.95) 100%)',
                border: '1px solid rgba(197,160,89,0.45)',
                boxShadow: '0 18px 60px rgba(0,0,0,0.55), 0 0 60px rgba(197,160,89,0.12)',
                transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease, border-color 0.5s ease',
              }}
              aria-label={`${t('Continue to', 'Continuer vers')} ${nextChapter.num} · ${language === 'EN' ? nextChapter.titleEn : nextChapter.titleFr}`}
            >
              <div className="flex-1 min-w-0">
                <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-2">
                  {t('Next chapter', 'Chapitre suivant')} · {nextChapter.num}
                </span>
                <h4
                  className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em]"
                  style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
                >
                  {language === 'EN' ? nextChapter.titleEn : nextChapter.titleFr}
                </h4>
                <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.3em] mt-2 truncate">
                  {language === 'EN' ? nextChapter.taglineEn : nextChapter.taglineFr}
                </p>
              </div>
              <span
                aria-hidden
                className="next-chapter-arrow shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full font-prata text-[#1a1208]"
                style={{
                  background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                  boxShadow: '0 6px 20px rgba(197,160,89,0.45)',
                  fontSize: '20px',
                }}
              >
                →
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] hover:text-[#f3e5ab] transition-colors"
          >
            ← {nextChapter ? t('Close chapter', 'Fermer le chapitre') : t('Back to the booklet', 'Retour au livret')}
          </button>
        </div>
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Shared atoms used by every chapter body
// ─────────────────────────────────────────────────────────────────────────

const SectionEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-3">
    {children}
  </span>
);

const cardSurface: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.8) 100%)',
  border: '1px solid rgba(197,160,89,0.2)',
  borderRadius: '16px',
};

const cardSurfaceActive: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(50,40,22,0.85) 0%, rgba(28,22,12,0.95) 100%)',
  border: '1px solid rgba(243,229,171,0.7)',
  borderRadius: '16px',
  boxShadow: '0 0 60px rgba(197,160,89,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
};

// L'Événement — HMS countdown + the verbatim 4-block Ceilidh essay (sourced
// from CeilidhPage.tsx lines 2801–2820). Don't paraphrase the essay text —
// it's the author's voice and changes have to come from her, not from copy edits.
const CEILIDH_ESSAY: { titleEn: string; titleFr: string; textEn: string; textFr: string }[] = [
  {
    titleEn: 'What is Woofing?',
    titleFr: "C'est quoi le Woofing ?",
    textEn: 'Traditionally, Woofing is the practice of volunteering on organic farms, or spaces linked to sustainable agriculture, intentional community, or art — in exchange for food and lodging. It is a cultural exchange and sharing experience that lets volunteers (called woofers) discover alternative lifestyles, travel without monetary cost, learn environmentally respectful practices, and participate in a collective project.',
    textFr: "Traditionnellement, le Woofing est une pratique qui consiste à travailler bénévolement dans des fermes biologiques, ou des lieux liés à l'agriculture durable, à la communauté intentionnelle ou à l'art, en échange du gîte et du couvert. C'est une expérience d'échange culturel et de partage, qui permet aux bénévoles (appelés woofers) de découvrir des modes de vie alternatifs, de voyager sans frais monétaires, d'apprendre des pratiques agricoles respectueuses de l'environnement, et de participer à un projet collectif.",
  },
  {
    titleEn: 'A Bit of History',
    titleFr: "Un peu d'histoire",
    textEn: 'Community work calls have existed for a long time — moments where people unite to help a collective project, share know-how, and strengthen human bonds around a common goal. Many cultures had forms of communal work and mutual aid, because great tasks could not be accomplished alone. People took turns giving each other "big pushes" throughout the year.',
    textFr: 'Les appels communautaires de corvées existent depuis longtemps. Ce sont des moments où l\u2019on s\u2019unit pour aider un projet collectif, partager des savoir-faire, et renforcer les liens humains autour d\u2019un objectif commun. Plusieurs cultures avaient des formes de travail commun et d\u2019entraide car, les gros travaux ne pouvant s\u2019accomplir seul, les gens se relayaient pour donner des "gros coups" dans l\u2019année.',
  },
  {
    titleEn: 'Bringing Back the Working Ceilidh',
    titleFr: 'Ramener le "Ceilidh" Travailleur',
    textEn: 'Ceilidh (pronounced "kay-lee") is a Gaelic word from the Scottish tradition. While today mainly associated with festive gatherings with music, dance, and stories, it once had a utilitarian dimension. Rural communities organized these gatherings to harvest, build homes and barns, or card wool — followed by celebrations that strengthened community bonds and made the hard work feel worthwhile.',
    textFr: 'Ceilidh (prononcé "kay-lee") est un mot gaélique qui désigne une tradition Écossaise. Bien que le ceilidh soit aujourd\u2019hui principalement associé à des rassemblements festifs avec de la musique, de la danse et des histoires, il avait autrefois une dimension utilitaire. Les communautés rurales organisaient ces rencontres pour accomplir des tâches collectives — récolter les moissons, construire ou réparer des maisons et des granges, fileter la laine. Ces moments de travail étaient suivis de célébrations, renforçant les liens communautaires et rendant le travail moins pénible.',
  },
  {
    titleEn: 'Our Version',
    titleFr: 'Une version Inconnue',
    textEn: 'We decided to organize a Grand Woofing and add our own flavour — dinner, shows, jam sessions, and games — bringing it closer to the traditional Ceilidh. All weekend we will work together to beautify and support this place, and each evening we will celebrate with a convivial dinner followed by a show and a jam.\n\nThe Grand Ceilidh de Mai is an occasion to contribute to a community call, to support a place, an idea, a vision and good-hearted people. You are welcome whether you come from far away or are local. Join us for a moment of sharing, joy, and collaboration!',
    textFr: 'Cette année, nous avons décidé d\u2019organiser un Grand Woofing et d\u2019enjoliver à notre sauce le concept en ajoutant souper, spectacle, jam et jeux, le rapprochant du Ceilidh traditionnel. Pendant tout un weekend, nous travaillerons ensemble pour embellir et soutenir le lieu, et chaque soir, nous célébrerons avec un souper convivial suivi d\u2019un spectacle et d\u2019un jam musical.\n\nLe Grand Ceilidh de Mai, c\u2019est l\u2019occasion de contribuer à un appel communautaire, de soutenir un lieu, une idée, une vision et des gens de cœur. Vous êtes les bienvenu(e)s, que vous veniez de loin ou que vous soyez de la région. Rejoignez-nous pour un moment de partage, de joie et de collaboration !',
  },
];

const useCountdown = (target: Date) => {
  const calc = () => {
    const ms = Math.max(0, target.getTime() - Date.now());
    const days  = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const mins  = Math.floor((ms / (1000 * 60)) % 60);
    const secs  = Math.floor((ms / 1000) % 60);
    return { days, hours, mins, secs };
  };
  const [parts, setParts] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setParts(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.getTime()]);
  return parts;
};

const EventChapterBody: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const eventDate = useRef(new Date('2026-05-21T12:00:00')).current;
  const { days, hours, mins, secs } = useCountdown(eventDate);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="space-y-16">
      {/* HMS countdown */}
      <div
        className="p-8 md:p-10 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(28,22,14,0.7) 0%, rgba(15,12,8,0.85) 100%)',
          border: '1px solid rgba(197,160,89,0.3)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-3">
              {t('In', 'Dans')}
            </span>
            <div className="flex items-baseline gap-3 md:gap-5 flex-wrap">
              {[
                { n: days,  lEn: days === 1 ? 'day' : 'days',     lFr: days === 1 ? 'jour' : 'jours' },
                { n: hours, lEn: 'h', lFr: 'h' },
                { n: mins,  lEn: 'm', lFr: 'm' },
                { n: secs,  lEn: 's', lFr: 's' },
              ].map((u, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <span className="font-prata text-[#f3e5ab] leading-none" style={{ fontSize: i === 0 ? 'clamp(2.4rem, 5vw, 4rem)' : 'clamp(1.4rem, 3vw, 2.4rem)' }}>
                    {i === 0 ? u.n : pad(u.n)}
                  </span>
                  <span className="font-cinzel text-neutral-300 uppercase tracking-[0.4em]" style={{ fontSize: i === 0 ? '11px' : '10px' }}>
                    {language === 'EN' ? u.lEn : u.lFr}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="md:text-right">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-2">
              {t('Dates', 'Dates')}
            </span>
            <p className="font-prata text-[#f3e5ab] text-lg md:text-xl">21 — 25 {t('May 2026', 'mai 2026')}</p>
            <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.3em] mt-1">{t('Maison Favier · Namur, QC', 'Maison Favier · Namur, QC')}</p>
          </div>
        </div>
      </div>

      {/* Three pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { en: 'Live Together',  fr: 'Vivre Ensemble',    body_en: 'Five days of meals, music, and quiet evenings around the fire.', body_fr: "Cinq jours de repas, de musique et de soirées tranquilles autour du feu." },
          { en: 'Make Together',  fr: 'Créer Ensemble',    body_en: 'Eight teams care for the land, the kitchen, the art.',         body_fr: "Huit équipes prennent soin de la terre, de la cuisine, de l'art." },
          { en: 'Show Together',  fr: 'Partager Ensemble', body_en: 'Performances each night — open mic, theatre, music.',          body_fr: 'Spectacles chaque soir — scène ouverte, théâtre, musique.' },
        ].map((p, i) => (
          <div
            key={i}
            className="p-6 md:p-8 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(28,22,14,0.5) 0%, rgba(15,12,8,0.7) 100%)', border: '1px solid rgba(197,160,89,0.18)' }}
          >
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-3">0{i + 1}</span>
            <h4 className="font-prata uppercase text-[#f3e5ab] text-lg md:text-xl mb-3 leading-tight">
              {language === 'EN' ? p.en : p.fr}
            </h4>
            <p className="font-josefin text-neutral-300 text-sm leading-relaxed">
              {language === 'EN' ? p.body_en : p.body_fr}
            </p>
          </div>
        ))}
      </div>

            {/* The verbatim Ceilidh + Woofing essay — magazine treatment:
          centered chapter heading, ornament-flanked block titles, justified
          two-column body with a hairline rule between columns, and a gilded
          drop-cap (enluminure) on the first letter of each block. */}
      <div className="essay-spread space-y-12 max-w-5xl mx-auto">
        <div className="text-center">
          <SectionEyebrow>{t('What is this', "Quoi que c'est que ceci")}</SectionEyebrow>
          <h4
            className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.7rem)' }}
          >
            {t('The Ceilidh, the Woofing — what is it?', 'Le Ceilidh, le Woofing — quoi que c’est que ceci ?')}
          </h4>
          <div className="essay-rule mx-auto mt-6" aria-hidden />
        </div>
        {CEILIDH_ESSAY.map((b, i) => {
          const text = language === 'FR' ? b.textFr : b.textEn;
          const first = text.charAt(0);
          const rest = text.slice(1);
          return (
            <article key={i} className="essay-block">
              <h5 className="essay-title font-cinzel uppercase tracking-[0.4em] text-[#d4af37]">
                <span aria-hidden className="essay-ornament">❦</span>
                <span className="essay-title-text">
                  {language === 'FR' ? b.titleFr : b.titleEn}
                </span>
                <span aria-hidden className="essay-ornament">❦</span>
              </h5>
              <div className="essay-body whitespace-pre-line font-lato text-neutral-300 leading-relaxed">
                <span className="essay-dropcap" aria-hidden>{first}</span>
                {rest}
              </div>
            </article>
          );
        })}
        <div className="text-center pt-4 text-[#c5a059]/70 font-cormorant text-2xl" aria-hidden>
          ❦ ❦ ❦
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 02 — Programme: 5-day timeline with morning / afternoon / evening
// ─────────────────────────────────────────────────────────────────────────────

// Programme. Two layers:
//   1. SCHEDULE = the 5-card coarse spine, verbatim from CeilidhPage.tsx.
//   2. DETAIL  = the hour-by-hour itinerary (drafted, will be tightened).
//
// Both are shown on the chapter; the detail grid sits beneath the spine.
interface Moment {
  time: string;
  titleEn: string; titleFr: string;
  detailEn?: string; detailFr?: string;
  kind: 'meal' | 'work' | 'art' | 'rest' | 'arrival';
}
interface ScheduleDay {
  date: string;
  dowEn: string; dowFr: string;
  shortDateEn: string; shortDateFr: string;
  moments: Moment[];
}

const SCHEDULE: {
  date: string; emoji: string;
  dowEn: string; dowFr: string;
  hoursEn: string; hoursFr: string;
  subEn: string; subFr: string;
}[] = [
  { date: '2026-05-21', emoji: '🌙',
    dowEn: 'Thu 21 May', dowFr: 'Jeu 21 Mai',
    hoursEn: 'Optional Arrival', hoursFr: 'Arrivée Facultative',
    subEn: 'Woofers who want to arrive early',
    subFr: "Pour les woofers qui veulent s'installer" },
  { date: '2026-05-22', emoji: '🎸',
    dowEn: 'Fri 22 May', dowFr: 'Ven 22 Mai',
    hoursEn: '9AM – 6PM', hoursFr: '9h – 18h',
    subEn: 'Work · Dinner · Show 6PM & 9PM',
    subFr: 'Travail · Souper · Spectacle 18h et 21h' },
  { date: '2026-05-23', emoji: '🎭',
    dowEn: 'Sat 23 May', dowFr: 'Sam 23 Mai',
    hoursEn: '9AM – 6PM', hoursFr: '9h – 18h',
    subEn: 'Work · Dinner · Show 6:30PM',
    subFr: 'Travail · Souper · Spectacle 18h30' },
  { date: '2026-05-24', emoji: '🥂',
    dowEn: 'Sun 24 May', dowFr: 'Dim 24 Mai',
    hoursEn: '9AM – 6PM', hoursFr: '9h – 18h',
    subEn: 'Work · Dinner · Show · Banquet',
    subFr: 'Travail · Souper · Spectacle · Banquet' },
  { date: '2026-05-25', emoji: '🌅',
    dowEn: 'Mon 25 May', dowFr: 'Lun 25 Mai',
    hoursEn: 'Optional Departure', hoursFr: 'Départ Facultatif',
    subEn: 'Before 11am · Farewell',
    subFr: 'Avant 11h · Au revoir' },
];

const DETAIL: ScheduleDay[] = [
  { date: '2026-05-21', dowEn: 'Thursday', dowFr: 'Jeudi', shortDateEn: 'May 21', shortDateFr: '21 mai',
    moments: [
      { time: '15h', kind: 'arrival', titleEn: 'Optional early arrival', titleFr: 'Arrivée anticipée (facultative)',
        detailEn: 'Settle into your space at your own pace.', detailFr: 'Installez-vous tranquillement dans votre espace.' },
      { time: '19h', kind: 'meal', titleEn: 'Welcome supper', titleFr: "Souper d'accueil",
        detailEn: 'A simple shared meal — for those who arrive Thursday.', detailFr: 'Un repas partagé — pour celles et ceux qui arrivent jeudi.' },
      { time: '21h', kind: 'rest', titleEn: 'Fire', titleFr: 'Feu',
        detailEn: 'Around the fire pit. Bring a blanket.', detailFr: 'Autour du feu. Apportez une couverture.' },
    ] },
  { date: '2026-05-22', dowEn: 'Friday', dowFr: 'Vendredi', shortDateEn: 'May 22', shortDateFr: '22 mai',
    moments: [
      { time: '8h',   kind: 'meal', titleEn: 'Breakfast', titleFr: 'Déjeuner',
        detailEn: 'Self-serve, kitchen open until 9h.', detailFr: 'Libre-service, cuisine ouverte jusqu\u2019à 9h.' },
      { time: '9h',   kind: 'work', titleEn: 'Teams — first session', titleFr: 'Équipes — première sortie',
        detailEn: 'Painting, gardens, barn, forest — meet your crew, take your tools.',
        detailFr: 'Peinture, jardins, grange, forêt — rencontrez votre équipe, prenez les outils.' },
      { time: '13h',  kind: 'meal', titleEn: 'Lunch outside', titleFr: 'Dîner dehors',
        detailEn: 'Long table on the lawn if weather allows.', detailFr: 'Grande table sur la pelouse si le temps le permet.' },
      { time: '14h30',kind: 'work', titleEn: 'Teams — afternoon', titleFr: 'Équipes — après-midi',
        detailEn: "Continue the morning's work or rotate.", detailFr: 'Suite du matin ou rotation entre équipes.' },
      { time: '19h',  kind: 'meal', titleEn: 'Communal supper', titleFr: 'Souper communautaire' },
      { time: '20h',  kind: 'art',  titleEn: 'Open mic', titleFr: 'Scène ouverte',
        detailEn: 'Music, words, anything. The amphitheatre is yours.',
        detailFr: "Musique, paroles, tout est permis. L'amphithéâtre est à vous." },
    ] },
  { date: '2026-05-23', dowEn: 'Saturday', dowFr: 'Samedi', shortDateEn: 'May 23', shortDateFr: '23 mai',
    moments: [
      { time: '8h',    kind: 'meal', titleEn: 'Breakfast', titleFr: 'Déjeuner' },
      { time: '9h',    kind: 'work', titleEn: 'Beginning of woofing', titleFr: 'Début du woofing',
        detailEn: 'The whole crowd starts together.', detailFr: 'Tout le monde commence ensemble.' },
      { time: '13h',   kind: 'meal', titleEn: 'Lunch — picnic baskets', titleFr: 'Dîner — paniers à pique-nique' },
      { time: '19h',   kind: 'meal', titleEn: 'Festive supper', titleFr: 'Souper festif' },
      { time: '21h',   kind: 'art',  titleEn: 'The Grand Ceilidh', titleFr: 'Le Grand Ceilidh',
        detailEn: 'Music, dance, theatre. The big night.', detailFr: 'Musique, danse, théâtre. La grande soirée.' },
    ] },
  { date: '2026-05-24', dowEn: 'Sunday', dowFr: 'Dimanche', shortDateEn: 'May 24', shortDateFr: '24 mai',
    moments: [
      { time: '9h',    kind: 'meal', titleEn: 'Slow brunch', titleFr: 'Brunch tranquille' },
      { time: '14h',   kind: 'work', titleEn: 'Light teams', titleFr: 'Équipes — woofing léger',
        detailEn: 'Wrap up loose ends, leave things tidy.', detailFr: 'Boucler la boucle, laisser les lieux propres.' },
      { time: '19h',   kind: 'meal', titleEn: 'Closing supper', titleFr: 'Souper de clôture' },
      { time: '20h30', kind: 'art',  titleEn: 'Closing show', titleFr: 'Spectacle de clôture',
        detailEn: 'A second night of performances — quieter, deeper.', detailFr: 'Une seconde soirée de spectacles — plus douce, plus profonde.' },
    ] },
  { date: '2026-05-25', dowEn: 'Monday', dowFr: 'Lundi', shortDateEn: 'May 25', shortDateFr: '25 mai',
    moments: [
      { time: '8h',  kind: 'meal',    titleEn: 'Final breakfast', titleFr: 'Dernier déjeuner' },
      { time: '11h', kind: 'arrival', titleEn: 'Departure', titleFr: 'Départ',
        detailEn: 'Final departures by 11h.', detailFr: 'Départs finaux pour 11h.' },
    ] },
];

const KIND_COLOR: Record<Moment['kind'], string> = {
  meal: '#c5a059', work: '#3a7d44', art: '#d4af37', rest: '#8b9494', arrival: '#a8754d',
};
const KIND_LABEL: Record<Moment['kind'], { en: string; fr: string }> = {
  meal:    { en: 'Meal',    fr: 'Repas' },
  work:    { en: 'Work',    fr: 'Woofing' },
  art:     { en: 'Art',     fr: 'Art' },
  rest:    { en: 'Rest',    fr: 'Repos' },
  arrival: { en: 'Arrival', fr: 'Arrivée' },
};

const ProgrammeChapterBody: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

  return (
    <div className="space-y-16">
      <header className="text-center">
        <SectionEyebrow>{t('Five days', 'Cinq jours')}</SectionEyebrow>
        <h3
          className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mb-4"
          style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}
        >
          {t('21 — 25 May, day by day', '21 — 25 mai, jour par jour')}
        </h3>
      </header>

      {/* Coarse 5-card spine — verbatim from CeilidhPage source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {SCHEDULE.map((day) => (
          <div
            key={day.date}
            className="p-5 md:p-6 flex flex-col gap-3"
            style={{ ...cardSurface, borderLeft: '3px solid #c5a059', borderRadius: '12px' }}
          >
            <span className="text-2xl leading-none" aria-hidden>{day.emoji}</span>
            <div>
              <p className="font-prata uppercase text-[#f3e5ab] leading-tight" style={{ fontSize: '1.05rem' }}>
                {language === 'EN' ? day.dowEn : day.dowFr}
              </p>
              <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] mt-1">
                {language === 'EN' ? day.hoursEn : day.hoursFr}
              </p>
            </div>
            <p className="font-josefin text-neutral-300 text-xs uppercase leading-relaxed" style={{ letterSpacing: '0.18em' }}>
              {language === 'EN' ? day.subEn : day.subFr}
            </p>
          </div>
        ))}
      </div>

      {/* Detailed schedule — hour by hour. WIP, will tighten. */}
      <div className="space-y-8">
        <div className="text-center">
          <SectionEyebrow>{t('Hour by hour', 'Heure par heure')}</SectionEyebrow>
        </div>
        {DETAIL.map((day, di) => (
          <div key={day.date} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-10">
            <div className="md:sticky md:top-6 md:self-start">
              <div className="p-5 md:p-6" style={{ ...cardSurface, borderLeft: '3px solid #c5a059', borderRadius: '12px' }}>
                <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-2">
                  {t('Day', 'Jour')} {di + 1}
                </span>
                <p className="font-prata uppercase text-[#f3e5ab] leading-tight mb-1" style={{ fontSize: '1.4rem' }}>
                  {language === 'EN' ? day.dowEn : day.dowFr}
                </p>
                <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.3em]">
                  {language === 'EN' ? day.shortDateEn : day.shortDateFr}
                </p>
              </div>
            </div>
            <ul className="space-y-3">
              {day.moments.map((m, mi) => {
                const color = KIND_COLOR[m.kind];
                return (
                  <li key={mi}>
                    <div
                      className="moment-row w-full text-left p-4 md:p-5 flex items-start gap-4"
                      style={{ ...cardSurface, borderLeft: `3px solid ${color}` }}
                    >
                      <div className="shrink-0 w-20 md:w-24">
                        <p className="font-prata text-[#f3e5ab] text-base leading-none mb-1.5">{m.time}</p>
                        <span className="font-cinzel uppercase tracking-[0.3em] text-[8px]" style={{ color }}>
                          {language === 'EN' ? KIND_LABEL[m.kind].en : KIND_LABEL[m.kind].fr}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-prata uppercase text-[#f3e5ab] leading-tight mb-1" style={{ fontSize: '1rem' }}>
                          {language === 'EN' ? m.titleEn : m.titleFr}
                        </h5>
                        {(m.detailEn || m.detailFr) && (
                          <p className="font-josefin text-neutral-400 text-xs leading-relaxed">
                            {language === 'EN' ? m.detailEn : m.detailFr}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 03 — Teams: 9 teams, pick one
// ─────────────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  nameEn: string;
  nameFr: string;
  emoji: string;
  maxMembers: number;
  current: number;
  descEn: string;
  descFr: string;
}

export const TEAMS: Team[] = [
  { id: 'peinture',    emoji: '🎨', maxMembers: 4, current: 2,
    nameEn: 'Painting',          nameFr: 'Peinture',
    descEn: 'Sand and paint the façade of the house and the gallery.',
    descFr: 'Gratter, peindre la façade de la maison et la galerie.' },
  { id: 'bouffe',      emoji: '🍳', maxMembers: 3, current: 3,
    nameEn: 'Kitchen',           nameFr: 'Bouffe',
    descEn: 'Feed the crowd: meals, snacks, water, keeping the space inviting.',
    descFr: 'Nourrir tout ce monde : repas, collations, eau, espace propre et convivial.' },
  { id: 'jardins',     emoji: '🌱', maxMembers: 4, current: 1,
    nameEn: 'Gardens',           nameFr: 'Jardins',
    descEn: 'Tilling, weeding, planting, tending the greenhouse.',
    descFr: 'Labourer, désherber, planter, préparer la serre.' },
  { id: 'grange',      emoji: '🏚️', maxMembers: 6, current: 2,
    nameEn: 'Barn',              nameFr: 'Grange',
    descEn: 'Sort barn wood, remove nails, burn the unusable wood.',
    descFr: 'Trier le bois de grange, retirer des clous, brûler le bois pu bon.' },
  { id: 'dehors',      emoji: '🪵', maxMembers: 4, current: 0,
    nameEn: 'Outdoors',          nameFr: 'Dehors',
    descEn: 'Build benches, fire pits, footbridges — outdoor crafting.',
    descFr: 'Bancs, ronds de feu, ponceaux — bricolage extérieur.' },
  { id: 'arts',        emoji: '🎵', maxMembers: 5, current: 4,
    nameEn: 'Performing Arts',   nameFr: 'Arts de la scène',
    descEn: 'Animate the community: music, murals, performance.',
    descFr: 'Animer tout ce monde : musique, murales, spectacle.' },
  { id: 'mini-maison', emoji: '🏠', maxMembers: 4, current: 1,
    nameEn: 'Mini House',        nameFr: 'Mini Maison',
    descEn: 'Finishing the mini house and furnishing it.',
    descFr: 'Finition et aménagement de la mini maison.' },
  { id: 'foret',       emoji: '🪓', maxMembers: 5, current: 2,
    nameEn: 'Forest',            nameFr: 'Forêt',
    descEn: 'Clear fallen trees, cut and split firewood for the year.',
    descFr: 'Dégager les arbres tombés, couper et fendre le bois de chauffage.' },
  { id: 'preparation', emoji: '📋', maxMembers: 4, current: 4,
    nameEn: 'Preparation',       nameFr: 'Préparation',
    descEn: 'Pre-event prep: supplies, logistics, setting up before everyone arrives.',
    descFr: 'Avant l\'événement : achats, logistique, installation avant l\'arrivée.' },
];

const TeamsChapterBody: React.FC<{
  language: 'EN' | 'FR';
  user: User | null;
  teamRoster: Map<string, { uid: string; name: string; photoURL?: string; role: 'primary' | 'support' }[]>;
  registrations: CeilidhRegistration[];
  onViewProfile?: (uid: string) => void;
}> = ({ language, user, teamRoster, registrations, onViewProfile }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const [pickedId, setPickedId] = useState<string | null>(null);

  // Default work-days when joining a team for the first time — full Fri/Sat/Sun/Mon.
  // The user can refine days later via an edit-days flow (out of scope for this pass).
  const ALL_WORK_DAYS = ['2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'];

  // The team the current user has actually committed to (if any). Derived
  // from the live registrations stream so it updates as soon as the join
  // write is reflected by onSnapshot.
  const joinedTeamId: string | null = (() => {
    if (!user) return null;
    const reg = registrations.find((r) => r.uid === user.uid);
    return reg?.teams?.find((m: any) => m && !m.isSupport)?.teamId ?? null;
  })();

  // Browse a team — local state only, no Firestore write. Clicking the
  // already-picked team un-picks. Critically: this does NOT commit the
  // user to the team. Joining is a separate explicit action below.
  const handleViewTeam = (teamId: string) => {
    setPickedId((prev) => (prev === teamId ? null : teamId));
  };

  // Commit — write the team registration. Triggered by an explicit button
  // on the card, never by browsing. Idempotent: re-joining the same team
  // updates the registration (e.g. if it was previously cleared).
  const handleJoinTeam = async (teamId: string) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, `events/${EVENT_ID}/registrations`, user.uid),
        {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          teams: [{ teamId, days: ALL_WORK_DAYS, isSupport: false }],
          // Default arrival/departure to the full event window when no room is claimed.
          arrivalDate: '2026-05-22',
          departureDate: '2026-05-25',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) { /* eslint-disable-next-line no-console */ console.warn('team join write failed', e); }
  };

  return (
    <div className="space-y-10">
      {/* Facebook RSVP callout — lets people mark themselves "present" on
          the FB event, but reminds them the real team + room selection
          happens here. The link opens a new tab so the on-page selection
          flow isn't lost. */}
      <a
        href="https://www.facebook.com/events/1293158079474199/?active_tab=discussion"
        target="_blank"
        rel="noopener noreferrer"
        className="block group rounded-2xl p-5 md:p-6 transition-all hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, rgba(28,22,14,0.55) 0%, rgba(15,12,8,0.85) 100%)',
          border: '1px solid rgba(197,160,89,0.28)',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Facebook glyph — discreet, gold-tinted */}
          <span
            aria-hidden
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(243,229,171,0.35)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#f3e5ab" aria-hidden>
              <path d="M13.5 21v-7.5h2.55l.38-2.97H13.5V8.62c0-.86.24-1.45 1.47-1.45h1.57V4.51c-.27-.04-1.2-.12-2.29-.12-2.27 0-3.83 1.39-3.83 3.94v2.2H7.86v2.97h2.56V21h3.08Z"/>
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] mb-1">
              {t('Facebook event', 'Événement Facebook')}
            </p>
            <p className="font-prata text-[#f3e5ab] text-base md:text-lg leading-tight">
              {t('Mark yourself "Going" on Facebook',
                 'Indiquez « Présent·e » sur Facebook')}
            </p>
            <p className="font-josefin text-neutral-400 text-xs leading-relaxed mt-2">
              {t('Then come back here to pick your team and your room — those still happen on this page.',
                 'Puis revenez ici pour choisir votre équipe et votre chambre — ces étapes se font encore sur cette page.')}
            </p>
          </div>
          <span
            aria-hidden
            className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full border border-[#c5a059]/40 text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#1a1208] transition-colors"
          >
            ↗
          </span>
        </div>
      </a>

      <header className="text-center">
        <SectionEyebrow>{t('Pick your team', 'Choisissez votre équipe')}</SectionEyebrow>
        <h3
          className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mb-4"
          style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}
        >
          {t('Nine ways to make this place sing', 'Neuf façons de faire chanter cet endroit')}
        </h3>
        <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.32em] max-w-xl mx-auto">
          {t('You\'ll spend ~6 hours a day on your team. Pick the one that calls you.', 'Vous passerez ~6 heures par jour avec votre équipe. Prenez celle qui vous appelle.')}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {TEAMS.map((team) => {
          const members = teamRoster.get(team.id) || [];
          // "viewing" = currently expanded for browsing; "joined" = actually
          // committed to Firestore. Two different states now.
          const viewing = pickedId === team.id;
          const joined = joinedTeamId === team.id;
          const projected = members.length;
          const full = projected >= team.maxMembers && !joined;
          // The card is the view-toggle. Only the explicit Join button
          // commits a registration write — clicking the card no longer
          // changes team membership.
          return (
            <div
              key={team.id}
              role="button"
              tabIndex={full && !viewing ? -1 : 0}
              onClick={() => { if (!full || viewing) handleViewTeam(team.id); }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && (!full || viewing)) {
                  e.preventDefault();
                  handleViewTeam(team.id);
                }
              }}
              aria-pressed={viewing}
              className={`team-card text-left p-5 md:p-6 transition-all ${full && !viewing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
              style={viewing ? cardSurfaceActive : cardSurface}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl md:text-4xl leading-none" aria-hidden>{team.emoji}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
                    {projected}<span className="opacity-50">/{team.maxMembers}</span>
                  </span>
                  {/* Gold check appears for the team you're actually in,
                      not just the one you're browsing. */}
                  {joined && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: 'radial-gradient(circle at 30% 25%, #f3e5ab 0%, #c5a059 70%, #8b6e3a 100%)',
                        border: '1.5px solid rgba(243,229,171,0.7)',
                      }}
                      aria-hidden
                    >
                      <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                        <path d="M3.5 9.5 L7 13 L14.5 5" stroke="#1a1208" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <h4 className="font-prata uppercase text-[#f3e5ab] mb-2 leading-tight" style={{ fontSize: '1.15rem' }}>
                {language === 'EN' ? team.nameEn : team.nameFr}
              </h4>
              <p className="font-josefin text-neutral-400 text-xs leading-relaxed">
                {language === 'EN' ? team.descEn : team.descFr}
              </p>
              {/* Roster — real registered members on this team */}
              {members.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {members.slice(0, 8).map((m) => (
                    <span
                      key={m.uid}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-josefin uppercase"
                      title={`${m.name}${m.role === 'support' ? ' · support' : ''}`}
                      style={{
                        background: m.photoURL
                          ? `url(${m.photoURL}) center/cover` : '#2a1f12',
                        border: m.role === 'support'
                          ? '1px dashed rgba(197,160,89,0.55)'
                          : '1px solid rgba(243,229,171,0.45)',
                        color: '#f3e5ab',
                      }}
                    >
                      {!m.photoURL && (m.name?.[0] || '?').toUpperCase()}
                    </span>
                  ))}
                  {members.length > 8 && (
                    <span className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.3em]">
                      +{members.length - 8}
                    </span>
                  )}
                </div>
              )}
              {full && !joined && (
                <p className="font-cinzel text-[#5a4a36] text-[9px] uppercase tracking-[0.4em] mt-3">
                  {t('Full', 'Complète')}
                </p>
              )}
              {joined && (
                <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] mt-3">
                  {t('You\'re in', 'Vous y êtes')} ✦
                </p>
              )}

              {/* Confirm-to-join CTA — only appears when the user is
                  actively viewing this card, is signed in, and isn't
                  already on this team. Clicking commits the registration
                  via handleJoinTeam (the only path that writes). */}
              {viewing && user && !joined && !full && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleJoinTeam(team.id); }}
                  className="mt-4 w-full py-3 border-2 border-[#c5a059] text-[#f3e5ab] font-cinzel text-[11px] uppercase tracking-[0.4em] hover:bg-[#c5a059] hover:text-[#1a1208] transition-colors"
                >
                  {t('Choose this team', 'Choisir cette équipe')}
                </button>
              )}
              {viewing && user && joined && (
                <p className="mt-4 text-center font-cinzel text-[#c5a059]/70 text-[10px] uppercase tracking-[0.4em]">
                  {t('Already on this team', 'Déjà dans cette équipe')}
                </p>
              )}
              {viewing && !user && (
                <p className="mt-4 text-center font-cinzel text-neutral-500 text-[10px] uppercase tracking-[0.4em]">
                  {t('Sign in to join', 'Connectez-vous pour rejoindre')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* General + team chatrooms — side-by-side on desktop. The team chat is
          locked until the user picks a team; the general chat is open to all
          signed-in members. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChatRoom
          path={`events/${EVENT_ID}/chats/general/messages`}
          title={t('General chat', 'Salon général')}
          emptyEn="No messages yet — say hi."
          emptyFr="Pas de message — dites bonjour."
          language={language}
          user={user}
          onRequireAuth={() => { /* prompt handled at page level */ }}
        />
        <ChatRoom
          path={pickedId ? `events/${EVENT_ID}/teamChats/${pickedId}/messages` : ''}
          title={pickedId
            ? `${t('Team chat', 'Salon d\u2019équipe')} · ${language === 'EN' ? TEAMS.find((x) => x.id === pickedId)?.nameEn : TEAMS.find((x) => x.id === pickedId)?.nameFr}`
            : t('Team chat', 'Salon d\u2019équipe')}
          emptyEn="No messages yet — start the conversation."
          emptyFr="Pas de message — lancez la discussion."
          language={language}
          user={user}
          onRequireAuth={() => { /* prompt handled at page level */ }}
          locked={!pickedId}
          lockedHintEn="Pick a team above to unlock its private chat."
          lockedHintFr="Choisissez une équipe ci-dessus pour ouvrir son salon privé."
        />
      </div>

      {/* Picked-team panels — fellow members with their work-days, then the Kanban. */}
      {pickedId && (
        <TeamMembersPanel
          pickedId={pickedId}
          language={language}
          registrations={registrations}
          onViewProfile={onViewProfile}
        />
      )}

      {/* Kanban for the picked team — real Firestore-backed task board */}
      {pickedId && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <SectionEyebrow>{t('Tasks for this team', 'Tâches de cette équipe')}</SectionEyebrow>
            <span className="font-josefin text-neutral-500 text-xs uppercase tracking-[0.3em]">
              {language === 'EN' ? TEAMS.find((x) => x.id === pickedId)?.nameEn : TEAMS.find((x) => x.id === pickedId)?.nameFr}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden p-2 md:p-3" style={cardSurface}>
            <KanbanBoard
              teamId={pickedId}
              language={language}
              user={user}
              /* Read-only browse mode unless the user has actually joined
                 this team. Joining is the explicit "Join this team" button
                 on the card above. */
              isUserInTeam={joinedTeamId === pickedId}
            />
          </div>
        </div>
      )}

      {/* PresenceTimeline — real-time who-comes-when across the 5 days */}
      {registrations.length > 0 && (
        <div className="space-y-4 pt-4">
          <SectionEyebrow>{t('Who comes when', 'Qui vient quand')}</SectionEyebrow>
          <div className="rounded-2xl overflow-hidden p-2 md:p-3" style={cardSurface}>
            <PresenceTimeline
              registrations={registrations}
              language={language}
              onViewProfile={onViewProfile}
            />
          </div>
        </div>
      )}

      <div
        className="p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap"
        style={cardSurface}
      >
        <p className="font-josefin text-neutral-300 text-sm">
          {pickedId
            ? t(
                `You're on the ${TEAMS.find((x) => x.id === pickedId)?.nameEn} team.`,
                `Vous êtes dans la ${TEAMS.find((x) => x.id === pickedId)?.nameFr}.`,
              )
            : t('No team picked yet — tap one above.', 'Aucune équipe choisie — touchez-en une ci-dessus.')}
        </p>
        {pickedId && (
          <button
            onClick={() => setPickedId(null)}
            className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] hover:text-[#f3e5ab] transition-colors"
          >
            {t('Change team', 'Changer d\'équipe')}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 04 — Lodging: 12 spaces, claim a bed
// ─────────────────────────────────────────────────────────────────────────────

export interface Lodging {
  id: string;
  nameEn: string;
  nameFr: string;
  capacity: number;
  taken: number;
  icon: string;
  descEn: string;
  descFr: string;
  group: 'manor' | 'unique' | 'outdoor' | 'byo';
}

export const LODGING: Lodging[] = [
  { id: 'ecrivaine',  icon: '✍️', capacity: 3, taken: 1, nameEn: "L'Écrivaine",      nameFr: "L'Écrivaine",      group: 'manor',
    descEn: 'Double bed + single bed', descFr: 'Lit double + lit simple' },
  { id: 'musicienne', icon: '🎸', capacity: 3, taken: 2, nameEn: 'La Musicienne',    nameFr: 'La Musicienne',    group: 'manor',
    descEn: 'Double bed + single bed', descFr: 'Lit double + lit simple' },
  { id: 'theatre',    icon: '🎭', capacity: 3, taken: 0, nameEn: "L'Amphithéâtre",   nameFr: "L'Amphithéâtre",   group: 'manor',
    descEn: 'Double bed + cot', descFr: 'Lit double + lit de camp' },
  { id: 'cinema',     icon: '🎬', capacity: 3, taken: 1, nameEn: 'La Cinéaste',      nameFr: 'La Cinéaste',      group: 'manor',
    descEn: 'Double bed + cot', descFr: 'Lit double + lit de camp' },
  { id: 'solarium',   icon: '☀️', capacity: 4, taken: 4, nameEn: 'Solarium',         nameFr: 'Solarium',         group: 'manor',
    descEn: '2 single beds + 2 couches', descFr: '2 lits simples + 2 divans' },
  { id: 'massage',    icon: '💆', capacity: 2, taken: 0, nameEn: 'Massage Room',     nameFr: 'Salle de Massage', group: 'manor',
    descEn: 'Double bed', descFr: 'Lit double' },
  { id: 'yurt',       icon: '⛺', capacity: 5, taken: 2, nameEn: 'Yurt / Ger',       nameFr: 'Yourte / Ger',     group: 'unique',
    descEn: 'Shared space · floor mattresses', descFr: 'Espace commun · matelas au sol' },
  { id: 'tiny',       icon: '🏡', capacity: 5, taken: 1, nameEn: 'Tiny House',       nameFr: 'Tiny House',       group: 'unique',
    descEn: 'Loft bed + 4 sleeping spots', descFr: 'Lit mezzanine + 4 couchages' },
  { id: 'bus',        icon: '🚌', capacity: 1, taken: 0, nameEn: 'Supertramp Bus',   nameFr: 'Supertramp Bus',   group: 'unique',
    descEn: 'Custom double bed', descFr: 'Lit double aménagé' },
  { id: 'prospector', icon: '🏕️', capacity: 4, taken: 0, nameEn: 'Prospector Tent',  nameFr: 'Tente Prospecteur', group: 'outdoor',
    descEn: 'Canvas tent · 4 sleeping spots', descFr: 'Tente canvas · 4 couchages' },
  { id: 'tent',       icon: '⛺', capacity: 10, taken: 3, nameEn: 'Bring my own tent',nameFr: 'Apporter ma tente',group: 'byo',
    descEn: 'Your own gear', descFr: 'Votre propre équipement' },
  { id: 'campervan',  icon: '🚐', capacity: 6, taken: 0, nameEn: 'My camper van',    nameFr: 'Mon camping-car',  group: 'byo',
    descEn: 'Your own van / camper', descFr: 'Votre propre van / camping-car' },
];

export const LODGING_GROUPS: { id: Lodging['group']; en: string; fr: string }[] = [
  { id: 'manor',   en: 'Inside the manor',     fr: 'Dans le manoir' },
  { id: 'unique',  en: 'Unique spaces',         fr: 'Espaces uniques' },
  { id: 'outdoor', en: 'Outdoor under canvas',  fr: 'Dehors sous toile' },
  { id: 'byo',     en: 'Bring your own',        fr: 'Apportez le vôtre' },
];

// ─── ChatRoom — Firestore-backed messages, send-as-you-go ────────────────────
export const ChatRoom: React.FC<{
  path: string;            // e.g. `events/${EVENT_ID}/chats/general/messages`
  title: string;
  emptyEn: string;
  emptyFr: string;
  language: 'EN' | 'FR';
  user: User | null;
  onRequireAuth: () => void;
  locked?: boolean;        // when team chat has no team picked
  lockedHintEn?: string;
  lockedHintFr?: string;
}> = ({ path, title, emptyEn, emptyFr, language, user, onRequireAuth, locked, lockedHintEn, lockedHintFr }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const [messages, setMessages] = useState<{ id: string; uid: string; displayName?: string; photoURL?: string; text: string; createdAt?: any }[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locked) { setMessages([]); return; }
    if (!path) return;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(80));
    return onSnapshot(q, (snap) => {
      const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // newest first → reverse for natural top-to-bottom reading.
      setMessages(out.reverse());
      // Auto-scroll to bottom on new messages.
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    });
  }, [path, locked]);

  const send = async () => {
    if (!user) { onRequireAuth(); return; }
    if (!text.trim() || sending || locked) return;
    setSending(true);
    try {
      await addDoc(collection(db, path), {
        uid: user.uid,
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        email: user.email ?? '',
        text: text.trim().slice(0, 1000),
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[420px] rounded-2xl overflow-hidden" style={cardSurface}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#c5a059]/15 flex items-center justify-between">
        <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">{title}</span>
        {!locked && messages.length > 0 && (
          <span className="font-josefin text-neutral-500 text-[10px]">{messages.length}</span>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {locked ? (
          <p className="font-josefin text-neutral-500 text-xs text-center mt-12 px-4 leading-relaxed">
            {language === 'EN' ? lockedHintEn : lockedHintFr}
          </p>
        ) : messages.length === 0 ? (
          <p className="font-josefin text-neutral-600 text-xs italic text-center mt-12">
            {language === 'EN' ? emptyEn : emptyFr}
          </p>
        ) : (
          messages.map((m) => {
            const mine = user?.uid === m.uid;
            const isAdmin = (m as any).email && /^(houseoftherisingarts@gmail\.com|alex@lesalondesinconnus\.com)$/i.test((m as any).email);
            return (
              <div key={m.id} className={`flex items-start gap-2 ${mine ? 'flex-row-reverse text-right' : ''}`}>
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-cinzel uppercase mt-0.5"
                  title={m.displayName}
                  style={{
                    background: m.photoURL ? `url(${m.photoURL}) center/cover` : '#1f1810',
                    border: `1px solid ${isAdmin ? 'rgba(243,229,171,0.6)' : 'rgba(255,255,255,0.18)'}`,
                    color: '#f3e5ab',
                  }}
                >
                  {!m.photoURL && (m.displayName?.[0] || '?').toUpperCase()}
                </span>
                <div className={`min-w-0 max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-prata text-[#f3e5ab] text-xs leading-none truncate">
                      {(m.displayName || '—').split(' ')[0]}
                    </span>
                    {isAdmin && (
                      <span className="font-cinzel text-[#d4af37] text-[8px] uppercase tracking-[0.3em]">admin</span>
                    )}
                  </div>
                  <div
                    className={`font-lato text-[13px] leading-relaxed px-3 py-2 rounded-xl ${mine ? 'bg-[#c5a059]/15 text-[#f3e5ab]' : 'bg-white/[0.04] text-neutral-200'}`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-3 border-t border-[#c5a059]/15">
        {locked ? (
          <p className="font-cinzel text-neutral-600 text-[9px] uppercase tracking-[0.4em] text-center py-2">
            {t('Pick a team to chat', 'Choisissez une équipe pour discuter')}
          </p>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={user ? t('Write a message…', 'Écrire un message…') : t('Sign in to chat', 'Connectez-vous pour discuter')}
              maxLength={1000}
              className="flex-1 bg-black/40 text-[#f3e5ab] placeholder:text-neutral-600 font-lato text-sm px-3 py-2 rounded-lg focus:outline-none transition-colors"
              style={{ border: '1px solid rgba(197,160,89,0.25)' }}
              onClick={() => { if (!user) onRequireAuth(); }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="px-4 py-2 rounded-lg font-cinzel text-[10px] uppercase tracking-[0.35em] text-[#1a1208] transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                boxShadow: '0 4px 12px rgba(197,160,89,0.35)',
              }}
            >
              {sending ? '…' : t('Send', 'Envoyer')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── TeamMembersPanel — fellow registered teammates + their work-days ──────
const WORK_DAYS_TEST2 = [
  { id: '2026-05-22', en: 'Fri', fr: 'Ven' },
  { id: '2026-05-23', en: 'Sat', fr: 'Sam' },
  { id: '2026-05-24', en: 'Sun', fr: 'Dim' },
  { id: '2026-05-25', en: 'Mon', fr: 'Lun' },
];

const TeamMembersPanel: React.FC<{
  pickedId: string;
  language: 'EN' | 'FR';
  registrations: CeilidhRegistration[];
  onViewProfile?: (uid: string) => void;
}> = ({ pickedId, language, registrations, onViewProfile }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  // Build the roster scoped to the picked team — primary first, support second.
  // Each entry carries the days the member is on this team (TeamMembership.days).
  const members = registrations
    .map((reg) => {
      const mem = (reg.teams || []).find((m: any) => m?.teamId === pickedId);
      if (!mem) return null;
      return {
        uid: reg.uid,
        name: reg.displayName || reg.email || '—',
        photoURL: reg.photoURL,
        role: (mem.isSupport ? 'support' : 'primary') as 'primary' | 'support',
        days: Array.isArray(mem.days) ? mem.days as string[] : [],
        chef: !!mem.isChefEquipe,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.role === 'primary' ? -1 : 1) - (b.role === 'primary' ? -1 : 1));

  if (members.length === 0) {
    return (
      <div className="space-y-3">
        <SectionEyebrow>{t('Your teammates', 'Vos coéquipier·ères')}</SectionEyebrow>
        <div className="p-5 md:p-6 text-center" style={cardSurface}>
          <p className="font-josefin text-neutral-400 text-sm">
            {t('No one else has joined this team yet.', "Personne d'autre n'a rejoint cette équipe pour l'instant.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionEyebrow>{t('Your teammates · who comes when', 'Vos coéquipier·ères · qui vient quand')}</SectionEyebrow>
      <div className="p-3 md:p-4" style={cardSurface}>
        <ul className="divide-y divide-[#c5a059]/10">
          {members.map((m) => (
            <li key={m.uid} className="py-3 px-2 flex items-center gap-4">
              {/* Avatar */}
              <button
                type="button"
                onClick={() => onViewProfile?.(m.uid)}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-cinzel uppercase"
                title={m.name + (m.role === 'support' ? ' · support' : '')}
                style={{
                  background: m.photoURL ? `url(${m.photoURL}) center/cover` : '#1f1810',
                  border: m.role === 'support'
                    ? '1px dashed rgba(197,160,89,0.6)'
                    : '1px solid rgba(243,229,171,0.55)',
                  color: '#f3e5ab',
                }}
              >
                {!m.photoURL && (m.name?.[0] || '?').toUpperCase()}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-prata text-[#f3e5ab] text-sm leading-none truncate">{m.name}</span>
                  {m.chef && (
                    <span className="font-cinzel text-[#d4af37] text-[8px] uppercase tracking-[0.3em]">★ chef</span>
                  )}
                  {m.role === 'support' && (
                    <span className="font-cinzel text-neutral-500 text-[8px] uppercase tracking-[0.3em]">{t('support', 'soutien')}</span>
                  )}
                </div>
                {/* Day pills — Fri / Sat / Sun / Mon, gold when this person is in */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {WORK_DAYS_TEST2.map((d) => {
                    const on = m.days.includes(d.id);
                    return (
                      <span
                        key={d.id}
                        className="px-2 py-0.5 rounded-full font-cinzel uppercase text-[8px] tracking-[0.3em]"
                        style={{
                          background: on ? 'rgba(197,160,89,0.18)' : 'rgba(255,255,255,0.03)',
                          color: on ? '#f3e5ab' : '#5a4a36',
                          border: `1px solid ${on ? 'rgba(243,229,171,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {language === 'EN' ? d.en : d.fr}
                      </span>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ─── RoomOccupants — avatars + arrival→departure mini-bar per lodging card ──
const EVENT_DAYS_TEST2 = ['2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'];

const RoomOccupants: React.FC<{
  roomId: string;
  roomNames?: string[];   // fallback match for legacy regs that store roomName
  language: 'EN' | 'FR';
  registrations: CeilidhRegistration[];
  onViewProfile?: (uid: string) => void;
}> = ({ roomId, roomNames = [], language, registrations, onViewProfile }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const occupants = registrations.filter((r: any) =>
    r.roomId === roomId ||
    (typeof r.roomName === 'string' && roomNames.includes(r.roomName)),
  );
  if (occupants.length === 0) return null;

  const dayIdx = (iso: string) => Math.max(0, EVENT_DAYS_TEST2.indexOf(iso));
  return (
    <div className="mt-3 pt-3 border-t border-[#c5a059]/10">
      <p className="font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.35em] mb-2">
        {t('Already here', 'Déjà sur place')} ({occupants.length})
      </p>
      <ul className="space-y-1.5">
        {occupants.map((occ: any) => {
          const arr = dayIdx(occ.arrivalDate || EVENT_DAYS_TEST2[1]);
          const dep = dayIdx(occ.departureDate || EVENT_DAYS_TEST2[4]);
          const left = (arr / (EVENT_DAYS_TEST2.length - 1)) * 100;
          const right = ((EVENT_DAYS_TEST2.length - 1 - dep) / (EVENT_DAYS_TEST2.length - 1)) * 100;
          return (
            <li key={occ.uid} className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewProfile?.(occ.uid); }}
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-cinzel uppercase"
                title={occ.displayName || occ.email || '—'}
                style={{
                  background: occ.photoURL ? `url(${occ.photoURL}) center/cover` : '#1f1810',
                  border: '1px solid rgba(243,229,171,0.45)',
                  color: '#f3e5ab',
                }}
              >
                {!occ.photoURL && ((occ.displayName || occ.email || '?')[0] || '?').toUpperCase()}
              </button>
              <span className="font-josefin text-neutral-300 text-[10px] truncate flex-1 min-w-0">
                {(occ.displayName || occ.email || '').split(' ')[0]}
              </span>
              <div className="relative flex-1 max-w-[120px] h-1 rounded-full bg-[#1a1410]">
                <div
                  className="absolute top-0 bottom-0 bg-[#c5a059]/70 rounded-full"
                  style={{ left: `${left}%`, right: `${right}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const LodgingChapterBody: React.FC<{
  language: 'EN' | 'FR';
  registrations: CeilidhRegistration[];
  onViewProfile?: (uid: string) => void;
}> = ({ language, registrations, onViewProfile }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const [claimedId, setClaimedId] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <header className="text-center">
        <SectionEyebrow>{t('Twelve places to sleep', 'Douze endroits où dormir')}</SectionEyebrow>
        <h3
          className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mb-4"
          style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}
        >
          {t('Claim a bed', 'Réservez votre lit')}
        </h3>
        <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.32em] max-w-xl mx-auto">
          {t('One bed per person. Choose by mood: enclosed, shared, under stars.', 'Un lit par personne. Choisissez selon votre humeur : fermé, partagé, sous les étoiles.')}
        </p>
      </header>

      {LODGING_GROUPS.map((g) => (
        <div key={g.id} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h4 className="font-prata uppercase text-[#f3e5ab] tracking-tight" style={{ fontSize: '1.3rem' }}>
              {language === 'EN' ? g.en : g.fr}
            </h4>
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
              {LODGING.filter((l) => l.group === g.id).length} {t('options', 'options')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {LODGING.filter((l) => l.group === g.id).map((l) => {
              const claimed = claimedId === l.id;
              // Count occupancy live from registrations rather than the static
              // `l.taken` value — those hardcoded numbers were wrong (Solarium
              // showed full when there were beds left). Source of truth is
              // events/{EVENT_ID}/registrations where each reg has a roomId.
              // Match by roomId AND fall back to roomName so older registrations
              // (or those keyed by display name) still count toward the live total.
              const matchesRoom = (r: any) =>
                r.roomId === l.id
                || (typeof r.roomName === 'string' && (r.roomName === l.nameEn || r.roomName === l.nameFr));
              const realTaken = registrations.filter(matchesRoom).length;
              const projected = realTaken + (claimed ? 1 : 0);
              const full = projected >= l.capacity && !claimed;
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={full}
                  onClick={() => !full && setClaimedId(claimed ? null : l.id)}
                  className={`text-left p-4 md:p-5 transition-all ${full ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                  style={claimed ? cardSurfaceActive : cardSurface}
                  aria-pressed={claimed}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none" aria-hidden>{l.icon}</span>
                      <h5 className="font-prata uppercase text-[#f3e5ab] leading-tight" style={{ fontSize: '1.05rem' }}>
                        {language === 'EN' ? l.nameEn : l.nameFr}
                      </h5>
                    </div>
                    <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.35em] whitespace-nowrap">
                      {projected}<span className="opacity-50">/{l.capacity}</span>
                    </span>
                  </div>
                  <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.18em] mb-2">
                    {language === 'EN' ? l.descEn : l.descFr}
                  </p>
                  {/* Capacity bar */}
                  <div className="h-1 rounded-full overflow-hidden bg-[#1a1410] mt-2">
                    <div
                      className="h-full"
                      style={{
                        width: `${(projected / l.capacity) * 100}%`,
                        background: claimed ? 'linear-gradient(90deg, #c5a059, #f3e5ab)' : 'rgba(197,160,89,0.5)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  {claimed && (
                    <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] mt-3">
                      {t('Claimed', 'Réservé')} ✦
                    </p>
                  )}
                  {full && (
                    <p className="font-cinzel text-[#5a4a36] text-[9px] uppercase tracking-[0.4em] mt-3">
                      {t('Full', 'Complet')}
                    </p>
                  )}
                  {/* Occupants — see who's already in this room and when */}
                  <RoomOccupants
                    roomId={l.id}
                    roomNames={[l.nameEn, l.nameFr]}
                    language={language}
                    registrations={registrations}
                    onViewProfile={onViewProfile}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap" style={cardSurface}>
        <p className="font-josefin text-neutral-300 text-sm">
          {claimedId
            ? t(
                `Bed claimed in ${LODGING.find((l) => l.id === claimedId)?.nameEn}.`,
                `Lit réservé dans ${LODGING.find((l) => l.id === claimedId)?.nameFr}.`,
              )
            : t('No bed claimed — choose where you\'ll sleep.', 'Aucun lit réservé — choisissez où vous dormirez.')}
        </p>
        {claimedId && (
          <button
            onClick={() => setClaimedId(null)}
            className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] hover:text-[#f3e5ab] transition-colors"
          >
            {t('Change', 'Changer')}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
// Chapter 05 — Pratique
// Real source: address + phone + hours from CeilidhPage. The 'what to bring'
// list and the FAQ are user-authored placeholders — they'll be tightened.
// Live features (NeedsSection, CovoiturageSection, AbundanceSection,
// ContributionPanel, ShowTicketModal, in-app messaging) are stubbed below.
// ──────────────────────────────────────────────────────────────────────────

const PracticalChapterBody: React.FC<{
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  carpools: Carpool[];
  needs: CeilidhNeed[];
  onRequireAuth: () => void;
  onViewProfile?: (uid: string) => void;
  onNavigate: (view: string) => void;
}> = ({ language, user, memberProfile, carpools, needs, onRequireAuth, onViewProfile, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const bring = [
    { en: 'Sleeping bag + pillow',           fr: 'Sac de couchage + oreiller' },
    { en: 'Boots & rubber soles',            fr: 'Bottes et semelles de pluie' },
    { en: 'Layers (mornings cold)',          fr: 'Vêtements en couches (matins froids)' },
    { en: 'Reusable cup + plate',            fr: 'Tasse et assiette réutilisables' },
    { en: 'Headlamp',                        fr: 'Lampe frontale' },
    { en: 'Instrument (if you play)',        fr: 'Instrument (si vous en jouez)' },
    { en: 'Curiosity + an open hand',        fr: 'Curiosité et la main ouverte' },
  ];

  const faqs = [
    { qEn: 'Do I need to be on a team?',     qFr: "Dois-je faire partie d'une équipe ?",
      aEn: "Yes — every participant joins one team. It's ~6 hours of shared work per day, the heart of the gathering.",
      aFr: "Oui — tout le monde rejoint une équipe. C'est ~6 heures de travail partagé par jour, le cœur du rassemblement." },
    { qEn: 'Can children come?',             qFr: 'Les enfants sont-ils bienvenus ?',
      aEn: "Yes, with a parent or guardian. Reach out so we can plan their bed and meals.",
      aFr: "Oui, accompagnés d'un parent ou tuteur. Écrivez-nous pour qu'on prévoie lit et repas." },
    { qEn: 'What does it cost?',             qFr: '« Combien ça coûte ?»',
      aEn: 'Woofers stay free in exchange for ~6 hours of work per day. Show-only guests: $10 single / $20 weekend pass.',
      aFr: 'Les woofers logent gratuitement en échange de ~6 heures de travail par jour. Spectacle seul : 10 $ par soir, 20 $ pour la fin de semaine.' },
    { qEn: 'Are dogs welcome?',              qFr: 'Les chiens sont-ils acceptés ?',
      aEn: 'On a leash, with a humane host. Tell us in advance — there\u2019s a household cat who has feelings.',
      aFr: "En laisse, avec un humain·e responsable. Prévenez-nous — il y a un chat de la maison qui a des sentiments." },
    { qEn: 'Can I just come for a day?',     qFr: 'Je peux venir une seule journée ?',
      aEn: 'Yes — pick any single day that works for you when you register. Arrival and departure are both flexible.',
      aFr: "Oui — choisissez la journée qui vous convient au moment de l'inscription. L'arrivée et le départ sont tous deux flexibles." },
  ];

  return (
    <div className="space-y-12">
      <header className="text-center">
        <SectionEyebrow>{t('Practical', 'Pratique')}</SectionEyebrow>
        <h3 className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mb-4" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}>
          {t('Get there, share a ride, claim a need', 'Venez, partagez la route, prenez une tâche')}
        </h3>
      </header>

      {/* Address + contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="p-6 md:p-8" style={cardSurface}>
          <SectionEyebrow>{t('Where', 'Où')}</SectionEyebrow>
          <h4 className="font-prata uppercase text-[#f3e5ab] text-xl mb-2">Maison Favier</h4>
          <p className="font-josefin text-neutral-200 text-sm leading-relaxed mb-1">826 Côte à Favier</p>
          <p className="font-josefin text-neutral-200 text-sm leading-relaxed mb-3">Namur, QC J0V 1N0</p>
          <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.25em]">
            {t('Map embedded on the live page.', 'Carte intégrée dans la version finale.')}
          </p>
        </div>
        <div className="p-6 md:p-8" style={cardSurface}>
          <SectionEyebrow>{t('Contact', 'Contact')}</SectionEyebrow>
          <p className="font-prata text-[#f3e5ab] text-base mb-1">514 418 3450</p>
          <p className="font-josefin text-neutral-300 text-xs uppercase tracking-[0.22em] mb-3">
            {t('Between 10am and 7pm', 'Entre 10h et 19h')}
          </p>
          <button
            type="button"
            onClick={() => user ? onNavigate('MESSAGING') : onRequireAuth()}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.4em] hover:bg-[#c5a059]/10 transition-colors"
            style={{ border: '1px solid rgba(197,160,89,0.4)' }}
          >
            {t('Message Alex', 'Message à Alex')} →
          </button>
          <p className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.25em] mt-2">
            {t('Opens the in-app inbox · no email needed', 'Ouvre la messagerie · pas besoin de courriel')}
          </p>
        </div>
      </div>

      {/* Getting here */}
      <div className="p-6 md:p-8" style={cardSurface}>
        <SectionEyebrow>{t('Getting here', 'Comment venir')}</SectionEyebrow>
        <ul className="space-y-3">
          {[
            { en: 'Carpool board — share rides with other participants',         fr: 'Tableau de covoiturage — partagez avec d\u2019autres' },
            { en: 'Train to Montebello, then a 30-min drive',                     fr: "Train jusqu'à Montebello, puis 30 min en voiture" },
            { en: 'Bus to Mont-Tremblant, then a regional connection',            fr: 'Bus jusqu\u2019à Mont-Tremblant, puis une correspondance régionale' },
            { en: "Drive — there's plenty of parking on the property",            fr: 'Voiture — beaucoup de stationnement sur place' },
          ].map((row, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-[#c5a059] shrink-0 mt-0.5" aria-hidden>—</span>
              <span className="font-josefin text-neutral-300 text-sm leading-relaxed">
                {language === 'EN' ? row.en : row.fr}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* What to bring */}
      <div className="p-6 md:p-8" style={cardSurface}>
        <SectionEyebrow>{t('What to bring', 'Quoi apporter')}</SectionEyebrow>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
          {bring.map((b, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="font-prata text-[#c5a059]/80 text-sm leading-none">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-josefin text-neutral-300 text-sm leading-relaxed">
                {language === 'EN' ? b.en : b.fr}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <SectionEyebrow>{t('Frequent questions', 'Questions fréquentes')}</SectionEyebrow>
        {faqs.map((f, i) => {
          const open = openFaq === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenFaq(open ? null : i)}
              className="w-full text-left p-5 md:p-6 transition-all"
              style={{ ...cardSurface, borderColor: open ? 'rgba(243,229,171,0.4)' : 'rgba(197,160,89,0.2)' }}
              aria-expanded={open}
            >
              <div className="flex items-start justify-between gap-4">
                <h5 className="font-prata uppercase text-[#f3e5ab] leading-tight" style={{ fontSize: '1.05rem' }}>
                  {language === 'EN' ? f.qEn : f.qFr}
                </h5>
                <span
                  className="shrink-0 font-cinzel text-[#c5a059] text-base leading-none mt-1"
                  style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                  aria-hidden
                >+</span>
              </div>
              {open && (
                <p className="font-josefin text-neutral-300 text-sm leading-relaxed mt-3 pr-8">
                  {language === 'EN' ? f.aEn : f.aFr}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Real interactive features — wired to the same Firestore collections as
          /ceilidh proper. Clicking any action while signed out prompts the
          parent's auth gate (same modal as the chapter cards). */}
      <div className="rounded-2xl overflow-hidden p-2 md:p-3" style={cardSurface}>
        <NeedsSection
          language={language}
          user={user}
          needs={needs}
          onRequireAuth={onRequireAuth}
        />
      </div>

      <div className="rounded-2xl overflow-hidden p-2 md:p-3" style={cardSurface}>
        <CovoiturageSection
          language={language}
          user={user}
          memberProfile={memberProfile}
          carpools={carpools}
          onRequireAuth={onRequireAuth}
        />
      </div>

      <div className="rounded-2xl overflow-hidden p-2 md:p-3" style={cardSurface}>
        <AbundanceSection
          language={language}
          user={user}
          memberProfile={memberProfile}
          onRequireAuth={onRequireAuth}
          onViewProfile={onViewProfile}
        />
      </div>

      {/* Square donation panel — sliding-scale contribution. Inline, not modal. */}
      <div className="rounded-2xl overflow-hidden p-2 md:p-3" style={cardSurface}>
        <ContributionPanel
          language={language}
          user={user}
          onRequireAuth={onRequireAuth}
        />
      </div>

      {/* Show-only ticket — Saturday-night-style guests. Live spot counter from
          events/{EVENT_ID}/showTickets; clicking opens the Square modal. */}
      <ShowTicketSlot
        language={language}
        user={user}
        memberProfile={memberProfile}
        onRequireAuth={onRequireAuth}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LoginModal — shown the first time a user clicks any chapter, OR whenever they
// click a locked chapter while signed out. Stub UI for the design preview:
// neither button actually authenticates — both call onConfirm(), which marks
// the user as logged in and opens the chapter they were heading toward.
// Wire to the real AuthModal/Firebase flow when ready.
// ─────────────────────────────────────────────────────────────────────────────

const LoginModal: React.FC<{
  chapter: Chapter | null;
  language: 'EN' | 'FR';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ chapter, language, onConfirm, onCancel }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const [email, setEmail] = useState('');

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const titleLine = chapter
    ? (language === 'EN'
        ? `Sign in to open Chapter ${chapter.num} · ${chapter.titleEn}`
        : `Connectez-vous pour ouvrir le chapitre ${chapter.num} · ${chapter.titleFr}`)
    : t('Sign in to continue', 'Connectez-vous pour continuer');

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('Sign in', 'Connexion')}
    >
      {/* Backdrop — click to dismiss */}
      <button
        type="button"
        onClick={onCancel}
        aria-label={t('Cancel', 'Annuler')}
        className="absolute inset-0 cursor-default login-backdrop"
        style={{ background: 'rgba(2,2,2,0.78)', backdropFilter: 'blur(8px)' }}
      />
      {/* Card */}
      <div
        className="login-modal relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(28,22,14,0.96) 0%, rgba(12,9,6,0.98) 100%)',
          border: '1px solid rgba(197,160,89,0.4)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(197,160,89,0.18)',
        }}
      >
        {/* Top eyebrow + close */}
        <div className="flex items-center justify-between px-7 pt-6">
          <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">
            {t('Member access', 'Accès membre')}
          </span>
          <button
            onClick={onCancel}
            aria-label={t('Close', 'Fermer')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#f3e5ab] hover:bg-black/40 transition-colors"
            style={{ border: '1px solid rgba(197,160,89,0.3)' }}
          >
            ✕
          </button>
        </div>
        {/* Title */}
        <div className="px-7 pt-6 pb-2">
          <h3
            className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mb-3"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)' }}
          >
            {chapter ? (language === 'EN' ? `Open Chapter ${chapter.num}` : `Chapitre ${chapter.num}`) : t('Sign in', 'Connexion')}
          </h3>
          <p className="font-josefin text-neutral-400 text-xs uppercase tracking-[0.25em] leading-relaxed">
            {titleLine}
          </p>
        </div>
        {/* Body — Google button, divider, email */}
        <div className="px-7 pt-6 pb-7 space-y-3">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-lg font-josefin text-sm uppercase tracking-[0.18em] text-[#1a1208] hover:scale-[1.01] active:scale-[0.99] transition-transform"
            style={{
              background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
              border: '1px solid rgba(243,229,171,0.7)',
              boxShadow: '0 6px 24px rgba(197,160,89,0.4)',
            }}
          >
            <GoogleGlyph />
            {t('Continue with Google', 'Continuer avec Google')}
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[#c5a059]/20" />
            <span className="font-cinzel text-[#c5a059]/60 text-[9px] uppercase tracking-[0.4em]">
              {t('or', 'ou')}
            </span>
            <div className="h-px flex-1 bg-[#c5a059]/20" />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
            className="space-y-3"
          >
            <label className="block">
              <span className="sr-only">{t('Email', 'Courriel')}</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t('your@email.com', 'votre@courriel.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg bg-black/40 text-[#f3e5ab] placeholder-neutral-500 font-josefin text-sm tracking-[0.05em] focus:outline-none focus:border-[#c5a059] transition-colors"
                style={{ border: '1px solid rgba(197,160,89,0.3)' }}
              />
            </label>
            <button
              type="submit"
              className="w-full px-5 py-3.5 rounded-lg font-josefin text-xs uppercase tracking-[0.3em] text-[#f3e5ab] hover:bg-[#c5a059]/10 transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid rgba(197,160,89,0.45)',
              }}
            >
              {t('Continue with email', 'Continuer avec courriel')}
            </button>
          </form>
          <p className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.25em] text-center pt-2 leading-relaxed">
            {t(
              'By continuing you agree to our terms · we never share your email',
              'En continuant vous acceptez nos conditions · nous ne partageons jamais votre courriel',
            )}
          </p>
        </div>
      </div>
      <style>{`
        .login-modal {
          animation: c2LoginIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes c2LoginIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1);       }
        }
        .login-backdrop {
          animation: c2LoginFadeIn 0.35s ease-out forwards;
        }
        @keyframes c2LoginFadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .login-modal, .login-backdrop { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
};

const GoogleGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.708A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.708V4.96H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.292C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

// ─── ShowTicketSlot — live spot counter + modal trigger ─────────────────────
const ShowTicketSlot: React.FC<{
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onRequireAuth: () => void;
}> = ({ language, user, memberProfile, onRequireAuth }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const [tickets, setTickets] = useState<{ id: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, `events/${EVENT_ID}/showTickets`), (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id })));
    });
  }, []);
  const SHOW_CAPACITY = 20;
  const spotsLeft = Math.max(0, SHOW_CAPACITY - tickets.length);

  const handleOpen = () => {
    if (!user || !memberProfile) { onRequireAuth(); return; }
    setOpen(true);
  };

  return (
    <div
      className="p-6 md:p-8 rounded-2xl flex flex-col md:flex-row gap-6 items-start md:items-center"
      style={cardSurface}
    >
      <div className="flex-1 min-w-0">
        <SectionEyebrow>{t('Show-only attendance', 'Spectacle uniquement')}</SectionEyebrow>
        <h4 className="font-prata uppercase text-[#f3e5ab] leading-tight mb-2" style={{ fontSize: '1.25rem' }}>
          {t('$10 single · $20 weekend pass', '10 $ par soir · 20 $ pour la fin de semaine')}
        </h4>
        <p className="font-josefin text-neutral-300 text-sm leading-relaxed mb-1">
          {t('20 spots per night. Bring something for the potluck table.',
             '20 places par soir. Apportez quelque chose pour la table-partage.')}
        </p>
        <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
          {spotsLeft} {t(spotsLeft === 1 ? 'spot left' : 'spots left',
                        spotsLeft === 1 ? 'place restante' : 'places restantes')}
        </p>
        {purchasedCode && (
          <p className="font-prata text-[#f3e5ab] text-sm mt-3">
            ✦ {t('Your ticket code', 'Votre code')} <span className="text-[#d4af37]">{purchasedCode}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={spotsLeft === 0}
        className="shrink-0 px-5 py-2.5 rounded-full font-cinzel text-[#1a1208] text-[10px] uppercase tracking-[0.45em] disabled:opacity-40"
        style={{
          background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
          boxShadow: '0 4px 12px rgba(197,160,89,0.35)',
        }}
      >
        {spotsLeft === 0 ? t('Sold out', 'Épuisé') : t('Buy ticket', 'Acheter un billet')} →
      </button>
      {open && user && memberProfile && (
        <ShowTicketModal
          language={language}
          user={user}
          memberProfile={memberProfile}
          spotsLeft={spotsLeft}
          onClose={() => setOpen(false)}
          onSuccess={(code) => { setPurchasedCode(code); setOpen(false); }}
        />
      )}
    </div>
  );
};
