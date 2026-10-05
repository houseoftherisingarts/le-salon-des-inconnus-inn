import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/e084f63b-df38-4e25-bb87-8ad678447e55/scratchpad/tuile-info';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const T = { timeout: 0 };
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, lang] of [[1440, 900, 'fr-CA'], [390, 844, 'fr-CA']]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, locale: lang });
  ctx.setDefaultTimeout(0);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.addInitScript(() => { localStorage.setItem('paisho.tutoriel.paisho', '1'); localStorage.setItem('paisho.joueur', JSON.stringify({ id: 'paisho-capture1', nom: 'Capture' })); });
  await page.goto('http://localhost:5178/?intro=0', T);
  await page.waitForSelector('.menu', T); await pause(800);
  await page.click('[data-test="contre-maison"]');
  await page.click('[data-test="vs"]', { timeout: 8000 }).catch(() => {});
  await page.waitForSelector('.hud-haut', T); await pause(2200);
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(() => window.__partie && window.__partie.legaux.length > 0 && !window.__partie.occupe, null, T);
    const c = await page.evaluate(() => window.__partie.legaux.find((x) => x.type === 'planter'));
    const zone = (await page.isVisible('.hud-bas')) ? '.hud-bas' : '.hud-gauche';
    await page.click(`${zone} .jeton[data-tuile="${c.tuile}"]:enabled`);
    await page.evaluate((p) => window.__scene.surClic(p), c.porte); await pause(400);
    await page.waitForFunction((n) => window.__partie.coups.length >= n, (i + 1) * 2, T);
  }
  await page.waitForFunction(() => !window.__partie.occupe, null, T);
  await pause(1500);
  const pt = await page.evaluate((mien) => {
    const s = window.__partie.etat.cases;
    for (let i = 0; i < s.length; i++) { const ch = s[i]; if (/[A-Za-z]/.test(ch) && (ch === ch.toUpperCase()) === mien) return i; }
    return -1;
  }, w < 900);
  await page.evaluate((p) => window.__scene.surClic(p), pt); await pause(800);
  const info = await page.evaluate(() => document.querySelector('[data-test="fiche-plateau"]')?.innerText);
  const geo = await page.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const f = r('[data-test="fiche-plateau"]'), b = r('.hud-bas'), hh = r('.hud-haut'); return { fiche: [f.top, f.bottom], bas: b ? b.top : null, haut: hh.bottom }; });
  console.log(w, pt, JSON.stringify(info), await page.evaluate(() => window.__partie.choix), JSON.stringify(geo));
  await page.evaluate(() => window.__scene?.rendre());
  await page.screenshot({ path: `${OUT}/fiche-${w}.jpg`, type: 'jpeg', quality: 85, timeout: 0, animations: 'disabled' });
  const vide = await page.evaluate(() => window.__partie.etat.cases.indexOf('.'));
  await page.evaluate((p) => window.__scene.surClic(p), vide); await pause(500);
  console.log('ferme apres vide:', !(await page.isVisible('[data-test="fiche-plateau"]')));
  await ctx.close();
}
await nav.close();
