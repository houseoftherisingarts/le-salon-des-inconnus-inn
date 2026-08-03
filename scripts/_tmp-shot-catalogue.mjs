import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/23cd339e-6c15-41bb-93e3-42630d37ffd1/scratchpad';
const URL = 'http://localhost:4177/catalogue';

const browser = await chromium.launch();

for (const [name, vp] of [
  ['desktop', { width: 1512, height: 950 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Consentement : sortir la banniere du cadre.
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      if (/accepter|accept/i.test(b.textContent || '')) { b.click(); return; }
    }
  });
  await page.waitForTimeout(800);

  // La page vit dans un conteneur `fixed inset-0 overflow-y-auto` : le document
  // ne scrolle pas. On scrolle le conteneur pour declencher les whileInView,
  // puis on le rend statique pour que fullPage capture toute la hauteur.
  const scroller = page.locator('div.fixed.inset-0.overflow-y-auto').first();
  await scroller.evaluate(async (el) => {
    const step = window.innerHeight * 0.75;
    for (let y = 0; y < el.scrollHeight; y += step) {
      el.scrollTop = y;
      await new Promise((r) => setTimeout(r, 300));
    }
    await new Promise((r) => setTimeout(r, 900));
  });

  await scroller.evaluate((el) => {
    el.style.position = 'static';
    el.style.height = 'auto';
    el.style.overflow = 'visible';
    document.body.style.height = 'auto';
    document.body.style.overflow = 'visible';
  });
  await page.waitForTimeout(1400);

  await page.screenshot({ path: `${OUT}/catalogue-${name}-full.png`, fullPage: true });

  // Largeur reelle du document : detecte tout debordement horizontal.
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  console.log(`${name} ok — scrollWidth ${overflow.doc} / viewport ${overflow.win}`);
  await page.close();
}

await browser.close();
