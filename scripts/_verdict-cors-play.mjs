// Vérificateur boucle-verdict : joue la première piste sur /apercu/musicien,
// vérifie l'absence d'erreurs CORS console, teste fetch(mode:'cors') sur une
// piste et sur une image de galerie servie par Storage.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const OUT = 'captures/verdict-salon';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await c.newPage();
const consoleMsgs = [];
p.on('console', (m) => consoleMsgs.push(m.text()));
p.on('pageerror', (e) => consoleMsgs.push('pageerror: ' + e.message));
const audioRequests = [];
p.on('request', (r) => { if (/\.mp3|\.wav|\.m4a|\.ogg/i.test(r.url())) audioRequests.push(r.url()); });

await p.goto('https://inconnus-salon.web.app/apercu/musicien', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/musicien-haut.jpg`, quality: 70, type: 'jpeg' });

// trouver et cliquer le bouton de lecture de la première piste
const playBtn = p.locator('button[aria-label*="couter" i], button[aria-label*="ecout" i], button[aria-label*="jouer" i], button[aria-label*="play" i]').first();
let clicked = false;
if (await playBtn.count()) {
  await playBtn.click();
  clicked = true;
} else {
  // repli : premier bouton dans la liste de pistes
  const fallback = p.locator('[class*="piste" i] button, [data-piste] button').first();
  if (await fallback.count()) { await fallback.click(); clicked = true; }
}
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/musicien-lecture.jpg`, quality: 70, type: 'jpeg' });

const fautesCors = consoleMsgs.filter((t) => /cors|outputs zeroes|blocked/i.test(t));

// fetch CORS depuis la page : une piste locale (même origine) et un objet Storage
const pisteUrl = await p.evaluate(() => document.querySelector('audio')?.src || null);

const fetchImpl = async (u) => {
  try {
    const r = await fetch(u, { mode: 'cors' });
    return { ok: r.ok, status: r.status, type: r.headers.get('content-type') };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
const fetchResult = async (url) => (url ? p.evaluate(fetchImpl, url) : null);
const fetchResult2 = async (page, url) => (url ? page.evaluate(fetchImpl, url) : null);

const pisteFetch = await fetchResult(pisteUrl);

// objet Storage réel (image de galerie) trouvé sur /apercu/peintre
const p2 = await c.newPage();
await p2.goto('https://inconnus-salon.web.app/apercu/peintre', { waitUntil: 'networkidle' });
await p2.waitForTimeout(1500);
const storageImgUrl = await p2.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const hit = imgs.find((i) => /firebasestorage/.test(i.src));
  return hit ? hit.src : null;
});
const storageFetch = await fetchResult2(p2, storageImgUrl);
await p2.close();

const rapport = {
  clicked,
  pisteUrl,
  consoleMsgsCount: consoleMsgs.length,
  fautesCors,
  pisteFetch,
  storageImgUrl,
  storageFetch,
};
fs.writeFileSync(`${OUT}/rapport-cors-play.json`, JSON.stringify(rapport, null, 2));
console.log(JSON.stringify(rapport, null, 2));

await b.close();
