import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});

async function openChapter(num) {
  // Close current overlay if any
  await page.evaluate(() => {
    const fs = document.querySelector('.chapter-fullscreen');
    if (fs) {
      const x = fs.querySelector('button[aria-label*="Close"], button[aria-label*="Fermer"]');
      if (x) x.click();
    }
  });
  await page.waitForTimeout(400);
  // Click the card by aria-label
  await page.evaluate((n) => document.querySelector(`.chapter-card[aria-label*="${n}"]`)?.click(), num);
  await page.waitForTimeout(700);
  // If login modal showed, click Google
  const loginPresent = !!(await page.$('.login-modal'));
  if (loginPresent) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.login-modal button')]
        .find((x) => (x.textContent || '').toLowerCase().includes('google'));
      b?.click();
    });
    await page.waitForTimeout(1000);
  }
}

await openChapter('02');
await page.screenshot({ path: '/tmp/CH-programme-top.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 800; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/CH-programme-mid.png', fullPage: false });

await openChapter('03');
await page.screenshot({ path: '/tmp/CH-teams-top.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 700; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/CH-teams-grid.png', fullPage: false });
// Pick a team
await page.evaluate(() => {
  const cards = document.querySelectorAll('.team-card');
  if (cards[0]) cards[0].click();
});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/CH-teams-picked.png', fullPage: false });

await openChapter('04');
await page.screenshot({ path: '/tmp/CH-lodging-top.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 800; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/CH-lodging-grid.png', fullPage: false });

await openChapter('05');
await page.screenshot({ path: '/tmp/CH-practical-top.png', fullPage: false });
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1100; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/CH-practical-faq.png', fullPage: false });

await browser.close();
console.log('done');
