import React, { useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { AuthModal, type MemberProfile } from './AuthModal';
import { CommunityMembershipSection } from './CommunityMembershipSection';
import { SeoBlock } from './SeoBlock';

// Dedicated page for the paid resident-member offer ("Faire partie de la
// communauté"), at /communaute. Separate from the volunteer wwoofing page.
interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
}

export const CommunityPage: React.FC<Props> = ({
  onNavigate, language, user, memberProfile, onUserChange, onShowPrivacy,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [showAuth, setShowAuth] = useState(false);
  const [authPending, setAuthPending] = useState(false);

  const handleAuthSuccess = useCallback((u: User, p: MemberProfile) => {
    onUserChange(u, p);
    setShowAuth(false);
  }, [onUserChange]);

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeInCommunity">
      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('INN')}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {t('Back to the Inn', "Retour à l'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">COMMUNAUTÉ</span>
        </div>
      </header>

      <main className="pt-16">
        <CommunityMembershipSection
          language={language}
          user={user}
          memberProfile={memberProfile}
          autoOpen={authPending}
          onRequestAuth={() => { setAuthPending(true); setShowAuth(true); }}
        />

        <SeoBlock viewKey="COMMUNITY" language={language} />

        <footer className="px-6 md:px-12 lg:px-20 py-16 border-t border-[#c5a059]/10 bg-[#050505]">
          <div className="max-w-6xl flex flex-wrap items-center gap-8">
            <button
              onClick={() => onNavigate('WWOOFING')}
              className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#c5a059] hover:text-[#f3e5ab] transition-colors"
            >
              {t('See volunteer wwoofing', 'Voir le wwoofing bénévole')} →
            </button>
            <button
              onClick={() => onNavigate('INN')}
              className="font-cinzel text-xs uppercase tracking-[0.3em] text-neutral-500 hover:text-white transition-colors"
            >
              {t('Back to the Inn', "Retour à l'auberge")}
            </button>
          </div>
        </footer>
      </main>

      {showAuth && (
        <AuthModal
          language={language}
          onClose={() => { setShowAuth(false); setAuthPending(false); }}
          onAuthSuccess={handleAuthSuccess}
          onShowPrivacy={onShowPrivacy}
        />
      )}

      <style>{`
        .animate-fadeInCommunity { animation: fadeInCommunity 0.6s ease-out forwards; }
        @keyframes fadeInCommunity { from { opacity: 0; filter: blur(5px); } to { opacity: 1; filter: blur(0); } }
      `}</style>
    </div>
  );
};
