// Joue de vraies parties dans Chromium sans fenêtre, par l'interface,
// et prend les captures de la boucle de vérification.
// Usage : node scripts/captures.mjs [url]   (vite preview doit tourner)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL = process.argv[2] ?? 'http://localhost:5178/';
const ici = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.resolve(ici, '../captures');
mkdirSync(SORTIE, { recursive: true });

const rapport = { url: URL, date: new Date().toISOString(), modes: {}, captures: [], erreurs: [], mesures: {} };
const navigateur = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function capture(page, nom) {
  await page.evaluate(() => window.__scene?.rendre());
  const f = path.join(SORTIE, `${nom}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 82 });
  rapport.captures.push(`${nom}.jpg`);
}

async function ouvrir(largeur, hauteur, propre = true) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => rapport.erreurs.push(`${largeur}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') rapport.erreurs.push(`${largeur} console: ${m.text()}`); });
  if (propre) await page.addInitScript(() => { if (!sessionStorage.getItem('x')) { localStorage.clear(); localStorage.setItem('paisho.tutoriel.paisho', '1'); sessionStorage.setItem('x', '1'); } });
  await page.goto(URL);
  await page.waitForSelector('.menu', { timeout: 60000 });
  await pause(900);
  return { ctx, page };
}

const partie = (page) => page.evaluate(() => {
  const p = window.__partie;
  return p ? { legaux: p.legaux, tour: p.etat.tour, numero: p.etat.numero, coups: p.coups.length, verdict: p.etat.verdict, choix: p.choix } : null;
});

async function cliquerPoint(page, pt) {
  const { x, y } = await page.evaluate((p) => window.__scene.ecranDe(p), pt);
  await page.mouse.click(x, y);
  await pause(120);
}

/** Joue un coup légal par l'interface ; préfère un déplacement à bonus si `bonus`. */
async function jouerUnCoup(page, { bonus = false } = {}) {
  const avant = await partie(page);
  if (!avant || avant.legaux.length === 0) return false;
  const deps = avant.legaux.filter((c) => c.type === 'deplacer');
  const avecBonus = deps.filter((c) => c.bonus);
  let c;
  if (bonus && avecBonus.length) c = avecBonus[0];
  else if (deps.length && avant.numero > 3) c = deps[Math.floor(Math.random() * deps.length)];
  else c = avant.legaux.find((x) => x.type === 'planter') ?? avant.legaux[0];
  if (c.type === 'planter') {
    const zone = (await page.$('.hud-bas .bas-reserve')) && (await page.isVisible('.hud-bas')) ? '.hud-bas' : '.hud-gauche';
    await page.click(`${zone} .jeton[data-tuile="${c.tuile}"]`);
    await cliquerPoint(page, c.porte);
  } else {
    await cliquerPoint(page, c.de);
    await cliquerPoint(page, c.a);
    if (await page.isVisible('.bonus')) {
      if (c.bonus) {
        rapport.panneauBonus = true;
        await capture(page, `bonus-${(await page.viewportSize()).width}`);
      }
      await page.click('[data-bonus="passer"]');
    }
  }
  await page.waitForFunction((n) => window.__partie && window.__partie.coups.length > n, avant.coups, { timeout: 8000 }).catch(() => {});
  const apres = await partie(page);
  return apres.coups > avant.coups;
}

async function attendreMonTour(page, n) {
  await page.waitForFunction((k) => {
    const p = window.__partie;
    return p && (p.etat.verdict || (p.legaux.length > 0 && p.coups.length >= k));
  }, n, { timeout: 30000 });
  await pause(300);
}

// ── 1. Bureau : menu, mesure du plateau, partie contre la maison ─────
{
  const { ctx, page } = await ouvrir(1440, 900);
  rapport.mesures.plateau = await page.evaluate(() => window.__mesurePlateau ?? null);
  await capture(page, 'menu-1440');
  await page.click('[data-test="contre-maison"]');
  await page.waitForSelector('.hud-haut');
  await pause(2200);
  let joues = 0;
  for (let i = 0; i < 9; i++) {
    await attendreMonTour(page, joues * 2);
    const p = await partie(page);
    if (p.verdict) break;
    if (await jouerUnCoup(page, { bonus: true })) joues++;
    else break;
  }
  await attendreMonTour(page, joues * 2).catch(() => {});
  const fin = await partie(page);
  rapport.modes.maison = { coupsHumains: joues, coupsTotal: fin.coups };
  await pause(600);
  await capture(page, 'partie-1440');
  // Sauvegarde : un rechargement doit offrir « Reprendre ».
  await page.reload();
  await page.waitForSelector('.menu', { timeout: 60000 });
  rapport.modes.sauvegarde = { reprendreVisible: await page.isVisible('.carte-reprendre') };
  await page.click('.carte-reprendre .bouton');
  await page.waitForSelector('.hud-haut');
  await pause(2000);
  rapport.modes.sauvegarde.coupsRepris = (await partie(page)).coups;
  // Les règles, puis l'abandon pour voir le verdict.
  await page.click('.hud-boutons .bouton:nth-child(1)');
  await pause(500);
  await capture(page, 'regles-1440');
  await page.keyboard.press('Escape');
  await page.click('.hud-boutons .bouton:nth-child(3)');
  await page.click('.dialogue .bouton.or');
  await pause(700);
  await capture(page, 'verdict-1440');
  rapport.modes.verdict = { visible: await page.isVisible('.verdict') };
  await ctx.close();
}

// ── 2. À deux sur le même Mac ────────────────────────────────────────
{
  const { ctx, page } = await ouvrir(1440, 900);
  await page.click('.carte:has(.case) .bouton.or');
  await page.waitForSelector('.hud-haut');
  await pause(2200);
  let n = 0;
  for (let i = 0; i < 6; i++) { if (await jouerUnCoup(page)) n++; await pause(1700); }
  rapport.modes.deux = { coups: n };
  await capture(page, 'deux-1440');
  await ctx.close();
}

// ── 3. Téléphone ─────────────────────────────────────────────────────
{
  const { ctx, page } = await ouvrir(390, 844);
  rapport.mesures.debordementMenu = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await capture(page, 'menu-390');
  await page.click('[data-test="contre-maison"]');
  await page.waitForSelector('.hud-haut');
  await pause(2200);
  let joues = 0;
  for (let i = 0; i < 4; i++) {
    await attendreMonTour(page, joues * 2);
    if (await jouerUnCoup(page)) joues++;
  }
  await attendreMonTour(page, joues * 2).catch(() => {});
  await pause(600);
  rapport.modes.mobile = { coups: joues };
  await capture(page, 'partie-390');
  await ctx.close();
}

// ── 4. À distance : deux pages, l'une ouvre la table, l'autre la rejoint ─
{
  const a = await ouvrir(1024, 700);
  const b = await ouvrir(1024, 700);
  const id = await a.page.textContent('code.id');
  await a.page.click('text=' + (await a.page.evaluate(() => document.documentElement.lang === 'fr' ? 'Ouvrir une table' : 'Open a table')));
  await pause(2500);
  await b.page.fill('.ligne-id input.saisie', id.trim());
  await b.page.click('.ligne-id .bouton:has-text("Rejoindre")');
  const ok = await Promise.all([
    a.page.waitForSelector('.hud-haut', { timeout: 25000 }).then(() => true).catch(() => false),
    b.page.waitForSelector('.hud-haut', { timeout: 25000 }).then(() => true).catch(() => false),
  ]);
  rapport.modes.distance = { connecte: ok.every(Boolean) };
  if (ok.every(Boolean)) {
    await pause(2200);
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const page = i % 2 === 0 ? a.page : b.page;
      await page.waitForFunction(() => window.__partie?.legaux.length > 0, null, { timeout: 15000 }).catch(() => {});
      if (await jouerUnCoup(page)) n++;
      await pause(1200);
    }
    rapport.modes.distance.coups = n;
    rapport.modes.distance.journaux = [(await partie(a.page)).coups, (await partie(b.page)).coups];
    await capture(b.page, 'distance-invite-1024');
  } else {
    rapport.modes.distance.etat = [await a.page.textContent('.carte:last-child').catch(() => ''), await b.page.textContent('.carte:last-child').catch(() => '')];
  }
  await a.ctx.close(); await b.ctx.close();
}

await navigateur.close();
writeFileSync(path.join(SORTIE, 'parties.json'), JSON.stringify(rapport, null, 2));
console.log(JSON.stringify({ ...rapport, mesures: { ...rapport.mesures, plateau: rapport.mesures.plateau?.filter((_, i) => i % 2 === 0) } }, null, 1));
