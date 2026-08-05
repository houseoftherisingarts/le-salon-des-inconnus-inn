import { chromium } from 'playwright';

const url = 'http://localhost:4173/coffre';
const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/52f604f3-4bda-4f4e-bc2b-50e0ee917bbb/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', msg => console.log('LOG:', msg.text()));
page.on('pageerror', err => console.log('ERR:', err.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('text=Une soirée famille dans votre village.', { state: 'visible', timeout: 15000 });
console.log('found heading, taking screenshot immediately');
await page.screenshot({ path: `${outDir}/debug2-immediate.png` });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outDir}/debug2-after1s.png` });
const heading = page.getByText('Une soirée famille dans votre village.', { exact: false });
await heading.scrollIntoViewIfNeeded();
console.log('scrolled');
await page.screenshot({ path: `${outDir}/debug2-afterscroll.png` });
await browser.close();
