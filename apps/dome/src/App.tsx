export default function App() {
  return (
    <div className="min-h-screen flex flex-col font-lato">
      <Nav />
      <Hero />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="px-6 md:px-12 py-6 flex items-center justify-between border-b border-white/10">
      <a href="/" className="font-cinzel text-[#f3e5ab] text-sm tracking-[0.4em] uppercase">
        Le Dôme
      </a>
      <a
        href="https://lesinconnus.com/"
        className="text-xs uppercase tracking-[0.3em] text-neutral-400 hover:text-[#f3e5ab] transition-colors"
      >
        ↗ Famille
      </a>
    </nav>
  );
}

function Hero() {
  return (
    <header className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-6">
        Maison Favier · Namur, QC
      </span>
      <h1
        className="font-cinzel uppercase text-[#f3e5ab] leading-[0.9] tracking-tight"
        style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)' }}
      >
        Le Dôme<br />des Inconnus
      </h1>
      <p className="font-lato text-neutral-300 max-w-xl mt-8 text-base md:text-lg">
        Salle de spectacle et plateforme de programmation. Bientôt.
      </p>
      <span className="mt-10 inline-block font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">
        Lancement prochain
      </span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="px-6 md:px-12 py-10 border-t border-white/10 text-neutral-600 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <span>© Le Dôme des Inconnus · Namur, QC</span>
      <a href="https://lesinconnus.com/" className="hover:text-[#f3e5ab] transition-colors">
        Famille Les Inconnus →
      </a>
    </footer>
  );
}
