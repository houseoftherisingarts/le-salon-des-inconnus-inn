/**
 * seed-roster.mjs — preload the 27 curated artists as real accounts and sync
 * them to the public roster.
 *
 * WHAT IT DOES (per artist, idempotent):
 *   1. Creates a Firebase Auth user (email + password + displayName) if one
 *      does not already exist for that email.
 *   2. Writes members/{uid}                      → { name, createdAt, preloaded:true }
 *   3. Writes members/{uid}/artistProfile/profile → the roster fields, plus
 *      onboardingV1Completed:true so the seeded artist skips the Welcome wizard.
 *      NOTE: doc id is `profile` (the canonical Creator Studio doc), not `main`.
 *   4. Writes members/{uid}/admin/flags           → { isArtist:true, onPublicRoster:true } (merge)
 *   5. Writes publicRoster/{uid}                   → the public-safe copy the /arts page reads
 *
 * HOW TO RUN
 *   Dry run (validates the seed file + prints the plan, touches NOTHING):
 *       node scripts/seed-roster.mjs --dry-run
 *
 *   Real run (creates users + writes Firestore):
 *       node scripts/seed-roster.mjs
 *
 * CREDENTIALS (real run only — dry run needs none)
 *   The script uses firebase-admin, which needs Google credentials. Pick ONE:
 *     A) Application Default Credentials (simplest for a local run):
 *          gcloud auth application-default login
 *     B) A service-account key file:
 *          export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/key.json"
 *        (Firebase Console → Project settings → Service accounts → Generate new
 *         private key.)
 *   If neither is available the script fails with clear instructions instead of
 *   a cryptic stack trace.
 *
 * DATA SOURCE
 *   Reads scripts/seed-roster-data.json (generated from
 *   packages/ui/src/arts/roster.ts, with per-artist email + strong password
 *   baked in). That file is gitignored — passwords never reach git.
 *
 * AVATARS
 *   avatarUrl values are seeded straight from roster.ts as-is (the current
 *   Unsplash placeholders). Real artist photos are being gathered now and will
 *   be updated in a later pass — re-running this script is safe and will not
 *   duplicate anything.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const SEED_PATH = join(__dirname, 'seed-roster-data.json');

const DRY_RUN = process.argv.includes('--dry-run');
const VALID_CATEGORIES = ['MUSIC', 'VISUAL', 'DIGITAL', 'SCULPTURE'];

// ── Load + validate the seed file ───────────────────────────────────────────
function loadSeed() {
  let raw;
  try {
    raw = readFileSync(SEED_PATH, 'utf8');
  } catch (e) {
    console.error(`\n  Could not read seed file: ${SEED_PATH}`);
    console.error('  Generate it from packages/ui/src/arts/roster.ts first.\n');
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`\n  Seed file is not valid JSON: ${e.message}\n`);
    process.exit(1);
  }
}

function validate(entries) {
  const errors = [];
  if (!Array.isArray(entries) || entries.length === 0) {
    errors.push('Seed file is empty or not an array.');
    return errors;
  }
  const emails = new Set();
  entries.forEach((a, i) => {
    const tag = `#${String(i + 1).padStart(2)} (${a?.name ?? 'unnamed'})`;
    if (!a || typeof a !== 'object') { errors.push(`${tag}: not an object`); return; }
    if (!a.name || typeof a.name !== 'string') errors.push(`${tag}: missing name`);
    if (!a.email || !/^[^@\s]+@lesalondesinconnus\.com$/.test(a.email)) {
      errors.push(`${tag}: bad email "${a.email}"`);
    } else {
      if (emails.has(a.email)) errors.push(`${tag}: duplicate email ${a.email}`);
      emails.add(a.email);
    }
    if (!a.password || typeof a.password !== 'string' || a.password.length < 12) {
      errors.push(`${tag}: weak or missing password`);
    }
    if (!VALID_CATEGORIES.includes(a.category)) errors.push(`${tag}: unknown category "${a.category}"`);
    if (!a.avatarUrl) errors.push(`${tag}: missing avatarUrl`);
    if (!a.stats || typeof a.stats.creativity !== 'number') errors.push(`${tag}: missing stats`);
  });
  return errors;
}

// ── The public-safe / profile field copy (shared by both docs) ──────────────
function profileFields(a) {
  return {
    name: a.name,
    class: a.class ?? '',
    category: a.category ?? '',
    avatarUrl: a.avatarUrl ?? '',
    galleryImages: Array.isArray(a.galleryImages) ? a.galleryImages : [],
    location: a.location ?? '',
    medium: a.medium ?? '',
    subjects: Array.isArray(a.subjects) ? a.subjects : [],
    currentExpos: a.currentExpos ?? '',
    stats: a.stats ?? { creativity: 0, technique: 0, vision: 0 },
    bio: a.bio ?? '',
    links: a.links ?? { buy: '#', website: '#', support: '#' },
  };
}

// ── Pretty table printer ────────────────────────────────────────────────────
function printTable(rows, columns) {
  const widths = columns.map((c) =>
    Math.max(c.header.length, ...rows.map((r) => String(r[c.key] ?? '').length)),
  );
  const line = (cells) => '  ' + cells.map((c, i) => String(c).padEnd(widths[i])).join('   ');
  console.log(line(columns.map((c) => c.header)));
  console.log('  ' + widths.map((w) => '-'.repeat(w)).join('   '));
  rows.forEach((r) => console.log(line(columns.map((c) => r[c.key] ?? ''))));
}

// ── firebase-admin loader (resolve from script tree, then functions/) ───────
function loadAdmin() {
  const reqHere = createRequire(import.meta.url);
  try { return reqHere('firebase-admin'); } catch { /* not installed at root */ }
  try {
    const reqFns = createRequire(pathToFileURL(join(ROOT, 'functions', 'package.json')).href);
    return reqFns('firebase-admin');
  } catch { /* not installed in functions/ either */ }
  return null;
}

function readProjectId() {
  try {
    const rc = JSON.parse(readFileSync(join(ROOT, '.firebaserc'), 'utf8'));
    return rc?.projects?.default ?? 'le-salon-des-inconnus';
  } catch {
    return 'le-salon-des-inconnus';
  }
}

function credentialHelp() {
  console.error('\n  No usable Google credentials were found for firebase-admin.');
  console.error('  Pick ONE of these, then re-run:');
  console.error('');
  console.error('    A) Application Default Credentials (simplest):');
  console.error('         gcloud auth application-default login');
  console.error('');
  console.error('    B) A service-account key file:');
  console.error('         export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/key.json"');
  console.error('       Download one from Firebase Console → Project settings →');
  console.error('       Service accounts → Generate new private key.\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const entries = loadSeed();
  const errors = validate(entries);

  if (errors.length) {
    console.error(`\n  Seed validation FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
    errors.forEach((e) => console.error(`    • ${e}`));
    console.error('');
    process.exit(1);
  }

  console.log(`\n  Seed file OK — ${entries.length} artists, all fields valid, emails unique.\n`);

  if (DRY_RUN) {
    console.log('  DRY RUN — no Auth users created, no Firestore writes. Plan:\n');
    entries.forEach((a, i) => {
      console.log(`  ${String(i + 1).padStart(2)}. ${a.name}`);
      console.log(`      auth user      : ensure ${a.email} (create if missing)`);
      console.log(`      members/{uid}  : { name, createdAt, preloaded:true }`);
      console.log(`      artistProfile  : members/{uid}/artistProfile/profile  (${a.category})`);
      console.log(`      admin/flags    : { isArtist:true, onPublicRoster:true }`);
      console.log(`      publicRoster   : publicRoster/{uid}  (public-safe copy)`);
    });
    console.log(`\n  Would ensure ${entries.length} accounts and write ${entries.length * 4} Firestore docs.`);
    console.log('  Run without --dry-run (and with credentials) to apply.\n');
    return;
  }

  // ── Real run ──────────────────────────────────────────────────────────────
  const admin = loadAdmin();
  if (!admin) {
    console.error('\n  Could not load the "firebase-admin" package.');
    console.error('  It is a dependency of functions/ — install it with:');
    console.error('      (cd functions && npm install)');
    console.error('  or run this script after `npm install` in a tree that has it.\n');
    process.exit(1);
  }

  const projectId = readProjectId();
  let cred;
  try {
    cred = admin.credential.applicationDefault();
  } catch (e) {
    credentialHelp();
    process.exit(1);
  }
  try {
    admin.initializeApp({ credential: cred, projectId });
    // Probe the credential up front so we fail cleanly, not mid-seed.
    await cred.getAccessToken();
  } catch (e) {
    credentialHelp();
    process.exit(1);
  }

  const authAdmin = admin.auth();
  const dbAdmin = admin.firestore();
  const { FieldValue } = admin.firestore;

  console.log(`  Seeding project "${projectId}" …\n`);
  const results = [];

  for (const a of entries) {
    // 1. Auth user — idempotent (look up by email first).
    let uid;
    let action;
    try {
      const existing = await authAdmin.getUserByEmail(a.email);
      uid = existing.uid;
      action = 'exists';
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        const created = await authAdmin.createUser({
          email: a.email,
          password: a.password,
          displayName: a.name,
        });
        uid = created.uid;
        action = 'created';
      } else {
        console.error(`  ! ${a.name} <${a.email}>: ${e?.message ?? e}`);
        throw e;
      }
    }

    const fields = profileFields(a);

    // 2. Minimal member profile.
    await dbAdmin.doc(`members/${uid}`).set(
      { name: a.name, createdAt: FieldValue.serverTimestamp(), preloaded: true },
      { merge: true },
    );

    // 3. Creator Studio artist profile (canonical `profile` doc). Marked
    //    onboarding-complete so the seeded artist is not sent through the wizard.
    await dbAdmin.doc(`members/${uid}/artistProfile/profile`).set(
      { ...fields, preloaded: true, onboardingV1Completed: true, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    // 4. Admin flags (isArtist + onPublicRoster).
    await dbAdmin.doc(`members/${uid}/admin/flags`).set(
      { isArtist: true, onPublicRoster: true, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    // 5. Public roster copy.
    await dbAdmin.doc(`publicRoster/${uid}`).set(
      { uid, ...fields, promotedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    results.push({ name: a.name, email: a.email, password: a.password, action });
    console.log(`  ✓ ${action.padEnd(7)} ${a.name}`);
  }

  console.log(`\n  Done. ${results.length} artists seeded.\n`);
  console.log('  Credentials (give these to each artist — store securely):\n');
  printTable(results, [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'password', header: 'Password' },
  ]);
  console.log('');
}

main().catch((e) => {
  console.error('\n  Seed failed:', e?.message ?? e, '\n');
  process.exit(1);
});
