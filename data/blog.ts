// Blog des chroniques — shared model for the public pages (/blog), the admin
// approval queue (AdminCRM · Blog) and the morning-writer script
// (scripts/blog-post.mjs). Posts live in Firestore `blogPosts`; nothing is
// ever published without Alex flipping status → 'published' in the admin.

export const BLOG_CATEGORIES = [
  { slug: 'finances',    label_fr: 'Finances',             label_en: 'Finances' },
  { slug: 'voyages',     label_fr: 'Voyages et rencontres', label_en: 'Travels & encounters' },
  { slug: 'art',         label_fr: 'Art',                  label_en: 'Art' },
  { slug: 'auberge',     label_fr: "L'Auberge",            label_en: 'The Inn' },
  { slug: 'philosophie', label_fr: 'Philosophie',          label_en: 'Philosophy' },
] as const;

export type BlogCategory = typeof BLOG_CATEGORIES[number]['slug'];

export type BlogStatus = 'pending' | 'published' | 'hidden';

export interface BlogPost {
  /** Firestore doc id (stable, never shown). */
  id: string;
  /** URL slug — /blog/{slug}. Editable in the admin; keep unique. */
  slug: string;
  category: BlogCategory;
  title_fr: string;
  title_en: string;
  excerpt_fr: string;
  excerpt_en: string;
  /** Markdown-lite body: blank-line paragraphs, ## / ### headings, - lists,
   *  > quotes, **bold**. Rendered by components/blog/BlogBody.tsx. */
  body_fr: string;
  body_en: string;
  status: BlogStatus;
  author: 'claude' | 'alex';
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
  publishedAt?: { seconds: number } | null;
}

export const categoryLabel = (slug: string, fr: boolean): string => {
  const c = BLOG_CATEGORIES.find(c => c.slug === slug);
  if (!c) return slug;
  return fr ? c.label_fr : c.label_en;
};

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const formatPostDate = (ts: { seconds: number } | null | undefined, fr: boolean): string => {
  if (!ts?.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  const month = fr ? MONTHS_FR[d.getMonth()] : MONTHS_EN[d.getMonth()];
  return fr ? `${d.getDate()} ${month} ${d.getFullYear()}` : `${month} ${d.getDate()}, ${d.getFullYear()}`;
};

/** Reading time from the FR body, ~200 words a minute, floor 1. */
export const readingMinutes = (body: string): number =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));
