// Temporaire : captures de la Communauté, tour trois. À supprimer.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const SCR = '/private/tmp/claude-501/-Users-lesalondesinconnus/47816239-0b13-4c45-ae3d-85c37c977f4a/scratchpad';
const OUT = `${SCR}/social`;
const r = crypto.randomBytes(3).toString('hex');
const mk = (l) => ({ email: `paisho.test.${r}.${l}@lesalondesinconnus.com`, mdp: crypto.randomBytes(9).toString('hex'), nom: `Testeur ${l.toUpperCase()}${r.slice(0, 3)}` });
const C = { r, a: mk('a'), b: mk('b') };
fs.writeFileSync(`${SCR}/comptes-test-3.json`, JSON.stringify(C));
const URL = 'http://localhost:5179/';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
const log = (...a) => console.log(...a);

async function ouvrir(n) {
  const nav = await chromium.launch({ args: ARGS });
  const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.addInitScript(([id]) => {
    localStorage.setItem('paisho.tutoriel.paisho', '1');
    if (!localStorage.getItem('paisho.joueur')) localStorage.setItem('paisho.joueur', JSON.stringify({ id, nom: 'Capture' }));
  }, [`paisho-${r}a${n}`]);
  await page.goto(URL);
  await page.waitForSelector('[data-test=communaute-ouvrir]', { timeout: 180000 });
  await pause(1500);
  return { nav, page };
}
const communaute = async (p) => { if (!(await p.locator('[data-test=communaute-ecran]').count())) await p.click('[data-test=communaute-ouvrir]'); await p.waitForSelector('[data-test=communaute-ecran]'); };
async function inscrire(p, c, photos) {
  await communaute(p);
  await p.waitForSelector('[data-test=se-connecter]', { timeout: 20000 });
  await p.click('[data-test=se-connecter]');
  await p.waitForSelector('[data-test=porte-compte]');
  if (photos) for (const [w, h] of [[1440, 900], [390, 844]]) { await p.setViewportSize({ width: w, height: h }); await pause(700); await p.screenshot({ path: `${OUT}/porte-${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-test=porte-inscription]');
  await p.fill('[data-test=porte-nom]', c.nom);
  await p.fill('[data-test=porte-courriel]', c.email);
  await p.fill('[data-test=porte-mdp]', c.mdp);
  await p.click('[data-test=porte-valider]');
  await p.waitForSelector('[data-test=profil]', { timeout: 30000 });
  await pause(1500);
}

const [a, b] = await Promise.all([1, 2].map(ouvrir));
const A = a.page, B = b.page;
try {
  // Le menu à 1440 : la mesure du plateau projeté contre la colonne des cartes, après le recadrage.
  await pause(2500);
  const mesure = await A.evaluate(async () => {
    const m = await import('/src/scene/mesures.ts');
    const s = window.__scene, cam = s.camera;
    let gaucheTable = Infinity;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      for (const y of [0, m.DESSUS]) {
        const v = cam.position.clone().set(Math.cos(a) * m.DEMI_CADRE, y, Math.sin(a) * m.DEMI_CADRE).project(cam);
        gaucheTable = Math.min(gaucheTable, ((v.x + 1) / 2) * innerWidth);
      }
    }
    const cartes = [...document.querySelectorAll('.menu-cartes > *')].map((e) => e.getBoundingClientRect()).filter((r) => r.top < innerHeight * 0.45 && r.left < innerWidth / 2);
    return { bordGauchePlateau: Math.round(gaucheTable), bordDroitColonne: Math.round(Math.max(...cartes.map((r) => r.right))), cadre: s.cadre };
  });
  log('mesure 1440x900', JSON.stringify(mesure), mesure.bordGauchePlateau > mesure.bordDroitColonne ? 'PLATEAU DÉGAGÉ' : 'CHEVAUCHEMENT');
  await A.screenshot({ path: `${OUT}/menu-carte-out-1440.png` });
  await A.evaluate(() => { const m = document.querySelector('.menu'); m.scrollTop = m.scrollHeight; });
  await pause(400);
  await A.screenshot({ path: `${OUT}/menu-carte-out-1440-bas.png` });
  await A.evaluate(() => { document.querySelector('.menu').scrollTop = 0; });
  await A.setViewportSize({ width: 390, height: 844 }); await pause(1500);
  await A.evaluate(() => { const m = document.querySelector('.menu'); m.scrollTop = m.scrollHeight; });
  await pause(400);
  await A.screenshot({ path: `${OUT}/menu-carte-out-390.png` });
  await A.evaluate(() => { document.querySelector('.menu').scrollTop = 0; });
  await A.setViewportSize({ width: 1440, height: 900 }); await pause(800);

  await inscrire(A, C.a, true);
  await inscrire(B, C.b, false);
  await A.fill('[data-test=chercher]', C.b.nom);
  await A.press('[data-test=chercher]', 'Enter');
  await A.waitForSelector('[data-test^=ajouter-]', { timeout: 15000 });
  await A.click('[data-test^=ajouter-]');
  await B.waitForSelector('[data-test=accepter-ami]', { timeout: 20000 });
  await B.click('[data-test=accepter-ami]');
  await A.waitForSelector(`[data-test=liste-amis] .ami-ligne:not(.attente):has-text("${C.b.nom}")`, { timeout: 30000 });
  await pause(2000);

  // Table ouverte vue par B, défilement à zéro.
  await A.click('[data-test=ouvrir-table]');
  await B.waitForSelector('.table-ouverte', { timeout: 30000 });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await B.setViewportSize({ width: w, height: h }); await pause(800);
    await B.evaluate(() => document.querySelectorAll('.communaute, .niveaux-voile').forEach((e) => { e.scrollTop = 0; }));
    await pause(300);
    log('table', w, await B.$eval('.table-ouverte .bouton', (e) => { const r = e.getBoundingClientRect(); return { haut: Math.round(r.top), bas: Math.round(r.bottom), h: innerHeight }; }));
    await B.screenshot({ path: `${OUT}/table-ouverte-${w}.png` });
  }

  // Recherche d'un inconnu, sur un menu frais.
  await A.goto(URL);
  await A.waitForSelector('[data-test=communaute-ouvrir]', { timeout: 180000 });
  await pause(1500);
  await communaute(A);
  await A.waitForSelector('[data-test=defier-inconnu]:not([disabled])', { timeout: 30000 });
  await A.click('[data-test=defier-inconnu]');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await A.setViewportSize({ width: w, height: h }); await pause(800);
    await A.waitForSelector('[data-test=recherche] .defi-dialogue', { state: 'visible', timeout: 20000 });
    await A.locator('#recherche-titre').filter({ hasText: /Looking for an opponent|recherche d’un adversaire/ }).waitFor({ state: 'visible', timeout: 20000 });
    await pause(1200);
    log('recherche', w, await A.$eval('[data-test=recherche] .defi-dialogue', (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), opacite: getComputedStyle(e).opacity }; }));
    await A.screenshot({ path: `${OUT}/recherche-${w}.png` });
  }
  log('captures faites');
} catch (e) {
  log('ÉCHEC', String(e.message).split('\n')[0]);
  await A.screenshot({ path: `${SCR}/_echec-A.png` }).catch(() => {});
  await B.screenshot({ path: `${SCR}/_echec-B.png` }).catch(() => {});
}
await Promise.all([a, b].map((x) => x.nav.close()));
