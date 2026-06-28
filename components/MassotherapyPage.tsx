
import React, { useEffect, useState, useRef } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { SeoBlock } from './SeoBlock';

interface MassotherapyPageProps {
  onNavigate: (view: 'INN') => void;
  language: 'EN' | 'FR';
}

// --- ICONS ---
const Icons = {
    Leaf: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
    Face: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Foot: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
    Lotus: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c.67 0 1.25.5 1.25 1.25v2.25c0 .67.5 1.25 1.25 1.25 1.25 1.25h2.25c.67 0 1.25.5 1.25 1.25v-2.25c0-.67-.5-1.25-1.25-1.25H12c-.67 0-1.25-.5-1.25-1.25v-2.25c0-.67.5-1.25 1.25-1.25H7.25c-.67 0-1.25-.5-1.25-1.25v-2.25c0-.67.5-1.25 1.25-1.25h2.25c.67 0 1.25-.5 1.25-1.25V7c0-.67.5-1.25 1.25-1.25h2.25c.67 0 1.25-.5 1.25-1.25V3.5c0-.67.5-1.25 1.25-1.25z" /></svg>,
    Heart: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
    Card: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
}

// --- UTILITIES (DUPLICATED FOR STABILITY) ---

const RevealOnScroll: React.FC<{ children: React.ReactNode; className?: string; delay?: number; animation?: 'fadeUp' | 'fadeIn' | 'slideRight' | 'slideLeft' }> = ({ children, className = "", delay = 0, animation = 'fadeUp' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible) return; 

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
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
                // Fix for mobile overlaying too early: Add offset
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

// --- MAIN PAGE ---

export const MassotherapyPage: React.FC<MassotherapyPageProps> = ({ onNavigate, language }) => {
  const [isProfileFlipped, setIsProfileFlipped] = useState(false);
  const [activeTreatment, setActiveTreatment] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    // Hide this page from search engines — massotherapy has been spun off to
    // salonlenvolee.com. Page kept available at /massage for emergency reference only.
    let prev: string | null = null;
    let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (tag) prev = tag.content;
    else {
      tag = document.createElement('meta');
      tag.name = 'robots';
      document.head.appendChild(tag);
    }
    tag.content = 'noindex, nofollow';
    return () => {
      if (tag && prev !== null) tag.content = prev;
      else if (tag) tag.remove();
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isProfileFlipped) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8; 
      const rotateY = ((x - centerX) / centerX) * 8;
      setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
  };

  const treatments = [
    {
      id: 0,
      title: language === 'EN' ? "Relaxation & Swedish" : "Massage de Détente",
      desc: language === 'EN' ? "Classic relaxation. Long, gliding strokes to improve circulation and reduce stress. A gentle introduction to wellness." : "Relaxation classique. Mouvements longs et fluides pour améliorer la circulation et réduire le stress.",
      delay: '0s',
      icon: <Icons.Leaf />
    },
    {
      id: 1,
      title: language === 'EN' ? "Therapeutic & Deep Tissue" : "Thérapeutique & Tissus Profonds",
      desc: language === 'EN' ? "Targeted work for chronic tension. Release deep-seated muscle knots and restore mobility." : "Travail ciblé pour les tensions chroniques. Libération des nœuds musculaires profonds et restauration de la mobilité.",
      delay: '100ms',
      icon: <Icons.Face />
    },
    {
      id: 2,
      title: language === 'EN' ? "Plantar Reflexology" : "Réflexologie Plantaire",
      desc: language === 'EN' ? "Stimulation of reflex points on the feet to promote healing and balance throughout the body." : "Stimulation des points réflexes des pieds pour favoriser la guérison et l'équilibre dans tout le corps.",
      delay: '200ms',
      icon: <Icons.Foot />
    },
    {
      id: 3,
      title: language === 'EN' ? "Reiki Energy Care" : "Soins Énergétiques Reiki",
      desc: language === 'EN' ? "A gentle laying on of hands to channel energy, reduce stress, and promote emotional healing." : "Une imposition douce des mains pour canaliser l'énergie, réduire le stress et favoriser la guérison émotionnelle.",
      specialPrice: language === 'EN' ? "From $60" : "À partir de 60$",
      delay: '300ms',
      icon: <Icons.Sparkles />
    }
  ];

  const activeItem = activeTreatment !== null ? treatments.find(t => t.id === activeTreatment) : null;

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeIn custom-scrollbar font-sans selection:bg-[#d4af37] selection:text-black">
       
       {/* 1. Header (Fixed) */}
      <header className="fixed top-0 w-full z-[100] transition-all duration-500 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
        <div className="w-full px-8 py-6 flex justify-between items-center">
          {/* Left Side: Back & Title Combined */}
          <div 
             className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
             onClick={() => onNavigate('INN')}
          >
             <span className="text-xl text-[#d4af37] border border-[#d4af37]/30 rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors">←</span>
             <div className="flex flex-col">
                 <span className="font-cinzel font-bold text-lg tracking-[0.2em] text-[#d4af37] shadow-black drop-shadow-md leading-none">SANCTUAIRE</span>
                 <span className="text-[9px] uppercase tracking-[0.2em] font-lato text-white/50">{language === 'EN' ? "Return to Inn" : "Retour à l'Auberge"}</span>
             </div>
          </div>
          {/* Right Side: Empty to avoid overlap with Global Menu */}
          <div className="w-16"></div>
        </div>
      </header>

      <main className="relative w-full">
          
          {/* 2. Hero Section (Base Layer) */}
          <div className="relative z-0 h-[80vh] w-full" style={{ position: 'sticky', top: 0 }}>
                <OptimizedImage
                    src="/media/inn/andree%20banner.png" 
                    alt="Massotherapy Banner" 
                    className="w-full h-full"
                    imageClassName="w-full h-full object-cover brightness-75"
                    imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                    variant="HERO"
                    priority
                />
                <div className="absolute inset-0 bg-black/50"></div>
                
                {/* Hero Content */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center animate-slideUp drop-shadow-2xl">
                        {/* Adjusted text size for mobile */}
                        <h1 className="font-cinzel text-4xl md:text-8xl text-white mb-4 tracking-wider opacity-90 text-shadow-xl break-words max-w-full px-4">
                            {language === 'EN' ? "Massotherapy" : "Massothérapie"}
                        </h1>
                        <div className="w-20 h-px bg-[#d4af37] mx-auto mb-4 shadow-lg"></div>
                        <p className="font-lato text-[#d4af37] text-sm tracking-[0.3em] uppercase font-bold text-shadow-md">
                            {language === 'EN' ? "Restore • Balance • Heal" : "Rétablir • Équilibrer • Guérir"}
                        </p>
                    </div>
                </div>
          </div>

          {/* 3. Main Content Card (Sticky Overlay) */}
          <StickySection zIndex={10} className="bg-[#0b0c0b] rounded-t-[50px] shadow-[0_-20px_60px_rgba(0,0,0,1)] border-t border-white/5 pb-24">
               {/* Wood Texture Overlay */}
               <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
               
               {/* Decorative Top Element */}
               <div className="w-full flex justify-center -mt-8 relative z-20">
                   <div className="w-16 h-16 bg-[#0b0c0b] rounded-full flex items-center justify-center shadow-lg border-t border-white/10">
                       <span className="text-[#d4af37] text-xl animate-pulse"><Icons.Heart /></span>
                   </div>
               </div>

               {/* Philosophy Section */}
               <RevealOnScroll className="py-24 px-6 text-center max-w-4xl mx-auto relative z-10">
                   <span className="text-[#d4af37] text-xs font-bold uppercase tracking-[0.4em] mb-6 block">
                       {language === 'EN' ? "Our Philosophy" : "Notre Philosophie"}
                   </span>
                   <h2 className="font-cinzel text-3xl md:text-5xl text-white leading-tight mb-8">
                       {language === 'EN' 
                        ? "A dialogue between body and mind." 
                        : "Un dialogue silencieux entre le corps et l'esprit."}
                   </h2>
                   <p className="font-lato text-neutral-400 text-lg leading-relaxed">
                       {language === 'EN' 
                        ? "In the heart of nature, we offer a sanctuary where time slows down. Using natural oils and intuitive techniques, we help you reconnect with your inner calm." 
                        : "Au cœur de la nature, nous offrons un sanctuaire où le temps ralentit. En utilisant des huiles naturelles et des techniques intuitives, nous vous aidons à renouer avec votre calme intérieur."}
                   </p>
               </RevealOnScroll>

               {/* Harmonized Pricing Card */}
               <RevealOnScroll className="max-w-4xl mx-auto px-6 mb-24 relative z-10">
                   <div className="bg-[#151515] text-[#F3F0E6] rounded-[40px] p-8 md:p-12 shadow-2xl border border-[#d4af37]/20 relative overflow-hidden text-center transform hover:scale-[1.01] transition-transform duration-700">
                       <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                       <h3 className="font-cinzel text-3xl text-[#d4af37] mb-8 relative z-10 tracking-widest">{language === 'EN' ? "Harmonized Rates" : "Tarifs Harmonisés"}</h3>
                       <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-24 mb-10 relative z-10">
                           <div className="flex flex-col items-center group">
                               <span className="font-lato text-sm uppercase tracking-widest text-neutral-500 mb-2 group-hover:text-white transition-colors">60 Minutes</span>
                               <span className="font-cinzel text-5xl group-hover:scale-110 transition-transform duration-300 text-white">90$</span>
                           </div>
                           <div className="w-px h-20 bg-[#d4af37]/30 hidden md:block"></div>
                           <div className="h-px w-20 bg-[#d4af37]/30 md:hidden mx-auto"></div>
                           <div className="flex flex-col items-center group">
                               <span className="font-lato text-sm uppercase tracking-widest text-neutral-500 mb-2 group-hover:text-white transition-colors">90 Minutes</span>
                               <span className="font-cinzel text-5xl group-hover:scale-110 transition-transform duration-300 text-white">120$</span>
                           </div>
                       </div>
                       <div className="bg-white/5 rounded-2xl p-4 inline-block relative z-10 border border-white/10">
                           <p className="font-lato text-sm tracking-wide text-neutral-300">
                               <span className="text-[#d4af37] font-bold mr-2">✦ {language === 'EN' ? "DUO SPECIAL" : "SPÉCIAL DUO"} ✦</span> 
                               {language === 'EN' ? "$20 off for the second person (couples or friends)" : "20$ de rabais pour la 2ème personne (couples ou amis)"}
                           </p>
                       </div>
                   </div>
               </RevealOnScroll>

               {/* Floating Bubbles Services Section */}
               <section className="w-full px-4 md:px-12 space-y-6 mb-32 relative z-10">
                   <RevealOnScroll className="text-center mb-16">
                       <h3 className="font-cinzel text-3xl text-white">{language === 'EN' ? "Our Services" : "Nos Services"}</h3>
                       <div className="w-16 h-px bg-[#d4af37] mx-auto mt-4 opacity-60"></div>
                       <p className="text-[#d4af37] text-xs uppercase tracking-widest mt-4 animate-pulse font-bold">
                           {language === 'EN' ? "(Click bubbles to expand)" : "(Cliquez pour agrandir)"}
                       </p>
                   </RevealOnScroll>

                   <div className="flex flex-wrap justify-center gap-8 md:gap-12 px-4">
                       {treatments.map((item, idx) => (
                           <RevealOnScroll key={idx} delay={idx * 100} animation="fadeIn" className="relative z-10">
                               <div 
                                  onClick={() => setActiveTreatment(item.id)}
                                  className="w-72 h-72 md:w-80 md:h-80 rounded-full bg-[#151515] border border-[#d4af37]/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-8 text-center group relative overflow-hidden cursor-pointer hover:scale-105 hover:border-[#d4af37] transition-all duration-500 ease-out"
                               >
                                   <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] transition-opacity duration-500 group-hover:opacity-10"></div>
                                   <div className="absolute inset-4 rounded-full border border-[#d4af37]/10 pointer-events-none group-hover:border-[#d4af37]/30 transition-colors"></div>
                                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-100"></div>
                                   
                                   <div className="relative z-10">
                                       <div className="w-16 h-16 mx-auto mb-4 text-[#d4af37] group-hover:scale-110 transition-transform duration-500 drop-shadow-sm">
                                            {item.icon}
                                       </div>
                                       <h3 className="font-cinzel text-xl text-white mb-4 group-hover:text-[#d4af37] transition-colors font-bold">
                                           {item.title}
                                       </h3>
                                       <p className="font-lato text-neutral-400 text-xs leading-relaxed line-clamp-3 font-medium">
                                           {item.desc}
                                       </p>
                                       {item.specialPrice && (
                                           <span className="block mt-4 font-bold text-[#d4af37] bg-white/5 border border-[#d4af37]/30 px-3 py-1 rounded-full text-xs shadow-sm">
                                               {item.specialPrice}
                                           </span>
                                       )}
                                   </div>
                               </div>
                           </RevealOnScroll>
                       ))}
                   </div>
               </section>

               {/* EXPANDED BUBBLE MODAL */}
               {activeItem && (
                   <div 
                     className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
                     onClick={() => setActiveTreatment(null)}
                   >
                       <div 
                          className="w-[90vw] h-[90vw] md:w-[600px] md:h-[600px] rounded-full bg-[#101010] border-2 border-[#d4af37] shadow-[0_0_50px_rgba(212,175,55,0.2)] relative flex flex-col items-center justify-center text-center p-12 overflow-hidden animate-scaleIn"
                          onClick={(e) => e.stopPropagation()}
                       >
                            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                            <div className="absolute inset-6 rounded-full border border-dashed border-[#d4af37]/20 pointer-events-none"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-100"></div>
                            
                            <div className="relative z-10">
                                <div className="w-24 h-24 mx-auto mb-8 animate-bounce-slow drop-shadow-md text-[#d4af37]">
                                    {activeItem.icon}
                                </div>
                                <h3 className="font-cinzel text-3xl md:text-5xl text-white font-bold mb-6 leading-tight drop-shadow-sm">
                                    {activeItem.title}
                                </h3>
                                <p className="font-lato text-neutral-300 text-lg md:text-xl max-w-lg mx-auto leading-relaxed mb-8 font-medium">
                                    {activeItem.desc}
                                </p>
                                {activeItem.specialPrice && (
                                    <span className="inline-block font-bold text-[#d4af37] bg-white/5 border border-[#d4af37] px-6 py-2 rounded-full text-xl shadow-md">
                                        {activeItem.specialPrice}
                                    </span>
                                )}
                                <button 
                                  onClick={() => setActiveTreatment(null)}
                                  className="mt-12 text-neutral-500 hover:text-white uppercase tracking-[0.2em] text-xs border-b border-transparent hover:border-white transition-all font-bold"
                                >
                                    {language === 'EN' ? "Close" : "Fermer"}
                                </button>
                            </div>
                       </div>
                   </div>
               )}

               {/* Therapist Profile - 3D Flip Card with Tilt */}
               <section className="w-full max-w-5xl mx-auto px-4 mb-24 perspective-1000 z-30 relative">
                   {/* Container for Mouse Tracking (Tilt) */}
                   <div 
                      className="w-full h-full transform-style-3d transition-transform duration-200 ease-out"
                      style={{ 
                          transform: !isProfileFlipped 
                            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` 
                            : 'none' 
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                   >
                       {/* Container for Flip Animation */}
                       <div 
                         className={`relative w-full transition-transform duration-1000 transform-style-3d cursor-pointer group min-h-[280px] md:min-h-[500px] ${isProfileFlipped ? 'rotate-y-180' : ''}`}
                         onClick={() => setIsProfileFlipped(!isProfileFlipped)}
                       >
                           {/* FRONT FACE */}
                           <div className="absolute inset-0 backface-hidden">
                               {/* FLEX-ROW FORCED even on Mobile to mimic desktop layout */}
                               <div className="w-full h-full bg-[#134e4a] rounded-[30px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-row border border-[#d4af37]/20">
                                   
                                   {/* Image Container - 40% Width on Mobile */}
                                   <div className="w-[40%] md:w-1/2 relative h-full">
                                       <OptimizedImage
                                         src="/media/massage/Andre%CC%81e%20temp.png" 
                                         alt="Andrée Dancause" 
                                         className="w-full h-full"
                                         imageClassName="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                                         imageStyle={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                                         variant="CARD"
                                       />
                                       <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-black/60 backdrop-blur-md text-[#d4af37] text-[8px] md:text-[10px] px-2 py-1 md:px-3 md:py-1 rounded-full uppercase tracking-widest border border-[#d4af37]/30">
                                           {language === 'EN' ? "Info" : "Info"}
                                       </div>
                                   </div>
                                   
                                   {/* Text Container - 60% Width on Mobile */}
                                   <div className="w-[60%] md:w-1/2 p-4 pt-6 md:p-14 flex flex-col justify-center text-white relative">
                                       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                                       
                                       {/* RMPQ Logo Front - Scaled for corner alignment on mobile */}
                                       <img 
                                          src="/media/inn/rmpq%20logo%20transparent.png"
                                          alt="RMPQ Logo"
                                          className="absolute top-2 right-2 w-10 md:top-6 md:right-6 md:w-48 h-auto drop-shadow-xl z-20 brightness-0 invert opacity-70 pointer-events-none" 
                                       />
                                       
                                       <span className="text-[#d4af37] text-[8px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-4 relative z-10 mt-2 md:mt-0">
                                           {language === 'EN' ? "Expert Therapist" : "Massothérapeute Agréée"}
                                       </span>
                                       <h2 className="font-cinzel text-lg md:text-5xl mb-2 md:mb-6 relative z-10 text-white leading-tight">Andrée Dancause</h2>
                                       <p className="font-lato text-neutral-300 text-[9px] md:text-base leading-relaxed md:leading-loose mb-3 md:mb-8 relative z-10 font-light line-clamp-4 md:line-clamp-none">
                                            {language === 'EN' 
                                                ? "Certified therapist for over 10 years. Her practice is rooted in personalization and listening—not just to words, but to the subtle language of muscles." 
                                                : "Thérapeute certifiée depuis plus de 10 ans. Sa pratique est ancrée dans la personnalisation et l'écoute du langage subtil des muscles."}
                                       </p>
                                       <div className="flex flex-wrap gap-2 md:gap-3 relative z-10">
                                           <span className="px-2 py-1 md:px-4 md:py-2 bg-[#0f3c39] rounded-full text-[7px] md:text-xs uppercase tracking-widest border border-teal-800 text-teal-100 hover:bg-[#1a615d] transition-colors">
                                                {language === 'EN' ? "RMPQ" : "RMPQ"}
                                           </span>
                                           <span className="px-2 py-1 md:px-4 md:py-2 bg-[#0f3c39] rounded-full text-[7px] md:text-xs uppercase tracking-widest border border-teal-800 text-teal-100 hover:bg-[#1a615d] transition-colors">
                                                {language === 'EN' ? "Receipts" : "Reçus"}
                                           </span>
                                       </div>
                                   </div>
                               </div>
                           </div>

                           {/* BACK FACE */}
                           <div className="absolute inset-0 backface-hidden rotate-y-180">
                               <div className="w-full h-full bg-[#0f3c39] rounded-[30px] md:rounded-[40px] overflow-hidden shadow-2xl flex items-center justify-center relative border border-[#d4af37]/30">
                                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
                                    <img 
                                        src="/media/inn/rmpq%20logo%20transparent.png"
                                        alt="RMPQ Logo"
                                        className="absolute top-2 right-2 w-10 md:top-6 md:right-6 md:w-48 h-auto drop-shadow-xl z-20 brightness-0 invert opacity-70 pointer-events-none"
                                    />
                                    <div className="text-center p-6 md:p-12">
                                         <div className="w-12 h-12 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 bg-teal-900/50 rounded-full flex items-center justify-center border border-teal-500/30 text-[#d4af37] p-2 md:p-4">
                                             <Icons.Card />
                                         </div>
                                         <h3 className="font-cinzel text-lg md:text-3xl text-white mb-2 md:mb-4">{language === 'EN' ? "Member Information" : "Information Membre"}</h3>
                                         <div className="w-12 md:w-16 h-px bg-[#d4af37] mx-auto mb-4 md:mb-6"></div>
                                         <p className="font-lato text-neutral-300 text-sm md:text-xl tracking-wider">
                                             {language === 'EN' ? "Member Number" : "Numéro de membre"}
                                         </p>
                                         <p className="font-cinzel text-xl md:text-4xl text-[#d4af37] mt-1 md:mt-2 font-bold tracking-widest">
                                             21-7481
                                         </p>
                                         <p className="mt-4 md:mt-8 text-neutral-500 text-[8px] md:text-sm uppercase tracking-[0.2em]">RMPQ</p>
                                    </div>
                                    <button className="absolute bottom-4 md:bottom-8 text-white/50 text-[8px] md:text-xs uppercase tracking-widest hover:text-white transition-colors">
                                         {language === 'EN' ? "Click to flip back" : "Cliquer pour retourner"}
                                    </button>
                               </div>
                           </div>
                       </div>
                   </div>
               </section>

               {/* CTA Section */}
               <section className="text-center px-6">
                   <div className="inline-block p-10 border border-[#d4af37]/30 bg-[#151515] rounded-[30px] shadow-lg max-w-2xl w-full hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] transition-shadow duration-500">
                       <h3 className="font-cinzel text-2xl text-white mb-6">
                           {language === 'EN' ? "Book Your Session" : "Réservez Votre Séance"}
                       </h3>
                       <div className="flex flex-col sm:flex-row justify-center gap-4">
                           <a 
                             href="mailto:salonlenvolee@gmail.com"
                             className="px-8 py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest rounded-full hover:bg-[#c0a080] transition-colors shadow-lg hover:shadow-[#d4af37]/30"
                           >
                               {language === 'EN' ? "Email Request" : "Demande Courriel"}
                           </a>
                           <a 
                             href="tel:8194306763"
                             className="px-8 py-4 bg-transparent border border-[#d4af37] text-[#d4af37] font-cinzel font-bold text-sm uppercase tracking-widest rounded-full hover:bg-[#d4af37]/10 transition-colors"
                           >
                               819-430-6763
                           </a>
                       </div>
                   </div>
               </section>

          </StickySection>

          <SeoBlock viewKey="MASSOTHERAPY" language={language} />

      </main>

       <style>{`
        .animate-fadeIn {
            animation: fadeInPage 1s ease-out forwards;
        }
        .animate-slideUp {
            animation: slideUp 1.2s ease-out forwards;
            opacity: 0;
            transform: translateY(40px);
        }
        .animate-scaleIn {
            animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transform: scale(0.8);
            opacity: 0;
        }
        @keyframes scaleIn {
            to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInPage {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        .animate-bounce-slow {
            animation: bounce 2s infinite;
        }
        .text-shadow-xl {
            text-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .text-shadow-md {
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
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
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #d4af37;
            border-radius: 3px;
        }
      `}</style>

    </div>
  );
};
