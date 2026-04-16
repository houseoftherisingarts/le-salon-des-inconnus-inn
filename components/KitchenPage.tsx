
import React, { useEffect, useState, useRef } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { getOptimizedUrl } from '../utils/imageOptimizer';

interface KitchenPageProps {
  onNavigate: () => void;
  language: 'EN' | 'FR';
}

// --- TYPES ---
type MenuActionType = 'LINK' | 'IMAGE' | 'FLIP';

interface MenuConfig {
  title: string;
  type: MenuActionType;
  url?: string;
  src?: string;
  front?: string;
  back?: string;
}

// --- MENU MODAL COMPONENT ---
const MenuModal: React.FC<{ menu: MenuConfig; onClose: () => void }> = ({ menu, onClose }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Reset flip state when menu changes
    useEffect(() => setIsFlipped(false), [menu]);

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            
            <div 
                className="relative z-10 max-w-5xl max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                 {/* Close Button - Positioned top right of SCREEN on mobile to prevent overlap, relative to content on desktop */}
                 <button 
                    onClick={onClose}
                    className="fixed top-4 right-4 sm:absolute sm:-top-12 sm:right-0 sm:sm:-right-12 sm:sm:top-0 text-white/70 hover:text-white p-2 transition-colors z-[210] bg-black/50 rounded-full sm:bg-transparent"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                 {menu.type === 'IMAGE' && menu.src && (
                     <img 
                        src={getOptimizedUrl(menu.src, 1600)} 
                        alt={menu.title} 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-scaleIn block"
                     />
                 )}

                 {menu.type === 'FLIP' && menu.front && menu.back && (
                     <div 
                        className="relative perspective-1000 cursor-pointer"
                        onClick={() => setIsFlipped(!isFlipped)}
                     >
                         <div className={`relative transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                             {/* Front - Determines Size */}
                             <img 
                                src={getOptimizedUrl(menu.front, 1600)} 
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl backface-hidden block" 
                                alt="Front" 
                            />
                             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs uppercase tracking-widest backdrop-blur-md border border-white/10 pointer-events-none animate-pulse whitespace-nowrap backface-hidden">
                                  Click to Flip ↻
                              </div>

                             {/* Back - Absolute to match Front size */}
                             <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center">
                                <img 
                                    src={getOptimizedUrl(menu.back, 1600)} 
                                    className="w-full h-full object-contain rounded-lg shadow-2xl" 
                                    alt="Back" 
                                />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs uppercase tracking-widest backdrop-blur-md border border-white/10 pointer-events-none animate-pulse whitespace-nowrap">
                                  Click to Flip Back ↺
                              </div>
                             </div>
                         </div>
                     </div>
                 )}
            </div>
        </div>
    );
};

// --- UTILITIES (DUPLICATED FOR STABILITY) ---

const RevealOnScroll: React.FC<{ children: React.ReactNode; className?: string; delay?: number; animation?: 'fadeUp' | 'fadeIn' | 'slideRight' | 'slideLeft' }> = ({ children, className = "", delay = 0, animation = 'fadeUp' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible) return; // Optimization

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

const StickySection: React.FC<{ children: React.ReactNode; className?: string; zIndex: number; intrinsicHeight?: string }> = ({ children, className = "", zIndex, intrinsicHeight = "100vh" }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [top, setTop] = useState(0);

    useEffect(() => {
        const updateTop = () => {
            if (ref.current) {
                const height = ref.current.offsetHeight;
                const windowHeight = window.innerHeight;
                // Add a small offset for mobile to ensure content isn't covered too early
                const offset = window.innerWidth < 768 ? 50 : 0;
                setTop((height > windowHeight ? windowHeight - height : 0) + offset);
            }
        };
        updateTop();
        window.addEventListener('resize', updateTop);
        return () => window.removeEventListener('resize', updateTop);
    }, []);

    return (
        <section 
            ref={ref}
            className={`relative w-full ${className}`}
            style={{ 
                position: 'sticky', 
                top: `${top}px`, 
                zIndex: zIndex,
                minHeight: intrinsicHeight 
            }}
        >
            {children}
        </section>
    );
};

export const KitchenPage: React.FC<KitchenPageProps> = ({ onNavigate, language }) => {
  const [selectedMenu, setSelectedMenu] = useState<MenuConfig | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const signatureImages = [
      "https://storage.googleapis.com/salondesinconnus/Cuisine/Plating%20alexis%20ai%20(1).jpg",
      "https://storage.googleapis.com/salondesinconnus/Cuisine/13736082_681443872003519_178441360_n_edited.jpg",
      "https://storage.googleapis.com/salondesinconnus/Cuisine/bubbles.jpg",
      "https://storage.googleapis.com/salondesinconnus/Cuisine/IMG_20161116_161655.jpg",
      "https://storage.googleapis.com/salondesinconnus/Cuisine/sauce.jpg"
  ];

  const services = [
    {
        title: language === 'EN' ? "Private Chef" : "Chef Privé",
        desc: language === 'EN' ? "Exclusive Portuguese & Molecular gastronomy journey in the privacy of the Manor." : "Voyage gastronomique Portugais & Moléculaire exclusif dans l'intimité du Manoir."
    },
    {
        title: language === 'EN' ? "Bespoke Catering" : "Traiteur Sur Mesure",
        desc: language === 'EN' ? "Thematic menus designing for weddings and corporate retreats. High-end fusion." : "Menus thématiques pour mariages et retraites. Fusion haut de gamme."
    },
    {
        title: language === 'EN' ? "Workshops" : "Ateliers",
        desc: language === 'EN' ? "Learn the art of fermentation, plating, and molecular techniques." : "Apprenez l'art de la fermentation, du dressage et des techniques moléculaires."
    },
    {
        title: language === 'EN' ? "Festivals" : "Festivals",
        desc: language === 'EN' ? "Large scale culinary experiences, outdoor cooking, and giant pavers." : "Expériences culinaires à grande échelle, cuisine en plein air et poêlées géantes."
    },
    {
        title: language === 'EN' ? "Restaurant Consulting" : "Création de Menus",
        desc: language === 'EN' ? "Menu design and culinary consulting for restaurants." : "Conception de menus et consultation culinaire pour restaurants."
    },
    {
        title: language === 'EN' ? "Consultation" : "Consultation",
        desc: language === 'EN' ? "A preliminary meeting to define your needs and create a custom offer." : "Une rencontre préliminaire pour définir vos besoins et créer une offre sur mesure."
    }
  ];

  const pastMenus: MenuConfig[] = [
    { 
        title: "Festivals", 
        type: 'LINK', 
        url: "https://www.festivalmedievaldemontpellier.org/nourriture" 
    },
    { 
        title: "Mariages", 
        type: 'IMAGE', 
        src: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20Mariage%20Namur.png" 
    },
    { 
        title: "Traiteur Mariage Futuriste", 
        type: 'FLIP', 
        front: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20neon.jpg",
        back: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20Cocktails.jpg"
    },
    { 
        title: "Traiteur Mariage", 
        type: 'IMAGE', 
        src: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20MAriage%20Theo.jpg" 
    },
    { 
        title: "Soupers Privés", 
        type: 'IMAGE', 
        src: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20BBQ%20mariage.png" 
    },
    { 
        title: "Installations Artistiques", 
        type: 'IMAGE', 
        src: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20Artistique%20Phenomenal.png" 
    },
    { 
        title: "Menu Mariage Végé", 
        type: 'IMAGE', 
        src: "https://storage.googleapis.com/salondesinconnus/Cuisine/Menu%20MAriage%20Theo.jpg" 
    }
  ];

  const handleMenuClick = (menu: MenuConfig) => {
    if (menu.type === 'LINK' && menu.url) {
        window.open(menu.url, '_blank', 'noopener,noreferrer');
    } else {
        setSelectedMenu(menu);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#0a0a08] text-neutral-200 animate-fadeIn custom-scrollbar font-sans">
       {/* Background Texture - subtle noise/grain */}
       <div className="fixed inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paisley.png")` }}></div>

       {/* Header */}
      <header className="fixed top-0 w-full z-[100] bg-[#0a0a08]/90 backdrop-blur-md border-b border-white/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Left Side: Back Button + Branding */}
          <div 
             className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
             onClick={onNavigate}
          >
             <span className="flex items-center justify-center w-8 h-8 rounded-full border border-[#c0a080]/30 text-[#c0a080] hover:bg-[#c0a080] hover:text-black transition-colors">←</span>
             <div>
                 <div className="flex items-center gap-2 text-[#c0a080]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                    </svg>
                    <span className="font-cinzel font-bold text-lg tracking-widest hidden sm:block">Le Laboratoire</span>
                 </div>
                 <span className="text-[9px] uppercase tracking-widest text-neutral-500 block sm:hidden">Retour</span>
             </div>
          </div>
          
          {/* Right Side: Empty for Global Menu */}
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content Stack */}
      <main className="relative w-full">
          
          {/* 1. Hero (Base Layer) */}
          <div className="relative h-[85vh] w-full overflow-hidden flex items-center justify-center z-0" style={{ position: 'sticky', top: 0 }}>
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <OptimizedImage
                        src="https://storage.googleapis.com/salondesinconnus/Cuisine/waiter.jpg" 
                        alt="Plating Art" 
                        className="w-full h-full"
                        imageClassName="w-full h-full object-cover object-center"
                        imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                        variant="HERO"
                        priority
                    />
                    {/* Darker Overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/60 z-10" />
                </div>
                
                {/* Text Overlay Box - Perfectly Centered */}
                <div className="relative z-20 w-full max-w-4xl px-6 flex justify-center">
                    <div className="w-full border border-white/20 bg-black/20 backdrop-blur-sm py-16 px-8 text-center animate-fadeIn">
                        <h1 className="font-cinzel text-4xl md:text-8xl text-white mb-6 tracking-[0.15em] uppercase drop-shadow-2xl">
                            {language === 'EN' ? "The Laboratory" : "Le Laboratoire"}
                        </h1>
                        <p className="font-cinzel text-[#c0a080] text-sm md:text-xl tracking-[0.4em] uppercase font-bold drop-shadow-lg">
                            {language === 'EN' ? "& Bistronomy" : "& Bistronomie"}
                        </p>
                    </div>
                </div>
          </div>

          {/* 2. Chef Section (Sticky Layer 1) */}
          <StickySection zIndex={10} className="bg-[#0a0a08] border-t border-white/10 pt-24 pb-12" intrinsicHeight="800px">
              <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                  <RevealOnScroll className="order-2 md:order-1">
                      <span className="text-[#c0a080] text-xs font-bold uppercase tracking-widest mb-4 block">
                          {language === 'EN' ? "Culinary Conceptor" : "Concepteur Culinaire"}
                      </span>
                      <h2 className="font-cinzel text-4xl text-white mb-6">Marc Alexis Pepin</h2>
                      <p className="font-lato text-neutral-400 leading-relaxed mb-6">
                          {language === 'EN' 
                            ? "A daring fusion of Montreal's molecular gastronomy and the warmth of Portuguese bistronomy. Marc Alexis transforms every dish into an ephemeral work of art, fusing modern molecular techniques with ancestral flavors in his culinary laboratory. For him, plating and recipes are forms of ephemeral art." 
                            : "Une fusion audacieuse entre la gastronomie moléculaire montréalaise et la chaleur de la bistronomie portugaise. Marc Alexis transforme chaque plat en une œuvre d'art éphémère, fusionnant techniques moléculaires modernes et saveurs ancestrales dans son laboratoire culinaire. Pour lui, son dressage et ses recettes sont de l'art éphémère."}
                      </p>
                      <div className="flex flex-wrap gap-4">
                          <div className="px-4 py-2 border border-white/10 rounded bg-white/5 text-xs uppercase tracking-widest text-neutral-300">Gastronomie</div>
                          <div className="px-4 py-2 border border-white/10 rounded bg-white/5 text-xs uppercase tracking-widest text-neutral-300">Moléculaire</div>
                          <div className="px-4 py-2 border border-white/10 rounded bg-white/5 text-xs uppercase tracking-widest text-neutral-300">Portugais</div>
                          <div className="px-4 py-2 border border-white/10 rounded bg-white/5 text-xs uppercase tracking-widest text-neutral-300">Bistronomie</div>
                          <div className="px-4 py-2 border border-white/10 rounded bg-white/5 text-xs uppercase tracking-widest text-neutral-300">Medieval</div>
                          <div className="px-4 py-2 border border-white/10 rounded bg-white/5 text-xs uppercase tracking-widest text-neutral-300">Fusion</div>
                      </div>
                  </RevealOnScroll>
                  <div className="order-1 md:order-2 relative h-[500px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                      <OptimizedImage
                        src="https://storage.googleapis.com/salondesinconnus/Cuisine/alexis%20chef.jpg" 
                        alt="Chef" 
                        className="w-full h-full"
                        imageClassName="w-full h-full object-cover transition-all duration-1000 hover:scale-105"
                        imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                        variant="CARD"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-30 pointer-events-none" />
                  </div>
              </section>
          </StickySection>

          {/* 3. Menu Showcase (Sticky Layer 2) */}
          <StickySection zIndex={20} className="bg-[#0e0e0c] border-t border-white/10 py-24" intrinsicHeight="1200px">
              <section className="max-w-7xl mx-auto px-6">
                   <RevealOnScroll className="text-center mb-16">
                       <h2 className="font-cinzel text-3xl text-white tracking-widest mb-4">{language === 'EN' ? "Signature Creations" : "Créations Signatures"}</h2>
                       <div className="w-24 h-px bg-[#c0a080] mx-auto opacity-50"></div>
                   </RevealOnScroll>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                       {signatureImages.map((src, idx) => (
                           <RevealOnScroll key={idx} delay={idx * 50} className="aspect-square bg-[#141414] rounded-xl overflow-hidden border border-white/5 hover:border-[#c0a080]/30 transition-all duration-500 group">
                               <OptimizedImage
                                src={src} 
                                alt="Signature Dish" 
                                className="w-full h-full"
                                imageClassName="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                                variant="THUMBNAIL"
                               />
                           </RevealOnScroll>
                       ))}
                   </div>
              </section>
          </StickySection>

           {/* 4. Services Grid (Sticky Layer 3) */}
           <StickySection zIndex={30} className="bg-[#141414] border-t border-white/10 py-24" intrinsicHeight="100vh">
               <section className="max-w-7xl mx-auto px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#c0a080] opacity-5 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <RevealOnScroll className="text-center mb-12">
                        <h2 className="font-cinzel text-3xl text-white">{language === 'EN' ? "Services" : "Services"}</h2>
                    </RevealOnScroll>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
                        {services.map((svc, idx) => (
                            <RevealOnScroll key={idx} delay={idx * 50} className="text-center group p-6 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="w-12 h-1 bg-[#c0a080] mx-auto mb-6 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                <h3 className="font-cinzel text-lg text-white mb-3">{svc.title}</h3>
                                <p className="text-sm text-neutral-400 font-lato leading-relaxed max-w-xs mx-auto">
                                    {svc.desc}
                                </p>
                            </RevealOnScroll>
                        ))}
                    </div>

                    <RevealOnScroll className="border-t border-white/10 pt-16">
                        <h3 className="font-cinzel text-xl text-[#c0a080] mb-8 text-center tracking-widest">
                            {language === 'EN' ? "Past Menu Examples" : "Exemples de Menus Passés"}
                        </h3>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                            {pastMenus.map((menu, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleMenuClick(menu)}
                                    className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-[#c0a080] hover:border-[#c0a080] transition-all duration-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="text-[#c0a080] group-hover:text-black w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    <span className="font-lato text-xs uppercase tracking-widest text-neutral-300 group-hover:text-black font-bold">
                                        {menu.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </RevealOnScroll>

                    <div className="text-center mt-16">
                        <a 
                            href="https://www.lesalondesinconnus.com/soumissioncuisine"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-10 py-4 bg-[#c0a080] hover:bg-[#a08060] text-black font-cinzel font-bold text-sm uppercase tracking-widest rounded transition-all shadow-[0_0_20px_rgba(192,160,128,0.3)] hover:scale-105"
                        >
                            {language === 'EN' ? "Request a Quote" : "Demander une Soumission"}
                        </a>
                    </div>
               </section>
           </StickySection>

      </main>

      {/* MODAL */}
      {selectedMenu && (
          <MenuModal menu={selectedMenu} onClose={() => setSelectedMenu(null)} />
      )}

       <style>{`
        .animate-fadeIn {
            animation: fadeInPage 1s ease-out forwards;
        }
        .animate-scaleIn {
            animation: scaleIn 0.3s ease-out forwards;
            opacity: 0;
            transform: scale(0.9);
        }
        @keyframes fadeInPage {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            to { opacity: 1; transform: scale(1); }
        }
        .text-shadow-lg {
            text-shadow: 0 4px 30px rgba(0,0,0,0.8);
        }
        .perspective-1000 {
            perspective: 1000px;
        }
        .transform-style-3d {
            transform-style: preserve-3d;
        }
        .backface-hidden {
            backface-visibility: hidden;
        }
        .rotate-y-180 {
            transform: rotateY(180deg);
        }
      `}</style>

    </div>
  );
};
