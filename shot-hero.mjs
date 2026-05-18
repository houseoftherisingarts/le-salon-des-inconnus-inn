import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/mainpagetest3', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: '/tmp/test3-hero-now.png', fullPage: false });
console.log('hero shot 1');

// take another shot 4s later to see if cycler is rotating
await page.waitForTimeout(5500);
await page.screenshot({ path: '/tmp/test3-hero-now-2.png', fullPage: false });
console.log('hero shot 2');

// check whether canvas is rendering or fallback
const heroState = await page.evaluate(() => {
  const cycler = document.querySelector('canvas');
  const fallbackBg = document.querySelector('[style*="display: none"][style*="absolute"]');
  return {
    canvasDisplay: cycler ? getComputedStyle(cycler).display : 'NO CANVAS',
    canvasW: cycler ? cycler.width : 0,
    canvasH: cycler ? cycler.height : 0,
  };
});
console.log('HERO STATE:', JSON.stringify(heroState));

await browser.close();
