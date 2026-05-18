import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
for (const w of [375, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/profil', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
  await page.screenshot({ path: `/tmp/DASH-${w}-top.png`, fullPage: false });
  // scroll to mid
  await page.evaluate(() => { window.scrollTo(0, 600); document.querySelector('.fixed.inset-0.z-50')?.scrollTo({top:600}); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/DASH-${w}-mid.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log('done');
