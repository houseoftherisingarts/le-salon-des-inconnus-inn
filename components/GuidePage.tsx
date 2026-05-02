
import React, { useEffect, useState, useRef } from 'react';
import { LOCAL_GUIDE_DATA } from '../constants';
import { LocalGuideCategory, LocalGuideItem } from '../types';
import { BlogPostOverlay } from './BlogPostOverlay';
import { getOptimizedUrl } from '../utils/imageOptimizer';

interface GuidePageProps {
  onNavigate: () => void;
  language: 'EN' | 'FR';
}

const CATEGORY_ICONS: Record<string, string> = {
  'coups-de-coeur': '❤',
  summer:  '🌊',
  hiking:  '🏔',
  culture: '🏛',
  food:    '🍽',
  events:  '🎉',
  winter:  '❄',
  spring:  '🌿',
  must:    '⭐',
};

const COUPS_DE_COEUR_ID = 'coups-de-coeur';

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

// Compute element's offsetTop relative to a given ancestor container
const getOffsetTopRelative = (el: HTMLElement, container: HTMLElement): number => {
  let top = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== container) {
    top += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return top;
};

const VipCard: React.FC<{
  item: LocalGuideItem;
  language: 'EN' | 'FR';
  onOpenBlog?: (item: LocalGuideItem) => void;
}> = ({ item, language, onOpenBlog }) => {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = getOptimizedUrl(item.image, 1200);
  // Items with a blogPost go through the in-app overlay (so we can index the
  // editorial review for SEO/GEO); plain items keep the external-link behaviour.
  const hasBlog = !!item.blogPost && !!onOpenBlog;
  const Tag: any = hasBlog ? 'button' : 'a';
  const tagProps: any = hasBlog
    ? { type: 'button', onClick: () => onOpenBlog!(item) }
    : { href: item.link ?? '#', target: item.link ? '_blank' : '_self', rel: 'noopener noreferrer' };

  return (
    <Tag
      {...tagProps}
      className="group relative w-full rounded-2xl overflow-hidden flex flex-col md:flex-row bg-[#14130f] border border-[#c5a059]/25 hover:border-[#c5a059]/60 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(197,160,89,0.12)] mb-8 min-h-[240px] md:min-h-[300px] text-left"
    >
      {/* Image — full left side on desktop, top on mobile */}
      <div className="relative w-full md:w-[55%] h-56 md:h-auto flex-shrink-0 overflow-hidden">
        {!imgError ? (
          <img
            src={proxyUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl opacity-10 bg-[#0f0f0f]">⭐</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#14130f]/80 hidden md:block pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14130f]/80 to-transparent md:hidden pointer-events-none" />
        {/* VIP crown badge */}
        <span className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-[#c5a059] text-[#1e1e24] font-josefin text-[10px] font-bold uppercase tracking-[0.25em] rounded-full shadow-lg">
          ★ {language === 'EN' ? 'Top Pick' : 'Coup de Cœur'}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center p-6 md:p-8 flex-grow">
        <span className="font-josefin text-[#c5a059] text-[10px] uppercase tracking-[0.35em] mb-2">{item.tag}</span>
        <h3 className="font-prata text-[#f3e5ab] text-2xl md:text-3xl leading-tight mb-2">{item.title}</h3>
        <div className="flex items-center gap-1 text-neutral-500 text-[11px] font-josefin uppercase tracking-wider mb-4">
          <MapPinIcon />
          <span>{item.location}</span>
        </div>
        <p className="text-neutral-300 text-sm md:text-base leading-relaxed font-lato max-w-xl">{item.description}</p>
        {(item.link || hasBlog) && (
          <span className="mt-5 inline-flex items-center gap-2 text-[#c5a059] group-hover:text-[#f3e5ab] font-josefin text-[11px] uppercase tracking-widest transition-colors">
            <span>{hasBlog ? (language === 'EN' ? 'Read' : 'Lire') : (language === 'EN' ? 'Visit' : 'Visiter')}</span>
            <ExternalLinkIcon />
          </span>
        )}
      </div>
    </Tag>
  );
};

const GuideItemCard: React.FC<{
  item: LocalGuideItem;
  language: 'EN' | 'FR';
  onOpenBlog?: (item: LocalGuideItem) => void;
}> = ({ item, language, onOpenBlog }) => {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = getOptimizedUrl(item.image, 600);
  const hasBlog = !!item.blogPost && !!onOpenBlog;

  // Whole card is clickable when there's a blog post — opens the overlay.
  // Otherwise the existing "Visit" footer link still goes external.
  const handleClick = hasBlog ? () => onOpenBlog!(item) : undefined;

  return (
    <div
      onClick={handleClick}
      role={hasBlog ? 'button' : undefined}
      tabIndex={hasBlog ? 0 : undefined}
      onKeyDown={hasBlog ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenBlog!(item); } } : undefined}
      className={`group relative bg-[#18181b] border border-white/8 rounded-2xl overflow-hidden flex flex-col transition-all duration-400 hover:border-[#c5a059]/60 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]${hasBlog ? ' cursor-pointer' : ''}`}
    >

      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-[#0f0f0f] flex-shrink-0">
        {!imgError ? (
          <img
            src={proxyUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
            {CATEGORY_ICONS['must']}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Tag */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm text-[#c5a059] font-josefin text-[10px] uppercase tracking-[0.2em] border border-[#c5a059]/30 rounded-full">
          {item.tag}
        </span>

        {/* Favourite heart */}
        {item.isFavorite && (
          <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#c5a059] flex items-center justify-center shadow-lg text-[#1e1e24] text-sm font-bold leading-none">
            ♥
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-4">
        <h3 className="font-prata text-[#f3e5ab] text-base leading-snug mb-1.5">{item.title}</h3>
        <div className="flex items-center gap-1 text-neutral-500 text-[11px] font-josefin uppercase tracking-wider mb-3">
          <MapPinIcon />
          <span>{item.location}</span>
        </div>
        <p className="text-neutral-400 text-sm leading-relaxed font-lato flex-grow guide-line-clamp">
          {item.description}
        </p>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[#c5a059] hover:text-[#f3e5ab] font-josefin text-[11px] uppercase tracking-widest transition-colors group/link"
          >
            <span>{language === 'EN' ? 'Visit' : 'Visiter'}</span>
            <span className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5">
              <ExternalLinkIcon />
            </span>
          </a>
        )}
      </div>
    </div>
  );
};

export const GuidePage: React.FC<GuidePageProps> = ({ onNavigate, language }) => {
  // Default landing view = "coups de coeur". Other categories appear only
  // after the user clicks one in the menu.
  const [activeCategory, setActiveCategory] = useState<string>(COUPS_DE_COEUR_ID);
  // The scrollable container ref — all scroll operations target this element
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Build a virtual "Coups de coeur" category from items flagged isFavorite
  // OR isVip across the real categories. Order is preserved by category.
  const coupsDeCoeurCategory: LocalGuideCategory = {
    id: COUPS_DE_COEUR_ID,
    title_fr: 'Nos coups de coeur',
    title_en: 'Our favourites',
    description_fr: 'Le meilleur de chaque catégorie, choisi à la main.',
    description_en: 'The best of each category, hand-picked.',
    items: LOCAL_GUIDE_DATA.flatMap((c) => c.items.filter((i) => i.isFavorite || i.isVip)),
  };

  // Menu = coups de coeur first, then the real categories.
  const menuCategories: LocalGuideCategory[] = [coupsDeCoeurCategory, ...LOCAL_GUIDE_DATA];

  // The single category that's actually rendered. We never show all of them
  // at once — switching categories swaps the section in place.
  const visibleCategory =
    menuCategories.find((c) => c.id === activeCategory) ?? coupsDeCoeurCategory;

  // ── Blog overlay state ──────────────────────────────────────────────────
  // Active item drives the overlay; URL is kept in sync via history.pushState
  // so each post has its own /guide/<slug> address (good for sharing + SEO).
  const [activeBlog, setActiveBlog] = useState<LocalGuideItem | null>(null);
  const allItems = LOCAL_GUIDE_DATA.flatMap((c) => c.items);
  const findItem = (slug: string) => allItems.find((it) => it.id === slug && it.blogPost) || null;

  const openBlog = (item: LocalGuideItem) => {
    if (!item.blogPost) return;
    setActiveBlog(item);
    // Push the deep URL so the back button + sharing both work.
    if (typeof window !== 'undefined') {
      const target = `/guide/${item.id}`;
      if (window.location.pathname !== target) {
        window.history.pushState({ guideBlog: item.id }, '', target);
      }
    }
  };
  const closeBlog = () => {
    setActiveBlog(null);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/guide/')) {
      // Restore the bare /guide URL without re-triggering popstate.
      window.history.replaceState({}, '', '/guide');
    }
  };

  // On mount, if URL is /guide/<slug>, open the matching blog. Listen for
  // popstate (browser back/forward) to keep state in sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      const m = window.location.pathname.match(/^\/guide\/([a-z0-9-]+)$/i);
      if (m) {
        const item = findItem(m[1]);
        if (item) { setActiveBlog(item); return; }
      }
      setActiveBlog(null);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to top on mount (container, not window)
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, []);

  // Switch category: set state, scroll the page back to the section start,
  // and scroll the menu pill into view horizontally on mobile.
  const selectCategory = (id: string) => {
    setActiveCategory(id);
    const container = containerRef.current;
    const sectionEl = sectionRefs.current[id];
    if (container) {
      // Scroll just below the sticky nav so the section header is visible.
      const top = sectionEl ? getOffsetTopRelative(sectionEl, container) - 110 : 0;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    const pill = navRef.current?.querySelector(`[data-cat="${id}"]`) as HTMLElement | null;
    pill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-[#0e0e0e] text-white font-sans guide-scrollbar"
    >

      {/* Fixed header — position:fixed is relative to viewport, sits above the container */}
      <header className="fixed top-0 w-full z-[60] bg-[#0e0e0e]/92 backdrop-blur-md border-b border-[#c5a059]/15">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onNavigate}
            className="flex items-center gap-2 text-neutral-400 hover:text-[#c5a059] transition-colors font-josefin text-xs uppercase tracking-widest"
          >
            <span>←</span>
            <span className="hidden md:inline">{language === 'EN' ? "Return to Inn" : "Retour à l'Auberge"}</span>
            <span className="md:hidden">{language === 'EN' ? 'Return' : 'Retour'}</span>
          </button>
          <span className="font-prata text-[#f3e5ab] text-sm tracking-widest">
            {language === 'EN' ? 'Local Guide' : 'Guide Local'}
          </span>
          <div className="w-20 hidden md:block" />
        </div>
      </header>

      {/* Hero — push below the fixed header */}
      <div className="relative h-[45vh] min-h-[300px] mt-14 flex items-end overflow-hidden">
        <img
          src={getOptimizedUrl("https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg", 1400)}
          alt="Petite-Nation"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-10 w-full">
          <span className="font-josefin text-[#c5a059] text-xs uppercase tracking-[0.4em] block mb-2">
            Petite-Nation · Outaouais
          </span>
          <h1 className="font-prata text-4xl md:text-6xl text-white leading-tight drop-shadow-xl">
            {language === 'EN' ? 'Local Guide' : 'Guide Local'}
          </h1>
          <p className="font-lato text-neutral-300 mt-3 max-w-xl text-sm md:text-base leading-relaxed">
            {language === 'EN'
              ? 'From Lac Simon to Montebello — our hand-picked places worth discovering.'
              : 'Du Lac Simon à Montebello — nos lieux choisis qui valent le détour.'}
          </p>
        </div>
      </div>

      {/* Sticky category nav — sticky relative to the scrollable container */}
      <div className="sticky top-14 z-40 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/5">
        <div
          ref={navRef}
          className="max-w-7xl mx-auto px-4 flex gap-2 py-3 overflow-x-auto guide-scrollbar-hide"
        >
          {menuCategories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => selectCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full font-josefin text-[11px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-[#c5a059] text-[#1e1e24] font-bold shadow-md'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/8'
              }`}
            >
              <span>{CATEGORY_ICONS[cat.id] ?? '📍'}</span>
              <span>{language === 'EN' ? cat.title_en : cat.title_fr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Guide Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-20">

        {(() => {
          const cat = visibleCategory;
          const title       = language === 'EN' ? cat.title_en : cat.title_fr;
          const description = language === 'EN' ? cat.description_en : cat.description_fr;
          // In Coups de coeur, the first VIP-flagged item still gets the
          // hero treatment; other VIPs from sibling categories drop into the
          // grid so the section doesn't feel like a wall of headers.
          const vipItem = cat.id === COUPS_DE_COEUR_ID
            ? cat.items.find(i => i.isVip) ?? null
            : cat.items.find(i => i.isVip) ?? null;
          const gridItems = cat.items.filter(i => i !== vipItem);

          return (
            <section
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
              id={`cat-${cat.id}`}
            >
              {/* Section header */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-3xl select-none">{CATEGORY_ICONS[cat.id] ?? '📍'}</span>
                <div className="flex-grow">
                  <h2 className="font-prata text-2xl md:text-3xl text-[#f3e5ab]">{title}</h2>
                  {description && (
                    <p className="text-neutral-500 font-josefin text-xs uppercase tracking-widest mt-0.5">{description}</p>
                  )}
                </div>
              </div>

              {/* VIP featured card — full width */}
              {vipItem && <VipCard item={vipItem} language={language} onOpenBlog={openBlog} />}

              {/* Regular cards grid */}
              {gridItems.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5${vipItem ? ' mt-5' : ''}`}>
                  {gridItems.map((item: LocalGuideItem) => (
                    <GuideItemCard key={item.id} item={item} language={language} onOpenBlog={openBlog} />
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* Business listing CTA */}
        <section className="border-t border-white/8 pt-16 pb-12 text-center">
          <div className="max-w-lg mx-auto">
            <span className="font-josefin text-[#c5a059] text-xs uppercase tracking-[0.4em] block mb-4">
              {language === 'EN' ? 'Business owners' : 'Propriétaires'}
            </span>
            <h3 className="font-prata text-2xl text-[#f3e5ab] mb-4">
              {language === 'EN' ? 'Want to be featured?' : 'Vous souhaitez être référencé ?'}
            </h3>
            <p className="text-neutral-500 font-lato text-sm leading-relaxed mb-8">
              {language === 'EN'
                ? "Running a local business or experience in the Petite-Nation area? Get in touch to appear in this guide."
                : "Vous tenez un commerce ou une expérience locale dans la Petite-Nation ? Contactez-nous pour figurer dans ce guide."}
            </p>
            <a
              href="tel:5144183450"
              className="inline-flex items-center gap-3 px-8 py-3 border border-[#c5a059]/50 text-[#f3e5ab] rounded-full hover:bg-[#c5a059] hover:text-[#1e1e24] hover:border-[#c5a059] transition-all duration-300 font-josefin uppercase tracking-widest text-xs font-bold"
            >
              <PhoneIcon />
              514 418 3450
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .font-prata   { font-family: 'Prata', serif; }
        .font-josefin { font-family: 'Josefin Sans', sans-serif; }
        .font-lato    { font-family: 'Lato', sans-serif; }
        .guide-scrollbar::-webkit-scrollbar { width: 5px; }
        .guide-scrollbar::-webkit-scrollbar-track { background: #0e0e0e; }
        .guide-scrollbar::-webkit-scrollbar-thumb { background: #c5a059; border-radius: 3px; }
        .guide-scrollbar-hide::-webkit-scrollbar { display: none; }
        .guide-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .guide-line-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .border-white\\/8 { border-color: rgba(255,255,255,0.08); }
      `}</style>

      {/* Blog overlay — mounted once, animates in when activeBlog is set */}
      <BlogPostOverlay item={activeBlog} language={language} onClose={closeBlog} />
    </div>
  );
};
