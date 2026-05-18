import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);

// Hero shot
await page.screenshot({ path: '/tmp/final-hero.png', fullPage: false });
console.log('hero shot');

// Hero idle FPS (Ken Burns running)
let frames = await page.evaluate(() => new Promise((resolve) => {
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
let slow = frames.filter(f => f > 22).length;
console.log('HERO FPS — frames:', frames.length, 'slow:', slow, 'avg:', (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2));

// Scroll to deck
const handle = await page.$('section[data-l-espace]');
const box = await handle.boundingBox();
const scroller = await page.$('[data-inn-scroll]');
const scrollY = await scroller.evaluate((el) => el.scrollTop);
const targetTop = box.y + scrollY + box.height / 2 - 450;
await scroller.evaluate((el, y) => { el.scrollTop = y; }, targetTop);
await page.waitForTimeout(1500);

// Closed idle FPS
frames = await page.evaluate(() => new Promise((resolve) => {
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
slow = frames.filter(f => f > 22).length;
console.log('DECK CLOSED IDLE — frames:', frames.length, 'slow:', slow, 'avg:', (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2));

await page.screenshot({ path: '/tmp/final-deck-closed.png', fullPage: false });
console.log('deck closed shot');

// Open
await page.evaluate(() => {
  const sec = document.querySelector('section[data-l-espace]');
  const card = sec?.querySelector('[role="button"]');
  if (card) card.click();
});
await page.waitForTimeout(2200);
await page.screenshot({ path: '/tmp/final-deck-open.png', fullPage: false });
console.log('deck open shot');

// Open idle FPS
frames = await page.evaluate(() => new Promise((resolve) => {
  const out = []; let last = performance.now(); let i = 0;
  const tick = (now) => { out.push(now - last); last = now; i++; if (i < 90) requestAnimationFrame(tick); else resolve(out); };
  requestAnimationFrame(tick);
}));
slow = frames.filter(f => f > 22).length;
console.log('DECK OPEN IDLE — frames:', frames.length, 'slow:', slow, 'avg:', (frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(2));

await browser.close();
