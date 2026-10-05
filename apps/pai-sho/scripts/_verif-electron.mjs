// Temporaire : connexion par courriel depuis dist/ en file:// avec un userAgent Electron, et captures retouchées. À supprimer.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SCR = '/private/tmp/claude-501/-Users-lesalondesinconnus/47816239-0b13-4c45-ae3d-85c37c977f4a/scratchpad';
const OUT = `${SCR}/social`;
const C = JSON.parse(fs.readFileSync(`${SCR}/comptes-test.json`, 'utf8'));
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await chromium.launch({ args: ARGS });

async function page(url, ua) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, ...(ua ? { userAgent: ua } : {}) });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 160)));
  await p.addInitScript(() => { try { localStorage.setItem('paisho.tutoriel.paisho', '1'); localStorage.setItem('paisho.joueur', JSON.stringify({ id: 'paisho-capture9', nom: 'Capture' })); } catch {} });
  await p.goto(url);
  await p.waitForSelector('.menu', { timeout: 180000 });
  await pause(1000);
  return p;
}
async function photo(p, nom) {
  for (const [w, h] of [[1440, 900], [390, 844]]) { await p.setViewportSize({ width: w, height: h }); await pause(900); await p.screenshot({ path: `${OUT}/${nom}-${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
}

// 1. Electron : file:// et userAgent Electron
const fichier = 'file://' + path.resolve('dist/index.html');
const E = await page(fichier, 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130.0 Electron/33.0.0 Safari/537.36');
await E.click('[data-test=communaute-ouvrir]');
await E.waitForSelector('[data-test=se-connecter]', { timeout: 30000 });
await E.click('[data-test=se-connecter]');
const google = await E.locator('[data-test=porte-compte] button:has-text("Google")').count();
console.log(google === 0 ? 'PASS' : 'FAIL', 'Electron : bouton Google caché -', google, 'bouton(s) Google');
await E.fill('[data-test=porte-courriel]', C.a.email);
await E.fill('[data-test=porte-mdp]', C.a.mdp);
await E.click('[data-test=porte-valider]');
const ok = await E.waitForSelector('[data-test=profil]', { timeout: 30000 }).then(() => true, () => false);
console.log(ok ? 'PASS' : 'FAIL', 'Electron : connexion par courriel en file:// -', ok ? await E.textContent('.profil-nom') : await E.textContent('[data-test=porte-compte]').catch(() => '?'));
if (ok) {
  await pause(2000);
  await E.click('[data-test=profil-modifier]');
  await E.waitForSelector('[data-test=profil-editeur]');
  await photo(E, 'profil-editeur');
}

// 2. Déconnecté, au serveur de développement : la section ouverte et la carte du menu
const W = await page('http://localhost:5179/');
await photo(W, 'menu-carte-out');
await W.click('[data-test=communaute-ouvrir]');
await W.waitForSelector('[data-test=se-connecter]', { timeout: 30000 });
await photo(W, 'communaute-out');
await W.click('[data-test=se-connecter]');
await W.waitForSelector('[data-test=porte-compte]');
await photo(W, 'porte');
process.exit(0);
