import { chromium } from 'playwright';
const fs = await import('fs');

const url = process.argv[2];
const outDir = process.argv[3];
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const result = await page.evaluate(() => {
  const bande = document.querySelector('.es-bande.es-piste');
  if (!bande) return null;
  bande.scrollLeft = (bande.scrollWidth - bande.clientWidth) / 2;
  return {
    scrollWidthDoc: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollX: window.scrollX,
    bandeScrollLeft: bande.scrollLeft,
  };
});
console.log(JSON.stringify(result, null, 1));

// scroll page down to the section containing the band first, then shoot
await page.evaluate(() => {
  const bande = document.querySelector('.es-bande.es-piste');
  bande.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/mobile-serie-milieu.jpg`, type: 'jpeg', quality: 80 });

await browser.close();
