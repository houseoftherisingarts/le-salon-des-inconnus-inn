import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/e084f63b-df38-4e25-bb87-8ad678447e55/scratchpad/tuile-info';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.addInitScript(() => { localStorage.setItem('paisho.tutoriel.paisho', '1'); localStorage.setItem('paisho.joueur', JSON.stringify({ id: 'paisho-capture1', nom: 'Capture' })); });
  await page.goto('http://localhost:5178/?intro=0');
  await page.waitForSelector('.menu', { timeout: 60000 }); await pause(800);
  await page.click('[data-test="contre-maison"]');
  await page.click('[data-test="vs"]', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('.hud-haut'); await pause(2200);
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(() => window.__partie && window.__partie.legaux.length > 0 && !window.__partie.occupe, null, { timeout: 30000 });
    const c = await page.evaluate(() => window.__partie.legaux.find((x) => x.type === 'planter'));
    const zone = (await page.isVisible('.hud-bas')) ? '.hud-bas' : '.hud-gauche';
    await page.click(`${zone} .jeton[data-tuile="${c.tuile}"]:enabled`);
    await page.evaluate((p) => window.__scene.surClic(p), c.porte); await pause(400);
    await page.waitForFunction((n) => window.__partie.coups.length >= n, (i + 1) * 2, { timeout: 30000 });
  }
  await pause(1500);
  // 1440 : une tuile adverse; 390 : une des miennes (sélection + fiche).
  const pt = await page.evaluate((mien) => {
    const s = window.__partie.etat.cases;
    for (let i = 0; i < s.length; i++) { const ch = s[i]; if (/[A-Za-z]/.test(ch) && (ch === ch.toUpperCase()) === mien) return i; }
    return -1;
  }, w < 900);
  await page.evaluate((p) => window.__scene.surClic(p), pt); await pause(600);
  const info = await page.evaluate(() => document.querySelector('[data-test="fiche-plateau"]')?.innerText);
  console.log(w, pt, JSON.stringify(info), await page.evaluate(() => window.__partie.choix));
  await page.evaluate(() => window.__scene?.rendre());
  await page.screenshot({ path: `${OUT}/fiche-${w}.png` });
  await ctx.close();
}
await nav.close();
