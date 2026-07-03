// Repro finale v2: ouvrir l'overlay, forcer l'iframe sur l'URL du checkout,
// scroller au bouton final et tester s'il est cliquable + qui intercepte.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-CA' });
const page = await ctx.newPage();

const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console.error] ${m.text().slice(0, 200)}`); });

console.log('1. Site + overlay…');
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
console.log('2. Iframe →', frame.url());
await frame.evaluate(() => { window.location.href = '/checkout/563826?start=2026-07-20&end=2026-07-22&numberOfGuests=1'; });
await page.waitForTimeout(12000);
frame = page.frames().find((f) => f.url().includes('holidayfuture'));
console.log('   maintenant →', frame.url());

// Scroller le contenu du checkout jusqu'en bas
await frame.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/50-bottom.png` });

// Lister tous les boutons du frame
const btns = await frame.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => {
    const r = b.getBoundingClientRect();
    return { txt: b.textContent.trim().slice(0, 50), type: b.type, disabled: b.disabled, y: Math.round(r.y), h: Math.round(r.height), visible: !!b.offsetParent };
  }).filter((b) => b.txt || b.type === 'submit')
);
console.log('3. Boutons du checkout:', JSON.stringify(btns, null, 1).slice(0, 2000));

const finalBtn = frame.locator('button:has-text("Complete booking"), button:has-text("Compléter"), button:has-text("Book")').last();
if (await finalBtn.count()) {
  await finalBtn.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(1500);
  const txt = (await finalBtn.textContent())?.trim();
  const box = await finalBtn.boundingBox();
  console.log(`4. Bouton final "${txt}" box=`, JSON.stringify(box));
  if (box) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const topEl = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      let z = null, cur = el;
      while (cur && cur !== document.body) { const zi = getComputedStyle(cur).zIndex; if (zi !== 'auto') { z = zi; break; } cur = cur.parentElement; }
      return el ? { tag: el.tagName, cls: (el.className || '').toString().slice(0, 120), txt: (el.textContent || '').trim().slice(0, 80), zIndex: z } : null;
    }, [cx, cy]);
    console.log('5. Élément parent qui couvre cette position:', JSON.stringify(topEl, null, 1));
  }
  try {
    await finalBtn.click({ timeout: 6000, trial: true });
    console.log('6. click trial: OK — bouton atteignable');
  } catch (e) {
    console.log('6. click trial ÉCHOUE:', e.message.split('\n').slice(0, 5).join(' | '));
  }
} else {
  console.log('4. Toujours pas de bouton final');
}
await page.screenshot({ path: `${OUT}/51-final.png` });
console.log('--- console errors ---'); logs.slice(0, 15).forEach((l) => console.log(l));
await browser.close();
