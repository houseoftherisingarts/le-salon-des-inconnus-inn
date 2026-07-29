/**
 * blog-post.mjs — drop ONE blog draft into Firestore `blogPosts`, ALWAYS with
 * status 'pending'. Publication is a human act: Alex approves in AdminCRM ·
 * Blog. This script cannot publish, by design.
 *
 * Used by the morning writer job (com.alex.blog-matinal) and by hand:
 *     node scripts/blog-post.mjs path/to/draft.json [--dry-run]
 *
 * Draft JSON shape (all fields required):
 *   {
 *     "slug": "comment-une-auberge-se-tient-debout",
 *     "category": "finances" | "voyages" | "art" | "auberge" | "philosophie",
 *     "title_fr": "...", "title_en": "...",
 *     "excerpt_fr": "...", "excerpt_en": "...",
 *     "body_fr": "markdown-lite", "body_en": "markdown-lite"
 *   }
 *
 * CREDENTIALS: same as seed-roster.mjs — Application Default Credentials or
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/key.json
 * (the morning job exports the service-account key from ~/.claude/keys/).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const DRY_RUN = process.argv.includes('--dry-run');
const draftPath = process.argv.slice(2).find(a => !a.startsWith('--'));

const CATEGORIES = ['finances', 'voyages', 'art', 'auberge', 'philosophie'];
const FIELDS = ['slug', 'category', 'title_fr', 'title_en', 'excerpt_fr', 'excerpt_en', 'body_fr', 'body_en'];

if (!draftPath) {
  console.error('\n  Usage: node scripts/blog-post.mjs path/to/draft.json [--dry-run]\n');
  process.exit(1);
}

let draft;
try {
  draft = JSON.parse(readFileSync(draftPath, 'utf8'));
} catch (e) {
  console.error(`\n  Could not read/parse ${draftPath}: ${e.message}\n`);
  process.exit(1);
}

const errors = [];
for (const f of FIELDS) {
  if (typeof draft[f] !== 'string' || !draft[f].trim()) errors.push(`missing or empty "${f}"`);
}
if (draft.slug && !/^[a-z0-9-]{3,60}$/.test(draft.slug)) errors.push(`bad slug "${draft.slug}" (a-z, 0-9, hyphens)`);
if (draft.category && !CATEGORIES.includes(draft.category)) errors.push(`unknown category "${draft.category}"`);
for (const f of ['title_fr', 'title_en', 'excerpt_fr', 'excerpt_en', 'body_fr', 'body_en']) {
  if (typeof draft[f] === 'string' && draft[f].includes('—')) errors.push(`"${f}" contains an em dash — banned by the house style`);
}
if (errors.length) {
  console.error(`\n  Draft validation FAILED:\n${errors.map(e => `    • ${e}`).join('\n')}\n`);
  process.exit(1);
}

const words = draft.body_fr.split(/\s+/).filter(Boolean).length;
console.log(`\n  Draft OK — [${draft.category}] « ${draft.title_fr} » (${words} mots FR, slug ${draft.slug})`);

if (DRY_RUN) {
  console.log('  DRY RUN — nothing written. Would upsert blogPosts/{auto} with status "pending".\n');
  process.exit(0);
}

function loadAdmin() {
  const reqHere = createRequire(import.meta.url);
  try { return reqHere('firebase-admin'); } catch { /* not at root */ }
  try {
    const reqFns = createRequire(pathToFileURL(join(ROOT, 'functions', 'package.json')).href);
    return reqFns('firebase-admin');
  } catch { return null; }
}

const admin = loadAdmin();
if (!admin) {
  console.error('\n  firebase-admin not found. Run (cd functions && npm install) first.\n');
  process.exit(1);
}

let projectId = 'le-salon-des-inconnus';
try {
  const rc = JSON.parse(readFileSync(join(ROOT, '.firebaserc'), 'utf8'));
  projectId = rc?.projects?.default ?? projectId;
} catch { /* default */ }

try {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
} catch (e) {
  console.error('\n  No usable Google credentials. Set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth application-default login.\n');
  process.exit(1);
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// Refuse a slug that already exists (published or not): each chronicle is new.
const clash = await db.collection('blogPosts').where('slug', '==', draft.slug).limit(1).get();
if (!clash.empty) {
  console.error(`\n  A post with slug "${draft.slug}" already exists (${clash.docs[0].id}). Pick another slug.\n`);
  process.exit(1);
}

const ref = db.collection('blogPosts').doc();
await ref.set({
  id: ref.id,
  slug: draft.slug,
  category: draft.category,
  title_fr: draft.title_fr, title_en: draft.title_en,
  excerpt_fr: draft.excerpt_fr, excerpt_en: draft.excerpt_en,
  body_fr: draft.body_fr, body_en: draft.body_en,
  status: 'pending',            // ALWAYS pending — publishing is Alex's gesture
  author: 'claude',
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  publishedAt: null,
});

console.log(`  ✓ Draft dropped as blogPosts/${ref.id} (status: pending).`);
console.log('  Alex approves it at https://www.lesalondesinconnus.com/admin → Maison → Blog · Chroniques.\n');
