import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

async function shoot(name, sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    const sc = document.querySelector('[data-inn-scroll]');
    if (el && sc) {
      const r = el.getBoundingClientRect();
      sc.scrollTop = sc.scrollTop + r.top - 10;
    }
  }, sel);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/MP-${name}.png`, fullPage: false });
}
await shoot('espace',   'section[data-l-espace]');
await shoot('details',  'section[id*="details"], [class*="DetailsSection"], div:has(> div > div > h2:has-text("Détails"))');
await shoot('doors',    'section:has(button.doors-half)');
await browser.close();
console.log('done');
