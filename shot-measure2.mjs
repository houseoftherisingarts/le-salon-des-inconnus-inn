import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173/coffre', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const heading = page.getByText('Une soirée famille dans votre village.', { exact: false });
await heading.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(300);

const pills = await page.locator('span:text-is("À déterminer")').all();
console.log('pill count', pills.length);
for (const p of pills) {
  const box = await p.boundingBox();
  console.log(box);
}

const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflowX);
const htmlOverflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflowX);
console.log('body overflow-x', bodyOverflow, 'html overflow-x', htmlOverflow);
await browser.close();
