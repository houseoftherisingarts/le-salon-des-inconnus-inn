import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/f14f9ec2-7c34-43f2-973b-ee55332ef317/scratchpad';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
const page = await ctx.newPage();
await page.goto('https://inconnus-salon.web.app/', { waitUntil:'domcontentloaded', timeout:45000 });
await page.waitForTimeout(4000);
await page.getByText("Le Centre d'artiste", { exact: false }).first().click().catch(()=>console.log('no centre'));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/px-step1.png` });
for (const t of ['Mécène','MÉCÈNE','Devenir mécène','Soutenir','Investir','Fiscal']) {
  const el = page.getByText(t, { exact: false }).first();
  if (await el.count().catch(()=>0)) { console.log('clicking:', t); await el.click().catch(()=>{}); await page.waitForTimeout(2000); break; }
}
await page.screenshot({ path: `${OUT}/px-step2.png` });
const fisc = page.getByText('Avantages Fiscaux', { exact: false }).first();
if (await fisc.count().catch(()=>0)) { await fisc.click().catch(()=>{}); await page.waitForTimeout(2000); console.log('fiscal clicked'); }
const hasFiscal = await page.evaluate(() => !!document.getElementById('fiscal-section'));
console.log('fiscal-section present:', hasFiscal);
if (hasFiscal) {
  await page.evaluate(() => { const el = document.getElementById('fiscal-section'); window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 620); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/px-band-A.png` });
  await page.evaluate(() => window.scrollBy(0, 420));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/px-band-B.png` });
  console.log('bands captured');
}
await browser.close();
