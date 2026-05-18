import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
try { await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 }); await page.waitForTimeout(500); } catch {}
await page.screenshot({ path: '/tmp/test2-hero.png', fullPage: false });
console.log('hero shot');

const meta = await page.evaluate(() => {
  const el = document.querySelector('[data-inn-scroll]');
  return el ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight } : null;
});
console.log('META:', JSON.stringify(meta));

// shoot every viewport-height step
const meta2 = await page.evaluate(() => {
  const el = document.querySelector('[data-inn-scroll]');
  return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
});
const steps = Math.max(1, Math.ceil((meta2.sh - meta2.ch) / meta2.ch));
for (let i = 1; i <= steps; i++) {
  await page.evaluate((y) => {
    const el = document.querySelector('[data-inn-scroll]');
    if (el) el.scrollTop = y;
  }, i * meta2.ch);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/test2-${String(i).padStart(2,'0')}.png`, fullPage: false });
}

console.log(`shot ${steps} sections after hero`);
await browser.close();
