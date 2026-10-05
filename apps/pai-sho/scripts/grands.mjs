// Les grands portraits de l'écran « VS » : chaque figurine en 1024 px sur
// fond transparent (public/models/convives/grands/<id>.webp), cadrée plus
// serré que la vignette pour remplir la hauteur de l'écran.
// Usage : npx vite --port 5178 & node scripts/grands.mjs [id,id]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const TOUS = ['iroh','chou','jet','aang','sokka','katara','mai','kyoshi','tylee','zhao','jeongjeong','zuko','longfeng','pakku','piandao','toph','hama','azula','wanshitong','bumi','ozai','irohek'];
const IDS = process.argv[2] ? process.argv[2].split(',') : TOUS.flatMap((i) => [i, i + '2']);
const OUT = 'public/models/convives/grands'; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 1100, height: 1100 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('http://localhost:5178/scripts/vignettes.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => typeof window.rendre === 'function', null, { timeout: 120000 });
for (const id of IDS) {
  try {
    const png = await page.evaluate((i) => window.rendre(i, null, 1024, 1.45), id);
    writeFileSync(`${OUT}/${id}.webp`, Buffer.from(png.split(',')[1], 'base64'));
    console.log(id, 'ok');
  } catch (e) { console.log('échec', id, String(e).slice(0, 80)); }
}
await b.close();
