
import React, { useState, useEffect, useRef } from 'react';
import { Accommodation } from '../types';
import { ACCOMMODATIONS } from '../constants';
import { OptimizedImage } from './OptimizedImage';
import { getOptimizedUrl } from '../utils/imageOptimizer';
import { SITE_URL, CONTACT_INFO, SEMANTIC_NEIGHBORS, UPCOMING_EVENTS, PAGE_META } from '../config/seo.config';

type VibeMode = 'CLASSIC' | 'HOSTEL' | 'SHIRE';

interface InnPageProps {
  onNavigate: (view: 'INN' | 'KITCHEN' | 'MASSOTHERAPY' | 'HOSTS' | 'GUIDE') => void;
  language: 'EN' | 'FR';
}

// --- SEO & STRUCTURED DATA ---
const getStructuredData = (language: 'EN' | 'FR') => {
  const meta = PAGE_META.INN[language];

  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Le Salon des Inconnus",
    "description": meta.description,
    "image": [
      "https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg",
      "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png"
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": CONTACT_INFO.address,
      "addressLocality": CONTACT_INFO.locality,
      "addressRegion": CONTACT_INFO.region,
      "postalCode": CONTACT_INFO.postalCode,
      "addressCountry": CONTACT_INFO.country
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": CONTACT_INFO.coords.lat,
      "longitude": CONTACT_INFO.coords.lng
    },
    "url": SITE_URL,
    "telephone": CONTACT_INFO.phone,
    "priceRange": "$$$",
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Access to Lac-Simon", "value": "true" },
      { "@type": "LocationFeatureSpecification", "name": "Event Venue (Lac à l'épaule)", "value": "true" },
      { "@type": "LocationFeatureSpecification", "name": "Piano Bar / Music", "value": "true" },
      ...SEMANTIC_NEIGHBORS.map(n => ({
          "@type": n.type,
          "name": n.name,
          "value": "true"
      }))
    ],
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": "Petite Nation"
    },
    "knowsAbout": UPCOMING_EVENTS.map(event => ({
        "@type": "Event",
        "name": event.name,
        "startDate": event.date,
        "endDate": event.endDate || event.date, 
        "location": {
            "@type": "Place",
            "name": event.location || "Outaouais",
            "address": {
                "@type": "PostalAddress",
                "addressRegion": "QC"
            }
        }
    }))
  };
};

// --- ICONS (SVG HELPER) ---
const Icons = {
    Key: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>,
    Swipe: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white/90"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>,
    Card: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
};

// --- UTILITY: ANIMATION WRAPPER (STABILIZED) ---
const RevealOnScroll: React.FC<{ children: React.ReactNode; className?: string; delay?: number; animation?: 'fadeUp' | 'fadeIn' | 'slideRight' | 'slideLeft' }> = ({ children, className = "", delay = 0, animation = 'fadeUp' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible) return; 

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // LATCH FIX
                }
            },
            { threshold: 0.1 } 
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [isVisible]);

    const getAnimationClass = () => {
        switch(animation) {
            case 'slideRight': return isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10';
            case 'slideLeft': return isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10';
            case 'fadeIn': return isVisible ? 'opacity-100' : 'opacity-0';
            case 'fadeUp': default: return isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10';
        }
    };

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-1000 ease-out ${getAnimationClass()} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// --- LAZY SECTION WRAPPER ---
const LazySection: React.FC<{ children: React.ReactNode; placeholderHeight: string; className?: string }> = ({ children, placeholderHeight, className = "" }) => {
    const [shouldRender, setShouldRender] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (shouldRender) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldRender(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '400px' }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [shouldRender]);

    return (
        <div 
            ref={ref} 
            className={className}
            style={{ minHeight: placeholderHeight }}
        >
            {shouldRender ? children : null}
        </div>
    );
};

// --- STICKY WRAPPER (GOLD STANDARD) ---
// No containment, no overflow hidden, just pure sticky positioning
interface StickySectionProps {
    children: React.ReactNode;
    vibe: VibeMode;
    zIndex: number;
    className?: string;
    desktopHeight?: string;
    mobileHeight?: string;
}

const StickySection: React.FC<StickySectionProps> = ({ children, vibe, zIndex, className = "", desktopHeight = "800px", mobileHeight = "auto" }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [top, setTop] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const updateTop = () => {
            if (ref.current) {
                const height = ref.current.offsetHeight;
                const windowHeight = window.innerHeight;
                setTop(height > windowHeight ? windowHeight - height : 0);
            }
        };

        updateTop();
        window.addEventListener('resize', updateTop);
        return () => {
            window.removeEventListener('resize', updateTop);
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    let bgClass = 'bg-[#050505] border-[#d4af37]/20'; 
    if (vibe === 'HOSTEL') bgClass = 'bg-[#18181b] border-[#c5a059]/30'; 
    if (vibe === 'SHIRE') bgClass = 'bg-[#161915] border-[#dcb055]/20'; 

    return (
        <section 
            ref={ref}
            className={`relative w-full border-t transition-colors duration-1000 ${bgClass} ${className}`}
            style={{ 
                position: 'sticky', 
                top: `${top}px`, 
                zIndex: zIndex,
                minHeight: isMobile ? mobileHeight : desktopHeight
                // CRITICAL: No 'overflow', No 'contain', No 'transform' on the sticky container
            }}
        >
            {children}
        </section>
    );
};

// --- VISUAL LAYERS ---

const SmokeOverlay = React.memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 transform-gpu">
    <div 
        className="absolute inset-0 opacity-20 animate-smoke-1 bg-repeat-x bg-contain pointer-events-none" 
        style={{ 
            bottom: '-100px',
            backgroundImage: `url('${getOptimizedUrl("https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog1.png", 1000)}')` 
        }}
    ></div>
    <div 
        className="absolute inset-0 opacity-20 animate-smoke-2 bg-repeat-x bg-contain pointer-events-none" 
        style={{ 
            bottom: '-100px', 
            animationDelay: '-5s',
            backgroundImage: `url('${getOptimizedUrl("https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog2.png", 1000)}')`
        }}
    ></div>
    <style>{`
      @keyframes smoke {
        0% { background-position: 0 0; }
        100% { background-position: 1000px 0; }
      }
      .animate-smoke-1 { animation: smoke 60s linear infinite; }
      .animate-smoke-2 { animation: smoke 40s linear infinite reverse; }
    `}</style>
  </div>
));

const GrainTexture = React.memo(({ vibe }: { vibe: VibeMode }) => {
    let opacity = 'opacity-[0.05]';
    let bg = `url("${getOptimizedUrl("https://www.transparenttextures.com/patterns/stardust.png", 1000)}")`;
    if (vibe === 'SHIRE') {
        opacity = 'opacity-[0.08]';
        bg = `url("${getOptimizedUrl("https://www.transparenttextures.com/patterns/handmade-paper.png", 1000)}")`;
    }
    return (
        <div 
            className={`fixed inset-0 pointer-events-none z-[1] transition-opacity duration-1000 ${opacity} transform-gpu`} 
            style={{ backgroundImage: bg }}
        ></div>
    );
});

const VictorianPattern = React.memo(({ vibe }: { vibe: VibeMode }) => (
    <div 
         className={`fixed inset-0 pointer-events-none z-[1] transition-opacity duration-1000 ${vibe === 'SHIRE' ? 'opacity-0' : 'opacity-[0.03]'}`}
         style={{ 
             backgroundImage: `url("${getOptimizedUrl("https://www.transparenttextures.com/patterns/paisley.png", 1000)}")`, 
             backgroundSize: '400px' 
         }}>
    </div>
));

const SectionDivider = React.memo(({ vibe }: { vibe: VibeMode }) => {
    let color = '[#d4af37]';
    if (vibe === 'HOSTEL') color = '[#c5a059]';
    if (vibe === 'SHIRE') color = '[#dcb055]';
    return (
        <RevealOnScroll animation="fadeIn" className="flex items-center justify-center gap-4 my-16 md:my-24 opacity-60">
            <div className={`h-px w-16 md:w-32 bg-gradient-to-r from-transparent via-${color} to-transparent`}></div>
            <div className={`w-3 h-3 rotate-45 border ${vibe === 'HOSTEL' ? 'border-[#c5a059] bg-[#1e1e24]' : vibe === 'SHIRE' ? 'border-[#dcb055] bg-[#222620] rounded-full' : 'border-[#d4af37] bg-[#0a0a0a]'}`}></div>
            <div className={`h-px w-16 md:w-32 bg-gradient-to-r from-transparent via-${color} to-transparent`}></div>
        </RevealOnScroll>
    );
});

const getRoomColor = (id: string, vibe: VibeMode) => {
  if (vibe === 'HOSTEL') {
      return { border: 'border-[#c5a059]', text: 'text-[#f3e5ab]', bg: 'bg-[#1e1e24]', accent: '#c5a059' };
  } else if (vibe === 'SHIRE') {
      return { border: 'border-[#dcb055]', text: 'text-[#faeecd]', bg: 'bg-[#20241e]', accent: '#dcb055' };
  } else {
      return { border: 'border-[#d4af37]', text: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', accent: '#d4af37' };
  }
};

const VictorianCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; borderColorClass?: string; vibe: VibeMode }> = ({ children, className = "", onClick, borderColorClass = "border-[#3a3a3a]", vibe }) => {
    if (vibe === 'HOSTEL') {
        return (
            <div onClick={onClick} className={`relative flex flex-col items-center p-2 group cursor-pointer transition-transform duration-300 hover:-translate-y-2 ${className}`}>
               {children}
            </div>
        );
    }
    if (vibe === 'SHIRE') {
        return (
             <div 
                onClick={onClick}
                className={`relative bg-[#20241e] border border-[#dcb055]/30 rounded-[40px] p-6 transition-all duration-500 group hover:border-[#dcb055] hover:bg-[#282d26] hover:-translate-y-2 shadow-xl hover:shadow-[0_20px_40px_rgba(220,176,85,0.1)] ${className}`}
            >
                <div className="absolute inset-2 border border-[#dcb055]/10 rounded-[32px] pointer-events-none"></div>
                {children}
            </div>
        );
    }
    return (
        <div 
            onClick={onClick}
            className={`relative bg-[#0f0f0f] border ${borderColorClass} p-1 transition-all duration-500 group hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] ${className}`}
        >
            <div className="h-full w-full border border-white/5 bg-[#121212] relative overflow-hidden group-hover:bg-[#161616] transition-colors">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-white/50 transition-colors z-20"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-white/50 transition-colors z-20"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-white/50 transition-colors z-20"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-white/50 transition-colors z-20"></div>
                {children}
            </div>
        </div>
    );
};

// --- SECTIONS ---

const InnHero: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode; onCycleVibe: () => void }> = ({ language, vibe, onCycleVibe }) => {
  const getVibeLabel = () => {
      if (vibe === 'CLASSIC') return language === 'EN' ? "Classic" : "Classique";
      if (vibe === 'HOSTEL') return language === 'EN' ? "Hostel" : "Auberge";
      return language === 'EN' ? "Shire" : "Comté";
  };

  return (
    <div className={`relative h-[70vh] min-h-[500px] md:min-h-[600px] flex items-center justify-center overflow-hidden border-b transition-colors duration-1000 
        ${vibe === 'HOSTEL' ? 'border-[#c5a059]/30' : 
          vibe === 'SHIRE' ? 'border-[#dcb055]/40' : 
          'border-[#d4af37]/20'}`}>
      <div className={`absolute inset-0 z-10 bg-black transition-opacity duration-1000 ${vibe === 'SHIRE' ? 'opacity-20' : 'opacity-30'}`} />
      <div className={`absolute inset-0 bg-gradient-to-b z-10 transition-colors duration-1000 ${vibe === 'HOSTEL' ? 'from-[#18181b]/90 via-transparent to-[#18181b]' : vibe === 'SHIRE' ? 'from-[#3a3e2a]/50 via-transparent to-[#161915]' : 'from-black/60 via-transparent to-[#0a0a0a]'}`} />
      
      <div className="absolute inset-0 w-full h-full">
          <OptimizedImage
            src="https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg"
            alt="The Inn at Salon des Inconnus"
            className="w-full h-full"
            imageClassName="w-full h-full object-cover transition-all duration-1000 animate-slowZoom"
            priority={true} 
            variant="HERO"
          />
          <style>{`
            @keyframes slowZoom {
                0% { transform: scale(1); }
                100% { transform: scale(1.1); }
            }
            .animate-slowZoom {
                animation: slowZoom 30s ease-in-out infinite alternate;
            }
          `}</style>
      </div>
      <SmokeOverlay />
      <div className="absolute top-24 right-6 z-30 flex flex-col items-end gap-2 animate-fadeIn" style={{ animationDelay: '1s' }}>
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1 hidden md:block">{language === 'EN' ? "Atmosphere" : "Ambiance"}</span>
          <button onClick={onCycleVibe} className={`hidden md:flex items-center gap-3 px-4 py-2 rounded-full border bg-black/80 transition-all duration-500 hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl ${vibe === 'CLASSIC' ? 'border-[#d4af37] text-[#d4af37]' : vibe === 'HOSTEL' ? 'border-[#c5a059] text-[#f3e5ab]' : 'border-[#dcb055] text-[#dcb055]'}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${vibe === 'CLASSIC' ? 'bg-[#d4af37]' : vibe === 'HOSTEL' ? 'bg-[#c5a059]' : 'bg-[#dcb055]'}`}></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${vibe === 'HOSTEL' ? 'font-josefin' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{getVibeLabel()}</span>
          </button>
      </div>
      <div className="relative z-20 text-center px-4 md:px-6 max-w-5xl mx-auto mt-12">
          <div className="inline-block mb-6 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className={`border-y py-1 px-8 bg-black/80 transition-colors duration-500 ${vibe === 'HOSTEL' ? 'border-[#c5a059]' : vibe === 'SHIRE' ? 'border-[#dcb055] rounded-full' : 'border-[#d4af37]'}`}>
                  <span className={`text-xs font-bold uppercase tracking-[0.5em] transition-colors duration-500 ${vibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin' : vibe === 'SHIRE' ? 'text-[#dcb055] font-medieval tracking-[0.3em]' : 'text-[#d4af37] font-cinzel'}`}>
                      {language === 'EN' ? "Est. 1898" : "Est. 1898"}
                  </span>
              </div>
          </div>
          <h1 className={`text-5xl md:text-7xl lg:text-9xl text-white mb-8 tracking-widest drop-shadow-2xl animate-fadeIn transition-all duration-500 ${vibe === 'HOSTEL' ? 'font-prata text-[#f3e5ab]' : vibe === 'SHIRE' ? 'font-medieval text-[#dcb055] tracking-normal drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]' : 'font-cinzel text-shadow-gold'}`} style={{ animationDelay: '0.4s' }}>
              {language === 'EN' ? "THE INN" : "L'AUBERGE"}
          </h1>
          <p className={`text-sm md:text-xl text-neutral-200 font-medium max-w-2xl mx-auto leading-relaxed drop-shadow-md animate-fadeIn tracking-wide bg-black/60 p-4 rounded-xl ${vibe === 'HOSTEL' ? 'font-josefin uppercase tracking-[0.2em]' : vibe === 'SHIRE' ? 'font-medieval text-[#faeecd] tracking-wider' : 'font-lato'}`} style={{ animationDelay: '0.6s' }}>
              {language === 'EN' ? "A sanctuary for travelers, artists, and dreamers. Step into the history of Maison Favier." : "Un sanctuaire pour voyageurs, artistes et rêveurs. Entrez dans l'histoire de la Maison Favier."}
          </p>
          <div className="mt-6 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <a href="tel:5144183450" className={`text-lg font-bold tracking-widest hover:opacity-80 transition-opacity ${vibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin' : vibe === 'SHIRE' ? 'text-[#dcb055] font-medieval' : 'text-[#d4af37] font-cinzel'}`}>
                  514 418 3450
              </a>
          </div>
      </div>
      <style>{`.text-shadow-gold { text-shadow: 0 0 20px rgba(212,175,55,0.3); }`}</style>
    </div>
  );
};

const TrustedPlatforms: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode }> = ({ language, vibe }) => {
    let containerClass = 'bg-[#0f0f0f] border-[#333]';
    let gradientFrom = 'from-[#0f0f0f]';
    let badgeClass = 'border-[#d4af37] bg-[#d4af37] text-[#d4af37]';
    let fontClass = 'font-cinzel';
    
    if (vibe === 'HOSTEL') { 
        containerClass = 'bg-[#18181b] border-[#333]'; 
        gradientFrom = 'from-[#18181b]';
        badgeClass = 'border-[#c5a059] bg-[#c5a059] text-[#f3e5ab]'; 
        fontClass = 'font-josefin'; 
    }
    else if (vibe === 'SHIRE') { 
        containerClass = 'bg-[#161915] border-[#dcb055]/30'; 
        gradientFrom = 'from-[#161915]';
        badgeClass = 'border-[#dcb055] bg-[#dcb055] text-[#161915]'; 
        fontClass = 'font-medieval'; 
    }

    const items = [
        {
            id: 'badge',
            content: (
                <div className={`flex items-center gap-3 px-6 py-2 rounded-full border bg-opacity-10 backdrop-blur-sm shadow-lg ${badgeClass}`}>
                    <span className="text-lg">★</span>
                    <span className={`font-bold text-xs tracking-widest uppercase text-white ${fontClass}`}>
                        {language === 'EN' ? "More than 10k Happy Clients" : "Plus de 10k Clients Heureux"}
                    </span>
                </div>
            )
        },
        { id: 'google', content: <span className={`font-bold text-sm text-white tracking-[0.2em] ${fontClass}`}>Google Hotels</span> },
        { 
            id: 'airbnb', 
            content: (
                <span className={`font-bold text-sm text-[#FF5A5F] tracking-[0.2em] flex items-center gap-2 ${fontClass}`}>
                    Airbnb 
                    <div className="flex gap-1">
                        <span className="text-[8px] border border-[#FF5A5F] px-1 py-0.5 rounded-sm tracking-normal font-sans text-white bg-[#FF5A5F]/20">SUPERHOST</span>
                        <span className="text-[8px] border border-[#FF5A5F] px-1 py-0.5 rounded-sm tracking-normal font-sans text-white bg-[#FF5A5F]/20">11 YEARS</span>
                    </div>
                </span> 
            )
        },
        { id: 'vrbo', content: <span className={`font-bold text-sm text-[#2a6ebe] tracking-[0.2em] ${fontClass}`}>VRBO</span> },
        { id: 'expedia', content: <span className={`font-bold text-sm text-[#ffc107] tracking-[0.2em] ${fontClass}`}>Expedia</span> },
        { id: 'booking', content: <span className={`font-bold text-sm text-[#003580] tracking-[0.2em] ${fontClass}`}>Booking.com</span> }
    ];

    return (
        <div className={`w-full border-b py-6 relative z-20 transition-colors duration-700 overflow-hidden ${containerClass}`}>
            {/* Gradient Masks */}
            <div className={`absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r ${gradientFrom} to-transparent z-10 pointer-events-none`}></div>
            <div className={`absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l ${gradientFrom} to-transparent z-10 pointer-events-none`}></div>

            {/* Marquee Container - 4 Duplicates to ensure smooth infinite scroll on ultra-wide monitors */}
            <div className="flex w-max animate-scroll hover:[animation-play-state:paused]">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-16 px-8">
                        {items.map((item) => (
                            <div key={`${i}-${item.id}`}>{item.content}</div>
                        ))}
                    </div>
                ))}
            </div>
            
            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-25%); }
                }
                .animate-scroll {
                    animation: scroll 60s linear infinite;
                }
            `}</style>
        </div>
    );
};

const HistorySection: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode }> = ({ language, vibe }) => (
  <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 relative overflow-hidden md:overflow-visible">
    <div className="absolute top-10 left-0 w-full text-center pointer-events-none opacity-[0.03] flex justify-center">
        <span className={`text-[10vw] font-bold text-white whitespace-nowrap leading-none ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval text-[#dcb055]' : 'font-cinzel'}`}>MAISON FAVIER</span>
    </div>
    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 relative z-10">
        <div className="w-full md:w-1/2 relative group perspective-1000">
            <RevealOnScroll animation="slideRight">
                <div className={`relative h-[300px] md:h-[500px] border shadow-2xl rotate-1 group-hover:rotate-0 transition-all duration-700 ease-out overflow-hidden ${vibe === 'HOSTEL' ? 'bg-[#1e1e24] border-[#c5a059]/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-t-full' : vibe === 'SHIRE' ? 'bg-[#20241e] border-[#dcb055]/40 rounded-full rotate-0 p-8' : 'bg-[#121212] border-[#333]'}`}>
                    <div className={`absolute top-0 left-0 w-full h-full border border-white/5 pointer-events-none z-20 ${vibe === 'HOSTEL' ? 'rounded-t-full' : vibe === 'SHIRE' ? 'rounded-full' : ''}`}></div>
                    <OptimizedImage 
                        src="https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg" 
                        alt="Maison Favier History" 
                        className="w-full h-full"
                        imageClassName={`w-full h-full object-cover transition-all duration-1000 ${vibe === 'SHIRE' ? 'rounded-full' : 'rounded-none'}`}
                        variant="CARD"
                    />
                    {vibe === 'CLASSIC' && <div className={`absolute -top-3 -right-3 w-16 h-4 rotate-45 shadow-lg z-30 bg-[#d4af37]/80`}></div>}
                    <div className="absolute bottom-8 left-8 z-30 text-white drop-shadow-md">
                        <span className={`text-5xl block ${vibe === 'HOSTEL' ? 'font-prata text-[#f3e5ab]' : vibe === 'SHIRE' ? 'font-medieval text-[#dcb055]' : 'font-cinzel text-[#d4af37]'}`}>1898</span>
                        <span className="text-white/80 text-xs uppercase tracking-[0.3em] bg-black/60 px-2 py-1">Maison Favier</span>
                    </div>
                </div>
            </RevealOnScroll>
        </div>
        <div className="w-full md:w-1/2 space-y-8 text-center md:text-left">
            <RevealOnScroll animation="slideLeft" delay={200}>
                <div className={`md:border-l-2 md:pl-6 transition-colors ${vibe === 'HOSTEL' ? 'border-[#c5a059]' : vibe === 'SHIRE' ? 'border-[#dcb055]' : 'border-[#d4af37]'}`}>
                    <span className={`text-[10px] uppercase tracking-[0.4em] font-bold mb-2 block ${vibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin' : vibe === 'SHIRE' ? 'text-[#dcb055] font-medieval tracking-[0.2em]' : 'text-[#d4af37] font-cinzel'}`}>{language === 'EN' ? "The Origins" : "Les Origines"}</span>
                    <h2 className={`text-3xl md:text-5xl text-white leading-tight mb-8 md:mb-12 ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{language === 'EN' ? "Welcome to Salon des Inconnus" : "Bienvenue au Salon des Inconnus"}</h2>
                </div>
                <div className={`text-neutral-400 leading-relaxed space-y-6 text-lg font-light text-justify px-2 md:pr-4 ${vibe === 'HOSTEL' ? 'font-josefin tracking-wide' : vibe === 'SHIRE' ? 'font-medieval text-[#faeecd]/90 tracking-wide' : 'font-lato'}`}>
                    <p><span className={`float-left text-5xl mr-3 mt-[-10px] leading-none ${vibe === 'HOSTEL' ? 'text-[#c5a059] font-prata' : vibe === 'SHIRE' ? 'text-[#dcb055] font-medieval' : 'text-[#d4af37] font-cinzel'}`}>{language === 'EN' ? 'T' : 'C'}</span>{language === 'EN' ? "his place is both an Inn for travelers and a Center for Artists & Entrepreneurs established in the ancestral Maison Favier (1898)." : "e lieu est à la fois une Auberge pour les passants et un Centre d'Artistes & Entrepreneurs établi dans l'ancestrale Maison Favier (1898)."}</p>
                    <p>{language === 'EN' ? "Le Salon des Inconnus opens its doors in a unique setting, where art and creativity blend with a soothing accommodation experience. Our mission is to nourish emerging, professional, and multidisciplinary artists by offering them an inspiring, co-creative, and relaxing place of residence." : "Le Salon des Inconnus vous ouvre ses portes dans un cadre unique, où l'art et la créativité se marient avec une expérience d'hébergement apaisante. Notre mission est de nourrir les artistes émergents, professionnels et multidisciplinaires en leur offrant un lieu de résidence inspirant, cocréatif et relaxant."}</p>
                </div>
                <div className="pt-6">
                    <div className={`h-px w-full bg-gradient-to-r from-transparent to-transparent ${vibe === 'HOSTEL' ? 'via-[#c5a059]/50' : vibe === 'SHIRE' ? 'via-[#dcb055]/50' : 'via-[#d4af37]/50'}`}></div>
                    <p className={`text-xs mt-2 font-mono uppercase tracking-widest text-right ${vibe === 'HOSTEL' ? 'text-[#f3e5ab]' : vibe === 'SHIRE' ? 'text-[#dcb055]' : 'text-[#d4af37]'}`}>{language === 'EN' ? "Ref. No. 826-CF" : "Réf. No. 826-CF"}</p>
                </div>
            </RevealOnScroll>
        </div>
    </div>
  </div>
);

const ListingCard: React.FC<{ item: Accommodation; language: 'EN' | 'FR'; isHero?: boolean; vibe: VibeMode }> = ({ item, language, isHero = false, vibe }) => {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const colors = getRoomColor(item.id, vibe);
  const isComingSoon = item.status === 'COMING_SOON';
  const isChildRoom = ['room1', 'room2', 'room3', 'room4'].includes(item.id);
  const ctaText = isChildRoom ? (language === 'EN' ? "Book Individually" : "Réserver Individuellement") : (language === 'EN' ? "Reserve" : "Réserver");
  const displayedTitle = (language === 'FR' && item.title_fr) ? item.title_fr : item.title;
  const displayedType = language === 'FR' && item.type_fr ? item.type_fr : item.type;
  const displayedDescription = language === 'FR' && item.description_fr ? item.description_fr : item.description;

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIdx((prev) => (prev + 1) % item.images.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIdx((prev) => (prev - 1 + item.images.length) % item.images.length); };

  if (vibe === 'HOSTEL') {
      return (
        <VictorianCard vibe='HOSTEL' className={`h-full ${isHero ? 'scale-100' : 'scale-95'}`} onClick={() => window.open(item.bookingLink, '_blank')}>
            <div className={`relative w-full overflow-hidden shadow-2xl rounded-t-full border-[3px] border-[#c5a059] bg-black ${isHero ? 'aspect-[16/9]' : 'aspect-video md:aspect-[3/4]'}`}>
                 {isComingSoon && (
                    <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
                        <span className="font-josefin font-bold text-xl uppercase tracking-widest text-[#f3e5ab] border border-[#f3e5ab] px-4 py-1 rounded-full bg-black/40 backdrop-blur-sm">{language === 'EN' ? "Coming Soon" : "Bientôt"}</span>
                    </div>
                )}
                <OptimizedImage key={item.images[currentImageIdx]} src={item.images[currentImageIdx]} alt={displayedTitle} className="w-full h-full" imageClassName="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" priority={isHero} variant={isHero ? 'HERO' : 'CARD'} />
                {item.images.length > 1 && (<><button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-[#f3e5ab] hover:bg-[#c5a059] transition-colors flex items-center justify-center z-20">←</button><button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-[#f3e5ab] hover:bg-[#c5a059] transition-colors flex items-center justify-center z-20">→</button></>)}
            </div>
            <div className="text-center pt-6 px-4 w-full">
                <span className="block font-josefin font-bold text-[10px] uppercase tracking-[0.2em] text-[#c5a059] mb-2">{displayedType}</span>
                <h3 className="font-prata text-2xl text-[#f3e5ab] mb-2">{displayedTitle}</h3>
                <p className={`font-josefin text-xs text-neutral-400 uppercase tracking-wider leading-relaxed mb-4 ${isHero ? 'max-w-2xl mx-auto' : 'line-clamp-3'}`}>{displayedDescription}</p>
                <div className="flex justify-center gap-4 text-[10px] font-bold text-[#f3e5ab] uppercase tracking-widest mb-4">
                    <span>{item.guests} {language === 'EN' ? "Guests" : "Inv."}</span><span className="text-[#c5a059]">/</span><span>{item.beds} {language === 'EN' ? "Beds" : "Lits"}</span>
                </div>
            </div>
        </VictorianCard>
      );
  }
  if (vibe === 'SHIRE') {
    return (
        <VictorianCard vibe='SHIRE' className={`h-full flex flex-col`} onClick={() => window.open(item.bookingLink, '_blank')}>
            <div className={`relative w-full overflow-hidden border-[4px] border-[#dcb055] mb-4 shadow-lg bg-[#20241e] ${isHero ? 'aspect-[16/9] rounded-[50px]' : 'aspect-video md:aspect-[4/3] rounded-[30px]'}`}>
                 {isComingSoon && (
                    <div className="absolute inset-0 z-50 bg-[#20241e]/80 flex items-center justify-center">
                        <span className="font-medieval text-xl text-[#faeecd] border-2 border-[#dcb055] px-6 py-2 rounded-full bg-[#282d26]">{language === 'EN' ? "Coming Soon" : "Bientôt"}</span>
                    </div>
                )}
                <OptimizedImage key={item.images[currentImageIdx]} src={item.images[currentImageIdx]} alt={displayedTitle} className="w-full h-full" imageClassName="w-full h-full object-cover transition-all duration-700 hover:scale-105" priority={isHero} variant={isHero ? 'HERO' : 'CARD'} />
            </div>
            <div className="flex flex-col flex-grow text-center px-4">
                <span className="font-medieval text-[10px] text-[#dcb055] tracking-widest mb-1 opacity-80">{displayedType}</span>
                <h3 className="font-medieval text-2xl text-[#faeecd] mb-3 drop-shadow-md">{displayedTitle}</h3>
                <p className={`font-medieval text-sm text-[#faeecd]/80 leading-relaxed mb-6 ${isHero ? 'max-w-3xl mx-auto' : 'line-clamp-4'}`}>{displayedDescription}</p>
                <div className="mt-auto pt-4 border-t border-[#dcb055]/30 flex justify-between items-center">
                    <div className="flex gap-3 font-medieval text-xs text-[#faeecd]/70">
                         <span className="bg-[#161915]/50 px-2 py-1 rounded-full">{item.guests} {language === 'EN' ? "Guests" : "Inv."}</span>
                         <span className="bg-[#161915]/50 px-2 py-1 rounded-full">{item.beds} {language === 'EN' ? "Beds" : "Lits"}</span>
                    </div>
                    <button className="px-5 py-2 bg-[#dcb055] text-[#161915] font-medieval text-sm rounded-full hover:bg-[#f0c870] transition-all shadow-md hover:scale-105 active:scale-95">{ctaText}</button>
                </div>
            </div>
        </VictorianCard>
    );
  }
  return (
    <VictorianCard vibe='CLASSIC' className={`h-full ${isHero ? 'shadow-2xl' : ''}`} borderColorClass={isHero ? 'border-[#d4af37]' : colors.border}>
      <div className="flex flex-col h-full group/card relative">
          {isComingSoon && (
              <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className={`font-cinzel font-bold text-xl uppercase tracking-widest border-2 px-6 py-2 text-[#d4af37] border-[#d4af37]`}>{language === 'EN' ? "Coming Soon" : "Bientôt"}</span>
              </div>
          )}
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-[#0a0a0a]">
              <span className={`text-[9px] font-cinzel font-bold uppercase tracking-widest ${colors.text}`}>{displayedType}</span>
              <div className="flex gap-2"><span className={`w-1.5 h-1.5 rounded-full bg-[#2a2a2a] border border-[#444]`}></span><span className={`w-1.5 h-1.5 rounded-full bg-[#2a2a2a] border border-[#444]`}></span></div>
          </div>
          <div className={`relative overflow-hidden bg-black ${isHero ? 'aspect-[21/9] md:aspect-[16/9]' : 'aspect-video md:aspect-[4/3]'}`}>
            <OptimizedImage key={item.images[currentImageIdx]} src={item.images[currentImageIdx]} alt={displayedTitle} className="w-full h-full" imageClassName="w-full h-full object-cover transition-transform duration-700 hover:scale-105 opacity-90 hover:opacity-100" priority={isHero} variant={isHero ? 'HERO' : 'CARD'} />
            {item.images.length > 1 && (<><button onClick={prevImage} className="absolute left-0 top-0 bottom-0 w-12 hover:bg-black/30 text-white/50 hover:text-white transition-all z-20">←</button><button onClick={nextImage} className="absolute right-0 top-0 bottom-0 w-12 hover:bg-black/30 text-white/50 hover:text-white transition-all z-20">→</button></>)}
          </div>
          <div className={`${isHero ? 'p-8' : 'p-5'} flex flex-col flex-grow bg-gradient-to-b from-[#121212] to-[#0a0a0a]`}>
            <h3 className={`font-cinzel font-bold text-white mb-2 tracking-wide ${isHero ? 'text-4xl' : 'text-xl'}`}>{displayedTitle}</h3>
            <div className="w-12 h-px mb-4" style={{ backgroundColor: colors.accent }}></div>
            <p className={`font-lato text-neutral-400 mb-6 leading-relaxed ${isHero ? 'text-lg' : 'text-xs line-clamp-3'}`}>{displayedDescription}</p>
            <div className="grid grid-cols-3 border-y border-white/5 py-3 mb-6 mt-auto">
                <div className="text-center border-r border-white/5"><span className="block text-white font-cinzel text-lg">{item.guests}</span><span className="text-[8px] text-neutral-500 uppercase tracking-widest">{language === 'EN' ? "Guests" : "Invités"}</span></div>
                <div className="text-center border-r border-white/5"><span className="block text-white font-cinzel text-lg">{item.beds}</span><span className="text-[8px] text-neutral-500 uppercase tracking-widest">{language === 'EN' ? "Beds" : "Lits"}</span></div>
                <div className="text-center"><span className="block text-white font-cinzel text-lg">{item.baths}</span><span className="text-[8px] text-neutral-500 uppercase tracking-widest">{language === 'EN' ? "Baths" : "Bains"}</span></div>
            </div>
            {isComingSoon ? <button className={`w-full py-3 text-white/50 font-cinzel font-bold uppercase tracking-[0.2em] text-center text-xs bg-white/5 cursor-not-allowed border border-white/10`}>{language === 'EN' ? "Coming Soon" : "Bientôt"}</button> : <a href={item.bookingLink} target="_blank" rel="noopener noreferrer" className={`w-full py-3 text-black font-cinzel font-bold uppercase tracking-[0.2em] text-center text-xs hover:bg-white transition-colors hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]`} style={{ backgroundColor: colors.accent }}>{ctaText}</a>}
          </div>
      </div>
    </VictorianCard>
  );
};

const PhotoGallerySection: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode }> = ({ language, vibe }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isTouching, setIsTouching] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const userImages = ["https://storage.googleapis.com/salondesinconnus/Auberge%20photos/PicsArt_11-19-06.49.25.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/alice%20renard%20devant%20maison.jpeg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/bus%20pov%20arriere%202.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/cuisine%20grande.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/devant%20sciure%20de%20bois.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/charlotnature.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jacuzzi%20ouvert%20ete.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/snip%20cynthia.png", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/yourte%20coucher%20de%20soleil.png", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/salle%20a%20manger.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/machine%20barista%20main.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jardins%20auberge.jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/hemerocales%20auberge.jpg"];
    const accommodationImages = ACCOMMODATIONS.flatMap(acc => acc.images);
    const otherAssets = ["https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg", "https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg", "https://storage.googleapis.com/salondesinconnus/Cuisine/Plating%20alexis%20ai%20(1).jpg", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg", "https://storage.googleapis.com/salondesinconnus/Artistes/profle%20wide.jpg", "https://storage.googleapis.com/salondesinconnus/Artistes/evi%20wide.png", "https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg", "https://storage.googleapis.com/salondesinconnus/inn/andree%20banner.png", "https://storage.googleapis.com/salondesinconnus/massage/Andre%CC%81e%20temp.png", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/gramophone.png", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/handpan%202.png", "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/projecteur.png", "https://storage.googleapis.com/salondesinconnus/inn/ecrivaine%20banana.jpg", "https://storage.googleapis.com/salondesinconnus/inn/musicienne%20banana%202.jpg", "https://storage.googleapis.com/salondesinconnus/inn/cineast%20banana%202.jpg", "https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg", "https://storage.googleapis.com/salondesinconnus/inn/yourte.png", "https://storage.googleapis.com/salondesinconnus/inn/For%20site%20temp%20mini%20(1).jpg", "https://storage.googleapis.com/salondesinconnus/inn/us%20copy.jpg"];
    const allRawImages = [...userImages, ...accommodationImages, ...otherAssets];
    let validImages = Array.from(new Set(allRawImages)).filter(url => url.startsWith("https://storage.googleapis.com/"));
    validImages = validImages.filter(img => !img.includes("Andre%CC%81e%20temp%20wide.png") && !img.includes("massage%20andre.png") && !img.includes("biblio.png"));
    const mainImage = "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png";
    const busImages = validImages.filter(img => img.toLowerCase().includes('bus') || img.toLowerCase().includes('us%20copy')).reverse();
    const yurtImages = validImages.filter(img => img.toLowerCase().includes('yourte') || img.toLowerCase().includes('yurt'));
    const otherImages = validImages.filter(img => !busImages.includes(img) && !yurtImages.includes(img) && img !== mainImage);
    const galleryImages = [mainImage, ...otherImages, ...yurtImages, ...busImages];
    
    // BREAKOUT CSS: Forces element to be screen width and centered, ignoring parent padding on mobile.
    // Resets to normal flow on desktop.
    const bgStyle = "bg-black relative overflow-hidden w-screen left-1/2 -ml-[50vw] md:left-auto md:ml-0 md:w-full";

    // Touch Event Handlers for Mobile Swipe Support
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsTouching(true);
        setStartX(e.touches[0].pageX);
        setStartY(e.touches[0].pageY);
        setScrollLeft(scrollRef.current?.scrollLeft || 0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isTouching) return;
        
        const x = e.touches[0].pageX;
        const y = e.touches[0].pageY;
        
        const xDiff = Math.abs(x - startX);
        const yDiff = Math.abs(y - startY);

        // SCROLL TRAP FIX:
        // Only hijack the event (preventDefault) if the user is swiping HORIZONTALLY.
        // If xDiff > yDiff, it's a horizontal swipe -> scroll gallery.
        // If yDiff > xDiff, it's a vertical scroll -> let browser handle it (do nothing here).
        if (xDiff > yDiff) {
            // Check if actionable swipe (small jitter threshold)
            if (xDiff > 5) {
                if (e.cancelable) e.preventDefault(); // Safety check for passive events
                const walk = (x - startX) * 2; // Scroll-fast
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = scrollLeft - walk;
                }
            }
        }
    };

    const handleTouchEnd = () => {
        setIsTouching(false);
    };

    return (
        <div className={`relative z-10 flex flex-col justify-center items-center py-0 px-0 h-auto aspect-video md:h-screen md:aspect-auto ${bgStyle}`}>
             <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
                  <div className="flex flex-col items-center animate-swipeHint opacity-0">
                      <div className="w-20 h-20 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-full p-4 border border-white/10"><Icons.Swipe /></div>
                      <span className="text-white/80 text-xs font-bold uppercase tracking-widest mt-4 drop-shadow-md">{language === 'EN' ? "Swipe" : "Glisser"}</span>
                  </div>
             </div>
            <div 
                ref={scrollRef}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory custom-scrollbar scroll-smooth touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {galleryImages.map((src, idx) => (
                    <div key={idx} className="relative w-screen h-full shrink-0 snap-center overflow-hidden group border-r border-[#111]">
                        <OptimizedImage src={src} alt="Gallery" className="w-full h-full" imageClassName="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" width={1200} variant="DEFAULT" />
                        <div className={`absolute inset-0 pointer-events-none ${vibe === 'HOSTEL' ? 'bg-[#c5a059]/10' : vibe === 'SHIRE' ? 'bg-[#2f3a25]/20' : 'bg-black/10'}`}></div>
                    </div>
                ))}
            </div>
            <style>{`@keyframes swipeHint { 0% { opacity: 0; transform: translateX(30px); } 20% { opacity: 1; transform: translateX(0); } 60% { opacity: 1; transform: translateX(0); } 80% { opacity: 0; transform: translateX(-30px); } 100% { opacity: 0; transform: translateX(-30px); } } .animate-swipeHint { animation: swipeHint 3s ease-in-out infinite; }`}</style>
        </div>
    );
};

const SpacesGrid: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode }> = ({ language, vibe }) => {
    const spaces = [{ title: "Ger (Yourte)", items: ["Chambre pour 5", "Foyer au Bois"] }, { title: "Chambres (5)", items: ["Musicienne", "Écrivaine", "Cinéaste", "Théâtre", "Tour"] }, { title: "Autobus", items: ["Chambre pour 5", "Foyer aux granules", "Piano inclus"] }, { title: "Salle à Manger", items: ["Tables bistro", "Table basse"] }, { title: "Salon Principal", items: ["Bibliothèque", "Sofas", "Espace doux", "Musique"] }, { title: "Cuisine", items: ["Libre Service", "Café Barista et Thé"] }, { title: "Spa / Jacuzzi", items: ["Espace détente", "Ouvert 24/7"] }, { title: "Nature", items: ["Ruisseau", "Lac", "Forêt", "Terrasse"] }, { title: "Espace Libre", items: ["3 Pits à Feux"] }, { title: "Balcons", items: ["Autour de la maison", "À l'étage"] }, { title: "Salle de Jeux", items: ["Projecteur", "Salle de meditation"] }, { title: "Jardins", items: ["Serre", "Mini Maison"] }];
    const getLink = (title: string) => {
        if (title.includes("Ger")) return ACCOMMODATIONS.find(a => a.id === 'yurt')?.bookingLink;
        if (title.includes("Autobus")) return ACCOMMODATIONS.find(a => a.id === 'bus')?.bookingLink;
        if (title.includes("Chambres")) return ACCOMMODATIONS.find(a => a.id === 'manor')?.bookingLink;
        return undefined;
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
            <RevealOnScroll className="text-center mb-16">
                <h2 className={`text-3xl md:text-4xl text-white mb-2 tracking-[0.2em] ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{language === 'EN' ? "THE SPACE" : "L'ESPACE"}</h2>
                <div className={`w-24 h-px mx-auto ${vibe === 'HOSTEL' ? 'bg-[#c5a059]' : vibe === 'SHIRE' ? 'bg-[#dcb055]' : 'bg-[#d4af37]'}`}></div>
            </RevealOnScroll>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {spaces.map((space, idx) => {
                    const link = getLink(space.title);
                    return (
                        <RevealOnScroll key={idx} delay={idx * 50}>
                            <div onClick={() => link && window.open(link, '_blank')} className={link ? 'cursor-pointer' : ''}>
                                <VictorianCard vibe={vibe} className={`h-full hover:-translate-y-1 ${link ? 'hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]' : ''}`} borderColorClass={vibe === 'CLASSIC' ? 'border-purple-900/50' : undefined}>
                                    {vibe === 'HOSTEL' ? (
                                        <div className="p-6 flex flex-col items-center justify-center text-center bg-[#1e1e24] w-full h-full border border-white/5 rounded-lg hover:border-[#c5a059] transition-colors group-hover:bg-[#25252b]">
                                            <div className="w-8 h-1 bg-[#c5a059] mb-4"></div>
                                            <h3 className="font-prata text-xl text-[#f3e5ab] mb-4">{space.title}</h3>
                                            <div className="flex flex-wrap justify-center gap-2">{space.items.map((item, i) => (<span key={i} className="text-[10px] font-josefin uppercase tracking-wider text-neutral-400 border border-white/10 px-2 py-1 rounded-full">{item}</span>))}</div>
                                        </div>
                                    ) : vibe === 'SHIRE' ? (
                                        <div className="p-6 flex flex-col items-center justify-center text-center h-full bg-[#20241e] rounded-[24px] w-full border border-[#dcb055]/40 hover:border-[#dcb055] transition-colors">
                                            <h3 className="font-medieval text-xl text-[#faeecd] mb-3">{space.title}</h3>
                                            <div className="w-full h-px bg-[#dcb055]/30 mb-3"></div>
                                            <div className="flex flex-wrap justify-center gap-2">{space.items.map((item, i) => (<span key={i} className="text-[11px] text-[#faeecd]/80 font-medieval">{item}{i < space.items.length - 1 ? " • " : ""}</span>))}</div>
                                        </div>
                                    ) : (
                                        <div className="p-6 flex flex-col items-center text-center h-full w-full">
                                             <div className="mb-3"><span className="text-[#d4af37] text-xl">❖</span></div>
                                            <h3 className="font-cinzel text-lg text-white mb-4 tracking-wide border-b border-[#d4af37]/30 pb-2 w-full">{space.title}</h3>
                                            <ul className="text-[10px] text-neutral-400 font-mono space-y-2 uppercase tracking-wider w-full">{space.items.map((item, i) => <li key={i} className="block">{item}</li>)}</ul>
                                        </div>
                                    )}
                                </VictorianCard>
                            </div>
                        </RevealOnScroll>
                    );
                })}
            </div>
        </div>
    );
};

const DetailFlipCard = ({ item, language }: { item: any; language: 'EN' | 'FR' }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const metallicBorderClass = "p-[3px] rounded-lg bg-gradient-to-br from-[#8B5A2B] via-[#FFD700] to-[#8B5A2B] shadow-[0_0_15px_rgba(212,175,55,0.4)]";
    return (
        <div className="w-full h-full relative cursor-pointer group z-10" onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>
             <div className={`w-full h-full relative transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden">
                    <div className={`w-full h-full ${metallicBorderClass}`}>
                        <div className="w-full h-full bg-[#0a0a0a] rounded-[5px] overflow-hidden relative transition-transform hover:-translate-y-2">
                            <OptimizedImage src={item.image} alt={item.title} className="w-full h-full" imageClassName="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500" variant="THUMBNAIL" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                            <div className="absolute bottom-0 w-full p-4 text-center z-10">
                                <h3 className={`text-xl text-[#FFD700] mb-1 font-cinzel text-shadow-md drop-shadow-md`}>{item.title}</h3>
                                <p className="text-[10px] text-white/90 uppercase tracking-[0.2em] font-lato font-bold drop-shadow-sm">{item.desc}</p>
                                <div className="mt-2 text-[#FFD700] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">{language === 'EN' ? "↻ Tap to flip" : "↻ Cliquer pour retourner"}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-0 backface-hidden rotate-y-180" style={{ display: isFlipped ? 'block' : 'none' }}>
                     <div className={`w-full h-full ${metallicBorderClass}`}>
                         <div className="w-full h-full bg-[#151515] rounded-[5px] overflow-hidden relative p-6 flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("${getOptimizedUrl("https://www.transparenttextures.com/patterns/wood-pattern.png", 500)}")` }}></div>
                            <h3 className="font-cinzel text-lg text-[#FFD700] mb-4 border-b border-[#FFD700]/30 pb-2 w-full tracking-wider relative z-10">{item.title}</h3>
                            <ul className="space-y-3 relative z-10 w-full">{item.list.map((li: string, i: number) => (<li key={i} className="text-xs font-lato text-[#f3e5ab] tracking-wide uppercase flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full shadow-[0_0_5px_#FFD700]"></span> {li}</li>))}</ul>
                             <p className="absolute bottom-4 text-[9px] text-neutral-500 uppercase tracking-widest mt-4">{language === 'EN' ? "Click to flip back" : "Cliquer pour revenir"}</p>
                         </div>
                     </div>
                </div>
             </div>
        </div>
    );
};

const DetailsSection: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode }> = ({ language, vibe }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const rotationRef = useRef(0);
    const [isInView, setIsInView] = useState(false);
    const animationFrameRef = useRef<number | null>(null);

    const details = [{ title: language === 'EN' ? "Gramophone" : "Gramophone", desc: "1920s Music", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/gramophone.png", list: language === 'EN' ? ["Vintage Vinyl Collection", "1920s Ambiance", "Jazz & Blues Classics", "Restored Sound System"] : ["Collection Vinyles", "Ambiance Années 20", "Classiques Jazz & Blues", "Système Sonore Restauré"] }, { title: language === 'EN' ? "Barista" : "Barista", desc: language === 'EN' ? "Specialty Coffee with or without service" : "Cafés Spécialisés avec ou sans service", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/machine%20barista%20main.jpg", list: language === 'EN' ? ["Italian Espresso Machine", "Specialty Coffee", "Latte Art Tools", "Loose Leaf Teas"] : ["Machine Espresso", "Café de Spécialité", "Outils Latte Art", "Thés en Feuilles"] }, { title: "Spa", desc: "Jacuzzi 24/7", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jacuzzi%20ouvert%20ete.jpg", list: language === 'EN' ? ["6-Seater Jacuzzi", "Open 24/7", "Stargazing View", "Towels Provided"] : ["Jacuzzi 6 Places", "Ouvert 24/7", "Vue sur les Étoiles", "Serviettes Fournies"] }, { title: language === 'EN' ? "Games" : "Jeux", desc: language === 'EN' ? "Selection of Collectible Games" : "sélection de jeux de collection", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jeux%20auberge.jpg", list: language === 'EN' ? ["Gwent", "Catan", "Minstrels", "Citadels", "Azul", "And much more..."] : ["Gwent", "Catan", "Ménestrels", "Citadelles", "Azul", "et bien plus..."] }, { title: language === 'EN' ? "Music" : "Musique", desc: language === 'EN' ? "Varied Instruments" : "instruments variés", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/handpan%202.png", list: language === 'EN' ? ["Classical Guitar", "Handpan", "Double Flutes", "Electronic Piano", "Kirby Otamatone", "And more..."] : ["Guitare classique", "handpan", "flutes double", "piano électronique", "otamatone kirby", "et plus..."] }, { title: language === 'EN' ? "Library" : "Bibliothèque", desc: "Books", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/biblio.png", list: language === 'EN' ? ["Curated Books", "Cozy Reading Nooks", "Book Exchange", "Comics"] : ["Livres Choisis", "Coins Lecture", "Échange de Livres", "Bandes Dessinées"] }, { title: language === 'EN' ? "Projector" : "Projecteur", desc: "Cinema", image: "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/projecteur.png", list: language === 'EN' ? ["HD Projector", "Streaming Apps", "Surround Sound", "Cinema Screen"] : ["Projecteur HD", "Streaming", "Son Surround", "Écran Cinéma"] }];

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { setIsInView(entry.isIntersecting); }, { threshold: 0.1 });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isInView) { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); return; }
        const animate = () => {
            rotationRef.current -= 0.05;
            if (carouselRef.current) carouselRef.current.style.transform = `rotateY(${rotationRef.current}deg)`;
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [isInView]);

    const rotate = (dir: 'left' | 'right') => {
        const step = 360 / details.length;
        rotationRef.current += (dir === 'left' ? step : -step);
        if (carouselRef.current) carouselRef.current.style.transform = `rotateY(${rotationRef.current}deg)`;
    };

    const onWheel = (e: React.WheelEvent) => {
        if (Math.abs(e.deltaX) > 1) { rotationRef.current += (e.deltaX * 0.2); if (carouselRef.current) carouselRef.current.style.transform = `rotateY(${rotationRef.current}deg)`; }
    };

    return (
        <div ref={containerRef} className="max-w-7xl mx-auto px-6 py-24 relative z-10 overflow-hidden" onWheel={onWheel}>
            <RevealOnScroll className="text-center mb-24">
                <span className={`text-[10px] font-bold uppercase tracking-[0.4em] mb-2 block ${vibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin' : vibe === 'SHIRE' ? 'text-[#faeecd] font-medieval' : 'text-[#d4af37]'}`}>{language === 'EN' ? "The Finer Points" : "Les Raffinements"}</span>
                <h2 className={`text-3xl md:text-4xl text-white mb-2 tracking-widest ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{language === 'EN' ? "DETAILS THAT DELIGHT" : "DÉTAILS QUI PLAISENT"}</h2>
            </RevealOnScroll>
            <div className="relative w-full h-[600px] perspective-1000 flex items-center justify-center overflow-visible">
                <div ref={carouselRef} className="relative w-0 h-0 transform-style-3d will-change-transform z-10">
                    {details.map((item, idx) => {
                        const angleStep = 360 / details.length;
                        const angle = idx * angleStep;
                        const radius = 320; 
                        return (
                            <div key={idx} className="absolute left-0 top-0 w-[220px] h-[280px] -ml-[110px] -mt-[140px] flex flex-col items-center justify-center text-center backface-visible cursor-pointer transition-colors" style={{ transform: `rotateY(${angle}deg) translateZ(${radius}px)` }}>
                                <DetailFlipCard item={item} language={language} />
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="flex justify-center gap-12 mt-8 relative z-20">
                <button onClick={() => rotate('left')} className="text-[#d4af37] text-4xl hover:scale-125 transition-transform drop-shadow-[0_0_10px_#d4af37]">←</button>
                <button onClick={() => rotate('right')} className="text-[#d4af37] text-4xl hover:scale-125 transition-transform drop-shadow-[0_0_10px_#d4af37]">→</button>
            </div>
            <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-visible { backface-visibility: visible; }`}</style>
        </div>
    );
};

const ServicesSection: React.FC<{ language: 'EN' | 'FR'; onNavigate: (view: 'INN' | 'KITCHEN' | 'MASSOTHERAPY') => void; vibe: VibeMode }> = ({ language, onNavigate, vibe }) => {
    return (
        <div className="max-w-7xl mx-auto px-6 pb-24 relative z-10 pt-16">
            <RevealOnScroll className="text-center mb-16">
                <span className={`text-[10px] uppercase tracking-[0.4em] font-bold mb-2 block ${vibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin' : vibe === 'SHIRE' ? 'text-[#faeecd] font-medieval' : 'text-[#d4af37] font-cinzel'}`}>{language === 'EN' ? "The Twin Portals" : "Les Deux Portails"}</span>
                <h2 className={`text-3xl md:text-5xl text-white tracking-widest ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{language === 'EN' ? "SERVICES" : "SERVICES"}</h2>
                <div className={`w-24 h-px mx-auto mt-4 ${vibe === 'HOSTEL' ? 'bg-[#c5a059]' : vibe === 'SHIRE' ? 'bg-[#dcb055]' : 'bg-[#d4af37]'}`}></div>
            </RevealOnScroll>
            <div className="grid grid-cols-1 md:grid-cols-2 h-auto md:h-[600px] w-full gap-4 md:gap-4">
                {/* 1. KITCHEN PORTAL */}
                <div onClick={() => onNavigate('KITCHEN')} className={`relative group w-full min-h-[400px] md:h-full cursor-pointer overflow-hidden border-2 ${vibe === 'HOSTEL' ? 'rounded-t-[30px] md:rounded-tr-none md:rounded-l-[30px] border-[#c5a059]' : vibe === 'SHIRE' ? 'rounded-[30px] border-[#dcb055]' : 'border-[#d4af37] border-b-0 md:border-b-2 md:border-r-0 md:rounded-l-full'}`}>
                    <div className="absolute inset-0 bg-black z-0 pointer-events-none overflow-hidden">
                        <OptimizedImage src="https://storage.googleapis.com/salondesinconnus/Cuisine/Plating%20alexis%20ai%20(1).jpg" alt="Cuisine" className="w-full h-full" imageClassName="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 ease-out will-change-transform group-hover:scale-110" imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }} variant="CARD" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2a0a00] via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10 flex flex-col items-center text-center">
                         <h3 className={`text-3xl text-white mb-2 uppercase tracking-wider drop-shadow-lg ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>Traiteur</h3>
                         <p className="text-neutral-300 text-xs tracking-widest uppercase max-w-xs opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 font-lato">{language === 'EN' ? "Catering & Private Chef" : "Traiteur & Chef Privé"}</p>
                    </div>
                </div>
                {/* 2. MASSAGE PORTAL */}
                <div onClick={() => onNavigate('MASSOTHERAPY')} className={`relative group w-full min-h-[400px] md:h-full cursor-pointer overflow-hidden border-2 ${vibe === 'HOSTEL' ? 'rounded-b-[30px] md:rounded-bl-none md:rounded-r-[30px] border-[#c5a059]' : vibe === 'SHIRE' ? 'rounded-[30px] border-[#dcb055]' : 'border-[#d4af37] border-t-0 md:border-t-2 md:border-l-0 md:rounded-r-full'}`}>
                    <div className="absolute inset-0 bg-black z-0 pointer-events-none overflow-hidden">
                        <OptimizedImage src="https://storage.googleapis.com/salondesinconnus/massage/massage%20andre.png" alt="Massage" className="w-full h-full" imageClassName="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 ease-out will-change-transform group-hover:scale-110" imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }} variant="CARD" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#001a1a] via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10 flex flex-col items-center text-center">
                         <h3 className={`text-3xl text-white mb-2 uppercase tracking-wider drop-shadow-lg ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>Massothérapie</h3>
                         <p className="text-neutral-300 text-xs tracking-widest uppercase max-w-xs opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 font-lato">{language === 'EN' ? "Massotherapy & Reiki" : "Massothérapie & Reiki"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VideoTourSection: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode }> = ({ language, vibe }) => (
    <div className={`max-w-7xl mx-auto px-6 pt-16 pb-32 border-t relative z-10 ${vibe === 'HOSTEL' ? 'border-[#c5a059]/30' : vibe === 'SHIRE' ? 'border-[#dcb055]/30' : 'border-[#d4af37]/20'}`}>
        <RevealOnScroll className="text-center mb-12">
            <h2 className={`text-3xl text-white tracking-[0.2em] mb-4 ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{language === 'EN' ? "FEEL THE VIBE" : "RESSENTEZ L'AMBIANCE"}</h2>
            <div className={`w-24 h-px mx-auto opacity-50 ${vibe === 'HOSTEL' ? 'bg-[#c5a059]' : vibe === 'SHIRE' ? 'bg-[#dcb055]' : 'bg-[#d4af37]'}`}></div>
        </RevealOnScroll>
        <RevealOnScroll animation="fadeIn">
            <div className={`relative w-full aspect-video shadow-2xl bg-[#0a0a0a] group p-2 ${vibe === 'HOSTEL' ? 'border-[4px] border-[#1e1e24] outline outline-1 outline-[#c5a059] rounded-t-[50px] rounded-b-lg' : vibe === 'SHIRE' ? 'border-4 border-[#dcb055] rounded-[60px] shadow-lg' : 'border border-[#333]'}`}>
                <div className={`w-full h-full relative overflow-hidden ${vibe === 'HOSTEL' ? 'rounded-t-[40px] rounded-b-md border border-[#c5a059]/50' : vibe === 'SHIRE' ? 'rounded-full border border-[#dcb055]/50' : 'border border-white/5'}`}>
                    <video src="https://storage.googleapis.com/salondesinconnus/inn/Temp%20video%20site.mov" className={`w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity`} controls playsInline preload="metadata"><p>Your browser does not support the video tag.</p></video>
                </div>
            </div>
        </RevealOnScroll>
    </div>
);

const LocalGuideSection: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode; onNavigate: (view: any) => void }> = ({ language, vibe, onNavigate }) => {
    return (
        <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                <img src={getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg", 1200)} alt="Local Region" className="w-full h-full object-cover object-center will-change-transform" decoding="async" loading="lazy" />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>
            <div className="relative z-10 text-center px-6">
                <RevealOnScroll animation="fadeUp">
                    <h2 className={`text-5xl md:text-7xl text-white mb-6 drop-shadow-2xl ${vibe === 'HOSTEL' ? 'font-prata' : 'font-cinzel'}`}>{language === 'EN' ? "Local Guide" : "Guide Local"}</h2>
                    <p className="text-xl text-white/90 font-lato max-w-2xl mx-auto mb-8 leading-relaxed">{language === 'EN' ? "From the serenity of Lac Simon to the heritage of Montebello. Explore the Outaouais." : "De la sérénité du Lac Simon au patrimoine de Montebello. Explorez l'Outaouais."}</p>
                    <button onClick={() => onNavigate('GUIDE')} className={`px-8 py-3 bg-white/10 backdrop-blur-md border border-white/50 text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded-full hover:scale-105 active:scale-95`}>{language === 'EN' ? "Discover" : "Découvrir"}</button>
                </RevealOnScroll>
            </div>
        </div>
    );
};

const HostsSection: React.FC<{ language: 'EN' | 'FR'; vibe: VibeMode; onNavigate: (view: 'INN' | 'MASSOTHERAPY' | 'HOSTS') => void }> = ({ language, vibe, onNavigate }) => (
    <div className="min-h-screen flex flex-col justify-center items-center max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="w-48 h-auto mb-8 animate-fadeIn">
             <img src="https://i.imgur.com/B1YfPqn.png" alt="Maison Favier Logo" className={`w-full h-full object-contain drop-shadow-2xl transition-all duration-1000 ${vibe === 'HOSTEL' ? 'brightness-125 sepia-[.5] hue-rotate-[-30deg]' : vibe === 'SHIRE' ? 'brightness-110 sepia-[0.8] hue-rotate-[5deg] saturate-[1.4]' : 'brightness-100'}`} />
        </div>
        <RevealOnScroll>
            <h2 className={`text-4xl md:text-6xl text-white mb-6 tracking-widest ${vibe === 'HOSTEL' ? 'font-prata' : vibe === 'SHIRE' ? 'font-medieval' : 'font-cinzel'}`}>{language === 'EN' ? "DISCOVER YOUR HOSTS" : "DÉCOUVREZ VOS HÔTES"}</h2>
            <p className={`text-neutral-400 text-xl max-w-2xl mx-auto leading-relaxed mb-12 ${vibe === 'HOSTEL' ? 'font-josefin tracking-wide' : vibe === 'SHIRE' ? 'font-medieval text-[#faeecd]/90' : 'font-lato'}`}>{language === 'EN' ? "And the story behind the projects." : "Et l'histoire derrière les projets."}</p>
            <button onClick={() => onNavigate('HOSTS')} className={`px-10 py-5 bg-transparent border-2 font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 ${vibe === 'HOSTEL' ? 'border-[#c5a059] text-[#f3e5ab] hover:bg-[#c5a059] hover:text-[#1e1e24]' : vibe === 'SHIRE' ? 'border-[#dcb055] text-[#faeecd] hover:bg-[#dcb055] hover:text-[#1a1107]' : 'border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black'}`}>{language === 'EN' ? "Meet the Team" : "Rencontrer l'Équipe"}</button>
        </RevealOnScroll>
        <div className={`mt-24 opacity-50 text-[10px] uppercase tracking-[0.3em] ${vibe === 'HOSTEL' ? 'text-[#f3e5ab]' : vibe === 'SHIRE' ? 'text-[#faeecd]' : 'text-neutral-500'}`}>© 2026 Le Salon des Inconnus</div>
    </div>
);

export const InnPage: React.FC<InnPageProps> = ({ onNavigate, language }) => {
  const [currentVibe, setCurrentVibe] = useState<VibeMode>('HOSTEL');
  const mainRef = useRef<HTMLDivElement>(null);

  const cycleVibe = () => {
      if (currentVibe === 'HOSTEL') setCurrentVibe('CLASSIC');
      else if (currentVibe === 'CLASSIC') setCurrentVibe('SHIRE');
      else setCurrentVibe('HOSTEL');
  };

  const manor = ACCOMMODATIONS.find(a => a.id === 'manor');
  const connectedIds = ['room3', 'room4', 'room2', 'room1', 'yurt'];
  const connectedRooms = ACCOMMODATIONS.filter(a => connectedIds.includes(a.id));
  const sortOrder = { 'room3': 0, 'room4': 1, 'room2': 2, 'room1': 3, 'yurt': 4 };
  connectedRooms.sort((a, b) => sortOrder[a.id as keyof typeof sortOrder] - sortOrder[b.id as keyof typeof sortOrder]);
  const independentIds = ['tiny', 'bus'];
  const independentRooms = ACCOMMODATIONS.filter(a => independentIds.includes(a.id));

  const structuredData = getStructuredData(language);
  const meta = PAGE_META.INN[language];

  return (
    <div 
        ref={mainRef}
        className={`fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200 animate-fadeIn custom-scrollbar selection:text-black transition-colors duration-1000 
        ${currentVibe === 'HOSTEL' ? 'bg-[#18181b] selection:bg-[#f3e5ab]' : 
          currentVibe === 'SHIRE' ? 'bg-[#161915] selection:bg-[#dcb055]' : 
          'bg-[#050505] selection:bg-[#d4af37]'}`}
    >
      {/* NATIVE REACT 19 SEO INJECTION */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={meta.keywords} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      
      {/* Dynamic Backgrounds (Memoized) */}
      <GrainTexture vibe={currentVibe} />
      <VictorianPattern vibe={currentVibe} />
      <div className={`fixed inset-0 pointer-events-none transition-opacity duration-1000 mix-blend-overlay ${currentVibe === 'HOSTEL' ? 'opacity-20 bg-[url("https://www.transparenttextures.com/patterns/dark-leather.png")]' : 'opacity-0'}`}></div>

      <header className={`fixed top-0 w-full z-[100] border-b shadow-lg transition-colors duration-1000 
        ${currentVibe === 'HOSTEL' ? 'bg-[#18181b]/90 border-[#c5a059]/30' : 
          currentVibe === 'SHIRE' ? 'bg-[#161915]/90 border-[#dcb055]/30' : 
          'bg-[#050505]/90 border-[#d4af37]/20'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div 
             className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
             onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
             <span className={`text-2xl transition-colors 
                 ${currentVibe === 'HOSTEL' ? 'text-[#f3e5ab]' : 
                   currentVibe === 'SHIRE' ? 'text-[#eebb44]' : 
                   'text-[#d4af37]'}`}>
                   <Icons.Key />
             </span>
             <span className={`font-bold text-lg tracking-[0.2em] hidden md:block transition-colors 
                ${currentVibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin uppercase' : 
                  currentVibe === 'SHIRE' ? 'text-[#faeecd] font-medieval tracking-[0.1em]' : 
                  'text-[#d4af37] font-cinzel'}`}>
                  L'Auberge
             </span>
          </div>
        </div>
      </header>

      {/* Main Content Area - STICKY STACK ARCHITECTURE */}
      <main className="pt-20 relative z-10">
          
          {/* 1. Hero Layer (Base - Parallax) */}
          <div className="relative z-0" style={{ position: 'sticky', top: 0 }}>
             <InnHero language={language} vibe={currentVibe} onCycleVibe={cycleVibe} />
             <TrustedPlatforms language={language} vibe={currentVibe} />
          </div>

          {/* 2. History Layer */}
          <StickySection vibe={currentVibe} zIndex={10} desktopHeight="800px">
             <HistorySection language={language} vibe={currentVibe} />
             <SectionDivider vibe={currentVibe} />
          </StickySection>

          {/* 3. Estate Node Tree Layer */}
          {manor && (
            <StickySection vibe={currentVibe} zIndex={20} desktopHeight="1200px">
                <div className="w-full max-w-[1920px] mx-auto pb-12 relative px-6 md:px-12 pt-12">
                   
                   <RevealOnScroll className="flex justify-center relative z-20 mb-8">
                       <div className={`w-full max-w-7xl ${currentVibe === 'CLASSIC' ? 'shadow-[0_0_50px_rgba(0,0,0,0.8)]' : ''}`}>
                           <ListingCard item={manor} language={language} isHero vibe={currentVibe} />
                       </div>
                   </RevealOnScroll>

                   <div className="flex flex-col items-center w-full mb-8 relative z-10">
                        <div className={`h-8 w-px ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>
                        
                        <div className={`px-6 py-1 rounded-full z-20 border 
                            ${currentVibe === 'HOSTEL' ? 'bg-[#1e1e24] border-[#c5a059] text-[#f3e5ab]' : 
                              currentVibe === 'SHIRE' ? 'bg-[#2f2010] border-[#dcb055] text-[#faeecd]' : 
                              'bg-[#0a0a0a] border-white/20 text-neutral-400'}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] 
                                ${currentVibe === 'HOSTEL' ? 'font-josefin' : 
                                  currentVibe === 'SHIRE' ? 'font-medieval' : 
                                  'font-cinzel'}`}>
                                {language === 'EN' ? "Includes" : "Inclut"}
                            </span>
                        </div>

                        <div className={`h-8 w-px ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>

                        <div className={`w-[90%] md:w-[82%] h-px relative 
                            ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : 
                              currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 
                              'bg-white/20'}`}>
                            <div className={`absolute top-0 left-0 w-px h-8 ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>
                            <div className={`absolute top-0 left-1/4 w-px h-8 ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>
                            <div className={`absolute top-0 left-1/2 w-px h-8 ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>
                            <div className={`absolute top-0 left-3/4 w-px h-8 ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>
                            <div className={`absolute top-0 right-0 w-px h-8 ${currentVibe === 'HOSTEL' ? 'bg-[#c5a059]/50' : currentVibe === 'SHIRE' ? 'bg-[#dcb055]/50' : 'bg-white/20'}`}></div>
                        </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-20 mt-8 w-full">
                       {connectedRooms.map((room, idx) => (
                           <RevealOnScroll key={room.id} delay={idx * 100} className="h-auto md:h-[450px]">
                               <ListingCard item={room} language={language} vibe={currentVibe} />
                           </RevealOnScroll>
                       ))}
                   </div>
                </div>
                <SectionDivider vibe={currentVibe} />
            </StickySection>
          )}


          {/* 4. Independent Stays Layer */}
          <StickySection vibe={currentVibe} zIndex={30} desktopHeight="1000px">
            <div className="w-full max-w-[1920px] mx-auto pb-12 px-6 md:px-12 pt-24">
                 <RevealOnScroll className="text-center mb-16">
                     <h2 className={`text-3xl text-white tracking-[0.2em] 
                        ${currentVibe === 'HOSTEL' ? 'font-prata' : 
                          currentVibe === 'SHIRE' ? 'font-medieval' : 
                          'font-cinzel'}`}>
                        {language === 'EN' ? "INDEPENDENT STAYS" : "SÉJOURS INDÉPENDANTS"}
                     </h2>
                     <p className={`mt-2 text-xs uppercase tracking-widest 
                        ${currentVibe === 'HOSTEL' ? 'text-[#f3e5ab] font-josefin' : 
                          currentVibe === 'SHIRE' ? 'text-[#faeecd] font-medieval' : 
                          'text-neutral-500 font-lato'}`}>
                        {language === 'EN' ? "Off-grid / Secluded" : "Hors-Réseau / Isolé"}
                     </p>
                 </RevealOnScroll>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto">
                     {independentRooms.map((room, idx) => (
                         <RevealOnScroll key={room.id} delay={idx * 150} className="h-auto md:h-[500px]">
                            <ListingCard item={room} language={language} vibe={currentVibe} />
                         </RevealOnScroll>
                     ))}
                 </div>
            </div>
            <SectionDivider vibe={currentVibe} />
          </StickySection>
          
          {/* 5. Photo Gallery (Heavy Component - Lazy Loaded) */}
          <StickySection vibe={currentVibe} zIndex={35} desktopHeight="100vh">
              <LazySection placeholderHeight="50vh">
                  <PhotoGallerySection language={language} vibe={currentVibe} />
              </LazySection>
          </StickySection>

          {/* 6. Inventory Layer */}
          <StickySection vibe={currentVibe} zIndex={40} desktopHeight="800px">
              <SpacesGrid language={language} vibe={currentVibe} />
              <SectionDivider vibe={currentVibe} />
          </StickySection>

          {/* 7. Services Layer */}
          <StickySection vibe={currentVibe} zIndex={50} desktopHeight="800px">
              <ServicesSection language={language} onNavigate={onNavigate} vibe={currentVibe} />
          </StickySection>

          {/* 8. Details Layer (Aggressively Optimized) */}
          <StickySection vibe={currentVibe} zIndex={60} desktopHeight="800px">
              <DetailsSection language={language} vibe={currentVibe} />
          </StickySection>

          {/* 9. Video Layer (Heavy Component - Lazy Loaded) */}
          <StickySection vibe={currentVibe} zIndex={70} desktopHeight="600px">
              <LazySection placeholderHeight="600px">
                  <VideoTourSection language={language} vibe={currentVibe} />
              </LazySection>
          </StickySection>

          {/* 10. Local Guide Layer */}
          <StickySection vibe={currentVibe} zIndex={80} desktopHeight="60vh">
               <LocalGuideSection language={language} vibe={currentVibe} onNavigate={onNavigate} />
          </StickySection>

          {/* 11. Hosts Layer (Footer) */}
          <StickySection vibe={currentVibe} zIndex={90} desktopHeight="100vh">
              <HostsSection language={language} vibe={currentVibe} onNavigate={onNavigate} />
          </StickySection>

      </main>
      
      <style>{`
        .animate-fadeIn {
            animation: fadeInPage 1.5s ease-out forwards;
        }
        @keyframes fadeInPage {
            from { opacity: 0; filter: blur(5px); }
            to { opacity: 1; filter: blur(0); }
        }
        .perspective-1000 {
            perspective: 1000px;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 2px;
            border: 1px solid #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d4af37;
        }
        .font-prata { font-family: 'Prata', serif; }
        .font-josefin { font-family: 'Josefin Sans', sans-serif; }
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .font-medieval { font-family: 'MedievalSharp', cursive; }
        
        /* Hint for sticky section performance */
        .will-change-transform {
          will-change: transform;
        }
        .transform-gpu {
          transform: translate3d(0,0,0);
        }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};
