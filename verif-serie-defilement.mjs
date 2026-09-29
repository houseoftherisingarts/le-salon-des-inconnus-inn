// ponytail: script jetable pour un tour de vérification, pas un outil réutilisable packagé
import { chromium } from 'playwright';

const url = process.argv[2];
const outDir = process.argv[3];
if (!url || !outDir) { console.error('usage: node serie-defilement.mjs <url> <outDir>'); process.exit(1); }

const fs = await import('fs');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [label, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // trouver un conteneur qui défile horizontalement (série)
  const info = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    let best = null;
    for (const el of els) {
      const sw = el.scrollWidth, cw = el.clientWidth;
      if (sw > cw + 40 && cw > 200) {
        const style = getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          if (!best || (sw - cw) > (best.sw - best.cw)) {
            best = { sw, cw, tag: el.tagName, cls: el.className?.toString?.() || '' };
          }
        }
      }
    }
    return best;
  });

  if (info) {
    // défiler jusqu'au milieu du conteneur trouvé
    await page.evaluate((target) => {
      const els = Array.from(document.querySelectorAll('*'));
      for (const el of els) {
        const sw = el.scrollWidth, cw = el.clientWidth;
        if (el.tagName === target.tag && sw === target.sw && cw === target.cw) {
          el.scrollLeft = (sw - cw) / 2;
          break;
        }
      }
    }, info);
  } else {
    // repli : défiler la page elle-même à mi-hauteur là où une série est probable
    await page.mouse.wheel(0, 800);
  }
  await page.waitForTimeout(800);

  const scrollX = await page.evaluate(() => window.scrollX);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  await page.screenshot({ path: `${outDir}/serie-${label}.jpg`, type: 'jpeg', quality: 80, fullPage: false });
  console.log(`${label}: conteneur trouvé=${!!info}, window.scrollX=${scrollX}, debordement_document=${overflow}`);
  await page.close();
}
await browser.close();
