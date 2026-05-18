import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
const handle = await page.$('section[data-l-espace]');
const box = await handle.boundingBox();
const scroller = await page.$('[data-inn-scroll]');
const scrollY = await scroller.evaluate((el) => el.scrollTop);
const targetTop = box.y + scrollY + box.height / 2 - 450;
await scroller.evaluate((el, y) => { el.scrollTop = y; }, targetTop);
await page.waitForTimeout(1500);

// List all running animations on the page
const anims = await page.evaluate(() => {
  return document.getAnimations().map(a => {
    const el = a.effect && (a.effect.target || a.effect.targets?.[0]);
    return {
      name: a.animationName || a.id || 'css',
      target: el ? (el.tagName + '.' + (el.className?.toString?.()?.slice(0, 60) || '')) : 'unknown',
      playState: a.playState,
    };
  });
});
console.log('ACTIVE ANIMATIONS:', anims.length);
anims.slice(0, 30).forEach(a => console.log(' -', a.playState, a.name, '|', a.target.slice(0, 80)));

// Check if any element has high paint count via reportPaintEvents (not available, skip)
// Check repaint via deliberate style changes — measure layout/paint
const t = await page.evaluate(async () => {
  // Force a layout flush, then measure
  const start = performance.now();
  for (let i = 0; i < 10; i++) {
    document.body.offsetHeight;
  }
  return performance.now() - start;
});
console.log('10x layout flush:', t.toFixed(2), 'ms');

await browser.close();
