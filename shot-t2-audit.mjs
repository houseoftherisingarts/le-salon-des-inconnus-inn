import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);

// Wait for hero animations to settle (avoid mid-bubble-transition shots).
// Scroll to bottom of hero exactly so title is fully revealed without cycler bubble.
await page.evaluate(() => {
  const s = document.querySelector('[data-ceilidh-test2]');
  if (s) s.scrollTop = 0;
});
// Try to capture a moment where bubble transition isn't mid-frame:
await page.waitForTimeout(2200);
await page.screenshot({ path: '/tmp/T2A-hero.png', fullPage: false });

// Header / stack intro — scroll just enough to see "CINQ CHAPITRES" header AND first card top.
const scroller = await page.$('[data-ceilidh-test2]');
await scroller.evaluate((el) => { el.scrollTop = el.clientHeight + 40; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2A-stack-header.png', fullPage: false });

// First chapter card centered — scroll to where chapter 01 fills viewport
await scroller.evaluate((el) => { el.scrollTop = el.clientHeight + 360; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2A-card01.png', fullPage: false });

// Card hover — dispatch mouseenter via JS (auto-wait can't handle the float-anim parent)
await page.evaluate(() => {
  const c = document.querySelector('.chapter-card[aria-label*="01"]');
  if (c) {
    c.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }
});
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2A-card01-hover.png', fullPage: false });

// Card 02 (locked) at center
await scroller.evaluate((el) => { el.scrollTop = el.clientHeight + 920; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2A-card02-locked.png', fullPage: false });

// Card 04 (done state) at center
await scroller.evaluate((el) => { el.scrollTop = el.clientHeight + 2300; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2A-card04-done.png', fullPage: false });

// Bottom dock (zoom-ish — viewport bottom)
await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/T2A-bottom-dock.png', fullPage: false });

// Chapter open fullscreen
await page.evaluate(() => {
  const c = document.querySelector('.chapter-card[aria-label*="01"]');
  if (c) c.click();
});
await page.waitForTimeout(1100);
await page.screenshot({ path: '/tmp/T2A-fullscreen-top.png', fullPage: false });

// Scroll inside the fullscreen to body
await page.evaluate(() => {
  const fs = document.querySelector('.chapter-fullscreen');
  if (fs) fs.scrollTop = 600;
});
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/T2A-fullscreen-body.png', fullPage: false });

// Frame timing during scroll
const frames = await page.evaluate(() => new Promise((resolve) => {
  const el = document.querySelector('.chapter-fullscreen') || document.querySelector('[data-ceilidh-test2]');
  if (!el) return resolve([]);
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
const slow = frames.filter(f => f > 22).length;
console.log('FPS in chapter open: slow=' + slow + '/90 avg=' + (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2));

await browser.close();
console.log('done');
