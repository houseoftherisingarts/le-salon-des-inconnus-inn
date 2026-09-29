// ponytail: script jetable pour un tour de vérification, pas un outil réutilisable packagé
import { chromium } from 'playwright';

const url = process.argv[2];
const outDir = process.argv[3];
if (!url || !outDir) { console.error('usage: node echelle-piece.mjs <url> <outDir>'); process.exit(1); }

const fs = await import('fs');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [label, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // chercher une oeuvre cliquable (image dans le mur) avec des dimensions affichées quelque part
  const candidates = await page.locator('img').all();
  let clicked = false;
  for (const img of candidates) {
    try {
      const box = await img.boundingBox();
      if (!box || box.width < 60 || box.height < 60) continue;
      await img.scrollIntoViewIfNeeded();
      await img.click({ timeout: 2000 });
      clicked = true;
      break;
    } catch { continue; }
  }

  await page.waitForTimeout(1200);

  // chercher un déclencheur "voir à l'échelle" / "dans une pièce" si le clic simple n'a pas suffi
  const scaleBtn = page.getByText(/échelle|dans une pi[eè]ce|voir sur le mur/i).first();
  if (await scaleBtn.count().catch(() => 0)) {
    try { await scaleBtn.click({ timeout: 2000 }); await page.waitForTimeout(1200); } catch {}
  }

  await page.screenshot({ path: `${outDir}/echelle-${label}.jpg`, type: 'jpeg', quality: 80, fullPage: false });
  console.log(`${label}: clic sur oeuvre=${clicked}, capture écrite`);
  await page.close();
}
await browser.close();
