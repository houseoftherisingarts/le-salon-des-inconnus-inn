import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const routes = ['/', '/ceilidh', '/wwoofing', '/about', '/guide', '/profil'];
const widths = [375, 414];

for (const w of widths) {
  console.log(`\n========== Viewport ${w}px ==========`);
  for (const r of routes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 100)));
    try {
      await page.goto(`http://localhost:5178${r}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(6500);
      await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

      // Detect horizontal overflow on the document
      const overflow = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        // Find all elements wider than the viewport
        const violators = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1 && r.width > 0) {
            violators.push({
              tag: el.tagName,
              cls: (el.className || '').toString().slice(0, 60),
              right: Math.round(r.right),
              w: Math.round(r.width),
              x: Math.round(r.x),
            });
          }
        });
        return {
          docW: html.scrollWidth, viewW: html.clientWidth,
          hasOverflow: html.scrollWidth > html.clientWidth + 1,
          worst: violators.slice(0, 5),
          count: violators.length,
        };
      });
      console.log(`  ${r}: doc=${overflow.docW}, view=${overflow.viewW}, overflow=${overflow.hasOverflow}, violators=${overflow.count}`);
      if (overflow.worst.length) overflow.worst.forEach(v => console.log(`    - ${v.tag}.${v.cls} (right=${v.right}, w=${v.w})`));
      if (errs.length) console.log(`    ERRORS: ${errs.join(' | ')}`);
    } catch (e) {
      console.log(`  ${r}: ERROR ${e.message.slice(0, 80)}`);
    }
    await ctx.close();
  }
}
await browser.close();
