// Captures de la boucle de vérification du 5 octobre : écran des niveaux,
// statuette peinte de Mai à la table, partie avec la fiche d'une tuile.
// Usage : npx vite preview --port 5178 & node scripts/capture-verif.mjs <dossier>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const URL = 'http://localhost:5178/?intro=0';
const SORTIE = process.argv[2];
mkdirSync(SORTIE, { recursive: true });
const rapport = { captures: [], erreurs: [], mesures: {} };
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const TOUS = ['iroh', 'chou', 'jet', 'aang', 'sokka', 'katara', 'mai', 'kyoshi', 'tylee', 'zhao', 'jeongjeong', 'zuko', 'longfeng', 'pakku', 'piandao', 'toph', 'hama', 'azula', 'wanshitong', 'bumi', 'ozai', 'irohek'];

async function capture(page, nom) {
  await page.evaluate(() => window.__scene?.rendre());
  await page.screenshot({ path: path.join(SORTIE, `${nom}.jpg`), type: 'jpeg', quality: 82, animations: 'disabled' });
  rapport.captures.push(`${nom}.jpg`);
}
async function ouvrir(w, h) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => rapport.erreurs.push(`${w}: ${e.message}`));
  await page.addInitScript((tous) => {
    localStorage.clear();
    localStorage.setItem('paisho.tutoriel.paisho', '1');
    localStorage.setItem('paisho.joueur', JSON.stringify({ id: 'paisho-verif001', nom: 'Alex', avatar: 'zuko' }));
    localStorage.setItem('paisho.progression', JSON.stringify(tous));
    localStorage.setItem('paisho.adversaire', 'mai');
  }, TOUS);
  await page.goto(URL);
  await page.waitForSelector('.menu', { timeout: 90000 });
  await pause(1500);
  return { ctx, page };
}
async function cliquerPoint(page, pt) {
  const { x, y } = await page.evaluate((p) => window.__scene.ecranDe(p), pt);
  await page.mouse.click(x, y);
  await pause(250);
}

for (const [w, h, nom] of [[1440, 900, 'bureau'], [390, 844, 'mobile']]) {
  const { ctx, page } = await ouvrir(w, h);
  // Statuette de Mai (peinte) en face.
  await page.click('[data-test="adv-mai"]').catch(async () => {
    await page.click('[data-test="niveaux"]'); await pause(400); await page.click('[data-test="adv-mai"]');
  });
  await pause(4000);
  await capture(page, `${nom}-menu-mai`);
  // Écran des niveaux : les vignettes.
  await page.click('[data-test="niveaux"]');
  await pause(1200);
  await capture(page, `${nom}-niveaux`);
  rapport.mesures[`${nom}-vignettes`] = await page.$$eval('.niveau-perso img', (l) => l.map((i) => `${i.getAttribute('src')?.split('/').pop()} ${i.naturalWidth}x${i.naturalHeight}`));
  await page.click('[data-test="niveaux-ecran"] .bouton.discret').catch(() => {});
  await pause(300);
  // Partie contre Mai : quelques coups, puis clic sur une tuile adverse.
  await page.click('[data-test="contre-maison"]');
  await page.click('[data-test="vs"]', { timeout: 6000 }).catch(() => {});
  await page.waitForSelector('.hud-haut', { timeout: 30000 });
  await pause(1500);
  for (let i = 0; i < 6; i++) {
    const avant = await page.evaluate(() => window.__partie?.coups.length ?? 0);
    const coup = await page.evaluate(() => { const p = window.__partie; if (!p || p.etat.tour !== 'hote') return null; const c = p.legaux.find((x) => x.type === 'planter') ?? p.legaux.find((x) => x.type === 'deplacer' && !x.bonus) ?? p.legaux[0]; return c; });
    if (!coup) { await pause(1500); continue; }
    if (coup.type === 'planter') {
      await page.click(`.jeton[data-tuile="${coup.tuile}"]:enabled`).catch(() => {});
      await pause(200);
      await cliquerPoint(page, coup.porte);
    } else { await cliquerPoint(page, coup.de); await cliquerPoint(page, coup.a); }
    await page.waitForFunction((n) => (window.__partie?.coups.length ?? 0) > n, avant, { timeout: 8000 }).catch(() => {});
    await page.waitForFunction(() => window.__partie?.etat.tour === 'hote', null, { timeout: 15000 }).catch(() => {});
    await pause(400);
  }
  await page.click('[data-bonus="passer"]').catch(() => {});
  await pause(600);
  await capture(page, `${nom}-partie`);
  const adverse = await page.evaluate(() => { const e = window.__partie.etat; for (let i = 0; i < 289; i++) { const t = window.__partie.tuileEn?.(i); if (t && t.camp === 'invite') return i; } return null; });
  const cible = adverse ?? await page.evaluate(() => { const e = window.__partie.etat.cases; for (let i = 0; i < e.length; i++) if (e[i] !== '.' && e[i] !== ' ') return i; return null; });
  if (cible !== null) { await cliquerPoint(page, cible); await pause(700); await capture(page, `${nom}-fiche-tuile`); }
  rapport.mesures[`${nom}-fiche`] = await page.$eval('.fiche-plateau', (f) => ({ texte: f.innerText, rect: f.getBoundingClientRect().toJSON(), police: getComputedStyle(f).fontSize })).catch((e) => `absente: ${e.message.slice(0, 80)}`);
  rapport.mesures[`${nom}-deborde`] = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await ctx.close();
}
await nav.close();
writeFileSync(path.join(SORTIE, 'rapport.json'), JSON.stringify(rapport, null, 1));
console.log(JSON.stringify(rapport, null, 1));
