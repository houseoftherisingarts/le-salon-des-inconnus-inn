import { chromium } from 'playwright';
const b = await chromium.launch();
for (const base of ['https://inconnus-salon.web.app','https://vexel-space.web.app']) for (const slug of ['auteur','auteur-2']) for (const vp of [[1440,900],[390,844]]) {
  const p = await (await b.newContext({ viewport: { width: vp[0], height: vp[1] } })).newPage();
  await p.goto(`${base}/apercu/${slug}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => [...document.querySelectorAll('[data-feuillet] .al-texte, [data-feuille] .al-texte')].map(t => t.scrollHeight - t.clientHeight).filter(d => d > 1));
  console.log(base.slice(8,20), slug, vp[0], 'debordements', JSON.stringify(r));
}
await b.close();
