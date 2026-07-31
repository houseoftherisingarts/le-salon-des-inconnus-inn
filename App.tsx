
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { LoadingScreen } from './components/LoadingScreen';

// Pages — code-split: each ships as its own chunk, fetched on first navigation.
// Components use named exports, so we adapt with `.then(m => ({ default: m.X }))`.
const InnPage           = lazy(() => import('./components/InnPage').then(m => ({ default: m.InnPage })));
const InnPageTest2      = lazy(() => import('./components/InnPageTest2').then(m => ({ default: m.InnPageTest2 })));
const InnPageTest3      = lazy(() => import('./components/InnPageTest3').then(m => ({ default: m.InnPageTest3 })));
const InnPageReserveCine = lazy(() => import('./components/InnPageReserveCine').then(m => ({ default: m.InnPageReserveCine })));
const MassotherapyPage  = lazy(() => import('./components/MassotherapyPage').then(m => ({ default: m.MassotherapyPage })));
const HostsPage         = lazy(() => import('./components/HostsPage').then(m => ({ default: m.HostsPage })));
const GuidePage         = lazy(() => import('./components/GuidePage').then(m => ({ default: m.GuidePage })));
const PetiteMonnaiePage = lazy(() => import('./components/PetiteMonnaiePage').then(m => ({ default: m.PetiteMonnaiePage })));
const KitchenPage       = lazy(() => import('./components/KitchenPage').then(m => ({ default: m.KitchenPage })));
const EventsPage        = lazy(() => import('./components/EventsPage').then(m => ({ default: m.EventsPage })));
const CeilidhPage       = lazy(() => import('./components/CeilidhPage').then(m => ({ default: m.CeilidhPage })));
const WwoofingPage      = lazy(() => import('./components/WwoofingPage').then(m => ({ default: m.WwoofingPage })));
const PPSPage           = lazy(() => import('./components/PPSPage').then(m => ({ default: m.PPSPage })));
const CommunityPage     = lazy(() => import('./components/CommunityPage').then(m => ({ default: m.CommunityPage })));
const DonationPage      = lazy(() => import('./components/DonationPage').then(m => ({ default: m.DonationPage })));
const PenseesPage       = lazy(() => import('./components/PenseesPage').then(m => ({ default: m.PenseesPage })));
const DownloadPage      = lazy(() => import('./components/DownloadPage').then(m => ({ default: m.DownloadPage })));
const CoffreLanding     = lazy(() => import('./components/CoffreLanding').then(m => ({ default: m.CoffreLanding })));
const BlogPage          = lazy(() => import('./components/BlogPage').then(m => ({ default: m.BlogPage })));
// Unlisted, no nav link: /invitation (noindex) and /entreprises. Reached only
// by direct URL (QR code / shared link).
const InvitationPage    = lazy(() => import('./components/InvitationPage').then(m => ({ default: m.InvitationPage })));
const EntreprisesPage   = lazy(() => import('./components/EntreprisesPage').then(m => ({ default: m.EntreprisesPage })));
const ForfaitsPage      = lazy(() => import('./components/ForfaitsPage').then(m => ({ default: m.ForfaitsPage })));
const ProfilePage       = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PublicProfilePage = lazy(() => import('./components/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })));
const MessagingPage     = lazy(() => import('./components/MessagingPage').then(m => ({ default: m.MessagingPage })));
const AdminCRM          = lazy(() => import('./components/AdminCRM').then(m => ({ default: m.AdminCRM })));
const CreatorStudio     = lazy(() => import('@inconnus/ui').then(m => ({ default: m.CreatorStudio })));
// /c/{uid}/{slug} — public read-only call sheet, shared by a member with their
// crew/figurants. No auth required (Firestore rule grants read when shared).
const CallSheetPublicView = lazy(() => import('@inconnus/ui').then(m => ({ default: m.CallSheetPublicView })));
// Maestro-tier /{username} portfolio page — dispatched when the URL path is a
// slug that doesn't match any reserved route. Loaded lazily so we don't
// pull three.js / @react-three onto every other page.
const SuperProfilePage  = lazy(() => import('./components/SuperProfilePage').then(m => ({ default: m.SuperProfilePage })));
// /highstest — premium cinematic intro to the Creator Studio. Test bed for
// the "in your face $10k website" feel. Lazy-loaded; pulls three.js + Lenis.
const HighsTestPage     = lazy(() => import('./components/HighsTestPage').then(m => ({ default: m.HighsTestPage })));

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
import { AuthModal } from './components/AuthModal';
import { MUSIC_GENRES, ACCOMMODATIONS } from './constants';
import { PAGE_META, SITE_URL, CONTACT_INFO, OG_IMAGES, DEFAULT_OG_IMAGE, ROBOTS_OVERRIDES } from './config/seo.config';
import { SEO_CONTENT, type SeoViewKey } from './config/seo.content';
import { PENSEES } from './data/pensees';
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
  getOptimizedUrl("/media/inn/golden%20drone%20copy.jpg", 1920),
  
  // Textures (InnPage) - Width 1000
  getOptimizedUrl("https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog1.png", 1000),
  getOptimizedUrl("https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog2.png", 1000),
  getOptimizedUrl("https://www.transparenttextures.com/patterns/stardust.png", 1000),
  getOptimizedUrl("https://www.transparenttextures.com/patterns/paisley.png", 1000),
  
  // History Image (Visible on first scroll/swipe) - Width 800 (Card variant)
  getOptimizedUrl("/media/Financement%20Artistique/centered%20copy.jpg", 800),

  // Logo - Kept raw to match the hardcoded <img> in LoadingScreen (avoids cache miss)
  "/media/logo.png"
];

// Pages autonomes (/coffre, /tools) : elles ne montrent aucune photo de
// l'auberge, donc l'écran de chargement ne précharge que le logo et le grain.
const STANDALONE_ASSETS = [
  getOptimizedUrl("https://www.transparenttextures.com/patterns/stardust.png", 1000),
  "/media/logo.png"
];

// --- 2. DEFERRED ASSETS (Below the fold) ---
// These are loaded silently in the background when the user is idle.
const DEFERRED_ASSETS = [
    // Manor Hero (High Res for Detail View)
    getOptimizedUrl("/media/Financement%20Artistique/centered%20copy.jpg", 1920),
    // Kitchen Portal
    getOptimizedUrl("/media/Cuisine/Plating%20alexis%20ai%20(1).jpg", 800),
    // Massage Portal
    getOptimizedUrl("/media/massage/massage%20andre.jpg", 800),
    // Local Guide Parallax
    getOptimizedUrl("/media/Auberge%20photos/nature%20coco%20upscale.jpg", 1920),
    // Gallery Highlight
    getOptimizedUrl("/media/Auberge%20photos/Maison%20main.jpg", 1920),
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
type ViewState = 'INN' | 'INN_TEST2' | 'INN_TEST3' | 'INN_RESERVE_CINE' | 'MASSOTHERAPY' | 'HOSTS' | 'GUIDE' | 'PETITE_MONNAIE' | 'KITCHEN' | 'EVENTS' | 'CEILIDH' | 'WWOOFING' | 'PPS' | 'COMMUNITY' | 'DONATION' | 'PENSEES' | 'BLOG' | 'INVITATION' | 'ENTREPRISES' | 'FORFAITS'
              | 'MY_PROFILE' | 'PUBLIC_PROFILE' | 'MESSAGING' | 'ADMIN' | 'CREATOR_STUDIO' | 'DOWNLOAD' | 'COFFRE'
              | 'SUPER_PROFILE' | 'HIGHS_TEST' | 'CALLSHEET_PUBLIC';

// Note: SUPER_PROFILE intentionally has no fixed path — its path is the
// dynamic slug. We list it here for completeness but handleNavigation never
// uses VIEW_PATHS['SUPER_PROFILE']; the slug is passed explicitly.
const VIEW_PATHS: Record<ViewState, string> = {
  INN:            '/',
  INN_TEST2:      '/mainpagetest2',
  INN_TEST3:      '/mainpagetest3',
  INN_RESERVE_CINE: '/reserve-cine',
  MASSOTHERAPY:   '/massage',
  HOSTS:          '/about',
  GUIDE:          '/guide',
  PETITE_MONNAIE: '/petite-monnaie',
  KITCHEN:        '/cuisine',
  EVENTS:         '/evenements',
  CEILIDH:        '/ceilidh',
  WWOOFING:       '/wwoofing',
  PPS:            '/soiree-thematique-pps',
  COMMUNITY:      '/communaute',
  DONATION:       '/don',
  PENSEES:        '/pensees',
  DOWNLOAD:       '/download',
  COFFRE:         '/coffre',
  BLOG:           '/blog',
  INVITATION:     '/invitation',
  ENTREPRISES:    '/entreprises',
  FORFAITS:       '/forfaits',
  MY_PROFILE:     '/profil',
  PUBLIC_PROFILE: '/membre',
  MESSAGING:      '/messages',
  ADMIN:          '/admin',
  CREATOR_STUDIO: '/creator',
  SUPER_PROFILE:  '',
  HIGHS_TEST:     '/highstest',
  CALLSHEET_PUBLIC: '',  // dynamic: /c/{uid}/{slug}, never navigated to in-app
};

const PATH_VIEWS: Record<string, ViewState> = Object.fromEntries(
  Object.entries(VIEW_PATHS)
    .filter(([, p]) => p !== '')
    .map(([v, p]) => [p, v as ViewState])
);

// Slug-shaped paths: a single segment of 3-32 lowercase alphanum/hyphen chars.
// Any path that matches AND isn't a reserved route falls through to the
// Super Profile dispatcher. Numeric-only is excluded so we don't intercept
// hypothetical numeric routes.
const SLUG_PATTERN = /^\/([a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9])$/;

const extractSlug = (pathname: string): string | null => {
  const m = SLUG_PATTERN.exec(pathname);
  if (!m) return null;
  const slug = m[1];
  if (/^\d+$/.test(slug)) return null;
  return slug;
};

// Public call-sheet share path: /c/{uid}/{docId}. Two segments, so it never
// collides with the single-segment Super Profile slug matcher above.
const CALLSHEET_PATH = /^\/c\/([A-Za-z0-9_-]{6,})\/([A-Za-z0-9_-]{3,})$/;
const extractCallsheet = (pathname: string): { uid: string; slug: string } | null => {
  const m = CALLSHEET_PATH.exec(pathname.replace(/\/$/, '') || '/');
  return m ? { uid: m[1], slug: m[2] } : null;
};

const pathToView = (pathname: string): ViewState => {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (PATH_VIEWS[pathname]) return PATH_VIEWS[pathname];
  if (PATH_VIEWS[normalized]) return PATH_VIEWS[normalized];
  if (normalized === '/tools' || normalized === '/outils') return 'DOWNLOAD';
  if (normalized === '/coffre') return 'COFFRE';
  if (extractCallsheet(normalized)) return 'CALLSHEET_PUBLIC';
  // Stable per-post URLs for the daily journal: /pensees/AAAA-MM-JJ
  if (/^\/pensees\/\d{4}-\d{2}-\d{2}$/.test(normalized)) return 'PENSEES';
  // Chronicle articles: /blog/{slug}. BlogPage resolves the slug itself.
  if (/^\/blog\/[a-z0-9-]+$/.test(normalized)) return 'BLOG';
  if (extractSlug(normalized)) return 'SUPER_PROFILE';
  return 'INN';
};

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

  // Curated-artist flag from members/{uid}/admin/flags. Drives Creator Studio
  // publish gating ("Ask to be featured" → admin sets these → real surfacing
  // across Café / Mécène / Studio Featured).
  const [isCuratedArtist, setIsCuratedArtist] = useState(false);
  // Triggered by the Creator Studio gate when an anonymous visitor clicks
  // "Sign in with Google / Email". Mounts AuthModal next to the studio.
  const [creatorAuthOpen, setCreatorAuthOpen] = useState(false);

  // Social space state. Seed the target uid from a /membre?uid=… query string
  // on first load so a direct link (e.g. the Creator Studio roster's "View
  // Dossier") resolves without an in-app navigation callback.
  const [publicProfileUid, setPublicProfileUid] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('uid');
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Super Profile slug — populated from the URL when on a /{username} path.
  // The SuperProfilePage uses it to look up the artist's doc.
  const [superProfileSlug, setSuperProfileSlug] = useState<string | null>(() =>
    extractSlug(window.location.pathname.replace(/\/$/, '') || '/')
  );

  // Public call-sheet share params — populated from a /c/{uid}/{slug} URL.
  const [callsheetParams, setCallsheetParams] = useState<{ uid: string; slug: string } | null>(() =>
    extractCallsheet(window.location.pathname)
  );

  // Privacy / Compliance State
  const [consentLevel, setConsentLevel] = useState<ConsentLevel | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Music State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentGenre, setCurrentGenre] = useState<keyof typeof MUSIC_GENRES | null>(null);
  const [isMusicMenuOpen, setIsMusicMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Les pages autonomes (/coffre, /tools) sont des calques plein écran : elles ne
  // montrent jamais les photos de l'auberge. Sans ce garde-fou, y arriver
  // directement téléchargeait ~16 Mo d'images invisibles.
  const isStandalonePage = currentView === 'COFFRE' || currentView === 'DOWNLOAD';

  // Trigger Background Loading when initial loading finishes
  useIdlePreloader(DEFERRED_ASSETS, !isLoading && !isStandalonePage);

  // --- 1. NAVIGATION HELPER ---
  const handleNavigation = (destination: ViewState) => {
    // SUPER_PROFILE is reached by entering its slug URL directly — never
    // navigated to from in-app, so we don't push a path for it.
    if (destination === 'SUPER_PROFILE') {
      setCurrentView(destination);
      return;
    }
    const path = VIEW_PATHS[destination] || '/';
    if (window.location.pathname !== path) {
      history.pushState({ view: destination }, '', path);
    }
    setCurrentView(destination);
    setSuperProfileSlug(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back / forward
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const nextView = e.state?.view ?? pathToView(window.location.pathname);
      setCurrentView(nextView);
      setSuperProfileSlug(extractSlug(window.location.pathname.replace(/\/$/, '') || '/'));
      setCallsheetParams(extractCallsheet(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Global navigator — pages without rich onNavigate (KitchenPage, GuidePage,
  // MassotherapyPage) can still trigger SPA navigation by dispatching
  // `salon:navigate`. Used by <SeoBlock /> for in-body internal links.
  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent<{ view?: string }>).detail;
      const view = detail?.view as ViewState | undefined;
      if (view && view in VIEW_PATHS) handleNavigation(view);
    };
    window.addEventListener('salon:navigate', onNav as EventListener);
    return () => window.removeEventListener('salon:navigate', onNav as EventListener);
  }, []);

  // Update document title + meta description + canonical + per-route JSON-LD per view.
  // Single source of truth: config/seo.config.ts (meta) + config/seo.content.ts (FAQ).
  useEffect(() => {
    const meta = PAGE_META[currentView]?.[language];
    if (!meta) return;
    document.title = meta.title;

    const path = VIEW_PATHS[currentView] ?? '/';
    const canonicalUrl = `${SITE_URL}${path}`;

    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', value);
    };
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[name="robots"]', ROBOTS_OVERRIDES[currentView] ?? 'index, follow');
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[name="twitter:title"]', meta.title);
    setMeta('meta[name="twitter:description"]', meta.description);

    // Share image — absolute URL, per route (crawlers + AI need absolute).
    const ogImage = (OG_IMAGES as Record<string, string>)[currentView] ?? DEFAULT_OG_IMAGE;
    setMeta('meta[property="og:image"]', ogImage);
    setMeta('meta[name="twitter:image"]', ogImage);

    // Canonical link — keep one <link rel=canonical> in <head>, sync per route.
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Per-route JSON-LD (FAQPage when the page has FAQs; Event for /evenements
    // and /ceilidh). We write into the empty <script id="route-jsonld"> placeholder
    // declared in index.html.
    const routeScript = document.getElementById('route-jsonld');
    if (routeScript) {
      const blocks: object[] = [];

      // FAQPage — when the route is registered in SEO_CONTENT.
      const seoKey = currentView as SeoViewKey;
      const seoEntry = SEO_CONTENT[seoKey]?.[language];
      if (seoEntry && seoEntry.faq.length > 0) {
        blocks.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: seoEntry.faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        });
      }

      // Event — Grand Ceilidh de Mai 2026 on /evenements and /ceilidh.
      if (currentView === 'EVENTS' || currentView === 'CEILIDH') {
        blocks.push({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: 'Grand Ceilidh de Mai 2026',
          startDate: '2026-05-21',
          endDate: '2026-05-25',
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          description:
            "Festival communautaire de cinq jours à la Maison Favier : musique, danse, banquet, chantiers communs et wwoofing à Namur, en Outaouais.",
          location: {
            '@type': 'Place',
            name: 'Le Salon des Inconnus — Maison Favier',
            address: {
              '@type': 'PostalAddress',
              streetAddress: CONTACT_INFO.address,
              addressLocality: CONTACT_INFO.locality,
              addressRegion: CONTACT_INFO.region,
              postalCode: CONTACT_INFO.postalCode,
              addressCountry: CONTACT_INFO.country,
            },
          },
          organizer: {
            '@type': 'Organization',
            name: 'Le Salon des Inconnus',
            url: SITE_URL,
          },
          image: '/media/inn/golden%20drone%20copy.jpg',
          url: `${SITE_URL}/ceilidh`,
        });
      }

      // Blog + BlogPosting — daily journal on /pensees (one referenceable post
      // per entry, aimed at crawlers and AI assistants; no visible blog UI).
      if (currentView === 'PENSEES') {
        const org = { '@type': 'Organization', name: 'Le Salon des Inconnus', url: SITE_URL };
        blocks.push({
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: language === 'FR' ? 'Pensées, le journal quotidien du Salon des Inconnus' : 'Thoughts, the daily journal of Le Salon des Inconnus',
          url: `${SITE_URL}/pensees`,
          inLanguage: language === 'FR' ? 'fr' : 'en',
          author: org,
          publisher: org,
          blogPost: PENSEES.map((p) => ({
            '@type': 'BlogPosting',
            headline: language === 'FR' ? p.title_fr : p.title_en,
            articleBody: language === 'FR' ? p.body_fr : p.body_en,
            datePublished: p.date,
            inLanguage: language === 'FR' ? 'fr' : 'en',
            author: org,
            publisher: org,
            url: `${SITE_URL}/pensees/${p.date}`,
            mainEntityOfPage: `${SITE_URL}/pensees/${p.date}`,
          })),
        });
      }

      routeScript.textContent = blocks.length === 0 ? '' : JSON.stringify(blocks.length === 1 ? blocks[0] : blocks);
    }
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

  // Subscribe to the current user's curated-artist flag. Lives in a separate
  // admin-only-write subdoc (members/{uid}/admin/flags) so users can't grant
  // it to themselves.
  useEffect(() => {
    if (!db || !currentUser) {
      setIsCuratedArtist(false);
      return;
    }
    const ref = doc(db, 'members', currentUser.uid, 'admin', 'flags');
    let cancelled = false;
    getDoc(ref).then((snap) => {
      if (cancelled) return;
      const data = snap.data() as { isArtist?: boolean } | undefined;
      setIsCuratedArtist(data?.isArtist === true);
    }).catch(() => {
      if (!cancelled) setIsCuratedArtist(false);
    });
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  // Close the studio-triggered AuthModal automatically when sign-in completes.
  useEffect(() => {
    if (currentUser && creatorAuthOpen) setCreatorAuthOpen(false);
  }, [currentUser, creatorAuthOpen]);

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
    // new Audio() précharge en entier par défaut : chaque visite tirait ~18 Mo
    // de musique même si personne n'appuyait sur lecture. Le fichier ne se
    // charge maintenant qu'au premier play().
    audio.preload = 'none';
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
            // Sur une page autonome, seuls le logo et le grain servent : les
            // photos de l'auberge n'apparaissent nulle part.
            images={isStandalonePage ? STANDALONE_ASSETS : INITIAL_ASSETS}
          />
      )}

      {/* 2. Global site header — INN + editorial test3 (test page parity) */}
      {!isLoading && (currentView === 'INN' || currentView === 'INN_TEST3' || currentView === 'INN_RESERVE_CINE') && (
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
        {/* VIEW 1: THE INN (DEFAULT) — the cinematic editorial page: the
            "Les Origines / Bienvenue" section is fused with a scroll-scrubbed
            living-room shot. Uses the REVERSED cut that ends on the full
            living-room frame (the chosen look). InnPageTest3 still ships as the
            /mainpagetest3 variant and provides shared inner components. */}
        {currentView === 'INN' && (
          <InnPageReserveCine
            language={language}
            onNavigate={(view) => handleNavigation(view as ViewState)}
            posterSrc="/hero/reserve-hero-poster-rev.jpg"
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

        {/* VIEW 1e: Inn — CINEMATIC experiment (/reserve-cine). Same page as INN,
            but the cinematic clip is the REVERSED cut that ends on the full
            living-room shot, so it can be compared against the live forward cut. */}
        {currentView === 'INN_RESERVE_CINE' && (
          <InnPageReserveCine
            language={language}
            onNavigate={(view) => handleNavigation(view as ViewState)}
            posterSrc="/hero/reserve-hero-poster-rev.jpg"
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

        {/* VIEW 4b: PETITE MONNAIE */}
        {currentView === 'PETITE_MONNAIE' && (
          <PetiteMonnaiePage
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

        {/* VIEW 7: CEILIDH — chapter-card layout. Shared internals
            (KanbanBoard, NeedsSection, CovoiturageSection, AbundanceSection,
            PresenceTimeline) live in components/CeilidhShared.tsx. */}
        {currentView === 'CEILIDH' && (
          <CeilidhPage
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

        {/* VIEW 7b-2: PPS (theme evenings & team retreats, PPS Canada partnership) */}
        {currentView === 'PPS' && (
          <PPSPage
            onNavigate={() => handleNavigation('INN')}
            language={language}
          />
        )}

        {/* VIEW 7c: COMMUNITY (paid resident-member place) */}
        {currentView === 'COMMUNITY' && (
          <CommunityPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            onUserChange={handleUserChange}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
          />
        )}

        {/* VIEW 7d: DONATION (gift to the mission, Square) */}
        {currentView === 'DONATION' && (
          <DonationPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
            user={currentUser}
            memberProfile={memberProfile}
            onUserChange={handleUserChange}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
          />
        )}

        {/* VIEW 7e: PENSEES (daily journal) */}
        {currentView === 'PENSEES' && (
          <PenseesPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7e-ter: DOWNLOAD (les outils du Salon — Petite Banque et compagnie) */}
        {currentView === 'DOWNLOAD' && (
          <DownloadPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7e-quater: COFFRE (landing de vente du Coffre des Inconnus) */}
        {currentView === 'COFFRE' && (
          <CoffreLanding
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7e-bis: BLOG (chronicles — index + /blog/{slug} articles) */}
        {currentView === 'BLOG' && (
          <BlogPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7f: INVITATION (unlisted, QR-code only, noindex) */}
        {currentView === 'INVITATION' && (
          <InvitationPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7g: ENTREPRISES (unlisted, B2B corporate retreats pitch) */}
        {currentView === 'ENTREPRISES' && (
          <EntreprisesPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
          />
        )}

        {/* VIEW 7h: FORFAITS (unlisted, B2C packages — Nuit & Table) */}
        {currentView === 'FORFAITS' && (
          <ForfaitsPage
            onNavigate={(view) => handleNavigation(view as ViewState)}
            language={language}
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

        {/* VIEW 11: ADMIN CRM — its own scroll container: the app root is
            h-screen overflow-hidden (public-site architecture), but the admin
            relies on document-style scrolling; without this wrapper its content
            is clipped on mobile and cannot scroll. */}
        {currentView === 'ADMIN' && (
          <div className="h-screen overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <AdminCRM
              language={language}
              onNavigate={(view) => handleNavigation(view as ViewState)}
              user={currentUser}
            />
          </div>
        )}

        {/* VIEW 12: CREATOR STUDIO — gated by sign-in (or "view as visitor"). */}
        {currentView === 'CREATOR_STUDIO' && (
          <CreatorStudio
            language={language}
            currentUser={currentUser ? {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
            } : null}
            isArtist={isCuratedArtist}
            onRequestSignIn={() => setCreatorAuthOpen(true)}
            onExit={() => handleNavigation('INN')}
          />
        )}

        {/* VIEW 13: SUPER PROFILE (/{username}) — fullscreen, borderless,
            Maestro-tier-only public portfolio. Resolves the URL slug to a
            Firestore doc; renders one of three layouts (Photo / Visual Art
            / Editorial) keyed off the artist's medium. */}
        {currentView === 'SUPER_PROFILE' && superProfileSlug && (
          <SuperProfilePage
            slug={superProfileSlug}
            onNavigateHome={() => handleNavigation('INN')}
          />
        )}

        {/* VIEW 14: /highstest — premium cinematic intro to the Creator
            Studio. Test bed for the "in your face" $10k-website feel,
            using brand palette + 3D particle field + scroll-driven panels. */}
        {currentView === 'HIGHS_TEST' && (
          <HighsTestPage
            onEnterStudio={() => handleNavigation('CREATOR_STUDIO')}
            onBack={() => handleNavigation('INN')}
          />
        )}

        {/* VIEW 15: /c/{uid}/{slug} — public read-only call sheet shared by a
            member with their crew/figurants. No login required. */}
        {currentView === 'CALLSHEET_PUBLIC' && callsheetParams && (
          <CallSheetPublicView
            uid={callsheetParams.uid}
            slug={callsheetParams.slug}
            language={language}
          />
        )}
      </Suspense>

      {/* GLOBAL: Subtle admin footer link — only shown to logged-in admins.
          Mirrors the email allow-list used by AdminCRM and firestore.rules.
          Non-admins (anonymous OR signed-in non-admins) don't see the link
          at all, so /admin isn't discoverable from the UI. */}
      {!isLoading && currentView !== 'ADMIN' && currentView !== 'HIGHS_TEST' && currentView !== 'SUPER_PROFILE' && currentView !== 'CALLSHEET_PUBLIC' && currentUser?.email &&
        ['houseoftherisingarts@gmail.com', 'alex@lesalondesinconnus.com']
          .includes(currentUser.email.toLowerCase()) && (
        <button
          onClick={() => handleNavigation('ADMIN')}
          className="fixed bottom-0 left-0 z-[50] min-h-[44px] min-w-[44px] px-4 pb-3 flex items-end
                     text-[9px] font-cinzel text-neutral-800 hover:text-neutral-500 uppercase tracking-widest transition-colors"
        >
          Admin
        </button>
      )}

      {/* GLOBAL: Cookie / Privacy Consent Banner — suppressed on fullscreen
          immersive routes (HIGHS_TEST, SUPER_PROFILE) where the banner would
          eat the CTA + crop the cinematic frame. The banner is still shown
          on the rest of the site (where consent matters for analytics). */}
      {!isLoading && currentView !== 'HIGHS_TEST' && currentView !== 'SUPER_PROFILE' && currentView !== 'CALLSHEET_PUBLIC' && (
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

      {/* GLOBAL: AuthModal triggered by Creator Studio gate. Closes itself
          via onAuthSuccess (which also fires onAuthStateChanged → currentUser
          flip → studio leaves the gate state on its own). */}
      {creatorAuthOpen && (
        <AuthModal
          language={language}
          onClose={() => setCreatorAuthOpen(false)}
          onAuthSuccess={(user, profile) => handleUserChange(user, profile)}
          onShowPrivacy={() => setShowPrivacyPolicy(true)}
          redirectPendingUser={redirectPendingUser}
          onNavigate={(view) => handleNavigation(view as ViewState)}
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
