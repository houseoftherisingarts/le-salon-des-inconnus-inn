import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
const meta = await page.evaluate(() => {
  const el = document.querySelector('[data-inn-scroll]');
  return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
});
console.log('META:', JSON.stringify(meta));
// Scroll to bottom to find the doors (they sit just before the map footer)
await page.evaluate(() => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop = el.scrollHeight - el.clientHeight * 2; });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/test3-doors-rest.png', fullPage: false });
console.log('rest shot done');
// hover the left door
const leftDoor = await page.locator('[aria-label*="Ceilidh"], [aria-label*="ceilidh"]').first();
await leftDoor.hover().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/test3-doors-hover.png', fullPage: false });
await browser.close();
