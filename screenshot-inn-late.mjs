import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);

try {
  await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 });
  await page.waitForTimeout(500);
} catch {}

const scrollSel = '[data-inn-scroll]';

// Identify each section's starting position by finding their text
const positions = await page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const find = (text) => {
    const all = Array.from(root.querySelectorAll('h1, h2, h3'));
    const el = all.find(e => e.textContent && e.textContent.trim().toLowerCase().includes(text.toLowerCase()));
    if (!el) return null;
    const elBox = el.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    return Math.round(elBox.top - rootBox.top + root.scrollTop);
  };
  return {
    scrollHeight: root.scrollHeight,
    clientHeight: root.clientHeight,
    espace:     find("L'Espace"),
    services:   find("Services"),
    details:    find("Ressentez"),
    video:      find("Présente"),
    localguide: find("Guide Local"),
    hosts:      find("Découvrez"),
    events:     find("Grand Ceilidh"),
    wwoofing:   find("Wwoofing"),
  };
}, scrollSel);
console.log('SECTION POSITIONS:', JSON.stringify(positions, null, 2));

// Take screenshots AT each section's scroll position
const named = [
  ['localguide', positions?.localguide],
  ['hosts', positions?.hosts],
  ['events', positions?.events],
  ['wwoofing', positions?.wwoofing],
];

for (const [name, top] of named) {
  if (top == null) { console.log(`${name}: not found`); continue; }
  await page.evaluate(({ sel, top }) => {
    const el = document.querySelector(sel);
    if (el) el.scrollTop = top;
  }, { sel: scrollSel, top });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/innx-${name}-at.png`, fullPage: false });
  // Also shoot 400px past the section start
  await page.evaluate(({ sel, top }) => {
    const el = document.querySelector(sel);
    if (el) el.scrollTop = top + 400;
  }, { sel: scrollSel, top });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/innx-${name}-plus400.png`, fullPage: false });
  console.log(`${name}: shot at ${top} and ${top + 400}`);
}

await browser.close();
