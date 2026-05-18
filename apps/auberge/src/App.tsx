const NEARBY = [
  { name: 'Lac Simon',          distance: '10 min', note: 'plage et baignade' },
  { name: 'Golf Héritage',      distance: '10 min', note: 'Notre-Dame-de-la-Paix' },
  { name: 'Parc Omega',         distance: '15 min', note: 'safari faune' },
  { name: 'Montebello',         distance: '25 min', note: 'Château et restos' },
  { name: 'Mont-Tremblant',     distance: '50 min', note: 'station de ski' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col font-lato">
      <Nav />
      <Hero />
      <Nearby />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="px-6 md:px-12 py-6 flex items-center justify-between border-b border-white/10">
      <a href="/" className="font-cinzel text-[#f3e5ab] text-sm tracking-[0.4em] uppercase">
        L'Auberge Inconnue
      </a>
      <div className="flex gap-6 text-xs uppercase tracking-[0.3em] text-neutral-400">
        <a href="#sejour" className="hover:text-[#f3e5ab] transition-colors">Séjour</a>
        <a href="#alentours" className="hover:text-[#f3e5ab] transition-colors">Alentours</a>
        <a href="https://lesinconnus.com/" className="hover:text-[#f3e5ab] transition-colors">↗ Famille</a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header id="sejour" className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-6">
        Maison Favier · Namur, Outaouais
      </span>
      <h1
        className="font-cinzel uppercase text-[#f3e5ab] leading-[0.9] tracking-tight"
        style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)' }}
      >
        L'Auberge<br />Inconnue
      </h1>
      <p className="font-lato text-neutral-300 max-w-xl mt-8 text-base md:text-lg">
        Au bord du Lac Simon, entre Montebello et Mont-Tremblant.
        Une maison patrimoniale, une table, et le silence qu'il faut.
      </p>
      <a
        href="mailto:reservations@aubergedesinconnus.com"
        className="mt-10 px-8 py-3 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-colors"
      >
        Réserver une chambre
      </a>
    </header>
  );
}

function Nearby() {
  return (
    <section id="alentours" className="px-6 md:px-12 py-20 max-w-5xl mx-auto w-full">
      <h2 className="font-cinzel text-[#f3e5ab] text-2xl uppercase tracking-widest mb-10 text-center">
        À deux pas
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {NEARBY.map((p) => (
          <li
            key={p.name}
            className="flex items-baseline justify-between gap-4 border-b border-white/5 py-3"
          >
            <span className="font-cinzel text-neutral-200 uppercase tracking-widest text-sm">
              {p.name}
            </span>
            <span className="text-neutral-500 text-xs">
              {p.distance} · {p.note}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 md:px-12 py-10 border-t border-white/10 text-neutral-600 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <span>© L'Auberge Inconnue · Namur, QC</span>
      <a href="https://lesinconnus.com/" className="hover:text-[#f3e5ab] transition-colors">
        Une maison de la famille Les Inconnus →
      </a>
    </footer>
  );
}
