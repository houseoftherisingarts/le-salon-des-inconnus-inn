
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ARTISTS_ROSTER } from './roster';
import { ArtistProfile } from './types';

// Imported from sdi-artist-caferepo. NOT mounted anywhere yet — this lives
// dormant in the package. It will eventually mount under the AUBERGE
// (aubergedesinconnus.com → /cafe or similar), as a casual-viewer showcase
// of "productions we've made" + "artists we represent". It is NOT a salon
// surface — the Salon (lesalondesinconnus.com) is the Artist Hub for deep
// users (artists managing profiles, buyers buying art).
// Future data wire: the artist roster shown here should be a live read from
// the Artist Hub on the salon side, so adding an artist there auto-updates
// what casual auberge viewers see.

export interface SdiCafeProps {
  language: 'EN' | 'FR';
}

type CreatorView = 'CINEMA' | 'GALLERY' | 'MUSIC' | 'CREATE' | 'ROSTER';

// --- DATA CONSTANTS ---

const PARTNER_PRODUCTIONS = [
    { title: "L'habitude de mourir", artist: "La Bronze", type: "Music Video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/vignes%20et%20cam.jpg" },
    { title: "Where the Witch Lives", artist: "Mariel Sharp", type: "Short Film", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/WHERE-THE-WITCH-LIVES_Mariel-Sharp_Director-Headshot-1-400x600.jpg" }
];

const SALON_PRODUCTIONS = {
    LIVE: [
        { title: "Improvisation No. 3", artist: "Sebastien Leblanc", type: "Live Session", url: "#", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/thumbnail%20sebastien%20leblanc%20one%20for%20all%201.png" },
        { title: "Salon Sessions Vol. 1", artist: "Collectif", type: "Full Set", url: "#", thumb: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=1000&auto=format&fit=crop" }
    ],
    CLIPS: [
        { title: "Fallin", artist: "Leslie", type: "Music Video", url: "#", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/EXP15_1.48.1.png" },
        { title: "Fille des bois", artist: "Tania Martin", type: "Music Video", url: "#", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/oqqArs4S41o-HD.jpg" }
    ],
    VISUAL: [
        { title: "Magnetosphere", artist: "Magnetosphere", type: "Visual Art", url: "#", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/buJf1H0Im6w-HD.jpg" },
        { title: "Futuristic Slums", artist: "Jean-Guilhem", type: "Digital Art", url: "#", thumb: "https://storage.googleapis.com/salondesinconnus/Artistes/jean-guilhem-bargues-futuristic-slums-small.jpg" }
    ]
};

const CREATOR_GALLERY = [
    { id: 1, title: "Exils créatifs 1-4", desc: "Le Salon des Inconnus X Art Xterra", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=1000&auto=format&fit=crop", span: "row-span-2 col-span-2" },
    { id: 2, title: "Vernishow", desc: "Gathering of minds", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000&auto=format&fit=crop", span: "col-span-1" },
    { id: 3, title: "Artistic Residency", desc: "Studio time", img: "https://images.unsplash.com/photo-1456086272160-b28b3a0b9234?q=80&w=1000&auto=format&fit=crop", span: "col-span-1" },
    { id: 4, title: "Midwife Gathering", desc: "Sacred circle", img: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1000&auto=format&fit=crop", span: "row-span-1 col-span-2" },
];

const CREATOR_MUSIC = [
    { title: "Morning Dew", artist: "Salon Collective", duration: "3:42" },
    { title: "River Stones", artist: "Alex T.", duration: "4:15" },
    { title: "Midnight Yule", artist: "Skarazula", duration: "5:02" },
    { title: "Echoes of the Inn", artist: "Resident Jam", duration: "12:30" },
    { title: "Improvisation No. 1", artist: "Sebastien Leblanc", duration: "8:10" },
    { title: "L'Habitude de Mourir", artist: "La Bronze", duration: "3:55" }
];

export const SdiCafe: React.FC<SdiCafeProps> = ({ language }) => {
  const [creatorView, setCreatorView] = useState<CreatorView>('CINEMA');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Local state for artists
  const [artists, setArtists] = useState<ArtistProfile[]>(ARTISTS_ROSTER);

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

  const getTabColor = (tab: CreatorView) => creatorView === tab ? 'text-[#2C1A1D] border-b-2 border-[#2C1A1D] font-bold' : 'text-[#8a7a6a] hover:text-[#2C1A1D] font-medium';

  const VideoCard = ({ vid, overlayColor = "bg-black" }: { vid: any, overlayColor?: string }) => (
      <a 
        href={vid.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative cursor-pointer block"
      >
          <div className={`relative aspect-video ${overlayColor} rounded-sm shadow-lg overflow-hidden border-4 border-white transform rotate-1 group-hover:rotate-0 transition-transform duration-500`}>
              <img src={vid.thumb} alt={vid.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl border border-white/50 group-hover:scale-110 transition-transform">▶</span>
              </div>
          </div>
          <div className="mt-2 text-center">
              <h3 className="font-cinzel text-lg text-[#2C1A1D] leading-tight">{vid.title}</h3>
              <p className="text-xs text-[#8a7a6a] uppercase tracking-wider">{vid.type} — {vid.artist}</p>
          </div>
      </a>
  );

  // Amenities for the "Bilbo's Book"
  const amenitiesList = [
      { 
          category: language === 'EN' ? "Shelter & Comfort" : "Gîte & Confort", 
          items: ["Maison Isolée", "Yourte (Ger)", "Spa / Jacuzzi", "Chambres Privées"],
          icon: "🏠" 
      },
      { 
          category: language === 'EN' ? "Artificer's Tools" : "Outils d'Artisan", 
          items: ["Caméras Blackmagic", "Consoles d'Enregistrement", "Micros", "Éclairage Studio"],
          icon: "🎥"
      },
      { 
          category: language === 'EN' ? "Instruments of Bards" : "Instruments de Bardes", 
          items: ["Grand Piano", "Guitars", "Handpan", "Flûtes"],
          icon: "🎻"
      },
      { 
          category: language === 'EN' ? "Tomes & Games" : "Tomes & Jeux", 
          items: ["Espace Coworking", "Bibliothèque d'Art", "Jeux de Société", "Projecteurs"],
          icon: "🎲"
      },
  ];

  return (
    <div className="min-h-screen w-full absolute inset-0 z-50 animate-fadeIn scroll-smooth font-sans overflow-hidden bg-[#E6DDC6] transition-colors duration-1000">
      
      {/* Import Handwritten Fonts */}
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cedarville+Cursive&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
          .font-handwritten { font-family: 'Cedarville Cursive', cursive; }
          .font-journal { font-family: 'Patrick Hand', cursive; }
          
          .animate-fadeIn {
              animation: fadeInPage 0.8s ease-out forwards;
          }
          @keyframes fadeInPage {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.05);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(100, 100, 100, 0.2);
              border-radius: 3px;
          }
          .perspective-1000 {
              perspective: 1000px;
          }
          .bg-graph-paper {
            background-color: #fdfbf7;
            background-image: 
              linear-gradient(#e5e5e5 1px, transparent 1px),
              linear-gradient(90deg, #e5e5e5 1px, transparent 1px);
            background-size: 20px 20px;
          }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-md border-b shadow-sm transition-colors duration-500 bg-[#E6DDC6]/90 border-[#2C1A1D]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src="https://i.imgur.com/B1YfPqn.png" alt="Logo" className="w-12 h-auto drop-shadow-lg filter invert opacity-80" />
             <span className="font-cinzel font-bold text-lg tracking-widest hidden md:block text-[#2C1A1D]">Le Salon des Inconnus</span>
          </div>
          <div className="flex gap-4 items-center">
            {/* Admin Toggle */}
            <button 
                onClick={toggleAdmin}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isAdminMode ? 'bg-red-900/50 border-red-500 text-red-200' : 'border-[#2C1A1D]/20 text-[#2C1A1D]/50 hover:text-[#2C1A1D]'}`}
            >
                ⚙
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 h-full overflow-y-auto custom-scrollbar font-lato relative">
          
          {/* Background Video */}
          <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-multiply z-0"
          >
              <source src="https://storage.googleapis.com/salondesinconnus/inn/Temp%20video%20site.mov" type="video/mp4" />
          </video>

          {/* Coffee Stains & Texture */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply z-0" />
          <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full border-[30px] border-[#4b3621] opacity-[0.03] blur-xl pointer-events-none" />

          <div className="w-full relative z-10 pt-12 pb-20">
              
              {/* Page Title */}
              <div className="text-center mb-12">
                  <h2 className="font-cinzel text-5xl md:text-6xl text-[#2C1A1D] mb-4 drop-shadow-sm tracking-wide">
                      {language === 'EN' ? "L'Atelier" : "L'Atelier"}
                  </h2>
                  <p className="font-serif italic text-xl text-[#5c4d40]">
                      {language === 'EN' ? "Morning Coffee & Creations" : "Café du Matin & Créations"}
                  </p>
              </div>

              {/* Navigation (Menu Board Style) */}
              <div className="flex justify-center gap-8 mb-16 border-b border-[#2C1A1D]/10 pb-4 max-w-4xl mx-auto flex-wrap px-4">
                  <button onClick={() => setCreatorView('CINEMA')} className={`text-sm uppercase tracking-widest pb-2 transition-all ${getTabColor('CINEMA')}`}>
                      {language === 'EN' ? "Cinema" : "Cinéma"}
                  </button>
                  <button onClick={() => setCreatorView('GALLERY')} className={`text-sm uppercase tracking-widest pb-2 transition-all ${getTabColor('GALLERY')}`}>
                      {language === 'EN' ? "Gallery" : "Galerie"}
                  </button>
                  <button onClick={() => setCreatorView('MUSIC')} className={`text-sm uppercase tracking-widest pb-2 transition-all ${getTabColor('MUSIC')}`}>
                      {language === 'EN' ? "Music" : "Musique"}
                  </button>
                    <button onClick={() => setCreatorView('ROSTER')} className={`text-sm uppercase tracking-widest pb-2 transition-all ${getTabColor('ROSTER')}`}>
                      {language === 'EN' ? "Portfolios" : "Portfolios"}
                  </button>
                  <button onClick={() => setCreatorView('CREATE')} className={`text-sm uppercase tracking-widest pb-2 transition-all ${getTabColor('CREATE')}`}>
                      {language === 'EN' ? "Create" : "Créer"}
                  </button>
              </div>

              {/* Content Views */}
              <div className="min-h-[500px]">
                  
                  {/* CINEMA VIEW */}
                  {creatorView === 'CINEMA' && (
                      <div className="animate-fadeIn space-y-16 max-w-7xl mx-auto px-6">
                          {/* SECTION 1: MADE BY THE SALON */}
                          <div className="relative">
                              <div className="flex items-center gap-4 mb-8">
                                  <h3 className="font-cinzel text-3xl text-[#2C1A1D] tracking-widest">
                                      {language === 'EN' ? "Made by the Salon" : "Productions Maison"}
                                  </h3>
                                  <div className="h-px bg-[#2C1A1D]/20 flex-grow"></div>
                              </div>

                              {/* Live Sessions */}
                              <div className="mb-12">
                                  <h4 className="font-cinzel text-xl text-[#b7410e] mb-6 flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                      Live Sessions
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {SALON_PRODUCTIONS.LIVE.map((vid, i) => (
                                          <VideoCard key={`live-${i}`} vid={vid} overlayColor="bg-[#1a1a1a]" />
                                      ))}
                                      {/* Promo Slot */}
                                      <div className="flex items-center justify-center border-2 border-dashed border-[#2C1A1D]/20 rounded-lg p-6 text-center group hover:bg-[#2C1A1D]/5 transition-colors cursor-pointer">
                                          <div>
                                              <p className="font-cinzel text-[#2C1A1D] mb-1">Book Your Session</p>
                                              <p className="text-xs text-[#8a7a6a]">Recording Available</p>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Videoclips */}
                              <div className="mb-12">
                                  <h4 className="font-cinzel text-xl text-[#b7410e] mb-6">Videoclips</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {SALON_PRODUCTIONS.CLIPS.map((vid, i) => (
                                          <VideoCard key={`clip-${i}`} vid={vid} />
                                      ))}
                                  </div>
                              </div>

                              {/* Visual Arts */}
                              <div className="mb-12">
                                  <h4 className="font-cinzel text-xl text-[#b7410e] mb-6">Visual Arts</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {SALON_PRODUCTIONS.VISUAL.map((vid, i) => (
                                          <VideoCard key={`vis-${i}`} vid={vid} overlayColor="bg-indigo-900" />
                                      ))}
                                  </div>
                              </div>
                          </div>

                          {/* SECTION 2: MADE BY PARTNERS */}
                          <div className="relative bg-[#2C1A1D] text-[#E6DDC6] p-8 rounded-xl border border-[#b7410e]/30 shadow-2xl">
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20 pointer-events-none"></div>
                              
                              <div className="flex items-center gap-4 mb-8 relative z-10">
                                  <div className="h-px bg-[#E6DDC6]/20 flex-grow"></div>
                                  <h3 className="font-cinzel text-3xl text-[#E6DDC6] tracking-widest text-center">
                                      {language === 'EN' ? "Made by Partners" : "Productions Partenaires"}
                                  </h3>
                                  <div className="h-px bg-[#E6DDC6]/20 flex-grow"></div>
                              </div>
                              
                              <p className="text-center font-lato text-sm text-[#E6DDC6]/60 mb-8 italic relative z-10">
                                  {language === 'EN' ? "Works filmed on-site by our residents and collaborators." : "Œuvres tournées sur place par nos résidents et collaborateurs."}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 relative z-10 px-0 md:px-12">
                                  {PARTNER_PRODUCTIONS.map((vid, i) => (
                                      <div key={`partner-${i}`} className="group relative">
                                          <a href={vid.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black shadow-2xl overflow-hidden border border-[#E6DDC6]/10 group-hover:border-[#b7410e] transition-colors">
                                                <img src={vid.thumb} alt={vid.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                  <span className="w-16 h-16 rounded-full border border-[#E6DDC6] flex items-center justify-center text-[#E6DDC6] text-2xl group-hover:bg-[#b7410e] group-hover:border-[#b7410e] transition-all">▶</span>
                                                </div>
                                          </a>
                                          <div className="mt-4 text-center">
                                              <h4 className="font-cinzel text-xl text-[#E6DDC6]">{vid.title}</h4>
                                              <p className="text-xs text-[#b7410e] uppercase tracking-widest mt-1">{vid.artist}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* GALLERY VIEW (Masonry/Scrapbook) */}
                  {creatorView === 'GALLERY' && (
                      <div className="animate-fadeIn grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px] max-w-7xl mx-auto px-6">
                          {CREATOR_GALLERY.map((item, i) => (
                              <div key={item.id} className={`relative group ${item.span} bg-white p-2 shadow-lg transform hover:-translate-y-1 transition-all duration-300`}>
                                  <div className="w-full h-full overflow-hidden relative bg-[#f4f4f4]">
                                      <img src={item.img} alt={item.title} className="w-full h-full object-cover filter sepia-[0.3] group-hover:sepia-0 transition-all duration-700" />
                                      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                          <p className="font-cinzel text-lg">{item.title}</p>
                                          <p className="text-xs font-serif italic">{item.desc}</p>
                                      </div>
                                  </div>
                                  {/* Tape effect */}
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#E6DDC6]/80 rotate-[-2deg] shadow-sm" />
                              </div>
                          ))}
                      </div>
                  )}

                  {/* MUSIC VIEW (Expanded Full Width) */}
                  {creatorView === 'MUSIC' && (
                      <div className="animate-fadeIn w-full px-4 md:px-12 pb-24">
                          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                              {/* Left: Vinyl Record Visual (Large) */}
                              <div className="flex justify-center lg:justify-end">
                                  <div className="w-72 h-72 md:w-[500px] md:h-[500px] rounded-full bg-[#111] relative shadow-2xl flex items-center justify-center border-4 border-[#222] group cursor-pointer">
                                      <div className="absolute inset-0 rounded-full border-[60px] border-[#1a1a1a] opacity-50" />
                                      <div className="absolute inset-12 rounded-full border border-[#333]/50" />
                                      <div className="absolute inset-24 rounded-full border border-[#333]/50" />
                                      <div className="absolute inset-36 rounded-full border border-[#333]/50" />
                                      
                                      {/* Label */}
                                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-[#b7410e] flex items-center justify-center text-center p-4 shadow-inner relative z-10 group-hover:scale-105 transition-transform duration-500">
                                          <div className="absolute inset-0 border-2 border-[#f0eebf]/30 rounded-full m-1 border-dashed"></div>
                                          <span className="font-cinzel text-[#f0eebf] text-xs md:text-sm tracking-widest leading-tight">
                                              SALON<br/>SESSIONS<br/>VOL. 1<br/>
                                              <span className="text-[8px] opacity-70 mt-2 block">EST. 2024</span>
                                          </span>
                                      </div>

                                      {/* Tonearm Hint */}
                                      <div className="absolute -top-10 -right-10 w-24 h-64 border-r-4 border-gray-400 rounded-tr-[100px] opacity-20 pointer-events-none transform rotate-12 origin-top"></div>
                                  </div>
                              </div>

                              {/* Right: Tracklist & Info (Wide) */}
                              <div className="w-full bg-white/40 backdrop-blur-md p-8 md:p-12 rounded-xl border border-[#2C1A1D]/10 shadow-lg relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-4 opacity-10">
                                      <span className="text-9xl font-cinzel text-[#2C1A1D]">♪</span>
                                  </div>

                                  <h3 className="font-cinzel text-4xl text-[#2C1A1D] mb-8 border-b-2 border-[#2C1A1D] pb-4 inline-block">
                                      {language === 'EN' ? "Recorded at the Salon" : "Enregistré au Salon"}
                                  </h3>
                                  
                                  <ul className="space-y-4 mb-12">
                                      {CREATOR_MUSIC.map((track, i) => (
                                          <li key={i} className="flex justify-between items-center group cursor-pointer hover:bg-white/60 p-3 rounded transition-colors border-b border-[#2C1A1D]/5 last:border-0">
                                              <div className="flex items-center gap-6">
                                                  <span className="text-[#b7410e] font-bold text-lg font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                                  <div>
                                                      <p className="font-bold text-[#2C1A1D] text-lg font-cinzel group-hover:translate-x-1 transition-transform">{track.title}</p>
                                                      <p className="text-sm text-[#8a7a6a] italic font-serif">{track.artist}</p>
                                                  </div>
                                              </div>
                                              <span className="text-sm text-[#8a7a6a] font-mono border border-[#8a7a6a]/20 px-2 py-1 rounded">{track.duration}</span>
                                          </li>
                                      ))}
                                  </ul>

                                  {/* Live Session Application Card - Integrated */}
                                  <div className="bg-[#2C1A1D] rounded-lg p-6 text-[#E6DDC6] shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                                      <div>
                                          <h4 className="font-cinzel text-xl text-[#E6DDC6] mb-1">Book a Session</h4>
                                          <p className="text-xs text-[#E6DDC6]/60">Recording, Mixing, Mastering available on site.</p>
                                      </div>
                                      <a 
                                        href="mailto:alex@lesalondesinconnus.com?subject=Live Session Application"
                                        className="px-6 py-3 border border-[#b7410e] text-[#b7410e] hover:bg-[#b7410e] hover:text-[#E6DDC6] font-cinzel font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 whitespace-nowrap"
                                      >
                                          {language === 'EN' ? "Apply Now" : "Postuler"}
                                      </a>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ROSTER VIEW (Polaroids) */}
                  {creatorView === 'ROSTER' && (
                      <div className="animate-fadeIn grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 max-w-7xl mx-auto">
                          {artists.map((artist, i) => (
                              <div key={i} className="bg-white p-4 pb-8 shadow-xl transform rotate-1 hover:rotate-0 hover:scale-105 transition-all duration-300">
                                  <div className="aspect-[4/5] bg-gray-100 mb-4 overflow-hidden filter contrast-110">
                                      <img src={artist.avatarUrl} alt={artist.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                                  </div>
                                  <div className="text-center font-handwriting">
                                      <h3 className="font-cinzel text-xl text-[#2C1A1D]">{artist.name}</h3>
                                      <p className="text-sm text-[#b7410e] font-serif italic mt-1">{artist.class}</p>
                                      <a href={artist.links.website} className="text-xs text-[#8a7a6a] hover:text-[#2C1A1D] mt-2 inline-block border-b border-transparent hover:border-[#2C1A1D] transition-all">
                                          {artist.bio.split('.').pop()?.trim() || "Voir Portfolio"}
                                      </a>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                   {/* CREATE VIEW (The Architect's Sketchpad) */}
                  {creatorView === 'CREATE' && (
                      <div className="animate-fadeIn w-full relative pb-24 px-6 flex justify-center">
                            
                            {/* Main Container - The "Drafting Table" Paper */}
                            <div className="relative w-full max-w-7xl bg-[#fdfbf7] shadow-[0_10px_60px_rgba(0,0,0,0.15)] flex flex-col lg:flex-row overflow-hidden rounded-sm border border-neutral-200">
                                
                                {/* Background: Technical Graph Paper */}
                                <div className="absolute inset-0 bg-graph-paper opacity-50 pointer-events-none z-0"></div>
                                
                                {/* Background: Artistic Sketches (Faded overlay) */}
                                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-[0.08] pointer-events-none mix-blend-multiply z-0">
                                    <img 
                                        src="https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg" 
                                        className="w-full h-full object-cover grayscale contrast-150 filter sepia"
                                        style={{ maskImage: 'linear-gradient(to left, black, transparent)' }}
                                    />
                                </div>

                                {/* LEFT COLUMN: The Inventory (Spec Sheet) */}
                                <div className="lg:w-2/5 p-10 md:p-14 relative z-10 border-r border-neutral-300/50 bg-white/40 backdrop-blur-sm">
                                    
                                    <div className="mb-10">
                                        <h3 className="font-cinzel font-bold text-3xl text-[#333] tracking-widest uppercase mb-2">
                                            {language === 'EN' ? "Inventory" : "Inventaire"}
                                        </h3>
                                        <p className="font-lato text-xs text-neutral-500 uppercase tracking-wider">
                                            {language === 'EN' ? "Available Resources" : "Ressources Disponibles"}
                                        </p>
                                        <div className="w-16 h-1 bg-[#333] mt-4"></div>
                                    </div>

                                    <div className="space-y-12">
                                        {amenitiesList.map((cat, i) => (
                                            <div key={i} className="group">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity grayscale">{cat.icon}</span>
                                                    <h4 className="font-cinzel font-bold text-lg text-[#333] group-hover:text-[#b7410e] transition-colors">
                                                        {cat.category}
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 pl-2 border-l-2 border-neutral-200 group-hover:border-[#b7410e]/30 transition-colors">
                                                    {cat.items.map((item, j) => (
                                                        <div key={j} className="pl-4 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-[#b7410e] transition-colors"></div>
                                                            <span className="font-lato text-sm text-neutral-600 font-medium">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: The Blueprints (Calls to Action) */}
                                <div className="lg:w-3/5 p-10 md:p-14 relative z-10">
                                    <div className="mb-12 flex justify-between items-end">
                                        <div>
                                            <h3 className="font-cinzel font-bold text-3xl text-[#333] tracking-widest uppercase mb-2">
                                                {language === 'EN' ? "Blueprints" : "Projets"}
                                            </h3>
                                            <p className="font-lato text-xs text-neutral-500 uppercase tracking-wider">
                                                {language === 'EN' ? "Initiate a Collaboration" : "Lancer une Collaboration"}
                                            </p>
                                        </div>
                                        <div className="hidden md:block">
                                            <span className="font-handwritten text-4xl text-neutral-300 rotate-[-10deg] block">Drafting...</span>
                                        </div>
                                    </div>

                                    <div className="grid gap-6">
                                        {/* Card 1: Residency */}
                                        <a href="mailto:alex@lesalondesinconnus.com?subject=Residency" className="block group">
                                            <div className="relative p-8 border-2 border-dashed border-neutral-300 rounded-lg hover:border-[#333] hover:bg-white transition-all duration-300">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-cinzel font-bold text-xl text-[#333] uppercase group-hover:underline decoration-1 underline-offset-4">
                                                        {language === 'EN' ? "Residency" : "Résidence"}
                                                    </h4>
                                                    <span className="text-neutral-300 group-hover:text-[#b7410e] transition-colors text-2xl">✎</span>
                                                </div>
                                                <p className="font-lato text-neutral-600 text-sm leading-relaxed mb-6 group-hover:text-[#333]">
                                                    {language === 'EN' ? "Seek sanctuary to craft your masterpiece. A time of silence, nature, and artistic support." : "Chercher un sanctuaire pour créer. Silence, nature et soutien artistique."}
                                                </p>
                                                <div className="flex justify-end">
                                                    <span className="font-lato text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-[#b7410e] transition-colors flex items-center gap-2">
                                                        {language === 'EN' ? "Apply for Residency" : "Postuler"} →
                                                    </span>
                                                </div>
                                            </div>
                                        </a>

                                        {/* Card 2: Event */}
                                        <a href="mailto:alex@lesalondesinconnus.com?subject=Event" className="block group">
                                            <div className="relative p-8 border-2 border-dashed border-neutral-300 rounded-lg hover:border-[#333] hover:bg-white transition-all duration-300">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-cinzel font-bold text-xl text-[#333] uppercase group-hover:underline decoration-1 underline-offset-4">
                                                        {language === 'EN' ? "Gathering" : "Rassemblement"}
                                                    </h4>
                                                    <span className="text-neutral-300 group-hover:text-[#b7410e] transition-colors text-2xl">⊕</span>
                                                </div>
                                                <p className="font-lato text-neutral-600 text-sm leading-relaxed mb-6 group-hover:text-[#333]">
                                                    {language === 'EN' ? "Summon the folk for a feast, a workshop, a retreat, or a bardic circle." : "Rassembler pour un festin, un atelier, une retraite ou un cercle."}
                                                </p>
                                                <div className="flex justify-end">
                                                    <span className="font-lato text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-[#b7410e] transition-colors flex items-center gap-2">
                                                        {language === 'EN' ? "Propose Event" : "Proposer"} →
                                                    </span>
                                                </div>
                                            </div>
                                        </a>

                                        {/* Card 3: Collab */}
                                        <a href="mailto:alex@lesalondesinconnus.com?subject=Collab" className="block group">
                                            <div className="relative p-8 border-2 border-dashed border-neutral-300 rounded-lg hover:border-[#333] hover:bg-white transition-all duration-300">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-cinzel font-bold text-xl text-[#333] uppercase group-hover:underline decoration-1 underline-offset-4">
                                                        {language === 'EN' ? "Alliance" : "Alliance"}
                                                    </h4>
                                                    <span className="text-neutral-300 group-hover:text-[#b7410e] transition-colors text-2xl">⚡</span>
                                                </div>
                                                <p className="font-lato text-neutral-600 text-sm leading-relaxed mb-6 group-hover:text-[#333]">
                                                    {language === 'EN' ? "Have a wild idea? Let us forge something new together. Co-creation is our currency." : "Une idée folle ? Forgeons du nouveau ensemble. La co-création est notre monnaie."}
                                                </p>
                                                <div className="flex justify-end">
                                                    <span className="font-lato text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-[#b7410e] transition-colors flex items-center gap-2">
                                                        {language === 'EN' ? "Contact Us" : "Contacter"} →
                                                    </span>
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                    
                                    {/* Footer Note */}
                                    <div className="mt-12 text-center">
                                        <p className="font-lato text-[10px] uppercase tracking-widest text-neutral-400">
                                            {language === 'EN' ? "Le Salon des Inconnus • Est. 1898" : "Le Salon des Inconnus • Est. 1898"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                      </div>
                  )}
              </div>
          </div>
      </main>
    </div>
  );
};
