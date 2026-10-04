// Sculpte une figurine Meshy à partir d'un texte (quand aucune image de
// référence n'est à portée) et la range dans public/models/convives/<id>.glb.
// Usage : node scripts/meshy-texte-3d.mjs liste.json
//   liste.json : [{ "id": "chou", "prompt": "…" }, …]
// La clé MESHY_API_KEY vient de ~/.claude/keys.env. Environ 15 crédits le modèle.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.resolve(ici, '../public/models/convives');
mkdirSync(SORTIE, { recursive: true });
const cle = readFileSync(path.join(os.homedir(), '.claude/keys.env'), 'utf8').match(/MESHY_API_KEY=["']?([^\s"']+)/)?.[1];
if (!cle) throw new Error('MESHY_API_KEY introuvable');
const H = { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' };
const API = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(corps) {
  const r = await fetch(API, { method: 'POST', headers: H, body: JSON.stringify(corps) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()).result;
}
async function attendre(id, nom) {
  for (;;) {
    await pause(10000);
    const t = await (await fetch(`${API}/${id}`, { headers: H })).json();
    if (t.status === 'SUCCEEDED') return t;
    if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error(`${nom} : ${t.status} ${t.task_error?.message ?? ''}`);
  }
}
async function sculpter({ id, prompt }) {
  const apercu = await api({ mode: 'preview', prompt, art_style: 'realistic', should_remesh: true, target_polycount: 15000, topology: 'triangle' });
  await attendre(apercu, `${id} (aperçu)`);
  const t = await attendre(await api({ mode: 'refine', preview_task_id: apercu, enable_pbr: true }), `${id} (texture)`);
  const brut = path.join(os.tmpdir(), `meshy-${id}.glb`);
  writeFileSync(brut, Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer()));
  const final = path.join(SORTIE, `${id}.glb`);
  execFileSync('npx', ['-y', '@gltf-transform/cli', 'optimize', brut, final, '--compress', 'draco', '--texture-compress', 'webp', '--texture-size', '1024'], { stdio: 'ignore' });
  console.log(`${id} : ${final} (vignette ${t.thumbnail_url})`);
}
// Meshy refuse plus de quelques tâches en attente : trois à la fois, et
// une figurine déjà sculptée (fichier présent) n'est pas refaite.
import { existsSync } from 'node:fs';
const liste = JSON.parse(readFileSync(process.argv[2], 'utf8')).filter((f) => !existsSync(path.join(SORTIE, `${f.id}.glb`)));
const file = [...liste];
async function ouvrier() {
  for (let f = file.shift(); f; f = file.shift()) await sculpter(f).catch((e) => console.error(`${f.id} : raté, ${e.message}`));
}
await Promise.all([ouvrier(), ouvrier(), ouvrier()]);
