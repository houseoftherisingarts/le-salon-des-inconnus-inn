// Repro phase finale: atteindre le bouton « Complete booking » dans l'iframe et
// vérifier s'il est cliquable ou masqué par le bandeau cookies (z-250 vs z-200).
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-CA' });
const page = await ctx.newPage();

console.log('1. Flow jusqu au checkout…');
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
await frame.locator('text=Select Dates').first().click({ timeout: 8000 });
await page.waitForTimeout(2500);
await frame.locator('button:not([disabled]):text-is("20")').first().click().catch(() => {});
await page.waitForTimeout(1200);
await frame.locator('button:not([disabled]):text-is("22")').first().click().catch(() => {});
await page.waitForTimeout(2500);
await frame.locator('button:has-text("Book now")').first().click({ timeout: 8000 });
await page.waitForTimeout(10000);
frame = page.frames().find((f) => f.url().includes('holidayfuture'));
console.log('2. Checkout:', frame.url());

// Scroller le checkout jusqu'en bas pour amener le bouton final à l'écran
await frame.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/40-bottom.png` });

// Trouver le bouton final dans le frame
const finalBtn = frame.locator('button:has-text("Complete"), button:has-text("Compléter"), button[type=submit]').last();
const n = await finalBtn.count();
console.log('3. Boutons finaux trouvés:', n);
if (n) {
  const txt = (await finalBtn.textContent())?.trim();
  const box = await finalBtn.boundingBox();
  console.log(`   texte="${txt}" boundingBox=`, JSON.stringify(box));
  // Qui reçoit le clic à cette position dans la PAGE PARENTE ?
  if (box) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const topEl = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? { tag: el.tagName, cls: (el.className || '').toString().slice(0, 100), txt: (el.textContent || '').trim().slice(0, 60) } : null;
    }, [cx, cy]);
    console.log('4. elementFromPoint parent à la position du bouton:', JSON.stringify(topEl));
  }
  // Essai de clic normal (échoue si intercepté)
  try {
    await finalBtn.click({ timeout: 6000, trial: true });
    console.log('5. click trial: OK, le bouton est atteignable');
  } catch (e) {
    console.log('5. click trial ÉCHOUE:', e.message.split('\n').slice(0, 4).join(' | '));
  }
}
await page.screenshot({ path: `${OUT}/41-final.png` });
await browser.close();
