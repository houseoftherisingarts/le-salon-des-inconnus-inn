import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3bad1bad-cafb-4928-81ac-ff2c7aad2965/scratchpad/';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const nav = await chromium.launch({ args: ARGS });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(w, h, tag) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); localStorage.setItem('paisho.tutoriel.paisho', '1'); });
  await page.goto('http://localhost:5179/?intro=1');
  await pause(1700); await page.screenshot({ path: `${OUT}kamy-${tag}.jpg`, type: 'jpeg', quality: 80 });
  await pause(4200); await page.screenshot({ path: `${OUT}presentent-${tag}.jpg`, type: 'jpeg', quality: 80 });
  await pause(4200); await page.screenshot({ path: `${OUT}marque-${tag}.jpg`, type: 'jpeg', quality: 80 });
  const musique = await page.evaluate(() => { const a = document.querySelector('audio'); return 'pas d’élément dans le DOM (Audio() hors DOM)'; });
  await page.waitForSelector('.menu', { timeout: 90000 });
  await pause(1200);
  await page.evaluate(() => window.__scene?.rendre());
  await page.screenshot({ path: `${OUT}menu-${tag}.jpg`, type: 'jpeg', quality: 80 });
  await page.click('[data-test="adv-iroh"]');
  await pause(300);
  await page.evaluate(() => window.__scene?.rendre());
  await page.screenshot({ path: `${OUT}menu-iroh-${tag}.jpg`, type: 'jpeg', quality: 80 });
  const info = await page.evaluate(() => {
    const t = document.querySelector('.menu-titre'); const cs = getComputedStyle(t);
    const r = t.getBoundingClientRect();
    const lignes = Math.round(r.height / parseFloat(cs.lineHeight));
    const fonts = [...document.fonts].map((f) => `${f.family}:${f.status}`);
    const niv = document.querySelector('.niveau-nom')?.textContent;
    return { policeTitre: cs.fontFamily.split(',')[0], lignesTitre: lignes, fonts, niveau: niv, body: getComputedStyle(document.body).fontFamily.split(',')[0] };
  });
  console.log(tag, JSON.stringify(info), 'erreurs:', erreurs);
  await ctx.close();
}
await run(1440, 900, '1440');
await run(390, 844, '390');
await nav.close();
