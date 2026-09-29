import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Voir les séries' }).first().click().catch(()=>{});
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const style = getComputedStyle(el);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 20) {
      out.push({ tag: el.tagName, cls: el.className.toString().slice(0,100), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    }
  });
  return out;
});
console.log(JSON.stringify(info, null, 1));
console.log('URL after click:', page.url());
await browser.close();
