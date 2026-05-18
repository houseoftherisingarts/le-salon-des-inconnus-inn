import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
for (const w of [375, 414, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7500);
  await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
  // Scroll to doors section by selector
  await page.evaluate(() => {
    // The doors section is the one with both clipPath polygons. Find it via data-attr or class.
    const all = [...document.querySelectorAll('section')];
    const doors = all.find((s) => s.querySelector('button[aria-label*="Ceilidh"]') || s.querySelector('.doors-half'));
    if (doors) {
      const sc = document.querySelector('[data-inn-scroll]');
      const r = doors.getBoundingClientRect();
      if (sc && r) sc.scrollTop = sc.scrollTop + r.top - 20;
    }
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/D2-${w}.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log('done');
