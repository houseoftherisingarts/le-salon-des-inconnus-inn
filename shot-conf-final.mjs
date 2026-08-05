import { chromium } from 'playwright';

const url = 'http://localhost:4173/coffre';
const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/52f604f3-4bda-4f4e-bc2b-50e0ee917bbb/scratchpad';

const browser = await chromium.launch();

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Une soirée famille dans votre village.', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);

  const heading = page.getByText('Une soirée famille dans votre village.', { exact: false });
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/final-${label}-1-intro.png` });

  // scroll to reveal the calendar cards fully
  await page.mouse.wheel(0, 550);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/final-${label}-2-calendar.png` });

  await page.mouse.wheel(0, 550);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/final-${label}-3-cta.png` });

  const planBtn = page.getByRole('button', { name: /Voir le plan de la conférence/i });
  await planBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/final-${label}-4-plan.png` });

  const formBtn = page.getByRole('button', { name: /Demander une conférence/i });
  await formBtn.click();
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/final-${label}-5-form.png` });

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log(label, 'overflow:', JSON.stringify(overflow));

  await page.close();
}

await browser.close();
console.log('done');
