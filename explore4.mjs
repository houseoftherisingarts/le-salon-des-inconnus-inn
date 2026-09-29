import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const el = document.querySelector('[class*="snap-start"]');
  const parents = [];
  let p = el?.parentElement;
  let depth = 0;
  while (p && depth < 4) {
    parents.push({ tag: p.tagName, cls: p.className.toString().slice(0,150), scrollWidth: p.scrollWidth, clientWidth: p.clientWidth, overflowX: getComputedStyle(p).overflowX });
    p = p.parentElement;
    depth++;
  }
  return parents;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
