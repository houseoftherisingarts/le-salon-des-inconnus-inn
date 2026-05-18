import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:5178/ceilidhtest2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(7000);
// Hide cookie banner
await page.evaluate(() => {
  document.querySelectorAll('.animate-slideUp, [class*="z-[250]"], [class*="cookie"], [class*="privacy-banner"]')
    .forEach((el) => { el.style.display = 'none'; });
});

// 1. Click chapter 01 → expect login modal (since not logged in)
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="01"]')?.click());
await page.waitForTimeout(700);
let modal = await page.$('[role="dialog"][aria-label*="Sign in"], [role="dialog"][aria-label*="Connexion"]');
console.log('Step 1 — login modal after clicking chapter 01:', !!modal);
await page.screenshot({ path: '/tmp/T2C-login-modal.png', fullPage: false });

// 2. Click Continue with Google → modal closes, chapter 01 opens
await page.evaluate(() => {
  const btns = document.querySelectorAll('.login-modal button');
  for (const b of btns) {
    if ((b.textContent || '').includes('Google') || (b.textContent || '').includes('GOOGLE')) { b.click(); return; }
  }
});
await page.waitForTimeout(900);
const fs = await page.$('.chapter-fullscreen');
console.log('Step 2 — chapter fullscreen open after login:', !!fs);
await page.screenshot({ path: '/tmp/T2C-after-login.png', fullPage: false });

// 3. Scroll to bottom of fullscreen — X should still be visible (fixed)
await page.evaluate(() => {
  const el = document.querySelector('.chapter-fullscreen');
  if (el) el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/T2C-fs-bottom.png', fullPage: false });

// 4. Click X → fullscreen should close
await page.evaluate(() => {
  const btns = document.querySelectorAll('.chapter-fullscreen button');
  for (const b of btns) {
    const al = b.getAttribute('aria-label') || '';
    if (al.includes('Close') || al.includes('Fermer')) { b.click(); return; }
  }
});
await page.waitForTimeout(700);
const closed = !(await page.$('.chapter-fullscreen'));
console.log('Step 4 — X closed the fullscreen:', closed);

// 5. Click locked chapter 02 — but now logged in. Should: status flipped to inprogress, opens normally
await page.evaluate(() => document.querySelector('.chapter-card[aria-label*="02"]')?.click());
await page.waitForTimeout(900);
const fs2 = await page.$('.chapter-fullscreen');
console.log('Step 5 — locked chapter opened post-login:', !!fs2);
await page.screenshot({ path: '/tmp/T2C-locked-after-login.png', fullPage: false });

await browser.close();
