import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);

await page.screenshot({ path: '/tmp/SHOW-hero.png', fullPage: false });

const handle = await page.$('section[data-l-espace]');
const box = await handle.boundingBox();
const scroller = await page.$('[data-inn-scroll]');
const scrollY = await scroller.evaluate((el) => el.scrollTop);
const targetTop = box.y + scrollY + box.height / 2 - 450;
await scroller.evaluate((el, y) => { el.scrollTop = y; }, targetTop);
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/SHOW-deck-EN.png', fullPage: false });

// Switch to FR
try {
  const frBtn = page.locator('button:has-text("FR"), a:has-text("FR")').first();
  await frBtn.click({ timeout: 1500 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/SHOW-deck-FR.png', fullPage: false });
} catch {}

// Open deck
await page.evaluate(() => {
  const sec = document.querySelector('section[data-l-espace]');
  const card = sec?.querySelector('[role="button"]');
  if (card) card.click();
});
await page.waitForTimeout(2400);
await page.screenshot({ path: '/tmp/SHOW-deck-open.png', fullPage: false });

await browser.close();
console.log('done');
