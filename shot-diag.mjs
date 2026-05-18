import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);

// Patch renderer to count draws
await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  let drawCount = 0;
  // Monkey-patch the canvas WebGL context's drawArrays
  const ctx = canvas?.getContext('webgl') || canvas?.getContext('webgl2');
  if (ctx) {
    const orig = ctx.drawArrays.bind(ctx);
    ctx.drawArrays = function(...args) { drawCount++; return orig(...args); };
    const origElem = ctx.drawElements.bind(ctx);
    ctx.drawElements = function(...args) { drawCount++; return origElem(...args); };
  }
  window.__getDrawCount = () => drawCount;
});

// Sample at hero (cycler should be drawing)
const c1 = await page.evaluate(() => window.__getDrawCount?.() ?? 0);
await page.waitForTimeout(1000);
const c2 = await page.evaluate(() => window.__getDrawCount?.() ?? 0);
console.log('HERO 1s draws:', c2 - c1);

// Scroll to deck
const handle = await page.$('section[data-l-espace]');
const box = await handle.boundingBox();
const scroller = await page.$('[data-inn-scroll]');
const scrollY = await scroller.evaluate((el) => el.scrollTop);
const targetTop = box.y + scrollY + box.height / 2 - 450;
await scroller.evaluate((el, y) => { el.scrollTop = y; }, targetTop);
await page.waitForTimeout(1500);

const c3 = await page.evaluate(() => window.__getDrawCount?.() ?? 0);
await page.waitForTimeout(1000);
const c4 = await page.evaluate(() => window.__getDrawCount?.() ?? 0);
console.log('DECK 1s draws:', c4 - c3);

// Check IO status by checking canvas bounding rect
const rect = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c ? c.getBoundingClientRect() : null;
});
console.log('CANVAS RECT:', JSON.stringify(rect));

await browser.close();
