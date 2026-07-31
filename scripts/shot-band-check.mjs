import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/06b2c168-d024-4447-b32e-84b36a22dd05/scratchpad';
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch();

for (const [route, vp, tag] of [
  ['/coffre', { width: 1440, height: 900 }, 'coffre-desktop'],
  ['/coffre', { width: 390, height: 844 }, 'coffre-mobile'],
  ['/tools', { width: 1440, height: 900 }, 'tools-desktop'],
]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  // Bannière témoins : la fermer AVANT de mesurer, sinon elle masque le pied de page.
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /essentiel seulement|essential only/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(900);
  // La bannière de témoins est en position fixe et masque le pied de page :
  // nous la retirons pour la capture (vérification seulement, le site est intact).
  await page.addStyleTag({ content: '[class*="fixed"][class*="bottom-0"]{display:none !important}' });
  const ess = page.locator('button', { hasText: /essentiel seulement|essential only/i }).first();
  if (await ess.count()) await ess.click().catch(() => {});
  // Descendre jusqu'en bas pour declencher les reveals au scroll
  await page.evaluate(async () => {
    const el = document.scrollingElement || document.body;
    const target = document.querySelector('.overflow-y-auto') || el;
    for (let i = 0; i < 40; i++) {
      target.scrollTop = target.scrollHeight * (i / 39);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(1200);
  const bands = await page.locator('text=Une expérience sans publicité, présentée par').count();
  console.log(`${route} @${vp.width} : bandes commanditaire visibles = ${bands}`);
  const last = page.locator('text=Une expérience sans publicité, présentée par').last();
  if (await last.count()) await last.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/band-${tag}.png` });
  await ctx.close();
}
await browser.close();
