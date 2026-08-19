import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:5179/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(10000);
try { await page.getByRole('button', { name: /essentiel/i }).click({ timeout: 2000 }); } catch {}
// scroll inn container to rooms section
const sel = '[data-inn-scroll]';
await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollTop = el.scrollHeight * 0.35; }, sel);
await page.waitForTimeout(2500);
// find a room card mentioning The Writer / L'Écrivaine and click it
const card = page.locator('text=/Écrivaine|Writer/i').first();
await card.scrollIntoViewIfNeeded().catch(()=>{});
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/extrabed-cards.png' });
await card.click({ timeout: 5000 }).catch(e => errs.push('card click: '+e.message));
await page.waitForTimeout(4000);
await page.screenshot({ path: '/tmp/extrabed-modal.png' });
// scroll modal content down to see guests input + note
await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 100 && d.clientHeight > 300);
  boxes.forEach(b => b.scrollTop = b.scrollHeight * 0.5);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/extrabed-modal-mid.png' });
console.log('errors:', errs.length ? errs : 'none');
const hasNote = await page.locator("text=/lit d'appoint|extra bed/i").count();
console.log('extra-bed text nodes visible:', hasNote);
await browser.close();
