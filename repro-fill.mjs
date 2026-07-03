// Vérif finale: remplir le checkout (infos + carte) et confirmer que le bouton
// « Finalize booking » s'active et reçoit le clic. AUCUNE soumission réelle.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-CA' });
const page = await ctx.newPage();

await page.goto('https://www.lesalondesinconnus.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const room = page.locator('text=La Méditante').first();
await room.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(1500);
await room.click({ force: true });
await page.waitForTimeout(3000);
await page.locator('text=/Choisir Cette Chambre|Choose This Room/i').first().click();
await page.waitForTimeout(8000);
let frame = page.frames().find((f) => f.url().includes('holidayfuture'));
await frame.evaluate(() => { window.location.href = '/checkout/563826?start=2026-07-20&end=2026-07-22&numberOfGuests=1'; });
await page.waitForTimeout(12000);
frame = page.frames().find((f) => f.url().includes('holidayfuture'));
console.log('checkout:', frame.url());

// Remplir les infos client
const fill = async (ph, val) => {
  const el = frame.locator(`input[placeholder="${ph}"]`).first();
  if (await el.count()) { await el.fill(val).catch(() => {}); return true; }
  return false;
};
console.log('first:', await fill('First name', 'Test'));
console.log('last:', await fill('Last name', 'Client'));
console.log('email:', await fill('Email', 'test@example.com'));

// Champs Stripe (iframes internes au frame hostaway)
const stripeFrames = page.frames().filter((f) => f.url().includes('js.stripe.com'));
console.log('stripe frames:', stripeFrames.length);
for (const sf of stripeFrames) {
  const card = sf.locator('input[name="cardnumber"], input[name="number"]').first();
  if (await card.count()) { await card.fill('4242424242424242').catch(() => {}); console.log('carte remplie'); }
  const exp = sf.locator('input[name="exp-date"], input[name="expiry"]').first();
  if (await exp.count()) { await exp.fill('12/29').catch(() => {}); console.log('exp remplie'); }
  const cvc = sf.locator('input[name="cvc"]').first();
  if (await cvc.count()) { await cvc.fill('123').catch(() => {}); console.log('cvc rempli'); }
  const zip = sf.locator('input[name="postal"], input[name="postalCode"]').first();
  if (await zip.count()) { await zip.fill('J0V 1N0').catch(() => {}); console.log('zip rempli'); }
}
await page.waitForTimeout(3000);

const finalBtn = frame.locator('button:has-text("Finalize booking"), button:has-text("Complete booking"), button:has-text("Compléter")').last();
await finalBtn.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(1500);
const disabled = await finalBtn.getAttribute('disabled');
console.log('bouton final disabled =', disabled === null ? 'NON (actif)' : 'OUI');
await page.screenshot({ path: `${OUT}/60-filled.png` });

// trial click seulement — on ne soumet PAS de paiement
try {
  await finalBtn.click({ trial: true, timeout: 5000 });
  console.log('click trial: OK — bouton actif et atteignable');
} catch (e) {
  console.log('click trial échoue:', e.message.split('\n').slice(0, 3).join(' | '));
}
await browser.close();
