import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
await page.screenshot({ path: '/tmp/F-hero.png', fullPage: false });
// L'Espace
await page.evaluate(() => {
  const sec = document.querySelector('section[data-l-espace]');
  const sc = document.querySelector('[data-inn-scroll]');
  if (sec && sc) sc.scrollTop = sc.scrollTop + sec.getBoundingClientRect().top - 10;
});
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/F-espace.png', fullPage: false });
await browser.close();
