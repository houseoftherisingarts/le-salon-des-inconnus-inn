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

// Click into Pratique panel (vertical label)
await page.locator('text=/^Pratique$/').first().click({ timeout: 5000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/pratique-top.png', fullPage: false });
console.log('top ok');

// Scroll the active panel to reveal each subsection
const sel = '.custom-scrollbar';
for (const [name, ratio] of [['contribute', 0.25], ['map', 0.5], ['contact', 0.75], ['bottom', 1.0]]) {
  await page.evaluate(({ sel, ratio }) => {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (window.getComputedStyle(el).opacity === '1') {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = max * ratio;
      }
    }
  }, { sel, ratio });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/pratique-${name}.png`, fullPage: false });
  console.log(`${name} ok`);
}

await browser.close();
