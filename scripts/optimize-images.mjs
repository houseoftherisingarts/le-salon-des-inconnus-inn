// Génère des variantes WebP redimensionnées des grosses photos locales, pour que
// getOptimizedUrl (utils/imageOptimizer.ts) serve la bonne largeur au lieu du
// fichier natif de 1 à 2,5 Mo. Idempotent : ne refait que ce qui manque.
//
//   node scripts/optimize-images.mjs
//
// Sorties : public/_opt/<largeur>/<chemin d'origine>.webp
// Manifeste : utils/optimizedImages.json  { "/media/x.jpg": [2800, 800, 1600, 2800] }
// Premier nombre = largeur native, puis les largeurs WebP disponibles. La variante
// native n'est gardée que si elle pèse au moins 10 % de moins que l'original.
// Requiert cwebp et magick (Homebrew). Une image absente du manifeste retombe
// simplement sur son fichier d'origine.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const DIRS = ['media', 'wwoof'];
const BUCKETS = [800, 1600, 2400];
const MIN_BYTES = 150 * 1024;
const QUALITY = '90'; // q90 : SSIM ≥ 0,98 contre le JPEG d'origine sur les photos les plus détaillées (drone)

const MANIFEST = join(ROOT, 'utils', 'optimizedImages.json');
try { execFileSync('cwebp', ['-version']); execFileSync('magick', ['-version']); } catch {
  // Sans les outils, aucune variante n'est garantie sur le disque : manifeste vide,
  // le site sert alors les fichiers d'origine.
  writeFileSync(MANIFEST, '{}\n');
  console.warn('cwebp ou magick introuvable : manifeste vide, images d\'origine servies');
  process.exit(0);
}

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) return walk(p);
  return /\.(jpe?g|png)$/i.test(e.name) && statSync(p).size >= MIN_BYTES ? [p] : [];
});

// Variantes natives écartées au passage précédent (pas assez légères) : on ne les refait pas.
let previous = {};
try { previous = JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch {}
const manifestTime = existsSync(MANIFEST) ? statSync(MANIFEST).mtimeMs : 0;

const files = DIRS.filter((d) => existsSync(join(PUB, d))).flatMap((d) => walk(join(PUB, d)));
const manifest = {};
const jobs = [];
for (const f of files) {
  const rel = '/' + relative(PUB, f).split('\\').join('/');
  const native = Number(execFileSync('magick', ['identify', '-format', '%w', f + '[0]']).toString());
  if (!native) continue;
  const widths = [...BUCKETS.filter((w) => w < native * 0.9), native];
  manifest[rel] = [native, ...widths];
  const skipNative = previous[rel] && !previous[rel].slice(1).includes(native) && manifestTime >= statSync(f).mtimeMs;
  for (const w of widths) {
    if (w === native && skipNative) { manifest[rel] = [native, ...widths.filter((v) => v !== native)]; continue; }
    const out = join(PUB, '_opt', String(w), rel + '.webp');
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(f).mtimeMs) continue;
    jobs.push({ f, out, w, native });
  }
}

let running = 0, i = 0;
const par = Math.max(2, Math.min(4, os.cpus().length >> 1));
await new Promise((done) => {
  const next = () => {
    if (i >= jobs.length && running === 0) return done();
    while (running < par && i < jobs.length) {
      const { f, out, w, native } = jobs[i++];
      mkdirSync(dirname(out), { recursive: true });
      const args = ['-quiet', '-q', QUALITY, '-m', '4', '-metadata', 'icc'];
      if (w < native) args.push('-resize', String(w), '0');
      running++;
      import('node:child_process').then(({ execFile }) =>
        execFile('cwebp', [...args, f, '-o', out], (err) => {
          if (err) { console.error('échec', f, err.message); delete manifest['/' + relative(PUB, f)]; }
          running--; next();
        }));
    }
  };
  next();
});

for (const [rel, [native, ...widths]] of Object.entries(manifest)) {
  const full = join(PUB, '_opt', String(native), rel + '.webp');
  if (widths.includes(native) && existsSync(full) && statSync(full).size > statSync(join(PUB, rel)).size * 0.9) {
    unlinkSync(full);
    manifest[rel] = [native, ...widths.filter((w) => w !== native)];
    if (manifest[rel].length === 1) delete manifest[rel];
  }
}

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(MANIFEST, JSON.stringify(sorted) + '\n');
console.log(`${files.length} images, ${jobs.length} variantes générées`);
