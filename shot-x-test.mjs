import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);

await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="01"]')?.click());
await page.waitForTimeout(1000);
console.log('Chapter 01 opened.');

// Is fullscreen present?
const present = await page.$('.chapter-fullscreen');
console.log('Fullscreen overlay present:', !!present);

// Find the X button in the overlay
const xCount = await page.evaluate(() => document.querySelectorAll('.chapter-fullscreen button[aria-label*="Close"], .chapter-fullscreen button[aria-label*="Fermer"]').length);
console.log('X buttons found:', xCount);

// Click via JS
await page.evaluate(() => {
  const btns = document.querySelectorAll('.chapter-fullscreen button');
  for (const b of btns) {
    const al = b.getAttribute('aria-label') || '';
    if (al.includes('Close') || al.includes('Fermer')) { b.click(); return; }
  }
});
await page.waitForTimeout(700);
const stillPresent = !!(await page.$('.chapter-fullscreen'));
console.log('After X click — overlay still there?', stillPresent);

await browser.close();
