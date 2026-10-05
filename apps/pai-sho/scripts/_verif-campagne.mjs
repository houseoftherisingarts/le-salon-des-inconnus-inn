// Vérification de la campagne : nom, menu, communauté, écran VS (à supprimer après).
import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/47816239-0b13-4c45-ae3d-85c37c977f4a/scratchpad/campagne/';
const URL = 'http://localhost:5179/?intro=0';
const navigateur = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const erreurs = [];
for (const [nom, vp, avatar] of [['1440', { width: 1440, height: 900 }, false], ['390', { width: 390, height: 844 }, true]]) {
  const page = await navigateur.newPage({ viewport: vp });
  page.on('pageerror', (e) => erreurs.push(`${nom}: ${e.message}`));
  await page.goto(URL);
  await page.evaluate((av) => {
    localStorage.clear();
    localStorage.setItem('paisho.tutoriel.paisho', '1');
    localStorage.setItem('paisho.langue.v2', av ? 'FR' : 'EN');
    if (av) localStorage.setItem('paisho.progression', JSON.stringify(['iroh', 'chou', 'aang']));
  }, avatar);
  await page.reload();
  await page.waitForSelector('[data-test=choix-nom]', { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}nom-${nom}.png` });
  await page.fill('[data-test=nom-saisie]', nom === '1440' ? 'Alexandre' : 'Krystine');
  await page.click('[data-test=nom-valider]');
  if (avatar) { await page.click('[data-test=avatar-ouvrir]'); await page.click('[data-test=porter-chou]'); }
  const nomGarde = await page.evaluate(() => JSON.parse(localStorage.getItem('paisho.joueur')).nom);
  console.log(nom, 'nom gardé :', nomGarde);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}menu-${nom}.png`, fullPage: true });
  await page.click('[data-test=communaute-ouvrir]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}communaute-${nom}.png` });
  await page.click('[data-test=communaute-ecran] .niveaux-tete .bouton');
  await page.click('[data-test=niveaux]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}niveaux-${nom}.png` });
  await page.click(avatar ? '[data-test=adv-irohek]' : '[data-test=adv-iroh]');
  console.log(nom, 'VS après un adversaire verrouillé :', await page.locator('[data-test=vs]').count());
  if (avatar) await page.click('[data-test=niveaux]'), await page.click('[data-test=adv-sokka]');
  else await page.click('[data-test=contre-maison]');
  await page.waitForSelector('[data-test=vs]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}vs-${nom}.png` });
  await page.waitForTimeout(1400);
  console.log(nom, 'VS encore là après 2,3 s :', await page.locator('[data-test=vs]').count(), '· menu :', await page.locator('.menu').count());
  await page.close();
}
console.log('erreurs :', erreurs.length ? erreurs : 'aucune');
await navigateur.close();
