// Photographie chaque figurine de public/models/convives en vignette webp
// (public/models/convives/vignettes/<id>.webp, 256 px) pour l'écran des
// niveaux, et dresse deux planches de contrôle dans le dossier donné.
// Usage : npx vite --port 5178 & node scripts/vignettes.mjs <dossier-planches>
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const S = process.argv[2]; const IDS = ['iroh','chou','jet','aang','sokka','katara','mai','kyoshi','tylee','zhao','jeongjeong','zuko','longfeng','pakku','piandao','toph','hama','azula','wanshitong','bumi','ozai','irohek'];
const OUT = 'public/models/convives/vignettes'; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 600, height: 600 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('http://localhost:5178/scripts/vignettes.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => typeof window.rendre === 'function', null, { timeout: 120000 });
// planche : 6 colonnes, cellule 256, étiquette
const planche = await b.newPage({ viewport: { width: 6 * 256, height: Math.ceil(IDS.length / 6) * 290 } });
for (const suffixe of ['', '2']) {
  const cellules = [];
  for (const id of IDS) {
    try {
      const png = await page.evaluate((i) => window.rendre(i, null), id + suffixe);
      writeFileSync(`${OUT}/${id}${suffixe}.webp`, Buffer.from(png.split(',')[1], 'base64'));
      cellules.push(`<div><img src="${png}"><span>${id}${suffixe}</span></div>`);
    } catch (e) { cellules.push(`<div><span>${id}${suffixe} ÉCHEC</span></div>`); console.log('échec', id + suffixe, String(e).slice(0, 80)); }
  }
  await planche.setContent(`<style>body{margin:0;background:#2a1a0e;display:grid;grid-template-columns:repeat(6,256px)}div{height:290px;position:relative}img{width:256px;height:256px}span{position:absolute;bottom:4px;left:8px;color:#fff;font:bold 18px sans-serif}</style>${cellules.join('')}`);
  await planche.screenshot({ path: `${S}/planche${suffixe || '1'}.jpg`, quality: 80, fullPage: true });
  console.log('planche', suffixe || '1');
}
await b.close();
