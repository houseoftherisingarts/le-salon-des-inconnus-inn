import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const external = [];
page.on('popup', (p) => external.push('popup:' + p.url()));

await page.goto('https://lesalondesinconnus.com/tools', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const ess = page.locator('button', { hasText: /essentiel seulement|essential only/i }).first();
if (await ess.count()) await ess.click().catch(() => {});

const demo = page.locator('button', { hasText: /Essayer la démo en ligne|Try the online demo/ }).first();
await demo.click();
await page.waitForTimeout(3500);
console.log('URL apres clic sur la demo :', page.url());
console.log('popups :', external.length ? external : 'aucun');
console.log('titre visible :', (await page.title()));
await page.screenshot({ path: '/private/tmp/claude-501/-Users-lesalondesinconnus/06b2c168-d024-4447-b32e-84b36a22dd05/scratchpad/demo-live.png' });
await browser.close();
