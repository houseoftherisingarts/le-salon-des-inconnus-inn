import { chromium } from 'playwright';
// Try with GPU enabled
const browser = await chromium.launch({
  args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);

const handle = await page.$('section[data-l-espace]');
const box = await handle.boundingBox();
const scroller = await page.$('[data-inn-scroll]');
const scrollY = await scroller.evaluate((el) => el.scrollTop);
const targetTop = box.y + scrollY + box.height / 2 - 450;
await scroller.evaluate((el, y) => { el.scrollTop = y; }, targetTop);
await page.waitForTimeout(1500);

// 3 separate runs
for (let r = 0; r < 3; r++) {
  const frames = await page.evaluate(() => new Promise((resolve) => {
    const out = []; let last = performance.now(); let i = 0;
    const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
    requestAnimationFrame(tick);
  }));
  const slow = frames.filter(f => f > 22).length;
  const sorted = frames.slice().sort((a,b)=>a-b);
  console.log(`run${r+1}: slow=${slow}/90 avg=${(frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2)} median=${sorted[45].toFixed(2)} p95=${sorted[Math.floor(90*0.95)].toFixed(2)}`);
}

await browser.close();
