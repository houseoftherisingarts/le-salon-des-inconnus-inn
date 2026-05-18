import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});
// Open chapter 01 with login
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="01"]')?.click());
await page.waitForTimeout(700);
await page.evaluate(() => {
  const btns = document.querySelectorAll('.login-modal button');
  for (const b of btns) { if ((b.textContent || '').includes('Google')) { b.click(); return; } }
});
await page.waitForTimeout(1100);

// Find the X button rect + computed style
const xInfo = await page.evaluate(() => {
  const el = document.querySelector('.chapter-fullscreen > button');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    found: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    position: cs.position, top: cs.top, right: cs.right, zIndex: cs.zIndex,
    visibility: cs.visibility, display: cs.display, opacity: cs.opacity,
  };
});
console.log('X button:', JSON.stringify(xInfo, null, 2));

// Crop screenshot to the top-right corner
await page.screenshot({ path: '/tmp/T2D-topright.png', clip: { x: 1300, y: 0, width: 140, height: 140 } });

await browser.close();
