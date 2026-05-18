import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 720, height: 700 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
await page.evaluate(() => {
  const sec = [...document.querySelectorAll('section')].find((s) => s.querySelector('button.doors-half'));
  if (sec) { const sc = document.querySelector('[data-inn-scroll]'); const r = sec.getBoundingClientRect(); sc.scrollTop += r.top - 30; }
});
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const ww = [...document.querySelectorAll('button.doors-half')].find(b => /Wwoofing/i.test(b.getAttribute('aria-label')||''));
  const inner = ww ? [...ww.querySelectorAll('div')].find(d => /right-/.test(d.className)) : null;
  const h2 = inner?.querySelector('h2');
  const rb = h2?.getBoundingClientRect();
  return { L: Math.round(rb.left), R: Math.round(rb.right), VW: window.innerWidth };
});
console.log(JSON.stringify(r));
// Crop to right portion to see WWOOFING clearly
await page.screenshot({ path: '/tmp/CROP-doors.png', clip: { x: 380, y: 50, width: 340, height: 250 } });
await browser.close();
