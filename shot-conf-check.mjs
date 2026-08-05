import { chromium } from 'playwright';

const url = 'http://localhost:4173/coffre';
const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/52f604f3-4bda-4f4e-bc2b-50e0ee917bbb/scratchpad';

const browser = await chromium.launch();

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  // Force French (localStorage key salonToolsLang) then reload to be sure.
  await page.evaluate(() => localStorage.setItem('salonToolsLang', 'FR'));
  await page.reload({ waitUntil: 'networkidle' });

  // Find the "Voir le plan de la conférence" button and the request button, scroll to section.
  const heading = page.getByText('Une soirée famille dans votre village.', { exact: false });
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/conf-${label}-section.png`, fullPage: false });

  // Click "Voir le plan de la conférence"
  const planBtn = page.getByRole('button', { name: /Voir le plan de la conférence/i });
  await planBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/conf-${label}-plan.png`, fullPage: false });

  // Click "Demander une conférence"
  const formBtn = page.getByRole('button', { name: /Demander une conférence/i });
  await formBtn.scrollIntoViewIfNeeded();
  await formBtn.click();
  await page.waitForTimeout(700);
  await formBtn.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/conf-${label}-form.png`, fullPage: false });

  await page.close();
}

await browser.close();
console.log('done');
