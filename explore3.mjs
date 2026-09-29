import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[class*="scroll"],[class*="snap"],[class*="carousel"],[class*="defil"]').forEach(el => {
    out.push({ tag: el.tagName, cls: el.className.toString().slice(0,120), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
  });
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
