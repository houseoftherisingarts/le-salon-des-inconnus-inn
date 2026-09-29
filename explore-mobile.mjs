import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[class*="overflow-x"],[class*="snap"],[class*="piste"]').forEach(el => {
    out.push({ tag: el.tagName, cls: el.className.toString().slice(0,150), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowX: getComputedStyle(el).overflowX });
  });
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
