// Temporaire : captures et test à deux comptes de la Communauté. À supprimer.
import { chromium } from 'playwright';
import fs from 'node:fs';

const SCR = '/private/tmp/claude-501/-Users-lesalondesinconnus/47816239-0b13-4c45-ae3d-85c37c977f4a/scratchpad';
const OUT = `${SCR}/social`;
const C = JSON.parse(fs.readFileSync(`${SCR}/comptes-test.json`, 'utf8'));
const URL = 'http://localhost:5179/';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const erreurs = [];
const ok = (nom, passe, ligne) => { res.push({ nom, passe, ligne }); console.log(passe ? 'PASS' : 'FAIL', nom, '-', ligne); };
const ETAPE = process.env.ETAPE ?? 'tout';

const nav = await chromium.launch({ args: ARGS });
async function ouvrir(qui, n) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erreurs.push(`${qui}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(`${qui} console: ${m.text().slice(0, 200)}`); });
  await page.addInitScript(([id]) => {
    localStorage.setItem('paisho.tutoriel.paisho', '1');
    if (!localStorage.getItem('paisho.joueur')) localStorage.setItem('paisho.joueur', JSON.stringify({ id, nom: 'Capture' }));
  }, [`paisho-verif${C.r}${n}`]);
  await page.goto(URL);
  await page.waitForSelector('.menu', { timeout: 60000 });
  await pause(800);
  return page;
}
async function photo(page, nom, cible) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await pause(500);
    if (cible) await page.locator(cible).first().scrollIntoViewIfNeeded().catch(() => {});
    await pause(200);
    await page.screenshot({ path: `${OUT}/${nom}-${w}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await pause(300);
}
const communaute = async (p) => { if (!(await p.locator('[data-test=communaute-ecran]').count())) await p.click('[data-test=communaute-ouvrir]'); await p.waitForSelector('[data-test=communaute-ecran]'); };
async function inscrire(p, c, photos) {
  await communaute(p);
  await p.waitForSelector('[data-test=se-connecter]', { timeout: 20000 });
  if (photos) await photo(p, 'communaute-out');
  await p.click('[data-test=se-connecter]');
  await p.waitForSelector('[data-test=porte-compte]');
  if (photos) await photo(p, 'porte');
  await p.click('[data-test=porte-inscription]');
  await p.fill('[data-test=porte-nom]', c.nom);
  await p.fill('[data-test=porte-courriel]', c.email);
  await p.fill('[data-test=porte-mdp]', c.mdp);
  await p.click('[data-test=porte-valider]');
  await p.waitForSelector('[data-test=profil]', { timeout: 30000 });
  await pause(1500);
}

const A = await ouvrir('A', 1);
const B = await ouvrir('B', 2);
try {
  await inscrire(A, C.a, true);
  await inscrire(B, C.b, false);
  ok('inscription', true, `deux comptes créés, ${C.a.nom} et ${C.b.nom}`);
  const nomMenu = await A.evaluate(() => document.querySelector('[data-test=profil] .profil-nom')?.textContent);
  ok('nom du compte', nomMenu === C.a.nom, `profil affiche « ${nomMenu} »`);

  // Amitié
  await A.fill('[data-test=chercher]', C.b.nom);
  await A.press('[data-test=chercher]', 'Enter');
  await A.waitForSelector('[data-test^=ajouter-]', { timeout: 15000 });
  await A.click('[data-test^=ajouter-]');
  await B.waitForSelector('[data-test=accepter-ami]', { timeout: 20000 });
  await B.click('[data-test=accepter-ami]');
  await A.waitForSelector(`[data-test=liste-amis] .ami-ligne:not(.attente):has-text("${C.b.nom}")`, { timeout: 20000 });
  ok('amitié acceptée', true, `A voit ${C.b.nom} dans sa liste`);
  await pause(2500);
  const enLigne = await A.locator(`[data-test=liste-amis] .ami-ligne:has-text("${C.b.nom}") .visage-point.oui`).count();
  ok('présence', enLigne > 0, enLigne ? 'point vert visible' : 'pas de point vert');
  await photo(A, 'communaute-in');
  await photo(A, 'amis', '[data-test=amis]');

  // Profil
  await A.click('[data-test=profil-modifier]');
  await A.waitForSelector('[data-test=profil-editeur]');
  await A.fill('[data-test=profil-editeur] textarea', 'Joueur de test, amateur de lotus blanc.');
  await A.click('.editeur-banniere >> nth=2');
  await photo(A, 'profil-editeur');
  await A.click('[data-test=profil-enregistrer]');
  await A.waitForSelector('[data-test=profil-editeur]', { state: 'detached' });
  await pause(1200);
  const bio = await A.textContent('.profil-bio');
  ok('profil enregistré', bio.includes('lotus blanc'), `bio : ${bio}`);

  // Messages à deux
  await A.click(`[data-test=liste-amis] .ami-ligne:has-text("${C.b.nom}") [data-test^=ecrire-]`);
  await A.waitForSelector('[data-test=fil]');
  await A.waitForSelector('[data-test=fil-envoyer]:not([disabled]), [data-test=fil-saisie]');
  await A.fill('[data-test=fil-saisie]', 'Bonjour de A');
  await A.click('[data-test=fil-envoyer]');
  await B.click(`[data-test=liste-amis] .ami-ligne:has-text("${C.a.nom}") [data-test^=ecrire-]`);
  const recuB = await B.waitForSelector('[data-test=fil-messages] .bulle:has-text("Bonjour de A")', { timeout: 15000 }).then(() => true, () => false);
  await B.fill('[data-test=fil-saisie]', 'Salut A, ici B');
  await B.click('[data-test=fil-envoyer]');
  const recuA = await A.waitForSelector('[data-test=fil-messages] .bulle:has-text("ici B")', { timeout: 15000 }).then(() => true, () => false);
  ok('message dans les deux sens', recuA && recuB, `B reçoit : ${recuB}, A reçoit : ${recuA}`);
  await photo(A, 'fil');
  await A.click('[data-test=fil] .fil-tete .bouton');
  await B.click('[data-test=fil] .fil-tete .bouton');

  // Salon de groupe
  await A.click('[data-test=creer-groupe]');
  await A.fill('[data-test=groupe-nom]', 'Les lotus du jeudi');
  await A.click(`[data-test=groupe-dialogue] .perso:has-text("${C.b.nom}")`);
  await A.click('[data-test=groupe-creer]');
  await A.waitForSelector('[data-test=fil]', { timeout: 15000 });
  await A.fill('[data-test=fil-saisie]', 'Partie jeudi soir ?');
  await A.click('[data-test=fil-envoyer]');
  const salonB = await B.waitForSelector('[data-test^=salon-]', { timeout: 15000 }).then(() => true, () => false);
  if (salonB) { await B.click('[data-test^=salon-]'); }
  const msgSalon = await B.waitForSelector('[data-test=fil-messages] .bulle:has-text("jeudi soir")', { timeout: 15000 }).then(() => true, () => false);
  if (msgSalon) { await B.fill('[data-test=fil-saisie]', 'Jeudi me va.'); await B.click('[data-test=fil-envoyer]'); await A.waitForSelector('.bulle:has-text("Jeudi me va")', { timeout: 10000 }).catch(() => {}); }
  ok('salon de groupe', salonB && msgSalon, `B voit le salon : ${salonB}, le message : ${msgSalon}`);
  await photo(A, 'salon');
  await A.click('[data-test=fil] .fil-tete .bouton');
  if (salonB) await B.click('[data-test=fil] .fil-tete .bouton');

  // Table ouverte
  await A.click('[data-test=ouvrir-table]');
  const table = await B.waitForSelector('.table-ouverte', { timeout: 20000 }).then(() => true, () => false);
  ok('table ouverte visible', table, table ? await B.textContent('.table-ouverte span') : 'aucune table chez B');
  await photo(B, 'table-ouverte', '.table-ouverte');

  // Défi
  await A.click(`[data-test=liste-amis] .ami-ligne:has-text("${C.b.nom}") [data-test^=defier-]`);
  await A.waitForSelector('[data-test=defi-envoye]');
  await pause(800);
  await B.waitForSelector('[data-test=defi-recu]', { timeout: 20000 });
  await photo(A, 'defi');
  await photo(B, 'defi-recu');
  await B.click('[data-test=defi-accepter]');
  const [hA, hB] = await Promise.all([A, B].map((p) => p.waitForSelector('.hud-haut', { timeout: 40000 }).then(() => true, () => false)));
  ok('défi accepté jusqu’à la partie', hA && hB, `hud-haut chez A : ${hA}, chez B : ${hB}`);
  const nomsHud = await A.evaluate(() => document.querySelector('.hud-haut')?.textContent?.replace(/\s+/g, ' ').slice(0, 120));
  ok('nom du compte dans la partie', nomsHud?.includes(C.a.nom) && nomsHud?.includes(C.b.nom), `hud A : ${nomsHud}`);

  // File d'attente
  await Promise.all([A, B].map(async (p) => { await p.goto(URL); await p.waitForSelector('.menu', { timeout: 60000 }); await pause(1500); await communaute(p); await p.waitForSelector('[data-test=defier-inconnu]', { timeout: 20000 }); }));
  await A.click('[data-test=defier-inconnu]');
  await A.waitForSelector('[data-test=recherche]');
  await pause(1200);
  await photo(A, 'recherche');
  await B.click('[data-test=defier-inconnu]');
  const [mA, mB] = await Promise.all([A, B].map((p) => p.waitForSelector('.hud-haut', { timeout: 45000 }).then(() => true, () => false)));
  ok('appariement par la file', mA && mB, `hud-haut chez A : ${mA}, chez B : ${mB}`);
} catch (e) {
  ok('déroulé', false, String(e.message).split('\n')[0]);
  await A.screenshot({ path: `${OUT}/_echec-A.png` }).catch(() => {});
  await B.screenshot({ path: `${OUT}/_echec-B.png` }).catch(() => {});
}
fs.writeFileSync(`${SCR}/social-rapport.json`, JSON.stringify({ res, erreurs }, null, 2));
console.log('erreurs page :', erreurs.length, erreurs.slice(0, 8));
await nav.close();
