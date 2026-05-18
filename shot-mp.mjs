import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

async function shoot(name, fn) {
  await page.evaluate(fn);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/MP-${name}.png`, fullPage: false });
}
await shoot('espace',  () => {
  const el = document.querySelector('section[data-l-espace]');
  const sc = document.querySelector('[data-inn-scroll]');
  if (el && sc) sc.scrollTop = sc.scrollTop + el.getBoundingClientRect().top - 10;
});
await shoot('doors',  () => {
  const el = [...document.querySelectorAll('section')].find(s => s.querySelector('button.doors-half'));
  const sc = document.querySelector('[data-inn-scroll]');
  if (el && sc) sc.scrollTop = sc.scrollTop + el.getBoundingClientRect().top + 10;
});
await shoot('services', () => {
  const el = [...document.querySelectorAll('section')].find(s => /CUSTOM SERVICES|PLUS QUE L/i.test(s.outerHTML));
  const sc = document.querySelector('[data-inn-scroll]');
  if (el && sc) sc.scrollTop = sc.scrollTop + el.getBoundingClientRect().top - 10;
});
await browser.close();
