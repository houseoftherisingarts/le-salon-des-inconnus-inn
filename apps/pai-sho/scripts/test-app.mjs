// Lance le .app empaqueté avec Playwright et vérifie que la page se rend vraiment.
import { _electron as electron } from 'playwright';
import { fileURLToPath } from 'node:url';
const exe = process.argv[2];
const app = await electron.launch({ executablePath: exe, args: [] });
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(6000);
const r = await page.evaluate(() => ({
  url: location.href,
  titre: document.title,
  enfants: document.getElementById('root')?.children.length ?? -1,
  canvas: document.querySelectorAll('canvas').length,
  texte: document.body.innerText.slice(0, 200).replace(/\s+/g, ' '),
}));
console.log(JSON.stringify(r, null, 1));
await page.screenshot({ path: fileURLToPath(new URL('../captures/app-x64.jpg', import.meta.url)), type: 'jpeg', quality: 80 });
await app.close();
