import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import {
  doc, setDoc,
  collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { AuthModal, type MemberProfile } from './AuthModal';
import { WwoofingGallery } from './WwoofingGallery';
import { SeoBlock } from './SeoBlock';
import type { WwooferProfile, WwooferVisitRequest, WwooferMessage, WwooferStatus } from '../types';

interface WwoofingPageProps {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
  onShowPrivacy: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TASK_OPTIONS = [
  { id: 'gardening',   en: 'Gardens & Permaculture',     fr: 'Jardins & Permaculture' },
  { id: 'cooking',     en: 'Kitchen & Cooking',          fr: 'Cuisine' },
  { id: 'animals',     en: 'Animal Care',                fr: 'Soins aux animaux' },
  { id: 'construction',en: 'Construction & Carpentry',   fr: 'Construction & Menuiserie' },
  { id: 'cleaning',    en: 'Housekeeping',               fr: 'Entretien ménager' },
  { id: 'arts',        en: 'Arts & Music',               fr: 'Arts & Musique' },
  { id: 'hosting',     en: 'Hosting & Reception',        fr: 'Accueil & Réception' },
  { id: 'forest',      en: 'Forest & Land Care',         fr: 'Forêt & Entretien du terrain' },
  { id: 'tech',        en: 'Tech / Web',                 fr: 'Techno / Web' },
  { id: 'events',      en: 'Event Production',           fr: 'Production d\'événements' },
];

const ACCOMMODATION_OPTIONS = [
  { id: 'shared',  en: 'Shared room in the manor',  fr: 'Chambre partagée au manoir' },
  { id: 'private', en: 'Private room (if available)', fr: 'Chambre privée (selon disponibilité)' },
  { id: 'yurt',    en: 'Yurt',                      fr: 'Yourte' },
  { id: 'tent',    en: 'Tent / camping',            fr: 'Tente / camping' },
  { id: 'flexible',en: 'Flexible, whatever works', fr: 'Flexible, à votre convenance' },
];

// When the user is on the "Logistics" section and changes the dropdown,
// the sticky rail picture switches to the matching accommodation.
const ACCOMMODATION_IMAGES: Record<string, string> = {
  shared:   'https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg',
  private:  'https://storage.googleapis.com/salondesinconnus/inn/ecrivaine%20banana.jpg',
  yurt:     'https://storage.googleapis.com/salondesinconnus/inn/yourte.png',
  tent:     'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg',
  flexible: 'https://storage.googleapis.com/salondesinconnus/inn/yourte.png',
};

const MIN_DAYS = 7;

// TODO: PLACEHOLDER COPY, please review/edit.
const HERO_COPY = {
  fr: "Vous voulez vivre la maison de l'intérieur, pas la visiter, l'habiter une ou deux semaines. C'est exactement ce qu'on cherche aussi : des mains, des idées, des soirées autour du feu.",
  en: "You want to live the house from the inside, not visit it, inhabit it for a week or two. That's exactly what we're looking for: hands, ideas, nights around the fire.",
};

// Definitions. The Wwoofing block stays; the Ceilidh block contextualises the
// secondary CTA ("Voir le Ceilidh") so visitors understand what they'd see.
const WWOOFING_DEFINITION = {
  fr: "WWOOF (World Wide Opportunities on Organic Farms) est un réseau mondial qui met en lien des hôtes et des bénévoles. Le principe est simple : environ quatre à cinq heures de travail par jour aux jardins, à la cuisine ou autour du lieu, en échange du gîte, du couvert, et du temps qu'on passe ensemble. Ici, ce n'est pas une ferme classique : c'est un manoir vivant, des potagers, des arts, des saisons.",
  en: "WWOOF (World Wide Opportunities on Organic Farms) is a worldwide network connecting hosts with volunteers. The arrangement is simple: roughly four to five hours of work a day in the gardens, the kitchen or around the property, in exchange for room, board, and the time spent together. We're not a classic farm, we're a living manor: kitchen gardens, arts, seasons.",
};

const CEILIDH_DEFINITION = {
  fr: "Un ceilidh (prononcé « keilī ») est un rassemblement d'origine écossaise et irlandaise : musique, danse, récits autour du feu. Notre Grand Ceilidh de Mai 2026 a lieu du 21 au 25 mai : cinq jours de spectacles, de banquets et de chantiers communs à la Maison Favier. Plusieurs wwoofers y prennent part, c'est l'aboutissement de la saison.",
  en: "A ceilidh (pronounced \"kay-lee\") is a Scottish/Irish gathering: music, dance, storytelling around the fire. Our Grand Ceilidh de Mai 2026 runs May 21–25, five days of shows, banquets and shared work at Maison Favier. Many wwoofers take part, it's the season's culmination.",
};

// Expectations + daily rhythm, kindly stated, with reciprocity (we ask the
// applicant their needs in the form, see section 06).
const NEEDS_STATEMENT = {
  fr: "En devenant wwoofer chez nous, vous rejoignez la communauté pour un temps. On vous demande au minimum quatre heures de travail concentré par jour, au jardin, à la cuisine, ou autour des espaces communs. Les repas, on les prend ensemble, à la grande table. La méditation est offerte deux fois par jour, sans obligation : vous y allez si ça vous fait du bien. Le reste du temps vous appartient, pour lire, créer, vous reposer, ou aller marcher dans les bois.",
  en: "By wwoofing with us, you join the community for a stretch of time. We ask for a minimum of four focused hours of work each day, in the garden, the kitchen, or around the shared spaces. Meals are taken together at the long table. Meditation is offered twice a day, never required, join if it does you good. The rest of the time is yours, to read, create, rest, or walk in the woods.",
};

const SCHEDULE: { time: string; fr: string; en: string }[] = [
  { time: '7:00 – 8:00',   fr: 'Matin relax',                  en: 'Easy morning' },
  { time: '8:00 – 9:00',   fr: 'Méditation (facultative)',     en: 'Meditation (optional)' },
  { time: '9:00 – 12:00',  fr: 'Travail · Période 1',          en: 'Work · Period 1' },
  { time: '12:00 – 13:00', fr: 'Repas partagé',                en: 'Shared meal' },
  { time: '13:00 – 14:00', fr: 'Pause',                        en: 'Rest' },
  { time: '14:00 – 17:00', fr: 'Travail · Période 2',          en: 'Work · Period 2' },
  { time: '17:00 – 18:00', fr: 'Repas partagé',                en: 'Shared meal' },
  { time: '18:00 – 20:00', fr: 'Temps libre',                  en: 'Free time' },
  { time: '20:00 – 21:00', fr: 'Méditation (facultative)',     en: 'Meditation (optional)' },
  { time: '21:00 – 23:00', fr: 'Détente ou repos',             en: 'Wind down or sleep' },
];

// Section meta for the apply-form sticky rail
const APPLY_SECTIONS: {
  id: 'contact' | 'tasks' | 'health' | 'logistics' | 'dates' | 'needs';
  number: string;
  titleFr: string;
  titleEn: string;
  image: string;
  quoteFr: string;
  quoteEn: string;
}[] = [
  {
    id: 'contact', number: '01',
    titleFr: 'Contact', titleEn: 'Contact',
    image: 'https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg',
    quoteFr: "Avant d'ouvrir la porte, on aime savoir qui frappe.",
    quoteEn: "Before we open the door, we like to know who's knocking.",
  },
  {
    id: 'tasks', number: '02',
    titleFr: 'Tâches & Expérience', titleEn: 'Tasks & Experience',
    image: 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg',
    quoteFr: 'Les mains parlent souvent plus que les mots.',
    quoteEn: 'Hands often say more than words.',
  },
  {
    id: 'health', number: '03',
    titleFr: 'Diète & Santé', titleEn: 'Diet & Health',
    image: 'https://storage.googleapis.com/salondesinconnus/Cuisine/Plating%20alexis%20ai%20(1).jpg',
    quoteFr: "On cuisine pour vous comme pour nous, avec attention.",
    quoteEn: "We cook for you the way we cook for ourselves, with care.",
  },
  {
    id: 'logistics', number: '04',
    titleFr: 'Logistique', titleEn: 'Logistics',
    image: 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg',
    quoteFr: "Il y a plusieurs façons de dormir ici.",
    quoteEn: "There are several ways to sleep here.",
  },
  {
    id: 'dates', number: '05',
    titleFr: 'Dates Demandées', titleEn: 'Requested Dates',
    image: 'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg',
    quoteFr: "Sept jours minimum. Moins, et on ne se rencontre pas vraiment.",
    quoteEn: "Seven days minimum. Less than that, and we don't really meet.",
  },
  {
    id: 'needs', number: '06',
    titleFr: 'Vos Besoins', titleEn: 'Your Needs',
    image: 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/biblio.png',
    quoteFr: "Pour bien donner, il faut savoir recevoir.",
    quoteEn: "To give well, one must know how to receive.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const daysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const a = new Date(start + 'T00:00:00').getTime();
  const b = new Date(end + 'T00:00:00').getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Page ───────────────────────────────────────────────────────────────────

export const WwoofingPage: React.FC<WwoofingPageProps> = ({
  onNavigate, language, user, memberProfile, onUserChange, onShowPrivacy,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const pageRef = useRef<HTMLDivElement>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [pendingApply, setPendingApply] = useState(false);
  // The volunteer wwoofer form is hidden until the visitor explicitly asks for
  // it (keeps the paid community offer and the volunteer flow visually separate).
  const [showWwooferForm, setShowWwooferForm] = useState(false);

  const [wwooferProfile, setWwooferProfile] = useState<WwooferProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [visitRequests, setVisitRequests] = useState<WwooferVisitRequest[]>([]);
  const [messages, setMessages] = useState<WwooferMessage[]>([]);
  const [showRequestDates, setShowRequestDates] = useState(false);

  useEffect(() => {
    if (!user || !db) {
      setWwooferProfile(null);
      setProfileLoaded(true);
      return;
    }
    setProfileLoaded(false);
    const unsub = onSnapshot(doc(db, 'wwoofers', user.uid), (snap) => {
      setWwooferProfile(snap.exists() ? (snap.data() as WwooferProfile) : null);
      setProfileLoaded(true);
    }, () => setProfileLoaded(true));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || !db || !wwooferProfile) {
      setVisitRequests([]);
      setMessages([]);
      return;
    }
    const unsubReq = onSnapshot(
      query(collection(db, 'wwoofers', user.uid, 'visitRequests'), orderBy('createdAt', 'desc')),
      (snap) => setVisitRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WwooferVisitRequest)),
      () => {},
    );
    const unsubMsg = onSnapshot(
      query(collection(db, 'wwoofers', user.uid, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WwooferMessage)),
      () => {},
    );
    return () => { unsubReq(); unsubMsg(); };
  }, [user, wwooferProfile]);

  const handleApplyClick = useCallback(() => {
    if (!user || !memberProfile) {
      setPendingApply(true);
      setShowAuth(true);
      return;
    }
    setShowWwooferForm(true);
    setTimeout(() => document.getElementById('wwoofing-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [user, memberProfile]);

  const handleAuthSuccess = useCallback((newUser: User, newProfile: MemberProfile) => {
    onUserChange(newUser, newProfile);
    setShowAuth(false);
  }, [onUserChange]);

  // If sign-in was triggered by the "apply as wwoofer" button, reveal the form
  // once authenticated (explicit intent carried across the auth round-trip).
  useEffect(() => {
    if (pendingApply && user && memberProfile) {
      setShowWwooferForm(true);
      setPendingApply(false);
      setTimeout(() => document.getElementById('wwoofing-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [pendingApply, user, memberProfile]);

  const hasApplied = !!wwooferProfile;

  return (
    <div ref={pageRef} className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#050505] text-neutral-200 animate-fadeIn">
      {/* Header */}
      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('INN')}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {t('Back to the Inn', "Retour à l'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">WWOOFING</span>
        </div>
      </header>

      <main className="pt-16">
        {/* ── HERO, split diptych: photo left, panel right ───────────────── */}
        <section className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] min-h-[80vh]">
            {/* Photo column */}
            <div className="group relative overflow-hidden min-h-[45vh] lg:min-h-[80vh] bg-[#050505]">
              <img
                src="/wwoof/bw-7.jpg"
                alt="Une wwoofeuse au travail, Maison Favier"
                className="w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
                style={{ objectPosition: '50% 45%' }}
              />
              {/* Subtle gradient on photo edge for visual blend with panel */}
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0a0a0a] hidden lg:block" />
            </div>

            {/* Panel column */}
            <div className="relative bg-[#0a0a0a] border-t lg:border-t-0 lg:border-l border-[#c5a059]/30 px-8 md:px-12 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
              {/* Decorative gold rule */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12 bg-[#c5a059]"></div>
                <span className="text-[10px] uppercase tracking-[0.5em] text-[#c5a059] font-cinzel">
                  {t('Live & Work', 'Vivre & Travailler')}
                </span>
              </div>

              <h1 className="font-prata text-6xl md:text-7xl lg:text-8xl text-[#f3e5ab] mb-8 leading-[0.92]" style={{ letterSpacing: '-0.02em' }}>
                Wwoofing
              </h1>

              <p className="text-base md:text-lg text-neutral-300 leading-relaxed font-lato mb-10 max-w-md">
                {t(HERO_COPY.en, HERO_COPY.fr)}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApplyClick}
                  className="px-7 py-3.5 bg-[#c5a059] text-black font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#f3e5ab] transition-all hover:scale-[1.02] active:scale-95"
                >
                  {hasApplied
                    ? t('Open my space', 'Ouvrir mon espace')
                    : t('Apply as a wwoofer', 'Postuler comme wwoofer')}
                </button>
                <button
                  onClick={() => onNavigate('CEILIDH')}
                  className="px-7 py-3.5 bg-transparent border-2 border-[#c5a059] text-[#c5a059] font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#c5a059] hover:text-black transition-all"
                >
                  {t('See the Ceilidh', 'Voir le Ceilidh')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTEXT, what is wwoofing, what is the Ceilidh ────────────── */}
        <section className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 border-b border-[#c5a059]/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-16">
              <div className="h-px w-12 bg-[#c5a059]"></div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-cinzel">
                {t('Context', 'Contexte')}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              {/* Wwoofing column, sits at the top */}
              <div>
                <span className="font-cinzel text-xs text-[#c5a059] tracking-[0.4em]">01</span>
                <h2 className="font-prata text-4xl md:text-5xl text-[#f3e5ab] tracking-tight mt-3 mb-6">
                  {t('What is wwoofing?', 'Qu\'est-ce que le wwoofing ?')}
                </h2>
                <div className="h-px w-16 bg-[#c5a059] mb-6"></div>
                <p className="font-lato text-[15px] md:text-base text-neutral-300 leading-[1.8]">
                  {t(WWOOFING_DEFINITION.en, WWOOFING_DEFINITION.fr)}
                </p>
                <p className="font-cormorant italic text-xl text-[#f3e5ab] mt-6">
                  {t('Live and work, share a season.', 'Vivre et travailler, partager une saison.')}
                </p>
              </div>

              {/* Ceilidh column, offset down for asymmetry */}
              <div className="lg:mt-24">
                <span className="font-cinzel text-xs text-[#c5a059] tracking-[0.4em]">02</span>
                <h2 className="font-prata text-4xl md:text-5xl text-[#f3e5ab] tracking-tight mt-3 mb-6">
                  {t('And the Ceilidh?', 'Et le Ceilidh ?')}
                </h2>
                <div className="h-px w-16 bg-[#c5a059] mb-6"></div>
                <p className="font-lato text-[15px] md:text-base text-neutral-300 leading-[1.8]">
                  {t(CEILIDH_DEFINITION.en, CEILIDH_DEFINITION.fr)}
                </p>
                <button
                  onClick={() => onNavigate('CEILIDH')}
                  className="mt-8 inline-flex items-center gap-2 text-xs font-cinzel uppercase tracking-[0.3em] text-[#c5a059] hover:text-[#f3e5ab] transition-colors group"
                >
                  {t('Discover the Ceilidh', 'Découvrir le Ceilidh')}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── RHYTHM OF THE HOUSE, needs statement + daily schedule ─────── */}
        <section className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 border-b border-[#c5a059]/10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px w-12 bg-[#c5a059]"></div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-cinzel">
                {t('The rhythm of the house', 'Le rythme de la maison')}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 lg:gap-20 items-start">
              {/* Left, needs statement */}
              <div className="lg:sticky lg:top-24">
                <h2 className="font-prata text-4xl md:text-5xl text-[#f3e5ab] tracking-tight mb-6 leading-tight">
                  {t('A day with us', 'Une journée chez nous')}
                </h2>
                <p className="font-lato text-[15px] md:text-base text-neutral-300 leading-[1.8] mb-8">
                  {t(NEEDS_STATEMENT.en, NEEDS_STATEMENT.fr)}
                </p>
                <div>
                  <span className="block h-px w-12 bg-[#c5a059] mb-4" aria-hidden></span>
                  <p className="font-cormorant italic text-xl text-[#c5a059] leading-snug">
                    {t(
                      "What we ask: 4 focused hours a day. The rest, we share.",
                      "Ce qu'on demande : 4 heures de travail concentré par jour. Le reste, on le partage."
                    )}
                  </p>
                </div>
              </div>

              {/* Right, timetable */}
              <div>
                <ul>
                  {SCHEDULE.map((row, idx) => (
                    <li
                      key={idx}
                      className="grid grid-cols-[140px_1fr] items-baseline gap-4 py-3.5 border-b border-white/[0.07] last:border-b-0"
                    >
                      <span className="font-cinzel text-[#c5a059] text-[13px] tracking-[0.15em] tabular-nums">
                        {row.time}
                      </span>
                      <span className="font-lato text-[15px] text-neutral-200">
                        {t(row.en, row.fr)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── BODY: form OR client space ─────────────────────────────────── */}
        <section className="px-6 md:px-12 lg:px-20 py-20">
          {!profileLoaded && user ? (
            <div className="text-center text-neutral-500 font-lato py-16">
              {t('Loading…', 'Chargement…')}
            </div>
          ) : !hasApplied ? (
            showWwooferForm && user && memberProfile ? (
              <div id="wwoofing-apply">
                <ApplyForm
                  language={language}
                  user={user}
                  memberProfile={memberProfile}
                  pageRef={pageRef}
                  onCancel={() => setShowWwooferForm(false)}
                  onSubmitted={() => { /* profile snapshot will flip hasApplied */ }}
                />
              </div>
            ) : (
              <div className="max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <span className="h-px w-10 bg-[#c5a059]" aria-hidden></span>
                  <span className="font-cinzel text-[11px] uppercase tracking-[0.4em] text-[#c5a059]">
                    {t('Volunteer wwoofing', 'Wwoofing bénévole')}
                  </span>
                </div>
                <p className="font-lato text-neutral-300 leading-relaxed mb-4 max-w-xl">
                  {t(
                    'This is the volunteer path: a stay in exchange for room, board and shared time. Apply when you are ready.',
                    "Ceci, c'est la voie bénévole : un séjour en échange du gîte, du couvert et du temps partagé. Postule quand tu es prêt·e."
                  )}
                </p>
                <button onClick={() => onNavigate('COMMUNITY')} className="font-cinzel text-[11px] uppercase tracking-[0.3em] text-[#c5a059] hover:text-[#f3e5ab] transition-colors mb-8 inline-block">
                  {t('Looking for the paid resident place? →', 'Tu cherches la place rémunérée ? →')}
                </button>
                <div>
                  <button
                    onClick={handleApplyClick}
                    className="px-8 py-4 bg-[#c5a059] text-[#1a1107] font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#d2b06a] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {t('Fill my wwoofer application', 'Remplir ma candidature wwoofer')}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="max-w-4xl mx-auto space-y-16">
              <ProfileSummary profile={wwooferProfile!} t={t} />
              <VisitRequestsBlock
                t={t}
                requests={visitRequests}
                onAddRequest={() => setShowRequestDates(true)}
                showRequestForm={showRequestDates}
                onCloseRequestForm={() => setShowRequestDates(false)}
                user={user}
              />
              <MessagesBlock t={t} messages={messages} user={user} memberProfile={memberProfile} />
            </div>
          )}
        </section>

        <WwoofingGallery language={language} />

        {/* ── Ceilidh reference (annual, not on the home anymore) ─────────── */}
        <section className="px-6 md:px-12 lg:px-20 py-20 border-t border-[#c5a059]/10 bg-[#050505]">
          <div className="max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">
            <div>
              <span className="font-cinzel text-[11px] uppercase tracking-[0.4em] text-[#c5a059]">{t('Once a year', 'Une fois par an')}</span>
              <h3 className="font-prata text-3xl md:text-4xl text-[#f3e5ab] mt-3 mb-3 tracking-tight">{t('Want to give a big push?', 'Envie de donner un gros coup ?')}</h3>
              <p className="font-lato text-neutral-300 leading-relaxed max-w-xl">{t('Every early May we hold a ceilidh: five days of shows, banquets and shared work, the culmination of the season.', "Au début de chaque mois de mai, on tient un ceilidh : cinq jours de spectacles, de banquets et de chantiers communs, l'aboutissement de la saison.")}</p>
            </div>
            <button onClick={() => onNavigate('CEILIDH')} className="px-8 py-4 border-2 border-[#c5a059] text-[#c5a059] font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#c5a059] hover:text-[#1a1107] transition-all whitespace-nowrap">{t('Discover the Ceilidh', 'Découvrir le Ceilidh')}</button>
          </div>
        </section>

        <SeoBlock viewKey="WWOOFING" language={language} onNavigate={onNavigate} />
      </main>

      {showAuth && (
        <AuthModal
          language={language}
          onClose={() => { setShowAuth(false); setPendingApply(false); }}
          onAuthSuccess={handleAuthSuccess}
          onShowPrivacy={onShowPrivacy}
        />
      )}

      <style>{`
        .animate-fadeIn { animation: fadeInPage 0.6s ease-out forwards; }
        @keyframes fadeInPage {
          from { opacity: 0; filter: blur(5px); }
          to   { opacity: 1; filter: blur(0); }
        }
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .rail-fade-in { animation: railFade 0.5s ease-out; }
        @keyframes railFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Apply form, diptych layout with sticky rail
// ────────────────────────────────────────────────────────────────────────────

const ApplyForm: React.FC<{
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  pageRef: React.RefObject<HTMLDivElement>;
  onCancel: () => void;
  onSubmitted: () => void;
}> = ({ language, user, memberProfile, pageRef, onCancel, onSubmitted }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  // Form state
  const [phone, setPhone] = useState(memberProfile.phone ?? '');
  const [city, setCity]   = useState('');
  const [country, setCountry] = useState('');
  const [age, setAge]     = useState<number | ''>('');
  const [languages, setLanguages] = useState('');
  const [preferredTasks, setPreferredTasks] = useState<string[]>([]);
  const [experience, setExperience]   = useState('');
  const [motivations, setMotivations] = useState('');
  const [dietary, setDietary]         = useState('');
  const [allergies, setAllergies]     = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [accommodation, setAccommodation] = useState('flexible');
  const [hasVehicle, setHasVehicle]   = useState(false);
  const [smoker, setSmoker]           = useState(false);
  const [emergencyName, setEmergencyName]   = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd]     = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [needs, setNeeds] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Active section tracking for the sticky rail
  const [activeSectionId, setActiveSectionId] = useState<typeof APPLY_SECTIONS[number]['id']>('contact');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!pageRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).dataset.section;
          if (id) setActiveSectionId(id as any);
        }
      },
      {
        root: pageRef.current,
        rootMargin: '-25% 0px -55% 0px',
        threshold: 0,
      },
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pageRef]);

  const numberOfDays = daysBetween(start, end);
  const datesValid = start && end && numberOfDays >= MIN_DAYS;
  const formValid = phone && city && motivations && preferredTasks.length > 0 && datesValid;

  const togglePreferred = (id: string) => {
    setPreferredTasks(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const submit = async () => {
    setError(null);
    if (!db) return;
    if (!formValid) {
      setError(t('Please fill all required fields.', 'Veuillez remplir tous les champs requis.'));
      return;
    }
    setSaving(true);
    try {
      const profile: WwooferProfile = {
        uid: user.uid,
        displayName: memberProfile.displayName,
        email: memberProfile.email,
        phone: phone.trim(),
        photoURL: memberProfile.photoURL,
        city: city.trim(),
        country: country.trim() || undefined,
        age: typeof age === 'number' ? age : undefined,
        languages: languages.split(',').map(s => s.trim()).filter(Boolean),
        preferredTasks,
        experience: experience.trim() || undefined,
        motivations: motivations.trim(),
        dietaryRestrictions: dietary.trim() || undefined,
        allergies: allergies.trim() || undefined,
        healthNotes: healthNotes.trim() || undefined,
        accommodationPreference: accommodation,
        hasVehicle,
        smoker,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
        needs: needs.trim() || undefined,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const clean: any = {};
      Object.entries(profile).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await setDoc(doc(db, 'wwoofers', user.uid), clean);

      await addDoc(collection(db, 'wwoofers', user.uid, 'visitRequests'), {
        startDate: start,
        endDate: end,
        numberOfDays,
        notes: requestNotes.trim() || null,
        status: 'pending' as WwooferStatus,
        createdAt: serverTimestamp(),
      });
      onSubmitted();
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  const active = APPLY_SECTIONS.find(s => s.id === activeSectionId)!;

  // When viewing the Logistics section, the rail picture follows the dropdown.
  const railImage = activeSectionId === 'logistics' && ACCOMMODATION_IMAGES[accommodation]
    ? ACCOMMODATION_IMAGES[accommodation]
    : active.image;
  const railImageKey = activeSectionId === 'logistics' ? `logistics-${accommodation}` : active.id;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-12 lg:gap-20">
        {/* ── Sticky rail (left) ──────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="relative aspect-[4/5] overflow-hidden border border-[#c5a059]/20 isolate transform-gpu">
              <img
                key={railImageKey}
                src={railImage}
                alt=""
                className="rail-fade-in w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                <span className="font-cinzel text-[11px] tracking-[0.4em] text-[#c5a059]">{active.number}</span>
                <div className="h-px flex-1 bg-[#c5a059]/40"></div>
                <span className="font-cinzel text-[11px] tracking-[0.3em] uppercase text-[#f3e5ab]">
                  {language === 'FR' ? active.titleFr : active.titleEn}
                </span>
              </div>
            </div>
            <div className="mt-8 pl-1">
              <div className="h-px w-12 bg-[#c5a059] mb-5"></div>
              <p
                key={active.id + '-q'}
                className="rail-fade-in font-cormorant italic text-2xl lg:text-[26px] text-[#f3e5ab] leading-snug max-w-sm"
              >
                "{language === 'FR' ? active.quoteFr : active.quoteEn}"
              </p>
            </div>
          </div>
        </aside>

        {/* ── Form (right), matte panel (no glassmorphism) ──────────── */}
        <div
          className="relative rounded-[28px] p-8 md:p-12 lg:p-14
                     bg-[#0a0a0a] border border-[#c5a059]/15
                     shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
        >
          {/* Subtle inner gold glow at the top edge */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent" />

          <div className="mb-16">
            <span className="block text-[10px] uppercase tracking-[0.5em] text-[#c5a059] font-cinzel mb-4">
              {t('Application', 'Candidature')}
            </span>
            <h2 className="font-prata text-4xl md:text-5xl text-[#f3e5ab] tracking-tight leading-tight">
              {t('Tell us your story.', 'Racontez-nous votre histoire.')}
            </h2>
          </div>

          {/* Section 01, Contact */}
          <FormSection
            sectionRef={el => { sectionRefs.current.contact = el; }}
            sectionId="contact"
            number="01"
            title={t('Contact', 'Contact')}
            tint="from-white/[0.025] via-transparent to-transparent"
            mobileImage={APPLY_SECTIONS[0].image}
            mobileQuote={t(APPLY_SECTIONS[0].quoteEn, APPLY_SECTIONS[0].quoteFr)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <Field label={t('Phone *', 'Téléphone *')} value={phone} onChange={setPhone} />
              <Field label={t('City *', 'Ville *')} value={city} onChange={setCity} />
              <Field label={t('Country', 'Pays')} value={country} onChange={setCountry} />
              <FieldNumber label={t('Age', 'Âge')} value={age} onChange={setAge} />
              <FieldFullWidth>
                <Field label={t('Languages (comma-separated)', 'Langues (séparées par des virgules)')} value={languages} onChange={setLanguages} />
              </FieldFullWidth>
            </div>
          </FormSection>

          {/* Section 02, Tasks & experience */}
          <FormSection
            sectionRef={el => { sectionRefs.current.tasks = el; }}
            sectionId="tasks"
            number="02"
            title={t('Tasks & experience', 'Tâches & expérience')}
            tint="from-[#c5a059]/[0.05] via-transparent to-transparent"
            mobileImage={APPLY_SECTIONS[1].image}
            mobileQuote={t(APPLY_SECTIONS[1].quoteEn, APPLY_SECTIONS[1].quoteFr)}
          >
            <div>
              <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-4">
                {t('Preferred tasks * (pick a few)', 'Tâches préférées * (cochez-en quelques-unes)')}
              </span>
              <div className="flex flex-wrap gap-2 mb-10">
                {TASK_OPTIONS.map(opt => {
                  const active = preferredTasks.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => togglePreferred(opt.id)}
                      className={`text-xs px-4 py-2 rounded-full border transition-all font-lato ${
                        active
                          ? 'bg-[#c5a059] text-black border-[#c5a059] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                          : 'bg-transparent text-neutral-300 border-white/15 hover:border-[#c5a059]/60 hover:text-[#f3e5ab]'
                      }`}
                    >
                      {t(opt.en, opt.fr)}
                    </button>
                  );
                })}
              </div>
            </div>
            <FieldTextarea
              label={t('Relevant experience', 'Expérience pertinente')}
              value={experience}
              onChange={setExperience}
              placeholder={t('Past wwoofing, gardens, kitchens, building, hosting…', 'Wwoofing antérieur, jardins, cuisine, construction, accueil…')}
            />
            <FieldTextarea
              label={t('Why join us? *', 'Pourquoi nous rejoindre ? *')}
              value={motivations}
              onChange={setMotivations}
              placeholder={t('A few words in your own voice', 'Quelques mots dans votre voix')}
              rows={4}
            />
          </FormSection>

          {/* Section 03, Diet & health */}
          <FormSection
            sectionRef={el => { sectionRefs.current.health = el; }}
            sectionId="health"
            number="03"
            title={t('Diet & health', 'Diète & santé')}
            tint="from-[#c5a059]/[0.04] via-transparent to-transparent"
            mobileImage={APPLY_SECTIONS[2].image}
            mobileQuote={t(APPLY_SECTIONS[2].quoteEn, APPLY_SECTIONS[2].quoteFr)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-2">
              <Field label={t('Dietary restrictions', 'Restrictions alimentaires')} value={dietary} onChange={setDietary} />
              <Field label={t('Allergies', 'Allergies')} value={allergies} onChange={setAllergies} />
            </div>
            <FieldTextarea
              label={t('Anything we should know about your health?', 'À savoir sur votre santé ?')}
              value={healthNotes}
              onChange={setHealthNotes}
            />
          </FormSection>

          {/* Section 04, Logistics */}
          <FormSection
            sectionRef={el => { sectionRefs.current.logistics = el; }}
            sectionId="logistics"
            number="04"
            title={t('Logistics', 'Logistique')}
            tint="from-[#c5a059]/[0.045] via-transparent to-transparent"
            mobileImage={APPLY_SECTIONS[3].image}
            mobileQuote={t(APPLY_SECTIONS[3].quoteEn, APPLY_SECTIONS[3].quoteFr)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-2">
                  {t('Accommodation preference', 'Préférence de logement')}
                </span>
                <select
                  value={accommodation}
                  onChange={(e) => setAccommodation(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#c5a059] focus:outline-none transition-colors"
                >
                  {ACCOMMODATION_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#0a0a0a]">{t(opt.en, opt.fr)}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-3 justify-end pb-1">
                <label className="flex items-center gap-3 text-sm font-lato text-neutral-300 cursor-pointer">
                  <input type="checkbox" checked={hasVehicle} onChange={(e) => setHasVehicle(e.target.checked)} className="accent-[#c5a059]" />
                  {t('I have a vehicle', 'J\'ai un véhicule')}
                </label>
                <label className="flex items-center gap-3 text-sm font-lato text-neutral-300 cursor-pointer">
                  <input type="checkbox" checked={smoker} onChange={(e) => setSmoker(e.target.checked)} className="accent-[#c5a059]" />
                  {t('I smoke', 'Je fume')}
                </label>
              </div>
              <Field label={t('Emergency contact (name)', 'Contact d\'urgence (nom)')} value={emergencyName} onChange={setEmergencyName} />
              <Field label={t('Emergency contact (phone)', 'Contact d\'urgence (téléphone)')} value={emergencyPhone} onChange={setEmergencyPhone} />
            </div>
          </FormSection>

          {/* Section 05, Dates */}
          <FormSection
            sectionRef={el => { sectionRefs.current.dates = el; }}
            sectionId="dates"
            number="05"
            title={t('Requested dates *', 'Dates demandées *')}
            tint="from-[#f3e5ab]/[0.05] via-transparent to-transparent"
            mobileImage={APPLY_SECTIONS[4].image}
            mobileQuote={t(APPLY_SECTIONS[4].quoteEn, APPLY_SECTIONS[4].quoteFr)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
              <FieldDate label={t('Arrival *', 'Arrivée *')}  value={start} min={todayISO()}          onChange={setStart} />
              <FieldDate label={t('Departure *', 'Départ *')} value={end}   min={start || todayISO()} onChange={setEnd} />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className={`font-cinzel text-3xl ${numberOfDays >= MIN_DAYS ? 'text-[#c5a059]' : 'text-neutral-600'}`}>
                {numberOfDays || ', '}
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel">
                  {t('days', 'jours')}
                </div>
                <div className="text-[10px] text-neutral-600 font-lato mt-1">
                  {t('Minimum 7 days', 'Minimum 7 jours')}
                </div>
              </div>
            </div>
            <FieldTextarea
              label={t('Anything to add about these dates?', 'À ajouter sur ces dates ?')}
              value={requestNotes}
              onChange={setRequestNotes}
            />
          </FormSection>

          {/* Section 06, Your needs */}
          <FormSection
            sectionRef={el => { sectionRefs.current.needs = el; }}
            sectionId="needs"
            number="06"
            title={t('Your needs', 'Vos besoins')}
            tint="from-white/[0.03] via-transparent to-transparent"
            mobileImage={APPLY_SECTIONS[5].image}
            mobileQuote={t(APPLY_SECTIONS[5].quoteEn, APPLY_SECTIONS[5].quoteFr)}
          >
            <p className="font-lato text-sm text-neutral-400 leading-relaxed mb-6 max-w-xl">
              {t(
                'We just told you what we ask. Now tell us what you need from us, quiet hours for a personal project, a meal that fits your body, time alone, a skill you want to learn. We listen.',
                "Nous venons de vous communiquer nos besoins. Dites-nous maintenant ce dont vous avez besoin de nous, des heures calmes pour un projet personnel, un repas qui convient à votre corps, du temps seul·e, une compétence à apprendre. On écoute."
              )}
            </p>
            <FieldTextarea
              label={t('What you need from us', 'Ce dont vous avez besoin de nous')}
              value={needs}
              onChange={setNeeds}
              placeholder={t(
                'A few words, anything that would make your stay easier or more meaningful.',
                "Quelques mots, tout ce qui rendrait votre séjour plus simple ou plus signifiant."
              )}
              rows={4}
            />
          </FormSection>

          {/* Submit */}
          <div className="mt-10 pt-10 border-t border-[#c5a059]/20">
            {error && <p className="text-sm text-red-400 mb-6">{error}</p>}
            <div className="flex flex-wrap gap-4 items-center justify-end">
              <button
                onClick={onCancel}
                className="px-5 py-3 text-xs uppercase tracking-[0.3em] text-neutral-500 hover:text-white font-cinzel transition-colors"
              >
                {t('Cancel', 'Annuler')}
              </button>
              <button
                onClick={submit}
                disabled={!formValid || saving}
                className="px-8 py-4 bg-[#c5a059] text-black text-xs font-cinzel font-bold uppercase tracking-[0.3em] hover:bg-[#f3e5ab] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
              >
                {saving ? '…' : t('Send my application', 'Envoyer ma candidature')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Form section wrapper, number + thin gold rule + title; mobile inline rail
// ────────────────────────────────────────────────────────────────────────────

const FormSection: React.FC<{
  sectionRef: (el: HTMLDivElement | null) => void;
  sectionId: string;
  number: string;
  title: string;
  /** Tailwind gradient stops, e.g. "from-[#c5a059]/[0.05] via-transparent to-transparent".
   *  Applied as a soft top-left wash so each section feels like its own panel. */
  tint?: string;
  mobileImage?: string;
  mobileQuote?: string;
  children: React.ReactNode;
}> = ({ sectionRef, sectionId, number, title, tint, mobileImage, mobileQuote, children }) => (
  <div
    ref={sectionRef}
    data-section={sectionId}
    className="relative mb-12 scroll-mt-24 rounded-2xl px-4 py-8 md:px-6 md:py-10 -mx-4 md:-mx-6"
  >
    {/* Section tint, very subtle gradient wash from top-left */}
    {tint && (
      <div
        className={`pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${tint}`}
      />
    )}
    {/* Mobile-only image+quote (since the rail is hidden on mobile) */}
    {mobileImage && (
      <div className="lg:hidden mb-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[#c5a059]/20 isolate transform-gpu">
          <img src={mobileImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-transparent" />
        </div>
        {mobileQuote && (
          <p className="mt-4 font-cormorant italic text-lg text-[#f3e5ab] leading-snug">
            "{mobileQuote}"
          </p>
        )}
      </div>
    )}
    <div className="flex items-baseline gap-4 mb-8">
      <span className="font-cinzel text-xs text-[#c5a059] tracking-[0.4em]">{number}</span>
      <div className="h-px flex-1 bg-[#c5a059]/30"></div>
      <h3 className="font-cinzel text-sm text-[#f3e5ab] uppercase tracking-[0.3em]">{title}</h3>
    </div>
    <div>{children}</div>
  </div>
);

const FieldFullWidth: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="md:col-span-2">{children}</div>
);

// ────────────────────────────────────────────────────────────────────────────
// Form atoms, editorial, underlined, no boxes
// ────────────────────────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-2">{label}</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#c5a059] focus:outline-none transition-colors"
    />
  </label>
);

const FieldNumber: React.FC<{ label: string; value: number | ''; onChange: (v: number | '') => void }> = ({ label, value, onChange }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-2">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#c5a059] focus:outline-none transition-colors"
    />
  </label>
);

const FieldDate: React.FC<{ label: string; value: string; min?: string; onChange: (v: string) => void }> = ({ label, value, min, onChange }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-2">{label}</span>
    <input
      type="date"
      value={value}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#c5a059] focus:outline-none transition-colors [color-scheme:dark]"
    />
  </label>
);

const FieldTextarea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <label className="block mb-6">
    <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-2">{label}</span>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#c5a059] focus:outline-none transition-colors resize-none placeholder:text-neutral-700 placeholder:italic"
    />
  </label>
);

// ────────────────────────────────────────────────────────────────────────────
// Wwoofer client space (after applied), kept structurally similar
// ────────────────────────────────────────────────────────────────────────────

const ProfileSummary: React.FC<{
  profile: WwooferProfile;
  t: (en: string, fr: string) => string;
}> = ({ profile, t }) => {
  const statusColor: Record<WwooferStatus, string> = {
    pending:  'border-yellow-400/50 text-yellow-300 bg-yellow-400/10',
    approved: 'border-green-400/50 text-green-300 bg-green-400/10',
    declined: 'border-red-400/50 text-red-300 bg-red-400/10',
  };
  const status = profile.status ?? 'pending';
  return (
    <div className="border-t border-[#c5a059]/40 pt-6">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-cinzel block mb-2">
            {t('Your space', 'Votre espace')}
          </span>
          <h2 className="font-cinzel text-3xl text-[#f3e5ab] mb-1">{profile.displayName}</h2>
          <p className="text-xs text-neutral-500 font-lato">{profile.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-widest font-cinzel ${statusColor[status]}`}>
          {status === 'pending'  ? t('Pending review', 'En attente') :
           status === 'approved' ? t('Approved',       'Approuvé')   :
                                   t('Declined',       'Refusé')}
        </span>
      </div>
      {profile.preferredTasks && profile.preferredTasks.length > 0 && (
        <div className="mb-4 mt-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel">{t('Preferred tasks', 'Tâches préférées')}</span>
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.preferredTasks.map(taskId => {
              const opt = TASK_OPTIONS.find(o => o.id === taskId);
              return opt ? (
                <span key={taskId} className="text-xs px-3 py-1 border border-[#c5a059]/30 rounded-full text-neutral-300">
                  {t(opt.en, opt.fr)}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
      {profile.motivations && (
        <p className="font-cormorant italic text-xl text-neutral-300 mt-6 leading-relaxed max-w-2xl">"{profile.motivations}"</p>
      )}
      {profile.needs && (
        <div className="mt-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel">
            {t('Your needs', 'Vos besoins')}
          </span>
          <p className="font-lato text-sm text-neutral-300 mt-2 leading-relaxed max-w-2xl">{profile.needs}</p>
        </div>
      )}
    </div>
  );
};

const VisitRequestsBlock: React.FC<{
  t: (en: string, fr: string) => string;
  requests: WwooferVisitRequest[];
  onAddRequest: () => void;
  showRequestForm: boolean;
  onCloseRequestForm: () => void;
  user: User;
}> = ({ t, requests, onAddRequest, showRequestForm, onCloseRequestForm, user }) => {
  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <div className="h-px flex-1 bg-[#c5a059]/30 max-w-12"></div>
        <h3 className="font-cinzel text-sm text-[#f3e5ab] uppercase tracking-[0.3em]">
          {t('Visit requests', 'Demandes de visite')}
        </h3>
        <div className="h-px flex-1 bg-[#c5a059]/30"></div>
        <button
          onClick={onAddRequest}
          className="px-4 py-2 bg-[#c5a059] text-black text-[10px] font-cinzel font-bold uppercase tracking-[0.3em] hover:bg-[#f3e5ab] transition-colors whitespace-nowrap"
        >
          + {t('Request dates', 'Demander des dates')}
        </button>
      </div>

      {showRequestForm && (
        <RequestDatesForm user={user} t={t} onClose={onCloseRequestForm} />
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-neutral-500 italic font-cormorant text-lg">
          {t('No visit requests yet.', 'Aucune demande de visite pour l\'instant.')}
        </p>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const statusColor: Record<WwooferStatus, string> = {
              pending:  'border-yellow-400/40 text-yellow-300',
              approved: 'border-green-400/40 text-green-300',
              declined: 'border-red-400/40 text-red-300',
            };
            return (
              <div key={req.id} className="border-l border-[#c5a059]/30 hover:border-[#c5a059] transition-colors pl-5 py-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-cinzel text-base text-white">
                    {req.startDate} → {req.endDate}
                  </div>
                  <div className="text-xs text-neutral-500 font-lato mt-0.5">
                    {req.numberOfDays} {t('days', 'jours')}
                    {req.notes ? ` · ${req.notes}` : ''}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${statusColor[req.status]}`}>
                  {req.status === 'pending'  ? t('Pending',  'En attente') :
                   req.status === 'approved' ? t('Approved', 'Approuvé')   :
                                               t('Declined', 'Refusé')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RequestDatesForm: React.FC<{
  user: User;
  t: (en: string, fr: string) => string;
  onClose: () => void;
}> = ({ user, t, onClose }) => {
  const [start, setStart] = useState('');
  const [end, setEnd]     = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const numberOfDays = daysBetween(start, end);
  const valid = start && end && numberOfDays >= MIN_DAYS;

  const submit = async () => {
    setError(null);
    if (!db) return;
    if (!start || !end) {
      setError(t('Please pick both dates.', 'Choisissez les deux dates.'));
      return;
    }
    if (numberOfDays < MIN_DAYS) {
      setError(t(`Minimum stay is ${MIN_DAYS} days.`, `Le séjour minimum est de ${MIN_DAYS} jours.`));
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'wwoofers', user.uid, 'visitRequests'), {
        startDate: start,
        endDate: end,
        numberOfDays,
        notes: notes.trim() || null,
        status: 'pending' as WwooferStatus,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[#c5a059]/30 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
        <FieldDate label={t('Arrival', 'Arrivée')}  value={start} min={todayISO()}          onChange={setStart} />
        <FieldDate label={t('Departure', 'Départ')} value={end}   min={start || todayISO()} onChange={setEnd} />
      </div>
      <div className="text-xs text-neutral-500 font-lato mb-4">
        {numberOfDays > 0
          ? `${numberOfDays} ${t('days', 'jours')} · ${t('minimum 7 days', 'minimum 7 jours')}`
          : t('Pick a date range, minimum 7 days', 'Choisissez une plage, minimum 7 jours')}
      </div>
      <FieldTextarea
        label={t('Notes (optional)', 'Notes (facultatif)')}
        value={notes}
        onChange={setNotes}
        rows={2}
      />
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs uppercase tracking-[0.3em] text-neutral-400 hover:text-white font-cinzel"
        >
          {t('Cancel', 'Annuler')}
        </button>
        <button
          onClick={submit}
          disabled={!valid || saving}
          className="px-5 py-2.5 bg-[#c5a059] text-black text-[10px] font-cinzel font-bold uppercase tracking-[0.3em] hover:bg-[#f3e5ab] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '…' : t('Submit', 'Soumettre')}
        </button>
      </div>
    </div>
  );
};

const MessagesBlock: React.FC<{
  t: (en: string, fr: string) => string;
  messages: WwooferMessage[];
  user: User;
  memberProfile: MemberProfile;
}> = ({ t, messages, user, memberProfile }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!db) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'wwoofers', user.uid, 'messages'), {
        text: trimmed,
        fromAdmin: false,
        authorEmail: memberProfile.email,
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <div className="h-px flex-1 bg-[#c5a059]/30 max-w-12"></div>
        <h3 className="font-cinzel text-sm text-[#f3e5ab] uppercase tracking-[0.3em]">
          {t('Messages with the hosts', 'Messages avec les hôtes')}
        </h3>
        <div className="h-px flex-1 bg-[#c5a059]/30"></div>
      </div>
      <div ref={scrollRef} className="border border-white/10 p-5 max-h-80 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 ? (
          <p className="font-cormorant italic text-lg text-neutral-500">
            {t('No messages yet. Say hello!', 'Aucun message. Dites bonjour !')}
          </p>
        ) : (
          messages.map(m => (
            <div
              key={m.id}
              className={`max-w-[80%] px-4 py-2.5 text-sm font-lato leading-relaxed ${
                m.fromAdmin
                  ? 'bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#f3e5ab] mr-auto'
                  : 'bg-white/5 border border-white/10 text-neutral-200 ml-auto'
              }`}
            >
              {m.text}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={t('Write a message…', 'Écrire un message…')}
          className="flex-1 bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#c5a059] focus:outline-none transition-colors"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="px-5 py-2.5 bg-[#c5a059] text-black text-[10px] font-cinzel font-bold uppercase tracking-[0.3em] hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
        >
          {t('Send', 'Envoyer')}
        </button>
      </div>
    </div>
  );
};
