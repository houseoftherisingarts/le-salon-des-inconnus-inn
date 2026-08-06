import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getOptimizedUrl } from '../utils/imageOptimizer';

// Unlisted page at /invitation: reached only by scanning the QR code on a
// handwritten physical invitation. No nav link, no sitemap entry, noindex.
// Same warm-dark atmosphere as the rest of the site (see PenseesPage), but a
// more ceremonious, Peaky-Blinders-at-a-Victorian-manor register.

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const MANOR_IMG = getOptimizedUrl('/media/Financement%20Artistique/centered%20copy.jpg', 1920);

const PROMISES = [
  {
    titleFr: 'Le feu et la table',
    titleEn: 'The fire and the table',
    bodyFr: "Une soirée devant l'âtre, table d'hôte du chef et scotch au salon. Pour qui vient de loin, une nuit à l'auberge est offerte.",
    bodyEn: "An evening by the fire, the chef's table d'hôte and scotch in the salon. For whoever travels from afar, a free night at the manor.",
  },
  {
    titleFr: 'Une heure, pour vous',
    titleEn: 'One hour, for you',
    bodyFr: "Une heure de consultation stratégique web et intelligence artificielle, offerte à chaque invité.",
    bodyEn: 'One hour of complimentary strategic web and AI consulting, offered to each guest.',
  },
  {
    titleFr: 'Une soirée mise en scène',
    titleEn: 'A staged evening',
    bodyFr: 'Musique live, rituels de table : une histoire à raconter, pas une carte professionnelle.',
    bodyEn: 'Live music, table rituals: a story to tell, not a business card.',
  },
  {
    titleFr: 'Le cercle',
    titleEn: 'The circle',
    bodyFr: 'Des bâtisseurs choisis un par un, jamais plus de huit, jamais le même mélange deux fois.',
    bodyEn: 'Hand-picked builders, never more than eight, never the same mix twice.',
  },
];

export const InvitationPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || submitting) return;
    if (!name.trim() || !email.trim()) {
      setError(t('Please fill in your name and email.', 'Veuillez indiquer votre nom et votre courriel.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'rsvpInvitation'), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        proposedDate: proposedDate.trim() || null,
        language,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0a0808' }}>
      {/* atmosphere: warm near-black + soft drifting fog + grain */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div
          className="absolute inset-0 will-change-transform"
          style={{ background: 'radial-gradient(48% 38% at 50% 18%, rgba(201,168,90,0.10), transparent 72%)', animation: 'invitationDrift 48s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>
      <style>{`
        @keyframes invitationDrift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,2%,0) scale(1.05); }
        }
      `}</style>

      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#0a0808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('INN')}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {t('The Inn', "L'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">
            {t('BY INVITATION ONLY', 'SUR INVITATION SEULEMENT')}
          </span>
        </div>
      </header>

      <main className="pt-28 md:pt-36 pb-24">
        {/* Hero */}
        <section className="relative px-6 md:px-12 lg:px-20 pb-14 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-25" aria-hidden>
            <img src={MANOR_IMG} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,8,8,0.3) 0%, rgba(10,8,8,0.92) 85%)' }} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <span className="h-px w-12 bg-[#c5a059]" />
              <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                {t('You have been invited', 'Vous avez été invité')}
              </span>
            </div>
            <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.6rem, 7vw, 6rem)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
              {t('The Table of Strangers', 'La Table des Inconnus')}
            </h1>
            <p className="font-cormorant italic mt-8 text-white/80" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.6rem)', lineHeight: 1.5, maxWidth: '52ch' }}>
              {t(
                'A private evening at the manor, by named invitation only. Six to eight guests, chosen one by one. Nothing is sold here. People meet here.',
                "Une soirée privée au manoir, sur invitation nominative uniquement. Six à huit invités, choisis un par un. Rien ne se vend ici. On s'y rencontre.",
              )}
            </p>
          </motion.div>
        </section>

        {/* Four promises */}
        <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20 border-y border-[#c5a059]/15">
          <span className="font-cinzel uppercase text-white/40 block mb-10" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
            {t('What the evening holds', 'Ce que réserve la soirée')}
          </span>
          <div className="grid gap-10 md:gap-12 sm:grid-cols-2">
            {PROMISES.map((p, i) => (
              <motion.article
                key={p.titleEn}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: Math.min(i, 4) * 0.06 }}
                className="border-t border-[#c5a059]/20 pt-6"
              >
                <span className="font-cinzel text-[#c5a059]/70" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-prata text-[#f3e5ab] mt-3 text-xl md:text-2xl">
                  {fr ? p.titleFr : p.titleEn}
                </h3>
                <p className="font-cormorant mt-3 text-white/70" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)', lineHeight: 1.55 }}>
                  {fr ? p.bodyFr : p.bodyEn}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* RSVP */}
        <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20">
          <div className="max-w-xl">
            <span className="font-cinzel uppercase text-[#c5a059] block mb-4" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
              {t('Confirm your attendance', 'Confirmer votre présence')}
            </span>
            <h2 className="font-prata text-[#f3e5ab] mb-8" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1.1 }}>
              {t('One place is held for you.', 'Une place vous est réservée.')}
            </h2>

            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-[#c5a059]/30 bg-[#c5a059]/[0.06] px-7 py-8"
              >
                <p className="font-prata text-[#f3e5ab] text-xl mb-2">
                  {t('Received.', 'Reçu.')}
                </p>
                <p className="font-cormorant text-white/70" style={{ fontSize: '1.1rem' }}>
                  {t(
                    "We will write back to you directly to arrange the date.",
                    "Nous vous écrirons directement pour convenir de la date.",
                  )}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 font-lato">
                <label className="block">
                  <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2">
                    {t('Name', 'Nom')} <span className="text-[#c5a059]">*</span>
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4af37]/50"
                  />
                </label>
                <label className="block">
                  <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2">
                    Email <span className="text-[#c5a059]">*</span>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4af37]/50"
                  />
                </label>
                <label className="block">
                  <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2">
                    {t('Proposed date (optional)', 'Date proposée (facultatif)')}
                  </span>
                  <input
                    type="text"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    placeholder={t('e.g. late September', 'ex. fin septembre')}
                    className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4af37]/50"
                  />
                </label>

                {error && <p className="text-rose-400 text-xs font-lato">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#d4af37] text-black font-cinzel text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
                >
                  {submitting ? t('Sending…', 'Envoi…') : t('Confirm attendance', 'Confirmer ma présence')}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
