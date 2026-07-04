import React, { useEffect } from 'react';
import { SeoBlock } from './SeoBlock';

interface PPSPageProps {
  onNavigate: (view: 'INN') => void;
  language: 'EN' | 'FR';
}

const CONCEPTS = [
  {
    titleFr: 'Beach Party', titleEn: 'Beach Party',
    descFr: "Un 5@7 estival : mur de plage réaliste, ambiance du Sud, olympiades combo. Idéal en extérieur, sur le terrain.",
    descEn: "A summer 5@7: realistic beach wall, southern vibe, combo olympics. Ideal outdoors, on the grounds.",
  },
  {
    titleFr: 'La Cabane à Jo', titleEn: 'The Cabane à Jo',
    descFr: "Animation hivernale, univers chaleureux et authentique de bûcheron. Le passé rencontre le présent.",
    descEn: "Winter animation, warm and authentic lumberjack world. The past meets the present.",
  },
  {
    titleFr: 'Tournoi Happy Gilmore', titleEn: 'Happy Gilmore Tournament',
    descFr: "Soirée thématique golf, mémorable pour un party de bureau, de Noël ou un mariage.",
    descEn: "Golf-themed evening, memorable for an office party, holiday event or wedding.",
  },
  {
    titleFr: 'Kermesse Fête Foraine', titleEn: 'Kermesse Fête Foraine',
    descFr: "Programmation pétillante façon fêtes foraines new-yorkaises d'époque : kiosques, accueil, jeux.",
    descEn: "Sparkling programming in the style of old New York fairgrounds: booths, welcome, games.",
  },
  {
    titleFr: 'Musique live', titleEn: 'Live music',
    descFr: "Chansonnier, DJ, duo, trio ou groupe complet : une offre musicale pour tous les styles.",
    descEn: "Singer-songwriter, DJ, duo, trio or full band: a musical offer for every style.",
  },
  {
    titleFr: 'Humour & magie', titleEn: 'Comedy & magic',
    descFr: "Des humoristes du réseau québécois, choisis pour bien s'accorder à votre événement.",
    descEn: "Comedians from the Quebec network, chosen to fit your event well.",
  },
  {
    titleFr: 'Team building', titleEn: 'Team building',
    descFr: "Activités ludiques intérieures ou extérieures pour renforcer la cohésion et le leadership d'équipe.",
    descEn: "Fun indoor or outdoor activities to strengthen team cohesion and leadership.",
  },
  {
    titleFr: 'Conférences', titleEn: 'Conferences',
    descFr: "Motivation, dépassement de soi, résilience : des témoignages captivants pour les groupes d'entreprise.",
    descEn: "Motivation, self-improvement, resilience: captivating talks for corporate groups.",
  },
];

export const PPSPage: React.FC<PPSPageProps> = ({ onNavigate, language }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeIn">
      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#050505]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('INN')}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {t('Back to the Inn', "Retour à l'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">
            {t('THEME EVENINGS', 'SOIRÉES THÉMATIQUES')}
          </span>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero, split diptych like the wwoofing page */}
        <section className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] min-h-[70vh]">
            <div className="relative overflow-hidden min-h-[45vh] lg:min-h-[70vh] bg-[#050505]">
              <img
                src="/media/inn/golden%20drone%20copy.jpg"
                alt={t('Le Manoir des Inconnus, aerial view', 'Le Manoir des Inconnus, vue aérienne')}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0a0a0a] hidden lg:block" />
            </div>

            <div className="relative bg-[#0a0a0a] border-t lg:border-t-0 lg:border-l border-[#c5a059]/30 px-8 md:px-12 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12 bg-[#c5a059]"></div>
                <span className="text-[10px] uppercase tracking-[0.5em] text-[#c5a059] font-cinzel">
                  {t('In partnership with PPS Canada', 'En partenariat avec PPS Canada')}
                </span>
              </div>

              <h1 className="font-prata text-5xl md:text-6xl lg:text-7xl text-[#f3e5ab] mb-8 leading-[0.95]" style={{ letterSpacing: '-0.02em' }}>
                {t('Theme Evenings & Team Retreats', 'Soirées thématiques & retraites d\'équipe')}
              </h1>

              <p className="text-base md:text-lg text-neutral-300 leading-relaxed font-lato mb-10 max-w-md">
                {t(
                  "The Manor lends its rooms and its grounds; PPS Canada brings the concept, the crew and the production. Together, a corporate retreat or a team evening becomes a full experience, not just a rented room.",
                  "Le Manoir prête ses salles et son terrain; PPS Canada apporte le concept, l'équipe et la production. Ensemble, une retraite d'entreprise ou une soirée d'équipe devient une expérience complète, pas juste une salle louée.",
                )}
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:alex@lesalondesinconnus.com?subject=Retraite%20d%27équipe%20%C3%A0%20la%20Maison%20Favier"
                  className="px-7 py-3.5 bg-[#c5a059] text-black font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#f3e5ab] transition-all hover:scale-[1.02] active:scale-95"
                >
                  {t('Request a proposal', 'Demander une proposition')}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Concepts grid */}
        <section className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 border-b border-[#c5a059]/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-16">
              <div className="h-px w-12 bg-[#c5a059]"></div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-cinzel">
                {t('The concepts', 'Les concepts')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-14">
              {CONCEPTS.map((c, i) => (
                <div key={i}>
                  <span className="font-cinzel text-xs text-[#c5a059] tracking-[0.4em]">{String(i + 1).padStart(2, '0')}</span>
                  <h2 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] tracking-tight mt-3 mb-3">
                    {t(c.titleEn, c.titleFr)}
                  </h2>
                  <p className="font-lato text-[15px] text-neutral-300 leading-[1.8]">
                    {t(c.descEn, c.descFr)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Retreat CTA */}
        <section className="px-6 md:px-12 lg:px-20 py-20 border-t border-[#c5a059]/10 bg-[#0a0a0a]">
          <div className="max-w-5xl mx-auto text-center">
            <h3 className="font-prata text-3xl md:text-4xl text-[#f3e5ab] mb-5 tracking-tight">
              {t('Bring your team to the Manor', "Amenez votre équipe au Manoir")}
            </h3>
            <p className="font-lato text-neutral-300 leading-relaxed max-w-2xl mx-auto mb-10">
              {t(
                "Rooms, shared spaces and grounds for a corporate retreat, combined with a PPS Canada concept chosen for your group. We build the proposal together.",
                "Chambres, espaces communs et terrain pour une retraite d'entreprise, combinés à un concept PPS Canada choisi pour votre groupe. On construit la proposition ensemble.",
              )}
            </p>
            <a
              href="mailto:alex@lesalondesinconnus.com?subject=Retraite%20d%27équipe%20%C3%A0%20la%20Maison%20Favier"
              className="inline-block px-8 py-4 bg-transparent border-2 border-[#c5a059] text-[#c5a059] font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#c5a059] hover:text-black transition-all"
            >
              {t('Write to us', 'Écrivez-nous')}
            </a>
          </div>
        </section>

        <SeoBlock viewKey="PPS" language={language} onNavigate={onNavigate} />
      </main>

      <style>{`
        .animate-fadeIn { animation: fadeInPage 0.6s ease-out forwards; }
        @keyframes fadeInPage {
          from { opacity: 0; filter: blur(5px); }
          to   { opacity: 1; filter: blur(0); }
        }
      `}</style>
    </div>
  );
};
