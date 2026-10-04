// Vérifie l'échelle : menu verrouillé, puis une vraie victoire contre le Boulder et l'écran de déblocage.
import { chromium } from 'playwright';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const URL = 'http://localhost:5178/?intro=0';
const OUT = process.argv[2] ?? '/tmp';
const nav = await chromium.launch({ args: ARGS });
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
const menu = async () => {
  await page.goto(URL);
  const porte = page.locator('[data-test=porte]');
  if (await porte.count()) await porte.click();
  await page.waitForSelector('[data-test=echelle]', { timeout: 90000 });
};
const etat = () => page.evaluate(() => {
  const d = (s) => { const e = document.querySelector(s); return e ? (e.disabled ? 'verrou' : 'ouvert') : 'absent'; };
  return { echelons: document.querySelectorAll('.echelon').length, iroh: d('[data-test=adv-iroh]'), boulder: d('[data-test=adv-boulder]'), chou: d('[data-test=adv-chou]'), irohek: d('[data-test=adv-irohek]'),
    avAang: d('[data-test=avatar-aang]'), avIroh: d('[data-test=avatar-iroh]'), avBoulder: d('[data-test=avatar-boulder]'), niveau: document.querySelector('.niveau') ? 'visible' : 'absent', korra: document.querySelector('[data-test=korra]')?.textContent?.slice(0, 40) };
});
await page.evaluate(() => localStorage.clear());
await menu();
console.log('menu neuf', JSON.stringify(await etat()));
await page.screenshot({ path: `${OUT}/menu-echelle.jpg`, quality: 70 });
await page.evaluate(() => localStorage.setItem('paisho.progression', JSON.stringify(['iroh', 'boulder', 'chou', 'jet', 'aang', 'sokka', 'katara', 'mai', 'kyoshi', 'tylee', 'zhao', 'jeongjeong', 'zuko', 'longfeng', 'pakku', 'piandao', 'toph', 'hama', 'azula', 'wanshitong', 'bumi', 'ozai'])));
await menu();
console.log('avant le boss', JSON.stringify(await etat()));
await page.evaluate(() => localStorage.setItem('paisho.progression', JSON.stringify(['iroh', 'boulder', 'chou', 'jet', 'aang', 'sokka', 'katara', 'mai', 'kyoshi', 'tylee', 'zhao', 'jeongjeong', 'zuko', 'longfeng', 'pakku', 'piandao', 'toph', 'hama', 'azula', 'wanshitong', 'bumi', 'ozai', 'irohek'])));
await menu();
console.log('tout battu', JSON.stringify(await etat()));

// La vraie partie : l'hôte joue avec le moteur au niveau 8, sans prime, contre le Boulder.
await page.evaluate(() => { localStorage.clear(); });
await menu();
await page.click('[data-test=adv-boulder]');
await page.click('[data-test=contre-maison]');
await page.waitForSelector('.hud', { timeout: 30000 });
await page.evaluate(async () => {
  window.__cpu = await import('/src/jeu/cpu.ts');
  window.__noms = (await import('/src/ui/textes.ts')).NOMS_TUILES;
});
const debut = Date.now();
let coups = 0;
while (Date.now() - debut < 420000) {
  const p = await page.evaluate(() => { const p = window.__partie; return p ? { occupe: p.occupe, tour: p.etat.tour, verdict: p.etat.verdict, choix: p.choix, n: p.coups.length } : null; });
  if (!p) { await page.waitForTimeout(300); continue; }
  if (p.verdict) break;
  if (p.choix === 'bonus') { await page.click('[data-bonus=passer]'); await page.waitForTimeout(300); continue; }
  if (p.occupe || p.tour !== 'hote') { await page.waitForTimeout(250); continue; }
  const fait = await page.evaluate(async () => {
    const p = window.__partie; const s = window.__scene;
    const c = window.__cpu.choisirCoup(p.etat, 8);
    if (!c) return 'rien';
    if (c.type === 'planter') {
      const noms = window.__noms; const sel = Object.values(noms).map((n) => `.hud-gauche .jeton[title="${n[c.tuile]}"]`).join(',');
      const b = document.querySelector(sel); if (!b) return 'pas de jeton ' + c.tuile;
      b.click(); await new Promise((r) => setTimeout(r, 120)); s.surClic(c.porte); return 'planter';
    }
    s.surClic(c.de); await new Promise((r) => setTimeout(r, 120)); s.surClic(c.a); return 'deplacer';
  });
  coups++;
  await page.waitForTimeout(400);
  if (coups % 10 === 0) console.log('coups joués', coups, fait, 'journal', p.n);
}
const fin = await page.evaluate(() => window.__partie.etat.verdict);
console.log('verdict', JSON.stringify(fin), 'coups', coups, 'en', Math.round((Date.now() - debut) / 1000), 's');
const splash = await page.waitForSelector('[data-test=debloque]', { timeout: 15000 }).catch(() => null);
console.log('splash', splash ? 'présent' : 'ABSENT');
if (splash) {
  await page.waitForTimeout(2600);
  console.log('tableau 1', await page.evaluate(() => [...document.querySelectorAll('.debloque-titre,.debloque-nom')].map((e) => e.textContent).join(' | ')));
  await page.screenshot({ path: `${OUT}/debloque-1.jpg`, quality: 70 });
  await page.click('[data-test=debloque]');
  await page.waitForTimeout(2200);
  console.log('tableau 2', await page.evaluate(() => [...document.querySelectorAll('.debloque-titre,.debloque-nom')].map((e) => e.textContent).join(' | ')));
  await page.screenshot({ path: `${OUT}/debloque-2.jpg`, quality: 70 });
  await page.click('[data-test=debloque]');
  await page.waitForTimeout(500);
  console.log('verdict visible', await page.locator('.voile.verdict').count());
}
console.log('progression', await page.evaluate(() => localStorage.getItem('paisho.progression')));
await page.click('.voile.verdict .bouton.discret').catch(() => {});
await page.waitForSelector('[data-test=echelle]', { timeout: 20000 }).catch(() => {});
console.log('menu après', JSON.stringify(await etat()));
await page.screenshot({ path: `${OUT}/menu-apres.jpg`, quality: 70 });
console.log('erreurs', erreurs.slice(0, 5));
await nav.close();
