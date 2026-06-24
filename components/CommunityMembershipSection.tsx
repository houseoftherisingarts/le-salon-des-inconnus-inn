import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { MemberProfile } from './AuthModal';
import type { CommunityApplication, CommunityApplicationStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// "Faire partie de la communauté" — the paid resident-member announcement.
// Lives inside the Wwoofing page but is its own offer: live on site in the bus,
// 1000$/month part-time, housekeeping as the core task. A place opens because
// André Dancause is leaving to be closer to his family.
//
// Editorial redesign: warm layered ground (not flat gold-on-black), real
// imagery of the place, a hairline terms ledger, champagne headings, brass CTA.
// Deep-linkable via /wwoofing#communaute (and #postuler).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  onRequestAuth: () => void;
  autoOpen?: boolean;
}

// Warm, layered palette. Tinted toward the brand's gold hue — no pure black,
// no flat bright yellow carrying the whole surface.
const C = {
  ink:     'oklch(0.86 0.022 82)',  // body — warm parchment
  inkSoft: 'oklch(0.66 0.018 80)',  // muted labels / captions
  lead:    'oklch(0.91 0.030 86)',  // lead paragraph
  head:    'oklch(0.93 0.046 90)',  // champagne headings
  gold:    '#d4af37',               // bright accent — thin rules, small marks
  brass:   'oklch(0.78 0.105 80)',  // deeper brass — CTA fill, term values
  hair:    'oklch(0.80 0.06 84 / 0.22)', // hairline rules / dividers
};
const SECTION_BG =
  'radial-gradient(115% 75% at 12% -5%, oklch(0.26 0.035 72 / 0.55), transparent 55%),' +
  'radial-gradient(90% 60% at 100% 110%, oklch(0.23 0.03 60 / 0.45), transparent 60%),' +
  'oklch(0.165 0.014 62)';

const IMG = {
  bus:   'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/bus%20pov%20arriere%202.jpg',
  manor: 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png',
  table: 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/salle%20a%20manger.jpg',
};

// The letter, block by block — EN/FR side by side.
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

  const lead = LETTER[0];
  const body = LETTER.slice(1);

  return (
    <section id="communaute" className="community-mb relative scroll-mt-20" style={{ background: SECTION_BG }}>
      {/* top hairline that frames the whole movement */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${C.hair}, transparent)` }} />

      <div className="mx-auto max-w-6xl px-6 md:px-10 lg:px-14 py-24 md:py-32">

        {/* ── Editorial diptych: announcement + the bus ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-start">
          <div>
            <div className="flex items-center gap-4 mb-7">
              <span className="font-cinzel text-[11px] tracking-[0.45em] uppercase" style={{ color: C.gold }}>
                {t('A place opens', 'Une place se libère')}
              </span>
              <span className="h-px flex-1" style={{ background: C.hair }} />
            </div>

            <h2
              className="font-cinzel tracking-wide leading-[0.98] mb-5"
              style={{ color: C.head, fontSize: 'clamp(2.6rem, 5.2vw, 4.4rem)' }}
            >
              {t('Join the community', 'Faire partie de la communauté')}
            </h2>
            <p className="comm-italic italic mb-9" style={{ color: C.brass, fontSize: 'clamp(1.15rem, 2vw, 1.6rem)' }}>
              {t(
                'Come live in a lasting place, with people of heart and travellers passing through.',
                'Venir vivre dans un lieu pérenne, avec des gens de cœur et des voyageurs de passage.',
              )}
            </p>

            {/* Lead paragraph — larger, the announcement itself */}
            <p
              className="font-lato"
              style={{ color: C.lead, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)', lineHeight: 1.7, maxWidth: '34ch' }}
            >
              {t(lead.en, lead.fr)}
            </p>
          </div>

          {/* The bus — the offer made literal */}
          <figure className="relative lg:mt-2">
            <div className="relative overflow-hidden aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]">
              <img
                src={IMG.bus}
                alt={t('The converted bus on the inn grounds, your home on site.', "Le bus aménagé sur le terrain de l'auberge, ton chez-toi sur place.")}
                loading="lazy"
                className="w-full h-full object-cover"
                style={{ objectPosition: '50% 50%' }}
              />
              <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px ' + C.hair, background: 'linear-gradient(180deg, transparent 55%, oklch(0.16 0.014 62 / 0.55))' }} />
            </div>
            <figcaption className="mt-3 font-lato text-[11px] tracking-[0.18em] uppercase" style={{ color: C.inkSoft }}>
              {t('Your home — the converted bus', 'Ton chez-toi · le bus aménagé')}
            </figcaption>
          </figure>
        </div>

        {/* ── Body movement 1 — what the place is ───────────────────────── */}
        <div className="mt-20 md:mt-28 grid grid-cols-1 lg:grid-cols-[0.42fr_0.58fr] gap-10 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-24">
            <figure>
              <div className="relative overflow-hidden aspect-[16/10]">
                <img
                  src={IMG.manor}
                  alt={t('The manor and grounds at golden hour.', "Le manoir et le terrain à l'heure dorée.")}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px ' + C.hair }} />
              </div>
              <figcaption className="mt-3 font-lato text-[11px] tracking-[0.18em] uppercase" style={{ color: C.inkSoft }}>
                {t('The place that anchors it all', 'Le lieu qui ancre tout')}
              </figcaption>
            </figure>
          </div>
          <div className="space-y-6" style={{ maxWidth: '60ch' }}>
            <Para text={t(body[0].en, body[0].fr)} />
            <Para text={t(body[1].en, body[1].fr)} />
            <Para text={t(body[2].en, body[2].fr)} />
          </div>
        </div>

        {/* ── Terms ledger — replaces the card grid ─────────────────────── */}
        <div className="mt-20 md:mt-24">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-cinzel text-[11px] tracking-[0.4em] uppercase" style={{ color: C.inkSoft }}>
              {t('The terms', 'Les conditions')}
            </span>
            <span className="h-px flex-1" style={{ background: C.hair }} />
          </div>
          <dl
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ borderTop: `1px solid ${C.hair}`, borderBottom: `1px solid ${C.hair}` }}
          >
            {[
              { v: '1000 $', l: t('per month, part-time', 'par mois · temps partiel') },
              { v: t('The bus', 'Le bus'), l: t('housing on site', 'logement sur place') },
              { v: t('Meals', 'Repas'), l: t('fed when you cook', 'nourri·e si tu cuisines') },
              { v: t('Your time', 'Ton temps'), l: t('keep your own work', 'garde tes projets') },
            ].map((it, i) => (
              <div
                key={i}
                className="px-5 py-7 md:py-8"
                style={{
                  borderLeft: i % 2 === 1 ? `1px solid ${C.hair}` : undefined,
                  // restore the divider on md where it becomes a 4-col row
                }}
              >
                <dt className="font-cinzel leading-none mb-2" style={{ color: C.head, fontSize: 'clamp(1.25rem, 2vw, 1.7rem)' }}>
                  {it.v}
                </dt>
                <dd className="font-lato text-[12px] tracking-wide" style={{ color: C.inkSoft }}>{it.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Body movement 2 — work, pay, the kind of person ───────────── */}
        <div className="mt-20 md:mt-24 space-y-6" style={{ maxWidth: '64ch' }}>
          <Para text={t(body[3].en, body[3].fr)} />
          <Para text={t(body[4].en, body[4].fr)} />
        </div>

        {/* ── Human side, with the shared table ─────────────────────────── */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-[0.58fr_0.42fr] gap-10 lg:gap-16 items-center">
          <div className="space-y-6" style={{ maxWidth: '60ch' }}>
            <Para text={t(body[5].en, body[5].fr)} />
          </div>
          <figure>
            <div className="relative overflow-hidden aspect-[5/4]">
              <img
                src={IMG.table}
                alt={t('The long table where meals are shared.', "La grande table où les repas se partagent.")}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px ' + C.hair }} />
            </div>
            <figcaption className="mt-3 font-lato text-[11px] tracking-[0.18em] uppercase" style={{ color: C.inkSoft }}>
              {t('The long table', 'La grande table')}
            </figcaption>
          </figure>
        </div>

        {/* ── Pullquote — centered, hairline-flanked (no side stripe) ────── */}
        <figure className="mt-24 md:mt-32 text-center mx-auto" style={{ maxWidth: '26ch' }}>
          <span className="block mx-auto mb-8 h-px w-16" style={{ background: C.gold }} />
          <blockquote className="comm-italic italic leading-[1.25]" style={{ color: C.head, fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)' }}>
            {t(PULLQUOTE.en, PULLQUOTE.fr)}
          </blockquote>
          <span className="block mx-auto mt-8 h-px w-16" style={{ background: C.gold }} />
        </figure>

        {/* ── CTA / form / applied ──────────────────────────────────────── */}
        <div className="mt-24 md:mt-28">
          {!loaded && user ? (
            <p className="font-lato text-sm" style={{ color: C.inkSoft }}>{t('Loading…', 'Chargement…')}</p>
          ) : hasApplied ? (
            <AppliedSummary application={application!} t={t} />
          ) : showForm && user && memberProfile ? (
            <div id="community-apply">
              <CommunityApplyForm language={language} user={user} memberProfile={memberProfile} onCancel={() => setShowForm(false)} />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <button onClick={handleCta} className="comm-cta group relative font-cinzel font-bold uppercase tracking-[0.28em] text-[12px]">
                {t('Apply for the place', 'Postuler pour la place')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* bottom hairline */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${C.hair}, transparent)` }} />

      <style>{`
        .comm-italic { font-family: 'Cormorant Garamond', serif; }
        .community-mb dl > div:nth-child(odd) { border-left: 0; }
        @media (min-width: 768px) {
          .community-mb dl > div { border-left: 1px solid ${C.hair} !important; }
          .community-mb dl > div:first-child { border-left: 0 !important; }
        }
        .comm-cta {
          color: #1a1407;
          background: ${C.brass};
          padding: 1.05rem 2.6rem;
          transition: transform .4s cubic-bezier(0.22,1,0.36,1), background .4s ease, box-shadow .4s ease;
          box-shadow: 0 1px 0 0 rgba(255,255,255,0.18) inset, 0 14px 40px -18px rgba(212,175,55,0.5);
        }
        .comm-cta:hover { background: #e7cf7e; transform: translateY(-2px); box-shadow: 0 1px 0 0 rgba(255,255,255,0.25) inset, 0 22px 60px -22px rgba(212,175,55,0.65); }
        .comm-cta:active { transform: translateY(0); }
      `}</style>
    </section>
  );
};

const Para: React.FC<{ text: string }> = ({ text }) => (
  <p className="font-lato" style={{ color: 'oklch(0.86 0.022 82)', fontSize: '16px', lineHeight: 1.85 }}>{text}</p>
);

// ─── Applied confirmation (no side stripe) ───────────────────────────────────

const AppliedSummary: React.FC<{
  application: CommunityApplication;
  t: (en: string, fr: string) => string;
}> = ({ application, t }) => {
  const status: CommunityApplicationStatus = application.status ?? 'pending';
  const badge: Record<CommunityApplicationStatus, string> = {
    pending:  'border-yellow-400/40 text-yellow-200/90',
    approved: 'border-green-400/40 text-green-200/90',
    declined: 'border-red-400/40 text-red-200/90',
  };
  return (
    <div className="mx-auto max-w-2xl" style={{ borderTop: '1px solid oklch(0.80 0.06 84 / 0.22)', paddingTop: '2rem' }}>
      <div className="flex items-center gap-4 flex-wrap mb-4">
        {application.photoURL && (
          <img src={application.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px #d4af37aa' }} />
        )}
        <div>
          <span className="font-cinzel text-[10px] uppercase tracking-[0.4em] block mb-1" style={{ color: '#d4af37' }}>
            {t('Your application', 'Ta candidature')}
          </span>
          <h3 className="font-cinzel text-2xl" style={{ color: 'oklch(0.93 0.046 90)' }}>{application.displayName}</h3>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-widest font-cinzel ${badge[status]}`}>
          {status === 'pending' ? t('Received', 'Reçue') : status === 'approved' ? t('Approved', 'Approuvée') : t('Closed', 'Fermée')}
        </span>
      </div>
      <p className="font-lato text-sm leading-relaxed" style={{ color: 'oklch(0.80 0.02 80)' }}>
        {t(
          "Thank you. We read every application by hand. We'll reach out by email or phone when we've had time to sit with it.",
          "Merci. On lit chaque candidature à la main. On te reviendra par courriel ou par téléphone une fois qu'on aura pris le temps de s'y asseoir.",
        )}
      </p>
      {application.introduction && (
        <p className="comm-italic italic text-lg mt-6 leading-relaxed" style={{ color: 'oklch(0.86 0.022 82)' }}>"{application.introduction}"</p>
      )}
    </div>
  );
};

// ─── Apply form (warm panel, no heavy glass) ─────────────────────────────────

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
    <div
      className="relative mx-auto max-w-3xl p-7 md:p-11"
      style={{ background: 'oklch(0.205 0.016 62)', boxShadow: 'inset 0 0 0 1px oklch(0.80 0.06 84 / 0.18)' }}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #d4af37aa, transparent)' }} />

      <div className="flex items-center gap-4 mb-9">
        {memberProfile.photoURL ? (
          <img src={memberProfile.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px #d4af37aa' }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-cinzel text-lg" style={{ background: '#d4af3722', boxShadow: '0 0 0 1px #d4af37aa', color: '#f3e5ab' }}>
            {memberProfile.displayName?.charAt(0) ?? '?'}
          </div>
        )}
        <div>
          <div className="font-cinzel text-lg" style={{ color: '#f3e5ab' }}>{memberProfile.displayName}</div>
          <div className="text-[11px] font-lato" style={{ color: 'oklch(0.66 0.018 80)' }}>
            {memberProfile.email}
            <span style={{ color: 'oklch(0.52 0.015 80)' }}> · {t('photo from your Google profile', 'photo de ton profil Google')}</span>
          </div>
        </div>
      </div>

      <FormField label={t('Introduce yourself *', 'Présente-toi *')} hint={t('Who you are, where you are in life right now.', "Qui tu es, où tu en es dans ta vie en ce moment.")}>
        <Textarea value={introduction} onChange={setIntroduction} rows={4} placeholder={t('A few words in your own voice', 'Quelques mots dans ta voix')} />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <FormField label={t('Phone *', 'Téléphone *')}><Input value={phone} onChange={setPhone} /></FormField>
        <FormField label={t('Where you come from', "D'où tu viens")}><Input value={city} onChange={setCity} /></FormField>
      </div>

      <FormField label={t('Why community life — why here? *', 'Pourquoi la vie communautaire — pourquoi ici ? *')} hint={t('This is what matters most to us.', "C'est ce qui compte le plus pour nous.")}>
        <Textarea value={communityMotivation} onChange={setCommunityMotivation} rows={4} />
      </FormField>

      <FormField label={t('Your relationship to housekeeping work', 'Ton rapport au travail de ménage')} hint={t('Honestly — it is the core of the role.', "Honnêtement — c'est le cœur du poste.")}>
        <Textarea value={cleaningAttitude} onChange={setCleaningAttitude} rows={3} />
      </FormField>

      <FormField label={t('Your own projects', 'Tes propres projets')} hint={t('What you would work on with the free time.', "Ce sur quoi tu travaillerais avec le temps libre.")}>
        <Textarea value={personalProjects} onChange={setPersonalProjects} rows={3} />
      </FormField>

      <FormField label={t('Do you need a space to work? (e.g. the massotherapy room)', "As-tu besoin d'un espace pour travailler ? (ex. la salle de masso)")}>
        <Textarea value={workspaceNeeds} onChange={setWorkspaceNeeds} rows={2} />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <FormField label={t('When could you start?', 'Quand pourrais-tu commencer ?')}><Input value={availability} onChange={setAvailability} /></FormField>
        <FormField label={t('Anything you need from us', 'Ce dont tu as besoin de nous')}><Input value={needs} onChange={setNeeds} /></FormField>
      </div>

      <div className="mt-8 pt-8" style={{ borderTop: '1px solid oklch(0.80 0.06 84 / 0.2)' }}>
        {error && <p className="text-sm text-red-400 mb-5">{error}</p>}
        <div className="flex flex-wrap gap-4 items-center justify-end">
          <button onClick={onCancel} className="px-5 py-3 text-xs uppercase tracking-[0.3em] font-cinzel transition-colors" style={{ color: 'oklch(0.62 0.015 80)' }}>
            {t('Cancel', 'Annuler')}
          </button>
          <button
            onClick={submit}
            disabled={!formValid || saving}
            className="comm-cta font-cinzel font-bold uppercase tracking-[0.3em] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '…' : t('Send my application', 'Envoyer ma candidature')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Form atoms ──────────────────────────────────────────────────────────────

const FormField: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block mb-6">
    <span className="block text-[10px] uppercase tracking-[0.3em] font-cinzel mb-2" style={{ color: 'oklch(0.62 0.015 80)' }}>{label}</span>
    {children}
    {hint && <span className="block text-[11px] font-lato italic mt-1.5" style={{ color: 'oklch(0.5 0.015 80)' }}>{hint}</span>}
  </label>
);

const Input: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-transparent border-0 border-b px-0 py-2 text-base text-white font-lato focus:outline-none transition-colors"
    style={{ borderColor: 'oklch(0.80 0.06 84 / 0.22)' }}
    onFocus={(e) => (e.currentTarget.style.borderColor = '#d4af37')}
    onBlur={(e) => (e.currentTarget.style.borderColor = 'oklch(0.80 0.06 84 / 0.22)')}
  />
);

const Textarea: React.FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    placeholder={placeholder}
    className="w-full bg-transparent border-0 border-b px-0 py-2 text-base text-white font-lato focus:outline-none transition-colors resize-none placeholder:italic"
    style={{ borderColor: 'oklch(0.80 0.06 84 / 0.22)' }}
    onFocus={(e) => (e.currentTarget.style.borderColor = '#d4af37')}
    onBlur={(e) => (e.currentTarget.style.borderColor = 'oklch(0.80 0.06 84 / 0.22)')}
  />
);
