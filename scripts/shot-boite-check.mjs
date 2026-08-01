import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/06b2c168-d024-4447-b32e-84b36a22dd05/scratchpad';
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch();

for (const [vp, tag] of [
  [{ width: 1440, height: 900 }, 'desktop'],
  [{ width: 390, height: 844 }, 'mobile'],
]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base + '/coffre', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /essentiel seulement|essential only/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await page.addStyleTag({ content: '[class*="fixed"][class*="bottom-0"]{display:none !important}' });
  const img = page.locator('img[src*="boite"]').first();
  await img.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const src = await img.getAttribute('src');
  const nat = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight, complete: el.complete }));
  console.log(`${tag} : src=${src} chargee=${nat.complete} ${nat.w}x${nat.h}`);
  await page.screenshot({ path: `${OUT}/boite-${tag}.png` });
  await ctx.close();
}
await browser.close();
