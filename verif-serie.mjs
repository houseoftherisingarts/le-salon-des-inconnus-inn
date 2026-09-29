import { chromium } from 'playwright';
const fs = await import('fs');

const url = process.argv[2];
const outDir = process.argv[3];
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const dims = await page.evaluate(() => {
    const sticky = document.querySelector('.sticky.top-0.h-screen');
    if (!sticky) return null;
    const section = sticky.closest('section');
    const rect = section.getBoundingClientRect();
    return {
      sectionTop: rect.top + window.scrollY,
      sectionHeight: section.offsetHeight,
    };
  });

  if (!dims) {
    console.log(name, 'SECTION SÉRIE INTROUVABLE');
    await page.close();
    continue;
  }

  const mid = dims.sectionTop + dims.sectionHeight / 2;
  await page.evaluate((y) => window.scrollTo(0, y), mid);
  await page.waitForTimeout(600);

  await page.screenshot({ path: `${outDir}/${name}-serie-milieu.jpg`, type: 'jpeg', quality: 80 });

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollX: window.scrollX,
  }));
  console.log(name, JSON.stringify(overflow));
  await page.close();
}

await browser.close();
