import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text()); });

await page.goto('http://localhost:5178/ceilidh', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
await page.screenshot({ path: '/tmp/CHK-route-hero.png', fullPage: false });

// Login + open Teams + see chats
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="03"]')?.click());
await page.waitForTimeout(700);
if (await page.$('.login-modal')) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
    b?.click();
  });
  await page.waitForTimeout(1100);
}
await page.evaluate(() => {
  const cards = document.querySelectorAll('.team-card');
  cards[0]?.click();
});
await page.waitForTimeout(700);
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1100; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/CHK-chatrooms.png', fullPage: false });

// Lodging occupants (defensive matcher)
await page.evaluate(() => document.querySelector('.chapter-fullscreen button[aria-label*="Close"], .chapter-fullscreen button[aria-label*="Fermer"]')?.click());
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="04"]')?.click());
await page.waitForTimeout(900);
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1300; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/CHK-lodging-fixed.png', fullPage: false });

console.log('errors:', errs.length);
errs.slice(0,3).forEach(e => console.log(' ', e));
await browser.close();
