import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});
async function open(num) {
  const fs = await page.$('.chapter-fullscreen');
  if (fs) await page.evaluate(() => document.querySelector('.chapter-fullscreen')?.querySelector('button[aria-label*="Close"], button[aria-label*="Fermer"]')?.click());
  await page.waitForTimeout(400);
  await page.evaluate((n) => document.querySelector(`.chapter-card[aria-label*="${n}"]`)?.click(), num);
  await page.waitForTimeout(700);
  if (await page.$('.login-modal')) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
      b?.click();
    });
    await page.waitForTimeout(900);
  }
}

await open('01');
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 700; });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/REST-event-countdown.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1500; });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/REST-event-essay.png', fullPage: false });

await open('02');
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 600; });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/REST-prog-coarse.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1400; });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/REST-prog-detail.png', fullPage: false });

await open('05');
await page.screenshot({ path: '/tmp/REST-prac-top.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 700; });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/REST-prac-mid.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1500; });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/REST-prac-faq.png', fullPage: false });
await browser.close();
console.log('done');
