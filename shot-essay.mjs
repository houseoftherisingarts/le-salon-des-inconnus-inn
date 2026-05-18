import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});
// open chapter 01, login if needed
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="01"]')?.click());
await page.waitForTimeout(700);
if (await page.$('.login-modal')) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
    b?.click();
  });
  await page.waitForTimeout(1100);
}
// scroll to essay
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1200; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/MAG-essay-1.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1900; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/MAG-essay-2.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 2600; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/MAG-essay-3.png', fullPage: false });
await browser.close();
console.log('done');
