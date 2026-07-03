// Repro phase 3: dates → Book now → checkout → bouton final « Compléter la réservation »
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-CA' });
const page = await ctx.newPage();

const logs = [];
const note = (s) => logs.push(s);
page.on('console', (m) => { if (m.type() === 'error') note(`[console.error] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => note(`[pageerror] ${String(e).slice(0, 300)}`));
page.on('requestfailed', (r) => { if (!/wsrv\.nl/.test(r.url())) note(`[reqfail] ${r.url().slice(0, 160)} :: ${r.failure()?.errorText}`); });
page.on('response', (r) => { if (r.status() >= 400 && !/wsrv\.nl/.test(r.url())) note(`[http ${r.status()}] ${r.url().slice(0, 180)}`); });
page.on('request', (r) => { if (r.method() === 'POST' && /hostaway\.com|holidayfuture|stripe/i.test(r.url())) note(`[POST] ${r.url().slice(0, 180)}`); });
page.on('popup', (p) => note(`[POPUP] ${p.url().slice(0, 160)}`));
page.on('framenavigated', (f) => { if (f.url().includes('holidayfuture')) note(`[frame-nav] ${f.url().slice(0, 160)}`); });

console.log('1. Home + chambre + choisir…');
await page.goto('https://www.lesalondesinconnus.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const room = page.locator('text=La Méditante').first();
await room.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(1500);
await room.click({ force: true });
await page.waitForTimeout(3000);
await page.locator('text=/Choisir Cette Chambre|Choose This Room/i').first().click();
await page.waitForTimeout(9000);
let frame = page.frames().find((f) => f.url().includes('holidayfuture'));
if (!frame) { console.log('PAS D IFRAME'); await browser.close(); process.exit(1); }

// 2. Ouvrir le sélecteur de dates
console.log('2. Ouverture du date picker…');
await frame.locator('text=Select Dates').first().click({ timeout: 8000 }).catch(async (e) => {
  console.log('   clic Select Dates raté:', e.message.split('\n')[0]);
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/30-datepicker.png` });

// 3. Choisir 2 jours disponibles (boutons de jour non désactivés)
const dayInfo = await frame.evaluate(() => {
  const all = [...document.querySelectorAll('button, td, div[role=button], [class*=day]')]
    .filter((el) => /^\d{1,2}$/.test(el.textContent.trim()))
    .filter((el) => el.offsetParent)
    .map((el) => ({
      tag: el.tagName, txt: el.textContent.trim(),
      cls: (el.className || '').toString().slice(0, 80),
      disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
    }));
  return all.slice(0, 15);
});
console.log('   cellules jour:', JSON.stringify(dayInfo, null, 1).slice(0, 1500));

// clique 2 jours dispo consécutifs via texte (ex 20 et 22 juillet)
const clickDay = async (n) => {
  const el = frame.locator(`button:not([disabled]):text-is("${n}"), td:text-is("${n}"), div[role=button]:text-is("${n}")`).first();
  if (await el.count()) { await el.click({ timeout: 4000 }).catch(() => {}); return true; }
  return false;
};
const d1 = await clickDay('20'); await page.waitForTimeout(1200);
const d2 = await clickDay('22'); await page.waitForTimeout(2500);
console.log(`3. Jours cliqués: 20=${d1} 22=${d2}`);
await page.screenshot({ path: `${OUT}/31-dates-picked.png` });

// 4. Book now
console.log('4. Book now…');
await frame.locator('button:has-text("Book now")').first().click({ timeout: 8000 }).catch((e) => console.log('   raté:', e.message.split('\n')[0]));
await page.waitForTimeout(10000);
frame = page.frames().find((f) => f.url().includes('holidayfuture'));
console.log('   frame url:', frame?.url());
await page.screenshot({ path: `${OUT}/32-after-booknow.png` });

// 5. Si on est au checkout: remplir + bouton final
if (frame && /checkout|book/i.test(frame.url())) {
  const finalBtns = await frame.evaluate(() => [...document.querySelectorAll('button')].map(b => ({ txt: b.textContent.trim().slice(0, 60), disabled: b.disabled })).filter(b => b.txt));
  console.log('5. Boutons checkout:', JSON.stringify(finalBtns, null, 1).slice(0, 1200));
}

console.log('\n--- LOGS ---');
logs.slice(0, 60).forEach((l) => console.log(l));
await browser.close();
