import React from 'react';
import { motion } from 'framer-motion';

// Route /coffre — page de vente du Coffre des Inconnus, insérée entre /tools
// et la vraie démo web. Même atmosphère que DownloadPage : noir chaud, or
// discret, brume et grain. Structure Tony Robbins : douleur, gestes simples,
// preuve sociale, projection future, objections, CTA final.
interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const DEMO = 'https://coffre-des-inconnus.web.app';
const DL_MAC = `${DEMO}/dl/CoffreDesInconnus-mac.dmg`;
const DL_WIN = `${DEMO}/dl/CoffreDesInconnus-Setup.exe`;
const DL_MOBILE = `${DEMO}/telecharger.html`;
const DL_DONS = `${DEMO}/telecharger.html#dons`;
const SPONSOR = 'mailto:alex@lesalondesinconnus.com?subject=Commanditer%20les%20outils%20du%20Salon';

const EASE = [0.22, 0.61, 0.36, 1] as const;
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' } as const,
  transition: { duration: 0.9, ease: EASE, delay },
});
const heroReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
});

const PILL_PRIMARY =
  'px-6 py-3 rounded-full bg-gradient-to-r from-[#c5a059] via-[#e8d5a3] to-[#c5a059] text-[#171308] text-sm font-bold hover:shadow-[0_0_30px_rgba(197,160,89,0.35)] transition-shadow';
const PILL_SECONDARY =
  'px-6 py-3 rounded-full border border-white/20 text-neutral-200 text-sm hover:border-[#c5a059] hover:text-[#e8d5a3] transition-colors';

const GlassFrame: React.FC<{ src: string; alt: string; eager?: boolean; className?: string }> = ({
  src, alt, eager, className = '',
}) => (
  <div className={`rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md shadow-[0_0_60px_rgba(197,160,89,0.15)] overflow-hidden ${className}`}>
    <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} className="w-full h-auto block" />
  </div>
);

interface Band {
  key: string;
  reverse: boolean;
  eyebrow: [string, string];
  title: [string, string];
  body: [string, string];
  img: string;
  alt: [string, string];
  imgClass?: string;
  ctaAfter?: boolean;
}

export const CoffreLanding: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);
  const M = '/media/coffre/';

  const demoCta = (
    <a href={DEMO} target="_blank" rel="noopener noreferrer" className={PILL_PRIMARY}>
      {t('Open the demo', 'Ouvrir la démo')}
    </a>
  );
  const microReassurance = (
    <p className="text-xs text-neutral-500">
      {t('Free · No account · Everything stays on your device', 'Gratuit · Sans compte · Tout reste sur votre appareil')}
    </p>
  );

  const bands: Band[] = [
    {
      key: 'pots',
      reverse: false,
      eyebrow: ['The jars', 'Les pots'],
      title: ['Every coin finds its place.', 'Chaque sou trouve sa place.'],
      body: [
        "Five jars, a split profile on every transaction. Your child decides where each deposit goes and withdraws from the jar of their choice. Budgeting becomes a motion they make themselves, week after week.",
        "Cinq pots, un profil de répartition par transaction. Votre enfant décide où va chaque dépôt et retire du pot de son choix. Le budget devient un geste qu'il pose lui-même, semaine après semaine.",
      ],
      img: 'pots.webp',
      alt: [
        'The Coffre jars panel: five spending and saving categories with live balances.',
        "Le panneau des pots du Coffre : cinq catégories avec leur solde en direct.",
      ],
    },
    {
      key: 'objectifs',
      reverse: true,
      eyebrow: ['The goals', 'Les objectifs'],
      title: ['Dreams with a real price.', 'Des rêves avec un vrai prix.'],
      body: [
        'A goal is created with its link, its price, the taxes and a waiting period before the purchase. Your child learns to see the impulse coming and let it pass.',
        "Un objectif se crée avec son lien, son prix, les taxes et un temps d'attente avant l'achat. Votre enfant apprend à voir venir l'impulsion et à la laisser passer.",
      ],
      img: 'objectifs.webp',
      alt: [
        'A savings goal card with its link, taxed price and countdown before purchase.',
        "Une carte d'objectif avec son lien, son prix taxé et le compte à rebours avant l'achat.",
      ],
    },
    {
      key: 'paliers',
      reverse: false,
      eyebrow: ['The milestones', 'Les paliers'],
      title: ['The treasure grows, the honors follow.', 'Le trésor grandit, les honneurs suivent.'],
      body: [
        'Milestones mark every new peak of the treasure, and the \u{1F48E} line keeps a lifetime record of everything ever earned. The pride of building takes over from the urge to spend.',
        "Des paliers soulignent chaque sommet du trésor, et la ligne \u{1F48E} garde la trace de tout ce qui a été gagné à vie. La fierté de bâtir prend le dessus sur l'envie de dépenser.",
      ],
      img: 'paliers.webp',
      alt: ['Treasure milestones and the lifetime earnings line.', 'Les paliers du trésor et la ligne des gains à vie.'],
      ctaAfter: true,
    },
    {
      key: 'toolbox',
      reverse: true,
      eyebrow: ['The toolbox', "La boîte à outils"],
      title: ['Signal before noise.', 'Le signal avant le bruit.'],
      body: [
        "The entrepreneur's toolbox: one big rock a month, two small ones, the list of what your child is avoiding, and a board that separates signal from noise. Great careers begin with that discipline.",
        "La boîte à outils de l'entrepreneur : un gros caillou par mois, deux petits, la liste de ce que votre enfant évite, et un tableau qui sépare le signal du bruit. Les grandes carrières commencent par cette discipline.",
      ],
      img: 'toolbox.webp',
      alt: [
        "The entrepreneur's toolbox: the month's big rock, small rocks, avoidance list and signal/noise board.",
        "La boîte à outils de l'entrepreneur : le gros caillou du mois, les petits cailloux, la liste d'évitement et le tableau signal/bruit.",
      ],
      imgClass: 'md:w-3/4 md:mx-auto',
    },
    {
      key: 'skilltree',
      reverse: false,
      eyebrow: ['The skill tree', 'L’arbre de compétences'],
      title: ['Effort that pays.', 'L’effort qui rapporte.'],
      body: [
        'Riding lessons, piano, a museum visit: you choose what the family subsidizes, at 50, 66 or 100%. An activity can feed the treasure and even boost the interest rate for thirty days. Growing up literally pays.',
        "Cours d'équitation, piano, sortie au musée : vous choisissez ce que la famille subventionne, à 50, 66 ou 100 %. L'activité peut nourrir le trésor et même bonifier le taux d'intérêt pendant trente jours. Grandir devient payant, au sens propre.",
      ],
      img: 'skilltree.webp',
      alt: [
        'The skill tree: family-subsidized activities that feed the treasure and boost interest.',
        "L'arbre de compétences : les activités subventionnées par la famille qui nourrissent le trésor et bonifient l'intérêt.",
      ],
    },
  ];

  const faq: [string, string, string, string][] = [
    ['From what age?', 'From 4 or 5 at level 1, where the child counts coins. The ten levels climb all the way to adult financial education.',
      'À partir de quel âge ?', "Dès 4 ou 5 ans au niveau 1, où l'enfant compte les sous. Les dix niveaux montent jusqu'à l'éducation financière adulte."],
    ['Do I need to know finance?', 'No. Every level comes with guideposts for the parent, and the built-in guide explains each module, in French and in English.',
      "Faut-il s'y connaître en finances ?", "Non. Chaque niveau vient avec ses repères pour le parent, et le guide intégré explique chaque module, en français et en anglais."],
    ['Is it really free?', 'Yes. The public beta is free and ad-free. Donations and sponsors keep the project alive.',
      "C'est vraiment gratuit ?", "Oui. La beta publique est gratuite et sans publicité. Les dons et les commanditaires gardent le projet vivant."],
    ['Where does the data go?', 'Nowhere. Everything stays on your device, and you can create timestamped backups whenever you want.',
      'Où vont les données ?', "Nulle part. Tout reste sur votre appareil, et vous pouvez créer des sauvegardes horodatées quand vous voulez."],
    ['On which devices?', 'In the browser, on macOS and Windows, and on phones or tablets by adding it to the home screen.',
      'Sur quels appareils ?', "Dans le navigateur, sur macOS et Windows, et sur téléphone ou tablette en l'ajoutant à l'écran d'accueil."],
  ];

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto scroll-smooth text-neutral-200" style={{ background: '#0a0808' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(48% 38% at 50% 16%, rgba(201,168,90,0.10), transparent 72%)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>

      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#0a0808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button onClick={() => onNavigate('INN')} className="flex items-center gap-3 group">
            <img src="/media/logo-icon.png" alt="" className="w-9 h-9 opacity-90" />
            <span className="font-cinzel tracking-[0.2em] text-sm text-[#c5a059] group-hover:text-[#e8d5a3] transition-colors">
              LE SALON DES INCONNUS
            </span>
          </button>
          <button onClick={() => onNavigate('DOWNLOAD')} className="text-xs tracking-[0.18em] uppercase text-neutral-400 hover:text-[#c5a059] transition-colors">
            {t('Back to tools', 'Retour aux outils')}
          </button>
        </div>
      </header>

      <main>
        {/* 1. HERO */}
        <section className="max-w-7xl mx-auto px-6 pt-36 md:pt-40 pb-24 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <motion.p {...heroReveal(0)} className="text-[11px] tracking-[0.3em] uppercase text-neutral-500 mb-5">
              {t('Le Coffre des Inconnus · Free public beta', 'Le Coffre des Inconnus · Beta publique gratuite')}
            </motion.p>
            <motion.h1 {...heroReveal(0.12)} className="font-cinzel text-4xl md:text-6xl text-[#e8d5a3] leading-tight mb-6">
              {t('Raise a child who understands money.', "Élevez un enfant qui comprend l'argent.")}
            </motion.h1>
            <motion.div {...heroReveal(0.24)}>
              <p className="text-neutral-300 max-w-xl leading-relaxed mb-8">
                {t(
                  'A real little family bank. Every deposit splits into jars, interest lands every week, goals show their true price, taxes included. Your child runs their own bank, with you as head banker.',
                  "Une vraie petite banque familiale. Chaque dépôt se répartit en pots, l'intérêt tombe chaque semaine, les objectifs affichent leur vrai prix, taxes comprises. Votre enfant tient sa propre banque, avec vous comme banquier en chef.",
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                {demoCta}
                <a href="#telecharger" className={PILL_SECONDARY}>{t('Download the app', "Télécharger l'app")}</a>
              </div>
              <div className="mt-5">{microReassurance}</div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} className="relative">
            <GlassFrame
              src={`${M}dash-desktop.webp`}
              alt={t('The Coffre des Inconnus dashboard, showing a child account with its jars and treasure.', "Le tableau de bord du Coffre des Inconnus, avec un compte enfant, ses pots et son trésor.")}
              eager
            />
            <div className="absolute -bottom-8 -left-6 md:-bottom-10 md:-left-10 w-[180px]">
              <GlassFrame
                src={`${M}mobile.webp`}
                alt={t('The Coffre on a phone screen.', "Le Coffre sur un écran de téléphone.")}
                className="shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
              />
            </div>
          </motion.div>
        </section>

        {/* 2. BANDE DOULEUR */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10">
            <h2 className="font-cinzel text-3xl text-[#e8d5a3]">{t('School will not teach it.', "L'école ne l'enseignera pas.")}</h2>
            <p className="text-neutral-300 leading-relaxed">
              {t(
                'Most adults learned money the hard way: first credit card at 18, first debts at 20. Books and lectures slide right off children. What stays is what they live, week after week, with their own coins.',
                "La plupart des adultes ont appris l'argent à la dure : première carte de crédit à 18 ans, premières dettes à 20. Les livres et les discours glissent sur les enfants. Ce qui reste, c'est ce qu'ils vivent, semaine après semaine, avec leurs propres sous.",
              )}
            </p>
          </div>
        </motion.section>

        {/* 3. TROIS GESTES */}
        <section className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <motion.h2 {...reveal()} className="font-cinzel text-3xl text-[#e8d5a3] text-center mb-12">
              {t('Three steps, and the bank is open.', 'Trois gestes, et la banque est ouverte.')}
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: '1', title: t('Open the Coffre', 'Ouvrez le Coffre'), body: t(
                  "The welcome assistant opens each child's account in two minutes. No email, no password for them to remember.",
                  "L'assistant vous accueille et crée le compte de chaque enfant en deux minutes. Pas de courriel, pas de mot de passe à retenir pour eux.",
                ) },
                { n: '2', title: t('Deposit the allowance', "Déposez l'allocation"), body: t(
                  'Every amount splits itself across the jars: needs, savings, projects, giving, fun. Your child adjusts their profile and sees where every coin goes.',
                  "Chaque montant se répartit tout seul entre les pots : besoins, épargne, projets, générosité, plaisirs. Votre enfant ajuste son profil et voit où va chaque sou.",
                ) },
                { n: '3', title: t('Pay the interest', "Versez l'intérêt"), body: t(
                  'You are the head banker. Compound interest lands every week, and your child watches the treasure grow on its own.',
                  "Vous êtes le banquier en chef. L'intérêt composé tombe chaque semaine, et votre enfant regarde son trésor grandir tout seul.",
                ) },
              ].map((card, i) => (
                <motion.div key={card.n} {...reveal(i * 0.1)} className="rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-8">
                  <p className="font-cinzel text-4xl text-[#c5a059] mb-4">{card.n}</p>
                  <h3 className="font-cinzel text-xl text-[#e8d5a3] mb-3">{card.title}</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm">{card.body}</p>
                </motion.div>
              ))}
            </div>
            <motion.div {...reveal(0.1)} className="mt-12 flex flex-col items-center gap-4">
              {demoCta}
              {microReassurance}
            </motion.div>
          </div>
        </section>

        {/* 4. BANDES VITRINE */}
        {bands.map((b) => (
          <motion.section key={b.key} {...reveal()} className="border-t border-white/5 py-20 md:py-28">
            <div className="max-w-7xl mx-auto px-6">
              <div className={`grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center ${b.reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <div className="flex items-center">
                  <GlassFrame src={`${M}${b.img}`} alt={t(b.alt[0], b.alt[1])} className={`w-full ${b.imgClass || ''}`} />
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">{t(b.eyebrow[0], b.eyebrow[1])}</p>
                  <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">{t(b.title[0], b.title[1])}</h3>
                  <p className="text-neutral-300 leading-relaxed">{t(b.body[0], b.body[1])}</p>
                </div>
              </div>
              {b.ctaAfter && <div className="mt-12 flex justify-center">{demoCta}</div>}
            </div>
          </motion.section>
        ))}

        {/* 4F. BANDE NIVEAUX */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4 text-center">{t('Ten levels', 'Dix niveaux')}</p>
            <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5 text-center">{t('A bank that grows with your child.', 'Une banque qui grandit avec votre enfant.')}</h3>
            <p className="text-neutral-300 leading-relaxed max-w-3xl mx-auto text-center mb-14">
              {t(
                'From the little one counting coins to the adult handling taxes, credit and currencies: every level opens its modules, and every level comes with its guideposts for the parent. You always know what to show, and when.',
                "Du tout-petit qui compte les sous à l'adulte qui gère impôts, crédit et devises : chaque niveau ouvre ses modules, et chaque niveau vient avec ses repères pour le parent. Vous savez toujours quoi montrer, et quand.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const labeled = n === 1 || n === 10;
                const label = n === 1
                  ? t('1 · I count my coins', '1 · Je compte les sous')
                  : n === 10
                  ? t('10 · Adult · everything open', '10 · Adulte · tout ouvert')
                  : '';
                return (
                  <div key={n} className="flex flex-col items-center gap-2 w-20">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-cinzel text-[#171308] font-bold" style={{ background: 'linear-gradient(135deg, #c5a059, #e8d5a3, #c5a059)' }}>
                      {n}
                    </div>
                    {labeled && <p className="text-[10px] text-neutral-400 text-center leading-snug">{label}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* 5. FUTURE PACING */}
        <motion.section {...reveal()} className="border-t border-white/5 py-24 md:py-32">
          <div className="max-w-4xl mx-auto px-6 rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-10 md:p-16">
            <p className="font-cinzel text-2xl md:text-3xl text-[#e8d5a3] text-center leading-relaxed">
              {'« '}
              {t(
                'Picture the next family dinner: your child gets ten dollars and asks "which jar does it go to?". A year from now, talking about money at home will feel as normal as talking about school.',
                'Imaginez le prochain souper : votre enfant reçoit dix dollars et demande "je le mets sur quel pot?". Dans un an, parler d\'argent chez vous sera aussi normal que parler d\'école.',
              )}
              {' »'}
            </p>
          </div>
        </motion.section>

        {/* 6. BANDE PREUVE */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">{t('Built by a family, not by a bank.', 'Bâti par une famille, pas par une banque.')}</h3>
                <p className="text-neutral-300 leading-relaxed">
                  {t(
                    'The Coffre was born in an inn of the Petite-Nation, for two very real children. The accounts you see in these images are theirs: real deposits, real goals, real interest paid every week. The app is offered as a free public beta, and every family suggestion shapes what comes next.',
                    "Le Coffre est né dans une auberge de la Petite-Nation, pour deux enfants bien réels. Les comptes que vous voyez dans ces images sont les leurs : de vrais dépôts, de vrais objectifs, de vrais intérêts versés chaque semaine. L'app est offerte en beta publique gratuite, et chaque suggestion des familles façonne la suite.",
                  )}
                </p>
              </div>
              <GlassFrame src={`${M}wizard.webp`} alt={t('The welcome assistant guiding a new family through the Coffre.', "L'assistant d'accueil qui guide une nouvelle famille dans le Coffre.")} />
            </div>
            <div className="mt-10 pt-8 border-t border-[#c5a059]/15 flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
              <span>{t('An ad-free experience, presented by', 'Une expérience sans publicité, présentée par')}</span>
              <span className="text-[#c5a059] font-semibold">La Petite Monnaie</span>
              <a href={SPONSOR} className="underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">{t('Become a sponsor', 'Devenir commanditaire')}</a>
              <a href={DL_DONS} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">
                {t('Support the project', 'Soutenir le projet')}
              </a>
            </div>
          </div>
        </motion.section>

        {/* 7. SANS RISQUE + FAQ */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-14">
            <div>
              <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">{t('Nothing to lose, everything to learn.', 'Rien à perdre, tout à apprendre.')}</h3>
              <p className="text-neutral-300 leading-relaxed">
                {t(
                  'Free, no account, no ads. Your data lives on your device, with one-tap backups. Try the demo: if the Coffre does not win you over, your child will still have played banker for twenty minutes.',
                  "Gratuit, sans compte, sans publicité. Vos données vivent sur votre appareil, avec des sauvegardes en un geste. Essayez la démo : si le Coffre ne vous convainc pas, votre enfant aura quand même joué au banquier vingt minutes.",
                )}
              </p>
            </div>
            <dl className="space-y-7">
              {faq.map(([qEn, aEn, qFr, aFr]) => (
                <div key={qEn}>
                  <dt className="font-semibold text-[#e8d5a3] mb-2">{t(qEn, qFr)}</dt>
                  <dd className="text-neutral-400 leading-relaxed">{t(aEn, aFr)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.section>

        {/* 8. CTA FINAL */}
        <motion.section id="telecharger" {...reveal()} className="border-t border-white/5 py-24 md:py-32">
          <div className="max-w-4xl mx-auto px-6 rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-10 md:p-16 text-center">
            <h3 className="font-cinzel text-3xl md:text-4xl text-[#e8d5a3] mb-8">
              {t('The next allowance can be the first lesson.', 'La prochaine allocation peut être la première leçon.')}
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {demoCta}
              <a href={DL_MAC} className={PILL_SECONDARY}>{t('Download for macOS', 'Télécharger pour macOS')}</a>
              <a href={DL_WIN} className={PILL_SECONDARY}>{t('Download for Windows', 'Télécharger pour Windows')}</a>
              <a href={DL_MOBILE} target="_blank" rel="noopener noreferrer" className={PILL_SECONDARY}>{t('iPhone, iPad and Android', 'iPhone, iPad et Android')}</a>
            </div>
            <p className="text-xs text-neutral-500 mt-7">
              {t('Free public beta · Presented by La Petite Monnaie', 'Beta publique gratuite · Présentée par La Petite Monnaie')}
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
};
