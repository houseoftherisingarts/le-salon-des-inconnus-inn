// Balayage v3: bandeau cookies fermé d'abord.
import { chromium, devices } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/c5b05b4e-da3b-4b64-9a03-3eb6be1b09fa/scratchpad/mobile2';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-CA' });
const page = await ctx.newPage();
await page.goto('https://www.lesalondesinconnus.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
await page.locator('button:has-text("Essentiel seulement")').first().click({ timeout: 8000 }).catch(async () => {
  await page.locator('text=ESSENTIEL SEULEMENT').first().click({ timeout: 5000 }).catch(() => {});
});
await page.waitForTimeout(1500);
const routes = ['/', '/massage', '/about', '/guide', '/petite-monnaie', '/cuisine', '/evenements', '/ceilidh', '/wwoofing', '/communaute', '/don'];
for (const r of routes) {
  const slug = r === '/' ? 'home' : r.slice(1).replace(/\//g, '-');
  try {
    await page.goto(`https://www.lesalondesinconnus.com${r}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    const info = await page.evaluate(() => {
      let best = null;
      document.querySelectorAll('*').forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 200) {
          if (!best || el.scrollHeight > best.scrollHeight) best = el;
        }
      });
      if (best) { best.setAttribute('data-sweep-scroller', '1'); return { sh: best.scrollHeight, ch: best.clientHeight }; }
      return { sh: document.body.scrollHeight, ch: window.innerHeight };
    });
    const nShots = Math.min(6, Math.max(2, Math.ceil(info.sh / info.ch)));
    for (let i = 0; i < nShots; i++) {
      const y = Math.floor((info.sh - info.ch) * (i / (nShots - 1)));
      await page.evaluate((yy) => {
        const el = document.querySelector('[data-sweep-scroller]');
        if (el) el.scrollTo(0, yy); else window.scrollTo(0, yy);
      }, y);
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `${OUT}/${slug}-${i}.png` });
    }
    console.log(`${r} ok sh=${info.sh} shots=${nShots}`);
  } catch (e) { console.log(`${r} ERREUR: ${e.message.split('\n')[0]}`); }
}
// Modal chambre
await page.goto('https://www.lesalondesinconnus.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const room = page.locator('text=La Méditante').first();
if (await room.count()) {
  await room.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(1500);
  await room.click({ force: true }).catch(() => {});
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/room-modal-0.png` });
  const mi = await page.evaluate(() => { const el = document.querySelector('.room-orb-root'); if (!el) return null; return { sh: el.scrollHeight, ch: el.clientHeight }; });
  if (mi) {
    for (let i = 1; i <= 2; i++) {
      await page.evaluate((y) => document.querySelector('.room-orb-root').scrollTo(0, y), Math.floor((mi.sh - mi.ch) * i / 2));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/room-modal-${i}.png` });
    }
  }
  console.log('modal ok');
}
await browser.close();
