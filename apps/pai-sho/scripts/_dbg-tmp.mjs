import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3bad1bad-cafb-4928-81ac-ff2c7aad2965/scratchpad/';
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); localStorage.setItem('paisho.tutoriel.paisho', '1'); });
const t0 = Date.now();
await page.goto('http://localhost:5179/?intro=1');
for (let i = 0; i < 14; i++) {
  const s = await page.evaluate(() => { const p = document.querySelector('.prelude'); const r = document.querySelector('.rideau'); return { prelude: p?.dataset.test ?? null, op: p ? getComputedStyle(p).opacity : null, txt: p?.textContent?.slice(0, 30), rideau: r?.className, lettres: document.querySelectorAll('.rideau-titre span').length }; });
  console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s));
  if (i === 6) await page.screenshot({ path: `${OUT}dbg-presentent.jpg`, type: 'jpeg', quality: 80 });
  await pause(800);
}
await page.waitForSelector('.menu', { timeout: 90000 });
await page.click('[data-test="adv-iroh"]');
await pause(400);
console.log(await page.evaluate(() => [...document.querySelectorAll('.perso')].map((b) => `${b.textContent}:${b.className}`).join(' | ')));
await page.mouse.move(5, 5); await pause(300);
await page.evaluate(() => window.__scene?.rendre());
await page.screenshot({ path: `${OUT}dbg-menu.jpg`, type: 'jpeg', quality: 80, clip: { x: 40, y: 320, width: 460, height: 340 } });
await ctx.close(); await nav.close();
