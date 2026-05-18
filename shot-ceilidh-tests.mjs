import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// TEST 1 — Estate Map
await page.goto('http://localhost:5178/ceilidhtest1', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: '/tmp/CEILIDH-T1-hero.png', fullPage: false });

// scroll to map
const scroller1 = await page.$('[data-ceilidh-test1]');
const sc1 = await scroller1.evaluate((el) => ({ ch: el.clientHeight, sh: el.scrollHeight }));
await scroller1.evaluate((el) => { el.scrollTop = el.clientHeight; });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/CEILIDH-T1-map.png', fullPage: false });

// hover a pin
await page.evaluate(() => {
  const pin = document.querySelectorAll('.pin-button')[0];
  if (pin) {
    pin.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    pin.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }
});
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/CEILIDH-T1-pin-hover.png', fullPage: false });

// click event pin to open detail
await page.evaluate(() => {
  const pins = document.querySelectorAll('.pin-button');
  // find the one with aria-label containing "01"
  for (const p of pins) {
    if (p.getAttribute('aria-label')?.includes('01')) { p.click(); return; }
  }
});
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/CEILIDH-T1-detail.png', fullPage: false });

// TEST 2 — Chapter Cards
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: '/tmp/CEILIDH-T2-hero.png', fullPage: false });

const scroller2 = await page.$('[data-ceilidh-test2]');
await scroller2.evaluate((el) => { el.scrollTop = el.clientHeight; });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/CEILIDH-T2-stack.png', fullPage: false });

await scroller2.evaluate((el) => { el.scrollTop = el.clientHeight + 600; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/CEILIDH-T2-stack-mid.png', fullPage: false });

// open chapter 01
await page.evaluate(() => {
  const cards = document.querySelectorAll('.chapter-card');
  for (const c of cards) {
    if (c.getAttribute('aria-label')?.includes('01')) { c.click(); return; }
  }
});
await page.waitForTimeout(1100);
await page.screenshot({ path: '/tmp/CEILIDH-T2-chapter.png', fullPage: false });

await browser.close();
console.log('done');
