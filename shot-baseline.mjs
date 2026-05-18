import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
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

const frames = await page.evaluate(() => new Promise((resolve) => {
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
const slow = frames.filter(f => f > 22).length;
console.log('REDUCED-MOTION DECK CLOSED — slow:', slow, 'avg:', (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2));

await browser.close();
