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
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const navigateur = await chromium.launch({ args: ARGS });

const SEUL = process.env.SEUL ?? '1234';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function capture(page, nom) {
  await page.evaluate(() => window.__scene?.rendre());
  const f = path.join(SORTIE, `${nom}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 82, animations: 'disabled' });
  rapport.captures.push(`${nom}.jpg`);
}

async function ouvrir(largeur, hauteur, propre = true, nav = navigateur, requete = '') {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => rapport.erreurs.push(`${largeur}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') rapport.erreurs.push(`${largeur} console: ${m.text()}`); });
  if (propre) await page.addInitScript(() => { if (!sessionStorage.getItem('x')) { localStorage.clear(); localStorage.setItem('paisho.tutoriel.paisho', '1'); sessionStorage.setItem('x', '1'); } });
  await page.goto(URL + requete);
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
    const zones = (await page.isVisible('.hud-bas')) ? ['.hud-bas'] : ['.hud-gauche', '.hud-droite'];
    await page.click(zones.map((z) => `${z} .jeton[data-tuile="${c.tuile}"]:enabled`).join(', '));
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
  if (apres.coups <= avant.coups) rapport.erreurs.push(`coup refusé : ${JSON.stringify(c)} choix=${apres.choix} n=${avant.numero}`);
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
if (SEUL.includes('1')) {
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
if (SEUL.includes('2')) {
  const { ctx, page } = await ouvrir(1440, 900);
  await page.click('[data-test="a-deux"]');
  await page.waitForSelector('.hud-haut');
  await pause(2200);
  let n = 0;
  for (let i = 0; i < 7; i++) { await page.waitForFunction(() => window.__partie?.legaux.length > 0, null, { timeout: 15000 }).catch(() => {}); await pause(300); if (await jouerUnCoup(page)) n++; }
  rapport.modes.deux = { coups: n };
  await capture(page, 'deux-1440');
  await ctx.close();
}

// ── 3. Téléphone ─────────────────────────────────────────────────────
if (SEUL.includes('3')) {
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

// ── 4. À distance : deux navigateurs, l'un ouvre la table, l'autre la rejoint ─
if (SEUL.includes('4')) {
  const a = await ouvrir(800, 600);
  const b = await ouvrir(800, 600, true, await chromium.launch({ args: ARGS }));
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
    await capture(b.page, 'distance-invite-800');
  } else {
    rapport.modes.distance.etat = [await a.page.textContent('.carte:last-child').catch(() => ''), await b.page.textContent('.carte:last-child').catch(() => '')];
  }
  await a.ctx.close(); await b.ctx.browser().close();
}

// ── 5. Les skins : plateaux de marque, tuiles, carte du menu ─────────
// Le skin est forcé par l'adresse, sans toucher au stockage. Le rendu
// passe par le Chrome du Mac (Metal) : les métaux et l'irisation y
// sont fidèles, là où le rendu logiciel les aplatit.
if (SEUL.includes('5')) {
  const gpu = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--use-angle=metal'] })
    .catch(() => navigateur);
  const plans = [
    ['skin-vexel-1440', '?plateau=vexel&tuiles=bois'],
    ['skin-salon-1440', '?plateau=salon&tuiles=bois'],
    ['skin-tuiles-1440', '?plateau=vexel&tuiles=nacre'],
    ['skin-tuiles-obsidienne-1440', '?plateau=salon&tuiles=obsidienne'],
    ['skin-tuiles-cuivre-1440', '?plateau=bois&tuiles=cuivre'],
  ];
  for (const [nom, q] of plans) {
    const { ctx, page } = await ouvrir(1440, 900, true, gpu, q);
    await page.click('[data-test="a-deux"]');
    await page.waitForSelector('.hud-haut');
    await pause(2200);
    for (let i = 0; i < 8; i++) {
      await page.waitForFunction(() => window.__partie?.legaux.length > 0, null, { timeout: 15000 }).catch(() => {});
      await pause(200);
      await jouerUnCoup(page);
    }
    await pause(700);
    await capture(page, nom);
    // Le gros plan : la caméra s'approche du centre (champ privé, lu
    // ici comme outillage seulement).
    await pause(1800); // le demi-tour vers le joueur au trait finit d'abord
    await page.evaluate(() => { const s = window.__scene; s.zoom = 0.7; s.poserCamera(); });
    await pause(300);
    await capture(page, `${nom.replace('-1440', '')}-gros-plan-1440`);
    await ctx.close();
  }
  for (const [l, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page } = await ouvrir(l, h, true, gpu, '?plateau=vexel&tuiles=nacre');
    await page.waitForSelector('.carte-skins', { timeout: 10000 }).catch(() => rapport.erreurs.push(`${l}: carte skins absente du menu`));
    await pause(800);
    rapport.mesures[`skins-${l}`] = await page.evaluate(() => {
      const c = document.querySelector('.carte-skins');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const titre = c.querySelector('.carte-titre');
      const lh = titre ? parseFloat(getComputedStyle(titre).lineHeight) : 1;
      return { x: r.x, y: r.y, l: r.width, h: r.height, lignesTitre: titre ? Math.round(titre.getBoundingClientRect().height / lh) : 0, debord: document.documentElement.scrollWidth - innerWidth };
    });
    await page.evaluate(() => document.querySelector('.carte-skins')?.scrollIntoView({ block: 'center' }));
    await pause(300);
    await capture(page, `menu-skins-${l}`);
    await ctx.close();
  }
  if (gpu !== navigateur) await gpu.close();
}

await navigateur.close();
writeFileSync(path.join(SORTIE, `parties-${SEUL}.json`), JSON.stringify(rapport, null, 2));
console.log(JSON.stringify({ ...rapport, mesures: { ...rapport.mesures, plateau: rapport.mesures.plateau?.filter((_, i) => i % 2 === 0) } }, null, 1));
