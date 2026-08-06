import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const pages = [
  { name: 'accueil', url: `${BASE}/` },
  { name: 'coffre', url: `${BASE}/coffre` },
  { name: 'auberge-wwoofing', url: `${BASE}/wwoofing` },
  { name: 'ceilidh', url: `${BASE}/ceilidh` },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const p of pages) {
  try {
    await page.goto(p.url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `/private/tmp/claude-501/-Users-lesalondesinconnus/52f604f3-4bda-4f4e-bc2b-50e0ee917bbb/scratchpad/${p.name}.png`, fullPage: false });
    console.log(`OK: ${p.name} (${p.url})`);
  } catch (e) {
    console.log(`FAIL: ${p.name} (${p.url}) - ${e.message}`);
  }
}

await browser.close();
