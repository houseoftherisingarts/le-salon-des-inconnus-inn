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

// Sample frames during CLOSED-state idle (sway active, fog drifting).
const frames = await page.evaluate(() => new Promise((resolve) => {
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 120) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
const slow = frames.filter(f => f > 22).length;
const p95 = frames.slice().sort((a,b)=>a-b)[Math.floor(frames.length * 0.95)];
console.log('CLOSED IDLE FRAMES:', frames.length, 'slow(>22ms):', slow, 'avg:', (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2), 'p95:', p95.toFixed(2));

await browser.close();
