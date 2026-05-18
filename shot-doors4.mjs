import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

// Find the doors section (the one whose immediate child includes button.doors-half)
await page.evaluate(() => {
  const all = [...document.querySelectorAll('section')];
  const doors = all.find((s) => s.querySelector('button.doors-half'));
  if (doors) {
    const sc = document.querySelector('[data-inn-scroll]');
    const r = doors.getBoundingClientRect();
    sc.scrollTop = sc.scrollTop + r.top + 10;
  }
});
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/D4-375.png', fullPage: false });

// Inspect Wwoofing h2 + container
const info = await page.evaluate(() => {
  const all = [...document.querySelectorAll('button.doors-half')];
  const ww = all.find((b) => /Wwoofing/i.test(b.getAttribute('aria-label') || ''));
  if (!ww) return { error: 'no wwoofing button' };
  const cs = getComputedStyle(ww);
  // Find the absolute text block — it's the div with class containing 'top-10' or 'right-5'
  const inner = [...ww.querySelectorAll('div')].find((d) => /right-5/.test(d.className) || /right-12/.test(d.className));
  const innerR = inner?.getBoundingClientRect();
  const innerCS = inner ? getComputedStyle(inner) : null;
  const h2 = inner?.querySelector('h2');
  const h2R = h2?.getBoundingClientRect();
  const span = inner?.querySelector('span');
  const spanR = span?.getBoundingClientRect();
  return {
    button: { x: ww.getBoundingClientRect().x, right: ww.getBoundingClientRect().right, clipPath: cs.clipPath },
    inner: inner ? {
      x: innerR.x, y: innerR.y, right: innerR.right, bottom: innerR.bottom, w: innerR.width, h: innerR.height,
      classes: inner.className.slice(0, 80),
    } : 'NOT FOUND',
    innerStyle: innerCS ? { right: innerCS.right, top: innerCS.top, maxWidth: innerCS.maxWidth, display: innerCS.display, opacity: innerCS.opacity } : null,
    h2: h2R ? { x: h2R.x, right: h2R.right, w: h2R.width, h: h2R.height, fontSize: getComputedStyle(h2).fontSize } : 'NOT FOUND',
    span: spanR ? { x: spanR.x, w: spanR.width } : null,
  };
});
console.log('INSPECT:', JSON.stringify(info, null, 2));
await browser.close();
