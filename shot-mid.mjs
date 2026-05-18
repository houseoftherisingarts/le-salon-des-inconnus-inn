import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
for (const w of [560, 640, 720, 900]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7500);
  await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    const doors = all.find((s) => s.querySelector('button.doors-half'));
    if (doors) {
      const sc = document.querySelector('[data-inn-scroll]');
      const r = doors.getBoundingClientRect();
      sc.scrollTop = sc.scrollTop + r.top;
    }
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/MID-${w}.png`, fullPage: false });

  // Check Wwoofing h2 right edge vs viewport
  const info = await page.evaluate(() => {
    const ww = [...document.querySelectorAll('button.doors-half')].find(b => /Wwoofing/i.test(b.getAttribute('aria-label')||''));
    if (!ww) return null;
    const inner = [...ww.querySelectorAll('div')].find(d => /right-/.test(d.className));
    const h2 = inner?.querySelector('h2');
    if (!h2) return null;
    const r = h2.getBoundingClientRect();
    return { left: r.left, right: r.right, viewportW: window.innerWidth, fontSize: getComputedStyle(h2).fontSize };
  });
  console.log(`viewport ${w}: h2`, JSON.stringify(info));
  await ctx.close();
}
await browser.close();
