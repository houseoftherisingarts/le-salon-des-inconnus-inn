
import React, { useState, useEffect, useRef } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { InnPage } from './components/InnPage';
import { MassotherapyPage } from './components/MassotherapyPage';
import { HostsPage } from './components/HostsPage';
import { GuidePage } from './components/GuidePage';
import { KitchenPage } from './components/KitchenPage';
import { EventsPage } from './components/EventsPage';
import { CeilidhPage } from './components/CeilidhPage';
import { CookieBanner, type ConsentLevel } from './components/CookieBanner';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { MemberPanel } from './components/MemberPanel';
import { MUSIC_GENRES, ACCOMMODATIONS } from './constants';
import { getOptimizedUrl } from './utils/imageOptimizer';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
type ViewState = 'INN' | 'MASSOTHERAPY' | 'HOSTS' | 'GUIDE' | 'KITCHEN' | 'EVENTS' | 'CEILIDH';

const App: React.FC = () => {
  // App Loading State
  const [isLoading, setIsLoading] = useState(true);

  // View State (Default to INN)
  const [currentView, setCurrentView] = useState<ViewState>('INN');

  // Language State - Default to FR
  const [language, setLanguage] = useState<'EN' | 'FR'>('FR');

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);

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
      setCurrentView(destination);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleUserChange = (user: User | null, profile: MemberProfile | null) => {
    setCurrentUser(user);
    setMemberProfile(profile);
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

      {/* 2. Member Panel — top-left, never overlaps the music/language controls */}
      {!isLoading && (
        <div className="fixed top-6 left-8 z-[110]">
          <MemberPanel
            user={currentUser}
            memberProfile={memberProfile}
            language={language}
            onUserChange={handleUserChange}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
            onNavigate={handleNavigation}
          />
        </div>
      )}

      {/* 3. Global Music Controls — top-right (persistent across views) */}
      <div className="fixed top-6 right-8 z-[110] flex items-center gap-4">
        
        {/* Music Dropdown Wrapper */}
        <div className="relative">
          <button
            onClick={() => setIsMusicMenuOpen(!isMusicMenuOpen)}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 border ${
              isMusicPlaying 
                ? 'bg-black/40 border-yellow-100/50 text-yellow-100 shadow-[0_0_10px_rgba(253,224,71,0.3)]' 
                : 'bg-black/60 border-white/10 text-white/30'
            }`}
            title="Music Settings"
          >
            {isMusicPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
          </button>

          {/* Dropdown Menu */}
          {isMusicMenuOpen && (
            <>
               <div className="fixed inset-0 z-40" onClick={() => setIsMusicMenuOpen(false)} />
               <div className="absolute top-10 right-0 z-50 w-32 bg-black/90 border border-white/10 rounded-md backdrop-blur-md shadow-xl overflow-hidden animate-fadeIn">
                 <div className="py-1 flex flex-col">
                   {(Object.keys(MUSIC_GENRES) as Array<keyof typeof MUSIC_GENRES>).map((genre) => (
                     <button
                       key={genre}
                       onClick={() => changeGenre(genre)}
                       className={`px-4 py-2 text-xs font-cinzel text-left transition-colors ${
                         currentGenre === genre && isMusicPlaying
                           ? 'text-yellow-100 bg-white/10' 
                           : 'text-neutral-400 hover:text-white hover:bg-white/5'
                       }`}
                     >
                       {genre}
                     </button>
                   ))}
                   <div className="h-px bg-white/10 my-1 mx-2" />
                   <button
                     onClick={toggleMute}
                     className={`px-4 py-2 text-xs font-cinzel text-left transition-colors ${
                       !isMusicPlaying ? 'text-red-300' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                     }`}
                   >
                     {isMusicPlaying ? (language === 'EN' ? 'Silence' : 'Silence') : (language === 'EN' ? 'Play Music' : 'Jouer Musique')}
                   </button>
                 </div>
               </div>
            </>
          )}
        </div>

        {/* Language Toggle */}
        <div 
          onClick={toggleLanguage}
          className="flex items-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-1 py-1 cursor-pointer hover:bg-black/60 transition-colors"
        >
           <span className={`text-[10px] font-cinzel font-bold px-3 py-1 rounded-full transition-all ${language === 'EN' ? 'bg-[#f3e5ab] text-[#4a3b2a]' : 'text-yellow-100/50'}`}>EN</span>
           <span className={`text-[10px] font-cinzel font-bold px-3 py-1 rounded-full transition-all ${language === 'FR' ? 'bg-[#f3e5ab] text-[#4a3b2a]' : 'text-yellow-100/50'}`}>FR</span>
        </div>
      </div>

      {/* VIEW 1: THE INN (DEFAULT) */}
      {currentView === 'INN' && (
        <InnPage 
          onNavigate={handleNavigation}
          language={language}
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

      {/* VIEW 7: CEILIDH */}
      {currentView === 'CEILIDH' && (
        <CeilidhPage
          onNavigate={(view) => handleNavigation(view)}
          language={language}
          user={currentUser}
          memberProfile={memberProfile}
          onUserChange={handleUserChange}
          onShowPrivacy={() => setShowPrivacyPolicy(true)}
        />
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
