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

type Lang = 'EN' | 'FR' | 'ES';

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

// Lecteur maison : les contrôles natifs portent toujours un bouton plein écran
// (et Safari ignore controlsList), donc on les cache et on dessine les nôtres.
// Le lecteur reste petit, dans sa boîte, en toutes circonstances.
const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const PlayIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden><path d="M8 5.5v13l10.5-6.5z" /></svg>
);
const PauseIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" /></svg>
);
const SoundIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 9.5h3L11 6v12l-4-3.5H4z" fill="currentColor" stroke="none" />
    {off ? (
      <><path d="M15 9.5l4.5 5" /><path d="M19.5 9.5l-4.5 5" /></>
    ) : (
      <><path d="M14.8 9.2a4 4 0 010 5.6" /><path d="M17.4 7a7.4 7.4 0 010 10" /></>
    )}
  </svg>
);

const MakerVideo: React.FC<{
  src: string;
  poster: string;
  label: string;
  playLabel: string;
  pauseLabel: string;
  muteLabel: string;
  seekLabel: string;
}> = ({ src, poster, label, playLabel, pauseLabel, muteLabel, seekLabel }) => {
  const vid = React.useRef<HTMLVideoElement>(null);
  const bar = React.useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [total, setTotal] = React.useState(0);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (v.paused) { setStarted(true); v.play().catch(() => {}); } else v.pause();
  };

  const seekTo = (ratio: number) => {
    const v = vid.current;
    if (!v || !isFinite(v.duration)) return;
    v.currentTime = Math.min(1, Math.max(0, ratio)) * v.duration;
  };

  const seekFromEvent = (clientX: number) => {
    const el = bar.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    seekTo((clientX - r.left) / r.width);
  };

  // Garde-fou iOS : Safari mobile peut basculer une vidéo en plein écran natif
  // malgré playsInline. Si ça arrive, nous refermons immédiatement.
  React.useEffect(() => {
    const v = vid.current as any;
    if (!v) return;
    const bail = () => { if (typeof v.webkitExitFullscreen === 'function') v.webkitExitFullscreen(); };
    v.addEventListener('webkitbeginfullscreen', bail);
    return () => v.removeEventListener('webkitbeginfullscreen', bail);
  }, []);

  const pct = total > 0 ? (time / total) * 100 : 0;

  return (
    <figure className="w-full max-w-[460px] md:ml-auto">
      <div className="relative rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md shadow-[0_0_60px_rgba(197,160,89,0.15)] overflow-hidden">
        <video
          ref={vid}
          src={src}
          poster={poster}
          aria-label={label}
          preload="metadata"
          playsInline
          disablePictureInPicture
          controlsList="nofullscreen nodownload noplaybackrate noremoteplayback"
          className="w-full h-auto block cursor-pointer"
          onClick={toggle}
          onDoubleClick={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onPlay={() => { setPlaying(true); setStarted(true); }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setStarted(false); }}
          onLoadedMetadata={(e) => setTotal(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        />

        {!started && (
          <button
            type="button"
            onClick={toggle}
            aria-label={playLabel}
            className="absolute inset-0 flex items-center justify-center bg-[#0a0808]/25 hover:bg-[#0a0808]/10 transition-colors group"
          >
            <span
              className="w-16 h-16 rounded-full flex items-center justify-center text-[#171308] pl-1 group-hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #c5a059, #e8d5a3, #c5a059)', boxShadow: '0 0 30px rgba(197,160,89,0.45)' }}
              aria-hidden
            >
              <PlayIcon size={26} />
            </span>
          </button>
        )}

        <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0808]/85 border-t border-[#c5a059]/15">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? pauseLabel : playLabel}
            className="text-[#c5a059] hover:text-[#e8d5a3] transition-colors text-sm w-4 text-center shrink-0"
          >
            {playing ? '❚❚' : '▶'}
          </button>

          <div
            ref={bar}
            role="slider"
            tabIndex={0}
            aria-label={seekLabel}
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${fmtTime(time)} / ${fmtTime(total)}`}
            onClick={(e) => seekFromEvent(e.clientX)}
            onKeyDown={(e) => {
              const v = vid.current;
              if (!v || !isFinite(v.duration)) return;
              if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
              if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
            }}
            className="flex-1 h-4 flex items-center cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a059] rounded"
          >
            <div className="w-full h-[3px] rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #c5a059, #e8d5a3)' }} />
            </div>
          </div>

          <span className="text-[11px] text-neutral-400 tabular-nums shrink-0">
            {fmtTime(time)} / {fmtTime(total)}
          </span>

          <button
            type="button"
            onClick={() => { const v = vid.current; if (v) v.muted = !v.muted; }}
            aria-label={muteLabel}
            className="text-[#c5a059] hover:text-[#e8d5a3] transition-colors text-sm shrink-0"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </figure>
  );
};

interface Band {
  key: string;
  reverse: boolean;
  eyebrow: [string, string, string];
  title: [string, string, string];
  body: [string, string, string];
  img: string;
  alt: [string, string, string];
  imgClass?: string;
  ctaAfter?: boolean;
}

export const CoffreLanding: React.FC<Props> = ({ onNavigate, language }) => {
  const [lang, setLang] = React.useState<Lang>(() => {
    try {
      const v = localStorage.getItem('salonToolsLang');
      if (v === 'EN' || v === 'FR' || v === 'ES') return v;
    } catch {}
    return language;
  });
  const pick = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('salonToolsLang', l); } catch {}
  };
  const fr = lang === 'FR';
  const t = (en: string, frText: string, es: string) => (lang === 'FR' ? frText : lang === 'ES' ? es : en);
  const M = '/media/coffre/';

  const demoCta = (
    <a href={DEMO} target="_blank" rel="noopener noreferrer" className={PILL_PRIMARY}>
      {t('Open the demo', 'Ouvrir la démo', 'Abrir la demo')}
    </a>
  );
  const microReassurance = (
    <p className="text-xs text-neutral-500">
      {t('Free · No account · Everything stays on your device', 'Gratuit · Sans compte · Tout reste sur votre appareil', 'Gratis · Sin cuenta · Todo permanece en su dispositivo')}
    </p>
  );

  const bands: Band[] = [
    {
      key: 'pots',
      reverse: false,
      eyebrow: ['The jars', 'Les pots', 'Los frascos'],
      title: ['Every coin finds its place.', 'Chaque sou trouve sa place.', 'Cada moneda encuentra su lugar.'],
      body: [
        "Five jars, a split profile on every transaction. Your child decides where each deposit goes and withdraws from the jar of their choice. Budgeting becomes a motion they make themselves, week after week.",
        "Cinq pots, un profil de répartition par transaction. Votre enfant décide où va chaque dépôt et retire du pot de son choix. Le budget devient un geste qu'il pose lui-même, semaine après semaine.",
        "Cinco frascos, un perfil de reparto en cada transacción. Su hijo decide adónde va cada depósito y retira del frasco que elige. El presupuesto se vuelve un gesto que él mismo hace, semana tras semana.",
      ],
      img: 'carte.webp',
      alt: [
        "A real child's account card: name, balance and the five jars with their live amounts.",
        "La carte d'un vrai compte d'enfant : le nom, le solde et les cinq pots avec leurs montants en direct.",
        "La tarjeta de una cuenta infantil real: el nombre, el saldo y los cinco frascos con sus montos en vivo.",
      ],
    },
    {
      key: 'caisse',
      reverse: true,
      eyebrow: ['The till', 'La caisse', 'La caja'],
      title: ['Count in real coins.', 'Comptez en vraies pièces.', 'Cuente con monedas reales.'],
      body: [
        'The real-money theme shows Canadian coins and bills: the beaver, the loonie, the polar bear, the polymer notes. Your child taps a till, deposits, withdraws and counts like at the store. Mathematics becomes a set of motions.',
        "Le thème vraie monnaie affiche les pièces et les billets canadiens : le castor, le huard, l'ours polaire, les coupures polymère. Votre enfant touche une caisse, dépose, retire et compte comme au magasin. Les mathématiques deviennent des gestes.",
        'El tema de dinero real muestra las monedas y los billetes canadienses: el castor, el huard, el oso polar, los billetes de polímero. Su hijo toca una caja, deposita, retira y cuenta como en la tienda. Las matemáticas se convierten en gestos.',
      ],
      img: 'caisse.webp',
      alt: [
        'The till with real Canadian coins and polymer bills, and the deposit split above.',
        'La caisse avec les vraies pièces canadiennes, les billets polymère et la répartition du dépôt.',
        'La caja con las monedas canadienses reales, los billetes de polímero y el reparto del depósito arriba.',
      ],
    },
    {
      key: 'objectifs',
      reverse: false,
      eyebrow: ['The goals', 'Les objectifs', 'Los objetivos'],
      title: ['Dreams with a real price.', 'Des rêves avec un vrai prix.', 'Sueños con un precio real.'],
      body: [
        'A goal is created with its link, its price, the taxes and a waiting period before the purchase. Your child learns to see the impulse coming and let it pass.',
        "Un objectif se crée avec son lien, son prix, les taxes et un temps d'attente avant l'achat. Votre enfant apprend à voir venir l'impulsion et à la laisser passer.",
        'Un objetivo se crea con su enlace, su precio, los impuestos y un tiempo de espera antes de la compra. Su hijo aprende a ver venir el impulso y a dejarlo pasar.',
      ],
      img: 'objectifs.webp',
      alt: [
        'A savings goal card with its link, taxed price and countdown before purchase.',
        "Une carte d'objectif avec son lien, son prix taxé et le compte à rebours avant l'achat.",
        'Una tarjeta de objetivo con su enlace, su precio con impuestos y la cuenta regresiva antes de la compra.',
      ],
    },
    {
      key: 'paliers',
      reverse: true,
      eyebrow: ['The milestones', 'Les paliers', 'Los hitos'],
      title: ['The treasure grows, the honors follow.', 'Le trésor grandit, les honneurs suivent.', 'El tesoro crece, los honores lo siguen.'],
      body: [
        'Milestones mark every new peak of the treasure, and the \u{1F48E} line keeps a lifetime record of everything ever earned. The pride of building takes over from the urge to spend.',
        "Des paliers soulignent chaque sommet du trésor, et la ligne \u{1F48E} garde la trace de tout ce qui a été gagné à vie. La fierté de bâtir prend le dessus sur l'envie de dépenser.",
        'Los hitos marcan cada nueva cima del tesoro, y la línea \u{1F48E} guarda el registro de todo lo ganado en la vida. El orgullo de construir se impone sobre las ganas de gastar.',
      ],
      img: 'paliers.webp',
      alt: ['Treasure milestones and the lifetime earnings line.', 'Les paliers du trésor et la ligne des gains à vie.', 'Los hitos del tesoro y la línea de ganancias de por vida.'],
      ctaAfter: true,
    },
    {
      key: 'toolbox',
      reverse: false,
      eyebrow: ['The toolbox', "La boîte à outils", 'La caja de herramientas'],
      title: ['Signal before noise.', 'Le signal avant le bruit.', 'La señal antes del ruido.'],
      body: [
        "The entrepreneur's toolbox: one big rock a month, two small ones, the list of what your child is avoiding, and a board that separates signal from noise. Great careers begin with that discipline.",
        "La boîte à outils de l'entrepreneur : un gros caillou par mois, deux petits, la liste de ce que votre enfant évite, et un tableau qui sépare le signal du bruit. Les grandes carrières commencent par cette discipline.",
        "La caja de herramientas del emprendedor: una piedra grande al mes, dos pequeñas, la lista de lo que su hijo evita, y un tablero que separa la señal del ruido. Las grandes carreras empiezan con esa disciplina.",
      ],
      img: 'toolbox.webp',
      alt: [
        "The entrepreneur's toolbox: the month's big rock, small rocks, avoidance list and signal/noise board.",
        "La boîte à outils de l'entrepreneur : le gros caillou du mois, les petits cailloux, la liste d'évitement et le tableau signal/bruit.",
        "La caja de herramientas del emprendedor: la piedra grande del mes, las piedras pequeñas, la lista de evitación y el tablero señal/ruido.",
      ],
      imgClass: 'md:w-3/4 md:mx-auto',
    },
    {
      key: 'skilltree',
      reverse: true,
      eyebrow: ['The skill tree', 'L’arbre de compétences', 'El árbol de habilidades'],
      title: ['Effort that pays.', 'L’effort qui rapporte.', 'El esfuerzo que rinde.'],
      body: [
        'Riding lessons, piano, a museum visit: you choose what the family subsidizes, at 50, 66 or 100%. An activity can feed the treasure and even boost the interest rate for thirty days. Growing up literally pays.',
        "Cours d'équitation, piano, sortie au musée : vous choisissez ce que la famille subventionne, à 50, 66 ou 100 %. L'activité peut nourrir le trésor et même bonifier le taux d'intérêt pendant trente jours. Grandir devient payant, au sens propre.",
        'Clases de equitación, piano, una visita al museo: usted elige qué subsidia la familia, al 50, 66 o 100 %. La actividad puede alimentar el tesoro e incluso aumentar la tasa de interés durante treinta días. Crecer se vuelve literalmente rentable.',
      ],
      img: 'skilltree.webp',
      alt: [
        'The skill tree: family-subsidized activities that feed the treasure and boost interest.',
        "L'arbre de compétences : les activités subventionnées par la famille qui nourrissent le trésor et bonifient l'intérêt.",
        'El árbol de habilidades: las actividades subsidiadas por la familia que alimentan el tesoro y aumentan el interés.',
      ],
    },
  ];

  const faq: [string, string, string, string, string, string][] = [
    ['From what age?', 'From 4 or 5 at level 1, where the child counts coins. The ten levels climb all the way to adult financial education.',
      'À partir de quel âge ?', "Dès 4 ou 5 ans au niveau 1, où l'enfant compte les sous. Les dix niveaux montent jusqu'à l'éducation financière adulte.",
      '¿A partir de qué edad?', 'Desde los 4 o 5 años en el nivel 1, donde el niño cuenta monedas. Los diez niveles suben hasta la educación financiera adulta.'],
    ['Do I need to know finance?', 'No. Every level comes with guideposts for the parent, and the built-in guide explains each module, in French and in English.',
      "Faut-il s'y connaître en finances ?", "Non. Chaque niveau vient avec ses repères pour le parent, et le guide intégré explique chaque module, en français et en anglais.",
      '¿Necesito saber de finanzas?', 'No. Cada nivel viene con guías para el padre o la madre, y la guía integrada explica cada módulo, en francés e inglés.'],
    ['Is it really free?', 'Yes. The public beta is free and ad-free. Donations and sponsors keep the project alive.',
      "C'est vraiment gratuit ?", "Oui. La beta publique est gratuite et sans publicité. Les dons et les commanditaires gardent le projet vivant.",
      '¿De verdad es gratis?', 'Sí. La beta pública es gratuita y sin publicidad. Las donaciones y los patrocinadores mantienen vivo el proyecto.'],
    ['Where does the data go?', 'Nowhere. Everything stays on your device, and you can create timestamped backups whenever you want.',
      'Où vont les données ?', "Nulle part. Tout reste sur votre appareil, et vous pouvez créer des sauvegardes horodatées quand vous voulez.",
      '¿Adónde van los datos?', 'A ningún lado. Todo permanece en su dispositivo, y usted puede crear copias de seguridad con fecha y hora cuando quiera.'],
    ['On which devices?', 'In the browser, on macOS and Windows, and on phones or tablets by adding it to the home screen.',
      'Sur quels appareils ?', "Dans le navigateur, sur macOS et Windows, et sur téléphone ou tablette en l'ajoutant à l'écran d'accueil.",
      '¿En qué dispositivos?', 'En el navegador, en macOS y Windows, y en teléfonos o tabletas agregándola a la pantalla de inicio.'],
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.18em]">
              {(['FR', 'EN', 'ES'] as Lang[]).map((l) => (
                <button key={l} onClick={() => pick(l)}
                  className={lang === l ? 'text-[#c5a059] border-b border-[#c5a059] pb-0.5' : 'text-neutral-500 hover:text-[#e8d5a3] transition-colors pb-0.5'}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => onNavigate('DOWNLOAD')} className="text-xs tracking-[0.18em] uppercase text-neutral-400 hover:text-[#c5a059] transition-colors">
              {t('Back to tools', 'Retour aux outils', 'Volver a las herramientas')}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. HERO */}
        <section className="max-w-7xl mx-auto px-6 pt-36 md:pt-40 pb-24 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <motion.p {...heroReveal(0)} className="text-[11px] tracking-[0.3em] uppercase text-neutral-500 mb-5">
              {t('Le Coffre des Inconnus · Free public beta', 'Le Coffre des Inconnus · Beta publique gratuite', 'Le Coffre des Inconnus · Beta pública gratuita')}
            </motion.p>
            <motion.h1 {...heroReveal(0.12)} className="font-cinzel text-4xl md:text-6xl text-[#e8d5a3] leading-tight mb-6">
              {t('Raise a child who understands money.', "Élevez un enfant qui comprend l'argent.", 'Eleve a un niño que entiende el dinero.')}
            </motion.h1>
            <motion.div {...heroReveal(0.24)}>
              <p className="text-[#c5a059] font-medium leading-relaxed max-w-xl mb-4">
                {t(
                  'An app for teaching personal & family economics that evolves with the child, from age 4 to a doctorate.',
                  "Une application d'enseignement de l'économie personnelle & familiale qui évolue avec l'enfant, de 4 ans au doctorat.",
                  'Una aplicación para enseñar economía personal y familiar que evoluciona con el niño, desde los 4 años hasta un doctorado.',
                )}
              </p>
              <p className="text-neutral-300 max-w-xl leading-relaxed mb-8">
                {t(
                  'A real little family bank. Every deposit splits into jars, interest lands every week, goals show their true price, taxes included. Your child runs their own bank, with you as head banker.',
                  "Une vraie petite banque familiale. Chaque dépôt se répartit en pots, l'intérêt tombe chaque semaine, les objectifs affichent leur vrai prix, taxes comprises. Votre enfant tient sa propre banque, avec vous comme banquier en chef.",
                  'Un verdadero pequeño banco familiar. Cada depósito se reparte en frascos, el interés cae cada semana, los objetivos muestran su precio real, impuestos incluidos. Su hijo dirige su propio banco, con usted como banquero en jefe.',
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                {demoCta}
                <a href="#telecharger" className={PILL_SECONDARY}>{t('Download the app', "Télécharger l'app", 'Descargar la app')}</a>
              </div>
              <div className="mt-5">{microReassurance}</div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} className="relative">
            <GlassFrame
              src={`${M}dash-desktop.webp`}
              alt={t('The Coffre des Inconnus dashboard, showing a child account with its jars and treasure.', "Le tableau de bord du Coffre des Inconnus, avec un compte enfant, ses pots et son trésor.", 'El tablero de Le Coffre des Inconnus, con una cuenta infantil, sus frascos y su tesoro.')}
              eager
            />
            <div className="hidden md:block absolute md:-bottom-10 md:-left-10 w-[180px]">
              <GlassFrame
                src={`${M}mobile.webp`}
                alt={t('The Coffre on a phone screen.', "Le Coffre sur un écran de téléphone.", 'Le Coffre en la pantalla de un teléfono.')}
                className="shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
              />
            </div>
          </motion.div>
        </section>

        {/* 2. BANDE DOULEUR */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10">
            <h2 className="font-cinzel text-3xl text-[#e8d5a3]">{t('School will not teach it.', "L'école ne l'enseignera pas.", 'La escuela no lo va a enseñar.')}</h2>
            <div>
              <p className="text-neutral-300 leading-relaxed">
                {t(
                  'Most adults learned money the hard way: first credit card at 18, first debts at 20. Books and lectures slide right off children. What stays is what they live, week after week, with their own coins.',
                  "La plupart des adultes ont appris l'argent à la dure : première carte de crédit à 18 ans, premières dettes à 20. Les livres et les discours glissent sur les enfants. Ce qui reste, c'est ce qu'ils vivent, semaine après semaine, avec leurs propres sous.",
                  'La mayoría de los adultos aprendió sobre el dinero a la mala: primera tarjeta de crédito a los 18, primeras deudas a los 20. Los libros y los discursos resbalan sobre los niños. Lo que queda es lo que viven, semana tras semana, con sus propias monedas.',
                )}
              </p>
              <p className="text-[#e8d5a3] font-semibold leading-relaxed mt-6">
                {t(
                  "They removed family economics classes from schools. No matter: let's take that power back through self-education.",
                  "Ils ont enlevé les cours d'économie familiale des écoles. Ce n'est pas grave : reprenons ce pouvoir par l'auto-éducation.",
                  'Quitaron las clases de economía familiar de las escuelas. No importa: recuperemos ese poder mediante la autoeducación.',
                )}
              </p>
            </div>
          </div>
        </motion.section>

        {/* 3. TROIS GESTES */}
        <section className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <motion.h2 {...reveal()} className="font-cinzel text-3xl text-[#e8d5a3] text-center mb-12">
              {t('Three steps, and the bank is open.', 'Trois gestes, et la banque est ouverte.', 'Tres gestos, y el banco está abierto.')}
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: '1', title: t('Open the Coffre', 'Ouvrez le Coffre', 'Abra el Coffre'), body: t(
                  "The welcome assistant opens each child's account in two minutes. No email, no password for them to remember.",
                  "L'assistant vous accueille et crée le compte de chaque enfant en deux minutes. Pas de courriel, pas de mot de passe à retenir pour eux.",
                  'El asistente de bienvenida abre la cuenta de cada niño en dos minutos. Sin correo, sin contraseña que ellos deban recordar.',
                ) },
                { n: '2', title: t('Deposit the allowance', "Déposez l'allocation", 'Deposite la mesada'), body: t(
                  'Every amount splits itself across the jars: needs, savings, projects, giving, fun. Your child adjusts their profile and sees where every coin goes.',
                  "Chaque montant se répartit tout seul entre les pots : besoins, épargne, projets, générosité, plaisirs. Votre enfant ajuste son profil et voit où va chaque sou.",
                  'Cada monto se reparte solo entre los frascos: necesidades, ahorro, proyectos, generosidad, gustos. Su hijo ajusta su perfil y ve adónde va cada moneda.',
                ) },
                { n: '3', title: t('Pay the interest', "Versez l'intérêt", 'Pague el interés'), body: t(
                  'You are the head banker. Compound interest lands every week, and your child watches the treasure grow on its own.',
                  "Vous êtes le banquier en chef. L'intérêt composé tombe chaque semaine, et votre enfant regarde son trésor grandir tout seul.",
                  'Usted es el banquero en jefe. El interés compuesto cae cada semana, y su hijo ve crecer su tesoro solo.',
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
                  <GlassFrame src={`${M}${b.img}`} alt={t(b.alt[0], b.alt[1], b.alt[2])} className={`w-full ${b.imgClass || ''}`} />
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">{t(b.eyebrow[0], b.eyebrow[1], b.eyebrow[2])}</p>
                  <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">{t(b.title[0], b.title[1], b.title[2])}</h3>
                  <p className="text-neutral-300 leading-relaxed">{t(b.body[0], b.body[1], b.body[2])}</p>
                </div>
              </div>
              {b.ctaAfter && <div className="mt-12 flex justify-center">{demoCta}</div>}
            </div>
          </motion.section>
        ))}

        {/* 4F. BANDE NIVEAUX */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4 text-center">{t('Ten levels', 'Dix niveaux', 'Diez niveles')}</p>
            <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5 text-center">{t('A bank that grows with your child.', 'Une banque qui grandit avec votre enfant.', 'Un banco que crece con su hijo.')}</h3>
            <p className="text-neutral-300 leading-relaxed max-w-3xl mx-auto text-center mb-14">
              {t(
                'From the little one counting coins to the adult handling taxes, credit and currencies: every level opens its modules, and every level comes with its guideposts for the parent. You always know what to show, and when.',
                "Du tout-petit qui compte les sous à l'adulte qui gère impôts, crédit et devises : chaque niveau ouvre ses modules, et chaque niveau vient avec ses repères pour le parent. Vous savez toujours quoi montrer, et quand.",
                'Del pequeño que cuenta monedas al adulto que maneja impuestos, crédito y divisas: cada nivel abre sus módulos, y cada nivel viene con sus guías para el padre o la madre. Usted siempre sabe qué mostrar, y cuándo.',
              )}
            </p>
            <div className="relative max-w-4xl mx-auto">
              <div className="absolute left-0 right-0 top-[18px] md:top-[24px] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(197,160,89,0.55), transparent)' }} />
              <div className="relative grid grid-cols-10 gap-1 md:gap-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const label = n === 1
                    ? t('4 years old · I count my coins', '4 ans · Je compte les sous', '4 años · Cuento mis monedas')
                    : n === 10
                    ? t('Adult · everything open', 'Adulte · tout ouvert', 'Adulto · todo abierto')
                    : '';
                  return (
                    <div key={n} className="flex flex-col items-center gap-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center font-cinzel text-[#171308] font-bold text-sm md:text-base" style={{ background: 'linear-gradient(135deg, #c5a059, #e8d5a3, #c5a059)', boxShadow: '0 0 18px rgba(197,160,89,0.25)' }}>
                        {n}
                      </div>
                      {label && <p className="hidden md:block text-[10px] text-neutral-400 text-center leading-snug">{label}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-10 gap-1 md:gap-3 mt-6">
                <div className="col-span-4 border-t border-[#c5a059]/35 pt-2 text-center text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-[#c5a059]">
                  {t('Child · from age 4', 'Enfant · dès 4 ans', 'Niño · desde los 4 años')}
                </div>
                <div className="col-span-3 border-t border-[#c5a059]/35 pt-2 text-center text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-[#c5a059]">
                  {t('Teen', 'Adolescent', 'Adolescente')}
                </div>
                <div className="col-span-2 border-t border-[#c5a059]/35 pt-2 text-center text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-[#c5a059]">
                  {t('Young adult', 'Jeune adulte', 'Joven adulto')}
                </div>
                <div className="col-span-1 border-t border-[#c5a059]/35 pt-2 text-center text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-[#c5a059]">
                  {t('Adult', 'Adulte', 'Adulto')}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 4G. BANDE POSSESSION (boîte logicielle rétro, anti-abonnement) */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.2, ease: EASE }}
              className="relative flex justify-center"
            >
              <div className="absolute inset-0 m-auto w-3/4 h-3/4" style={{ background: 'radial-gradient(50% 50% at 50% 55%, rgba(197,160,89,0.14), transparent 75%)' }} aria-hidden />
              <img
                src={`${M}boite.webp`}
                alt={t('The Coffre des Inconnus retro software box, black and gold, with its glowing treasure chest.', 'La boîte logicielle rétro du Coffre des Inconnus, noire et or, avec son coffre au trésor lumineux.', 'La caja de software retro de Le Coffre des Inconnus, negra y dorada, con su cofre del tesoro brillante.')}
                loading="lazy"
                className="relative w-[300px] md:w-[380px] h-auto"
                style={{ filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.7))' }}
              />
            </motion.div>
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">{t('The resistance', 'La résistance', 'La resistencia')}</p>
              <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">
                {t('You will own this program. And you will be happy.', 'Vous posséderez ce programme. Et vous serez heureux.', 'Usted poseerá este programa. Y será feliz.')}
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                {t(
                  'Everything is sliding into subscription: music, movies, software, even heated seats. Everything is rented, nothing is owned, and everyone is told to celebrate. People are fed up, and so are we. The Coffre is part of the resistance: you download it, it is yours. No subscription, no monthly rent on your children’s education, no server that shuts down and takes your data with it. Yours, until the day your computer gives out.',
                  "Tout glisse vers l'abonnement : la musique, les films, les logiciels, jusqu'aux sièges chauffants. Tout se loue, rien ne s'appartient, et il faudrait s'en réjouir. Les gens en ont soupé, et nous aussi. Le Coffre fait partie de la résistance : vous le téléchargez, il est à vous. Pas d'abonnement, pas de loyer mensuel sur l'éducation de vos enfants, pas de serveur qui ferme en emportant vos données. À vous, jusqu'au jour où votre ordinateur rendra l'âme.",
                  "Todo se desliza hacia la suscripción: la música, las películas, el software, hasta los asientos calefaccionados. Todo se renta, nada se posee, y se supone que hay que celebrarlo. La gente está harta, y nosotros también. Le Coffre forma parte de la resistencia: usted lo descarga, y es suyo. Sin suscripción, sin renta mensual sobre la educación de sus hijos, sin servidor que cierre y se lleve sus datos. Suyo, hasta el día en que su computadora rinda el último suspiro.",
                )}
              </p>
              <p className="text-neutral-500 text-sm leading-relaxed mt-5">
                {t(
                  'The public beta is free. The full version will sell the old way: once, in its box.',
                  'La beta publique est gratuite. La version complète se vendra comme dans le temps : une fois, dans sa boîte.',
                  'La beta pública es gratuita. La versión completa se venderá a la antigua: una sola vez, en su caja.',
                )}
              </p>
            </div>
          </div>
        </motion.section>

        {/* 5. FUTURE PACING */}
        <motion.section {...reveal()} className="border-t border-white/5 py-24 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(55% 65% at 50% 45%, rgba(201,168,90,0.09), transparent 75%)' }} aria-hidden />
          <div className="relative max-w-4xl mx-auto px-6">
            <p className="font-cinzel text-[110px] md:text-[160px] leading-none text-[#c5a059]/15 text-center select-none" aria-hidden>«</p>
            <p className="font-cinzel text-2xl md:text-4xl text-[#e8d5a3] text-center leading-relaxed -mt-10 md:-mt-16">
              {t(
                'Picture the next family dinner. Your child gets ten dollars as a gift and calls it before the bill even touches the table: "2.50 to savings, 2.50 to invest, 1.50 for fun and 1 to share."',
                'Imaginez le prochain souper. Votre enfant reçoit dix dollars en cadeau et annonce, avant même que le billet touche la table : "2,50 $ en épargne, 2,50 $ à investir, 1,50 $ pour le fun et 1 $ à partager."',
                'Imagine la próxima cena familiar. Su hijo recibe diez dólares de regalo y lo anuncia antes de que el billete toque la mesa: "2,50 $ al ahorro, 2,50 $ a invertir, 1,50 $ para gustos y 1 $ para compartir."',
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-10">
              {[
                ['🧾', '2,50 $', '2.50'],
                ['🏦', '2,50 $', '2.50'],
                ['🌱', '2,50 $', '2.50'],
                ['🎉', '1,50 $', '1.50'],
                ['🎁', '1,00 $', '1.00'],
              ].map(([emo, frAmt, enAmt]) => (
                <span key={emo} className="inline-flex items-center gap-2 rounded-full border border-[#c5a059]/30 bg-black/40 backdrop-blur-md px-4 py-2 text-sm">
                  <span aria-hidden>{emo}</span>
                  <span className="text-[#e8d5a3] font-semibold">{lang === 'EN' ? enAmt : frAmt}</span>
                </span>
              ))}
            </div>
            <p className="text-neutral-400 text-center leading-relaxed mt-10 max-w-2xl mx-auto">
              {t(
                'A year from now, talking about money at home will feel as normal as talking about school.',
                "Dans un an, parler d'argent chez vous sera aussi normal que parler d'école.",
                'Dentro de un año, hablar de dinero en casa será tan normal como hablar de la escuela.',
              )}
            </p>
          </div>
        </motion.section>

        {/* 6. BANDE PREUVE */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">
                  {t('Made by a homeschooling family, for all families', 'Une app de famille-école, pour toutes les familles', 'Hecha por una familia que educa en casa, para todas las familias')}
                </p>
                <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">{t('Built by a family, not by a bank.', 'Bâti par une famille, pas par une banque.', 'Construido por una familia, no por un banco.')}</h3>
                <p className="text-neutral-300 leading-relaxed">
                  {t(
                    'The Coffre was born in an inn of the Petite-Nation, for my two children. We homeschool: teaching them the jars, the interest and the goals at ages 4 and 5, I watched mathematics settle in right alongside the sense of money. The tool had to leave the house. The public version, richer than our first family build, is offered free for the length of the beta. The accounts you see in these images are my children’s: real deposits and real interest, paid every week.',
                    "Le Coffre est né dans une auberge de la Petite-Nation, pour mes deux enfants. Nous faisons l'école à la maison : en leur enseignant les pots, l'intérêt et les objectifs à 4 et 5 ans, j'ai vu les mathématiques s'installer en même temps que le sens de l'argent. L'outil devait sortir de la maison. La version publique, enrichie de fonctions que notre première version n'avait pas, est offerte gratuitement le temps de la beta. Les comptes que vous voyez dans ces images sont ceux de mes enfants : de vrais dépôts et de vrais intérêts, versés chaque semaine.",
                    "Le Coffre nació en una posada de la Petite-Nation, para mis dos hijos. Educamos en casa: al enseñarles los frascos, el interés y los objetivos a los 4 y 5 años, vi cómo las matemáticas se instalaban junto con el sentido del dinero. La herramienta tenía que salir de la casa. La versión pública, más completa que nuestra primera versión familiar, se ofrece gratis mientras dure la beta. Las cuentas que ve en estas imágenes son las de mis hijos: depósitos reales e intereses reales, pagados cada semana.",
                  )}
                </p>
                <p className="text-neutral-300 leading-relaxed mt-5">
                  {t(
                    'The only thing we ask: if you meet a bug or dream up a feature, write to us. Every email shapes what comes next.',
                    "La seule chose que nous demandons : si vous croisez un bug ou rêvez d'une nouvelle fonction, écrivez-nous. Chaque courriel façonne la suite.",
                    'Lo único que pedimos: si encuentra un error o imagina una nueva función, escríbanos. Cada correo moldea lo que viene.',
                  )}
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <a href="mailto:alex@lesalondesinconnus.com?subject=Coffre%20%C2%B7%20Bug" className={PILL_SECONDARY}>
                    {t('Report a bug', 'Signaler un bug', 'Reportar un error')}
                  </a>
                  <a href="mailto:alex@lesalondesinconnus.com?subject=Coffre%20%C2%B7%20Id%C3%A9e%20de%20fonction" className={PILL_SECONDARY}>
                    {t('Suggest a feature', 'Proposer une fonction', 'Sugerir una función')}
                  </a>
                  <a href={DL_DONS} target="_blank" rel="noopener noreferrer" className={PILL_SECONDARY}>
                    {t('Give to the project', 'Donner au projet', 'Donar al proyecto')}
                  </a>
                </div>
              </div>
              <GlassFrame src={`${M}wizard.webp`} alt={t('The welcome assistant guiding a new family through the Coffre.', "L'assistant d'accueil qui guide une nouvelle famille dans le Coffre.", 'El asistente de bienvenida que guía a una nueva familia por Le Coffre.')} />
            </div>
            <div className="mt-10 pt-8 border-t border-[#c5a059]/15 flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
              <span>{t('An ad-free experience, presented by', 'Une expérience sans publicité, présentée par', 'Una experiencia sin publicidad, presentada por')}</span>
              <span className="text-[#c5a059] font-semibold">La Petite Monnaie</span>
              <a href={SPONSOR} className="underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">{t('Become a sponsor', 'Devenir commanditaire', 'Convertirse en patrocinador')}</a>
              <a href={DL_DONS} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">
                {t('Support the project', 'Soutenir le projet', 'Apoyar el proyecto')}
              </a>
            </div>
          </div>
        </motion.section>

        {/* 7. SANS RISQUE + FAQ */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-14">
            <div>
              <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">{t('Nothing to lose, everything to learn.', 'Rien à perdre, tout à apprendre.', 'Nada que perder, todo que aprender.')}</h3>
              <p className="text-neutral-300 leading-relaxed">
                {t(
                  'Free, no account, no ads. Your data lives on your device, with one-tap backups. Try the demo: if the Coffre does not win you over, your child will still have played banker for twenty minutes.',
                  "Gratuit, sans compte, sans publicité. Vos données vivent sur votre appareil, avec des sauvegardes en un geste. Essayez la démo : si le Coffre ne vous convainc pas, votre enfant aura quand même joué au banquier vingt minutes.",
                  'Gratis, sin cuenta, sin publicidad. Sus datos viven en su dispositivo, con copias de seguridad en un toque. Pruebe la demo: si Le Coffre no lo convence, su hijo habrá jugado al banquero durante veinte minutos de todas formas.',
                )}
              </p>
            </div>
            <dl className="space-y-7">
              {faq.map(([qEn, aEn, qFr, aFr, qEs, aEs]) => (
                <div key={qEn}>
                  <dt className="font-semibold text-[#e8d5a3] mb-2">{t(qEn, qFr, qEs)}</dt>
                  <dd className="text-neutral-400 leading-relaxed">{t(aEn, aFr, aEs)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.section>

        {/* 7B. MOT DU CRÉATEUR (vidéo, petit lecteur verrouillé) */}
        <motion.section {...reveal()} className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
              <div>
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">
                  {t('A word from the maker', 'Le mot du créateur', 'Unas palabras del creador')}
                </p>
                <h3 className="font-cinzel text-3xl text-[#e8d5a3] mb-5">
                  {t('Two minutes, in person.', 'Deux minutes, en personne.', 'Dos minutos, en persona.')}
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  {t(
                    'Before you try it, let me tell you myself where the Coffre comes from: a homeschooling app for my two children, which the families around us then wanted for their own. I also explain why it belongs to you, with no subscription.',
                    "Avant de vous laisser essayer, je vous raconte moi-même d'où vient Le Coffre : une application d'école à la maison pour mes deux enfants, que les familles autour de nous ont voulu à leur tour. J'y explique aussi pourquoi elle vous appartient, sans abonnement.",
                    'Antes de que la pruebe, le cuento yo mismo de dónde viene Le Coffre: una aplicación de educación en casa para mis dos hijos, que las familias a nuestro alrededor quisieron también. También explico por qué le pertenece, sin suscripción.',
                  )}
                </p>
                <p className="text-xs text-neutral-500 mt-5">
                  {t('2 min 16 · In French · Alex, Le Salon des Inconnus', '2 min 16 · En français · Alex, Le Salon des Inconnus', '2 min 16 · En francés · Alex, Le Salon des Inconnus')}
                </p>
              </div>
              <MakerVideo
                src={`${M}mot-du-createur.mp4`}
                poster={`${M}mot-du-createur.webp`}
                label={t(
                  'Alex, founder of Le Salon des Inconnus, explains where Le Coffre des Inconnus comes from.',
                  "Alex, fondateur du Salon des Inconnus, raconte d'où vient Le Coffre des Inconnus.",
                  'Alex, fundador de Le Salon des Inconnus, cuenta de dónde viene Le Coffre des Inconnus.',
                )}
                playLabel={t('Play the video', 'Lire la vidéo', 'Reproducir el video')}
                pauseLabel={t('Pause the video', 'Mettre la vidéo en pause', 'Pausar el video')}
                muteLabel={t('Mute or unmute', 'Couper ou rétablir le son', 'Silenciar o restablecer el sonido')}
                seekLabel={t('Video position', 'Position dans la vidéo', 'Posición en el video')}
              />
            </div>
          </div>
        </motion.section>

        {/* 8. CTA FINAL */}
        <motion.section id="telecharger" {...reveal()} className="border-t border-white/5 py-24 md:py-32">
          <div className="max-w-4xl mx-auto px-6 rounded-[15px] border border-[#c5a059]/25 bg-black/40 backdrop-blur-md p-10 md:p-16 text-center">
            <h3 className="font-cinzel text-3xl md:text-4xl text-[#e8d5a3] mb-8">
              {t('The next allowance can be the first lesson.', 'La prochaine allocation peut être la première leçon.', 'La próxima mesada puede ser la primera lección.')}
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {demoCta}
              <a href={DL_MAC} className={PILL_SECONDARY}>{t('Download for macOS', 'Télécharger pour macOS', 'Descargar para macOS')}</a>
              <a href={DL_WIN} className={PILL_SECONDARY}>{t('Download for Windows', 'Télécharger pour Windows', 'Descargar para Windows')}</a>
              <a href={DL_MOBILE} target="_blank" rel="noopener noreferrer" className={PILL_SECONDARY}>{t('iPhone, iPad and Android', 'iPhone, iPad et Android', 'iPhone, iPad y Android')}</a>
            </div>
            <p className="text-xs text-neutral-500 mt-7">
              {t('Free public beta · Presented by La Petite Monnaie', 'Beta publique gratuite · Présentée par La Petite Monnaie', 'Beta pública gratuita · Presentada por La Petite Monnaie')}
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
};
