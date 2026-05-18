import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto('http://localhost:5178/mainpagetest', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);

try {
  await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 });
  await page.waitForTimeout(800);
} catch {}

await page.screenshot({ path: '/tmp/test-hero.png', fullPage: false });
console.log('hero ok');

const sel = '[data-inn-scroll]';
const STEPS = 10;
for (let i = 1; i < STEPS; i++) {
  const ratio = i / (STEPS - 1);
  await page.evaluate(({ s, r }) => {
    const el = document.querySelector(s);
    if (el) el.scrollTop = (el.scrollHeight - el.clientHeight) * r;
  }, { s: sel, r: ratio });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/test-${String(i).padStart(2,'0')}.png`, fullPage: false });
}
console.log('scrolls done');

await browser.close();
