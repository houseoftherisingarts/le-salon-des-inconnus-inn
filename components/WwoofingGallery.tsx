import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Wwoofing gallery — a quiet documentary wall of the community's black-and-white
// photoshoot. Editorial masonry (CSS columns), so every photo keeps its natural
// ratio (no crop, no squish). Site dark ground #050505, muted gold #c5a059,
// home-style slow hover-zoom. Balanced selection: women, crews, hands, fire —
// not only the same person.
// ─────────────────────────────────────────────────────────────────────────────

const GOLD = '#c5a059';
const LINE = 'rgba(197,160,89,0.22)';

const PHOTOS: { src: string; fr: string; en: string }[] = [
  { src: '/wwoof/bw-2.jpg',  fr: "L'équipe au bois", en: 'The crew handling lumber' },
  { src: '/wwoof/bw-5.jpg',  fr: 'Un membre de la communauté', en: 'A member of the community' },
  { src: '/wwoof/bw-3.jpg',  fr: 'Autour du feu, dans les bois', en: 'Around the fire, in the woods' },
  { src: '/wwoof/bw-10.jpg', fr: 'La joie du lieu', en: 'The joy of the place' },
  { src: '/wwoof/bw-4.jpg',  fr: 'Les mains à la tâche', en: 'Hands at work' },
  { src: '/wwoof/bw-8.jpg',  fr: 'Une matinée brumeuse', en: 'A misty morning' },
  { src: '/wwoof/bw-7.jpg',  fr: 'Au travail au jardin', en: 'Working the garden' },
  { src: '/wwoof/bw-11.jpg', fr: 'Un moment partagé', en: 'A shared moment' },
];

export const WwoofingGallery: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  return (
    <section className="wwoof-gallery relative bg-[#050505] px-6 md:px-12 lg:px-20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-10 md:mb-14">
          <span className="h-px w-12" style={{ background: GOLD }} />
          <span className="font-cinzel uppercase" style={{ color: GOLD, fontSize: '11px', letterSpacing: '0.42em' }}>
            {t('Life here', 'La vie ici')}
          </span>
          <span className="h-px flex-1" style={{ background: LINE }} />
        </div>

        <div className="gallery-masonry">
          {PHOTOS.map((p, i) => (
            <figure key={i} className="gallery-item group relative overflow-hidden mb-3 md:mb-4" style={{ boxShadow: `inset 0 0 0 1px ${LINE}` }}>
              <img
                src={p.src}
                alt={t(p.en, p.fr)}
                loading="lazy"
                decoding="async"
                className="w-full block transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
              />
            </figure>
          ))}
        </div>
      </div>

      <style>{`
        .wwoof-gallery .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .gallery-masonry { column-count: 2; column-gap: 1rem; }
        @media (min-width: 768px)  { .gallery-masonry { column-count: 3; column-gap: 1rem; } }
        @media (min-width: 1024px) { .gallery-masonry { column-count: 4; column-gap: 1rem; } }
        .gallery-item { break-inside: avoid; -webkit-column-break-inside: avoid; }
      `}</style>
    </section>
  );
};
