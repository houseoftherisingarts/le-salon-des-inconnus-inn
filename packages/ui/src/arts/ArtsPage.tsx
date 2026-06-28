
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ARTISTS_ROSTER } from './roster';
import { ArtistProfile } from './types';
import { SiteMap } from './SiteMap';
import { CreatorStudio } from '../creator-studio/CreatorStudioShell';
import { SdiCafe } from '../sdi-cafe/SdiCafe';

export interface ArtsPageProps {
  language: 'EN' | 'FR';
  // Optional: when the page is hosted standalone (one app per domain), there is
  // no parent router to leave for. When it's embedded in a multi-view shell
  // these become navigation hooks. Defaults are no-ops so the component is
  // self-contained.
  onNavigate?: (view: 'DESK' | 'INN' | 'ARTS', targetNode?: string) => void;
  initialTargetNode?: string | null;
  // Fires whenever the active sub-view (Hub / Buyer / Creator / etc.) changes.
  // The wrapping app uses this to mirror sub-views to the URL bar so
  // links like /cafe deep-link straight into a section. Does not fire on
  // initial mount — the URL is the source of truth there.
  onNodeChange?: (nodeId: string) => void;
}

type RootView = 'HUB' | 'BUYER' | 'ARTIST';
type BuyerView = 'MENU' | 'CATALOG' | 'TAXES' | 'SUPPORT' | 'PLATFORMS';
type PortalView = 'REGISTRY' | 'BLOG';
type PatronView = 'ARTIST' | 'CENTER' | 'PROJECT' | 'BEYOND';

// Helper hook for scroll animations
const useOnScreen = (options: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // Trigger once when entering
      if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return [ref, isVisible] as const;
};

// Fade In Right Component
const FadeInRight: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    // Memoize options to prevent effect re-triggering on every render
    const options = useMemo(() => ({ threshold: 0.2 }), []);
    const [ref, isVisible] = useOnScreen(options);
    return (
        <div 
            ref={ref}
            className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export const ArtsPage: React.FC<ArtsPageProps> = ({
  language,
  onNavigate = () => {},
  initialTargetNode = null,
  onNodeChange,
}) => {
  const [rootView, setRootView] = useState<RootView>('HUB');
  const [buyerView, setBuyerView] = useState<BuyerView>('MENU');
  const [portalView, setPortalView] = useState<PortalView>('BLOG');

  // Mirror sub-view changes back out to the wrapping app (used to sync the
  // URL bar). Skip the first run — the URL is already correct on mount,
  // and we don't want to push a duplicate history entry.
  const isFirstNodeChangeRef = useRef(true);
  useEffect(() => {
    if (isFirstNodeChangeRef.current) {
      isFirstNodeChangeRef.current = false;
      return;
    }
    if (!onNodeChange) return;
    let nodeId: string;
    if (rootView === 'ARTIST') {
      if (portalView === 'REGISTRY') nodeId = 'registry';
      else if (portalView === 'BLOG') nodeId = 'grimoire';
      else nodeId = 'artist_hub';
    } else if (rootView === 'BUYER') {
      if (buyerView === 'CATALOG') nodeId = 'roster';
      else if (buyerView === 'TAXES') nodeId = 'fiscality';
      else if (buyerView === 'SUPPORT') nodeId = 'patronage';
      else if (buyerView === 'PLATFORMS') nodeId = 'platforms';
      else nodeId = 'patron_hub';
    } else {
      nodeId = 'hub';
    }
    onNodeChange(nodeId);
  }, [rootView, buyerView, portalView, onNodeChange]);

  // Patronage Sub-State
  const [patronTab, setPatronTab] = useState<PatronView>('CENTER');
  
  // Admin Mode State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isSiteMapOpen, setIsSiteMapOpen] = useState(false);
  
  // Local state for artists to allow adding new ones
  const [artists, setArtists] = useState<ArtistProfile[]>(ARTISTS_ROSTER);

  // Sync state with initialTargetNode when it changes or on mount
  useEffect(() => {
    if (initialTargetNode) {
        handleNodeClick(initialTargetNode, false); // false = don't call onNavigate recursively
    }
  }, [initialTargetNode]);

  const toggleAdmin = () => {
      if (isAdminMode) {
          setIsAdminMode(false);
      } else {
          const pwd = prompt("Enter Administrator Password:");
          if (pwd === 'peterjackson1') {
              setIsAdminMode(true);
          } else if (pwd) {
              alert("Access Denied.");
          }
      }
  };

  // Node Tree Helper Logic
  const getCurrentNodeId = () => {
    if (rootView === 'HUB') return 'hub';
    if (rootView === 'ARTIST') {
        if (portalView === 'REGISTRY') return 'registry';
        if (portalView === 'BLOG') return 'grimoire';
        return 'artist_hub';
    }
    if (rootView === 'BUYER') {
        if (buyerView === 'MENU') return 'patron_hub';
        if (buyerView === 'CATALOG') return 'roster';
        if (buyerView === 'TAXES') return 'fiscality';
        if (buyerView === 'SUPPORT') return 'patronage';
        if (buyerView === 'PLATFORMS') return 'platforms';
    }
    return 'hub';
  };

  const handleNodeClick = (nodeId: string, shouldNavigate = true) => {
    // If the node implies leaving this view, we call onNavigate
    if (nodeId === 'desk' || nodeId === 'inn') {
        if (shouldNavigate) onNavigate(nodeId === 'desk' ? 'DESK' : 'INN');
        return;
    }

    // Otherwise handle internal state updates
    switch (nodeId) {
        case 'hub':
            setRootView('HUB');
            // Reset sub-states to ensure clean navigation
            setBuyerView('MENU');
            setPortalView('BLOG');
            break;
        case 'patron_hub':
            setRootView('BUYER');
            setBuyerView('MENU');
            break;
        case 'artist_hub':
            setRootView('ARTIST');
            // Default to blog if just clicking the hub
            setPortalView('BLOG');
            break;
        case 'roster':
            setRootView('BUYER');
            setBuyerView('CATALOG');
            break;
        case 'fiscality':
            setRootView('BUYER');
            setBuyerView('TAXES');
            break;
        case 'patronage':
            setRootView('BUYER');
            setBuyerView('SUPPORT');
            break;
        case 'platforms':
            setRootView('BUYER');
            setBuyerView('PLATFORMS');
            break;
        case 'registry':
            setRootView('ARTIST');
            setPortalView('REGISTRY');
            break;
        case 'grimoire':
            setRootView('ARTIST');
            setPortalView('BLOG');
            break;
    }
    setIsSiteMapOpen(false);
  };

  // --- SUB-COMPONENTS ---
  
  // 1. The Hub (Split Screen with Seesaw Animation)
  const Hub = () => {
    const [hoveredSide, setHoveredSide] = useState<'PATRON' | 'CREATOR' | null>(null);

    return (
      <div className="flex flex-col md:flex-row h-full w-full p-4 md:p-8 gap-6 items-center justify-center max-w-[1920px] mx-auto">
        {/* Patron Side (Buyer) */}
        <div 
          onClick={() => {
              setRootView('BUYER');
              setBuyerView('MENU');
          }}
          onMouseEnter={() => setHoveredSide('PATRON')}
          onMouseLeave={() => setHoveredSide(null)}
          className={`relative cursor-pointer h-[40vh] md:h-full rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            hoveredSide === 'PATRON' 
                ? 'flex-[1.5] -translate-y-4 z-10 ring-1 ring-white/20' 
                : hoveredSide === 'CREATOR' 
                    ? 'flex-[0.8] translate-y-12 brightness-50 opacity-60' 
                    : 'flex-1'
          }`}
        >
          {/* Background & Image */}
          <div className="absolute inset-0 bg-neutral-900" />
          <div className="absolute inset-0 bg-indigo-950/20" />
          <img 
            src="https://images.unsplash.com/photo-1545518514-ce8448f542b3?q=80&w=2000&auto=format&fit=crop" 
            alt="Patron" 
            className={`w-full h-full object-cover transition-all duration-1000 ${hoveredSide === 'PATRON' ? 'scale-105 grayscale-0' : 'grayscale opacity-50'}`} 
          />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
             <h2 className={`font-cinzel text-4xl md:text-6xl text-white mb-4 tracking-widest drop-shadow-xl transition-transform duration-700 ${hoveredSide === 'PATRON' ? '-translate-y-2' : ''}`}>
               {language === 'EN' ? "The Patron" : "Le Mécène"}
             </h2>
             <p className={`font-lato text-sm tracking-[0.3em] text-indigo-200 border-b border-indigo-400/50 pb-1 transition-all duration-500 delay-100 ${hoveredSide === 'PATRON' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
               {language === 'EN' ? "I AM A CUSTOMER" : "JE SUIS CLIENT"}
             </p>
          </div>
        </div>

        {/* Separator - Split Screen Effect */}
        <div className="shrink-0 relative z-20 flex items-center justify-center opacity-60">
             {/* Vertical Line on Desktop, Horizontal on Mobile */}
             <div className="w-24 h-px md:w-px md:h-48 bg-white/40 shadow-[0_0_10px_rgba(253,224,71,0.4)] rounded-full transition-all duration-500" />
        </div>
  
        {/* Artist Side (Creator) */}
        <div 
          onClick={() => {
              setRootView('ARTIST');
              setPortalView('BLOG');
          }}
          onMouseEnter={() => setHoveredSide('CREATOR')}
          onMouseLeave={() => setHoveredSide(null)}
          className={`relative cursor-pointer h-[40vh] md:h-full rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            hoveredSide === 'CREATOR' 
                ? 'flex-[1.5] -translate-y-4 z-10 ring-1 ring-white/20' 
                : hoveredSide === 'PATRON' 
                    ? 'flex-[0.8] translate-y-12 brightness-50 opacity-60' 
                    : 'flex-1'
          }`}
        >
          {/* Background & Image */}
          <div className="absolute inset-0 bg-neutral-900" />
          <div className="absolute inset-0 bg-fuchsia-950/20" />
          <img 
            src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2000&auto=format&fit=crop" 
            alt="Artist" 
            className={`w-full h-full object-cover transition-all duration-1000 ${hoveredSide === 'CREATOR' ? 'scale-105 saturate-150' : 'saturate-50 opacity-50'}`} 
          />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
             <h2 className={`font-cinzel text-4xl md:text-6xl text-white mb-4 tracking-widest drop-shadow-xl transition-transform duration-700 ${hoveredSide === 'CREATOR' ? '-translate-y-2' : ''}`}>
               {language === 'EN' ? "The Creator" : "Le Créateur"}
             </h2>
             <p className={`font-lato text-sm tracking-[0.3em] text-fuchsia-200 border-b border-fuchsia-400/50 pb-1 transition-all duration-500 delay-100 ${hoveredSide === 'CREATOR' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
               {language === 'EN' ? "I AM AN ARTIST" : "JE SUIS ARTISTE"}
             </p>
          </div>
        </div>
      </div>
    );
  };

  // 2. Buyer Menu
  const BuyerMenu = () => (
    <div className="max-w-6xl mx-auto h-full flex items-center justify-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
         <MenuCard
           title={language === 'EN' ? "See Our Artists" : "Nos Artistes"}
           subtitle={language === 'EN' ? "The Roster" : "Le Registre"}
           bg="/media/Artistes/leslie%20main.png"
           onClick={() => setBuyerView('CATALOG')}
         />
         <MenuCard
           title={language === 'EN' ? "Invest & Save" : "Investir & Économiser"}
           subtitle={language === 'EN' ? "Fiscal Advantages" : "Avantages Fiscaux"}
           bg="/media/Financement%20Artistique/kamy%20museum.png"
           onClick={() => setBuyerView('TAXES')}
         />
         <MenuCard
           title={language === 'EN' ? "Support Projects" : "Soutenir des Projets"}
           subtitle={language === 'EN' ? "Patronage" : "Mécénat"}
           bg="/media/Financement%20Artistique/kamy%20christina%20barcelona.jpg"
           onClick={() => {
              setBuyerView('SUPPORT');
              setPatronTab('CENTER'); // Default tab
           }}
         />
         {/* Café replaces the Digital Atelier tile for now (per Alex).
             Reuses the 'PLATFORMS' buyerView slot — render branch below
             swaps DigitalAtelier for <SdiCafe>. */}
         <MenuCard
           title="Café"
           subtitle={language === 'EN' ? "Productions & Artists" : "Productions & Artistes"}
           bg="https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=1000&auto=format&fit=crop"
           onClick={() => setBuyerView('PLATFORMS')}
         />
      </div>
    </div>
  );

  const MenuCard = ({ title, subtitle, bg, onClick }: { title: string, subtitle: string, bg: string, onClick: () => void }) => (
    <div 
      onClick={onClick}
      className="group relative h-64 md:h-80 rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-2xl"
    >
      <div className="absolute inset-0 bg-indigo-950/60 group-hover:bg-indigo-900/40 transition-colors" />
      <img src={bg} alt={title} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <h3 className="font-cinzel text-2xl md:text-3xl text-white tracking-widest text-shadow-lg group-hover:-translate-y-2 transition-transform duration-500">{title}</h3>
        <span className="font-lato text-xs tracking-[0.2em] text-indigo-300 mt-2 opacity-70 group-hover:opacity-100 transition-opacity">{subtitle}</span>
      </div>
    </div>
  );

  // 3. Artist Catalog (The Dossier)
  const ArtistCard: React.FC<{ artist: ArtistProfile; index: number }> = ({ artist, index }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPressKitOpen, setIsPressKitOpen] = useState(false);
    const [genImages, setGenImages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [currentImgIdx, setCurrentImgIdx] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (artist.galleryImages.length > 0) {
            setCurrentImgIdx((prev) => (prev + 1) % artist.galleryImages.length);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (artist.galleryImages.length > 0) {
            setCurrentImgIdx((prev) => (prev - 1 + artist.galleryImages.length) % artist.galleryImages.length);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareData = {
            title: `Salon des Inconnus - ${artist.name}`,
            text: `Check out ${artist.name}, a ${artist.class} at Le Salon des Inconnus. #SalonDesInconnus #${artist.category} #Art`,
            url: window.location.href
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { console.log('Share canceled'); }
        } else {
            alert(`Link copied to clipboard!\n\n${shareData.text}\n${shareData.url}`);
        }
    };

    const toggleFlip = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPressKitOpen) {
            setIsPressKitOpen(false);
        } else {
            setIsFlipped(!isFlipped);
        }
    };

    const togglePressKit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPressKitOpen(!isPressKitOpen);
    };

    useEffect(() => {
        if (isPressKitOpen && cardRef.current) {
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [isPressKitOpen]);

    useEffect(() => {
        if (isPressKitOpen && !hasGenerated) {
            setIsGenerating(true);
            const generateAssets = async () => {
                if (!import.meta.env.VITE_GEMINI_API_KEY) {
                    setTimeout(() => {
                       setIsGenerating(false);
                       setGenImages([
                           "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop",
                           "https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=1000&auto=format&fit=crop",
                           "https://images.unsplash.com/photo-1550913331-5fdd955487af?q=80&w=1000&auto=format&fit=crop"
                       ]);
                       setHasGenerated(true);
                    }, 2000);
                    return;
                }
                try {
                    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
                    let imagePrompt = "";
                    switch(artist.category) {
                        case 'MUSIC': imagePrompt = `A retro cassette tape with the text "${artist.name}", cinematic lighting.`; break;
                        case 'VISUAL':
                        case 'SCULPTURE': imagePrompt = `A modern museum wall featuring artwork by ${artist.name}, minimalist.`; break;
                        case 'DIGITAL': imagePrompt = `A cyberpunk city billboard displaying digital art by ${artist.name}.`; break;
                    }

                    const response = await ai.models.generateContent({
                      model: 'gemini-2.5-flash-image',
                      contents: { parts: [{ text: imagePrompt }] },
                    });
                    
                    const images: string[] = [];
                    if (response.candidates?.[0]?.content?.parts) {
                        for (const part of response.candidates[0].content.parts) {
                            if (part.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`);
                        }
                    }
                    if (images.length === 0) images.push("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop");
                    setGenImages(images);
                    setIsGenerating(false);
                    setHasGenerated(true);
                } catch (error) {
                    console.error("Gemini Generation Error:", error);
                    setIsGenerating(false);
                    setHasGenerated(true);
                }
            };
            generateAssets();
        }
    }, [isPressKitOpen, hasGenerated, artist]);

    return (
        <div 
          ref={cardRef}
          className="w-full max-w-4xl mx-auto"
          style={{ 
              top: '110px', 
              height: isPressKitOpen ? '150vh' : '70vh', 
              position: isPressKitOpen ? 'relative' : 'sticky',
              zIndex: isPressKitOpen ? 100 : index, 
              perspective: '1500px',
              transition: 'height 0.5s ease, margin 0.5s ease',
              marginBottom: isPressKitOpen ? '150px' : '400px'
          }}
        >
          <div 
             className="relative w-full transition-transform duration-1000 transform-style-3d cursor-pointer shadow-2xl rounded-2xl"
             style={{ 
                 height: '70vh', 
                 transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
             }}
             onClick={toggleFlip}
          >
              <div className="absolute inset-0 backface-hidden bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 group">
                  <img src={artist.avatarUrl} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                      <div className="inline-block px-3 py-1 border border-white/30 rounded-full mb-2 backdrop-blur-sm">
                          <span className="text-[10px] font-lato text-white uppercase tracking-widest">{artist.class}</span>
                      </div>
                      <h2 className="font-cinzel text-5xl text-white drop-shadow-lg mb-2">{artist.name}</h2>
                      <div className="flex items-center gap-2 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                         <span className="text-[10px] text-white uppercase tracking-widest">Click to Flip</span>
                      </div>
                  </div>
              </div>

              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-neutral-900 text-neutral-200 rounded-2xl flex flex-col border border-white/10 shadow-inner">
                 <div className="flex-1 flex flex-col overflow-hidden rounded-2xl relative z-20 bg-neutral-900">
                     <div className="relative h-[35%] w-full bg-neutral-950 shrink-0 border-b border-white/5">
                        {artist.galleryImages.length > 0 ? (
                            <>
                            <img src={artist.galleryImages[currentImgIdx]} alt="Gallery" className="w-full h-full object-cover opacity-90" />
                            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white hover:bg-black/80 rounded-full border border-white/10">←</button>
                            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white hover:bg-black/80 rounded-full border border-white/10">→</button>
                            </>
                        ) : <div className="w-full h-full flex items-center justify-center text-white">No Images</div>}
                     </div>

                     <div className="flex-1 p-6 md:p-8 flex flex-col font-mono">
                         <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-2">
                             <div>
                                 <h3 className="font-bold text-xl uppercase tracking-wider text-white">{artist.name}</h3>
                                 <p className="text-xs text-neutral-500">{artist.class}</p>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={handleShare} className="p-2 border border-white/10 rounded hover:bg-white/5 text-neutral-400 hover:text-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.322.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                                 </button>
                             </div>
                         </div>
                         
                         <div className="flex flex-wrap gap-2 mb-4 text-[10px] uppercase">
                             <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-neutral-400">{artist.medium}</span>
                             {artist.subjects.map(s => <span key={s} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-neutral-400">{s}</span>)}
                         </div>

                         <div className="flex-grow min-h-0 mb-4 overflow-y-auto custom-scrollbar">
                            <p className="text-[10px] leading-relaxed whitespace-pre-line text-neutral-400 text-left">
                                {artist.bio}
                            </p>
                         </div>

                         <div className="grid grid-cols-4 gap-3 mt-auto pt-4 border-t border-white/10">
                             <a href={artist.links.buy} className="flex flex-col items-center justify-center py-3 bg-black border border-white/20 text-white rounded-[15px] hover:bg-neutral-900 transition-colors shadow-sm group/btn">
                                <span className="text-[10px] font-bold tracking-widest mb-0.5">BUY</span>
                                <span className="text-[8px] opacity-60 group-hover/btn:opacity-100">ARTWORK</span>
                             </a>
                             <a href={artist.links.website} className="flex flex-col items-center justify-center py-3 bg-white/5 border border-white/10 text-neutral-200 rounded-[15px] hover:bg-white/10 transition-colors shadow-sm group/btn">
                                <span className="text-[10px] font-bold tracking-widest mb-0.5">WEB</span>
                                <span className="text-[8px] opacity-60 group-hover/btn:opacity-100">PORTFOLIO</span>
                             </a>
                             <a href={artist.links.support} className="flex flex-col items-center justify-center py-3 bg-rose-900/20 text-rose-300 border border-rose-500/30 rounded-[15px] hover:bg-rose-900/30 transition-colors shadow-sm group/btn">
                                <span className="text-[10px] font-bold tracking-widest mb-0.5">SUPPORT</span>
                                <span className="text-[8px] opacity-60 group-hover/btn:opacity-100">PATRONAGE</span>
                             </a>
                             <button 
                               onClick={togglePressKit} 
                               className={`flex flex-col items-center justify-center py-3 rounded-[15px] text-white transition-all shadow-md hover:shadow-lg group/btn ${isPressKitOpen ? 'bg-neutral-800 border border-white/20' : 'bg-gradient-to-br from-indigo-600 to-purple-700'}`}
                             >
                                 <span className="text-[10px] font-bold tracking-widest mb-0.5">{isPressKitOpen ? 'CLOSE' : 'GET KIT'}</span>
                                 <span className="text-[8px] opacity-80 group-hover/btn:opacity-100">DOWNLOAD</span>
                             </button>
                         </div>
                     </div>
                 </div>
                 
                 <div 
                    className="absolute top-full left-0 right-0 h-full origin-top transition-transform duration-1000 transform-style-3d bg-neutral-800 text-neutral-200 rounded-b-2xl border-x border-b border-white/10 flex flex-col p-6 font-mono shadow-xl z-[-1]"
                    style={{ 
                        transform: isPressKitOpen ? 'rotateX(0deg)' : 'rotateX(-180deg)',
                        opacity: isPressKitOpen ? 1 : 0 
                    }}
                    onClick={(e) => e.stopPropagation()} 
                 >
                      {/* Press Kit Content */}
                      <div className="border-b border-white/10 pb-2 mb-4 flex justify-between items-center">
                          <h3 className="font-bold text-sm text-neutral-300">GENERATED ASSETS</h3>
                          <button className="text-xs hover:text-red-400 text-neutral-500" onClick={() => setIsPressKitOpen(false)}>CLOSE X</button>
                      </div>
                      
                      {isGenerating ? (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded bg-white/5">
                             <p className="font-mono text-xs animate-pulse text-neutral-400">DEVELOPING...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mb-4 overflow-y-auto custom-scrollbar flex-1">
                             {genImages.map((img, idx) => (
                                 <div key={idx} className="aspect-square bg-neutral-900 rounded overflow-hidden border border-white/10">
                                     <img src={img} alt="Asset" className="w-full h-full object-cover" />
                                 </div>
                             ))}
                        </div>
                      )}

                      <div className="mt-auto pt-4 border-t border-white/10">
                         <p className="text-[10px] mb-2 font-bold text-neutral-500">AVAILABLE DOWNLOADS:</p>
                         <ul className="space-y-1 text-[10px] text-neutral-400 mb-4">
                             <li>[PDF] Artist_Bio_Full.pdf</li>
                             <li>[ZIP] Media_Kit_2025.zip</li>
                             <li>[MP3] Audio_Interview.mp3</li>
                         </ul>
                         <button className="w-full py-3 bg-white text-black font-mono text-xs font-bold uppercase rounded-[15px] hover:bg-neutral-200 transition-colors">
                             DOWNLOAD ALL
                         </button>
                      </div>
                 </div>
              </div>
          </div>
        </div>
    );
  };

  // 3.5 Catalog Implementation
  const Catalog = () => (
      <div className="pb-32 pt-12 relative">
         <div className="text-center mb-16 relative z-10">
            <h2 className="font-cinzel text-4xl text-white tracking-widest">{language === 'EN' ? "The Roster" : "Le Registre"}</h2>
            <p className="font-lato text-neutral-400 mt-2">{language === 'EN' ? "Select a profile to view details" : "Sélectionnez un profil pour voir les détails"}</p>
         </div>
         <div className="px-4">
            {artists.map((artist, index) => (
                <ArtistCard key={artist.id} artist={artist} index={index} />
            ))}
         </div>
      </div>
  );

  // New sub-component for Patronage Artist Card
  const PatronArtistCard: React.FC<{ artist: ArtistProfile; language: 'EN' | 'FR' }> = ({ artist, language }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Mock data based on category
    const getNeeds = () => {
        if (artist.category === 'MUSIC') return language === 'EN' ? ["Studio Time", "Mixing", "Cables"] : ["Temps Studio", "Mixage", "Câbles"];
        if (artist.category === 'DIGITAL') return language === 'EN' ? ["Cloud Compute", "Storage", "Licenses"] : ["Calcul Cloud", "Stockage", "Licences"];
        return language === 'EN' ? ["Canvas", "Paints", "Shipping"] : ["Toile", "Peinture", "Envoi"];
    };

    const getRewards = () => {
        return language === 'EN' 
            ? ["Wallpapers", "WIP Access", "Credits"]
            : ["Fonds d'écran", "Accès WIP", "Crédits"];
    };

    const tiers = [
        { 
            name: language === 'EN' ? "Spark" : "Étincelle", 
            amount: "$10", 
            perk: language === 'EN' ? "Digital Thank You" : "Merci Numérique" 
        },
        { 
            name: language === 'EN' ? "Flame" : "Flamme", 
            amount: "$50", 
            perk: language === 'EN' ? "Early Access + Print" : "Accès + Imprimé" 
        },
        { 
            name: language === 'EN' ? "Blaze" : "Brasier", 
            amount: "$150", 
            perk: language === 'EN' ? "Original Sketch" : "Croquis Original" 
        },
    ];

    const needs = getNeeds();
    const rewards = getRewards();

    return (
        <div 
          className="group relative w-full aspect-[2.1/1] cursor-pointer perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front Side */}
                <div className="absolute inset-0 backface-hidden rounded-xl overflow-hidden border border-white/10 shadow-xl group-hover:border-white/30 transition-colors bg-[#141414]">
                    <img src={artist.avatarUrl} alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent" />
                    
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-[10px] text-white uppercase tracking-wider">{language === 'EN' ? "Support" : "Soutenir"} ↻</span>
                    </div>

                    <div className="absolute bottom-0 left-0 p-6 w-3/4">
                         <h3 className="font-cinzel text-3xl text-white mb-1 drop-shadow-md leading-none">{artist.name}</h3>
                         <p className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider mb-2">{artist.class}</p>
                         <p className="text-[10px] text-neutral-300 line-clamp-2 font-lato opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            {artist.bio.substring(0, 100)}...
                         </p>
                    </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl overflow-hidden bg-[#141414] border border-[#d4af37]/30 shadow-xl p-5 flex flex-col">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2 shrink-0">
                        <h3 className="font-cinzel text-sm text-white">{artist.name}</h3>
                        <span className="text-[9px] font-mono text-[#d4af37] uppercase tracking-wider">{language === 'EN' ? "Patronage Options" : "Options Mécénat"}</span>
                    </div>

                    {/* Needs & Rewards Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-3 shrink-0">
                        <div>
                            <h4 className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{language === 'EN' ? "Needs" : "Besoins"}</h4>
                            <div className="flex flex-wrap gap-1">
                                {needs.map((n, i) => (
                                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-neutral-300 border border-white/5">{n}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{language === 'EN' ? "Rewards" : "Contreparties"}</h4>
                            <div className="flex flex-wrap gap-1">
                                {rewards.map((r, i) => (
                                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-emerald-900/20 rounded text-emerald-200 border border-emerald-500/20">{r}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tiers Section */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="grid grid-cols-3 gap-2 h-full">
                            {tiers.map((tier, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#d4af37]/50 transition-colors group/tier relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#d4af37]/10 to-transparent opacity-0 group-hover/tier:opacity-100 transition-opacity" />
                                    <span className="text-[8px] text-[#d4af37] uppercase tracking-widest font-bold mb-0.5">{tier.name}</span>
                                    <span className="text-base font-cinzel text-white mb-0.5">{tier.amount}</span>
                                    <span className="text-[7px] text-neutral-400 text-center leading-tight group-hover/tier:text-white transition-colors">{tier.perk}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-2 border-t border-white/10 shrink-0">
                         <a 
                           href={artist.links.support}
                           onClick={(e) => e.stopPropagation()}
                           className="flex w-full items-center justify-center py-2 bg-[#d4af37] hover:bg-[#b89c6f] text-black font-cinzel font-bold text-[10px] uppercase tracking-widest rounded transition-colors shadow-lg"
                         >
                             {language === 'EN' ? "Select & Support" : "Choisir & Soutenir"}
                         </a>
                    </div>
                </div>

            </div>
        </div>
    );
  };

  // 4. Patronage Section (Restored & Enhanced)
  const PatronageSection = () => {
    // Scroll to section on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const projects = [
        {
            id: 1,
            title: "The Glass Kiln",
            description: "Acquiring a professional kiln to launch our glass-blowing residency.",
            image: "https://images.unsplash.com/photo-1590490360182-f33efe29a79d?q=80&w=1000&auto=format&fit=crop",
            raised: 3200,
            goal: 5000,
            tag: "CROWDFUNDING"
        },
        {
            id: 2,
            title: "Festival Ripunk 2025",
            description: "Funding the stages and sound equipment for this year's cyber-medieval gathering.",
            image: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1000&auto=format&fit=crop",
            raised: 4500,
            goal: 15000,
            tag: "CROWDFUNDING"
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] pb-24 font-lato text-neutral-200">
            
            {/* Hero Section */}
            <div className="relative pt-24 pb-12 text-center px-4 bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
                <h2 className="font-cinzel text-5xl md:text-6xl text-white tracking-widest mb-4 drop-shadow-lg">
                    {language === 'EN' ? "The Art of Patronage" : "L'Art du Mécénat"}
                </h2>
                <p className="max-w-2xl mx-auto text-neutral-400 mb-8 font-light text-lg">
                    {language === 'EN' 
                     ? "Support the cultural heartbeat of Petite Nation. Choose to empower a specific creator, fund a project, or sustain the center itself."
                     : "Soutenez le cœur culturel de la Petite Nation. Choisissez d'habiliter un créateur, de financer un projet ou de soutenir le centre lui-même."}
                </p>
                <button 
                  onClick={() => setBuyerView('TAXES')}
                  className="px-6 py-2 rounded-full border border-emerald-500/30 bg-emerald-900/10 text-emerald-400 font-cinzel text-xs font-bold uppercase tracking-widest hover:bg-emerald-900/20 transition-all mb-12 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                    {language === 'EN' ? "View Fiscal Advantages (Invest & Save) →" : "Voir Avantages Fiscaux (Investir & Économiser) →"}
                </button>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap justify-center gap-4 border-b border-white/5 pb-8 mb-12">
                     <button 
                        onClick={() => setPatronTab('ARTIST')}
                        className={`px-6 py-3 rounded-full border transition-all font-cinzel text-xs font-bold uppercase tracking-widest ${patronTab === 'ARTIST' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-transparent border-white/10 text-neutral-500 hover:text-white hover:border-white/30'}`}
                     >
                        {language === 'EN' ? "Sponsor an Artist" : "Parrainer un Artiste"}
                     </button>
                     <button 
                        onClick={() => setPatronTab('CENTER')}
                        className={`px-6 py-3 rounded-full border transition-all font-cinzel text-xs font-bold uppercase tracking-widest ${patronTab === 'CENTER' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-transparent border-white/10 text-neutral-500 hover:text-white hover:border-white/30'}`}
                     >
                        {language === 'EN' ? "Support the Center" : "Soutenir le Centre"}
                     </button>
                     <button 
                        onClick={() => setPatronTab('PROJECT')}
                        className={`px-6 py-3 rounded-full border transition-all font-cinzel text-xs font-bold uppercase tracking-widest ${patronTab === 'PROJECT' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-transparent border-white/10 text-neutral-500 hover:text-white hover:border-white/30'}`}
                     >
                        {language === 'EN' ? "Support a Project" : "Soutenir un Projet"}
                     </button>
                     <button 
                        onClick={() => setPatronTab('BEYOND')}
                        className={`px-6 py-3 rounded-full border transition-all font-cinzel text-xs font-bold uppercase tracking-widest ${patronTab === 'BEYOND' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-transparent border-white/10 text-neutral-500 hover:text-white hover:border-white/30'}`}
                     >
                        {language === 'EN' ? "Beyond Money" : "Au-delà de l'Argent"}
                     </button>
                </div>
            </div>

            {/* TAB CONTENT AREAS */}
            <div className="max-w-7xl mx-auto px-6 min-h-[50vh]">
                
                {/* 1. ARTIST SPONSORSHIP */}
                {patronTab === 'ARTIST' && (
                    <div className="animate-fadeIn">
                        <div className="text-center mb-12">
                             <p className="text-neutral-400 italic font-lato text-lg max-w-3xl mx-auto">
                                 {language === 'EN' ? "Directly support a creator's livelihood. Flip a card to see their specific needs and the rewards they offer in return." : "Soutenez directement un créateur. Retournez une carte pour voir ses besoins et les contreparties offertes."}
                             </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                            {artists.map(artist => (
                                <PatronArtistCard key={artist.id} artist={artist} language={language} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. CENTER SUPPORT */}
                {patronTab === 'CENTER' && (
                    <div className="animate-fadeIn">
                         {/* Split Donation Banner */}
                         <div className="bg-[#1a1a1a] rounded-2xl border border-[#d4af37]/20 p-8 md:p-12 text-center mb-16 relative overflow-hidden shadow-2xl">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
                             <h3 className="font-cinzel text-3xl text-[#d4af37] mb-4 tracking-widest">{language === 'EN' ? "The Fair Choice" : "Le Choix Équitable"}</h3>
                             <p className="text-neutral-300 max-w-2xl mx-auto mb-8 font-light">
                                 {language === 'EN' ? "Not sure who to support? Choose our Split Donation model. 50% of your contribution is divided equally among our featured resident artists, and 50% sustains the Salon's operations." : "Pas certain de qui soutenir ? Choisissez notre modèle de Don Partagé. 50% est divisé entre nos artistes résidents, et 50% soutient les opérations du Salon."}
                             </p>
                             <button className="px-8 py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest rounded-full hover:bg-[#b89c6f] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all">
                                 {language === 'EN' ? "Make a Split Donation" : "Faire un Don Partagé"}
                             </button>
                         </div>

                         {/* Membership Tiers */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                             {/* Tier 1 */}
                             <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 flex flex-col h-[400px]">
                                 <h4 className="font-cinzel text-2xl text-white mb-2">{language === 'EN' ? "The Initiate" : "L'Initié"}</h4>
                                 <div className="text-4xl font-cinzel text-white mb-8">$20 <span className="text-xs font-sans text-neutral-500 font-normal">/ month</span></div>
                                 <ul className="space-y-4 mb-8 flex-1">
                                     <li className="flex gap-3 text-sm text-neutral-400"><span className="text-indigo-400">♦</span> Exclusive Digital Content</li>
                                     <li className="flex gap-3 text-sm text-neutral-400"><span className="text-indigo-400">♦</span> Newsletter Access</li>
                                     <li className="flex gap-3 text-sm text-neutral-400"><span className="text-indigo-400">♦</span> Priority Booking (48h)</li>
                                 </ul>
                                 <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-cinzel font-bold text-xs uppercase tracking-widest rounded transition-colors">
                                     Join The Circle
                                 </button>
                             </div>

                             {/* Tier 2 (Featured) */}
                             <div className="bg-[#0f0f1a] border border-indigo-500/30 rounded-2xl p-8 flex flex-col h-[450px] relative shadow-[0_0_30px_rgba(79,70,229,0.15)] transform md:-translate-y-4">
                                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4af37] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                                     Most Popular
                                 </div>
                                 <h4 className="font-cinzel text-2xl text-white mb-2">{language === 'EN' ? "The Guardian" : "Le Gardien"}</h4>
                                 <div className="text-5xl font-cinzel text-white mb-8">$100 <span className="text-xs font-sans text-neutral-500 font-normal">/ month</span></div>
                                 <ul className="space-y-4 mb-8 flex-1">
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-indigo-400">♦</span> All Initiate Perks</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-indigo-400">♦</span> 1 Limited Edition Print/Year</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-indigo-400">♦</span> 10% Discount on Stays</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-indigo-400">♦</span> Corporate Tax Receipt</li>
                                 </ul>
                                 <button className="w-full py-4 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-100 font-cinzel font-bold text-xs uppercase tracking-widest rounded transition-colors shadow-lg">
                                     Join The Circle
                                 </button>
                             </div>

                             {/* Tier 3 */}
                             <div className="bg-[#14120a] border border-[#d4af37]/30 rounded-2xl p-8 flex flex-col h-[450px]">
                                 <h4 className="font-cinzel text-2xl text-white mb-2">{language === 'EN' ? "The Maecenas" : "Le Mécène"}</h4>
                                 <div className="text-5xl font-cinzel text-white mb-8">$500 <span className="text-xs font-sans text-neutral-500 font-normal">/ month</span></div>
                                 <ul className="space-y-4 mb-8 flex-1">
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-[#d4af37]">♦</span> All Guardian Perks</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-[#d4af37]">♦</span> Original Sketch/Year</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-[#d4af37]">♦</span> Private Dinner with Artists</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-[#d4af37]">♦</span> Name on Founders Wall</li>
                                     <li className="flex gap-3 text-sm text-neutral-300"><span className="text-[#d4af37]">♦</span> Concierge Service</li>
                                 </ul>
                                 <button className="w-full py-4 bg-[#d4af37] hover:bg-[#b89c6f] text-black font-cinzel font-bold text-xs uppercase tracking-widest rounded transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                     Join The Circle
                                 </button>
                             </div>
                         </div>
                    </div>
                )}

                {/* 3. PROJECT SUPPORT */}
                {patronTab === 'PROJECT' && (
                    <div className="animate-fadeIn max-w-5xl mx-auto space-y-12">
                        {projects.map((project, idx) => (
                            <div key={project.id} className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row">
                                <div className={`md:w-1/2 h-64 md:h-auto relative ${idx % 2 !== 0 ? 'md:order-2' : ''}`}>
                                    <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                                    <div className="absolute top-4 left-4 bg-[#d4af37] text-black text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider">
                                        {project.tag}
                                    </div>
                                </div>
                                <div className="md:w-1/2 p-8 flex flex-col justify-center">
                                    <h3 className="font-cinzel text-3xl text-white mb-4">{project.title}</h3>
                                    <p className="text-neutral-400 mb-8 font-light leading-relaxed">{project.description}</p>
                                    
                                    {/* Progress */}
                                    <div className="mb-8">
                                        <div className="flex justify-between text-xs font-mono text-neutral-400 mb-2">
                                            <span>${project.raised.toLocaleString()} raised</span>
                                            <span>Goal: ${project.goal.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                              style={{ width: `${(project.raised / project.goal) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Donate Buttons */}
                                    <div className="grid grid-cols-3 gap-3 mb-8">
                                        <button className="py-2 border border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white transition-colors text-sm rounded font-mono">$25</button>
                                        <button className="py-2 border border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white transition-colors text-sm rounded font-mono">$50</button>
                                        <button className="py-2 border border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white transition-colors text-sm rounded font-mono">$100</button>
                                    </div>

                                    <button className="w-full py-3 bg-white text-black font-cinzel font-bold text-xs uppercase tracking-widest rounded hover:bg-neutral-200 transition-colors">
                                        Back This Project
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. BEYOND MONEY */}
                {patronTab === 'BEYOND' && (
                    <div className="animate-fadeIn max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            {/* Host Card */}
                            <div className="bg-[#141414] p-10 rounded-2xl border border-white/10 hover:border-white/20 transition-colors group">
                                <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                    </svg>
                                </div>
                                <h3 className="font-cinzel text-2xl text-white mb-4">Host An Artist</h3>
                                <p className="text-neutral-400 mb-8 leading-relaxed">
                                    Have a spare room, cottage, or studio space? Offer a rent-free residency to a visiting creator. In exchange, receive art and the joy of enabling creation.
                                </p>
                                <button className="text-emerald-400 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/50 pb-1 hover:text-emerald-300">
                                    Offer Space
                                </button>
                            </div>

                            {/* Material Card */}
                            <div className="bg-[#141414] p-10 rounded-2xl border border-white/10 hover:border-white/20 transition-colors group">
                                <div className="w-12 h-12 bg-rose-900/30 rounded-full flex items-center justify-center text-rose-400 mb-6 border border-rose-500/20 group-hover:scale-110 transition-transform">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.26 2.26 0 0021 17.25l-5.877-5.877M11.423 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.423 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                                    </svg>
                                </div>
                                <h3 className="font-cinzel text-2xl text-white mb-4">Material Patron</h3>
                                <p className="text-neutral-400 mb-8 leading-relaxed">
                                    Donate equipment (kilns, cameras, instruments) or supplies. Your unused gear could launch the next masterpiece.
                                </p>
                                <button className="text-rose-400 text-xs font-bold uppercase tracking-widest border-b border-rose-500/50 pb-1 hover:text-rose-300">
                                    Donate Gear
                                </button>
                            </div>
                        </div>

                        {/* Corporate Banner */}
                        <div className="bg-[#1a1810] border border-[#d4af37]/20 rounded-2xl p-12 text-center relative overflow-hidden">
                             <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-5 pointer-events-none hidden md:block">
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-48 h-48">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                             </div>
                             <h3 className="font-cinzel text-3xl text-[#d4af37] mb-4">Corporate Sponsorship</h3>
                             <p className="text-neutral-300 max-w-2xl mx-auto mb-8">
                                 Full tax deductibility as advertising expenses. Your brand at our events.
                             </p>
                             <div className="flex justify-center gap-4">
                                 <button className="px-8 py-3 bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-widest rounded hover:bg-[#b89c6f] shadow-lg">
                                     Contact for Partnership
                                 </button>
                                 <button className="px-8 py-3 border border-[#d4af37]/30 text-[#d4af37] font-cinzel font-bold text-xs uppercase tracking-widest rounded hover:bg-[#d4af37]/10">
                                     Learn More
                                 </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  // 5. RESTORED DIGITAL ATELIER (Platforms)
  const DigitalAtelier = () => {
    // State
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
    const [partnershipModel, setPartnershipModel] = useState<string>('one-shot');
    const [payDeposit, setPayDeposit] = useState(false);

    // Data
    const artifacts = [
      { id: 1, title: "The Celestial Atlas", subtitle: "Interactive Map", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop" },
      { id: 2, title: "Neo-Kyoto Archives", subtitle: "Digital Library", img: "https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=1000&auto=format&fit=crop" },
      { id: 3, title: "Void Walker", subtitle: "Immersive Commerce", img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1000&auto=format&fit=crop" }
    ];

    const scopes = [
      { id: 'ecommerce', label: 'E-Commerce Suite', price: 2000 },
      { id: 'booking', label: 'Booking System', price: 1000 },
      { id: 'seo', label: 'Advanced SEO & Analytics', price: 800 },
      { id: 'cms', label: 'Custom Content Management', price: 1200 },
      { id: 'branding', label: 'Full Branding Kit', price: 1500 },
    ];

    const identities = [
        { id: 'artist', label: 'Artist / Creator (-$800)', discount: 800 },
        { id: 'nonprofit', label: 'Non-Profit (OBNL) (-$1000)', discount: 1000 },
        { id: 'enviro', label: 'Environmentalist (-$800)', discount: 800 },
        { id: 'charity', label: 'Charity (-$1200)', discount: 1200 },
        { id: 'edu', label: 'Education (-$1000)', discount: 1000 },
        { id: 'nations', label: 'First Nations (-$1500)', discount: 1500 },
        { id: 'recurring', label: 'Recurring Customer (-$500)', discount: 500 },
    ];

    const partnerships = [
        { id: '8year', label: '8-Year Legacy', badge: '+12% Interest', badgeColor: 'bg-emerald-500', desc: 'Long-term partnership. Includes All-Time Support & Modifications.', interest: 12 },
        { id: '4year', label: '4-Year Growth', badge: '+15% Interest', badgeColor: 'bg-emerald-500', desc: 'Mid-term accelerator. Includes All-Time Support & Modifications.', interest: 15 },
        { id: 'one-shot', label: 'One-Shot Creation', badge: 'Standard', badgeColor: 'bg-neutral-500', desc: 'Delivery: 1st draft (48h), Final (2 weeks), Recap (1 mo). Note: Extra mods @ $120/hr.', interest: 0 },
    ];

    // Calculations
    const basePrice = 5000;
    const scopeTotal = scopes.filter(s => selectedScopes.includes(s.id)).reduce((acc, s) => acc + s.price, 0);
    const discountTotal = identities.filter(i => selectedIdentities.includes(i.id)).reduce((acc, i) => acc + i.discount, 0);
    
    // Subtotal cannot go below $1500
    let subtotal = Math.max(1500, basePrice + scopeTotal - discountTotal);
    
    // Apply Partnership Interest
    const model = partnerships.find(p => p.id === partnershipModel);
    if (model && model.interest > 0) {
        subtotal = subtotal * (1 + model.interest / 100);
    }

    const toggleScope = (id: string) => {
        if (selectedScopes.includes(id)) setSelectedScopes(selectedScopes.filter(s => s !== id));
        else setSelectedScopes([...selectedScopes, id]);
    };

    const toggleIdentity = (id: string) => {
        if (selectedIdentities.includes(id)) setSelectedIdentities(selectedIdentities.filter(s => s !== id));
        else setSelectedIdentities([...selectedIdentities, id]);
    };

    return (
        <div className="w-full bg-[#0a0a0a] min-h-screen pb-32">
             
             {/* Header */}
             <div className="pt-24 pb-16 text-center">
                 <div className="inline-block px-4 py-1 border border-indigo-500/30 rounded-full bg-indigo-900/10 mb-6">
                     <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]">Digital Atelier</span>
                 </div>
                 <h2 className="font-cinzel text-5xl text-white mb-6 tracking-widest">The Digital Artifacts</h2>
                 <p className="font-lato text-neutral-400 max-w-2xl mx-auto text-lg font-light">
                     We craft bespoke digital experiences that merge art with functionality. Explore our recent creations before building your own.
                 </p>
             </div>

             {/* Artifacts Showcase */}
             <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                 {artifacts.map(art => (
                     <div key={art.id} className="group relative aspect-[16/9] rounded-xl overflow-hidden border border-white/10 cursor-pointer">
                         <img src={art.img} alt={art.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                         <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black/90 to-transparent w-full">
                             <h3 className="font-cinzel text-xl text-white mb-1">{art.title}</h3>
                             <p className="text-[10px] text-indigo-300 uppercase tracking-wider">{art.subtitle}</p>
                         </div>
                     </div>
                 ))}
             </div>

             {/* Main Interface: Calculator & Sidebar */}
             <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-12">
                 
                 {/* Left Column: Controls */}
                 <div className="flex-1 space-y-16">
                     
                     {/* 1. Define Scope */}
                     <div className="bg-[#141414] p-8 rounded-2xl border border-white/5">
                         <div className="flex items-center gap-4 mb-8">
                             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">1</div>
                             <h3 className="font-cinzel text-2xl text-white tracking-widest">Define Scope</h3>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {scopes.map(scope => (
                                 <div 
                                    key={scope.id} 
                                    onClick={() => toggleScope(scope.id)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${selectedScopes.includes(scope.id) ? 'bg-indigo-900/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'}`}
                                 >
                                     <span className="font-lato text-sm">{scope.label}</span>
                                     <span className="font-mono text-xs text-indigo-300">+${scope.price}</span>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* 2. Your Identity */}
                     <div className="bg-[#141414] p-8 rounded-2xl border border-white/5">
                         <div className="flex items-center gap-4 mb-4">
                             <div className="w-8 h-8 rounded-full bg-fuchsia-700 flex items-center justify-center font-bold text-white">2</div>
                             <h3 className="font-cinzel text-2xl text-white tracking-widest">Your Identity</h3>
                         </div>
                         <p className="text-sm text-neutral-500 mb-8 ml-12">Select all that apply to unlock community pricing.</p>
                         <div className="flex flex-wrap gap-3 ml-12">
                             {identities.map(id => (
                                 <button 
                                    key={id.id}
                                    onClick={() => toggleIdentity(id.id)}
                                    className={`px-4 py-2 rounded-full text-xs border transition-all ${selectedIdentities.includes(id.id) ? 'bg-fuchsia-900/30 border-fuchsia-500 text-white shadow-[0_0_10px_rgba(232,121,249,0.3)]' : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/30'}`}
                                 >
                                     {id.label}
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* 3. Partnership Model */}
                     <div className="bg-[#141414] p-8 rounded-2xl border border-white/5">
                         <div className="flex items-center gap-4 mb-8">
                             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white">3</div>
                             <h3 className="font-cinzel text-2xl text-white tracking-widest">Partnership Model</h3>
                         </div>
                         <div className="space-y-4 ml-12">
                             {partnerships.map(p => (
                                 <div 
                                    key={p.id}
                                    onClick={() => setPartnershipModel(p.id)}
                                    className={`p-6 rounded-xl border cursor-pointer transition-all relative ${partnershipModel === p.id ? 'bg-[#1a1a1a] border-emerald-500 shadow-lg' : 'bg-[#1a1a1a] border-white/10 hover:border-white/20'}`}
                                 >
                                     <div className="flex justify-between items-center mb-2">
                                         <h4 className="font-cinzel text-lg text-white font-bold">{p.label}</h4>
                                         <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${p.badgeColor}`}>{p.badge}</span>
                                     </div>
                                     <p className="text-sm text-neutral-400 font-lato">{p.desc}</p>
                                 </div>
                             ))}
                         </div>
                     </div>

                 </div>

                 {/* Right Column: Sticky Sidebar */}
                 <div className="lg:w-1/3">
                     <div className="sticky top-32 bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 shadow-2xl">
                         <div className="text-center mb-8 border-b border-white/10 pb-6">
                             <h3 className="font-cinzel text-2xl text-white tracking-widest">Estimate</h3>
                         </div>
                         
                         <div className="space-y-4 mb-8 font-mono text-sm">
                             <div className="flex justify-between text-neutral-400">
                                 <span>Base Price</span>
                                 <span>$5,000</span>
                             </div>
                             {scopeTotal > 0 && (
                                 <div className="flex justify-between text-indigo-400">
                                     <span>Scope Add-ons</span>
                                     <span>+${scopeTotal}</span>
                                 </div>
                             )}
                             {discountTotal > 0 && (
                                 <div className="flex justify-between text-fuchsia-400">
                                     <span>Community Discounts</span>
                                     <span>-${discountTotal}</span>
                                 </div>
                             )}
                             {model && model.interest > 0 && (
                                 <div className="flex justify-between text-emerald-400">
                                     <span>Partnership Interest</span>
                                     <span>+{model.interest}%</span>
                                 </div>
                             )}
                             <div className="flex justify-between text-white pt-4 border-t border-white/10 text-lg font-bold">
                                 <span>Subtotal</span>
                                 <span>${Math.round(subtotal)}</span>
                             </div>
                         </div>

                         <div className="bg-white/5 rounded-lg p-4 mb-8 cursor-pointer" onClick={() => setPayDeposit(!payDeposit)}>
                             <div className="flex items-center gap-3">
                                 <div className={`w-4 h-4 rounded-full border border-white/30 flex items-center justify-center ${payDeposit ? 'bg-indigo-500 border-transparent' : ''}`}>
                                     {payDeposit && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                 </div>
                                 <span className="text-xs text-neutral-300 font-bold uppercase">Pay 10% Deposit Now</span>
                             </div>
                             <p className="text-[10px] text-neutral-500 mt-2 ml-7">Save 10% on TOTAL price</p>
                         </div>

                         <div className="text-center mb-8">
                             <div className="text-5xl font-cinzel text-white mb-2 font-bold">${Math.round(payDeposit ? subtotal * 0.9 : subtotal)}</div>
                             <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Total Estimated Cost</div>
                         </div>

                         <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-cinzel font-bold text-sm uppercase tracking-widest rounded transition-colors shadow-lg shadow-indigo-900/20">
                             Request Contract
                         </button>
                     </div>
                 </div>

             </div>
        </div>
    );
  };

  // NEW: Comprehensive Fiscality Page (Landing Style)
  const FiscalityPage = () => {
    // Simulator State
    const [price, setPrice] = useState(5000);
    const [taxRateInput, setTaxRateInput] = useState(26.5); // Default tax rate
    const [financingPrice, setFinancingPrice] = useState(1100); // For Financing Section

    // Calculate savings dynamically
    const calculateSavings = () => {
        // Use user input tax rate (converted to decimal)
        const effectiveTaxRate = taxRateInput / 100;
        
        let remaining = price;
        let totalDeduction = 0;
        const schedule = [];
        
        let year = 1;
        // Run until book value is < $25 or max 10 years (as requested)
        while (remaining >= 25 && year <= 10) {
             // Half-year rule applies to Year 1 for Class 8 (10% instead of 20%)
             const rate = year === 1 ? 0.10 : 0.20; 
             
             // Calculate Deduction (CCA)
             const deduction = remaining * rate;
             
             // Calculate Tax Savings for this year based on user input rate
             const saved = deduction * effectiveTaxRate;
             
             // End Balance
             const end = remaining - deduction;
             
             schedule.push({ 
                 year, 
                 start: remaining, 
                 deduction, 
                 saved, 
                 end 
             });
             
             remaining = end;
             totalDeduction += deduction;
             year++;
        }
        
        const totalTaxSaved = totalDeduction * effectiveTaxRate;
        return { schedule, totalDeduction, totalTaxSaved };
    };

    const { schedule, totalTaxSaved } = calculateSavings();
    const netCost = price - totalTaxSaved;

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="w-full bg-[#0a0a0a] animate-fadeIn pb-32">
            
            {/* SECTION 1: HERO PARALLAX */}
            <section className="relative min-h-screen flex items-center justify-center bg-fixed bg-center bg-cover" 
                style={{ backgroundImage: `url("/media/Financement%20Artistique/kamy%20christina%20barcelona.jpg")` }}
            >
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                    <h1 className="font-cinzel text-6xl md:text-8xl text-white mb-4 tracking-widest drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                        L'ART
                    </h1>
                    <h2 className="font-cinzel text-xl md:text-2xl text-[#d4af37] mb-8 tracking-[0.2em] uppercase drop-shadow-lg">
                        Accessible ET Avantageux
                    </h2>
                    <p className="font-lato text-lg md:text-xl text-neutral-200 leading-relaxed mb-12 max-w-2xl mx-auto text-shadow-lg">
                        L'Art peut s’intégrer à tous les budgets et ambitions. Que vous soyez en entreprise ou en finance à la recherche d’avantages fiscaux ou sur un budget, vivant un amour apparemment impossible avec l'Art, souhaitant découvrir nos solutions de financement qui démocratisent l'Art et rendent les oeuvres accessibles, cette page vous guide vers la formule qui vous convient. Choisissez l’approche qui correspond à votre réalité et laissez l’art enrichir votre espace! Financement artistique disponible via Credee.
                    </p>
                    <div className="flex flex-col md:flex-row gap-6 justify-center">
                        <button 
                            onClick={() => scrollTo('fiscal-section')}
                            className="px-8 py-4 bg-white text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-neutral-200 transition-colors shadow-xl rounded-[15px]"
                        >
                            Avantages Fiscaux (DPA)
                        </button>
                        <button 
                            onClick={() => scrollTo('financing-section')}
                            className="px-8 py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#b89c6f] transition-colors shadow-xl rounded-[15px]"
                        >
                            Financement Credee
                        </button>
                    </div>
                </div>
            </section>

            {/* SECTION 2: FISCAL ADVANTAGES (STICKY SCROLL) */}
            <section id="fiscal-section" className="relative w-full bg-fixed bg-center bg-cover"
                 style={{ backgroundImage: `url("/media/Financement%20Artistique/centered%20copy.jpg")` }}
            >
                <div className="absolute inset-0 bg-black/90 md:bg-black/80" />
                
                <div className="relative z-10 flex flex-col md:flex-row max-w-none">
                    {/* Left: Sticky */}
                    <div className="w-full md:w-1/2 min-h-screen md:h-screen md:sticky md:top-0 flex flex-col justify-center p-12 md:p-24 border-r border-white/5 backdrop-blur-sm">
                        <span className="text-[#d4af37] text-sm font-bold tracking-[0.2em] uppercase mb-4 block">Fiscalité Québec</span>
                        <h2 className="font-cinzel text-3xl md:text-4xl text-white mb-8 leading-tight">
                            Plus qu'une décoration :<br /> un Actif Stratégique
                        </h2>
                        
                        <div className="space-y-6 text-neutral-300 font-lato text-lg leading-relaxed">
                            <p>
                                <strong className="text-white">Buy Art, Save Taxes.</strong><br/>
                                Transformez vos murs en levier fiscal. Au-delà de l'esthétique, l'acquisition d'art canadien est un investissement intelligent qui offre un triple avantage à votre entreprise :
                            </p>
                            <ul className="space-y-2 list-disc pl-5">
                                <li><strong className="text-white">Levier Fiscal :</strong> Réduisez votre revenu imposable (DPA Catégorie 8).</li>
                                <li><strong className="text-white">Trésorerie :</strong> Récupération immédiate des taxes (CTI/RTI).</li>
                                <li><strong className="text-white">Prestige :</strong> Un actif qui garde sa valeur, ou en prend, contrairement au mobilier standard.</li>
                            </ul>
                            <p className="pt-8 border-t border-white/10">
                                <strong className="text-white">Une culture d'entreprise distinctive.</strong><br/>
                                En plus des avantages financiers, l'art soutient l'économie locale et enrichit l'environnement de travail, renforçant votre marque employeur.
                            </p>
                        </div>
                    </div>

                    {/* Right: Scrolling Content */}
                    <div className="w-full md:w-1/2 p-8 md:p-24 flex flex-col gap-8">
                        
                        <FadeInRight delay={100}>
                            <div className="bg-[#1a1a1a]/90 backdrop-blur-md p-10 rounded-xl border border-white/10 shadow-2xl hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/20 transition-all duration-300 cursor-default group">
                                <h3 className="font-cinzel text-3xl text-white mb-4 group-hover:text-[#d4af37] transition-colors">Comment ça fonctionne ?</h3>
                                <p className="text-neutral-400 font-lato leading-relaxed mb-4">
                                    C'est un mécanisme financier en deux temps :
                                </p>
                                <ol className="space-y-4 text-neutral-400 font-lato list-decimal pl-5">
                                    <li>
                                        <strong className="text-white">Récupération Immédiate :</strong> En tant qu'entreprise inscrite, vous récupérez 100% des taxes (TPS/TVQ - 14.975%) via vos crédits de taxes (CTI/RTI). C'est un retour de liquidité direct.
                                    </li>
                                    <li>
                                        <strong className="text-white">Amortissement Annuel :</strong> Le coût restant est amorti annuellement, réduisant vos impôts corporatifs année après année.
                                    </li>
                                </ol>
                                <p className="text-neutral-500 text-sm mt-4 italic">
                                    Contrairement à une chaise de bureau qui finit sans valeur, l'œuvre reste un actif au bilan qui conserve sa valeur marchande.
                                </p>
                            </div>
                        </FadeInRight>

                        <FadeInRight delay={100}>
                            <div className="bg-[#1a1a1a]/90 backdrop-blur-md p-10 rounded-xl border border-white/10 shadow-2xl hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/20 transition-all duration-300 cursor-default group">
                                <h3 className="font-cinzel text-3xl text-white mb-6 group-hover:text-[#d4af37] transition-colors">Ce que nous offrons</h3>
                                <ul className="space-y-4 text-neutral-400 font-lato">
                                    <li className="flex gap-3"><span className="text-[#d4af37]">♦</span> Sélection soignée d’œuvres originales canadiennes (peintures, estampes, sculptures, etc.)</li>
                                    <li className="flex gap-3"><span className="text-[#d4af37]">♦</span> Documentation complète pour chaque achat : facture, biographie de l’artiste, preuve d’originalité</li>
                                    <li className="flex gap-3"><span className="text-[#d4af37]">♦</span> Accompagnement bilingue sur le processus DPA et les pièces à fournir</li>
                                    <li className="flex gap-3"><span className="text-[#d4af37]">♦</span> Conseil personnalisé pour choisir des œuvres adaptées à vos espaces et à vos objectifs financiers</li>
                                </ul>
                            </div>
                        </FadeInRight>

                        <FadeInRight delay={100}>
                            <div className="bg-[#1a1a1a]/90 backdrop-blur-md p-10 rounded-xl border border-white/10 shadow-2xl hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/20 transition-all duration-300 cursor-default group">
                                <h3 className="font-cinzel text-3xl text-white mb-6 group-hover:text-[#d4af37] transition-colors">Critères d’admissibilité</h3>
                                <p className="text-sm text-neutral-500 mb-4 uppercase tracking-wider">Pour profiter de la déduction DPA, votre achat doit respecter ces critères :</p>
                                <ul className="space-y-3 text-neutral-400 font-lato">
                                    <li className="flex gap-3"><span className="text-emerald-500">✓</span> L’œuvre est originale (pas une reproduction ni une impression en série)</li>
                                    <li className="flex gap-3"><span className="text-emerald-500">✓</span> Créée par un artiste canadien (citoyen ou résident permanent)</li>
                                    <li className="flex gap-3"><span className="text-emerald-500">✓</span> Il s’agit d’une peinture, estampe, gravure, dessin, sculpture ou œuvre similaire</li>
                                    <li className="flex gap-3"><span className="text-emerald-500">✓</span> Prix d’achat d’au moins 200 $</li>
                                    <li className="flex gap-3"><span className="text-emerald-500">✓</span> L’œuvre sera exposée dans votre lieu d’affaires (pas entreposée ni destinée à la revente immédiate) (bien qu'il soit possible de les revendre plus tard)</li>
                                </ul>
                            </div>
                        </FadeInRight>

                        <FadeInRight delay={100}>
                            <div className="bg-[#1a1a1a]/90 backdrop-blur-md p-10 rounded-xl border border-white/10 shadow-2xl hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/20 transition-all duration-300 cursor-default group">
                                <h3 className="font-cinzel text-3xl text-white mb-6 group-hover:text-[#d4af37] transition-colors">Documents à conserver</h3>
                                <ul className="space-y-4 text-neutral-400 font-lato">
                                    <li className="border-b border-white/5 pb-2">
                                        <strong className="text-white block mb-1">Facture</strong>
                                        indiquant le nom de l’artiste, sa nationalité et la mention d’originalité
                                    </li>
                                    <li className="border-b border-white/5 pb-2">
                                        <strong className="text-white block mb-1">Preuve de paiement</strong>
                                        et de propriété
                                    </li>
                                    <li className="pb-2">
                                        <strong className="text-white block mb-1">Biographie ou CV de l’artiste</strong>
                                        (nous le fournissons pour chaque œuvre)
                                    </li>
                                </ul>
                            </div>
                        </FadeInRight>

                        <FadeInRight delay={100}>
                            <div className="bg-[#1a1a1a]/90 backdrop-blur-md p-10 rounded-xl border border-white/10 shadow-2xl mb-24 hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/20 transition-all duration-300 cursor-default group">
                                <h3 className="font-cinzel text-3xl text-white mb-4 group-hover:text-[#d4af37] transition-colors">Combien pouvez-vous amortir ?</h3>
                                <p className="text-neutral-400 font-lato mb-6">
                                    Les œuvres d’art originales canadiennes sont admissibles à un taux de DPA de <strong className="text-white">20 %</strong>, selon la méthode du solde dégressif :
                                </p>
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-4 rounded border-l-2 border-[#d4af37]">
                                        <span className="text-white font-bold block">Première année</span>
                                        <span className="text-sm text-neutral-400">10 % du prix d’achat (règle de la demi-année)</span>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded border-l-2 border-[#d4af37]">
                                        <span className="text-white font-bold block">Années suivantes</span>
                                        <span className="text-sm text-neutral-400">20 % du solde restant chaque année</span>
                                    </div>
                                </div>
                                <p className="text-xs text-neutral-500 mt-6 italic">
                                    Vous continuez à réclamer la déduction jusqu’à ce que l’œuvre soit entièrement amortie.
                                </p>
                            </div>
                        </FadeInRight>

                    </div>
                </div>
            </section>

            {/* SECTION 3: FINANCING (STACKED LAYOUT) */}
            <section id="financing-section" className="relative min-h-screen flex flex-col items-center bg-fixed bg-center bg-cover py-24" 
                style={{ backgroundImage: `url("/media/Financement%20Artistique/kamy%20inside.jpg")` }}
            >
                <div className="absolute inset-0 bg-black/70" />
                
                {/* 1. Header Text (Top) */}
                <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center mb-16">
                    <h2 className="font-cinzel text-4xl md:text-6xl mb-8 leading-tight drop-shadow-lg text-white">
                        L'accessibilité avant tout
                    </h2>
                    <div className="w-24 h-1 bg-[#d4af37] mb-8 mx-auto" />
                    <p className="font-lato text-lg md:text-xl text-neutral-200 leading-relaxed mb-6 drop-shadow-md max-w-3xl mx-auto">
                        Il existe à première vue un conflit entre le fait qu'un artiste doit être payé à sa juste valeur et la philosophie que l'Art n'appartient pas qu'à l'élite économique.
                    </p>
                    <p className="font-lato text-lg md:text-xl text-neutral-200 leading-relaxed drop-shadow-md max-w-3xl mx-auto">
                        <strong className="text-[#d4af37]">Notre solution ?</strong> Un plan de financement budgetable sur plusieurs mois avec notre partenaire Credee.
                    </p>
                </div>

                {/* 2. Pricing Cards (Middle - Row) */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 mb-16">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {/* Card 1: Comptant */}
                        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-[20px] shadow-2xl flex flex-col justify-between h-full transform hover:scale-105 transition-transform duration-300">
                             <div>
                                 <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Paiement Comptant</div>
                                 <div className="text-4xl font-cinzel text-white">${financingPrice.toLocaleString()}</div>
                             </div>
                             <div className="text-[10px] text-neutral-300 mt-6 pt-4 border-t border-white/10">Prix régulier</div>
                        </div>

                        {/* Card 2: 96 Mois (Populaire) */}
                        <div className="bg-[#d4af37]/20 backdrop-blur-lg border border-[#d4af37]/50 p-8 rounded-[20px] shadow-2xl flex flex-col justify-between h-full transform hover:scale-110 hover:z-20 transition-all duration-300 relative overflow-hidden ring-1 ring-[#d4af37]/30">
                             <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[9px] font-bold px-3 py-1 uppercase rounded-bl">Populaire</div>
                             <div>
                                 <div className="text-[10px] font-bold text-yellow-100 uppercase tracking-widest mb-4">Plan 96 mois</div>
                                 <div className="flex items-end gap-1">
                                    <span className="text-5xl font-cinzel text-white text-shadow-md">${financingPrice > 0 ? Math.round((financingPrice * 2.53) / 96) : 0}</span>
                                    <span className="text-[10px] text-neutral-300 mb-2">/ Mois</span>
                                 </div>
                             </div>
                             <div className="text-[10px] text-yellow-100/80 mt-6 pt-4 border-t border-[#d4af37]/30">L'option la plus accessible</div>
                        </div>

                         {/* Card 3: 40 Mois */}
                         <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-[20px] shadow-2xl flex flex-col justify-between h-full transform hover:scale-105 transition-transform duration-300">
                             <div>
                                 <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Plan 40 mois</div>
                                 <div className="flex items-end gap-1">
                                    <span className="text-4xl font-cinzel text-white">${financingPrice > 0 ? Math.round((financingPrice * 1.31) / 40) : 0}</span>
                                    <span className="text-[10px] text-neutral-300 mb-1.5">/ Mois</span>
                                 </div>
                             </div>
                             <div className="text-[10px] text-neutral-300 mt-6 pt-4 border-t border-white/10">Équilibre parfait</div>
                        </div>
                    </div>
                </div>

                {/* 3. Estimator Input (Bottom - Centered to match width) */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
                    <div className="bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-cinzel text-lg text-[#d4af37]">Estimateur de Versements</h3>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Partenaire Credee</span>
                         </div>
                         
                         <div className="relative group">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block group-focus-within:text-white transition-colors">
                                Prix de l'œuvre ($CAD)
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={financingPrice}
                                    onChange={(e) => setFinancingPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-white/5 border border-white/20 rounded-lg p-3 pl-4 text-white font-mono text-xl focus:border-[#d4af37] focus:bg-white/10 outline-none transition-all text-center"
                                />
                            </div>
                         </div>
                         
                         <p className="text-[10px] text-neutral-500 mt-6 leading-relaxed text-center">
                            Entrez le montant de l'œuvre ci-dessus pour mettre à jour les cartes. <br/>Aucun impact sur votre cote de crédit.
                         </p>
                    </div>
                </div>
            </section>

             {/* SECTION 4: SELLING (PARALLAX) */}
             <section className="relative min-h-[80vh] flex items-center justify-center bg-fixed bg-center bg-cover" 
                style={{ backgroundImage: `url("/media/Financement%20Artistique/top%20down.jpg")` }}
            >
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 text-center px-6 max-w-3xl mx-auto bg-black/40 backdrop-blur-md p-12 rounded-3xl border border-white/10 shadow-2xl">
                    <h2 className="font-cinzel text-5xl md:text-7xl text-white mb-2 leading-tight">
                        Vendre
                    </h2>
                    <h3 className="font-cinzel text-2xl md:text-4xl text-neutral-300 mb-8 uppercase tracking-widest">
                        vos oeuvres
                    </h3>
                    <div className="w-16 h-1 bg-white mx-auto mb-8" />
                    <p className="font-lato text-lg md:text-xl text-neutral-200 leading-relaxed">
                        En ligne ou directement au Salon, nous représentons les Artistes et les mettons en contact avec des acheteurs potentiels avec plusieurs formules qui s'assurent que l'Artiste soit bien rémunéré et que l'acheteur ait la bonne documentation.
                    </p>
                </div>
            </section>

            {/* SECTION 5: SIMULATOR (Inline - Vertical Layout) */}
            <section className="max-w-5xl mx-auto px-6 pt-24 pb-24">
                 <div className="bg-[#1a1a1a] rounded-[30px] overflow-hidden border border-white/5 shadow-2xl flex flex-col relative">
                    
                    {/* Header/Inputs */}
                    <div className="p-8 md:p-10 w-full bg-neutral-900/80 backdrop-blur-sm border-b border-white/5 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex-1">
                                <h3 className="font-cinzel text-2xl text-white mb-2">Simulateur d'Économies</h3>
                                <p className="text-xs text-neutral-500 max-w-xl">
                                    Simulez les déductions fiscales (DPA Catégorie 8 - 20%) et l'économie d'impôt nette.<br/>
                                    <span className="text-[#d4af37]">Note :</span> L'économie réelle est souvent supérieure grâce au retour de taxes (CTI/RTI) de ~15% pour les inscrits.
                                </p>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                        Montant ($)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={price} 
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        className="w-full bg-black/60 border border-white/20 rounded-lg p-3 text-white text-lg font-mono focus:border-[#d4af37] outline-none transition-colors"
                                    />
                                </div>
                                <div className="w-full md:w-48">
                                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                        Taux d'imposition de votre compagnie (%)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={taxRateInput} 
                                        onChange={(e) => setTaxRateInput(Number(e.target.value))}
                                        className="w-full bg-black/60 border border-white/20 rounded-lg p-3 text-white text-lg font-mono focus:border-[#d4af37] outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="p-8 md:p-10 w-full bg-[#141414] relative z-10">
                         {/* Summary Cards - Updated Logic */}
                         <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/5">
                             <h4 className="font-cinzel text-lg text-[#d4af37] mb-4">
                                Résultat pour un taux d'imposition de {taxRateInput}%
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <div>
                                     <span className="text-[10px] text-neutral-500 uppercase block mb-1">Prix de l'œuvre</span>
                                     <span className="text-xl font-mono text-white">${Math.round(price).toLocaleString()}</span>
                                 </div>
                                 <div>
                                     <span className="text-[10px] text-neutral-500 uppercase block mb-1">Économie d'impôt totale</span>
                                     <span className="text-xl font-mono text-emerald-400">${Math.round(totalTaxSaved).toLocaleString()}</span>
                                 </div>
                                 <div>
                                     <span className="text-[10px] text-neutral-500 uppercase block mb-1">Coût réel après impôt</span>
                                     <span className="text-xl font-mono text-white">${Math.round(netCost).toLocaleString()}</span>
                                 </div>
                             </div>
                         </div>

                         {/* Detailed Schedule */}
                         <div className="overflow-x-auto custom-scrollbar">
                             <table className="w-full text-left border-collapse">
                                 <thead className="sticky top-0 bg-[#141414] z-10">
                                     <tr className="text-[10px] text-neutral-500 uppercase tracking-wider border-b border-white/10">
                                         <th className="pb-3 pl-2">Année</th>
                                         <th className="pb-3">Solde Début</th>
                                         <th className="pb-3">DPA (Déduction)</th>
                                         <th className="pb-3 text-emerald-500">Économie Impôt</th>
                                         <th className="pb-3 text-right pr-2">Solde Fin</th>
                                     </tr>
                                 </thead>
                                 <tbody className="text-xs font-mono text-neutral-300">
                                     {schedule.map((row) => (
                                         <tr key={row.year} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                             <td className="py-3 pl-2 text-white">An {row.year}</td>
                                             <td className="py-3 text-neutral-500">${Math.round(row.start).toLocaleString()}</td>
                                             <td className="py-3 text-white font-bold">${Math.round(row.deduction).toLocaleString()}</td>
                                             <td className="py-3 text-emerald-400">+${Math.round(row.saved).toLocaleString()}</td>
                                             <td className="py-3 text-right pr-2 text-neutral-500">${Math.round(row.end).toLocaleString()}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                         <p className="text-[10px] text-neutral-600 mt-6 italic text-center leading-relaxed">
                            * Calcul basé sur : Taux DPA de 20% (Catégorie 8), Règle de la demi-année (10% an 1), Taux d'impôt corporatif de {taxRateInput}%.<br/>
                            Le tableau affiche un maximum de 10 ans.
                         </p>
                    </div>
                 </div>
            </section>

        </div>
    );
  };

  const ArtistPortal: React.FC<{ view: PortalView, setView: (v: PortalView) => void }> = ({ view, setView }) => {
     return (
        <div className="min-h-screen pt-24 px-6 pb-24 max-w-7xl mx-auto">
             <div className="text-center mb-16">
                <h2 className="font-cinzel text-4xl text-white tracking-widest mb-4">{language === 'EN' ? "The Creator's Hub" : "Le Hub des Créateurs"}</h2>
             </div>
             
             <div className="flex justify-center gap-4 mb-12 border-b border-white/10 pb-1">
                 <button 
                   onClick={() => setView('BLOG')}
                   className={`px-6 py-2 font-cinzel text-sm uppercase tracking-widest transition-all relative ${view === 'BLOG' ? 'text-white' : 'text-neutral-500 hover:text-white'}`}
                 >
                   {language === 'EN' ? "The Grimoire" : "Le Grimoire"}
                   {view === 'BLOG' && <div className="absolute bottom-[-5px] left-0 w-full h-px bg-[#d4af37]" />}
                 </button>
                 <button 
                   onClick={() => setView('REGISTRY')}
                   className={`px-6 py-2 font-cinzel text-sm uppercase tracking-widest transition-all relative ${view === 'REGISTRY' ? 'text-white' : 'text-neutral-500 hover:text-white'}`}
                 >
                   {language === 'EN' ? "Join Registry" : "Rejoindre"}
                   {view === 'REGISTRY' && <div className="absolute bottom-[-5px] left-0 w-full h-px bg-[#d4af37]" />}
                 </button>
             </div>
             
             {view === 'REGISTRY' && (
                 <div className="max-w-2xl mx-auto bg-[#1a1a1a] p-12 rounded-2xl border border-white/10 text-center shadow-2xl">
                     <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-neutral-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                     </div>
                     <h3 className="font-cinzel text-2xl text-white mb-4">{language === 'EN' ? "Apply for Representation" : "Postuler pour Représentation"}</h3>
                     <p className="text-neutral-400 font-lato mb-8 leading-relaxed">
                         {language === 'EN' 
                           ? "The Salon des Inconnus is always looking for new voices. If your work speaks the language of the arcane, the bold, or the visionary, we want to see it."
                           : "Le Salon des Inconnus est toujours à la recherche de nouvelles voix. Si votre travail parle le langage de l'arcanes, de l'audace ou du visionnaire, nous voulons le voir."}
                     </p>
                     <button className="px-8 py-3 bg-white text-black font-cinzel font-bold text-sm uppercase tracking-widest rounded hover:bg-neutral-200 transition-colors shadow-lg">
                         {language === 'EN' ? "Submit Portfolio" : "Soumettre Portfolio"}
                     </button>
                 </div>
             )}
  
             {view === 'BLOG' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {[1, 2, 3].map(i => (
                         <div key={i} className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all cursor-pointer group flex flex-col h-full">
                             <div className="aspect-video bg-neutral-900 relative">
                                 <div className="absolute inset-0 flex items-center justify-center text-neutral-700 font-cinzel">
                                     {language === 'EN' ? "Image Placeholder" : "Image"}
                                 </div>
                             </div>
                             <div className="p-6 flex flex-col flex-1">
                                 <div className="flex justify-between items-center mb-4">
                                     <span className="text-[10px] font-mono text-[#d4af37] uppercase tracking-wider">Alchemy</span>
                                     <span className="text-[10px] text-neutral-600">Oct 24, 2025</span>
                                 </div>
                                 <h4 className="font-cinzel text-xl text-white mb-3 group-hover:text-[#d4af37] transition-colors">
                                     {language === 'EN' ? "The Art of Invisible Sculpting" : "L'Art de la Sculpture Invisible"}
                                 </h4>
                                 <p className="text-sm text-neutral-500 line-clamp-3 mb-6 flex-1">
                                     {language === 'EN' 
                                      ? "Exploring the negative space in modern sculpture and how void defines form." 
                                      : "Exploration de l'espace négatif dans la sculpture moderne et comment le vide définit la forme."}
                                 </p>
                                 <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest group-hover:text-white transition-colors">
                                     {language === 'EN' ? "Read Article →" : "Lire l'Article →"}
                                 </span>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
          </div>
     );
  };

  // --- RENDER LOGIC ---

  return (
    <div className="min-h-screen bg-[#141414] text-neutral-100 w-full absolute inset-0 z-50 animate-fadeIn scroll-smooth font-sans overflow-hidden">
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/black-linen.png")` }}></div>

      {/* Site Map Modal */}
      {isSiteMapOpen && (
          <SiteMap 
            activeNodeId={getCurrentNodeId()} 
            onClose={() => setIsSiteMapOpen(false)} 
            onNodeSelect={(id) => handleNodeClick(id)} 
          />
      )}

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#141414]/90 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div 
             className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
             onClick={() => onNavigate('DESK')}
          >
             <img src="https://i.imgur.com/B1YfPqn.png" alt="Logo" className="w-12 h-auto drop-shadow-lg" />
             <span className="font-cinzel font-bold text-lg tracking-widest hidden md:block text-indigo-100">Le Salon des Inconnus</span>
          </div>
          <div className="flex gap-4 items-center">
            {/* Site Map Toggle */}
            <button
                onClick={() => setIsSiteMapOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                title="Site Structure"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.322.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
            </button>

            {/* Admin Toggle */}
            <button 
                onClick={toggleAdmin}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isAdminMode ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-transparent border-white/10 text-neutral-500 hover:text-white'}`}
                title="Admin Mode"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
            </button>

            {(rootView !== 'HUB' || buyerView !== 'MENU') && (
                <button 
                  onClick={() => {
                      if (rootView === 'ARTIST') {
                          setRootView('HUB');
                      } else if (buyerView !== 'MENU') {
                          setBuyerView('MENU');
                      } else {
                          setRootView('HUB');
                      }
                  }}
                  className="px-4 py-2 rounded border border-white/10 hover:bg-white/5 text-xs uppercase tracking-widest text-neutral-300"
                >
                   {language === 'EN' ? "Up One Level" : "Retour"}
                </button>
            )}
            <button 
                onClick={() => onNavigate('DESK')}
                className="px-5 py-2 rounded-full border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs uppercase tracking-widest text-neutral-300"
            >
                {language === 'EN' ? "Exit Arts" : "Quitter"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 h-full overflow-y-auto custom-scrollbar">
        {rootView === 'HUB' && <Hub />}
        
        {/*
          The "Le Créateur" / "I AM AN ARTIST" button sets rootView='ARTIST'.
          That used to render the placeholder <ArtistPortal /> with the
          "Le Hub des Créateurs" header — now it mounts the imported
          creator-studio (creator-studio-repo-v0.2 (3)). The standalone
          chrome (language toggle, music) lives at the salon app level, so
          we mount only the inner CreatorStudio shell here. When
          houseoftherisingarts.com migrates to the creator-studio
          experience directly, that app will mount this same component at /.
        */}
        {rootView === 'ARTIST' && <CreatorStudio language={language} />}

        {rootView === 'BUYER' && (
            <>
                {buyerView === 'MENU' && <BuyerMenu />}
                {buyerView === 'CATALOG' && <Catalog />}
                {buyerView === 'TAXES' && <FiscalityPage />}
                {buyerView === 'SUPPORT' && <PatronageSection />}
                {buyerView === 'PLATFORMS' && <SdiCafe language={language} />}
            </>
        )}
      </main>

      <style>{`
        .animate-fadeIn {
            animation: fadeInPage 0.8s ease-out forwards;
        }
        @keyframes fadeInPage {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .text-shadow-lg {
            text-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        
        /* 3D Flip Utilities */
        .perspective-1000 {
            perspective: 1000px;
        }
        .transform-style-3d {
            transform-style: preserve-3d;
        }
        .backface-hidden {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
            transform: rotateY(180deg);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }
      `}</style>
    </div>
  );
};
