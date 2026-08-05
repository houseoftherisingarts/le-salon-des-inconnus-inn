import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173/coffre', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const heading = page.getByText('Une soirée famille dans votre village.', { exact: false });
await heading.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(300);

const info = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('[class*="rounded-[15px]"][class*="border-[#c5a059]/25"]'));
  return cards.slice(0, 6).map((c) => {
    const rect = c.getBoundingClientRect();
    const pill = c.querySelector('span.shrink-0.text-\\[9px\\]');
    const pillRect = pill ? pill.getBoundingClientRect() : null;
    return { cardLeft: rect.left, cardRight: rect.right, cardWidth: rect.width, pillRight: pillRect?.right, pillLeft: pillRect?.left, pillText: pill?.textContent };
  });
});
console.log(JSON.stringify(info, null, 2));
console.log('viewport width 390');
await browser.close();
