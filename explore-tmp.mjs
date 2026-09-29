import { chromium } from 'playwright';

const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Dump candidate clickable elements with text mentioning cm, ×, dimensions
const info = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('*').forEach(el => {
    const txt = el.textContent || '';
    if (/\d+\s*(cm|x|×)\s*\d+/i.test(txt) && el.children.length < 5 && txt.length < 200) {
      results.push({ tag: el.tagName, cls: el.className?.toString().slice(0,80), text: txt.trim().slice(0,100) });
    }
  });
  return results.slice(0, 30);
});
console.log(JSON.stringify(info, null, 1));

// Also list buttons/links with "échelle" or "pièce" or "room" or "scale"
const scaleWords = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('button, a, [role=button]').forEach(el => {
    const t = (el.textContent||'').trim();
    if (t) results.push(t.slice(0,60));
  });
  return [...new Set(results)].slice(0, 60);
});
console.log('BUTTONS:', JSON.stringify(scaleWords, null, 1));

await browser.close();
