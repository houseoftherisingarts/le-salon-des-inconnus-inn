import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text().slice(0,200)); });

await page.goto('http://localhost:5178/ceilidh', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

// Hero shot
await page.screenshot({ path: '/tmp/E2E-hero.png', fullPage: false });

// Open Pratique to verify ContributionPanel + ShowTicketSlot
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="05"]')?.click());
await page.waitForTimeout(700);
if (await page.$('.login-modal')) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
    b?.click();
  });
  await page.waitForTimeout(1100);
}
// Scroll to bottom of Pratique
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/E2E-prac-bottom.png', fullPage: false });

// Inventory of all clickable buttons in Pratique
const btns = await page.evaluate(() => {
  const fs = document.querySelector('.chapter-fullscreen');
  return [...(fs?.querySelectorAll('button, a[href]') || [])].map(b => ({
    tag: b.tagName,
    text: (b.textContent||'').trim().slice(0,80),
    disabled: b.disabled || b.getAttribute('aria-disabled') || null,
    href: b.getAttribute('href') || null,
  }));
});
console.log('PRATIQUE BUTTONS (' + btns.length + '):');
btns.forEach(b => console.log('  -', JSON.stringify(b)));

console.log('\nERRORS:', errs.length);
errs.slice(0,8).forEach(e => console.log(' ', e));
await browser.close();
