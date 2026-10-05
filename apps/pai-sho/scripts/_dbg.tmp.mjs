import { chromium } from 'playwright';
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => console.log('CON', m.type(), m.text().slice(0, 200)));
await page.goto('http://localhost:5178/?intro=0');
await new Promise((r) => setTimeout(r, 15000));
console.log(await page.evaluate(() => document.body.innerHTML.slice(0, 1500)));
await nav.close();
