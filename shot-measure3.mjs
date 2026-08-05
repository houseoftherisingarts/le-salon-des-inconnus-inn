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
  const pills = Array.from(document.querySelectorAll('span')).filter(s => s.textContent.trim() === 'À déterminer' || s.textContent.trim() === 'Pressenti');
  return pills.map((p) => {
    const card = p.closest('div');
    const cardRect = card.getBoundingClientRect();
    const pillRect = p.getBoundingClientRect();
    const middle = card.querySelector('.min-w-0.flex-1');
    const middleRect = middle ? middle.getBoundingClientRect() : null;
    const badge = card.querySelector('span.shrink-0.w-10');
    const badgeRect = badge ? badge.getBoundingClientRect() : null;
    return {
      text: p.textContent,
      cardWidth: cardRect.width, cardLeft: cardRect.left, cardRight: cardRect.right,
      badgeWidth: badgeRect?.width, badgeRight: badgeRect?.right,
      middleWidth: middleRect?.width, middleLeft: middleRect?.left, middleRight: middleRect?.right,
      pillWidth: pillRect.width, pillLeft: pillRect.left, pillRight: pillRect.right,
    };
  });
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
