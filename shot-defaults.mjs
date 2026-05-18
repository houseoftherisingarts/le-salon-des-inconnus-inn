import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text().slice(0,200)); });

await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
await page.screenshot({ path: '/tmp/ROOT-inn.png', fullPage: false });

await page.goto('http://localhost:5178/ceilidh', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
await page.screenshot({ path: '/tmp/ROOT-ceilidh.png', fullPage: false });

console.log('errors:', errs.length);
errs.slice(0,5).forEach(e => console.log(' ', e));
await browser.close();
