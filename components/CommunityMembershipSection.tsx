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
// The letter doubles as a public announcement / call. The apply path reuses the
// page's Google auth (via onRequestAuth) and the member's own profile photo —
// no upload. Submissions land at communityApplications/{uid}.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  user: User | null;
  memberProfile: MemberProfile | null;
  /** Opens the page's AuthModal when the visitor isn't signed in yet. */
  onRequestAuth: () => void;
  /** Set true once the visitor signed in via this section's CTA, so the form
   *  opens by itself after the auth round-trip instead of asking for a 2nd click. */
  autoOpen?: boolean;
}

// The letter, block by block. Kept here as data so EN/FR stay side by side and
// the copy is easy to edit without touching layout.
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
    fr: "Pour ce travail-là, on offre 1000 $ par mois, pour du temps partiel dont on précisera ensemble les heures. En plus du salaire : le logement dans le bus, et la nourriture potentiellement fournie (si tu participes à la cuisine, tu manges avec nous). Comme c'est du temps partiel, il te reste beaucoup d'espace pour tes propres projets. Et si tu as besoin d'un lieu pour travailler, on a une salle de massothérapie : ça peut faire partie de la discussion.",
    en: "For that work, we offer 1000$ a month, part-time, with the hours figured out together. On top of the pay: housing in the bus, and food potentially provided (if you take part in the cooking, you eat with us). Because it's part-time, you keep plenty of room for your own projects. And if you need a place to work, we have a massotherapy room: that can be part of the conversation.",
  },
  {
    fr: "Mis ensemble, le salaire, la valeur du loyer, la nourriture et le temps libre, c'est une entente généreuse. Mais on ne la fait pas miroiter pour rien : on la pense juste, parce que tenir l'auberge, c'est un vrai métier. Ce qu'on cherche avant tout, c'est une psychologie de communauté. On bâtit ce lieu entre amis, avec des gens qui ont le goût de prendre soin d'un endroit. On n'est pas un ashram tout-inclus ni une chaîne d'hôtels : on est quelque part entre les deux, les deux pieds sur terre.",
    en: "Put together, the pay, the value of the lodging, the food, and the free time make for a generous arrangement. But we don't dangle it for nothing: we keep it fair, because running the inn is a real craft. What we're looking for above all is a community frame of mind. We build this place among friends, with people who genuinely want to care for a spot. We're not an all-inclusive ashram nor a hotel chain: we sit somewhere in between, both feet on the ground.",
  },
];

const PULLQUOTE = {
  fr: 'La famille soutient la communauté. La communauté soutient la famille.',
  en: 'The family supports the community. The community supports the family.',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export const CommunityMembershipSection: React.FC<Props> = ({
  language, user, memberProfile, onRequestAuth, autoOpen,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [application, setApplication] = useState<CommunityApplication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // After signing in through this section's CTA, open the form automatically.
  useEffect(() => {
    if (autoOpen && user && memberProfile) setShowForm(true);
  }, [autoOpen, user, memberProfile]);

  // Watch this signer's own application (if any), so the CTA reflects state.
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
    <section className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 border-b border-[#d4af37]/10 bg-[#070707]">
      <div className="max-w-5xl mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px w-12 bg-[#d4af37]"></div>
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37] font-cinzel">
            {t('A place opens', 'Une place se libère')}
          </span>
        </div>

        <h2 className="font-cinzel text-4xl md:text-5xl lg:text-6xl text-[#f3e5ab] mb-4 tracking-wide leading-[1.0]">
          {t('Join the community', 'Faire partie de la communauté')}
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl text-[#d4af37] mb-12">
          {t('A paid place to live, work, and belong.', 'Une place rémunérée pour vivre, travailler et appartenir.')}
        </p>

        {/* The letter */}
        <div className="space-y-7 max-w-3xl">
          {LETTER.map((block, i) => (
            <p
              key={i}
              className={`font-lato text-[15px] md:text-[17px] leading-[1.85] ${
                i === 0 ? 'text-neutral-200' : 'text-neutral-300'
              }`}
            >
              {t(block.en, block.fr)}
            </p>
          ))}
        </div>

        {/* Pullquote */}
        <div className="border-l-2 border-[#d4af37] pl-6 my-14 max-w-2xl">
          <p className="font-cormorant italic text-2xl md:text-3xl text-[#f3e5ab] leading-snug">
            {t(PULLQUOTE.en, PULLQUOTE.fr)}
          </p>
        </div>

        {/* The offer — quick-read summary card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14 max-w-3xl">
          {[
            { v: '1000 $', l: t('per month, part-time', 'par mois, temps partiel') },
            { v: t('The bus', 'Le bus'), l: t('housing on site', 'logement sur place') },
            { v: t('Meals', 'Repas'), l: t('food potentially provided', 'nourriture potentielle') },
            { v: t('Your time', 'Ton temps'), l: t('room for your projects', 'espace pour tes projets') },
          ].map((it, i) => (
            <div key={i} className="border border-[#d4af37]/20 bg-white/[0.02] p-4">
              <div className="font-cinzel text-[#f3e5ab] text-lg md:text-xl leading-tight">{it.v}</div>
              <div className="font-lato text-[11px] text-neutral-500 mt-1.5 leading-snug">{it.l}</div>
            </div>
          ))}
        </div>

        {/* CTA / state */}
        {!loaded && user ? (
          <p className="text-neutral-500 font-lato text-sm">{t('Loading…', 'Chargement…')}</p>
        ) : hasApplied ? (
          <AppliedSummary application={application!} t={t} />
        ) : showForm && user && memberProfile ? (
          <div id="community-apply" className="mt-4">
            <CommunityApplyForm
              language={language}
              user={user}
              memberProfile={memberProfile}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : (
          <div className="max-w-3xl">
            <p className="font-lato text-sm text-neutral-400 leading-relaxed mb-6">
              {t(
                'To apply, sign in with Google. We keep your profile photo, your contact, and a short note of introduction. Nothing to upload.',
                "Pour postuler, connecte-toi avec Google. On garde ta photo de profil, ton contact et un mot de présentation. Rien à téléverser.",
              )}
            </p>
            <button
              onClick={handleCta}
              className="px-8 py-4 bg-[#d4af37] text-black font-cinzel font-bold uppercase tracking-[0.25em] text-xs hover:bg-[#f3e5ab] transition-all hover:scale-[1.02] active:scale-95"
            >
              {t('Apply for the place', 'Postuler pour la place')}
            </button>
          </div>
        )}
      </div>

      <style>{`.font-cormorant { font-family: 'Cormorant Garamond', serif; }`}</style>
    </section>
  );
};

// ─── Applied confirmation ────────────────────────────────────────────────────

const AppliedSummary: React.FC<{
  application: CommunityApplication;
  t: (en: string, fr: string) => string;
}> = ({ application, t }) => {
  const status: CommunityApplicationStatus = application.status ?? 'pending';
  const badge: Record<CommunityApplicationStatus, string> = {
    pending:  'border-yellow-400/50 text-yellow-300 bg-yellow-400/10',
    approved: 'border-green-400/50 text-green-300 bg-green-400/10',
    declined: 'border-red-400/50 text-red-300 bg-red-400/10',
  };
  return (
    <div className="max-w-2xl border-l-2 border-[#d4af37] pl-6 md:pl-8">
      <div className="flex items-center gap-4 flex-wrap mb-4">
        {application.photoURL && (
          <img src={application.photoURL} alt="" className="w-12 h-12 rounded-full object-cover border border-[#d4af37]/40" />
        )}
        <div>
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37] font-cinzel block mb-1">
            {t('Your application', 'Ta candidature')}
          </span>
          <h3 className="font-cinzel text-2xl text-[#f3e5ab]">{application.displayName}</h3>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-widest font-cinzel ${badge[status]}`}>
          {status === 'pending'  ? t('Received', 'Reçue') :
           status === 'approved' ? t('Approved', 'Approuvée') :
                                   t('Closed',   'Fermée')}
        </span>
      </div>
      <p className="font-lato text-sm text-neutral-300 leading-relaxed">
        {t(
          "Thank you. We read every application by hand. We'll reach out by email or phone when we've had time to sit with it.",
          "Merci. On lit chaque candidature à la main. On te reviendra par courriel ou par téléphone une fois qu'on aura pris le temps de s'y asseoir.",
        )}
      </p>
      {application.introduction && (
        <p className="font-cormorant italic text-lg text-neutral-300 mt-6 leading-relaxed">"{application.introduction}"</p>
      )}
    </div>
  );
};

// ─── Apply form ──────────────────────────────────────────────────────────────

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
      // Firestore rejects undefined — strip optional empties before writing.
      const clean: Record<string, unknown> = {};
      Object.entries(application).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await setDoc(doc(db, 'communityApplications', user.uid), clean);
      // The page's onSnapshot flips to the applied-summary state automatically.
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="relative rounded-[28px] p-7 md:p-10 lg:p-12 max-w-3xl
                 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01]
                 backdrop-blur-2xl border border-white/10
                 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />

      {/* Identity strip — profile photo, no upload */}
      <div className="flex items-center gap-4 mb-10">
        {memberProfile.photoURL ? (
          <img src={memberProfile.photoURL} alt="" className="w-14 h-14 rounded-full object-cover border border-[#d4af37]/40" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center font-cinzel text-[#f3e5ab] text-lg">
            {memberProfile.displayName?.charAt(0) ?? '?'}
          </div>
        )}
        <div>
          <div className="font-cinzel text-[#f3e5ab] text-lg">{memberProfile.displayName}</div>
          <div className="text-[11px] text-neutral-500 font-lato">
            {memberProfile.email}
            <span className="text-neutral-700"> · {t('photo from your Google profile', 'photo de ton profil Google')}</span>
          </div>
        </div>
      </div>

      <FormField label={t('Introduce yourself *', 'Présente-toi *')} hint={t('Who you are, where you are in life right now.', "Qui tu es, où tu en es dans ta vie en ce moment.")}>
        <Textarea value={introduction} onChange={setIntroduction} rows={4}
          placeholder={t('A few words in your own voice', 'Quelques mots dans ta voix')} />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <FormField label={t('Phone *', 'Téléphone *')}>
          <Input value={phone} onChange={setPhone} />
        </FormField>
        <FormField label={t('Where you come from', 'D\'où tu viens')}>
          <Input value={city} onChange={setCity} />
        </FormField>
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

      <FormField label={t('Do you need a space to work? (e.g. the massotherapy room)', 'As-tu besoin d\'un espace pour travailler ? (ex. la salle de masso)')}>
        <Textarea value={workspaceNeeds} onChange={setWorkspaceNeeds} rows={2} />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <FormField label={t('When could you start?', 'Quand pourrais-tu commencer ?')}>
          <Input value={availability} onChange={setAvailability} />
        </FormField>
        <FormField label={t('Anything you need from us', 'Ce dont tu as besoin de nous')}>
          <Input value={needs} onChange={setNeeds} />
        </FormField>
      </div>

      <div className="mt-8 pt-8 border-t border-[#d4af37]/20">
        {error && <p className="text-sm text-red-400 mb-5">{error}</p>}
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
            className="px-8 py-4 bg-[#d4af37] text-black text-xs font-cinzel font-bold uppercase tracking-[0.3em] hover:bg-[#f3e5ab] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
          >
            {saving ? '…' : t('Send my application', 'Envoyer ma candidature')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Form atoms (local, editorial underline style) ───────────────────────────

const FormField: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block mb-6">
    <span className="block text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-cinzel mb-2">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-neutral-600 font-lato italic mt-1.5">{hint}</span>}
  </label>
);

const Input: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#d4af37] focus:outline-none transition-colors"
  />
);

const Textarea: React.FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    placeholder={placeholder}
    className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-base text-white font-lato focus:border-[#d4af37] focus:outline-none transition-colors resize-none placeholder:text-neutral-700 placeholder:italic"
  />
);
