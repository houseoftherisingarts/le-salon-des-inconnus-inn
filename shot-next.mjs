import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});
// Open chapter 01 → click Google
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="01"]')?.click());
await page.waitForTimeout(700);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
  b?.click();
});
await page.waitForTimeout(1000);
// Scroll to bottom of fullscreen
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/NEXT-ch01.png', fullPage: false });
// Click next-chapter
await page.evaluate(() => document.querySelector('.next-chapter-cta')?.click());
await page.waitForTimeout(900);
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/NEXT-ch02.png', fullPage: false });
// Skip ahead to chapter 05 — last
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => document.querySelector('.next-chapter-cta')?.click());
  await page.waitForTimeout(800);
}
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/NEXT-ch05-last.png', fullPage: false });
await browser.close();
console.log('done');
