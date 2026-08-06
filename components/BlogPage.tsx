import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { BLOG_CATEGORIES, BlogPost, categoryLabel, formatPostDate, readingMinutes } from '../data/blog';
import { BlogBody } from './blog/BlogBody';
import { SITE_URL } from '../config/seo.config';

// Public chronicles at /blog (index) and /blog/{slug} (article). Only posts
// with status 'published' ever reach this page: everything is written as a
// pending draft and approved by Alex in AdminCRM · Blog. Same warm-dark
// atmosphere as the rest of the house, editorial full-width composition.

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';

const slugFromPath = (): string | null => {
  const m = /^\/blog\/([a-z0-9-]+)\/?$/.exec(window.location.pathname);
  return m ? m[1] : null;
};

export const BlogPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [slug, setSlug] = useState<string | null>(() => slugFromPath());
  const [cat, setCat] = useState<'all' | string>('all');

  // Admin-only draft preview: /blog?preview={slug} renders a pending post on
  // the real page. Firestore rules only let admins read non-published posts,
  // so for everyone else the fetch fails silently and nothing shows.
  const [preview, setPreview] = useState<BlogPost | null>(null);
  useEffect(() => {
    const previewSlug = new URLSearchParams(window.location.search).get('preview');
    if (!previewSlug || !db) return;
    let cancelled = false;
    const fetchPreview = () => {
      getDocs(query(collection(db!, 'blogPosts'), where('slug', '==', previewSlug), limit(1)))
        .then(snap => { if (!cancelled && !snap.empty) setPreview({ ...(snap.docs[0].data() as BlogPost), id: snap.docs[0].id }); })
        .catch(() => { /* not an admin: preview stays private */ });
    };
    // Wait for the restored auth state before querying, otherwise the request
    // leaves anonymously and the rules (rightly) refuse the draft.
    if (auth) {
      const unsub = onAuthStateChanged(auth, () => { unsub(); if (!cancelled) fetchPreview(); });
      return () => { cancelled = true; unsub(); };
    }
    fetchPreview();
    return () => { cancelled = true; };
  }, []);

  // Published posts, newest first. Sorted client-side so first launch needs
  // no composite index.
  useEffect(() => {
    if (!db) { setPosts([]); return; }
    getDocs(query(collection(db, 'blogPosts'), where('status', '==', 'published')))
      .then(snap => {
        const rows: BlogPost[] = [];
        snap.forEach(d => rows.push({ ...(d.data() as BlogPost), id: d.id }));
        rows.sort((a, b) => (b.publishedAt?.seconds ?? 0) - (a.publishedAt?.seconds ?? 0));
        setPosts(rows);
      })
      .catch(() => setPosts([]));
  }, []);

  // Keep the slug in sync with browser back / forward inside /blog.
  useEffect(() => {
    const onPop = () => { if (window.location.pathname.startsWith('/blog')) setSlug(slugFromPath()); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goto = (nextSlug: string | null) => {
    const path = nextSlug ? `/blog/${nextSlug}` : '/blog';
    if (window.location.pathname !== path) history.pushState({ view: 'BLOG' }, '', path);
    setSlug(nextSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const active = useMemo(
    () => (slug && posts ? posts.find(p => p.slug === slug) ?? null : null) ?? preview,
    [slug, posts, preview],
  );

  // Per-article document title + canonical-ish JSON-LD in a dedicated block.
  useEffect(() => {
    if (active) {
      document.title = `${fr ? active.title_fr : active.title_en} | Le Salon des Inconnus`;
    }
    let script = document.getElementById('blog-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'blog-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    const org = { '@type': 'Organization', name: 'Le Salon des Inconnus', url: SITE_URL };
    const asPosting = (p: BlogPost) => ({
      '@type': 'BlogPosting',
      headline: fr ? p.title_fr : p.title_en,
      description: fr ? p.excerpt_fr : p.excerpt_en,
      datePublished: p.publishedAt?.seconds ? new Date(p.publishedAt.seconds * 1000).toISOString().slice(0, 10) : undefined,
      inLanguage: fr ? 'fr' : 'en',
      author: org,
      publisher: org,
      url: `${SITE_URL}/blog/${p.slug}`,
      mainEntityOfPage: `${SITE_URL}/blog/${p.slug}`,
    });
    script.textContent = JSON.stringify(
      active
        ? { '@context': 'https://schema.org', ...asPosting(active) }
        : {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: fr ? 'Chroniques du Salon des Inconnus' : 'Chronicles of Le Salon des Inconnus',
            url: `${SITE_URL}/blog`,
            inLanguage: fr ? 'fr' : 'en',
            author: org,
            publisher: org,
            blogPost: (posts ?? []).map(asPosting),
          },
    );
    return () => { document.getElementById('blog-jsonld')?.remove(); };
  }, [active, posts, fr]);

  const filtered = useMemo(
    () => (posts ?? []).filter(p => cat === 'all' || p.category === cat),
    [posts, cat],
  );
  const [latest, ...older] = filtered;

  const countFor = (c: string) => (posts ?? []).filter(p => p.category === c).length;

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0a0808' }}>
      {/* Atmosphere: warm near-black, drifting gold haze, grain, the house recipe. */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div
          className="absolute inset-0 will-change-transform"
          style={{ background: 'radial-gradient(48% 38% at 50% 18%, rgba(201,168,90,0.10), transparent 72%)', animation: 'blogDrift 48s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>
      <style>{`
        @keyframes blogDrift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,2%,0) scale(1.05); }
        }
      `}</style>

      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#0a0808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => (active ? goto(null) : onNavigate('INN'))}
            className="text-[#c5a059] hover:text-[#f3e5ab] transition-colors text-sm font-cinzel uppercase tracking-widest"
          >
            ← {active ? t('All chronicles', 'Toutes les chroniques') : t('Back to the Inn', "Retour à l'Auberge")}
          </button>
          <span className="font-cinzel text-sm text-[#c5a059] tracking-[0.4em] hidden md:block">
            {t('CHRONICLES', 'CHRONIQUES')}
          </span>
        </div>
      </header>

      {/* ────────────────────────── ARTICLE ────────────────────────── */}
      {active ? (
        <main className="pt-28 md:pt-36 pb-24">
          {active.status !== 'published' && (
            <div className="px-6 md:px-12 lg:px-20 pb-6">
              <p className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-amber-400/40 text-amber-200 font-cinzel uppercase" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
                {t('Draft preview, visible only to you', 'Aperçu du brouillon, visible seulement par vous')}
              </p>
            </div>
          )}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="px-6 md:px-12 lg:px-20 pb-10 md:pb-14"
          >
            <div className="flex items-center gap-4 mb-6">
              <span className="h-px w-12 bg-[#c5a059]" />
              <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                {categoryLabel(active.category, fr)}
              </span>
            </div>
            <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)', lineHeight: 1.02, letterSpacing: '-0.02em', maxWidth: '22ch' }}>
              {fr ? active.title_fr : active.title_en}
            </h1>
            <p className="font-lato mt-7 text-white/70" style={{ fontSize: 'clamp(1.1rem, 1.7vw, 1.35rem)', lineHeight: 1.6, maxWidth: '52ch' }}>
              {fr ? active.excerpt_fr : active.excerpt_en}
            </p>
          </motion.section>

          <section className="px-6 md:px-12 lg:px-20 py-10 md:py-14 border-t border-[#c5a059]/15">
            <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
              <aside className="hidden lg:block">
                <div className="sticky top-28 space-y-5">
                  <div>
                    <p className="font-cinzel uppercase text-white/40" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>{t('Published', 'Publié le')}</p>
                    <p className="font-lato text-white/75 text-sm mt-1.5">{formatPostDate(active.publishedAt, fr)}</p>
                  </div>
                  <div>
                    <p className="font-cinzel uppercase text-white/40" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>{t('Reading', 'Lecture')}</p>
                    <p className="font-lato text-white/75 text-sm mt-1.5">
                      {readingMinutes(fr ? active.body_fr : active.body_en)} {t('min', 'min')}
                    </p>
                  </div>
                  <span className="block h-px w-10 bg-[#c5a059]/40" />
                  <button
                    onClick={() => goto(null)}
                    className="font-cinzel uppercase text-[#c5a059] hover:text-[#f3e5ab] transition-colors"
                    style={{ fontSize: '10px', letterSpacing: '0.3em' }}
                  >
                    ← {t('All chronicles', 'Toutes les chroniques')}
                  </button>
                </div>
              </aside>
              <motion.article
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}
              >
                <p className="lg:hidden font-cinzel uppercase text-white/40 mb-8" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
                  {formatPostDate(active.publishedAt, fr)}
                </p>
                <BlogBody body={fr ? active.body_fr : active.body_en} />
              </motion.article>
            </div>
          </section>

          {/* Previous / next */}
          {(posts ?? []).length > 1 && (
            <nav className="px-6 md:px-12 lg:px-20 pt-10 border-t border-[#c5a059]/15 grid gap-8 md:grid-cols-2">
              {(() => {
                const all = posts ?? [];
                const i = all.findIndex(p => p.id === active.id);
                const newer = i > 0 ? all[i - 1] : null;
                const olderPost = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
                const cell = (p: BlogPost | null, labelEn: string, labelFr: string, right?: boolean) => (
                  <div className={right ? 'md:text-right' : ''}>
                    {p && (
                      <button onClick={() => goto(p.slug)} className="group text-left md:text-inherit">
                        <span className="font-cinzel uppercase text-white/40 block" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
                          {t(labelEn, labelFr)}
                        </span>
                        <span className="font-prata text-white/85 group-hover:text-[#f3e5ab] transition-colors block mt-2 text-lg md:text-xl">
                          {fr ? p.title_fr : p.title_en}
                        </span>
                      </button>
                    )}
                  </div>
                );
                return (
                  <>
                    {cell(newer, 'More recent', 'Plus récente')}
                    {cell(olderPost, 'Earlier', 'Plus ancienne', true)}
                  </>
                );
              })()}
            </nav>
          )}
        </main>
      ) : (
        /* ────────────────────────── INDEX ────────────────────────── */
        <main className="pt-28 md:pt-36 pb-24">
          <section className="px-6 md:px-12 lg:px-20 pb-10 md:pb-14 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="h-px w-12 bg-[#c5a059]" />
                <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>
                  {t("The inn's notebook", "Le carnet de l'auberge")}
                </span>
              </div>
              <h1 className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5.5rem)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
                {t('Chronicles', 'Chroniques')}
              </h1>
            </div>
            <p className="font-lato text-white/65 lg:pb-2" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)', lineHeight: 1.65, maxWidth: '46ch' }}>
              {t(
                'What we learn by keeping the inn: the craft of stability, the road and its travellers, the studio, and the quiet of the morning.',
                "Ce que nous apprenons en tenant l'auberge : le métier de la stabilité, la route et ses voyageurs, l'atelier, et le calme du matin.",
              )}
            </p>
          </section>

          {/* Category filter */}
          {(posts ?? []).length > 0 && (
            <section className="px-6 md:px-12 lg:px-20 pb-10 flex flex-wrap gap-2">
              {[{ slug: 'all', label_fr: 'Tout', label_en: 'All' }, ...BLOG_CATEGORIES].map(c => {
                const activeChip = cat === c.slug;
                const n = c.slug === 'all' ? (posts ?? []).length : countFor(c.slug);
                if (c.slug !== 'all' && n === 0) return null;
                return (
                  <button
                    key={c.slug}
                    onClick={() => setCat(c.slug)}
                    className={`px-4 py-2 rounded-full border font-cinzel uppercase transition-colors ${activeChip ? 'border-[#c5a059]/70 text-[#f3e5ab] bg-[#c5a059]/10' : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'}`}
                    style={{ fontSize: '10px', letterSpacing: '0.3em' }}
                  >
                    {fr ? c.label_fr : c.label_en}
                    <span className="ml-2 opacity-60 tabular-nums">{n}</span>
                  </button>
                );
              })}
            </section>
          )}

          {/* Loading */}
          {posts === null && (
            <section className="px-6 md:px-12 lg:px-20 py-16">
              <p className="font-cinzel uppercase text-white/35" style={{ fontSize: '11px', letterSpacing: '0.35em' }}>
                {t('Opening the notebook…', 'Le carnet s’ouvre…')}
              </p>
            </section>
          )}

          {/* Empty state — before the first approved chronicle */}
          {posts !== null && (posts ?? []).length === 0 && (
            <section className="px-6 md:px-12 lg:px-20 py-16 border-t border-[#c5a059]/15">
              <p className="font-prata text-[#f3e5ab]" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', lineHeight: 1.2, maxWidth: '28ch' }}>
                {t('The first chronicles are being written by the fire.', 'Les premières chroniques s’écrivent en ce moment, près du feu.')}
              </p>
              <p className="font-lato text-white/60 mt-5" style={{ fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '52ch' }}>
                {t('Come back soon: the door stays open.', 'Revenez bientôt : la porte reste ouverte.')}
              </p>
            </section>
          )}

          {/* Latest chronicle, full-width band */}
          {latest && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="px-6 md:px-12 lg:px-20 py-12 md:py-16 border-y border-[#c5a059]/15"
            >
              <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
                <div>
                  <p className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
                    {categoryLabel(latest.category, fr)}
                  </p>
                  <p className="font-lato text-white/45 text-sm mt-2">{formatPostDate(latest.publishedAt, fr)}</p>
                </div>
                <div>
                  <button onClick={() => goto(latest.slug)} className="group text-left">
                    <h2 className="font-prata text-[#f3e5ab] group-hover:text-white transition-colors" style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3.2rem)', lineHeight: 1.05, maxWidth: '24ch' }}>
                      {fr ? latest.title_fr : latest.title_en}
                    </h2>
                  </button>
                  <p className="font-lato mt-6 text-white/70" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)', lineHeight: 1.7, maxWidth: '62ch' }}>
                    {fr ? latest.excerpt_fr : latest.excerpt_en}
                  </p>
                  <button
                    onClick={() => goto(latest.slug)}
                    className="mt-7 inline-flex items-center gap-3 font-cinzel uppercase text-[#c5a059] hover:text-[#f3e5ab] transition-colors"
                    style={{ fontSize: '11px', letterSpacing: '0.35em' }}
                  >
                    {t('Read the chronicle', 'Lire la chronique')} <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* Older chronicles, editorial rows */}
          {older.length > 0 && (
            <section className="px-6 md:px-12 lg:px-20 pt-12 md:pt-16">
              <span className="font-cinzel uppercase text-white/40 block mb-2" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
                {t('Earlier', 'Précédemment')}
              </span>
              {older.map((p, i) => (
                <motion.article
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: Math.min(i, 4) * 0.05 }}
                  className="border-t border-[#c5a059]/12 py-8 md:py-10 grid gap-4 md:grid-cols-[220px_1fr]"
                >
                  <div>
                    <p className="font-cinzel uppercase text-[#c5a059]/85" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
                      {categoryLabel(p.category, fr)}
                    </p>
                    <p className="font-lato text-white/40 text-sm mt-2">{formatPostDate(p.publishedAt, fr)}</p>
                  </div>
                  <div>
                    <button onClick={() => goto(p.slug)} className="group text-left">
                      <h3 className="font-prata text-white/85 group-hover:text-[#f3e5ab] transition-colors" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', lineHeight: 1.15, maxWidth: '30ch' }}>
                        {fr ? p.title_fr : p.title_en}
                      </h3>
                    </button>
                    <p className="font-lato mt-4 text-white/55" style={{ fontSize: '1rem', lineHeight: 1.7, maxWidth: '62ch' }}>
                      {fr ? p.excerpt_fr : p.excerpt_en}
                    </p>
                  </div>
                </motion.article>
              ))}
            </section>
          )}
        </main>
      )}
    </div>
  );
};
