import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('console: ' + msg.text()); });
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});

// Sign in via login modal
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="03"]')?.click());
await page.waitForTimeout(700);
if (await page.$('.login-modal')) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
    b?.click();
  });
  await page.waitForTimeout(1100);
}
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 700; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/WIRED-teams.png', fullPage: false });

// Pick a team to trigger the kanban
await page.evaluate(() => {
  const cards = document.querySelectorAll('.team-card');
  cards[0]?.click();
});
await page.waitForTimeout(700);
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1500; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/WIRED-kanban.png', fullPage: false });

// Scroll further to see PresenceTimeline
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 2400; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/WIRED-presence.png', fullPage: false });

// Open Pratique
await page.evaluate(() => document.querySelector('.chapter-fullscreen button[aria-label*="Close"], .chapter-fullscreen button[aria-label*="Fermer"]')?.click());
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="05"]')?.click());
await page.waitForTimeout(900);
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = 1800; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/WIRED-prac-real.png', fullPage: false });

console.log('CONSOLE ERRORS:', consoleErrors.length);
consoleErrors.slice(0, 8).forEach(e => console.log('  ', e));
await browser.close();
