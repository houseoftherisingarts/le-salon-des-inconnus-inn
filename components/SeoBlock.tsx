import React, { useState } from 'react';
import { SEO_CONTENT, type SeoViewKey, type SeoLink } from '../config/seo.content';

// VIEW_PATHS lives in App.tsx; we duplicate the small subset we need here so
// SeoBlock can render anchor hrefs (real <a> tags, crawlable) and still call
// the SPA navigator on click for real visitors.
const VIEW_PATHS: Record<SeoViewKey, string> = {
  INN: '/',
  WWOOFING: '/wwoofing',
  EVENTS: '/evenements',
  CEILIDH: '/ceilidh',
  MASSOTHERAPY: '/massage',
  KITCHEN: '/cuisine',
  HOSTS: '/about',
  GUIDE: '/guide',
  PETITE_MONNAIE: '/petite-monnaie',
  COMMUNITY: '/communaute',
};

// SEO viewKey set as a runtime guard. Anything not in this list is treated as
// an external URL (rendered with rel=noopener and target=_blank).
const SEO_VIEW_KEYS = new Set<string>(Object.keys(VIEW_PATHS));

function isInternal(to: string): to is SeoViewKey {
  return SEO_VIEW_KEYS.has(to);
}

interface Props {
  viewKey: SeoViewKey;
  language: 'EN' | 'FR';
  /**
   * Optional navigator. When omitted, SeoBlock dispatches a `salon:navigate`
   * CustomEvent on window which App.tsx listens for. This decouples the block
   * from each page's varying onNavigate prop signature.
   */
  onNavigate?: (view: string) => void;
  /** Extra classes for the wrapper section. */
  className?: string;
}

/**
 * SeoBlock — descriptive editorial section rendered near the bottom of key
 * pages. Contributes to AEO (substantial body text, h1/h2 hierarchy, internal
 * + external links, FAQ accordion + FAQPage JSON-LD). The visible H1 here is
 * sr-only so it does not disrupt existing visual hero treatments — it's still
 * picked up by crawlers and screen readers.
 *
 * Visual treatment matches the site palette (font-cinzel + font-prata + the
 * gold/cream tokens) so it reads as part of the design rather than an
 * appended SEO blob.
 */
export const SeoBlock: React.FC<Props> = ({ viewKey, language, onNavigate, className = '' }) => {
  const content = SEO_CONTENT[viewKey][language];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const navigate = (view: SeoViewKey) => {
    if (onNavigate) {
      onNavigate(view);
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salon:navigate', { detail: { view } }));
    }
  };

  const renderLink = (link: SeoLink, key: number) => {
    if (isInternal(link.to)) {
      const to = link.to;
      const path = VIEW_PATHS[to];
      return (
        <a
          key={key}
          href={path}
          onClick={(e) => {
            e.preventDefault();
            navigate(to);
          }}
          className="text-[#f3e5ab] underline decoration-[#c5a059]/40 hover:decoration-[#f3e5ab] underline-offset-4 transition-colors"
        >
          {link.label}
        </a>
      );
    }
    return (
      <a
        key={key}
        href={link.to}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#f3e5ab] underline decoration-[#c5a059]/40 hover:decoration-[#f3e5ab] underline-offset-4 transition-colors"
      >
        {link.label}
      </a>
    );
  };

  const internalT = language === 'FR' ? 'Sur ce site' : 'On this site';
  const externalT = language === 'FR' ? 'En savoir plus' : 'Learn more';
  const faqT = language === 'FR' ? 'Foire aux questions' : 'Frequently asked questions';

  return (
    <section
      className={`relative bg-[#050505] border-t border-[#c5a059]/15 px-6 md:px-12 lg:px-24 py-20 md:py-28 ${className}`}
      aria-labelledby={`seo-h1-${viewKey}`}
    >
      {/* Visually hidden descriptive H1 — helps crawlers understand what the
          page IS without disturbing the existing visual hero. */}
      <h1 id={`seo-h1-${viewKey}`} className="sr-only">
        {content.h1}
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        <div className="lg:sticky lg:top-24 self-start">
        {/* Kicker + section title (visible H2) */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px w-10 bg-[#c5a059]" aria-hidden />
          <span className="font-cinzel text-[10px] md:text-xs text-[#c5a059] uppercase tracking-[0.5em]">
            {content.kicker}
          </span>
        </div>
        <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-5xl leading-[1.05] tracking-[-0.01em] mb-10">
          {content.sectionTitle}
        </h2>
        </div>
        <div className="min-w-0">

        {/* Body paragraphs — the substance for AEO */}
        <div className="space-y-6 font-lato text-neutral-300 text-[15px] md:text-base leading-[1.85]">
          {content.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* Internal links — at least 3 in-body contextual links */}
        {content.internalLinks.length > 0 && (
          <div className="mt-12">
            <h3 className="font-cinzel text-[10px] md:text-xs text-[#c5a059] uppercase tracking-[0.4em] mb-4">
              {internalT}
            </h3>
            <ul className="space-y-2.5 font-lato text-[15px] md:text-base text-neutral-300 leading-[1.7]">
              {content.internalLinks.map((link, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="text-[#c5a059]/60" aria-hidden>·</span>
                  <span>
                    {renderLink(link, i)}
                    {link.hint && (
                      <span className="text-neutral-500 italic"> · {link.hint}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* External citations — at least 2 credible references */}
        {content.externalLinks.length > 0 && (
          <div className="mt-10">
            <h3 className="font-cinzel text-[10px] md:text-xs text-[#c5a059] uppercase tracking-[0.4em] mb-4">
              {externalT}
            </h3>
            <ul className="space-y-2.5 font-lato text-[15px] md:text-base text-neutral-300 leading-[1.7]">
              {content.externalLinks.map((link, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="text-[#c5a059]/60" aria-hidden>·</span>
                  <span>{renderLink(link, i)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQ accordion — also serialised as FAQPage JSON-LD by App.tsx */}
        {content.faq.length > 0 && (
          <div className="mt-14">
            <h3 className="font-cinzel text-[10px] md:text-xs text-[#c5a059] uppercase tracking-[0.4em] mb-6">
              {faqT}
            </h3>
            <ul className="divide-y divide-[#c5a059]/15 border-y border-[#c5a059]/15">
              {content.faq.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full text-left py-5 flex items-baseline justify-between gap-6 group"
                    >
                      <span className="font-prata text-[#f3e5ab] text-lg md:text-xl leading-snug group-hover:opacity-90 transition-opacity">
                        {item.q}
                      </span>
                      <span
                        className={`font-cinzel text-[#c5a059] text-xl shrink-0 transition-transform ${isOpen ? 'rotate-45' : ''}`}
                        aria-hidden
                      >
                        +
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-6 -mt-2 font-lato text-neutral-300 text-[15px] leading-[1.85] max-w-[60ch]">
                        {item.a}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        </div>
      </div>
    </section>
  );
};

export default SeoBlock;
