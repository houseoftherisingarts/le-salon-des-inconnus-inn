import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);

// Programmatic scroll while sampling frame timings
const result = await page.evaluate(() => new Promise((resolve) => {
  const scroller = document.querySelector('[data-inn-scroll]');
  if (!scroller) return resolve({ error: 'no scroller' });
  const max = scroller.scrollHeight - scroller.clientHeight;
  scroller.scrollTop = 0;

  const frames = [];
  let last = performance.now();
  let i = 0;
  let scrollPos = 0;
  const totalFrames = 240; // ~4s at 60fps
  const step = max / totalFrames;

  const tick = (now) => {
    frames.push(now - last);
    last = now;
    scrollPos += step;
    scroller.scrollTop = scrollPos;
    i++;
    if (i < totalFrames) requestAnimationFrame(tick);
    else {
      const slow = frames.filter(f => f > 22).length;
      const stalls = frames.filter(f => f > 100).length;
      const sorted = frames.slice().sort((a,b)=>a-b);
      const max = Math.max(...frames);
      resolve({
        total: frames.length,
        slow, stalls, max,
        avg: frames.reduce((a,b)=>a+b,0)/frames.length,
        p95: sorted[Math.floor(frames.length*0.95)],
        p99: sorted[Math.floor(frames.length*0.99)],
      });
    }
  };
  requestAnimationFrame(tick);
}));
console.log('SCROLL JANK:', JSON.stringify(result, null, 2));
await browser.close();
