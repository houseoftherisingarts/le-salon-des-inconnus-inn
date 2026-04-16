
import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';
import { AuthModal } from './AuthModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberPanelProps {
  user: User | null;
  memberProfile: MemberProfile | null;
  language: 'EN' | 'FR';
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
  onNavigate?: (view: string) => void;
  /** User who returned from a Google redirect but has no Firestore profile yet */
  redirectPendingUser?: User | null;
  onRedirectUserHandled?: () => void;
}

// ─── Membership badge colors ─────────────────────────────────────────────────

const MEMBERSHIP_COLORS: Record<string, { bg: string; text: string; label: string; label_fr: string }> = {
  'voyageur':          { bg: 'bg-sky-900/60',      text: 'text-sky-300',    label: 'Voyageur',          label_fr: 'Voyageur'          },
  'artiste':           { bg: 'bg-purple-900/60',    text: 'text-purple-300', label: 'Artiste',            label_fr: 'Artiste'           },
  'membre-communaute': { bg: 'bg-emerald-900/60',   text: 'text-emerald-300',label: 'Community Member',   label_fr: 'Membre Communauté' },
  'resident':          { bg: 'bg-amber-900/60',     text: 'text-amber-300',  label: 'Resident',           label_fr: 'Résident'          },
  'woofer':            { bg: 'bg-rose-900/60',      text: 'text-rose-300',   label: 'Woofer',             label_fr: 'Woofer'            },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MemberPanel: React.FC<MemberPanelProps> = ({
  user,
  memberProfile,
  language,
  onUserChange,
  onShowPrivacy,
  onNavigate,
  redirectPendingUser,
  onRedirectUserHandled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Auto-open auth modal when a redirect pending user needs to complete membership
  const [showAuth, setShowAuth] = useState(!!redirectPendingUser);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  // Auto-open the auth modal when App.tsx detects a redirect-returned new user
  useEffect(() => {
    if (redirectPendingUser) setShowAuth(true);
  }, [redirectPendingUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSignOut = async () => {
    if (!auth) return;
    setIsSigningOut(true);
    try {
      await signOut(auth);
      onUserChange(null, null);
      setIsOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  const membershipInfo = memberProfile
    ? MEMBERSHIP_COLORS[memberProfile.membershipType] ?? MEMBERSHIP_COLORS['voyageur']
    : null;

  // ── Not logged in ─────────────────────────────────────────────────────────

  if (!user || !memberProfile) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full
                     text-[10px] font-cinzel uppercase tracking-widest text-yellow-100/60
                     hover:border-[#d4af37]/50 hover:text-yellow-100 transition-all duration-200"
          title={t('Member Space', 'Espace Membre')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="hidden sm:block">{t('Member Space', 'Espace Membre')}</span>
        </button>

        {showAuth && (
          <AuthModal
            language={language}
            onClose={() => { setShowAuth(false); onRedirectUserHandled?.(); }}
            onAuthSuccess={(u, p) => {
              onUserChange(u, p);
              setShowAuth(false);
              onRedirectUserHandled?.();
            }}
            onShowPrivacy={onShowPrivacy}
            redirectPendingUser={redirectPendingUser}
          />
        )}
      </>
    );
  }

  // ── Logged in ─────────────────────────────────────────────────────────────

  const displayName = memberProfile.displayName || user.displayName || t('Member', 'Membre');
  const photoURL = memberProfile.photoURL || user.photoURL;
  const isAdmin = memberProfile.isAdmin;

  return (
    <div ref={dropdownRef} className="relative">

      {/* ── Avatar chip ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 bg-black/40 backdrop-blur-md border rounded-full px-2 py-1 transition-all duration-200
          ${isOpen ? 'border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.2)]' : 'border-white/10 hover:border-[#d4af37]/40'}`}
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full overflow-hidden border border-[#d4af37]/40 shrink-0">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#d4af37]/20 flex items-center justify-center">
              <span className="text-[9px] font-cinzel font-bold text-[#d4af37]">
                {getInitials(displayName)}
              </span>
            </div>
          )}
        </div>

        {/* Name (hidden on very small screens) */}
        <span className="hidden sm:block text-[10px] font-cinzel text-yellow-100/80 max-w-[120px] truncate">
          {displayName.split(' ')[0]}
        </span>

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          className={`w-3 h-3 text-white/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      {isOpen && (
        <div className="absolute top-10 right-0 z-[200] w-72 bg-[#0a0a0a] border border-[#d4af37]/25
                        shadow-2xl animate-fadeInPanel">

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#d4af37]/50" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#d4af37]/50" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#d4af37]/50" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#d4af37]/50" />

          {/* Header */}
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              {/* Large avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4af37]/40 shrink-0">
                {photoURL ? (
                  <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#d4af37]/15 flex items-center justify-center">
                    <span className="text-sm font-cinzel font-bold text-[#d4af37]">
                      {getInitials(displayName)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-cinzel text-white text-sm truncate">{displayName}</div>
                {(memberProfile.email || memberProfile.phone) && (
                  <div className="text-neutral-600 text-[10px] font-lato truncate mt-0.5">
                    {memberProfile.email || memberProfile.phone}
                  </div>
                )}
                {/* Membership badge */}
                {membershipInfo && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-cinzel uppercase tracking-wider ${membershipInfo.bg} ${membershipInfo.text}`}>
                    {language === 'FR' ? membershipInfo.label_fr : membershipInfo.label}
                  </span>
                )}
                {/* Admin badge */}
                {isAdmin && (
                  <span className="inline-block ml-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-cinzel uppercase tracking-wider bg-[#d4af37]/20 text-[#d4af37]">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-2">

            {/* My Registrations */}
            {onNavigate && (
              <button
                onClick={() => { onNavigate('EVENTS'); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-left
                           text-neutral-400 hover:text-white hover:bg-white/4 transition-colors group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="w-4 h-4 text-[#d4af37]/50 group-hover:text-[#d4af37] transition-colors shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <div>
                  <div className="text-xs font-cinzel">{t('My Events', 'Mes Événements')}</div>
                  <div className="text-[10px] text-neutral-600 font-lato mt-0.5">
                    {t('Ceilidh de Mai · Registrations', 'Ceilidh de Mai · Inscriptions')}
                  </div>
                </div>
              </button>
            )}

            {/* Ceilidh shortcut */}
            {onNavigate && (
              <button
                onClick={() => { onNavigate('CEILIDH'); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-left
                           text-neutral-400 hover:text-white hover:bg-white/4 transition-colors group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="w-4 h-4 text-[#d4af37]/50 group-hover:text-[#d4af37] transition-colors shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
                <div>
                  <div className="text-xs font-cinzel">{t('Ceilidh de Mai 2026', 'Ceilidh de Mai 2026')}</div>
                  <div className="text-[10px] text-neutral-600 font-lato mt-0.5">
                    {t('May 21–25 · Namur, QC', '21–25 mai · Namur, QC')}
                  </div>
                </div>
              </button>
            )}

            <div className="h-px bg-white/5 mx-5 my-1" />

            {/* Privacy Policy */}
            <button
              onClick={() => { onShowPrivacy(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left
                         text-neutral-600 hover:text-white hover:bg-white/4 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                className="w-4 h-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-[10px] font-lato">
                {t('Privacy Policy', 'Politique de Confidentialité')}
              </span>
            </button>

            <div className="h-px bg-white/5 mx-5 my-1" />

            {/* Déconnexion */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-3 px-5 py-3 text-left
                         text-red-400/70 hover:text-red-300 hover:bg-red-950/30 transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                className="w-4 h-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="text-xs font-cinzel uppercase tracking-widest">
                {isSigningOut
                  ? t('Signing out…', 'Déconnexion…')
                  : t('Sign Out', 'Déconnexion')}
              </span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .animate-fadeInPanel {
          animation: fadeInPanel 0.15s ease-out forwards;
        }
        @keyframes fadeInPanel {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
