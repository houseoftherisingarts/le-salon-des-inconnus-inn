import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// Long Task observer
await page.exposeFunction('logLongTask', (data) => console.log('LONG TASK:', JSON.stringify(data)));
await page.addInitScript(() => {
  try {
    const obs = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        // @ts-ignore
        window.logLongTask({ name: e.name, dur: Math.round(e.duration), start: Math.round(e.startTime) });
      }
    });
    obs.observe({ entryTypes: ['longtask'] });
  } catch {}
});

await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('--- LOAD ---');
await page.waitForTimeout(8000);

console.log('--- BEGIN SCROLL ---');
await page.evaluate(() => new Promise((resolve) => {
  const scroller = document.querySelector('[data-inn-scroll]');
  const max = scroller.scrollHeight - scroller.clientHeight;
  let pos = 0;
  const step = max / 200;
  const tick = () => {
    pos += step;
    scroller.scrollTop = pos;
    if (pos < max) requestAnimationFrame(tick);
    else resolve();
  };
  requestAnimationFrame(tick);
}));
await page.waitForTimeout(1500);

console.log('--- SCROLL DONE ---');
await browser.close();
