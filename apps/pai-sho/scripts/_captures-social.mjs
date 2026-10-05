// Temporaire : captures de la Communauté, tour deux. À supprimer.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const SCR = '/private/tmp/claude-501/-Users-lesalondesinconnus/47816239-0b13-4c45-ae3d-85c37c977f4a/scratchpad';
const OUT = `${SCR}/social`;
const r = crypto.randomBytes(3).toString('hex');
const mk = (l) => ({ email: `paisho.test.${r}.${l}@lesalondesinconnus.com`, mdp: crypto.randomBytes(9).toString('hex'), nom: `Testeur ${l.toUpperCase()}${r.slice(0, 3)}` });
const C = { r, a: mk('a'), b: mk('b'), c: mk('c') };
fs.writeFileSync(`${SCR}/comptes-test-2.json`, JSON.stringify(C));
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
async function photo(page, nom, attendre, cible) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await pause(700);
    if (attendre) await page.waitForSelector(attendre, { state: 'visible', timeout: 20000 });
    if (cible) await page.locator(cible).first().scrollIntoViewIfNeeded().catch(() => {});
    await pause(300);
    await page.screenshot({ path: `${OUT}/${nom}-${w}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await pause(300);
}
const communaute = async (p) => { if (!(await p.locator('[data-test=communaute-ecran]').count())) await p.click('[data-test=communaute-ouvrir]'); await p.waitForSelector('[data-test=communaute-ecran]'); };
async function inscrire(p, c, photos) {
  await communaute(p);
  await p.waitForSelector('[data-test=se-connecter]', { timeout: 20000 });
  if (photos) await photo(p, 'communaute-out', '[data-test=se-connecter]');
  await p.click('[data-test=se-connecter]');
  await p.waitForSelector('[data-test=porte-compte]');
  if (photos) {
    await photo(p, 'porte', '[data-test=porte-compte]');
    await p.setViewportSize({ width: 390, height: 844 });
    log('liens porte 390', await p.$$eval('.porte-liens .bouton', (l) => l.map((b) => Math.round(b.getBoundingClientRect().height))));
    await p.setViewportSize({ width: 1440, height: 900 });
  }
  await p.click('[data-test=porte-inscription]');
  await p.fill('[data-test=porte-nom]', c.nom);
  await p.fill('[data-test=porte-courriel]', c.email);
  await p.fill('[data-test=porte-mdp]', c.mdp);
  await p.click('[data-test=porte-valider]');
  await p.waitForSelector('[data-test=profil]', { timeout: 30000 });
  await pause(1500);
}
const ecrireA = async (p, nom, texte) => {
  await p.click(`[data-test=liste-amis] .ami-ligne:has-text("${nom}") [data-test^=ecrire-]`);
  await p.waitForSelector('[data-test=fil-saisie]');
  await pause(800);
  await p.fill('[data-test=fil-saisie]', texte);
  await p.click('[data-test=fil-envoyer]');
  await pause(800);
};
const fermerFil = (p) => p.click('[data-test=fil] .fil-tete .bouton');

const [a, b, c] = await Promise.all([1, 2, 3].map(ouvrir));
const A = a.page, B = b.page, Cc = c.page;
try {
  // Le menu, déconnecté, défilé jusqu'au bas.
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await A.setViewportSize({ width: w, height: h }); await pause(800);
    await A.evaluate(() => { const m = document.querySelector('.menu'); m.scrollTop = m.scrollHeight; });
    await pause(400);
    await A.screenshot({ path: `${OUT}/menu-carte-out-${w}.png` });
    log('menu', w, await A.evaluate(() => { const m = document.querySelector('.menu'); const c = [...document.querySelectorAll('.menu-cartes > *')].map((e) => Math.round(e.getBoundingClientRect().bottom)); return { scroll: m.scrollHeight > m.clientHeight, bas: Math.max(...c), h: innerHeight }; }));
  }
  await A.setViewportSize({ width: 1440, height: 900 });

  await inscrire(A, C.a, true);
  await inscrire(B, C.b, false);
  await inscrire(Cc, C.c, false);
  log('trois comptes créés');

  // A ajoute B, B accepte.
  await A.fill('[data-test=chercher]', C.b.nom);
  await A.press('[data-test=chercher]', 'Enter');
  await A.waitForSelector('[data-test^=ajouter-]', { timeout: 15000 });
  await A.click('[data-test^=ajouter-]');
  log('champ vidé après Ajouter :', (await A.inputValue('[data-test=chercher]')) === '');
  await B.waitForSelector('[data-test=accepter-ami]', { timeout: 20000 });
  await B.click('[data-test=accepter-ami]');
  await A.waitForSelector(`[data-test=liste-amis] .ami-ligne:not(.attente):has-text("${C.b.nom}") .visage-point.oui`, { timeout: 30000 });
  await pause(1500);
  await photo(A, 'communaute-in', '[data-test=profil]');
  await A.setViewportSize({ width: 390, height: 844 });
  log('cibles < 44 px à 390 :', await A.$$eval('.communaute .bouton, .communaute .saisie', (l) => l.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent?.trim() || e.className)));
  await A.setViewportSize({ width: 1440, height: 900 });

  // Profil
  await A.click('[data-test=profil-modifier]');
  await A.waitForSelector('[data-test=profil-editeur]');
  await A.fill('[data-test=profil-editeur] textarea', 'Joueur de test, amateur de lotus blanc.');
  await A.click('.editeur-banniere >> nth=2');
  await photo(A, 'profil-editeur', '[data-test=profil-editeur]', '.editeur-bannieres');
  await A.click('[data-test=profil-enregistrer]');
  await A.waitForSelector('[data-test=profil-editeur]', { state: 'detached' });

  // Messages à deux
  await ecrireA(A, C.b.nom, 'Bonjour de A');
  await ecrireA(B, C.a.nom, 'Salut A, ici B');
  await A.waitForSelector('[data-test=fil-messages] .bulle:has-text("ici B")', { timeout: 15000 });
  await photo(A, 'fil', '[data-test=fil]');
  await fermerFil(A);

  // Salon de groupe
  await A.click('[data-test=creer-groupe]');
  await A.fill('[data-test=groupe-nom]', 'Les lotus du jeudi');
  await A.click(`[data-test=groupe-dialogue] .perso:has-text("${C.b.nom}")`);
  await A.click('[data-test=groupe-creer]');
  await A.waitForSelector('[data-test=fil]', { timeout: 15000 });
  await A.fill('[data-test=fil-saisie]', 'Partie jeudi soir ?');
  await A.click('[data-test=fil-envoyer]');
  await fermerFil(B);
  await B.waitForSelector('[data-test^=salon-]', { timeout: 15000 });
  await B.click('[data-test^=salon-]');
  await B.waitForSelector('[data-test=fil-messages] .bulle:has-text("jeudi soir")', { timeout: 15000 });
  await B.fill('[data-test=fil-saisie]', 'Jeudi me va.');
  await B.click('[data-test=fil-envoyer]');
  await A.waitForSelector('.bulle:has-text("Jeudi me va")', { timeout: 15000 });
  await photo(A, 'salon', '[data-test=fil]');
  await fermerFil(A);
  await fermerFil(B);

  // B laisse deux mots non lus; C demande A en ami.
  await ecrireA(B, C.a.nom, 'Tu es là ?');
  await B.fill('[data-test=fil-saisie]', 'Je t’attends à la table.');
  await B.click('[data-test=fil-envoyer]');
  await pause(800);
  await fermerFil(B);
  await Cc.fill('[data-test=chercher]', C.a.nom);
  await Cc.press('[data-test=chercher]', 'Enter');
  await Cc.waitForSelector('[data-test^=ajouter-]', { timeout: 15000 });
  await Cc.click('[data-test^=ajouter-]');
  await A.waitForSelector('[data-test=accepter-ami]', { timeout: 20000 });
  await A.waitForSelector('[data-test=messages] .fil-ligne .pastille', { timeout: 20000 });
  await pause(1000);
  log('pastilles messages :', await A.$$eval('[data-test=messages] .pastille', (l) => l.map((e) => e.textContent)));
  await photo(A, 'amis', '[data-test=accepter-ami]', '[data-test=amis]');

  // Table ouverte vue par B
  await A.click('[data-test=ouvrir-table]');
  await B.waitForSelector('.table-ouverte', { timeout: 30000 });
  await photo(B, 'table-ouverte', '.table-ouverte', '[data-test=distance]');
  log('boutons Rejoindre chez B :', await B.$$eval('[data-test=communaute-ecran] .bouton', (l) => l.map((e) => e.textContent).filter((t) => /join|rejoindre/i.test(t))));

  // Défi
  await A.click(`[data-test=liste-amis] .ami-ligne:has-text("${C.b.nom}") [data-test^=defier-]`);
  await A.waitForSelector('[data-test=defi-envoye]');
  await B.waitForSelector('[data-test=defi-recu]', { timeout: 30000 });
  await pause(800);
  await photo(A, 'defi', '[data-test=defi-envoye] .defi-dialogue');
  await photo(B, 'defi-recu', '[data-test=defi-recu] .defi-dialogue');
  for (const w of [1440, 390]) {
    await B.setViewportSize({ width: w, height: 844 }); await pause(400);
    log('titre défi reçu', w, await B.$eval('#defi-recu-titre', (h) => [...h.children].map((s) => `${s.textContent} (${Math.round(s.getBoundingClientRect().height)}px)`)));
  }
  await B.setViewportSize({ width: 1440, height: 900 });

  // Recherche d'un inconnu, sur un menu frais.
  await A.goto(URL);
  await A.waitForSelector('[data-test=communaute-ouvrir]', { timeout: 180000 });
  await pause(1500);
  await communaute(A);
  await A.waitForSelector('[data-test=defier-inconnu]:not([disabled])', { timeout: 30000 });
  await A.click('[data-test=defier-inconnu]');
  await photo(A, 'recherche', '[data-test=recherche] .defi-dialogue');
  log('captures faites');
} catch (e) {
  log('ÉCHEC', String(e.message).split('\n')[0]);
  await A.screenshot({ path: `${SCR}/_echec-A.png` }).catch(() => {});
  await B.screenshot({ path: `${SCR}/_echec-B.png` }).catch(() => {});
}
await Promise.all([a, b, c].map((x) => x.nav.close()));
