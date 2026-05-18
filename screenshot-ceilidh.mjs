import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

// Capture console + page errors so we can diagnose runtime issues
page.on('console', m => console.log(`[console:${m.type()}]`, m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto('http://localhost:5178/ceilidh', { waitUntil: 'domcontentloaded', timeout: 30000 });
// Wait for loading screen + page chunk + hero animations
await page.waitForTimeout(9000);

// Dismiss the cookie banner if visible — clicks "Essentiel seulement"
try {
  await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 });
  await page.waitForTimeout(500);
} catch {}

await page.screenshot({ path: '/tmp/ceilidh-desktop.png', fullPage: false });
console.log('desktop ok');

// FULL-PAGE event tab — shows everything below the hero
// Need to scroll INSIDE the active panel (which has its own scroll container)
const activeScrollSelector = '.custom-scrollbar';
await page.evaluate((sel) => {
  const els = document.querySelectorAll(sel);
  // Active panel's scroll container is the one with opacity 1
  for (const el of els) {
    const opacity = window.getComputedStyle(el).opacity;
    if (opacity === '1') {
      // Scroll to top first
      el.scrollTop = 0;
    }
  }
}, activeScrollSelector);

// Stitch full-page by scrolling and shooting
const sectionShots = [];
const totalScrolls = 8;
for (let i = 0; i < totalScrolls; i++) {
  await page.evaluate(({ sel, idx, total }) => {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (window.getComputedStyle(el).opacity === '1') {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = (max / (total - 1)) * idx;
      }
    }
  }, { sel: activeScrollSelector, idx: i, total: totalScrolls });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/ceilidh-event-${i}.png`, fullPage: false });
}
console.log('event scrolls done');

// Click into each panel to check
for (const panelName of ['Programme', 'Équipes', 'Hébergement', 'Pratique']) {
  try {
    await page.locator(`text=/^${panelName}$/`).first().click({ timeout: 3000 });
    await page.waitForTimeout(1500);
    const safe = panelName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    await page.screenshot({ path: `/tmp/ceilidh-${safe}-top.png`, fullPage: false });
    // Scroll the active panel
    await page.evaluate((sel) => {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (window.getComputedStyle(el).opacity === '1') {
          el.scrollTop = el.scrollHeight / 2;
        }
      }
    }, activeScrollSelector);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/ceilidh-${safe}-mid.png`, fullPage: false });
    console.log(`${panelName} ok`);
  } catch (e) { console.log(`${panelName} click failed:`, e.message); }
}

await browser.close();
