import { chromium } from 'playwright';
const URL = process.argv[2] + '?intro=0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function ouvrir() {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 120)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => localStorage.setItem('paisho.tutoriel.paisho', '1'));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const porte = page.locator('[data-test=porte]'); if (await porte.count()) await porte.click();
  await page.waitForSelector('[data-test=niveaux]', { timeout: 90000 });
  await page.waitForTimeout(1000);
  return page;
}
// Les candidats ICE avec la config du jeu : un « relay » prouve que le TURN répond.
const sonde = await b.newPage();
await sonde.goto('about:blank');
console.log('ICE', await sonde.evaluate(() => new Promise((ok) => {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }] });
  const types = new Set(); pc.createDataChannel('x');
  pc.onicecandidate = (e) => { if (e.candidate) types.add(e.candidate.type); else ok([...types]); };
  pc.createOffer().then((o) => pc.setLocalDescription(o));
  setTimeout(() => ok([...types, 'timeout']), 15000);
})));
const hote = await ouvrir(); const invite = await ouvrir();
const id = await hote.evaluate(() => JSON.parse(localStorage.getItem('paisho.joueur')).id);
await hote.getByRole('button', { name: /Open a table|Ouvrir une table/ }).click();
await hote.waitForTimeout(3000);
await invite.locator('input[placeholder="paisho-xxxxxxxx"]').fill(id);
await invite.getByRole('button', { name: /^Join$|^Rejoindre$/ }).click();
await invite.waitForTimeout(12000);
for (const [nom, p] of [['hote', hote], ['invite', invite]]) {
  console.log(nom, JSON.stringify({ etat: await p.locator('.etat-lien').allTextContents(), menu: await p.locator('.menu').count(), partie: await p.evaluate(() => !!window.__partie), erreur: await p.locator('.etat-lien.erreur').allTextContents() }));
}
await b.close();
