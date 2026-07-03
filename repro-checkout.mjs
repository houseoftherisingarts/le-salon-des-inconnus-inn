// Repro phase 2: dans l'iframe Hostaway, choisir des dates, Book now,
// remplir le checkout, cliquer le bouton final. Observer ce qui casse.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-CA' });
const page = await ctx.newPage();

const logs = [];
const note = (s) => logs.push(s);
page.on('console', (m) => { if (m.type() === 'error') note(`[console.error] ${m.text().slice(0, 250)}`); });
page.on('pageerror', (e) => note(`[pageerror] ${String(e).slice(0, 250)}`));
page.on('requestfailed', (r) => note(`[reqfail] ${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) note(`[http ${r.status()}] ${r.url().slice(0, 160)}`); });
// Voir les POST de réservation
page.on('request', (r) => { if (r.method() === 'POST' && /hostaway|holidayfuture|reservation|checkout|stripe/i.test(r.url())) note(`[POST] ${r.url().slice(0, 160)}`); });

console.log('1. Home + ouverture chambre…');
await page.goto('https://www.lesalondesinconnus.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const room = page.locator('text=La Méditante').first();
await room.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(1500);
await room.click({ force: true });
await page.waitForTimeout(3000);
await page.locator('text=/Choisir Cette Chambre|Choose This Room/i').first().click();
await page.waitForTimeout(9000);

const frame = page.frames().find((f) => f.url().includes('holidayfuture'));
if (!frame) { console.log('PAS D IFRAME'); await browser.close(); process.exit(1); }
console.log('2. Iframe ok:', frame.url());

// Dump les boutons du frame
const fBtns = await frame.evaluate(() => [...document.querySelectorAll('button,a')].map(b => b.textContent.trim().slice(0, 50)).filter(Boolean).slice(0, 50));
console.log('   boutons iframe:', JSON.stringify(fBtns));

// Chercher les inputs de dates / le widget de booking
const inputs = await frame.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder })).slice(0, 20));
console.log('   inputs iframe:', JSON.stringify(inputs));

await page.screenshot({ path: `${OUT}/20-frame-listing.png` });

// Essayer de cliquer 2 dates disponibles dans le calendrier du frame
const picked = await frame.evaluate(() => {
  // Hostaway next: les cellules dispo sont des boutons/td cliquables non désactivés
  const cells = [...document.querySelectorAll('td[role=button], td button, [class*=calendar] button, [class*=Calendar] button')]
    .filter(c => !c.disabled && !c.getAttribute('aria-disabled') && c.textContent.trim().match(/^\d{1,2}$/));
  if (cells.length < 2) return { ok: false, n: cells.length };
  cells[0].click();
  cells[1].click();
  return { ok: true, n: cells.length, first: cells[0].textContent.trim(), second: cells[1].textContent.trim() };
}).catch((e) => ({ ok: false, err: e.message }));
console.log('3. Sélection dates:', JSON.stringify(picked));
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/21-dates.png` });

// Book now
const bookSel = frame.locator('button:has-text("Book"), button:has-text("Réserver"), a:has-text("Book now")').first();
if (await bookSel.count()) {
  const label = await bookSel.textContent();
  console.log(`4. Clic "${label?.trim()}"`);
  await bookSel.click({ timeout: 8000 }).catch((e) => console.log('   raté:', e.message.split('\n')[0]));
  await page.waitForTimeout(8000);
} else {
  console.log('4. Pas de bouton Book visible');
}
await page.screenshot({ path: `${OUT}/22-after-book.png` });
const frames2 = page.frames().map((f) => f.url()).filter((u) => u.includes('holidayfuture'));
console.log('   frames hostaway maintenant:', JSON.stringify(frames2));

console.log('\n--- LOGS ---');
logs.slice(0, 50).forEach((l) => console.log(l));
await browser.close();
