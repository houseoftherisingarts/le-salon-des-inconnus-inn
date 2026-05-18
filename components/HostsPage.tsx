
import React, { useEffect } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { SeoBlock } from './SeoBlock';

interface HostsPageProps {
  onNavigate: (view: 'INN' | 'MASSOTHERAPY') => void;
  language: 'EN' | 'FR';
}

// --- ICONS ---
const Icons = {
    FleurDeLys: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-1.343-3-3-1.343-3-3-3zm0 6c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-2.239-5-5-5zm-5 5H3m14 0h4" /></svg>,
    Sparkle: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
}

// --- SUB-COMPONENTS ---

const IntroSection: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => (
    <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center bg-[#050505] z-0 px-6 text-center border-b border-[#d4af37]/20">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paisley.png')]"></div>
        
        <div className="relative z-10 animate-fadeInUp max-w-4xl mx-auto">
            <div className="inline-block mb-8">
                <div className="border-y border-[#d4af37] py-2 px-8 bg-black/50 backdrop-blur-sm">
                    <span className="text-xs font-bold uppercase tracking-[0.5em] text-[#d4af37] font-cinzel">
                        {language === 'EN' ? "The Soul of the Place" : "L'Âme du Lieu"}
                    </span>
                </div>
            </div>
            
            <h1 className="font-cinzel text-5xl sm:text-7xl md:text-9xl text-white mb-8 tracking-widest drop-shadow-2xl text-shadow-gold break-words">
                {language === 'EN' ? "THE HOSTS" : "L'ÉQUIPE"}
            </h1>
            
            <p className="font-lato text-neutral-400 text-lg md:text-xl font-light tracking-wide leading-relaxed">
                {language === 'EN' 
                    ? "Meet the guardians of Maison Favier. A collective of artists, dreamers, and creators dedicated to the art of hospitality." 
                    : "Rencontrez les gardiens de la Maison Favier. Un collectif d'artistes, de rêveurs et de créateurs dédiés à l'art de l'hospitalité."}
            </p>
            
            <div className="mt-16 animate-bounce text-[#d4af37]/50 text-2xl">
                <Icons.FleurDeLys />
            </div>
        </div>
    </div>
);

const HostHero: React.FC<{ host: any; index: number; language: 'EN' | 'FR' }> = ({ host, index, language }) => (
    <div 
        className={`sticky top-0 min-h-[50vh] md:h-screen w-full overflow-hidden bg-[#050505] border-t border-[#d4af37]/30 flex items-center shadow-[0_-20px_60px_rgba(0,0,0,0.8)] ${host.action ? 'cursor-pointer group' : ''}`}
        style={{ zIndex: index + 10 }}
        onClick={host.action}
    >
        {/* Background Image */}
        <div className="absolute inset-0">
            <OptimizedImage 
                src={host.image} 
                alt={host.name}
                className="w-full h-full"
                imageClassName="w-full h-full object-cover transition-transform duration-[30s] hover:scale-105"
                variant="HERO"
                priority={index === 0} // Only eager load the first host
                imageStyle={{ 
                    // Ensure the face is visible on mobile by prioritizing top-center
                    objectPosition: host.objectPosition || '50% 20%', 
                    ...(host.imageStyle || {})
                }}
            />
            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90 pointer-events-none"></div>
            
            {/* Hover indicator for actionable items */}
            {host.action && (
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 pointer-events-none"></div>
            )}
        </div>
        
        {/* Content - Justify Center for vertical centering, Left align for text */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col justify-end md:justify-center h-full pb-12 md:pb-0">
            <div className="max-w-3xl">
                <div className="flex items-center gap-4 mb-6 animate-slideRight" style={{ animationDelay: '0.2s' }}>
                    <div className="h-px w-12 bg-[#d4af37]"></div>
                    <span className="text-[#d4af37] font-cinzel text-xs md:text-sm tracking-[0.4em] uppercase font-bold">
                        {host.role}
                    </span>
                </div>
                
                <h2 className="text-5xl md:text-8xl font-cinzel text-white mb-8 drop-shadow-lg leading-tight animate-slideRight group-hover:text-[#d4af37] transition-colors duration-500" style={{ animationDelay: '0.4s' }}>
                    {host.name}
                </h2>
                
                <p className="font-lato text-lg md:text-2xl text-neutral-300 font-light leading-relaxed border-l-2 border-[#d4af37]/50 pl-6 animate-slideRight max-w-2xl" style={{ animationDelay: '0.6s' }}>
                    {host.flavor}
                </p>

                {host.action && (
                     <div className="mt-8 animate-slideRight opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-2 text-[#d4af37] font-cinzel text-xs uppercase tracking-widest" style={{ animationDelay: '0.8s' }}>
                        <span>{language === 'EN' ? "View Services" : "Voir Services"}</span>
                        <span>→</span>
                     </div>
                )}
            </div>
        </div>
        
        {/* Decorative Index Number */}
        <div className="absolute top-24 right-6 md:bottom-12 md:right-12 text-white/5 font-cinzel text-[8rem] md:text-[15rem] font-bold select-none pointer-events-none leading-none">
            {index + 1}
        </div>
    </div>
);

const HallOfFameSection: React.FC<{ language: 'EN' | 'FR'; list: any[]; index: number }> = ({ language, list, index }) => (
    <div 
        className="sticky top-0 min-h-screen w-full bg-[#080808] border-t border-[#d4af37]/30 flex flex-col justify-center items-center py-24 px-6 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
        style={{ zIndex: index + 10 }}
    >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paisley.png')]"></div>
        
        <div className="relative z-10 max-w-5xl w-full text-center">
            <div className="inline-block mb-8">
                <span className="text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.4em] border-b border-[#d4af37]/30 pb-2">
                    {language === 'EN' ? "Legacy" : "Héritage"}
                </span>
            </div>
            
            <h2 className="font-prata text-4xl md:text-6xl text-white mb-16 tracking-wide">
                {language === 'EN' ? "Hall of Fame" : "Temple de la Renommée"}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                {list.map((person, idx) => (
                    <div key={idx} className="group flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-[#d4af37]/20">
                        {/* Icon Removed */}
                        <div>
                            <h3 className="font-cinzel text-white text-lg font-bold tracking-wide group-hover:text-[#d4af37] transition-colors">{person.name}</h3>
                            <p className="font-lato text-neutral-500 text-xs uppercase tracking-wider mt-1">{person.role}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-24 w-24 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mx-auto"></div>
            
            <p className="font-lato text-neutral-600 text-xs uppercase tracking-[0.2em] mt-8">
                © 2024 Le Salon des Inconnus
            </p>
        </div>
    </div>
);

// --- MAIN PAGE COMPONENT ---

export const HostsPage: React.FC<HostsPageProps> = ({ onNavigate, language }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const hosts = [
    {
      name: "Alex T. St-Laurent",
      role: language === 'EN' ? "The Innkeeper" : "L'Aubergiste",
      image: "https://storage.googleapis.com/salondesinconnus/Artistes/profle%20wide.jpg", 
      flavor: language === 'EN' ? "Guardian of the keys and keeper of the flame. Orchestrating the unseen magic of the Salon." : "Gardien des clés et porteur de la flamme. Orchestrant la magie invisible du Salon.",
      objectPosition: "top"
      // Removed flip/nudge for the new wide picture
    },
    {
      name: "Evinali T. St-Laurent",
      role: language === 'EN' ? "The Storyteller" : "Le Conteur",
      image: "https://storage.googleapis.com/salondesinconnus/Artistes/evi%20wide.png",
      flavor: language === 'EN' ? "Weaving tales and connections with the threads of time, creating the narrative fabric of the house." : "Tissant des récits et des liens avec les fils du temps, créant le tissu narratif de la maison.",
      objectPosition: "top"
    },
    {
      name: "Aliel St-Laurent",
      role: language === 'EN' ? "Cuteness Officer" : "Préposé en Cuteness",
      image: "https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg",
      flavor: language === 'EN' ? "A bundle of energy with a playful heart, he brings life to the evenings." : "Boule d'énergie au coeur joueur, il anime les soirées.",
      objectPosition: "50% 25%" // Reframed to upper third
    },
    {
      name: "Andrée Dancause",
      role: "Massothérapie & Entretien",
      image: "/andree-temp-wide-noname.png",
      flavor: language === 'EN' ? "Restoring balance to weary travelers with hands guided by intuition and experience." : "Rétablissant l'équilibre des voyageurs fatigués avec des mains guidées par l'intuition et l'expérience.",
      objectPosition: "50% 35%", // Raised 40px (approx 10%) higher in frame (panning down image)
      action: () => onNavigate('MASSOTHERAPY')
    }
  ];

  const hallOfFame = [
    { name: "Kamy Rheault", role: language === 'EN' ? "Initial Co-Founder" : "Co-Fondatrice Initiale" },
    { name: "Cedric & Justine", role: language === 'EN' ? "Gardens" : "Jardins" },
    { name: "Laurie Belhumeur", role: language === 'EN' ? "Project Partner" : "Partenaire du Projet" },
    { name: "Elise Lortie", role: language === 'EN' ? "Special Care and Design" : "Soins Spéciaux et Design" },
    { name: "Shakti", role: language === 'EN' ? "Garden Care" : "Soins des Jardins" },
    { name: "Ghost in the Light", role: "Homme à tout faire" },
    { name: "Anais, Mango, & Team", role: language === 'EN' ? "Creative Help" : "Aide Créative" },
  ];

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeIn custom-scrollbar font-sans selection:bg-[#d4af37] selection:text-black">
       
       {/* Global Header */}
      <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-[#050505] to-transparent backdrop-blur-[1px] transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          {/* Brand — matches the global SiteHeader: Maison Favier logo + "Le Salon des Inconnus" */}
          <button
            type="button"
            onClick={() => onNavigate('INN')}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <img
              src="https://i.imgur.com/B1YfPqn.png"
              alt="Le Salon des Inconnus"
              className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="hidden sm:block font-cinzel text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 group-hover:text-white/90 transition-colors">
              Le Salon des Inconnus
            </span>
          </button>
          <button 
                onClick={() => onNavigate('INN')}
                className="flex items-center gap-2 px-5 py-2 rounded-sm border border-[#d4af37]/30 hover:border-[#d4af37] bg-black/20 backdrop-blur hover:bg-[#d4af37] hover:text-black transition-all duration-300 font-cinzel text-xs uppercase tracking-widest text-[#d4af37]"
            >
                {language === 'EN' ? "Back" : "Retour"}
            </button>
        </div>
      </header>

      {/* Main Scroll Container */}
      <main className="relative w-full">
          
          {/* 1. Intro Layer (Base) */}
          <IntroSection language={language} />

          {/* 2. Host Layers (Sticky Stack) */}
          {hosts.map((host, idx) => (
              <HostHero 
                  key={idx} 
                  host={host} 
                  index={idx} 
                  language={language} 
              />
          ))}

          {/* 3. Hall of Fame (Final Layer) */}
          <HallOfFameSection
              language={language}
              list={hallOfFame}
              index={hosts.length}
          />

          <SeoBlock viewKey="HOSTS" language={language} />

      </main>

       <style>{`
        .animate-fadeIn {
            animation: fadeInPage 1s ease-out forwards;
        }
        .animate-fadeInUp {
            animation: fadeInUp 1.2s ease-out forwards;
            opacity: 0;
            transform: translateY(30px);
        }
        .animate-slideRight {
            animation: slideRight 1s ease-out forwards;
            opacity: 0;
            transform: translateX(-30px);
        }
        @keyframes fadeInPage {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeInUp {
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
            to { opacity: 1; transform: translateX(0); }
        }
        .text-shadow-gold {
            text-shadow: 0 0 20px rgba(212,175,55,0.3);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
            border: 1px solid #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d4af37;
        }
      `}</style>

    </div>
  );
};
