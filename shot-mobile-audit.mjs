import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text().slice(0,180)); });
page.on('requestfailed', r => errs.push('FAIL: ' + r.url().slice(0, 100) + ' ' + r.failure()?.errorText));

await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7500);
await page.evaluate(() => { document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; }); });

// Hero
await page.screenshot({ path: '/tmp/M-01-hero.png', fullPage: false });

// Step through entire page
const sc = await page.$('[data-inn-scroll]');
const total = await sc.evaluate((el) => el.scrollHeight);
const vh = 812;
let y = 0, i = 1;
while (y < total) {
  await sc.evaluate((el, ny) => { el.scrollTop = ny; }, y);
  await page.waitForTimeout(700);
  i++;
  await page.screenshot({ path: `/tmp/M-${String(i).padStart(2,'0')}.png`, fullPage: false });
  y += Math.floor(vh * 0.85);
}

// Detect any image with naturalWidth=0 (failed to load)
const brokenImgs = await page.evaluate(() => {
  return [...document.querySelectorAll('img')]
    .filter(img => img.complete && img.naturalWidth === 0)
    .map(img => ({ src: img.src.slice(0, 100), alt: img.alt }));
});
console.log('Broken images:', brokenImgs.length);
brokenImgs.slice(0, 8).forEach(b => console.log(' -', JSON.stringify(b)));

// Detect any element wider than viewport (real overflow)
const oflow = await page.evaluate(() => {
  return [...document.querySelectorAll('*')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > window.innerWidth + 1 &&
             // ignore intentional horizontal-scroll and ken-burns wrappers
             !el.closest('.animate-scroll') && !el.closest('[class*="kenburns"]');
    })
    .slice(0, 12)
    .map((el) => ({
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 80),
      right: Math.round(el.getBoundingClientRect().right),
      w: Math.round(el.getBoundingClientRect().width),
    }));
});
console.log('\nOverflow violators:', oflow.length);
oflow.forEach(v => console.log(' -', JSON.stringify(v)));

console.log('\nERRORS:', errs.length);
errs.slice(0, 10).forEach(e => console.log(' ', e));
console.log('\nTOTAL SCROLL HEIGHT:', total, 'screenshots:', i);
await browser.close();
