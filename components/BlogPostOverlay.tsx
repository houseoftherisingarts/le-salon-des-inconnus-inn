import React, { useEffect, useRef, useState } from 'react';
import type { LocalGuideItem } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// BlogPostOverlay — opens when a guide card is clicked.
//
// UX:
//   1. Card flips (3D rotateY) and expands into a near-fullscreen reading panel.
//   2. URL pushes to /guide/<slug> via history.pushState. Browser back closes.
//   3. Top of article: "Visiter le site →" external link in a new tab.
//   4. ESC + the X button + clicking outside the panel all close it.
//
// SEO/GEO surface (only while open):
//   - document.title set to "<Article title> · Le Salon des Inconnus"
//   - meta[name="description"] set to the intro
//   - link[rel="canonical"] set to the per-slug URL
//   - JSON-LD Article + LocalBusiness/TouristAttraction schema injected
//   - All cleaned up on close.
//
// The component is mounted at the page level (parent owns the active item).
// Pass `null` to close, or a guide item to open.
// ─────────────────────────────────────────────────────────────────────────────

interface BlogPostOverlayProps {
  item: LocalGuideItem | null;
  language: 'EN' | 'FR';
  onClose: () => void;
}

const SITE_URL = 'https://www.lesalondesinconnus.com';
const BRAND = 'Le Salon des Inconnus';

export const BlogPostOverlay: React.FC<BlogPostOverlayProps> = ({ item, language, onClose }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC closes the overlay; back button (popstate) too.
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onPop = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, onClose]);

  // Inject SEO/GEO metadata + JSON-LD; clean up on close.
  useEffect(() => {
    if (!item || !item.blogPost) return;
    const post = item.blogPost;
    const title = `${item.title} · ${BRAND}`;
    const description = (language === 'FR' ? post.intro_fr : post.intro_en).slice(0, 200);
    const url = `${SITE_URL}/guide/${item.id}`;

    // Save originals so we can restore on close
    const prevTitle = document.title;
    document.title = title;

    const ensureMeta = (name: string, value: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      const created = !el;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      const prev = el.content;
      el.content = value;
      return () => {
        if (created) el!.remove();
        else el!.content = prev;
      };
    };
    const restoreDesc = ensureMeta('description', description);
    const restoreOgTitle = ensureMeta('og:title', title, 'property');
    const restoreOgDesc = ensureMeta('og:description', description, 'property');
    const restoreOgUrl = ensureMeta('og:url', url, 'property');
    const restoreOgImage = ensureMeta('og:image', item.image, 'property');

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const canonicalCreated = !canonical;
    const canonicalPrev = canonical?.href ?? '';
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // JSON-LD: Article (always) + the typed LocalBusiness/TouristAttraction (when schema present)
    const articleLd: any = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': item.title,
      'description': description,
      'image': item.image,
      'mainEntityOfPage': url,
      'publisher': {
        '@type': 'Organization',
        'name': BRAND,
        'url': SITE_URL,
      },
      'inLanguage': language === 'FR' ? 'fr-CA' : 'en-CA',
    };
    const businessLd: any = post.schema?.type
      ? {
          '@context': 'https://schema.org',
          '@type': post.schema.type,
          'name': item.title,
          'image': item.image,
          'url': item.link || url,
          ...(post.schema.address ? {
            'address': { '@type': 'PostalAddress', 'streetAddress': post.schema.address }
          } : {}),
          ...(post.schema.phone ? { 'telephone': post.schema.phone } : {}),
          ...(post.schema.lat && post.schema.lng ? {
            'geo': { '@type': 'GeoCoordinates', 'latitude': post.schema.lat, 'longitude': post.schema.lng }
          } : {}),
          ...(post.schema.openingHours ? { 'openingHours': post.schema.openingHours } : {}),
          ...(post.schema.priceRange ? { 'priceRange': post.schema.priceRange } : {}),
        }
      : null;
    const faqLd: any = (post.faqs && post.faqs.length > 0)
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': post.faqs.map(f => ({
            '@type': 'Question',
            'name': language === 'FR' ? f.q_fr : f.q_en,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': language === 'FR' ? f.a_fr : f.a_en,
            },
          })),
        }
      : null;

    const ldScripts: HTMLScriptElement[] = [];
    [articleLd, businessLd, faqLd].filter(Boolean).forEach((ld) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.guideBlog = item.id;
      s.text = JSON.stringify(ld);
      document.head.appendChild(s);
      ldScripts.push(s);
    });

    return () => {
      document.title = prevTitle;
      restoreDesc(); restoreOgTitle(); restoreOgDesc(); restoreOgUrl(); restoreOgImage();
      if (canonicalCreated) canonical!.remove();
      else if (canonical) canonical.href = canonicalPrev;
      ldScripts.forEach(s => s.remove());
    };
  }, [item, language]);

  if (!item || !item.blogPost) return null;

  const post = item.blogPost;
  const intro = language === 'FR' ? post.intro_fr : post.intro_en;

  return (
    <div
      ref={dialogRef}
      className="blogpost-overlay fixed inset-0 z-[80] flex items-stretch justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      {/* Backdrop — clicking dismisses */}
      <button
        type="button"
        aria-label={t('Close', 'Fermer')}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(2,2,2,0.78)', backdropFilter: 'blur(8px)' }}
      />

      {/* Article surface — flips in from card, then settles */}
      <article
        className="blogpost-article relative w-full max-w-3xl mx-auto bg-[#0a0807] text-white overflow-y-auto"
        style={{
          border: '1px solid rgba(197,160,89,0.3)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
        }}
        // Schema.org Article microdata as a fallback for crawlers that don't parse JSON-LD
        itemScope
        itemType="https://schema.org/Article"
      >
        {/* Cover image as the article's hero — semantic + visual */}
        <header className="relative h-[42vh] min-h-[280px] overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            itemProp="image"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(8,6,4,0.45) 0%, rgba(8,6,4,0.15) 30%, rgba(8,6,4,0.7) 78%, #0a0807 100%)',
            }}
          />
          {/* Close button — fixed-position so always reachable */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close', 'Fermer')}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-[#f3e5ab] hover:bg-black/60 transition-colors"
            style={{
              background: 'rgba(8,6,4,0.7)',
              border: '1px solid rgba(197,160,89,0.3)',
              backdropFilter: 'blur(8px)',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
          {/* Title block at bottom of cover */}
          <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-10">
            <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block mb-2">
              {item.tag} · {item.location}
            </span>
            <h1
              className="font-prata uppercase text-[#f3e5ab] leading-[0.9] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(1.6rem, 4.5vw, 2.8rem)', textShadow: '0 4px 24px rgba(0,0,0,0.7)' }}
              itemProp="headline"
            >
              {item.title}
            </h1>
            {post._draft && (
              <span className="inline-block mt-3 self-start px-2 py-0.5 rounded-full font-cinzel text-[8px] uppercase tracking-[0.4em] text-amber-300 bg-amber-900/40 border border-amber-700/50">
                {t('Draft', 'Brouillon')}
              </span>
            )}
          </div>
        </header>

        {/* Top CTA — visit the external site */}
        {item.link && (
          <div className="px-6 md:px-10 pt-6 pb-2">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full font-cinzel text-[#1a1208] text-[10px] uppercase tracking-[0.4em] transition-transform hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(180deg, #f3e5ab 0%, #c5a059 100%)',
                boxShadow: '0 4px 16px rgba(197,160,89,0.4)',
              }}
            >
              {t('Visit the website', 'Visiter le site')} →
            </a>
          </div>
        )}

        {/* Body */}
        <div className="px-6 md:px-10 py-6 md:py-8 space-y-8">
          <p
            className="font-lato text-neutral-200 text-base md:text-lg leading-relaxed first-letter:font-prata first-letter:text-[#d4af37] first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85]"
            itemProp="description"
          >
            {intro}
          </p>

          {post.sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-prata uppercase text-[#f3e5ab] tracking-[-0.005em] mb-3" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.5rem)' }}>
                {language === 'FR' ? s.title_fr : s.title_en}
              </h2>
              <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed whitespace-pre-line">
                {language === 'FR' ? s.body_fr : s.body_en}
              </p>
            </section>
          ))}

          {/* FAQ — semantic + GEO-friendly */}
          {post.faqs && post.faqs.length > 0 && (
            <section>
              <h2 className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-4">
                {t('Frequent questions', 'Questions fréquentes')}
              </h2>
              <dl className="space-y-4">
                {post.faqs.map((f, i) => (
                  <div key={i} className="border-l-2 border-[#c5a059]/30 pl-4">
                    <dt className="font-prata uppercase text-[#f3e5ab] text-sm mb-1.5">
                      {language === 'FR' ? f.q_fr : f.q_en}
                    </dt>
                    <dd className="font-lato text-neutral-300 text-sm leading-relaxed">
                      {language === 'FR' ? f.a_fr : f.a_en}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Practical info derived from schema */}
          {post.schema && (post.schema.address || post.schema.phone || post.schema.openingHours) && (
            <section
              className="border-t border-[#c5a059]/15 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm"
              itemProp="location"
              itemScope
              itemType="https://schema.org/PostalAddress"
            >
              {post.schema.address && (
                <div>
                  <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.4em] mb-1">
                    {t('Address', 'Adresse')}
                  </p>
                  <p className="font-lato text-neutral-200" itemProp="streetAddress">{post.schema.address}</p>
                </div>
              )}
              {post.schema.phone && (
                <div>
                  <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.4em] mb-1">
                    {t('Phone', 'Téléphone')}
                  </p>
                  <a className="font-lato text-neutral-200 hover:text-[#f3e5ab]" href={`tel:${post.schema.phone}`} itemProp="telephone">
                    {post.schema.phone}
                  </a>
                </div>
              )}
              {post.schema.openingHours && (
                <div>
                  <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.4em] mb-1">
                    {t('Hours', 'Heures')}
                  </p>
                  <p className="font-lato text-neutral-200">{post.schema.openingHours}</p>
                </div>
              )}
            </section>
          )}

          {/* Footer */}
          <footer className="border-t border-[#c5a059]/15 pt-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em] hover:text-[#f3e5ab] transition-colors"
              >
                {t('Visit the website', 'Visiter le site')} →
              </a>
            ) : <span />}
            <button
              onClick={onClose}
              className="font-cinzel text-neutral-500 text-[10px] uppercase tracking-[0.4em] hover:text-[#f3e5ab] transition-colors"
            >
              ← {t('Back to the guide', 'Retour au guide')}
            </button>
          </footer>
        </div>
      </article>

      {/* Card-flip entrance + reduced-motion fallback */}
      <style>{`
        .blogpost-article {
          transform-origin: center center;
          animation: blogFlipIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          backface-visibility: hidden;
        }
        @keyframes blogFlipIn {
          0%   { opacity: 0; transform: perspective(1200px) rotateY(-12deg) scale(0.94); }
          100% { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1);     }
        }
        @media (prefers-reduced-motion: reduce) {
          .blogpost-article { animation: none !important; }
        }
      `}</style>
    </div>
  );
};
