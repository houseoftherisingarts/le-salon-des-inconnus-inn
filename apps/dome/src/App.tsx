import { Suspense, lazy } from 'react';
import { CHARTE, VERSION_CHARTE } from './charte';
import { Atmosphere, Eyebrow, Reveal } from './motion';

// Firebase ne se charge qu'avec la section candidature, la landing reste légère
const Apply = lazy(() => import('./Apply'));

export default function App() {
  return (
    <div className="min-h-screen flex flex-col font-lato overflow-x-clip">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Pacte />
        <Voies />
        <Sieges />
        <Charte />
        <Candidature />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-40 px-6 md:px-12 py-4 flex items-center justify-between border-b border-white/10 bg-[#0a0808]/70 backdrop-blur-md">
      <a href="#" className="font-cinzel text-[#f3e5ab] text-sm tracking-[0.4em] uppercase">
        Le Dôme
      </a>
      <div className="hidden md:flex items-center gap-8">
        {[
          ['Le pacte', '#pacte'],
          ['Les voies', '#voies'],
          ['La charte', '#charte'],
        ].map(([label, href]) => (
          <a key={href} href={href} className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 hover:text-[#f3e5ab] transition-colors">
            {label}
          </a>
        ))}
        <a
          href="#candidature"
          className="px-5 py-2 rounded-[15px] border border-[#c5a059]/60 text-[#f3e5ab] text-[11px] uppercase tracking-[0.3em] hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all"
        >
          Candidature
        </a>
      </div>
      <a
        href="#candidature"
        className="md:hidden px-4 py-2 rounded-[15px] border border-[#c5a059]/60 text-[#f3e5ab] text-[10px] uppercase tracking-[0.25em]"
      >
        Candidature
      </a>
    </nav>
  );
}

// Le centre du hero : le dôme lui-même, dessiné en arcs d'or qui respirent.
function DomeArc() {
  return (
    <svg
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[160vw] md:w-[110vw] max-w-[1500px] breathe pointer-events-none"
      viewBox="0 0 1200 620"
      fill="none"
    >
      <defs>
        <linearGradient id="gold" x1="0" y1="620" x2="0" y2="0">
          <stop offset="0" stopColor="#c5a059" stopOpacity="0.05" />
          <stop offset="0.65" stopColor="#c5a059" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f3e5ab" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)" stroke="url(#gold)" strokeWidth="1.5">
        <path d="M40 620 A560 560 0 0 1 1160 620" />
        <path d="M180 620 A420 420 0 0 1 1020 620" strokeOpacity="0.7" />
        <path d="M320 620 A280 280 0 0 1 880 620" strokeOpacity="0.5" />
        <path d="M460 620 A140 140 0 0 1 740 620" strokeOpacity="0.35" />
        <path d="M600 60 L600 620" strokeOpacity="0.4" />
        <path d="M600 60 L215 620 M600 60 L985 620" strokeOpacity="0.25" />
        <path d="M600 60 L400 620 M600 60 L800 620" strokeOpacity="0.18" />
      </g>
      <circle cx="600" cy="60" r="4" fill="#f3e5ab" filter="url(#glow)" />
    </svg>
  );
}

function Hero() {
  return (
    <header className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden pt-24">
      <Atmosphere light="50% 8%" strength={1} />
      <DomeArc />

      <div className="relative z-10 px-6 md:px-12 lg:px-20 pb-14 md:pb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-10">
        <div className="in max-w-2xl">
          <div>
            <span className="block w-10 h-px bg-[#c5a059] mb-4" />
            <span className="font-cinzel text-[#c5a059] text-[10px] md:text-[11px] uppercase tracking-[0.5em]">
              Coopérative de solidarité · Maison Favier, Namur
            </span>
          </div>
          <h1
            className="font-prata text-[#f3e5ab] leading-[1.02] mt-6"
            style={{ fontSize: 'clamp(2.6rem, 7vw, 5.6rem)' }}
          >
            Dix places sous le dôme.
          </h1>
          <p className="font-lato text-neutral-300 text-base md:text-lg leading-relaxed mt-6 max-w-xl">
            La coopérative loue les jardins, la boutique, le café et les salles de soins
            du domaine. Dix dollars par mois. Ce que tu crées et ce que tu vends
            restent à toi, en entier.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-9">
            <a
              href="#candidature"
              className="px-8 py-4 rounded-[15px] bg-[#f3e5ab] text-[#0a0808] font-cinzel text-[12px] uppercase tracking-[0.3em] hover:bg-[#c5a059] transition-colors"
            >
              Déposer ma candidature
            </a>
            <a
              href="#charte"
              className="px-8 py-4 rounded-[15px] border border-white/15 text-neutral-300 font-cinzel text-[12px] uppercase tracking-[0.3em] hover:border-[#c5a059]/60 hover:text-[#f3e5ab] transition-all"
            >
              Lire la charte
            </a>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-1 text-right">
          <span className="font-prata text-[#f3e5ab] text-5xl">10</span>
          <span className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-400">places, pas une de plus</span>
        </div>
      </div>

      <div className="relative z-10 pb-6 flex justify-center">
        <span className="cue font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500">Défiler</span>
      </div>
    </header>
  );
}

function Pacte() {
  const stats = [
    { index: '01', valeur: '10 $', label: 'par mois, ta seule contribution', note: 'La cotisation couvre le loyer que la coopérative verse au domaine.' },
    { index: '02', valeur: '10', label: 'membres, une voix chacun', note: 'Un cercle assez petit pour que chaque voix compte vraiment.' },
    { index: '03', valeur: '100 %', label: 'de tes ventes dans tes poches', note: 'Aucune commission. Ce qui sort de tes mains t’appartient.' },
  ];
  return (
    <section id="pacte" className="relative py-24 md:py-32 border-t border-white/5">
      <Atmosphere light="72% 20%" strength={0.7} />
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <Eyebrow>Le pacte</Eyebrow>
              <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl mt-5 max-w-xl leading-tight">
                Simple comme une poignée de main.
              </h2>
            </div>
            <p className="font-lato text-neutral-400 text-sm md:text-base max-w-sm leading-relaxed">
              La coopérative tient le bail des espaces communs du domaine.
              Les membres les font vivre et en récoltent le fruit.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map((s, i) => (
            <Reveal key={s.index} delay={i * 0.1}>
              <div className="rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15 p-8 h-full hover:border-[#c5a059]/40 transition-colors">
                <span className="font-cinzel text-[#c5a059] text-[11px] tracking-[0.3em]">{s.index}</span>
                <p className="font-prata text-[#f3e5ab] text-5xl md:text-6xl mt-4">{s.valeur}</p>
                <p className="font-cinzel text-[11px] uppercase tracking-[0.25em] text-neutral-300 mt-3">{s.label}</p>
                <p className="font-lato text-sm text-neutral-400 leading-relaxed mt-4">{s.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const VOIES = [
  {
    titre: 'Cultiver la terre',
    texte: 'Les jardins et les terres cultivables du domaine sont à la disposition des membres. Sème, entretiens, récolte : la terre attend des mains.',
    icone: (
      <path d="M12 21V11m0 0c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6Zm0-2c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6Z" />
    ),
  },
  {
    titre: 'Vendre à la boutique',
    texte: 'Deux ailes sous un même toit : le comptoir d’artisanat pour tes récoltes, savons et créations, et l’aile des arts pour tes œuvres.',
    icone: (
      <path d="M4 9l1.5-4h13L20 9M4 9h16M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M9 13h6" />
    ),
  },
  {
    titre: 'Tenir le café',
    texte: 'Des quarts à temps partiel derrière le comptoir du café. Un revenu, un rythme, et le pouls du lieu entre les mains.',
    icone: (
      <path d="M4 8h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8Zm12 1h2.5a2 2 0 010 4H16M7 4.5c.6-.8.6-1.4 0-2m4 2c.6-.8.6-1.4 0-2" />
    ),
  },
  {
    titre: 'Offrir des soins',
    texte: 'Des salles de massage prêtes à recevoir ta pratique. Tu amènes ton art du soin, le domaine amène le calme.',
    icone: (
      <path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0112 7.6 3.8 3.8 0 0119 10.5C19 15.5 12 20 12 20Z" />
    ),
  },
];

function Voies() {
  return (
    <section id="voies" className="relative py-24 md:py-32 border-t border-white/5">
      <Atmosphere light="25% 15%" strength={0.7} />
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <Reveal>
          <Eyebrow>Les voies</Eyebrow>
          <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl mt-5 mb-14 max-w-2xl leading-tight">
            Quatre façons d'habiter le domaine.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {VOIES.map((v, i) => (
            <Reveal key={v.titre} delay={(i % 2) * 0.12}>
              <div className={`rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15 p-8 h-full group hover:border-[#c5a059]/40 transition-colors ${i % 2 === 1 ? 'sm:mt-8' : ''}`}>
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/5 mb-6 group-hover:border-[#c5a059]/70 transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {v.icone}
                  </svg>
                </span>
                <h3 className="font-cinzel text-[#f3e5ab] text-sm uppercase tracking-[0.25em] mb-3">{v.titre}</h3>
                <p className="font-lato text-sm text-neutral-400 leading-relaxed">{v.texte}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sieges() {
  return (
    <section className="relative py-24 md:py-32 border-t border-white/5">
      <Atmosphere light="50% 30%" strength={0.8} />
      <div className="relative z-10 px-6 md:px-12 lg:px-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <Eyebrow>Le cercle</Eyebrow>
          <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl mt-5 leading-tight">
            Dix sièges, une table.
          </h2>
          <p className="font-lato text-neutral-400 text-sm md:text-base leading-relaxed mt-6 max-w-md">
            Chaque membre a une voix. Les décisions se prennent ensemble, et un conseil
            d'administration formé de membres volontaires veille sur la maison commune.
            Tu peux te porter volontaire dès ta candidature.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15 p-10 flex flex-col items-center">
            <svg viewBox="0 0 300 160" className="w-full max-w-[320px]" fill="none" aria-hidden>
              <path d="M20 150 A130 130 0 0 1 280 150" stroke="#c5a059" strokeOpacity="0.35" strokeWidth="1" />
              {Array.from({ length: 10 }).map((_, i) => {
                const a = Math.PI - (Math.PI * i) / 9;
                const x = 150 + 130 * Math.cos(a);
                const y = 150 - 130 * Math.sin(a);
                return <circle key={i} cx={x} cy={y} r="6" fill={i < 10 ? '#c5a059' : 'none'} fillOpacity={0.25 + (i % 3) * 0.2} stroke="#f3e5ab" strokeOpacity="0.7" strokeWidth="1" />;
              })}
            </svg>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-400 mt-6">
              Les dix sièges du cercle
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Charte() {
  return (
    <section id="charte" className="relative py-24 md:py-32 border-t border-white/5">
      <Atmosphere light="78% 12%" strength={0.7} />
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <Eyebrow>La charte</Eyebrow>
              <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl mt-5 leading-tight">
                Sept articles, rien de caché.
              </h2>
            </div>
            <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500">{VERSION_CHARTE}</span>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-5xl">
          {CHARTE.map((a, i) => (
            <Reveal key={a.numero} delay={(i % 2) * 0.08}>
              <details className="group border-b border-white/10 py-5">
                <summary className="flex items-baseline gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-cinzel text-[#c5a059] text-sm">{a.numero}</span>
                  <span className="font-cinzel text-[13px] uppercase tracking-[0.25em] text-neutral-200 group-hover:text-[#f3e5ab] transition-colors flex-1">
                    {a.titre}
                  </span>
                  <span className="text-[#c5a059] transition-transform group-open:rotate-45 font-lato text-lg leading-none">+</span>
                </summary>
                <p className="font-lato text-sm text-neutral-400 leading-relaxed mt-4 pl-9">{a.texte}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Candidature() {
  const etapes = [
    { n: '01', t: 'Ton profil', d: 'Avec Google ou ton courriel.' },
    { n: '02', t: 'La charte', d: 'Toute la documentation, avant de t’engager.' },
    { n: '03', t: 'Ta candidature', d: 'Tes voies, tes mots, ta place au conseil si tu la veux.' },
  ];
  return (
    <section id="candidature" className="relative py-24 md:py-32 border-t border-white/5">
      <Atmosphere light="30% 10%" strength={0.9} />
      <div className="relative z-10 px-6 md:px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-[1fr,1.2fr] gap-12 lg:gap-20 items-start">
        <Reveal>
          <Eyebrow>La candidature</Eyebrow>
          <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl mt-5 leading-tight">
            On choisit dix personnes. Dis-nous pourquoi toi.
          </h2>
          <p className="font-lato text-neutral-400 text-sm md:text-base leading-relaxed mt-6 max-w-md">
            Trois étapes, cinq minutes. Chaque candidature est lue par le cercle.
          </p>
          <ol className="mt-10 space-y-6">
            {etapes.map((e) => (
              <li key={e.n} className="flex items-start gap-5">
                <span className="font-cinzel text-[#c5a059] text-sm pt-0.5">{e.n}</span>
                <div>
                  <p className="font-cinzel text-[12px] uppercase tracking-[0.25em] text-neutral-200">{e.t}</p>
                  <p className="font-lato text-sm text-neutral-500 mt-1">{e.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.15}>
          <Suspense
            fallback={
              <div className="rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15 p-10 text-center font-cinzel text-[11px] uppercase tracking-[0.4em] text-neutral-500">
                Un instant
              </div>
            }
          >
            <Apply />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative px-6 md:px-12 lg:px-20 py-12 border-t border-white/10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div>
          <p className="font-cinzel text-[#f3e5ab] text-sm tracking-[0.4em] uppercase">Le Dôme des Inconnus</p>
          <p className="font-lato text-neutral-500 text-sm mt-3 max-w-sm leading-relaxed">
            Maison Favier, Namur, QC. La salle de spectacle et la programmation arrivent bientôt sous le même toit.
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-2 text-sm">
          <a href="https://lesinconnus.com/" className="text-neutral-400 hover:text-[#f3e5ab] transition-colors">
            Famille Les Inconnus →
          </a>
          <a href="mailto:alex@lesalondesinconnus.com" className="text-neutral-500 hover:text-[#f3e5ab] transition-colors">
            alex@lesalondesinconnus.com
          </a>
          <span className="text-neutral-600 text-xs mt-2">© Le Dôme des Inconnus · Namur, QC</span>
        </div>
      </div>
    </footer>
  );
}
