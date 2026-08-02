// Harnais espagnol : bascule l'app en ES et vérifie qu'aucun français ne
// traîne dans l'interface visible, puis capture desktop et mobile.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/06b2c168-d024-4447-b32e-84b36a22dd05/scratchpad';
const FILE = 'file:///Users/lesalondesinconnus/Documents/petite-banque/index.html';

// Mots français qui ne devraient JAMAIS apparaître si l'espagnol est complet.
const FR_MARKERS = [
  'Dans le coffre', 'La caisse', 'Dépôt', 'Retrait', 'Épargner', 'Investir',
  'Partager', 'Argent déposé', 'Intérêts gagnés', 'Toucher une pièce',
  'Le coin de l’entrepreneur', 'Les exercices', 'Plus tard',
];

const browser = await chromium.launch();
const errs = [];
for (const [vp, tag] of [[{ width: 860, height: 1150 }, 'desktop'], [{ width: 390, height: 844 }, 'mobile']]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(tag + ' : ' + String(e).slice(0, 140)));
  await page.goto(FILE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  // Passer en espagnol, monter le niveau, recharger.
  await page.evaluate(() => {
    const t = window.__gamesTest, s = t.state();
    s.lang = 'es';
    s.accounts[0].level = 10;
    if (!s.accounts[0].modules) s.accounts[0].modules = {};
    s.accounts[0].modules.toolbox = 'on';
    s.dailyLast = new Date().toISOString().slice(0, 10);
    t.save();
    location.reload();
  });
  await page.waitForTimeout(4200);
  await page.evaluate(() => { const l = document.getElementById('gmLater'); if (l) l.click(); });
  await page.evaluate(() => {
    document.querySelectorAll('.card.collapsed .collapse-btn').forEach((b) => b.click());
  });
  await page.waitForTimeout(900);

  const body = await page.evaluate(() => document.body.innerText);
  const found = FR_MARKERS.filter((m) => body.includes(m));
  console.log(`${tag} : ${found.length ? '⚠️ français restant : ' + found.join(' · ') : '✅ aucun marqueur français visible'}`);
  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  console.log(`${tag} : <html lang> = ${htmlLang}`);
  await page.screenshot({ path: `${OUT}/es-${tag}.png`, fullPage: false });
  if (tag === 'desktop') {
    const card = page.locator('#cardToolbox');
    if (await card.count()) await card.screenshot({ path: `${OUT}/es-coin.png` });
    await page.evaluate(() => { document.getElementById('libBtn').click(); });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/es-biblio.png` });
  }
  await ctx.close();
}
console.log('erreurs JS :', errs.length ? errs : 'aucune');
await browser.close();
