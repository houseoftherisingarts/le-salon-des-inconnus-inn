import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { MemberProfile } from './AuthModal';
import type { CommunityApplication, CommunityApplicationStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// "Faire partie de la communauté", paid resident-member announcement.
//
// A deliberate 180° from the dark wwoofing page: a LUMINOUS, daytime editorial
// spread. Grounded in the real home-page branding (measured, not guessed):
//   · display font = Prata (cream/espresso, tight negative tracking)
//   · the gold is the muted antique #c5a059, NOT the bright #d4af37 yellow
//   · cream / ivory / white carry the brand
// Light ivory ground, espresso ink, oversized Prata, bright sunlit photography.
// Flows with the home through type + gold DNA; inverts night → day.
//
// Deep-linkable via /wwoofing#communaute (and #postuler).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onRequestAuth: () => void;
  autoOpen?: boolean;
}

// Dark aesthetic of the home, warm near-black (NOT pure #000), cream Prata,
// muted antique gold #c5a059 (NOT the #d4af37 yellow). Token VALUES are
// repurposed so the liked layout stays identical; only the palette flips.
const T = {
  paper:   '#050505',  // warm dark ground (not pure black) + dark text on gold CTA
  panel:   '#0a0a0a',  // slightly lifted panel
  ink:     '#f3e5ab',  // cream, Prata display, headings, emphasis (home title color)
  body:    '#dacfb6',  // warm light body text
  soft:    '#9c8f76',  // muted captions
  gold:    '#c5a059',  // THE gold (muted antique), the home's primary gold
  goldDeep:'#c5a059',  // same muted gold for eyebrows/labels/CTA on dark
  line:    'rgba(197,160,89,0.28)',
};

// Black-and-white wwoofing photoshoot (from the Salon's own folder).
// Diversity on purpose, NOT Alex. Other members / wwoofers of the community.
const IMG = {
  garden: '/wwoof/fire-bw.jpg',   // around the fire, in the woods (3/4)
  nature: '/wwoof/bw-2.jpg',   // the crew handling lumber (band)
  bus:    '/wwoof/bw-4.jpg',
};

const LETTER: { fr: string; en: string }[] = [
  {
    fr: "André Dancause, qui veille sur la maison et tient le ménage depuis un bon bout, s'en va vivre plus près de sa famille. On le laisse partir le cœur plein, avec toute notre gratitude. Son départ ouvre une place rare : celle d'habiter ici, dans le noyau qui fait vivre l'auberge au quotidien.",
    en: "André Dancause, who has watched over the house and kept it clean for a good while now, is moving on to live closer to his family. We let him go with a full heart and all our gratitude. His departure opens a rare spot: living here, inside the small core that keeps the inn alive day to day.",
  },
  {
    fr: "Le Salon des Inconnus, c'est une petite communauté grandissante, enracinée dans une auberge familiale. Il y a des membres permanents qui vivent sur place, et des membres comètes qui passent, laissent leur trace, puis repartent. L'auberge, c'est la business qui nous fait vivre ; et en retour, la communauté prend soin de l'auberge, l'anime et lui donne une âme.",
    en: "Le Salon des Inconnus is a small, growing community rooted in a family inn. There are permanent members who live on site, and comet members who pass through, leave their mark, then move on. The inn is the business that makes our living; and in return, the community takes care of the inn, brings it to life, and gives it a soul.",
  },
  {
    fr: "En ce moment, la place qui se libère, c'est vivre dans le bus aménagé, avec accès complet à l'auberge et au terrain. Tu es chez toi dans ton bus, tout en faisant partie de la vie de la maison.",
    en: "Right now, the spot opening up is to live in the converted bus, with full access to the inn and the land. You're home in your own bus, while being part of the life of the house.",
  },
  {
    fr: "C'est un vrai travail. La tâche principale, c'est le ménage des chambres et des espaces communs, au cœur de l'expérience de nos invités. C'est répétitif, c'est physique, et c'est précieux. À ça s'ajoutent des moments où tu tiens le fort quand on est partis : accueillir des invités, être là pour les enfants de temps en temps. Et puis il y a les tâches qu'on partage entre membres parce qu'on vit ensemble : arroser le jardin, donner un coup de main à la cuisine, la vie de tous les jours.",
    en: "This is real work. The main task is housekeeping the rooms and common spaces, at the heart of our guests' experience. It's repetitive, it's physical, and it matters. On top of that, there are moments where you hold the fort while we're away: welcoming guests, being there for the kids now and then. And there are the tasks members share because we live together: watering the garden, lending a hand in the kitchen, the everyday.",
  },
  {
    fr: "On offre un salaire au-dessus du wwoofing communautaire, en plus des avantages, parce que soutenir ce projet, c'est un vrai métier. On veut que chaque personne qui vient greffer un peu de son âme à ce projet de rayonnement se sente appréciée à sa juste valeur. En même temps, on ne cherche pas un employé externe et désintéressé : le communautaire est au centre de la raison d'être de cet espace. C'est pour ça que l'approche hybride nous semble la plus juste : une sécurité de base et un salaire de base, tout en gardant à la personne la liberté de maintenir sa propre activité économique (idéal pour les nomades numériques).",
    en: "We offer a wage above community wwoofing, plus the perks, because supporting this project is a real craft. We want everyone who comes to graft a bit of their soul onto this living place to feel valued at their true worth. At the same time, we're not after a detached outside employee: the community is the very reason this space exists. That's why a hybrid approach feels truest to us: a base of security and a base wage, while leaving the person free to keep their own economic activity going (ideal for digital nomads).",
  },
  {
    fr: "Ce qu'on cherche avant tout, c'est une psychologie de communauté. On bâtit ce lieu entre amis, avec des gens qui ont le goût de prendre soin d'un endroit. On n'est pas un ashram tout-inclus ni une chaîne d'hôtels : on est quelque part entre les deux, les deux pieds sur terre.",
    en: "What we're looking for above all is a community frame of mind. We build this place among friends, with people who genuinely want to care for a spot. We're not an all-inclusive ashram nor a hotel chain: we sit somewhere in between, both feet on the ground.",
  },
  {
    fr: "Côté humain, quelques essentiels comptent pour nous : une communication saine et honnête (savoir nommer les choses, écouter, désamorcer une tension), une certaine légèreté de l'être, l'amour des enfants (il y en a, et ils courent partout), et le goût de cuisiner. D'ailleurs, si la cuisine te tente, sache qu'en cuisinant pour la maisonnée tu es aussi nourri·e gratuitement.",
    en: "On the human side, a few things really matter to us: healthy, honest communication (naming things, listening, easing a tension), a certain lightness of being, a love of children (there are some, and they run everywhere), and a taste for cooking. And if cooking calls to you, know that by cooking for the household you're also fed for free.",
  },
];

const PULLQUOTE = {
  fr: 'La famille soutient la communauté. La communauté soutient la famille. Le lieu ancre les deux.',
  en: 'The family supports the community. The community supports the family. The place anchors them both.',
};

// ─── Reveal-on-scroll (same IntersectionObserver pattern as the home page) ────
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);
  return (
    <div
      ref={ref}
      className={`transition-all duration-[1100ms] ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// ─── Section ─────────────────────────────────────────────────────────────────

export const CommunityMembershipSection: React.FC<Props> = ({
  language, user, memberProfile, onRequestAuth, autoOpen,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [application, setApplication] = useState<CommunityApplication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (autoOpen && user && memberProfile) setShowForm(true); }, [autoOpen, user, memberProfile]);

  useEffect(() => {
    const h = (window.location.hash || '').toLowerCase();
    if (h === '#communaute' || h === '#postuler') {
      const id = window.setTimeout(() => {
        document.getElementById('communaute')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
      return () => window.clearTimeout(id);
    }
  }, []);

  // Recette B1 — parallax cinématique. Le hero (photo + texte) bouge à vitesse
  // différente du scroll. Marche dans le conteneur scroll imbriqué de la page.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.getElementById('communaute');
    const scroller = (section?.closest('.overflow-y-auto') as HTMLElement | null);
    const target: HTMLElement | Window = scroller ?? window;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const st = scroller ? scroller.scrollTop : window.scrollY;
      section?.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const f = parseFloat(el.dataset.parallax || '0');
        el.style.transform = `translate3d(0, ${(st * f).toFixed(1)}px, 0)`;
        const fade = parseFloat(el.dataset.parallaxFade || '0');
        if (fade) el.style.opacity = String(Math.max(0, 1 - st * fade));
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    target.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { target.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (!user || !db) { setApplication(null); setLoaded(true); return; }
    setLoaded(false);
    const unsub = onSnapshot(
      doc(db, 'communityApplications', user.uid),
      (snap) => { setApplication(snap.exists() ? (snap.data() as CommunityApplication) : null); setLoaded(true); },
      () => setLoaded(true),
    );
    return unsub;
  }, [user]);

  const hasApplied = !!application;

  const handleCta = useCallback(() => {
    if (!user || !memberProfile) { onRequestAuth(); return; }
    setShowForm(true);
    setTimeout(() => document.getElementById('community-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [user, memberProfile, onRequestAuth]);

  const body = LETTER;

  return (
    <section id="communaute" className="comm relative scroll-mt-16" style={{ background: T.paper, color: T.body }}>

      {/* ── HERO — cinematic full-bleed, Ken-Burns photo, title over it (home language) ── */}
      <header className="relative w-full overflow-hidden" style={{ height: 'clamp(580px, 92vh, 1040px)' }}>
        <div className="absolute left-0 right-0 overflow-hidden" data-parallax="0.10" style={{ top: '-10%', height: '120%', willChange: 'transform' }}>
          <img
            src={IMG.garden}
            alt={t('Three members around the fire, the manor behind.', 'Trois membres autour du feu, le manoir derrière.')}
            className="comm-ken absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 32%' }}
          />
        </div>
        <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #050505 2%, rgba(5,5,5,0.55) 26%, rgba(5,5,5,0.12) 52%, rgba(5,5,5,0.5) 100%)' }} />
        <span className="comm-grain absolute inset-0 pointer-events-none" />
        {/* Recette B4 — le hero se développe depuis le noir à l'entrée */}
        <span className="comm-develop absolute inset-0 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 px-6 md:px-12 lg:px-20 pb-16 md:pb-24" data-parallax="-0.10" data-parallax-fade="0.0016">
          <div className="comm-hero-in max-w-4xl">
            {/* eyebrow stacked above the title — every line shares the same left edge */}
            <div className="mb-7">
              <span className="block h-px w-14 mb-4" style={{ background: T.gold }} />
              <span className="block font-cinzel uppercase" style={{ color: T.gold, fontSize: '12px', letterSpacing: '0.42em' }}>
                {t('A place opens', 'Une place se libère')}
              </span>
            </div>
            <h2 className="font-prata" style={{ color: T.ink, fontSize: 'clamp(2.8rem, 7vw, 6.4rem)', lineHeight: 0.95, letterSpacing: '-0.02em', textShadow: '0 4px 40px rgba(0,0,0,0.6)' }}>
              {t('Join the community', 'Faire partie de la communauté')}
            </h2>
            <p className="font-cormorant italic mt-6" style={{ color: T.ink, fontSize: 'clamp(1.2rem, 2vw, 1.8rem)', lineHeight: 1.3, maxWidth: '36ch', textShadow: '0 1px 16px rgba(0,0,0,0.65)' }}>
              {t(
                'Come live in a lasting place, with people of heart and travellers passing through.',
                'Venir vivre dans un lieu pérenne, avec des gens de cœur et des voyageurs de passage.',
              )}
            </p>
          </div>
        </div>
        <span className="comm-scroll-cue absolute bottom-6 right-6 md:right-12 font-cinzel uppercase" style={{ color: T.gold, fontSize: '10px', letterSpacing: '0.34em' }}>
          {t('Scroll', 'Défiler')}
        </span>
      </header>

      {/* ── LEAD — the announcement ─────────────────────────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 pt-20 md:pt-28 pb-2">
        <div className="max-w-4xl">
          <p className="comm-lead font-lato" style={{ color: T.ink, fontSize: 'clamp(1.2rem, 1.7vw, 1.55rem)', lineHeight: 1.6 }}>
            {t(body[0].en, body[0].fr)}
          </p>
        </div>
      </Reveal>

      {/* ── BODY 1 ───────────────────────────────────────────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-10 md:py-14">
        <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-8 items-start">
          <Para>{t(body[1].en, body[1].fr)}</Para>
          <Para>{t(body[2].en, body[2].fr)}</Para>
        </div>
      </Reveal>

      {/* ── TERMS, oversized Prata numbers, gold hairlines ──────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-5 mb-8">
            <span className="font-cinzel uppercase" style={{ color: T.goldDeep, fontSize: '12px', letterSpacing: '0.34em' }}>{t('The terms', 'Les conditions')}</span>
            <span className="h-px flex-1" style={{ background: T.line }} />
          </div>
          <dl className="comm-terms grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ borderTop: `1px solid ${T.line}` }}>
            {[
              { v: '1000 $', l: t('per month · part-time', 'par mois · temps partiel') },
              { v: t('The bus', 'Le bus'), l: t('housing on site', 'logement sur place') },
              { v: t('Meals', 'Repas'), l: t('fed when you cook', 'nourri·e si tu cuisines') },
              { v: t('Your time', 'Ton temps'), l: t('keep your own work', 'garde tes projets') },
            ].map((it, i) => (
              <div key={i} className="py-7 lg:py-9 lg:pr-8" style={{ borderBottom: `1px solid ${T.line}`, transitionDelay: `${i * 90}ms` }}>
                <dt className="font-prata" style={{ color: T.ink, fontSize: 'clamp(2rem, 3.4vw, 3.1rem)', lineHeight: 1, letterSpacing: '-0.01em' }}>{it.v}</dt>
                <dd className="font-lato mt-3" style={{ color: T.soft, fontSize: '12.5px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{it.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      {/* ── BODY 2 (work + pay) ──────────────────────────────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-8 items-start">
          <Para>{t(body[3].en, body[3].fr)}</Para>
          <Para>{t(body[4].en, body[4].fr)}</Para>
        </div>
      </Reveal>

      {/* ── FULL-BLEED band, Ken-Burns ───────────────────────────────────── */}
      <figure className="comm-band relative w-full overflow-hidden" style={{ height: 'clamp(280px, 42vh, 520px)' }}>
        <img src={IMG.nature} alt={t('The land around the inn, in daylight.', "Le terrain autour de l'auberge, en plein jour.")} className="comm-ken-slow w-full h-full object-cover" />
        {/* Recette C2 — transition seamless : la bande se fond dans le #050505 en haut et en bas */}
        <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, #050505 0%, rgba(5,5,5,0) 22%, rgba(5,5,5,0) 72%, #050505 100%)' }} />
        <figcaption className="absolute bottom-4 right-6 font-cinzel uppercase" style={{ color: '#f3e5ab', fontSize: '10px', letterSpacing: '0.26em', textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}>
          {t('The living place', 'Le lieu vivant')}
        </figcaption>
      </figure>

      {/* ── BODY 3 (community psychology + human side) ───────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-8 items-start">
          <Para>{t(body[5].en, body[5].fr)}</Para>
          <Para>{t(body[6].en, body[6].fr)}</Para>
        </div>
      </Reveal>

      {/* ── PULLQUOTE, modest, Cormorant, gold ──────────────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-12">
        <span className="block mb-6 h-px w-16" style={{ background: T.gold }} />
        <p data-parallax="-0.045" className="font-cormorant italic" style={{ color: T.goldDeep, fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)', lineHeight: 1.3, maxWidth: '40ch', willChange: 'transform' }}>
          {t(PULLQUOTE.en, PULLQUOTE.fr)}
        </p>
      </Reveal>

      {/* ── CTA / form / applied ─────────────────────────────────────────── */}
      <div className="px-6 md:px-12 lg:px-20 pb-24 pt-10">
        <div className="max-w-3xl">
          {!loaded && user ? (
            <p className="font-lato text-sm" style={{ color: T.soft }}>{t('Loading…', 'Chargement…')}</p>
          ) : hasApplied ? (
            <AppliedSummary application={application!} t={t} />
          ) : showForm && user && memberProfile ? (
            <div id="community-apply"><CommunityApplyForm language={language} user={user} memberProfile={memberProfile} onCancel={() => setShowForm(false)} /></div>
          ) : (
            <div>
              <button onClick={handleCta} className="comm-cta font-cinzel uppercase">
                {t('Apply for the place', 'Postuler pour la place')}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .comm .font-prata { font-family: 'Prata', serif; }
        .comm .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .comm-lead::first-letter {
          font-family: 'Prata', serif; float: left; color: ${T.goldDeep};
          font-size: 3.4em; line-height: 0.78; padding: 0.04em 0.12em 0 0;
        }
        /* Hero — continuous Ken Burns on the photo (home language: hero3-kenburns) */
        .comm-ken { animation: commKen 26s ease-in-out infinite alternate; will-change: transform; transform-origin: 50% 40%; }
        @keyframes commKen { from { transform: scale(1.04); } to { transform: scale(1.13); } }
        .comm-ken-slow { animation: commKen 32s ease-in-out infinite alternate; will-change: transform; }
        /* Hero copy — staggered cinematic entrance, all lines share one left edge */
        .comm-hero-in > * { opacity: 0; transform: translateY(22px); animation: commRise 1.1s cubic-bezier(0.22,1,0.36,1) forwards; }
        .comm-hero-in > *:nth-child(1) { animation-delay: 0.20s; }
        .comm-hero-in > *:nth-child(2) { animation-delay: 0.38s; }
        .comm-hero-in > *:nth-child(3) { animation-delay: 0.56s; }
        @keyframes commRise { to { opacity: 1; transform: none; } }
        /* Fine film grain for depth (premium texture, very subtle) */
        .comm-grain { opacity: 0.05; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        /* Scroll cue — slow vertical breathing */
        .comm-scroll-cue { animation: commCue 2.6s ease-in-out infinite; }
        @keyframes commCue { 0%,100% { opacity: 0.5; transform: translateY(0); } 50% { opacity: 1; transform: translateY(4px); } }
        /* Recette B4 — le hero se développe depuis le noir à l'entrée */
        .comm-develop { background: #050505; animation: commDevelop 1.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes commDevelop { from { opacity: 1; } to { opacity: 0; } }
        /* Terms cells inherit the parent Reveal's transition for a staggered cascade */
        .comm-terms > div { transition: opacity 1.1s ease-out, transform 1.1s cubic-bezier(0.22,1,0.36,1); }
        .comm-cta {
          color: ${T.paper}; background: ${T.goldDeep};
          padding: 1.05rem 3rem; border-radius: 15px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.3em;
          transition: transform .4s cubic-bezier(0.22,1,0.36,1), background .35s ease, box-shadow .35s ease;
          box-shadow: 0 14px 34px -18px rgba(168,134,63,0.85);
        }
        .comm-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 48px -18px rgba(197,160,89,0.7), inset 0 0 0 1px rgba(243,229,171,0.45); }
        .comm-cta:active { transform: translateY(0); }
        .comm-cta:disabled { opacity: 0.45; cursor: not-allowed; }
        @media (prefers-reduced-motion: reduce) {
          .comm-ken, .comm-ken-slow, .comm-scroll-cue, .comm-hero-in > * { animation: none !important; opacity: 1 !important; transform: none !important; }
          .comm-develop { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </section>
  );
};

const Para: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-lato" style={{ color: T.body, fontSize: '17px', lineHeight: 1.85 }}>{children}</p>
);

// ─── Applied confirmation ────────────────────────────────────────────────────

const AppliedSummary: React.FC<{ application: CommunityApplication; t: (en: string, fr: string) => string }> = ({ application, t }) => {
  const status: CommunityApplicationStatus = application.status ?? 'pending';
  const label: Record<CommunityApplicationStatus, { fr: string; en: string }> = {
    pending: { fr: 'Reçue', en: 'Received' }, approved: { fr: 'Approuvée', en: 'Approved' }, declined: { fr: 'Fermée', en: 'Closed' },
  };
  return (
    <div className="max-w-2xl" style={{ borderTop: `1px solid ${T.line}`, paddingTop: '2rem' }}>
      <div className="flex items-center justify-start gap-4 flex-wrap mb-4">
        {application.photoURL && <img src={application.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${T.gold}` }} />}
        <div className="text-left">
          <span className="font-cinzel uppercase block mb-1" style={{ color: T.goldDeep, fontSize: '10px', letterSpacing: '0.3em' }}>{t('Your application', 'Ta candidature')}</span>
          <h3 className="font-prata" style={{ color: T.ink, fontSize: '1.5rem' }}>{application.displayName}</h3>
        </div>
        <span className="ml-auto font-cinzel uppercase" style={{ background: 'rgba(168,134,63,0.16)', color: T.goldDeep, fontSize: '10px', letterSpacing: '0.18em', padding: '4px 12px', borderRadius: '999px' }}>
          {t(label[status].en, label[status].fr)}
        </span>
      </div>
      <p className="font-lato text-sm leading-relaxed mx-auto" style={{ color: T.body, maxWidth: '46ch' }}>
        {t("Thank you. We read every application by hand. We'll reach out by email or phone when we've had time to sit with it.",
           "Merci. On lit chaque candidature à la main. On te reviendra par courriel ou par téléphone une fois qu'on aura pris le temps de s'y asseoir.")}
      </p>
      {application.introduction && <p className="font-cormorant italic text-lg mt-5 leading-relaxed mx-auto" style={{ color: T.goldDeep, maxWidth: '50ch' }}>"{application.introduction}"</p>}
    </div>
  );
};

// ─── Apply form (on ivory) ───────────────────────────────────────────────────

const CommunityApplyForm: React.FC<{ language: 'EN' | 'FR'; user: User; memberProfile: MemberProfile; onCancel: () => void }> = ({ language, user, memberProfile, onCancel }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [phone, setPhone] = useState(memberProfile.phone ?? '');
  const [city, setCity] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [communityMotivation, setCommunityMotivation] = useState('');
  const [cleaningAttitude, setCleaningAttitude] = useState('');
  const [personalProjects, setPersonalProjects] = useState('');
  const [workspaceNeeds, setWorkspaceNeeds] = useState('');
  const [availability, setAvailability] = useState('');
  const [needs, setNeeds] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formValid = phone.trim() && introduction.trim() && communityMotivation.trim();

  const submit = async () => {
    setError(null);
    if (!db) return;
    if (!formValid) { setError(t('Please fill the required fields.', 'Veuillez remplir les champs requis.')); return; }
    setSaving(true);
    try {
      const application: CommunityApplication = {
        uid: user.uid, displayName: memberProfile.displayName, email: memberProfile.email, photoURL: memberProfile.photoURL,
        phone: phone.trim(), city: city.trim() || undefined, introduction: introduction.trim(), communityMotivation: communityMotivation.trim(),
        cleaningAttitude: cleaningAttitude.trim() || undefined, personalProjects: personalProjects.trim() || undefined,
        workspaceNeeds: workspaceNeeds.trim() || undefined, availability: availability.trim() || undefined, needs: needs.trim() || undefined,
        status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      const clean: Record<string, unknown> = {};
      Object.entries(application).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await setDoc(doc(db, 'communityApplications', user.uid), clean);
    } catch (e: any) { setError(e?.message ?? 'Error'); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl" style={{ borderTop: `1px solid ${T.line}`, paddingTop: '2rem' }}>
      <div className="flex items-center gap-4 mb-8">
        {memberProfile.photoURL ? (
          <img src={memberProfile.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${T.gold}` }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-prata text-lg" style={{ background: 'rgba(168,134,63,0.14)', boxShadow: `0 0 0 1px ${T.gold}`, color: T.goldDeep }}>{memberProfile.displayName?.charAt(0) ?? '?'}</div>
        )}
        <div>
          <div className="font-prata text-lg" style={{ color: T.ink }}>{memberProfile.displayName}</div>
          <div className="text-[11px] font-lato" style={{ color: T.soft }}>{memberProfile.email}<span style={{ color: T.gold }}> · {t('photo from your Google profile', 'photo de ton profil Google')}</span></div>
        </div>
      </div>

      <Field label={t('Introduce yourself *', 'Présente-toi *')} hint={t('Who you are, where you are in life right now.', "Qui tu es, où tu en es dans ta vie en ce moment.")}>
        <Area value={introduction} onChange={setIntroduction} rows={4} placeholder={t('A few words in your own voice', 'Quelques mots dans ta voix')} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <Field label={t('Phone *', 'Téléphone *')}><Line value={phone} onChange={setPhone} /></Field>
        <Field label={t('Where you come from', "D'où tu viens")}><Line value={city} onChange={setCity} /></Field>
      </div>
      <Field label={t('Why community life, why here? *', 'Pourquoi la vie communautaire, pourquoi ici ? *')} hint={t('This is what matters most to us.', "C'est ce qui compte le plus pour nous.")}>
        <Area value={communityMotivation} onChange={setCommunityMotivation} rows={4} />
      </Field>
      <Field label={t('Your relationship to housekeeping work', 'Ton rapport au travail de ménage')} hint={t('Honestly, it is the core of the role.', "Honnêtement, c'est le cœur du poste.")}>
        <Area value={cleaningAttitude} onChange={setCleaningAttitude} rows={3} />
      </Field>
      <Field label={t('Your own projects', 'Tes propres projets')} hint={t('What you would work on with the free time.', "Ce sur quoi tu travaillerais avec le temps libre.")}>
        <Area value={personalProjects} onChange={setPersonalProjects} rows={3} />
      </Field>
      <Field label={t('Do you need a space to work? (e.g. the massotherapy room)', "As-tu besoin d'un espace pour travailler ? (ex. la salle de masso)")}>
        <Area value={workspaceNeeds} onChange={setWorkspaceNeeds} rows={2} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <Field label={t('When could you start?', 'Quand pourrais-tu commencer ?')}><Line value={availability} onChange={setAvailability} /></Field>
        <Field label={t('Anything you need from us', 'Ce dont tu as besoin de nous')}><Line value={needs} onChange={setNeeds} /></Field>
      </div>

      <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${T.line}` }}>
        {error && <p className="text-sm mb-4" style={{ color: '#a23b2a' }}>{error}</p>}
        <div className="flex flex-wrap gap-4 items-center justify-end">
          <button onClick={onCancel} className="px-5 py-3 text-xs uppercase font-cinzel" style={{ color: T.soft, letterSpacing: '0.3em' }}>{t('Cancel', 'Annuler')}</button>
          <button onClick={submit} disabled={!formValid || saving} className="comm-cta font-cinzel uppercase">{saving ? '…' : t('Send my application', 'Envoyer ma candidature')}</button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block mb-6">
    <span className="block uppercase font-cinzel mb-2" style={{ color: T.goldDeep, fontSize: '10px', letterSpacing: '0.22em' }}>{label}</span>
    {children}
    {hint && <span className="block font-cormorant italic mt-1.5" style={{ color: T.soft, fontSize: '13px' }}>{hint}</span>}
  </label>
);

const baseInput = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%', background: 'transparent', border: 0, borderBottom: `1px solid ${T.gold}`,
  padding: '8px 0', fontSize: '16px', color: T.ink, outline: 'none', ...extra,
});
const Line: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="font-lato" style={baseInput()}
    onFocus={(e) => (e.currentTarget.style.borderBottomColor = T.ink)} onBlur={(e) => (e.currentTarget.style.borderBottomColor = T.gold)} />
);
const Area: React.FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="font-lato" style={baseInput({ resize: 'none' })}
    onFocus={(e) => (e.currentTarget.style.borderBottomColor = T.ink)} onBlur={(e) => (e.currentTarget.style.borderBottomColor = T.gold)} />
);
