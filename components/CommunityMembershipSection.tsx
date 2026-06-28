import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { MemberProfile } from './AuthModal';
import type { CommunityApplication, CommunityApplicationStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// "Faire partie de la communauté" — paid resident-member announcement.
//
// Uses the Salon's own design system so it reads as one site, editorial and
// cinematic, alongside the Inn / Events / Petite Monnaie pages:
//   · display/headings = Cinzel · body/labels = Lato · statements = Cormorant
//   · accent = brass #c5a059 on warm near-black #050505 (no ember, no italic)
//   · chrome: uppercase wide tracking, bracket corners, brass selection,
//     warm-duotone photos, brass firelight glow, cinematic vignette + grain.
// Texts and photos are kept; only the treatment changes.
//
// Deep-linkable via #communaute (and #postuler).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onRequestAuth: () => void;
  autoOpen?: boolean;
}

// Site design-system tokens (Le Salon — warm-dark + brass), matching the Inn /
// Events / Petite Monnaie pages: ground #050505, brass gold #c5a059, Cinzel +
// Lato + Cormorant. No foreign ember palette, no unloaded fonts.
const T = {
  paper:   '#050505',  // site near-black ground
  panel:   'rgba(0,0,0,0.38)', // glass panel
  ink:     '#f3ecda',  // warm parchment cream — Cinzel headings on dark
  body:    '#d9d7c8',  // warm light body text
  soft:    '#9a9683',  // muted warm-sage captions
  gold:    '#c5a059',  // BRASS — eyebrows, labels, hairlines, active states
  goldDeep:'#c5a059',  // BRASS — primary numbers, pullquote, CTA, drop-cap
  line:    'rgba(197,160,89,0.30)',  // brass hairline
};

// Black-and-white community photoshoot (Salon's own folder), warm-duotoned in CSS.
const IMG = {
  garden: '/wwoof/fire-bw.jpg',   // around the fire, the manor behind (hero)
  nature: '/wwoof/bw-2.jpg',   // the crew at work (full-bleed band)
};

// The converted bus — the actual home on offer. Kept in true colour (the warm
// wood + golden field already sit in the section's palette) so the visitor sees
// the real space they'd live in.
const BUS = {
  ext: '/media/inn/us%20copy.jpg',  // the orange bus in a golden field at dusk
  interiors: [
    { src: '/media/Auberge%20photos/bus%20pov%20avant.jpg',     en: 'Front: piano and daybed', fr: 'Avant : piano et banquette' },
    { src: '/media/Auberge%20photos/bus%20foyer.jpg',           en: 'Pellet stove',            fr: 'Foyer aux granules' },
    { src: '/media/Auberge%20photos/bus%20pov%20arriere.jpg',   en: 'Kitchen and bed',         fr: 'Cuisine et lit' },
    { src: '/media/Auberge%20photos/bus%20pov%20arriere%202.jpg', en: 'Living length',         fr: 'Toute la longueur' },
  ],
};

// The shared common spaces of the inn — what you share when you live here.
const COMMON = [
  { src: '/media/Auberge%20photos/salle%20a%20manger.jpg', en: 'The salon',  fr: 'Le salon' },
  { src: '/media/Auberge%20photos/cuisine%20grande.jpg',   en: 'The kitchen', fr: 'La cuisine' },
  { src: '/media/Auberge%20photos/jardins%20auberge.jpg',  en: 'The garden',  fr: 'Le jardin' },
];

const LETTER: { fr: string; en: string }[] = [
  {
    fr: "André, qui veille sur la maison et tient le ménage depuis un bon bout, s'en va vivre plus près de sa famille. On le laisse partir le cœur plein, avec toute notre gratitude. Son départ ouvre une place rare : celle d'habiter ici, dans le noyau qui fait vivre l'auberge au quotidien.",
    en: "André, who has watched over the house and kept it clean for a good while now, is moving on to live closer to his family. We let him go with a full heart and all our gratitude. His departure opens a rare spot: living here, inside the small core that keeps the inn alive day to day.",
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

// ─── Reveal-on-scroll (IntersectionObserver, cinematic ease) ──────────────────
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
      className={`comm-reveal ${visible ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Game-menu eyebrow: ember diamond + uppercase tracked label.
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="comm-eyebrow font-inter">
    <span className="comm-diamond" aria-hidden>◆</span>
    {children}
  </span>
);

// ─── Section ─────────────────────────────────────────────────────────────────

export const CommunityMembershipSection: React.FC<Props> = ({
  language, user, memberProfile, onRequestAuth, autoOpen,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [application, setApplication] = useState<CommunityApplication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (autoOpen && user && memberProfile) setShowForm(true); }, [autoOpen, user, memberProfile]);

  // Arriving from the Espace Membre ("Postuler" button): open the form directly.
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem('openCommunityForm') === '1' && user && memberProfile) {
      sessionStorage.removeItem('openCommunityForm');
      setShowForm(true);
      setTimeout(() => document.getElementById('community-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, [user, memberProfile]);

  useEffect(() => {
    const h = (window.location.hash || '').toLowerCase();
    if (h === '#communaute' || h === '#postuler') {
      const id = window.setTimeout(() => {
        document.getElementById('communaute')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
      return () => window.clearTimeout(id);
    }
  }, []);

  // Cinematic parallax — hero photo + text move at different speeds. Works in
  // the page's nested scroll container.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.getElementById('communaute');
    const scroller = (section?.closest('.overflow-y-auto') as HTMLElement | null);
    const target: HTMLElement | Window = scroller ?? window;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const st = scroller ? scroller.scrollTop : window.scrollY;
      const vh = scroller ? scroller.clientHeight : window.innerHeight;
      section?.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const f = parseFloat(el.dataset.parallax || '0');
        // Displacement is relative to the element's position in the viewport,
        // not the absolute scroll offset — keeps the shift small and centred so
        // deep elements can't drift up over the text above them.
        const rect = el.getBoundingClientRect();
        const rel = (rect.top + rect.height / 2) - vh / 2;
        el.style.transform = `translate3d(0, ${(rel * f).toFixed(1)}px, 0)`;
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

  const TERMS = [
    { v: '1000 $', l: t('per month · part-time', 'par mois · temps partiel') },
    { v: t('The bus', 'Le bus'), l: t('housing on site', 'logement sur place') },
    { v: t('Meals', 'Repas'), l: t('fed when you cook', 'nourri·e si tu cuisines') },
    { v: t('Your time', 'Ton temps'), l: t('time and space for your projects', 'du temps et de l\'espace pour tes projets') },
  ];

  return (
    <section id="communaute" className="comm relative scroll-mt-16" style={{ background: T.paper, color: T.body }}>

      {/* ── MOBILE HERO — full-width group photo (whole community visible), title below ── */}
      <header className="md:hidden relative w-full">
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={IMG.garden}
            alt={t('Three members around the fire, the manor behind.', 'Trois membres autour du feu, le manoir derrière.')}
            className="comm-photo w-full h-full object-cover"
          />
          <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #050505 0%, rgba(12,11,8,0.12) 34%, rgba(12,11,8,0) 62%)' }} />
          <span className="comm-vignette absolute inset-0 pointer-events-none" />
          <span className="comm-grain absolute inset-0 pointer-events-none" />
        </div>
        <div className="comm-hero-in px-6 pt-6 pb-1">
          <div className="mb-5"><Eyebrow>{t('A place opens', 'Une place se libère')}</Eyebrow></div>
          <h2 className="font-fraunces comm-title" style={{ color: T.ink, fontSize: 'clamp(2.5rem, 11vw, 3.6rem)', lineHeight: 0.94, letterSpacing: '-0.02em' }}>
            {t('Join the community', 'Faire partie de la communauté')}
          </h2>
          <p className="font-fraunces-it mt-4" style={{ color: T.ink, fontSize: 'clamp(1.1rem, 4.6vw, 1.4rem)', lineHeight: 1.34, maxWidth: '34ch' }}>
            {t(
              'Come live in a lasting place, with people of heart and travellers passing through.',
              'Venir vivre dans un lieu pérenne, avec des gens de cœur et des voyageurs de passage.',
            )}
          </p>
        </div>
      </header>

      {/* ── HERO (desktop) — warm-duotone fire photo, ember firelight, game-menu title ── */}
      <header className="hidden md:block relative w-full overflow-hidden" style={{ height: 'clamp(580px, 92vh, 1040px)' }}>
        <div className="absolute left-0 right-0 overflow-hidden" data-parallax="0.06" style={{ top: '-6%', height: '112%', willChange: 'transform' }}>
          <img
            src={IMG.garden}
            alt={t('Three members around the fire, the manor behind.', 'Trois membres autour du feu, le manoir derrière.')}
            className="comm-ken comm-photo absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 42%' }}
          />
        </div>
        {/* warm dark gradient for legibility */}
        <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #050505 0%, rgba(12,11,8,0.55) 22%, rgba(12,11,8,0.04) 50%, rgba(12,11,8,0.34) 100%)' }} />
        {/* ember firelight glow rising from the fire (bottom-center-left) */}
        <span className="absolute inset-0 pointer-events-none comm-firelight" />
        <span className="comm-vignette absolute inset-0 pointer-events-none" />
        <span className="comm-grain absolute inset-0 pointer-events-none" />
        {/* the hero develops from black on entrance */}
        <span className="comm-develop absolute inset-0 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 px-6 md:px-12 lg:px-20 pb-16 md:pb-24" data-parallax="-0.10" data-parallax-fade="0.001">
          <div className="comm-hero-in max-w-4xl">
            <div className="mb-7"><Eyebrow>{t('A place opens', 'Une place se libère')}</Eyebrow></div>
            <h2 className="font-fraunces comm-title" style={{ color: T.ink, fontSize: 'clamp(2.9rem, 7.4vw, 6.6rem)', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
              {t('Join the community', 'Faire partie de la communauté')}
            </h2>
            <p className="font-fraunces-it mt-6" style={{ color: T.ink, fontSize: 'clamp(1.2rem, 2vw, 1.8rem)', lineHeight: 1.32, maxWidth: '38ch', textShadow: '0 1px 18px rgba(0,0,0,0.7)' }}>
              {t(
                'Come live in a lasting place, with people of heart and travellers passing through.',
                'Venir vivre dans un lieu pérenne, avec des gens de cœur et des voyageurs de passage.',
              )}
            </p>
          </div>
        </div>
        <span className="comm-scroll-cue absolute bottom-6 right-6 md:right-12 font-inter uppercase" style={{ color: T.gold, fontSize: '10px', letterSpacing: '0.34em' }}>
          {t('Scroll', 'Défiler')}
        </span>
      </header>

      {/* ── LEAD — the announcement ─────────────────────────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 pt-20 md:pt-28 pb-2">
        <div className="max-w-4xl">
          <p className="comm-lead font-inter" style={{ color: T.ink, fontSize: 'clamp(1.2rem, 1.7vw, 1.55rem)', lineHeight: 1.62 }}>
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

      {/* ── LE BUS — the home on offer (true colour) ─────────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-5 mb-6">
            <Eyebrow>{t('Your home', 'Ton chez-toi')}</Eyebrow>
            <span className="h-px flex-1" style={{ background: T.line }} />
          </div>
          <figure className="comm-busfig relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
            <img
              src={BUS.ext}
              alt={t('The converted bus in a golden field at dusk.', 'Le bus aménagé dans un champ doré au crépuscule.')}
              className="w-full h-full object-cover"
            />
            <span className="comm-vignette absolute inset-0 pointer-events-none" />
            <figcaption className="absolute bottom-4 left-5 font-cinzel uppercase" style={{ color: T.ink, fontSize: '11px', letterSpacing: '0.3em', textShadow: '0 1px 14px rgba(0,0,0,0.85)' }}>
              {t('The converted bus', 'Le bus aménagé')}
            </figcaption>
          </figure>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mt-2 md:mt-3">
            {BUS.interiors.map((p, i) => (
              <figure key={i} className="comm-busshot relative overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
                <img src={p.src} alt={t(p.en, p.fr)} loading="lazy" className="w-full h-full object-cover" />
                <span className="comm-vignette absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />
              </figure>
            ))}
          </div>
          {/* shared common spaces — salon · cuisine · jardin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mt-2 md:mt-3">
            {COMMON.map((p, i) => (
              <figure key={i} className="comm-busshot relative overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
                <img src={p.src} alt={t(p.en, p.fr)} loading="lazy" className="w-full h-full object-cover" />
                <span className="comm-vignette absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />
                <figcaption className="absolute bottom-3 left-4 font-cinzel uppercase" style={{ color: T.ink, fontSize: '10px', letterSpacing: '0.28em', textShadow: '0 1px 12px rgba(0,0,0,0.85)' }}>
                  {t(p.en, p.fr)}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── TERMS — game-menu stat panel (bracketed glass, indexed stats) ── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <div className="mx-auto max-w-6xl comm-statpanel">
          <div className="flex items-center gap-5 mb-2">
            <Eyebrow>{t('The terms', 'Les conditions')}</Eyebrow>
            <span className="h-px flex-1" style={{ background: T.line }} />
          </div>
          <dl className="comm-terms grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {TERMS.map((it, i) => (
              <div key={i} className="comm-stat" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="comm-stat-idx font-inter">{`0${i + 1}`}</span>
                <dt className="font-fraunces comm-stat-v">{it.v}</dt>
                <dd className="font-inter comm-stat-l">{it.l}</dd>
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

      {/* ── FULL-BLEED warm-duotone band ─────────────────────────────────── */}
      <figure className="comm-band relative w-full overflow-hidden" style={{ height: 'clamp(560px, 84vh, 1040px)' }}>
        <img src={IMG.nature} alt={t('The community at work on the land.', "La communauté au travail sur le terrain.")} className="comm-ken-slow comm-photo w-full h-full object-cover" />
        <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, #050505 0%, rgba(12,11,8,0) 22%, rgba(12,11,8,0) 72%, #050505 100%)' }} />
        <span className="comm-vignette absolute inset-0 pointer-events-none" />
        <figcaption className="absolute bottom-5 right-6 font-inter uppercase" style={{ color: T.ink, fontSize: '10px', letterSpacing: '0.3em', textShadow: '0 1px 12px rgba(0,0,0,0.7)' }}>
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

      {/* ── PULLQUOTE — Cormorant, short brass rule above ─────────────────── */}
      <Reveal className="px-6 md:px-12 lg:px-20 py-12">
        <div className="comm-quote max-w-3xl">
          <p data-parallax="-0.045" className="font-fraunces-it" style={{ color: T.ink, fontSize: 'clamp(1.55rem, 2.7vw, 2.3rem)', lineHeight: 1.32, willChange: 'transform' }}>
            {t(PULLQUOTE.en, PULLQUOTE.fr)}
          </p>
        </div>
      </Reveal>

      {/* ── CTA / form / applied ─────────────────────────────────────────── */}
      <div className="px-6 md:px-12 lg:px-20 pb-24 pt-10">
        <div className="max-w-3xl">
          {!loaded && user ? (
            <p className="font-inter text-sm" style={{ color: T.soft }}>{t('Loading…', 'Chargement…')}</p>
          ) : hasApplied ? (
            <AppliedSummary application={application!} t={t} />
          ) : showForm && user && memberProfile ? (
            <div id="community-apply"><CommunityApplyForm language={language} user={user} memberProfile={memberProfile} onCancel={() => setShowForm(false)} /></div>
          ) : (
            <div>
              <button onClick={handleCta} className="comm-cta font-inter uppercase">
                {t('Apply for the place', 'Postuler pour la place')}
                <span className="comm-cta-arrow" aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..700&family=Inter:wght@300;400;500;600;700&display=swap');
        .comm .font-fraunces { font-family: 'Cinzel', serif; font-weight: 600; }
        .comm .font-fraunces-it { font-family: 'Cormorant Garamond', serif; font-style: normal; font-weight: 700; }
        .comm .font-inter { font-family: 'Lato', sans-serif; }
        .comm ::selection { background: ${T.gold}; color: #1a1408; }
        .comm a:focus-visible, .comm button:focus-visible, .comm input:focus-visible, .comm textarea:focus-visible {
          outline: 2px solid ${T.gold}; outline-offset: 3px; border-radius: 3px;
        }
        /* Warm duotone on the B&W photos — gentle brass tone, not orange */
        .comm-photo { filter: sepia(0.28) saturate(1.05) brightness(0.92) contrast(1.04); }
        /* The bus — true-colour gallery, thin brass frame, soft lift on hover */
        .comm-busfig { border-radius: 6px; box-shadow: inset 0 0 0 1px rgba(197,160,89,0.22); }
        .comm-busfig img, .comm-busshot img { transition: transform 1.1s cubic-bezier(0.16,1,0.3,1); }
        .comm-busfig:hover img { transform: scale(1.03); }
        .comm-busshot { border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(197,160,89,0.18); }
        .comm-busshot:hover img { transform: scale(1.05); }
        /* Game-menu eyebrow */
        .comm-eyebrow { display: inline-flex; align-items: center; gap: 0.7em; color: ${T.gold};
          font-size: 12px; font-weight: 600; letter-spacing: 0.34em; text-transform: uppercase; }
        .comm-diamond { font-size: 8px; color: ${T.goldDeep}; text-shadow: 0 0 10px rgba(197,160,89,0.6); }
        .comm-title { text-shadow: 0 4px 44px rgba(0,0,0,0.6), 0 0 60px rgba(197,160,89,0.10); }
        .comm-lead::first-letter {
          font-family: 'Cinzel', serif; font-weight: 600; float: left; color: ${T.goldDeep};
          font-size: 3.5em; line-height: 0.74; padding: 0.04em 0.12em 0 0;
          text-shadow: 0 0 26px rgba(197,160,89,0.35);
        }
        /* Hero firelight + cinematic vignette */
        .comm-firelight { background: radial-gradient(60% 42% at 40% 96%, rgba(197,160,89,0.30), rgba(197,160,89,0.10) 45%, transparent 72%); mix-blend-mode: screen; }
        .comm-vignette { background: radial-gradient(120% 90% at 50% 42%, transparent 58%, rgba(0,0,0,0.55) 100%); }
        /* Reveal-on-scroll */
        .comm-reveal { opacity: 0; transform: translateY(24px); transition: opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1); }
        .comm-reveal.is-in { opacity: 1; transform: none; }
        /* Continuous Ken Burns */
        .comm-ken { animation: commKen 30s ease-in-out infinite alternate; will-change: transform; transform-origin: 50% 45%; }
        @keyframes commKen { from { transform: scale(1.0); } to { transform: scale(1.05); } }
        .comm-ken-slow { animation: commKen 34s ease-in-out infinite alternate; will-change: transform; }
        /* Hero copy — staggered cinematic entrance */
        .comm-hero-in > * { opacity: 0; transform: translateY(22px); animation: commRise 1.1s cubic-bezier(0.16,1,0.3,1) forwards; }
        .comm-hero-in > *:nth-child(1) { animation-delay: 0.20s; }
        .comm-hero-in > *:nth-child(2) { animation-delay: 0.40s; }
        .comm-hero-in > *:nth-child(3) { animation-delay: 0.58s; }
        @keyframes commRise { to { opacity: 1; transform: none; } }
        .comm-grain { opacity: 0.06; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .comm-scroll-cue { animation: commCue 2.6s ease-in-out infinite; }
        @keyframes commCue { 0%,100% { opacity: 0.5; transform: translateY(0); } 50% { opacity: 1; transform: translateY(4px); } }
        .comm-develop { background: #050505; animation: commDevelop 1.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes commDevelop { from { opacity: 1; } to { opacity: 0; } }
        /* TERMS — game-menu stat panel with bracket corners */
        .comm-statpanel { position: relative; border: 1px solid rgba(197,160,89,0.20); background: ${T.panel};
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border-radius: 14px;
          padding: clamp(1.4rem, 3vw, 2.4rem) clamp(1.4rem, 3vw, 2.6rem) clamp(0.6rem, 1.5vw, 1rem); }
        .comm-statpanel::before, .comm-statpanel::after { content: ''; position: absolute; width: 20px; height: 20px; border: 0 solid ${T.goldDeep}; }
        .comm-statpanel::before { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; border-top-left-radius: 14px; }
        .comm-statpanel::after { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; border-bottom-right-radius: 14px; }
        .comm-terms { margin-top: 1.4rem; }
        .comm-stat { position: relative; padding: 0.4rem 1.4rem 1.5rem 0; transition: opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1); }
        .comm-stat-idx { display: block; color: ${T.gold}; opacity: 0.7; font-size: 10px; font-weight: 600; letter-spacing: 0.3em; margin-bottom: 0.8rem; }
        .comm-stat-v { color: ${T.goldDeep}; font-size: clamp(2rem, 3.4vw, 3rem); line-height: 1; letter-spacing: -0.01em; text-shadow: 0 0 30px rgba(197,160,89,0.18); }
        .comm-stat-l { color: ${T.soft}; margin-top: 0.7rem; font-size: 11.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
        @media (min-width: 1024px) { .comm-stat + .comm-stat::before { content: ''; position: absolute; left: -0.7rem; top: 0.2rem; bottom: 1.4rem; width: 1px; background: rgba(197,160,89,0.18); } }
        /* Pullquote — short brass rule above, no side stripe */
        .comm-quote { padding-left: 0; }
        .comm-quote::before { content: ''; display: block; width: 54px; height: 2px; background: ${T.gold}; margin-bottom: clamp(1.2rem, 2.4vw, 1.7rem); }
        /* CTA — sun pill with ember glow (TLOU primary) */
        .comm-cta {
          display: inline-flex; align-items: center; gap: 0.9em;
          color: #1a1408; background: ${T.goldDeep};
          padding: 1.05rem 2.6rem; border-radius: 999px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.26em;
          transition: transform .4s cubic-bezier(0.16,1,0.3,1), background .35s ease, box-shadow .35s ease;
          box-shadow: 0 14px 40px -14px rgba(197,160,89,0.75), 0 0 0 1px rgba(197,160,89,0.25);
        }
        .comm-cta:hover { transform: translateY(-2px); background: ${'#f3e5ab'}; box-shadow: 0 20px 56px -16px rgba(243,229,171,0.65), inset 0 0 0 1px rgba(26,20,8,0.2); }
        .comm-cta-arrow { transition: transform .35s cubic-bezier(0.16,1,0.3,1); }
        .comm-cta:hover .comm-cta-arrow { transform: translateX(4px); }
        .comm-cta:active { transform: translateY(0); }
        .comm-cta:disabled { opacity: 0.45; cursor: not-allowed; }
        @media (prefers-reduced-motion: reduce) {
          .comm-ken, .comm-ken-slow, .comm-scroll-cue, .comm-hero-in > *, .comm-reveal { animation: none !important; opacity: 1 !important; transform: none !important; transition: none !important; }
          .comm-develop { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </section>
  );
};

const Para: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-inter" style={{ color: T.body, fontSize: '17px', lineHeight: 1.85, fontWeight: 300 }}>{children}</p>
);

// ─── Applied confirmation ────────────────────────────────────────────────────

const AppliedSummary: React.FC<{ application: CommunityApplication; t: (en: string, fr: string) => string }> = ({ application, t }) => {
  const status: CommunityApplicationStatus = application.status ?? 'pending';
  const label: Record<CommunityApplicationStatus, { fr: string; en: string }> = {
    pending: { fr: 'Reçue', en: 'Received' }, approved: { fr: 'Approuvée', en: 'Approved' }, declined: { fr: 'Fermée', en: 'Closed' },
  };
  return (
    <div className="max-w-2xl comm-statpanel" style={{ padding: '1.6rem 1.8rem' }}>
      <div className="flex items-center justify-start gap-4 flex-wrap mb-4">
        {application.photoURL && <img src={application.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${T.gold}` }} />}
        <div className="text-left">
          <span className="font-inter uppercase block mb-1" style={{ color: T.gold, fontSize: '10px', letterSpacing: '0.3em' }}>{t('Your application', 'Ta candidature')}</span>
          <h3 className="font-fraunces" style={{ color: T.ink, fontSize: '1.5rem' }}>{application.displayName}</h3>
        </div>
        <span className="ml-auto font-inter uppercase" style={{ background: 'rgba(197,160,89,0.16)', color: T.goldDeep, fontSize: '10px', letterSpacing: '0.18em', padding: '4px 12px', borderRadius: '999px' }}>
          {t(label[status].en, label[status].fr)}
        </span>
      </div>
      <p className="font-inter text-sm leading-relaxed" style={{ color: T.body, maxWidth: '46ch', fontWeight: 300 }}>
        {t("Thank you. We read every application by hand. We'll reach out by email or phone when we've had time to sit with it.",
           "Merci. On lit chaque candidature à la main. On te reviendra par courriel ou par téléphone une fois qu'on aura pris le temps de s'y asseoir.")}
      </p>
      {application.introduction && <p className="font-fraunces-it text-lg mt-5 leading-relaxed" style={{ color: T.goldDeep, maxWidth: '50ch' }}>"{application.introduction}"</p>}
    </div>
  );
};

// ─── Apply form ───────────────────────────────────────────────────────────────

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
    <div className="max-w-2xl comm-statpanel" style={{ padding: 'clamp(1.5rem,3vw,2.2rem)' }}>
      <div className="flex items-center gap-4 mb-8">
        {memberProfile.photoURL ? (
          <img src={memberProfile.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${T.gold}` }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-fraunces text-lg" style={{ background: 'rgba(197,160,89,0.14)', boxShadow: `0 0 0 1px ${T.gold}`, color: T.goldDeep }}>{memberProfile.displayName?.charAt(0) ?? '?'}</div>
        )}
        <div>
          <div className="font-fraunces text-lg" style={{ color: T.ink }}>{memberProfile.displayName}</div>
          <div className="text-[11px] font-inter" style={{ color: T.soft }}>{memberProfile.email}<span style={{ color: T.gold }}> · {t('photo from your Google profile', 'photo de ton profil Google')}</span></div>
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
        {error && <p className="text-sm mb-4" style={{ color: '#e07a3a' }}>{error}</p>}
        <div className="flex flex-wrap gap-4 items-center justify-end">
          <button onClick={onCancel} className="px-5 py-3 text-xs uppercase font-inter" style={{ color: T.soft, letterSpacing: '0.3em' }}>{t('Cancel', 'Annuler')}</button>
          <button onClick={submit} disabled={!formValid || saving} className="comm-cta font-inter uppercase">{saving ? '…' : t('Send my application', 'Envoyer ma candidature')}</button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block mb-6">
    <span className="block uppercase font-inter mb-2" style={{ color: T.gold, fontSize: '10px', letterSpacing: '0.22em', fontWeight: 600 }}>{label}</span>
    {children}
    {hint && <span className="block font-fraunces-it mt-1.5" style={{ color: T.soft, fontSize: '13px' }}>{hint}</span>}
  </label>
);

const baseInput = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%', background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.line}`, borderRadius: '8px',
  padding: '10px 12px', fontSize: '16px', color: T.ink, outline: 'none', ...extra,
});
const Line: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="font-inter" style={baseInput()}
    onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(197,160,89,0.30)')} />
);
const Area: React.FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="font-inter" style={baseInput({ resize: 'none' })}
    onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(197,160,89,0.30)')} />
);
