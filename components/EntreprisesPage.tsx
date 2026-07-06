import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getOptimizedUrl } from '../utils/imageOptimizer';

// Unlisted page at /entreprises — B2B pitch for exclusive team building and
// corporate retreats. No nav link, but indexed (unlike /invitation).

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const HERO_IMG = getOptimizedUrl('/media/inn/golden%20drone%20copy.jpg', 1920);

const OFFER_SECTIONS = [
  {
    key: 'kitchen',
    img: '/media/Cuisine/alexis%20chef.jpg',
    titleFr: 'La table du chef',
    titleEn: "The chef's table",
    bodyFr: "Bistronomie portugaise et cuisine moléculaire, signées par le chef Marc Alexis Pepin. Une table d'hôte pensée pour marquer une journée d'équipe, pas simplement la nourrir.",
    bodyEn: 'Portuguese bistronomy and molecular cuisine, signed by chef Marc Alexis Pepin. A table d\'hôte built to mark a team day, not just feed it.',
  },
  {
    key: 'massage',
    img: '/media/massage/massage%20andre.jpg',
    titleFr: 'Massothérapie & reiki',
    titleEn: 'Massage therapy & reiki',
    bodyFr: 'Andrée Dancause reçoit sur place, spa et jacuzzi à disposition. De quoi vider les épaules avant que la soirée commence.',
    bodyEn: 'Andrée Dancause receives on site, spa and hot tub included. Enough to clear the shoulders before the evening starts.',
  },
  {
    key: 'pps',
    img: '/media/entreprises/pps-soiree.jpg',
    titleFr: 'Soirées mises en scène',
    titleEn: 'Staged evenings',
    bodyFr: "En partenariat avec PPS Canada : beach party, tournoi golf, kermesse, musique live, humour. Une soirée thématique construite sur mesure pour votre groupe.",
    bodyEn: 'In partnership with PPS Canada: beach party, golf tournament, kermesse, live music, comedy. A theme evening built specifically for your group.',
  },
  {
    key: 'stay',
    img: '/media/inn/us%20copy.jpg',
    titleFr: 'Hébergement sur le domaine',
    titleEn: 'On-site accommodation',
    bodyFr: 'Chambres du manoir, yourte et autobus aménagé : de quoi loger un groupe complet sans jamais quitter le domaine.',
    bodyEn: 'Manor rooms, a yurt and a converted bus: enough to house a full group without ever leaving the grounds.',
  },
];

export const EntreprisesPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || submitting) return;
    if (!name.trim() || !email.trim() || !company.trim()) {
      setError(t('Please fill in your name, email and company.', 'Veuillez indiquer votre nom, courriel et entreprise.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'proposalRequests'), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company.trim(),
        message: message.trim() || null,
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div
          className="absolute inset-0 will-change-transform"
          style={{ background: 'radial-gradient(48% 38% at 50% 18%, rgba(201,168,90,0.10), transparent 72%)', animation: 'entreprisesDrift 48s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>
      <style>{`
        @keyframes entreprisesDrift {
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
            {t('CORPORATE RETREATS', 'RETRAITES D\'ENTREPRISE')}
          </span>
        </div>
      </header>

      <main className="pt-28 md:pt-36 pb-24">
        {/* Hero */}
        <section className="relative px-6 md:px-12 lg:px-20 pb-14 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-30" aria-hidden>
            <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,8,8,0.35) 0%, rgba(10,8,8,0.92) 85%)' }} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <span className="h-px w-12 bg-[#c5a059]" />
              <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                {t('A private estate in the Outaouais', 'Un domaine privé en Outaouais')}
              </span>
            </div>
            <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5.5rem)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
              {t('Team building with character', "Le team building qui a du caractère")}
            </h1>
            <p className="font-cormorant italic mt-8 text-white/80" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.6rem)', lineHeight: 1.5, maxWidth: '58ch' }}>
              {t(
                'A classic manor domain less than an hour from Ottawa, for teams who want the alternative to the golf club.',
                "Un domaine classique de moins d'une heure d'Ottawa, pour les équipes qui cherchent l'alternative au club de golf.",
              )}
            </p>
          </motion.div>
        </section>

        {/* Offer sections */}
        <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20 border-y border-[#c5a059]/15">
          <span className="font-cinzel uppercase text-white/40 block mb-10" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
            {t('What we bring to a privatized day', "Ce que nous apportons à une journée privatisée")}
          </span>
          <div className="grid gap-10 md:gap-14 md:grid-cols-2">
            {OFFER_SECTIONS.map((o, i) => (
              <motion.article
                key={o.key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: Math.min(i, 4) * 0.06 }}
                className="group"
              >
                <div className="w-full aspect-[16/10] overflow-hidden mb-5 border border-[#c5a059]/15">
                  <img
                    src={getOptimizedUrl(o.img, 900)}
                    alt={fr ? o.titleFr : o.titleEn}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-prata text-[#f3e5ab] text-xl md:text-2xl">
                  {fr ? o.titleFr : o.titleEn}
                </h3>
                <p className="font-cormorant mt-3 text-white/70" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)', lineHeight: 1.55 }}>
                  {fr ? o.bodyFr : o.bodyEn}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Proposal request */}
        <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20">
          <div className="max-w-xl">
            <span className="font-cinzel uppercase text-[#c5a059] block mb-4" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
              {t('Request a proposal', 'Demander une proposition')}
            </span>
            <h2 className="font-prata text-[#f3e5ab] mb-8" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1.1 }}>
              {t('Tell us about your group.', 'Parlez-nous de votre groupe.')}
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
                    'We will write back with a tailored proposal.',
                    'Nous vous reviendrons avec une proposition sur mesure.',
                  )}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 font-lato">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                </div>
                <label className="block">
                  <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2">
                    {t('Company', 'Entreprise')} <span className="text-[#c5a059]">*</span>
                  </span>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4af37]/50"
                  />
                </label>
                <label className="block">
                  <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2">
                    {t('Message or dates (optional)', 'Message ou dates (facultatif)')}
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder={t('Group size, preferred dates, what you have in mind…', "Taille du groupe, dates envisagées, ce que vous avez en tête…")}
                    className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#d4af37]/50"
                  />
                </label>

                {error && <p className="text-rose-400 text-xs font-lato">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#d4af37] text-black font-cinzel text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
                >
                  {submitting ? t('Sending…', 'Envoi…') : t('Request a proposal', 'Demander une proposition')}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
