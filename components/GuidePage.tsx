
import React, { useEffect, useState } from 'react';

interface GuidePageProps {
  onNavigate: () => void;
  language: 'EN' | 'FR';
}

const Icons = {
  Compass: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  Feather: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>,
  Envelope: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>,
  Phone: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
};

export const GuidePage: React.FC<GuidePageProps> = ({ onNavigate, language }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
        // Simulate API call
        setTimeout(() => {
            setIsSubmitted(true);
            setEmail('');
        }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#121212] text-[#f3e5ab] custom-scrollbar font-sans selection:bg-[#c5a059] selection:text-[#1e1e24]">
      
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/dark-leather.png")` }}></div>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/stardust.png")` }}></div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#121212]/90 backdrop-blur-md border-b border-[#c5a059]/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div 
             className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
             onClick={onNavigate}
          >
             <div className="w-6 h-6 text-[#c5a059]"><Icons.Compass /></div>
             <span className="font-prata font-bold text-lg tracking-widest hidden md:block text-[#f3e5ab]">
                 {language === 'EN' ? "Local Guide" : "Guide Local"}
             </span>
          </div>
          <button 
                onClick={onNavigate}
                className="flex items-center gap-2 px-5 py-2 rounded border border-[#c5a059]/40 hover:border-[#c5a059] bg-[#1a1a1a] hover:bg-[#c5a059]/10 hover:text-[#c5a059] transition-all duration-300 font-josefin text-xs uppercase tracking-widest text-neutral-400"
            >
                ← {language === 'EN' ? "Return" : "Retour"}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full h-full min-h-screen flex flex-col justify-center items-center px-6 py-24">
           
           <div className="max-w-2xl w-full text-center animate-fadeInUp">
               
               {/* Icon Animation */}
               <div className="w-24 h-24 mx-auto mb-8 text-[#c5a059] opacity-80 relative">
                   <div className="absolute inset-0 animate-pulse opacity-50"><Icons.Compass /></div>
                   <div className="absolute inset-0 animate-bounce-slow"><Icons.Feather /></div>
               </div>

               <span className="text-[#c5a059] font-josefin text-sm uppercase tracking-[0.4em] mb-6 block border-b border-[#c5a059]/30 pb-4 mx-auto w-32">
                   {language === 'EN' ? "Coming Soon" : "Bientôt"}
               </span>

               <h1 className="font-prata text-5xl md:text-7xl text-[#f3e5ab] mb-8 drop-shadow-lg leading-tight">
                   {language === 'EN' ? "Guide in Drafting" : "Guide en Rédaction"}
               </h1>

               <p className="font-josefin text-neutral-400 text-lg md:text-xl leading-relaxed mb-12 tracking-wide font-light">
                   {language === 'EN' 
                    ? "We are currently exploring the hidden trails and secret spots of Petite-Nation to curate the perfect experience for you." 
                    : "Nous explorons actuellement les sentiers cachés et les lieux secrets de la Petite-Nation pour vous concocter l'expérience parfaite."}
               </p>

               {/* Form Section */}
               <div className="bg-[#18181b] border border-[#c5a059]/30 p-8 md:p-12 rounded-2xl shadow-2xl relative overflow-hidden group hover:border-[#c5a059]/60 transition-colors duration-500 mb-12">
                   {/* Decorative Corner */}
                   <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-[#c5a059]/20 rounded-tr-xl"></div>
                   <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-[#c5a059]/20 rounded-bl-xl"></div>

                   {!isSubmitted ? (
                       <form onSubmit={handleSubmit} className="relative z-10">
                           <label className="block font-cinzel text-[#f3e5ab] text-xl mb-6 tracking-widest">
                               {language === 'EN' ? "Want to be part of it?" : "Voulez-vous en faire partie ?"}
                           </label>
                           <p className="text-neutral-500 text-xs font-josefin uppercase tracking-wider mb-8">
                               {language === 'EN' 
                                ? "Join our mailing list to receive the guide upon release." 
                                : "Rejoignez notre liste pour recevoir le guide dès sa sortie."}
                           </p>
                           
                           <div className="flex flex-col md:flex-row gap-4">
                               <input 
                                   type="email" 
                                   required
                                   value={email}
                                   onChange={(e) => setEmail(e.target.value)}
                                   placeholder="email@address.com"
                                   className="flex-1 bg-[#121212] border border-[#333] text-[#f3e5ab] px-6 py-4 rounded-lg focus:outline-none focus:border-[#c5a059] transition-colors placeholder-neutral-700 font-josefin tracking-wider"
                               />
                               <button 
                                   type="submit"
                                   className="bg-[#c5a059] hover:bg-[#dcb055] text-[#1e1e24] font-bold font-josefin uppercase tracking-[0.2em] px-8 py-4 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg"
                               >
                                   {language === 'EN' ? "Join" : "Rejoindre"}
                               </button>
                           </div>
                       </form>
                   ) : (
                       <div className="relative z-10 py-4 animate-fadeIn">
                           <div className="text-[#c5a059] text-4xl mb-4 flex justify-center">
                               <Icons.Envelope />
                           </div>
                           <h3 className="font-prata text-2xl text-[#f3e5ab] mb-2">
                               {language === 'EN' ? "Welcome to the Circle" : "Bienvenue dans le Cercle"}
                           </h3>
                           <p className="text-neutral-400 font-josefin text-sm uppercase tracking-widest">
                               {language === 'EN' ? "We'll be in touch soon." : "Nous vous contacterons bientôt."}
                           </p>
                       </div>
                   )}
               </div>

               {/* Business Promotion CTA */}
               <div className="relative animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                   <div className="w-16 h-px bg-[#c5a059]/30 mx-auto mb-8"></div>
                   
                   <h3 className="font-cinzel text-[#c5a059] text-lg mb-4 tracking-widest">
                       {language === 'EN' ? "Business Owner?" : "Propriétaire d'entreprise ?"}
                   </h3>
                   
                   <p className="font-lato text-neutral-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                       {language === 'EN' ? "Want to be promoted in the guide?" : "Vous voulez être promu dans le guide ?"}
                   </p>
                   
                   <a 
                       href="tel:5144183450"
                       className="inline-flex items-center gap-3 px-8 py-3 border border-[#c5a059]/50 text-[#f3e5ab] rounded-full hover:bg-[#c5a059] hover:text-[#1e1e24] hover:border-[#c5a059] transition-all duration-300 font-josefin uppercase tracking-widest text-xs font-bold group"
                   >
                       <span className="group-hover:animate-bounce"><Icons.Phone /></span>
                       514 418 3450
                   </a>
               </div>

           </div>

      </main>

       <style>{`
        .animate-fadeInUp {
            animation: fadeInUp 1.0s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            opacity: 0;
            transform: translateY(30px);
        }
        .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
            opacity: 0;
        }
        @keyframes fadeInUp {
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
            to { opacity: 1; }
        }
        .animate-bounce-slow {
            animation: bounce 3s infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #121212;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c5a059;
            border-radius: 3px;
        }
        .font-prata { font-family: 'Prata', serif; }
        .font-josefin { font-family: 'Josefin Sans', sans-serif; }
      `}</style>
    </div>
  );
};
