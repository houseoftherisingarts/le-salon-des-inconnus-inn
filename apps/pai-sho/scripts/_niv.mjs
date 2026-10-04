import { chromium } from 'playwright';
const S = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await b.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:5178/?intro=0', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('paisho.progression', JSON.stringify(['iroh', 'jet', 'aang'])); });
  await page.goto('http://localhost:5178/?intro=0', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const porte = page.locator('[data-test=porte]'); if (await porte.count()) await porte.click();
  await page.waitForSelector('[data-test=niveaux]', { timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.click('[data-test=niveaux]');
  await page.waitForSelector('[data-test=niveaux-ecran]');
  await page.waitForTimeout(1800);
  console.log(w, await page.evaluate(() => ({ imgs: document.querySelectorAll('.niveau-vignette').length, cassees: [...document.querySelectorAll('.niveau-vignette')].filter((i) => !i.complete || i.naturalWidth === 0).length })));
  await page.screenshot({ path: `${S}/niv-${w}.jpg`, quality: 72 });
  await page.close();
}
await b.close();
