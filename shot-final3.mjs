import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text().slice(0,180)); });
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

// 1) Hero (check Bienvenue title not orphaned, phone larger)
await page.screenshot({ path: '/tmp/F3-hero.png', fullPage: false });

// 2) Click Réserver — should scroll to rooms
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => /Réserver/.test(x.textContent || ''));
  if (b) b.click();
});
await page.waitForTimeout(1400);
await page.screenshot({ path: '/tmp/F3-rooms-decorative.png', fullPage: false });

// 3) Scroll all the way down to verify diagonal doors don't overflow
await page.evaluate(() => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop = el.scrollHeight - el.clientHeight * 1.5; });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/F3-doors.png', fullPage: false });

console.log('errors:', errs.length); errs.slice(0,4).forEach(e=>console.log(' ',e));
await browser.close();
