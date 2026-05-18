import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
for (const w of [375, 768]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7500);
  await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
  // Take full screenshot of just the doors section element
  const handle = await page.$('section button.doors-half');
  if (handle) {
    const sec = await page.evaluateHandle(b => b.closest('section'), handle);
    const r = await sec.boundingBox();
    // Scroll the doors section into view
    await page.evaluate((y) => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop += y; }, r.y - 10);
    await page.waitForTimeout(700);
    const r2 = await sec.boundingBox();
    await page.screenshot({ path: `/tmp/D3-${w}.png`, clip: { x: 0, y: Math.max(0, r2.y), width: w, height: Math.min(720, r2.height) } });
    // Also inspect the text positions
    const info = await page.evaluate(() => {
      const wwBlock = document.querySelector('button[aria-label*="Wwoofing"], button[aria-label*="Wwoofing"]');
      let blocks = [];
      if (wwBlock) {
        const inner = wwBlock.querySelector('div.absolute');
        const rect = inner?.getBoundingClientRect();
        const wH2 = inner?.querySelector('h2');
        const h2r = wH2?.getBoundingClientRect();
        blocks.push({ label: 'Wwoofing block', x: rect?.x, right: rect?.right, w: rect?.width });
        blocks.push({ label: 'Wwoofing h2',     x: h2r?.x,  right: h2r?.right,  w: h2r?.width });
      }
      return blocks;
    });
    console.log(`viewport ${w}:`, JSON.stringify(info, null, 2));
  }
  await ctx.close();
}
await browser.close();
