import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);

try {
  await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 });
  await page.waitForTimeout(500);
} catch {}

// Inspect the sticky-stack: each <section> with position:sticky inside data-inn-scroll
const measurements = await page.evaluate(() => {
  const root = document.querySelector('[data-inn-scroll]');
  if (!root) return { error: 'no data-inn-scroll' };
  const sections = Array.from(root.querySelectorAll('section'));
  const out = [];
  for (const s of sections) {
    const cs = window.getComputedStyle(s);
    if (cs.position !== 'sticky') continue;
    const r = s.getBoundingClientRect();
    out.push({
      pos: cs.position,
      top: cs.top,
      zIndex: cs.zIndex,
      offsetHeight: s.offsetHeight,
      clientHeight: s.clientHeight,
      minHeight: cs.minHeight,
      rectTop: Math.round(r.top),
      rectBottom: Math.round(r.bottom),
      rectHeight: Math.round(r.height),
      firstChild: s.firstElementChild?.outerHTML?.slice(0, 120) || '',
      // What's inside?
      innerHeight: s.firstElementChild?.getBoundingClientRect().height || 0,
    });
  }
  return {
    rootScrollHeight: root.scrollHeight,
    rootClientHeight: root.clientHeight,
    rootScrollTop: root.scrollTop,
    sections: out,
  };
});
console.log('AT TOP:');
console.log(JSON.stringify(measurements, null, 2));

// Now scroll to events area and re-measure
await page.evaluate(() => {
  const root = document.querySelector('[data-inn-scroll]');
  if (root) root.scrollTop = 11469;
});
await page.waitForTimeout(1500);

const atEvents = await page.evaluate(() => {
  const root = document.querySelector('[data-inn-scroll]');
  if (!root) return { error: 'no data-inn-scroll' };
  const sections = Array.from(root.querySelectorAll('section'));
  const out = [];
  for (const s of sections) {
    const cs = window.getComputedStyle(s);
    if (cs.position !== 'sticky') continue;
    const r = s.getBoundingClientRect();
    out.push({
      zIndex: cs.zIndex,
      top: cs.top,
      rectTop: Math.round(r.top),
      rectBottom: Math.round(r.bottom),
      rectHeight: Math.round(r.height),
      offsetHeight: s.offsetHeight,
      visible: r.top < 900 && r.bottom > 0,
    });
  }
  return { rootScrollTop: root.scrollTop, sections: out };
});
console.log('AT EVENTS (scrollTop 11469):');
console.log(JSON.stringify(atEvents, null, 2));

await browser.close();
