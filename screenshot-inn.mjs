import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const consoleLog = [];
const pageErrors = [];
page.on('console', m => consoleLog.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => pageErrors.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
// Wait for loading screen + InnPage chunk + WebGL hero init
await page.waitForTimeout(10000);

// Dismiss cookie banner
try {
  await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 });
  await page.waitForTimeout(500);
} catch {}

// InnPage uses a per-page fixed scroll container with `data-inn-scroll`.
// We scroll INSIDE that container, not window.
const scrollSel = '[data-inn-scroll]';

// Confirm the scroll container exists + measure
const scrollInfo = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return { found: false };
  return {
    found: true,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollTop: el.scrollTop,
  };
}, scrollSel);
console.log('SCROLL CONTAINER:', JSON.stringify(scrollInfo));

// Take 12 evenly-spaced shots through the page
const STEPS = 12;
for (let i = 0; i < STEPS; i++) {
  const ratio = i / (STEPS - 1);
  await page.evaluate(({ sel, ratio }) => {
    const el = document.querySelector(sel);
    if (!el) {
      // Fallback to window scroll
      window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * ratio);
      return;
    }
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = max * ratio;
  }, { sel: scrollSel, ratio });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/inn-${String(i).padStart(2, '0')}.png`, fullPage: false });
}
console.log('all scrolls captured');

// Look for Local Guide section and shoot it
try {
  const locator = page.locator('text=/Guide Local|Local Guide/i').first();
  const handle = await locator.elementHandle();
  if (handle) {
    await handle.scrollIntoViewIfNeeded({ timeout: 3000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/inn-localguide.png`, fullPage: false });
    console.log('local guide ok');
  }
} catch (e) { console.log('local guide failed:', e.message); }

// Print console log + errors
console.log('---CONSOLE---');
console.log(consoleLog.slice(0, 30).join('\n'));
console.log('---PAGE ERRORS---');
console.log(pageErrors.join('\n'));

await browser.close();
