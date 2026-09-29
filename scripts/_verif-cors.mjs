// Preuve du CORS du seau Storage et de l'analyseur audio sur l'apercu Musicien.
// Usage : node scripts/_verif-cors.mjs
import { chromium } from 'playwright';

const BASE = 'https://inconnus-salon.web.app';
const navigateur = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await navigateur.newPage({ viewport: { width: 1440, height: 900 } });
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));
const medias = [];
page.on('request', (r) => {
    const u = r.url();
    if (r.resourceType() === 'media' || /\.(mp3|m4a|ogg|wav|aac)(\?|$)/i.test(u)) medias.push(u);
});

await page.goto(`${BASE}/apercu/musicien`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Bouton de lecture : premier bouton dont l'etiquette parle de lecture.
const bouton = page.locator('button[aria-label*="coute" i], button[aria-label*="jouer" i], button[aria-label*="lire" i], button[aria-label*="play" i]').first();
const trouve = await bouton.count();
if (trouve) {
    await bouton.scrollIntoViewIfNeeded();
    await bouton.click();
    await page.waitForTimeout(4000);
}

const url = medias[0] || null;
const surPage = async (u) =>
    page.evaluate(async (x) => {
        try {
            const r = await fetch(x, { mode: 'cors' });
            return { ok: r.ok, status: r.status, acao: r.headers.get('access-control-allow-origin'), type: r.headers.get('content-type') };
        } catch (e) {
            return { ok: false, erreur: String(e) };
        }
    }, u);
const fetchRes = url ? await surPage(url) : null;

// Preuve Storage : premier objet firebasestorage vu sur une page d'apercu.
let storageUrl = null;
for (const slug of ['peintre', 'peintre-2', 'photographe', 'musicien', 'musicien-2']) {
    const vus = [];
    const ecoute = (r) => /firebasestorage/.test(r.url()) && vus.push(r.url());
    page.on('request', ecoute);
    await page.goto(`${BASE}/apercu/${slug}`, { waitUntil: 'networkidle' });
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(1500);
    page.off('request', ecoute);
    const dom = await page.evaluate(() => [...document.querySelectorAll('img,source,audio,video')].map((e) => e.currentSrc || e.src).filter((x) => /firebasestorage/.test(x)));
    storageUrl = vus[0] || dom[0] || null;
    if (storageUrl) break;
}
if (!storageUrl && process.env.STORAGE_URL) storageUrl = process.env.STORAGE_URL;
const storageRes = storageUrl ? await surPage(storageUrl) : null;

const fautes = consoleMsgs.filter((m) => /CORS|outputs zeroes/i.test(m));
console.log(JSON.stringify({ boutonLecture: trouve > 0, url, medias, fetchRes, storageUrl, storageRes, fautesCors: fautes, console: consoleMsgs }, null, 2));
await navigateur.close();
