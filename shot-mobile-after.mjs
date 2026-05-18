import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
const sc = await page.$('[data-inn-scroll]');
const positions = [
  { name: '01-hero',    y: 0 },
  { name: '02-batie',   y: 800 },
  { name: '03-rooms',   y: 1500 },
  { name: '04-stays',   y: 2400 },
  { name: '05-gallery', y: 3300 },
  { name: '06-espace',  y: 4100 },
  { name: '07-services',y: 5300 },
  { name: '08-details', y: 6200 },
  { name: '09-video',   y: 7100 },
  { name: '10-doors',   y: 9300 },
];
for (const { name, y } of positions) {
  await sc.evaluate((el, ny) => { el.scrollTop = ny; }, y);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/MA-${name}.png`, fullPage: false });
}

// Check: BÂTIE/Origins overflow
const oflow = await page.evaluate(() => {
  return [...document.querySelectorAll('.max-w-md, .reveal-on-load')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, w: Math.round(r.width), right: Math.round(r.right), vw: window.innerWidth };
    });
});
console.log('Max-w containers:', JSON.stringify(oflow, null, 2));
await browser.close();
