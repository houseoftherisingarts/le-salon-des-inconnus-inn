import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
for (const w of [1024, 1100, 1200, 1280, 1366, 1440, 1600]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    const doors = all.find((s) => s.querySelector('button.doors-half'));
    if (doors) { const sc = document.querySelector('[data-inn-scroll]'); const r = doors.getBoundingClientRect(); sc.scrollTop += r.top; }
  });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const ww = [...document.querySelectorAll('button.doors-half')].find(b => /Wwoofing/i.test(b.getAttribute('aria-label')||''));
    const inner = ww ? [...ww.querySelectorAll('div')].find(d => /right-/.test(d.className)) : null;
    const h2 = inner?.querySelector('h2');
    if (!h2) return null;
    const r = h2.getBoundingClientRect();
    const cs = getComputedStyle(h2);
    return { L: Math.round(r.left), R: Math.round(r.right), W: Math.round(r.width), VW: window.innerWidth, font: cs.fontSize, ws: cs.whiteSpace };
  });
  console.log(`vw=${w}:`, JSON.stringify(info));
  await ctx.close();
}
await browser.close();
