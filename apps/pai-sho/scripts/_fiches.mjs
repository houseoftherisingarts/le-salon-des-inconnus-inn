import { chromium } from 'playwright';
const URL = 'http://localhost:5178/';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--use-angle=metal'] }).catch(() => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }));
for (const [w, h, nom] of [[1440, 900, 'fiches-1440'], [390, 844, 'fiches-390']]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 500 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('paisho.tutoriel.paisho', '1'); });
  await page.goto(URL);
  await page.waitForSelector('.menu', { timeout: 60000 });
  await pause(900);
  await page.click('[data-test="contre-maison"]');
  await page.waitForSelector('.hud-haut');
  await pause(2500);
  if (w < 500) {
    await page.click('.hud-bas .fiches-bascule');
    await pause(400);
    await page.screenshot({ path: `captures/${nom}.jpg`, type: 'jpeg', quality: 85 });
    await page.tap('.hud-bas .fiche-ligne >> nth=6');
    await pause(400);
    await page.screenshot({ path: `captures/fiches-infobulle-390.jpg`, type: 'jpeg', quality: 85 });
  } else {
    await page.screenshot({ path: `captures/${nom}.jpg`, type: 'jpeg', quality: 85 });
    await page.hover('.hud-gauche .fiche-ligne >> nth=1');
    await pause(400);
    await page.screenshot({ path: `captures/fiches-infobulle-1440.jpg`, type: 'jpeg', quality: 85 });
    await page.evaluate(() => document.querySelector('.hud-gauche .fiches-liste').scrollTo(0, 9999));
    await pause(300);
    await page.mouse.move(150, 500);
    await page.hover('.hud-gauche .fiche-ligne >> nth=7');
    await pause(400);
    await page.screenshot({ path: `captures/fiches-infobulle2-1440.jpg`, type: 'jpeg', quality: 85 });
    const r = await page.evaluate(() => { const b = document.querySelector('.fiche-bulle').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom, innerWidth, innerHeight]; });
    console.log('bulle', r);
  }
  await ctx.close();
}
await nav.close();
