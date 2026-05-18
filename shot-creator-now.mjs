import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:5175/creator', { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
await p.waitForTimeout(1200);
try { await p.getByRole('button', { name: /ESSENTIEL SEULEMENT/i }).click({ timeout: 1500 }); } catch {}
await p.waitForTimeout(400);
try { await p.getByRole('button', { name: /VOIR COMME VISITEUR/i }).click({ timeout: 1500 }); } catch {}
await p.waitForTimeout(900);
try { await p.getByRole('button', { name: /^PROFIL$/i }).first().click({ timeout: 1500 }); } catch {}
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/creator-profil.png', fullPage: false });
await b.close();
console.log('saved /tmp/creator-profil.png');
