import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [,, fichier, sortie] = process.argv;
const refs = JSON.parse(readFileSync(fichier, 'utf8'));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 7 * 220, height: 2 * 320 } });
await p.setContent(`<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(7,220px)}div{position:relative;height:320px}img{width:220px;height:293px;object-fit:contain;background:#fff}span{position:absolute;bottom:2px;left:6px;color:#fff;font:bold 16px sans-serif}</style>${Object.entries(refs).map(([id, u]) => `<div><img src="${u}"><span>${id}</span></div>`).join('')}`);
await p.waitForTimeout(6000);
await p.screenshot({ path: sortie, quality: 80, fullPage: true }); await b.close();
