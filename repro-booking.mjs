// Repro: flow de réservation live — home → chambre → « Choisir Cette Chambre »
// → overlay iframe Hostaway → avancer jusqu'au bouton final du checkout.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-CA' });
const page = await ctx.newPage();

const logs = [];
const note = (s) => { logs.push(s); };
page.on('console', (m) => { if (m.type() === 'error') note(`[console.error] ${m.text().slice(0, 250)}`); });
page.on('pageerror', (e) => note(`[pageerror] ${String(e).slice(0, 250)}`));
page.on('requestfailed', (r) => note(`[reqfail] ${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) note(`[http ${r.status()}] ${r.url().slice(0, 140)}`); });

console.log('1. Home…');
await page.goto('https://www.lesalondesinconnus.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

// Ouvrir une chambre: chercher un élément qui ouvre le RoomOrbModal
const roomNames = ['La Méditante', 'La Bergère', 'Méditante', 'Bergère', 'La Chambre'];
let opened = false;
for (const n of roomNames) {
  const el = page.locator(`text=${n}`).first();
  if (await el.count()) {
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1500);
    if (await el.isVisible().catch(() => false)) {
      console.log(`2. Clic chambre "${n}"`);
      await el.click({ timeout: 5000, force: true }).catch((e) => console.log('   raté:', e.message.split('\n')[0]));
      opened = true;
      break;
    }
  }
}
if (!opened) {
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(600); }
  const texts = await page.evaluate(() => [...document.querySelectorAll('button,a,[role=button]')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0, 50)).filter(Boolean).slice(0, 60));
  console.log('   éléments cliquables:', JSON.stringify(texts));
}
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/10-modal.png` });

// 3. « Choisir Cette Chambre »
const chooseBtn = page.locator('text=/Choisir Cette Chambre|Choose This Room/i').first();
if (await chooseBtn.count()) {
  await chooseBtn.scrollIntoViewIfNeeded().catch(() => {});
  console.log('3. Clic « Choisir Cette Chambre »');
  await chooseBtn.click({ timeout: 5000 }).catch((e) => console.log('   raté:', e.message.split('\n')[0]));
} else {
  console.log('3. Bouton Choisir introuvable');
}
await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}/11-overlay.png` });

// 4. Iframe Hostaway
const frame = page.frames().find((f) => f.url().includes('holidayfuture') || f.url().includes('hostaway'));
console.log('4. Iframe:', frame ? frame.url() : 'AUCUN IFRAME HOSTAWAY');
if (frame) {
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/12-iframe-loaded.png`, fullPage: false });
  const inner = await frame.evaluate(() => document.body?.innerText.slice(0, 600)).catch((e) => 'frame eval err: ' + e.message);
  console.log('   contenu iframe (début):', JSON.stringify(inner));
}

console.log('\n--- LOGS (40 max) ---');
logs.slice(0, 40).forEach((l) => console.log(l));
await browser.close();
