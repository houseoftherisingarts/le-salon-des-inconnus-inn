import { chromium } from 'playwright';
const url = 'http://localhost:5173/highstest';
const out = '/tmp/hs-shots';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
// Use `load` rather than `networkidle` so the intro is captured BEFORE
// 16 Picsum image loads drag us past the 4.8s auto-fade.
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/hs-intro-early.png`, fullPage: false });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/hs-intro-mid.png`, fullPage: false });
// Wait for intro to dismiss + textures to settle before scroll grid.
await page.waitForTimeout(4500);
const scrollHeight = await page.evaluate(() => {
  const scroller = document.querySelector('.fixed > .absolute.inset-0.overflow-y-auto');
  return scroller ? scroller.scrollHeight - scroller.clientHeight : -1;
});
const points = [0, 0.08, 0.20, 0.38, 0.55, 0.72, 0.88, 0.98];
for (const p of points) {
  await page.evaluate((p) => {
    const scroller = document.querySelector('.fixed > .absolute.inset-0.overflow-y-auto');
    if (scroller) scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * p;
  }, p);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/hs-${String(Math.round(p*100)).padStart(2,'0')}.png`, fullPage: false });
}
console.log('scrollHeight:', scrollHeight);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
