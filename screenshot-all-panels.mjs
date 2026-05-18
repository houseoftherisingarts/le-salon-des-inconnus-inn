import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto('http://localhost:5178/ceilidh', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);

try {
  await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 });
  await page.waitForTimeout(800);
} catch {}

const sel = '.custom-scrollbar';

for (const panelName of ['Programme', 'Équipes', 'Hébergement', 'Pratique']) {
  await page.locator(`text=/^${panelName}$/`).first().click({ timeout: 5000 });
  await page.waitForTimeout(2000);
  const safe = panelName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Top of panel
  await page.evaluate((s) => {
    const els = document.querySelectorAll(s);
    for (const el of els) if (window.getComputedStyle(el).opacity === '1') el.scrollTop = 0;
  }, sel);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/all-${safe}-0.png`, fullPage: false });
  // 33%
  await page.evaluate(({ s, r }) => {
    const els = document.querySelectorAll(s);
    for (const el of els) if (window.getComputedStyle(el).opacity === '1') {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * r;
    }
  }, { s: sel, r: 0.33 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/all-${safe}-33.png`, fullPage: false });
  // 66%
  await page.evaluate(({ s, r }) => {
    const els = document.querySelectorAll(s);
    for (const el of els) if (window.getComputedStyle(el).opacity === '1') {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * r;
    }
  }, { s: sel, r: 0.66 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/all-${safe}-66.png`, fullPage: false });
  console.log(`${panelName} ok`);
}

await browser.close();
