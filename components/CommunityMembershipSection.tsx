import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { MemberProfile } from './AuthModal';
import type { CommunityApplication, CommunityApplicationStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// "Faire partie de la communauté" — the paid resident-member announcement.
//
// Design language, grounded in the real site:
//  · The home page (InnPage) is cinematic full-bleed photography with cream
//    Cinzel display + gold eyebrows. The header here mirrors that exactly.
//  · This is a LETTER, so the body uses the Salon's documented letter baseline:
//    cream parchment (#F4ECD8), double gold border (#B08A3E), Cinzel headings,
//    warm-brown ink (#2A1F0E). A real missive set into the dark page.
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

// Letter baseline tokens (from the Salon document template).
const P = {
  paper:    '#F4ECD8',
  border:   '#B08A3E',
  accent:   '#C9A565',
  rule:     '#D5BA82',
  ink:      '#2A1F0E',
  inkSoft:  '#4A3416',
  head:     '#6B4E1F',
  soft:     '#8A6B33',
};
// Cinematic header (over photography) — the home's cream/gold-on-image palette.
const HEADER = {
  cream:    '#f3e5ab',
  gold:     '#dcb055',
};

const HEADER_IMG = 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg';
const BUS_IMG    = 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/bus%20pov%20arriere%202.jpg';

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
    fr: "Soyons clairs : c'est un vrai travail. La tâche principale, c'est le ménage des chambres et des espaces communs, au cœur de l'expérience de nos invités. C'est répétitif, c'est physique, et c'est précieux. À ça s'ajoutent des moments où tu tiens le fort quand on est partis : accueillir des invités, être là pour les enfants de temps en temps. Et puis il y a les tâches qu'on partage entre membres parce qu'on vit ensemble : arroser le jardin, donner un coup de main à la cuisine, la vie de tous les jours.",
    en: "Let's be clear: this is real work. The main task is housekeeping the rooms and common spaces, at the heart of our guests' experience. It's repetitive, it's physical, and it matters. On top of that, there are moments where you hold the fort while we're away: welcoming guests, being there for the kids now and then. And there are the tasks members share because we live together: watering the garden, lending a hand in the kitchen, the everyday.",
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

// ─── Section ─────────────────────────────────────────────────────────────────

export const CommunityMembershipSection: React.FC<Props> = ({
  language, user, memberProfile, onRequestAuth, autoOpen,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [application, setApplication] = useState<CommunityApplication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (autoOpen && user && memberProfile) setShowForm(true);
  }, [autoOpen, user, memberProfile]);

  // Deep link: /wwoofing#communaute (or #postuler) lands on this section.
  useEffect(() => {
    const h = (window.location.hash || '').toLowerCase();
    if (h === '#communaute' || h === '#postuler') {
      const id = window.setTimeout(() => {
        document.getElementById('communaute')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
      return () => window.clearTimeout(id);
    }
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
    setTimeout(() => {
      document.getElementById('community-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [user, memberProfile, onRequestAuth]);

  return (
    <section id="communaute" className="comm relative scroll-mt-16 bg-[#0b0a08]">

      {/* ── Cinematic header — full-bleed photo, cream Cinzel (home language) ── */}
      <header className="relative w-full overflow-hidden" style={{ height: 'clamp(440px, 64vh, 720px)' }}>
        <img
          src={HEADER_IMG}
          alt={t('The manor and grounds at golden hour.', "Le manoir et son terrain à l'heure dorée.")}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 42%' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,7,5,0.45) 0%, rgba(8,7,5,0.15) 35%, rgba(8,7,5,0.55) 78%, #0b0a08 100%)' }} />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-10" style={{ background: HEADER.gold }} />
            <span className="font-cinzel uppercase" style={{ color: HEADER.gold, fontSize: '11px', letterSpacing: '0.42em' }}>
              {t('A place opens', 'Une place se libère')}
            </span>
            <span className="h-px w-10" style={{ background: HEADER.gold }} />
          </div>
          <h2
            className="font-cinzel uppercase"
            style={{ color: HEADER.cream, fontSize: 'clamp(2.1rem, 5.4vw, 4.6rem)', lineHeight: 1.02, letterSpacing: '0.02em', textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}
          >
            {t('Join the community', 'Faire partie de la communauté')}
          </h2>
          <p
            className="font-cormorant italic mt-5"
            style={{ color: HEADER.cream, fontSize: 'clamp(1.1rem, 2vw, 1.7rem)', textShadow: '0 1px 16px rgba(0,0,0,0.55)' }}
          >
            {t(
              'Come live in a lasting place, with people of heart and travellers passing through.',
              'Venir vivre dans un lieu pérenne, avec des gens de cœur et des voyageurs de passage.',
            )}
          </p>
        </div>
      </header>

      {/* ── The letter — cream parchment, double gold border (letter baseline) ── */}
      <div className="px-4 sm:px-6 md:px-8 pt-12 md:pt-16 pb-16 md:pb-24">
        <article
          className="mx-auto"
          style={{ maxWidth: '54rem', background: P.paper, border: `5px double ${P.border}`, boxShadow: '0 30px 80px -40px rgba(0,0,0,0.8)' }}
        >
          <div style={{ border: `0.5px solid ${P.border}`, margin: '10px', padding: 'clamp(1.75rem, 5vw, 4rem)' }}>

            {/* Wordmark */}
            <div className="text-center mb-2">
              <span className="font-cinzel" style={{ color: P.soft, fontSize: '12px', letterSpacing: '0.22em' }}>
                LE SALON DES INCONNUS
              </span>
            </div>
            <div className="mx-auto mb-9 h-px w-24" style={{ background: P.accent }} />

            {/* Lead — the announcement, set a touch larger */}
            <p className="font-lato" style={{ color: P.ink, fontSize: 'clamp(1.05rem, 1.4vw, 1.2rem)', lineHeight: 1.85, fontWeight: 400 }}>
              {t(LETTER[0].en, LETTER[0].fr)}
            </p>

            <div className="space-y-5 mt-5">
              {LETTER.slice(1, 5).map((b, i) => (
                <p key={i} className="font-lato" style={{ color: P.ink, fontSize: '16.5px', lineHeight: 1.85 }}>
                  {t(b.en, b.fr)}
                </p>
              ))}
            </div>

            {/* The bus — one decisive inset photo */}
            <figure className="my-10">
              <div className="relative overflow-hidden" style={{ border: `0.5px solid ${P.accent}` }}>
                <img
                  src={BUS_IMG}
                  alt={t('The converted bus on the grounds, your home on site.', "Le bus aménagé sur le terrain, ton chez-toi sur place.")}
                  loading="lazy"
                  className="w-full object-cover"
                  style={{ aspectRatio: '16 / 9' }}
                />
              </div>
              <figcaption className="mt-2 font-cinzel uppercase text-center" style={{ color: P.soft, fontSize: '10px', letterSpacing: '0.22em' }}>
                {t('Your home — the converted bus', 'Ton chez-toi · le bus aménagé')}
              </figcaption>
            </figure>

            {/* Terms — small ledger, not cards */}
            <SectionRule label={t('The terms', 'Les conditions')} />
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-6 mb-2">
              {[
                { v: '1000 $', l: t('per month · part-time', 'par mois · temps partiel') },
                { v: t('The bus', 'Le bus'), l: t('housing on site', 'logement sur place') },
                { v: t('Meals', 'Repas'), l: t('fed when you cook', 'nourri·e si tu cuisines') },
                { v: t('Your time', 'Ton temps'), l: t('keep your own work', 'garde tes projets') },
              ].map((it, i) => (
                <div key={i} className="px-1">
                  <dt className="font-cinzel" style={{ color: P.head, fontSize: 'clamp(1.15rem, 1.8vw, 1.55rem)', lineHeight: 1.1 }}>{it.v}</dt>
                  <dd className="font-lato mt-1.5" style={{ color: P.inkSoft, fontSize: '11.5px', letterSpacing: '0.04em' }}>{it.l}</dd>
                </div>
              ))}
            </dl>

            {/* Remaining body */}
            <div className="space-y-5 mt-10">
              {LETTER.slice(5).map((b, i) => (
                <p key={i} className="font-lato" style={{ color: P.ink, fontSize: '16.5px', lineHeight: 1.85 }}>
                  {t(b.en, b.fr)}
                </p>
              ))}
            </div>

            {/* Pullquote — modest, soft gold, hairline above */}
            <div className="mt-12 text-center">
              <span className="block mx-auto mb-5 h-px w-14" style={{ background: P.accent }} />
              <p className="font-cormorant italic mx-auto" style={{ color: P.soft, fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', lineHeight: 1.4, maxWidth: '34ch' }}>
                {t(PULLQUOTE.en, PULLQUOTE.fr)}
              </p>
            </div>

            {/* ── CTA / form / applied ── */}
            <div className="mt-12">
              {!loaded && user ? (
                <p className="font-lato text-sm text-center" style={{ color: P.soft }}>{t('Loading…', 'Chargement…')}</p>
              ) : hasApplied ? (
                <AppliedSummary application={application!} t={t} />
              ) : showForm && user && memberProfile ? (
                <div id="community-apply">
                  <CommunityApplyForm language={language} user={user} memberProfile={memberProfile} onCancel={() => setShowForm(false)} />
                </div>
              ) : (
                <div className="text-center">
                  <button onClick={handleCta} className="comm-cta font-cinzel uppercase">
                    {t('Apply for the place', 'Postuler pour la place')}
                  </button>
                </div>
              )}
            </div>

          </div>
        </article>
      </div>

      <style>{`
        .comm .font-cormorant, .comm-italic { font-family: 'Cormorant Garamond', serif; }
        .comm-cta {
          color: ${P.paper};
          background: ${P.border};
          padding: 0.95rem 2.5rem;
          border-radius: 2px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.28em;
          transition: transform .4s cubic-bezier(0.22,1,0.36,1), background .35s ease, box-shadow .35s ease;
          box-shadow: 0 10px 26px -14px rgba(176,138,62,0.7);
        }
        .comm-cta:hover { background: ${P.head}; transform: translateY(-2px); box-shadow: 0 16px 36px -16px rgba(107,78,31,0.75); }
        .comm-cta:active { transform: translateY(0); }
        .comm-cta:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </section>
  );
};

const SectionRule: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-4 my-9">
    <span className="h-px flex-1" style={{ background: P.rule }} />
    <span className="font-cinzel uppercase" style={{ color: P.head, fontSize: '11px', letterSpacing: '0.28em' }}>{label}</span>
    <span className="h-px flex-1" style={{ background: P.rule }} />
  </div>
);

// ─── Applied confirmation ────────────────────────────────────────────────────

const AppliedSummary: React.FC<{
  application: CommunityApplication;
  t: (en: string, fr: string) => string;
}> = ({ application, t }) => {
  const status: CommunityApplicationStatus = application.status ?? 'pending';
  const badge: Record<CommunityApplicationStatus, { fr: string; en: string; bg: string; fg: string }> = {
    pending:  { fr: 'Reçue',     en: 'Received', bg: 'rgba(176,138,62,0.14)', fg: P.head },
    approved: { fr: 'Approuvée', en: 'Approved', bg: 'rgba(58,125,68,0.16)',  fg: '#2f6b39' },
    declined: { fr: 'Fermée',    en: 'Closed',   bg: 'rgba(140,80,40,0.14)',  fg: '#8a4a28' },
  };
  const b = badge[status];
  return (
    <div className="mx-auto max-w-2xl text-center" style={{ borderTop: `0.5px solid ${P.rule}`, paddingTop: '1.75rem' }}>
      <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
        {application.photoURL && (
          <img src={application.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${P.accent}` }} />
        )}
        <div className="text-left">
          <span className="font-cinzel uppercase block mb-1" style={{ color: P.soft, fontSize: '10px', letterSpacing: '0.3em' }}>
            {t('Your application', 'Ta candidature')}
          </span>
          <h3 className="font-cinzel" style={{ color: P.head, fontSize: '1.4rem' }}>{application.displayName}</h3>
        </div>
        <span className="ml-auto font-cinzel uppercase" style={{ background: b.bg, color: b.fg, fontSize: '10px', letterSpacing: '0.18em', padding: '4px 12px', borderRadius: '999px' }}>
          {t(b.en, b.fr)}
        </span>
      </div>
      <p className="font-lato text-sm leading-relaxed mx-auto" style={{ color: P.inkSoft, maxWidth: '46ch' }}>
        {t(
          "Thank you. We read every application by hand. We'll reach out by email or phone when we've had time to sit with it.",
          "Merci. On lit chaque candidature à la main. On te reviendra par courriel ou par téléphone une fois qu'on aura pris le temps de s'y asseoir.",
        )}
      </p>
      {application.introduction && (
        <p className="font-cormorant italic text-lg mt-5 leading-relaxed mx-auto" style={{ color: P.soft, maxWidth: '50ch' }}>"{application.introduction}"</p>
      )}
    </div>
  );
};

// ─── Apply form (on the parchment) ───────────────────────────────────────────

const CommunityApplyForm: React.FC<{
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  onCancel: () => void;
}> = ({ language, user, memberProfile, onCancel }) => {
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
    if (!formValid) {
      setError(t('Please fill the required fields.', 'Veuillez remplir les champs requis.'));
      return;
    }
    setSaving(true);
    try {
      const application: CommunityApplication = {
        uid: user.uid,
        displayName: memberProfile.displayName,
        email: memberProfile.email,
        photoURL: memberProfile.photoURL,
        phone: phone.trim(),
        city: city.trim() || undefined,
        introduction: introduction.trim(),
        communityMotivation: communityMotivation.trim(),
        cleaningAttitude: cleaningAttitude.trim() || undefined,
        personalProjects: personalProjects.trim() || undefined,
        workspaceNeeds: workspaceNeeds.trim() || undefined,
        availability: availability.trim() || undefined,
        needs: needs.trim() || undefined,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const clean: Record<string, unknown> = {};
      Object.entries(application).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await setDoc(doc(db, 'communityApplications', user.uid), clean);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl" style={{ borderTop: `0.5px solid ${P.rule}`, paddingTop: '2rem' }}>
      <div className="flex items-center gap-4 mb-8">
        {memberProfile.photoURL ? (
          <img src={memberProfile.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${P.accent}` }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-cinzel text-lg" style={{ background: 'rgba(176,138,62,0.14)', boxShadow: `0 0 0 1px ${P.accent}`, color: P.head }}>
            {memberProfile.displayName?.charAt(0) ?? '?'}
          </div>
        )}
        <div>
          <div className="font-cinzel text-lg" style={{ color: P.head }}>{memberProfile.displayName}</div>
          <div className="text-[11px] font-lato" style={{ color: P.soft }}>
            {memberProfile.email}
            <span style={{ color: P.rule }}> · {t('photo from your Google profile', 'photo de ton profil Google')}</span>
          </div>
        </div>
      </div>

      <Field label={t('Introduce yourself *', 'Présente-toi *')} hint={t('Who you are, where you are in life right now.', "Qui tu es, où tu en es dans ta vie en ce moment.")}>
        <Area value={introduction} onChange={setIntroduction} rows={4} placeholder={t('A few words in your own voice', 'Quelques mots dans ta voix')} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <Field label={t('Phone *', 'Téléphone *')}><Line value={phone} onChange={setPhone} /></Field>
        <Field label={t('Where you come from', "D'où tu viens")}><Line value={city} onChange={setCity} /></Field>
      </div>

      <Field label={t('Why community life — why here? *', 'Pourquoi la vie communautaire — pourquoi ici ? *')} hint={t('This is what matters most to us.', "C'est ce qui compte le plus pour nous.")}>
        <Area value={communityMotivation} onChange={setCommunityMotivation} rows={4} />
      </Field>

      <Field label={t('Your relationship to housekeeping work', 'Ton rapport au travail de ménage')} hint={t('Honestly — it is the core of the role.', "Honnêtement — c'est le cœur du poste.")}>
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

      <div className="mt-8 pt-6" style={{ borderTop: `0.5px solid ${P.rule}` }}>
        {error && <p className="text-sm mb-4" style={{ color: '#a23b2a' }}>{error}</p>}
        <div className="flex flex-wrap gap-4 items-center justify-end">
          <button onClick={onCancel} className="px-5 py-3 text-xs uppercase font-cinzel" style={{ color: P.soft, letterSpacing: '0.3em' }}>
            {t('Cancel', 'Annuler')}
          </button>
          <button onClick={submit} disabled={!formValid || saving} className="comm-cta font-cinzel uppercase">
            {saving ? '…' : t('Send my application', 'Envoyer ma candidature')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Form atoms (parchment) ──────────────────────────────────────────────────

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block mb-6">
    <span className="block uppercase font-cinzel mb-2" style={{ color: P.head, fontSize: '10px', letterSpacing: '0.22em' }}>{label}</span>
    {children}
    {hint && <span className="block font-cormorant italic mt-1.5" style={{ color: P.soft, fontSize: '13px' }}>{hint}</span>}
  </label>
);

const baseInput = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%',
  background: 'transparent',
  border: 0,
  borderBottom: `1px solid ${P.accent}`,
  padding: '8px 0',
  fontSize: '16px',
  color: P.ink,
  outline: 'none',
  ...extra,
});

const Line: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text" value={value} onChange={(e) => onChange(e.target.value)}
    className="font-lato" style={baseInput()}
    onFocus={(e) => (e.currentTarget.style.borderBottomColor = P.border)}
    onBlur={(e) => (e.currentTarget.style.borderBottomColor = P.accent)}
  />
);

const Area: React.FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea
    value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
    className="font-lato" style={baseInput({ resize: 'none' })}
    onFocus={(e) => (e.currentTarget.style.borderBottomColor = P.border)}
    onBlur={(e) => (e.currentTarget.style.borderBottomColor = P.accent)}
  />
);
