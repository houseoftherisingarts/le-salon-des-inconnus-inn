const { chromium } = require('playwright');

const targets = [
  { url: 'https://le-salon-des-inconnus.web.app/invitation', name: 'invitation' },
  { url: 'https://le-salon-des-inconnus.web.app/entreprises', name: 'entreprises' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/bbdb5113-9d7c-4f3b-a507-ba846b885669/scratchpad';

(async () => {
  const browser = await chromium.launch();
  for (const t of targets) {
    for (const v of viewports) {
      const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
      await page.goto(t.url, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${outDir}/${t.name}-${v.name}.png`, fullPage: true });
      await page.close();
    }
  }
  await browser.close();
  console.log('done');
})();
