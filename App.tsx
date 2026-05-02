
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { LoadingScreen } from './components/LoadingScreen';

// Pages — code-split: each ships as its own chunk, fetched on first navigation.
// Components use named exports, so we adapt with `.then(m => ({ default: m.X }))`.
const InnPage           = lazy(() => import('./components/InnPage').then(m => ({ default: m.InnPage })));
const InnPageTest2      = lazy(() => import('./components/InnPageTest2').then(m => ({ default: m.InnPageTest2 })));
const InnPageTest3      = lazy(() => import('./components/InnPageTest3').then(m => ({ default: m.InnPageTest3 })));
const MassotherapyPage  = lazy(() => import('./components/MassotherapyPage').then(m => ({ default: m.MassotherapyPage })));
const HostsPage         = lazy(() => import('./components/HostsPage').then(m => ({ default: m.HostsPage })));
const GuidePage         = lazy(() => import('./components/GuidePage').then(m => ({ default: m.GuidePage })));
const KitchenPage       = lazy(() => import('./components/KitchenPage').then(m => ({ default: m.KitchenPage })));
const EventsPage        = lazy(() => import('./components/EventsPage').then(m => ({ default: m.EventsPage })));
const CeilidhPage       = lazy(() => import('./components/CeilidhPage').then(m => ({ default: m.CeilidhPage })));
const CeilidhPageTest1  = lazy(() => import('./components/CeilidhPageTest1').then(m => ({ default: m.CeilidhPageTest1 })));
const CeilidhPageTest2  = lazy(() => import('./components/CeilidhPageTest2').then(m => ({ default: m.CeilidhPageTest2 })));
const WwoofingPage      = lazy(() => import('./components/WwoofingPage').then(m => ({ default: m.WwoofingPage })));
const ProfilePage       = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PublicProfilePage = lazy(() => import('./components/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })));
const MessagingPage     = lazy(() => import('./components/MessagingPage').then(m => ({ default: m.MessagingPage })));
const AdminCRM          = lazy(() => import('./components/AdminCRM').then(m => ({ default: m.AdminCRM })));

// Suspense fallback shown briefly while a page chunk loads on navigation.
const PageLoader: React.FC = () => (
  <div className="fixed inset-0 bg-[#050505] z-40 flex items-center justify-center">
    <div className="text-[#d4af37] text-[10px] font-cinzel uppercase tracking-[0.5em] animate-pulse">
      Le Salon des Inconnus
    </div>
  </div>
);
import { CookieBanner, type ConsentLevel } from './components/CookieBanner';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { MemberPanel } from './components/MemberPanel';
import { MUSIC_GENRES, ACCOMMODATIONS } from './constants';
import { PAGE_META } from './config/seo.config';
import { getOptimizedUrl } from './utils/imageOptimizer';
import { auth, db } from './firebase';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './components/AuthModal';

// -4dB is approximately 0.63 on the linear 0-1 volume scale
const TARGET_VOLUME = 0.63;

// --- 1. CRITICAL ASSETS (Above the fold) ---
// These block the loading screen. Minimized to ensuring immediate visual quality.
const INITIAL_ASSETS = [
  // Hero Image (InnPage) - Width 1920
  getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg", 1920),
  
  // Textures (InnPage) - Width 1000
  getOptimizedUrl("https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog1.png", 1000),
  getOptimizedUrl("https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog2.png", 1000),
  getOptimizedUrl("https://www.transparenttextures.com/patterns/stardust.png", 1000),
  getOptimizedUrl("https://www.transparenttextures.com/patterns/paisley.png", 1000),
  
  // History Image (Visible on first scroll/swipe) - Width 800 (Card variant)
  getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg", 800),

  // Logo - Kept raw to match the hardcoded <img> in LoadingScreen (avoids cache miss)
  "https://i.imgur.com/B1YfPqn.png"
];

// --- 2. DEFERRED ASSETS (Below the fold) ---
// These are loaded silently in the background when the user is idle.
const DEFERRED_ASSETS = [
    // Manor Hero (High Res for Detail View)
    getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg", 1920),
    // Kitchen Portal
    getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Cuisine/Plating%20alexis%20ai%20(1).jpg", 800),
    // Massage Portal
    getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/massage/massage%20andre.png", 800),
    // Local Guide Parallax
    getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg", 1920),
    // Gallery Highlight
    getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png", 1920),
    // Listing Thumbnails (First image of each accommodation, Card size)
    ...ACCOMMODATIONS.map(acc => getOptimizedUrl(acc.images[0], 800))
];

// --- 3. SMART IDLE PRELOADER HOOK ---
const useIdlePreloader = (assets: string[], shouldStart: boolean) => {
  useEffect(() => {
    if (!shouldStart || assets.length === 0) return;

    const queue = [...assets];
    let isPaused = false;
    let timer: any = null;

    const preloadImage = (url: string) => {
        const img = new Image();
        img.src = url;
    };

    const processQueue = () => {
        if (queue.length === 0) return;
        
        if (isPaused) {
            // If paused (scrolling), check back in 200ms
            timer = setTimeout(processQueue, 200);
            return;
        }

        // Use requestIdleCallback if available (Chrome/Edge)
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback((deadline: any) => {
                // Load as many as possible within idle time
                while (deadline.timeRemaining() > 0 && queue.length > 0 && !isPaused) {
                    const src = queue.shift();
                    if (src) preloadImage(src);
                }
                // Continue if queue not empty
                if (queue.length > 0) processQueue();
            });
        } else {
            // Fallback for Safari/Firefox: Load one, then wait
            const src = queue.shift();
            if (src) preloadImage(src);
            timer = setTimeout(processQueue, 50); 
        }
    };

    // Pause preloading when scrolling to save bandwidth/FPS
    const onScroll = () => {
        isPaused = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            isPaused = false;
            processQueue();
        }, 150); // Resume 150ms after scroll stops
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Start the queue
    processQueue();

    return () => {
        window.removeEventListener('scroll', onScroll);
        if (timer) clearTimeout(timer);
    };
  }, [shouldStart]); // Only re-run if start condition changes
};


// View State Definitions
type ViewState = 'INN' | 'INN_TEST2' | 'INN_TEST3' | 'MASSOTHERAPY' | 'HOSTS' | 'GUIDE' | 'KITCHEN' | 'EVENTS' | 'CEILIDH' | 'CEILIDH_TEST1' | 'CEILIDH_TEST2' | 'WWOOFING'
              | 'MY_PROFILE' | 'PUBLIC_PROFILE' | 'MESSAGING' | 'ADMIN';

const VIEW_PATHS: Record<ViewState, string> = {
  INN:            '/',
  INN_TEST2:      '/mainpagetest2',
  INN_TEST3:      '/mainpagetest3',
  MASSOTHERAPY:   '/massage',
  HOSTS:          '/about',
  GUIDE:          '/guide',
  KITCHEN:        '/cuisine',
  EVENTS:         '/evenements',
  CEILIDH:        '/ceilidh',
  CEILIDH_TEST1:  '/ceilidhtest1',
  CEILIDH_TEST2:  '/ceilidhtest2',
  WWOOFING:       '/wwoofing',
  MY_PROFILE:     '/profil',
  PUBLIC_PROFILE: '/membre',
  MESSAGING:      '/messages',
  ADMIN:          '/admin',
};

const PATH_VIEWS: Record<string, ViewState> = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([v, p]) => [p, v as ViewState])
);

const pathToView = (pathname: string): ViewState =>
  PATH_VIEWS[pathname] ?? PATH_VIEWS[pathname.replace(/\/$/, '')] ?? 'INN';

const App: React.FC = () => {
  // App Loading State
  const [isLoading, setIsLoading] = useState(true);

  // View State — initialise from current URL
  const [currentView, setCurrentView] = useState<ViewState>(() =>
    pathToView(window.location.pathname)
  );

  // Language State - Default to FR
  const [language, setLanguage] = useState<'EN' | 'FR'>('FR');

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  // Set when user returns from a Google redirect sign-in but has no Firestore profile yet
  const [redirectPendingUser, setRedirectPendingUser] = useState<User | null>(null);

  // Social space state
  const [publicProfileUid, setPublicProfileUid] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Privacy / Compliance State
  const [consentLevel, setConsentLevel] = useState<ConsentLevel | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Music State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentGenre, setCurrentGenre] = useState<keyof typeof MUSIC_GENRES | null>(null);
  const [isMusicMenuOpen, setIsMusicMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger Background Loading when initial loading finishes
  useIdlePreloader(DEFERRED_ASSETS, !isLoading);

  // --- 1. NAVIGATION HELPER ---
  const handleNavigation = (destination: ViewState) => {
    const path = VIEW_PATHS[destination] ?? '/';
    if (window.location.pathname !== path) {
      history.pushState({ view: destination }, '', path);
    }
    setCurrentView(destination);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back / forward
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      setCurrentView(e.state?.view ?? pathToView(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Update document title + meta description per view (single source: config/seo.config.ts)
  useEffect(() => {
    const meta = PAGE_META[currentView]?.[language];
    if (!meta) return;
    document.title = meta.title;
    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', value);
    };
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[property="og:url"]', `https://lesalondesinconnus.com${VIEW_PATHS[currentView]}`);
    setMeta('meta[name="twitter:title"]', meta.title);
    setMeta('meta[name="twitter:description"]', meta.description);
  }, [currentView, language]);

  // Auth State Listener
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && db) {
        const snap = await getDoc(doc(db, 'members', user.uid));
        setMemberProfile(snap.exists() ? snap.data() as MemberProfile : null);
      } else {
        setMemberProfile(null);
      }
    });
    return unsub;
  }, []);

  // Handle users returning from a Google redirect sign-in
  useEffect(() => {
    if (!auth || !db) return;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        const snap = await getDoc(doc(db, 'members', result.user.uid));
        if (snap.exists()) {
          // Returning member — profile already loaded by onAuthStateChanged, just ensure it's set
          setCurrentUser(result.user);
          setMemberProfile(snap.data() as MemberProfile);
        } else {
          // New user via redirect — need membership selection
          setCurrentUser(result.user);
          setRedirectPendingUser(result.user);
        }
      })
      .catch(() => { /* ignore — no pending redirect */ });
  }, []);

  const handleUserChange = (user: User | null, profile: MemberProfile | null) => {
    setCurrentUser(user);
    setMemberProfile(profile);
    setRedirectPendingUser(null); // clear pending redirect state on any auth change
  };

  const handleViewProfile = (uid: string) => {
    setPublicProfileUid(uid);
    handleNavigation('PUBLIC_PROFILE');
  };

  const handleStartDM = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  // Initialize Audio
  useEffect(() => {
    const genres = Object.keys(MUSIC_GENRES) as (keyof typeof MUSIC_GENRES)[];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    setCurrentGenre(randomGenre);

    const audio = new Audio(MUSIC_GENRES[randomGenre]);
    audio.loop = true;
    audio.volume = TARGET_VOLUME; 
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Music Handlers
  const changeGenre = (genre: keyof typeof MUSIC_GENRES) => {
    if (!audioRef.current) return;

    if (isMusicPlaying && currentGenre === genre) {
      setIsMusicMenuOpen(false);
      return;
    }

    let vol = audioRef.current.volume;
    const fadeOut = setInterval(() => {
      if (audioRef.current && vol > 0) {
        vol = Math.max(0, vol - 0.05);
        audioRef.current.volume = vol;
      } else {
        clearInterval(fadeOut);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = MUSIC_GENRES[genre];
          setCurrentGenre(genre);
          
          audioRef.current.play().then(() => {
            setIsMusicPlaying(true);
            if (audioRef.current) audioRef.current.volume = 0;
            let newVol = 0;
            const fadeIn = setInterval(() => {
              if (audioRef.current && newVol < TARGET_VOLUME) {
                newVol = Math.min(newVol + 0.05, TARGET_VOLUME);
                audioRef.current.volume = newVol;
              } else {
                clearInterval(fadeIn);
              }
            }, 50);
          });
        }
      }
    }, 30);
    setIsMusicMenuOpen(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMusicPlaying) {
      let vol = audioRef.current.volume;
      const interval = setInterval(() => {
        if (audioRef.current && vol > 0) {
          vol = Math.max(0, vol - 0.05);
          audioRef.current.volume = vol;
        } else {
          clearInterval(interval);
          if (audioRef.current) audioRef.current.pause();
          setIsMusicPlaying(false);
        }
      }, 50);
    } else {
      if (!currentGenre) return;
      audioRef.current.play();
      setIsMusicPlaying(true);
      let vol = 0;
      audioRef.current.volume = 0;
      const interval = setInterval(() => {
        if (audioRef.current && vol < TARGET_VOLUME) {
          vol = Math.min(vol + 0.05, TARGET_VOLUME);
          audioRef.current.volume = vol;
        } else {
          clearInterval(interval);
        }
      }, 50);
    }
    setIsMusicMenuOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'FR' : 'EN');
  };

  return (
    <div className="relative h-screen w-screen bg-[#050505] overflow-hidden font-sans">
      
      {/* 1. Global Loading Screen (Only on initial load) */}
      {isLoading && (
          <LoadingScreen 
            onComplete={() => setIsLoading(false)} 
            images={INITIAL_ASSETS} // ONLY load critical assets initially
          />
      )}

      {/* 2. Global site header — INN + editorial test3 (test page parity) */}
      {!isLoading && (currentView === 'INN' || currentView === 'INN_TEST3') && (
        <SiteHeader
          language={language}
          currentView={currentView}
          onNavigate={handleNavigation}
          onToggleLanguage={toggleLanguage}
          isMusicPlaying={isMusicPlaying}
          isMusicMenuOpen={isMusicMenuOpen}
          setIsMusicMenuOpen={setIsMusicMenuOpen}
          changeGenre={changeGenre}
          toggleMute={toggleMute}
          currentGenre={currentGenre}
          user={currentUser}
          memberProfile={memberProfile}
          onUserChange={handleUserChange}
          onShowPrivacy={() => setShowPrivacyPolicy(true)}
          redirectPendingUser={redirectPendingUser}
          onRedirectUserHandled={() => setRedirectPendingUser(null)}
        />
      )}

      {/* All page views — wrapped in a single Suspense boundary so navigation
          shows a brief loader while the next page chunk downloads. */}
      <Suspense fallback={<PageLoader />}>
        {/* VIEW 1: THE INN (DEFAULT) — now backed by the redesigned editorial
            page (was at /mainpagetest3). The original InnPage.tsx still ships
            because some inner components (TrustedPlatforms, ManorRoomsSection,
            DetailsSection, etc.) are imported by the redesign. */}
        {currentView === 'INN' && (
          <InnPageTest3
            language={language}
            onNavigate={(view) => handleNavigation(view as ViewState)}
          />
        )}

        {/* VIEW 1c: Inn editorial test 2 (Bespoke pattern, hero only) — /mainpagetest2 */}
        {currentView === 'INN_TEST2' && (
          <InnPageTest2
            language={language}
            onNavigate={(view) => handleNavigation(view as ViewState)}
          />
        )}

        {/* VIEW 1d: Inn editorial test 3 — bold rebuild from scratch — /mainpagetest3 */}
        {currentView === 'INN_TEST3' && (
          <InnPageTest3
            language={language}
            onNavigate={(view) => handleNavigation(view as ViewState)}
          />
        )}

        {/* VIEW 2: MASSOTHERAPY */}
        {currentView === 'MASSOTHERAPY' && (
          <MassotherapyPage
            onNavigate={() => handleNavigation('INN')}
            language={language}
          />
        )}

        {/* VIEW 3: HOSTS */}
        {currentView === 'HOSTS' && (
          <HostsPage
            onNavigate={(view) => handleNavigation(view)}
            language={language}
          />
        )}

        {/* VIEW 4: GUIDE */}
        {currentView === 'GUIDE' && (
          <GuidePage
            onNavigate={() => handleNavigation('INN')}
            language={language}
          />
        )}

        {/* VIEW 5: KITCHEN */}
        {currentView === 'KITCHEN' && (
          <KitchenPage
            onNavigate={() => handleNavigation('INN')}
            language={language}
          />
        )}

        {/* VIEW 6: EVENTS */}
        {currentView === 'EVENTS' && (
          <EventsPage
            onNavigate={(view) => handleNavigation(view)}
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
          />
        )}

        {/* VIEW 7: CEILIDH — now backed by the redesigned chapter-cards page.
            The original CeilidhPage.tsx file is still imported (its inner
            components — KanbanBoard, NeedsSection, CovoiturageSection,
            AbundanceSection, PresenceTimeline — are reused inside the new shell). */}
        {currentView === 'CEILIDH' && (
          <CeilidhPageTest2
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            onUserChange={handleUserChange}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
            onViewProfile={handleViewProfile}
          />
        )}

        {/* VIEW 7-test1: Ceilidh redesign — Avenue A "Estate Map" — /ceilidhtest1 */}
        {currentView === 'CEILIDH_TEST1' && (
          <CeilidhPageTest1
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7-test2: Ceilidh redesign — Avenue B "Chapter Cards" — /ceilidhtest2 */}
        {currentView === 'CEILIDH_TEST2' && (
          <CeilidhPageTest2
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            onUserChange={handleUserChange}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
            onViewProfile={handleViewProfile}
          />
        )}

        {/* VIEW 7b: WWOOFING */}
        {currentView === 'WWOOFING' && (
          <WwoofingPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            onUserChange={handleUserChange}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
          />
        )}

        {/* VIEW 8: MY PROFILE */}
        {currentView === 'MY_PROFILE' && currentUser && memberProfile && (
          <ProfilePage
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            onNavigate={(view) => handleNavigation(view as ViewState)}
            onProfileUpdate={(profile) => setMemberProfile(profile)}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
          />
        )}

        {/* VIEW 9: PUBLIC PROFILE */}
        {currentView === 'PUBLIC_PROFILE' && publicProfileUid && (
          <PublicProfilePage
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            targetUid={publicProfileUid}
            onNavigate={(view) => handleNavigation(view as ViewState)}
            onStartDM={handleStartDM}
            onRequireAuth={() => {/* MemberPanel handles this */}}
          />
        )}

        {/* VIEW 10: MESSAGING */}
        {currentView === 'MESSAGING' && currentUser && memberProfile && (
          <MessagingPage
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            initialConversationId={activeConversationId}
            onNavigate={(view) => handleNavigation(view as ViewState)}
            onViewProfile={handleViewProfile}
          />
        )}

        {/* VIEW 11: ADMIN CRM */}
        {currentView === 'ADMIN' && (
          <AdminCRM
            language={language}
            onNavigate={(view) => handleNavigation(view as ViewState)}
            user={currentUser}
          />
        )}
      </Suspense>

      {/* GLOBAL: Subtle admin footer link */}
      {!isLoading && currentView !== 'ADMIN' && (
        <button
          onClick={() => handleNavigation('ADMIN')}
          className="fixed bottom-3 left-4 z-[50] text-[9px] font-cinzel text-neutral-800 hover:text-neutral-500 uppercase tracking-widest transition-colors"
        >
          Admin
        </button>
      )}

      {/* GLOBAL: Cookie / Privacy Consent Banner */}
      {!isLoading && (
        <CookieBanner
          language={language}
          onShowPrivacy={() => setShowPrivacyPolicy(true)}
          onConsentChange={(level) => setConsentLevel(level)}
        />
      )}

      {/* GLOBAL: Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <PrivacyPolicyModal
          language={language}
          onClose={() => setShowPrivacyPolicy(false)}
        />
      )}

      <style>{`
        .animate-fadeIn {
          animation: fadeInView 0.5s ease-out forwards;
        }
        @keyframes fadeInView {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

    </div>
  );
};

export default App;
