import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
try { await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 }); await page.waitForTimeout(500); } catch {}
await page.screenshot({ path: '/tmp/test3-hero.png', fullPage: false });
console.log('hero shot');

const meta = await page.evaluate(() => {
  const el = document.querySelector('[data-inn-scroll]');
  return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
});
console.log('META:', JSON.stringify(meta));

// Section 2: starts at 1vh (after hero), occupies 200vh
const sec2Start = meta.ch;
const sec2Range = meta.ch;
for (const [name, p] of [['mid', 0.5]]) {
  const targetY = sec2Start + sec2Range * p;
  await page.evaluate((y) => {
    const el = document.querySelector('[data-inn-scroll]');
    if (el) el.scrollTop = y;
  }, targetY);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/test3-sec2-${name}.png`, fullPage: false });
}

// Section 3: starts at sec2 end (3vh from top), occupies 400vh = 4vh of scroll, 3vh of horizontal range
const sec3Start = meta.ch * 3;
const sec3Range = meta.ch * 3;
for (const [name, p] of [['p2', 0.40]]) {
  const targetY = sec3Start + sec3Range * p;
  await page.evaluate((y) => {
    const el = document.querySelector('[data-inn-scroll]');
    if (el) el.scrollTop = y;
  }, targetY);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/test3-sec3-${name}.png`, fullPage: false });
}

// Section 4 (Stay)
const sec4Start = meta.ch * 7;
await page.evaluate((y) => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop = y; }, sec4Start + meta.ch * 0.2);
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/test3-sec4-top.png', fullPage: false });

// Section 5 (Ceilidh teaser) — starts after sec4 (~150vh)
const sec5Start = meta.sh - meta.ch * 2.5; // approx — second-to-last viewport
await page.evaluate((y) => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop = y; }, sec5Start);
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/test3-sec5.png', fullPage: false });

// Section 6 (map footer) — bottom of page
await page.evaluate(() => { const el = document.querySelector('[data-inn-scroll]'); if (el) el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/test3-sec6-map.png', fullPage: false });

console.log('all shots done');
await browser.close();
