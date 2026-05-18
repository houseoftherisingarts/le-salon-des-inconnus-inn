import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
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
    await page.waitForTimeout(1100);
  }
}

await open('03');
await page.evaluate(() => {
  const cards = document.querySelectorAll('.team-card');
  cards[0]?.click();
});
await page.waitForTimeout(700);
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1400; });
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/FIN-team-members.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1900; });
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/FIN-kanban-avatars.png', fullPage: false });

await open('04');
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 600; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/FIN-lodging-occupants.png', fullPage: false });

console.log('errors:', errs.length); errs.slice(0,3).forEach(e=>console.log(' ',e));
await browser.close();
