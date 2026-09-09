import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/1b5003c6-160a-45ac-bbdd-168ed91e1db7/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
const erreurs = [];
p.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
await p.goto('https://www.lesalondesinconnus.com/camping', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(8000);
const SEL = '.overflow-y-auto';
const info = await p.evaluate((sel) => {
  const el = document.querySelector(sel);
  return { scrollHeight: el ? el.scrollHeight : -1, titre: document.querySelector('h1')?.textContent, cta: [...document.querySelectorAll('button,a')].map(e => e.textContent.trim()).filter(t => /RÉSERVER|Réservation/i.test(t)) };
}, SEL);
await p.evaluate((sel) => document.querySelector(sel).scrollTo(0, 999999), SEL);
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/live-camping-bas.png` });
console.log(JSON.stringify(info), '· erreurs JS:', erreurs.length ? erreurs : 'aucune');
await b.close();
