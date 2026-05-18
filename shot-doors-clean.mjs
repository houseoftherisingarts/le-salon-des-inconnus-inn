import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
await page.evaluate(() => {
  const sec = [...document.querySelectorAll('section')].find((s) => s.querySelector('button.doors-half'));
  if (sec) { const sc = document.querySelector('[data-inn-scroll]'); const r = sec.getBoundingClientRect(); sc.scrollTop += r.top - 30; }
});
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/CLEAN-doors.png', fullPage: false });
const info = await page.evaluate(() => {
  const ww = [...document.querySelectorAll('button.doors-half')].find(b => /Wwoofing/i.test(b.getAttribute('aria-label')||''));
  const inner = ww ? [...ww.querySelectorAll('div')].find(d => /right-/.test(d.className)) : null;
  const h2 = inner?.querySelector('h2');
  const r = h2?.getBoundingClientRect();
  return { L: Math.round(r.left), R: Math.round(r.right), VW: window.innerWidth };
});
console.log(JSON.stringify(info));
await browser.close();
