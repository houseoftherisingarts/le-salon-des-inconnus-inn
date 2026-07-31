import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/06b2c168-d024-4447-b32e-84b36a22dd05/scratchpad';
const browser = await chromium.launch();

async function shoot(viewport, suffix) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('https://lesalondesinconnus.com/tools', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  // Fermer la bannière témoins si présente
  const ess = page.locator('button', { hasText: /essentiel seulement|essential only/i }).first();
  if (await ess.count()) await ess.click().catch(() => {});
  // Ouvrir le panneau mobile
  const mob = page.locator('button', { hasText: /iPhone, iPad (et|and|y) Android/ }).first();
  await mob.click();
  await page.waitForTimeout(800);
  await mob.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/verify-panel-${suffix}.png` });
  // Icône appréciation
  const svg = page.locator('svg[viewBox="0 0 112 112"]').first();
  await svg.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/verify-icon-${suffix}.png` });
  await ctx.close();
}

await shoot({ width: 1440, height: 900 }, 'desktop');
await shoot({ width: 390, height: 844 }, 'mobile');
await browser.close();
console.log('done');
