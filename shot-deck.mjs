import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);

// Locate the L'Espace section and scroll it into view (centered).
const handle = await page.$('section[data-l-espace]');
if (!handle) { console.log('NO ESPACE SECTION'); await browser.close(); process.exit(1); }
const box = await handle.boundingBox();
const scroller = await page.$('[data-inn-scroll]');
const scrollY = await scroller.evaluate((el) => el.scrollTop);
// scroll so section center aligns with viewport center
const targetTop = box.y + scrollY + box.height / 2 - 450;
await scroller.evaluate((el, y) => { el.scrollTop = y; }, targetTop);
await page.waitForTimeout(1400);
await page.screenshot({ path: '/tmp/deck-closed-EN.png', fullPage: false });
console.log('shot 1 done — EN closed');

// FR mode — try clicking language toggle if present
try {
  await page.click('text=FR', { timeout: 1000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/deck-closed-FR.png', fullPage: false });
  console.log('shot 2 done — FR closed');
} catch (e) { console.log('no FR toggle reachable:', e.message); }

// Click the deck to open
await page.evaluate(() => {
  const sec = document.querySelector('section[data-l-espace]');
  const card = sec?.querySelector('[role="button"]');
  if (card) card.click();
});
await page.waitForTimeout(2200);
await page.screenshot({ path: '/tmp/deck-open.png', fullPage: false });
console.log('shot 3 done — opened');

// Frame timing during the open transition
const frames = await page.evaluate(() => new Promise((resolve) => {
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
const slow = frames.filter(f => f > 22).length;
console.log('FRAMES:', frames.length, 'slow(>22ms):', slow, 'avg:', (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2));

await browser.close();
