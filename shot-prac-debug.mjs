import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text()); });
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"]').forEach((el) => { el.style.display = 'none'; });
});
// Sign in via card 05
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="05"]')?.click());
await page.waitForTimeout(700);
if (await page.$('.login-modal')) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.login-modal button')].find(x => (x.textContent||'').toLowerCase().includes('google'));
    b?.click();
  });
  await page.waitForTimeout(1100);
}
// Scroll to bottom of pratique
await page.evaluate(() => { const el = document.querySelector('.chapter-fullscreen'); if (el) el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/PRAC-bottom.png', fullPage: false });

// Inspect button list
const btns = await page.evaluate(() => {
  const fs = document.querySelector('.chapter-fullscreen');
  if (!fs) return [];
  return [...fs.querySelectorAll('button, a')].map(b => ({
    tag: b.tagName,
    text: (b.textContent||'').trim().slice(0,60),
    disabled: b.disabled || b.getAttribute('aria-disabled'),
    hasOnClick: !!b.onclick,  // heuristic — React doesn't set onclick
    cls: (b.className||'').toString().slice(0,80),
  }));
});
console.log('BUTTONS in pratique:', btns.length);
btns.slice(0, 18).forEach(b => console.log(' -', JSON.stringify(b)));

// Try clicking "+ Add a Need" via JS
console.log('\n--- testing "Ajouter un Besoin" click ---');
const beforeShowForm = await page.evaluate(() => !!document.querySelector('.chapter-fullscreen input[placeholder*="Nacelle"], .chapter-fullscreen input[placeholder*="Tronçonneuse"]'));
console.log('form visible before:', beforeShowForm);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.chapter-fullscreen button')].find(x => /Ajouter un Besoin|Add a Need/i.test(x.textContent||''));
  if (b) b.click(); else console.log('NOT FOUND');
});
await page.waitForTimeout(500);
const afterShowForm = await page.evaluate(() => !!document.querySelector('.chapter-fullscreen input[placeholder*="Nacelle"], .chapter-fullscreen input[placeholder*="Tronçonneuse"]'));
console.log('form visible after:', afterShowForm);

// Try Message Alex
console.log('\n--- testing "Message Alex" ---');
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.chapter-fullscreen button')].find(x => /Message Alex|Message à Alex/i.test(x.textContent||''));
  if (b) b.click();
});
await page.waitForTimeout(300);

console.log('\nERRORS:', errs.length);
errs.slice(0, 6).forEach(e => console.log(' ', e));
await browser.close();
