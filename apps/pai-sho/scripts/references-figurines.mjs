// Références bâties SUR l'image officielle du personnage (wiki Avatar), par nano-banana-pro.
// Usage : node scripts/references-figurines.mjs <peint|dessin> <id,id|tous>
// Écrit refs2-<style>.json à côté : [id → URL], à passer à meshy-image-3d.mjs.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os'; import path from 'node:path';
const ici = path.dirname(new URL(import.meta.url).pathname);
const jeton = readFileSync(path.join(os.homedir(), '.claude/keys.env'), 'utf8').match(/REPLICATE_API_TOKEN=([^\s"']+)/)[1];
const wiki = JSON.parse(readFileSync(path.join(ici, 'references-wiki.json'), 'utf8'));
const CLE = { mai: 'Mai', chou: 'Cabbage merchant', tylee: 'Ty Lee', jet: 'Jet', zhao: 'Zhao', jeongjeong: 'Jeong Jeong', longfeng: 'Long Feng', pakku: 'Pakku', piandao: 'Piandao', hama: 'Hama', wanshitong: 'Wan Shi Tong', ozai: 'Ozai', irohek: 'Iroh EK' };
const style = process.argv[2];
const ids = process.argv[3] === 'tous' ? Object.keys(CLE) : process.argv[3].split(',');
const fichier = path.join(ici, `refs2-${style}.json`);
const sortie = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')) : {};
const fini = style === 'peint'
  ? 'Hand-painted resin tabletop figurine finish, soft matte surfaces, realistic sculpted volumes that keep the character’s exact proportions from the show (adult body, normal head size, no chibi).'
  : 'Cel-shaded collectible figurine in the exact 2D art style of the show (flat colours, clean dark outlines), keeping the character’s exact proportions from the show (normal head size, no chibi).';
const prompt = (nom) => `Turn the character in the reference image into a figurine of exactly this character: same face, same eyes, same hairstyle, same outfit, same colours and same accessories as in the reference, nothing redesigned. ${fini} The figurine sits comfortably on a small wooden tavern stool, hands resting on the knees, facing straight at the camera, full body visible from head to feet, nothing cropped. Plain uniform light grey background, soft even studio light, no shadows on the ground, no text, no letters, no logo.`;
for (const id of ids) {
  if (sortie[id]) { console.log(id, 'déjà'); continue; }
  const src = wiki[CLE[id]]; if (!src) { console.log(id, 'SANS IMAGE WIKI'); continue; }
  for (let essai = 0; essai < 5; essai++) {
    const r = await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', {
      method: 'POST', headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input: { prompt: prompt(CLE[id]), image_input: [src], aspect_ratio: '3:4', resolution: '1K', output_format: 'png' } }),
    });
    let d = await r.json();
    // Prefer: wait peut rendre avant la fin : on attend la prédiction.
    for (let n = 0; n < 20 && d.id && !['succeeded', 'failed', 'canceled'].includes(d.status); n++) {
      await new Promise((ok) => setTimeout(ok, 5000));
      d = await (await fetch(`https://api.replicate.com/v1/predictions/${d.id}`, { headers: { Authorization: `Bearer ${jeton}` } })).json();
    }
    if (d.status === 'succeeded' && d.output) { sortie[id] = Array.isArray(d.output) ? d.output[0] : d.output; writeFileSync(fichier, JSON.stringify(sortie, null, 1)); console.log(id, sortie[id]); break; }
    console.log(id, 'essai', essai, d.status ?? r.status, String(d.error ?? d.detail ?? '').slice(0, 100));
    await new Promise((ok) => setTimeout(ok, 10000));
  }
}
