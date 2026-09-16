// Génère des variantes WebP redimensionnées des grosses photos locales, pour que
// getOptimizedUrl (utils/imageOptimizer.ts) serve la bonne largeur au lieu du
// fichier natif de 1 à 2,5 Mo. Idempotent : ne refait que ce qui manque.
//
//   node scripts/optimize-images.mjs
//
// Sorties : public/_opt/<largeur>/<chemin d'origine>.webp
// Manifeste : utils/optimizedImages.json  { "/media/x.jpg": [800, 1600, 2800] }
// La dernière largeur de la liste est toujours la largeur native (WebP pleine taille).
// Requiert cwebp et magick (Homebrew). Une image absente du manifeste retombe
// simplement sur son fichier d'origine.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const DIRS = ['media', 'wwoof'];
const BUCKETS = [800, 1600, 2400];
const MIN_BYTES = 150 * 1024;
const QUALITY = '82';

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) return walk(p);
  return /\.(jpe?g|png)$/i.test(e.name) && statSync(p).size >= MIN_BYTES ? [p] : [];
});

const files = DIRS.filter((d) => existsSync(join(PUB, d))).flatMap((d) => walk(join(PUB, d)));
const manifest = {};
const jobs = [];
for (const f of files) {
  const rel = '/' + relative(PUB, f).split('\\').join('/');
  const native = Number(execFileSync('magick', ['identify', '-format', '%w', f + '[0]']).toString());
  if (!native) continue;
  const widths = [...BUCKETS.filter((w) => w < native * 0.9), native];
  manifest[rel] = widths;
  for (const w of widths) {
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

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(join(ROOT, 'utils', 'optimizedImages.json'), JSON.stringify(sorted) + '\n');
console.log(`${files.length} images, ${jobs.length} variantes générées`);
