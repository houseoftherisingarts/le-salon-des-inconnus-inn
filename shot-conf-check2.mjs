import { chromium } from 'playwright';

const url = 'http://localhost:4173/coffre';
const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/52f604f3-4bda-4f4e-bc2b-50e0ee917bbb/scratchpad';

const browser = await chromium.launch();

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('salonToolsLang', 'FR'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=Une soirée famille dans votre village.', { timeout: 15000 });
  await page.waitForTimeout(500);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollX: window.scrollX,
  }));
  console.log(label, 'overflow check:', JSON.stringify(overflow));

  const heading = page.getByText('Une soirée famille dans votre village.', { exact: false });
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/v2-${label}-section-top.png` });

  // scroll a bit more to see the calendar cards
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/v2-${label}-calendar.png` });

  const overflow2 = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollX: window.scrollX,
  }));
  console.log(label, 'overflow after scroll:', JSON.stringify(overflow2));

  await page.close();
}

await browser.close();
console.log('done');
