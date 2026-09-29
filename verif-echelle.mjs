import { chromium } from 'playwright';

const url = process.argv[2];
const outDir = process.argv[3];
const fs = await import('fs');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const btn = page.getByRole('button', { name: 'À l’échelle' }).first();
  const exists = await btn.count();
  if (!exists) {
    console.log(name, 'BOUTON À L\'ÉCHELLE INTROUVABLE');
    await page.close();
    continue;
  }
  await btn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/${name}-echelle.jpg`, type: 'jpeg', quality: 80, fullPage: true });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollX: window.scrollX,
  }));
  console.log(name, JSON.stringify(overflow));
  await page.close();
}

await browser.close();
