import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);

// Hide the cookie banner & ESM banners so we can see the dock cleanly
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"], [class*="cookie"], [class*="privacy-banner"]')
    .forEach((el) => { el.style.display = 'none'; });
});

const scroller = await page.$('[data-ceilidh-test2]');

// Scroll so each card sits near viewport center
async function center(label, selector) {
  await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    if (!card) return;
    const sc = document.querySelector('[data-ceilidh-test2]');
    const r = card.getBoundingClientRect();
    sc.scrollTop = sc.scrollTop + r.top - (sc.clientHeight - r.height) / 2;
  }, selector);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/T2B-${label}.png`, fullPage: false });
}

// Hero — scroll to top
await scroller.evaluate((el) => { el.scrollTop = 0; });
await page.waitForTimeout(2400); // wait past mid-bubble-transition
await page.screenshot({ path: '/tmp/T2B-hero.png', fullPage: false });

await center('card01', '.chapter-card[aria-label*="01"]');
await center('card02-locked', '.chapter-card[aria-label*="02"]');
await center('card03', '.chapter-card[aria-label*="03"]');
await center('card04-done', '.chapter-card[aria-label*="04"]');
await center('card05-locked', '.chapter-card[aria-label*="05"]');

// Bottom dock visible — scroll past last card
await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2B-dock.png', fullPage: false });

// Open chapter 01 fullscreen
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="01"]')?.click());
await page.waitForTimeout(1100);
await page.screenshot({ path: '/tmp/T2B-fs-top.png', fullPage: false });

await browser.close();
console.log('done');
