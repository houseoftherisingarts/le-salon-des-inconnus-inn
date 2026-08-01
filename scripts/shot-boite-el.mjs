import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/06b2c168-d024-4447-b32e-84b36a22dd05/scratchpad';
const browser = await chromium.launch();
for (const [vp, tag] of [[{ width: 390, height: 844 }, 'mobile'], [{ width: 1440, height: 900 }, 'desktop']]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('https://lesalondesinconnus.com/coffre', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.addStyleTag({ content: '[class*="fixed"][class*="bottom-0"]{display:none !important}' });
  const wrap = page.locator('img[src*="boite"]').first().locator('xpath=..');
  await wrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  await wrap.screenshot({ path: `${OUT}/boite-el-${tag}.png` });
  console.log(tag, 'ok');
  await ctx.close();
}
await browser.close();
