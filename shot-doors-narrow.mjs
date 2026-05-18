import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
for (const w of [375, 414, 768, 1024, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7500);
  await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });
  // scroll to doors
  await page.evaluate(() => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop = el.scrollHeight - el.clientHeight - 30; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/DOORS-${w}.png`, fullPage: false });
  // detect horizontal overflow
  const oflow = await page.evaluate(() => {
    const html = document.documentElement;
    return { docW: html.scrollWidth, viewW: html.clientWidth, hasH: html.scrollWidth > html.clientWidth + 1 };
  });
  console.log(`viewport ${w}: doc=${oflow.docW}, view=${oflow.viewW}, overflow=${oflow.hasH}`);
  await ctx.close();
}
await browser.close();
