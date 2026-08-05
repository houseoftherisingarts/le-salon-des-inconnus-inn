import { chromium } from 'playwright';

const url = 'http://localhost:4173/coffre';
const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/52f604f3-4bda-4f4e-bc2b-50e0ee917bbb/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const bodyLen = await page.evaluate(() => document.body.innerText.length);
console.log('bodyLen after initial load:', bodyLen);
const hasHeading = await page.locator('text=Une soirée famille dans votre village.').count();
console.log('heading count:', hasHeading);
await page.screenshot({ path: `${outDir}/debug-initial.png` });
await browser.close();
