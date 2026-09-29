import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const sticky = document.querySelector('.sticky.top-0.h-screen');
  const section = sticky.closest('section');
  const wrap = sticky.parentElement; // .relative
  return {
    sectionHeight: section.offsetHeight,
    sectionTop: section.getBoundingClientRect().top + window.scrollY,
    wrapHeight: wrap.offsetHeight,
    docHeight: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
