import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
// Set scrollTop directly until h2 is in view
await page.evaluate(() => {
  const ww = [...document.querySelectorAll('button.doors-half')].find(b => /Wwoofing/i.test(b.getAttribute('aria-label')||''));
  ww.scrollIntoView({block:'start'});
});
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/IV-doors.png', fullPage: false });
const info = await page.evaluate(() => {
  const ww = [...document.querySelectorAll('button.doors-half')].find(b => /Wwoofing/i.test(b.getAttribute('aria-label')||''));
  const inner = ww ? [...ww.querySelectorAll('div')].find(d => /right-/.test(d.className)) : null;
  const h2 = inner?.querySelector('h2');
  const r = h2?.getBoundingClientRect();
  return { y: r?.y, x: r?.x, right: r?.right, vw: window.innerWidth };
});
console.log(JSON.stringify(info));
await browser.close();
