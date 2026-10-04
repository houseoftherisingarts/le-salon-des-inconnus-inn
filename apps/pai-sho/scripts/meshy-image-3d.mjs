// Sculpte des figurines Meshy (image vers 3D) et les range dans
// public/models/convives/<id>.glb, compressées draco et webp.
// Usage : node scripts/meshy-image-3d.mjs liste.json
//   liste.json : [{ "id": "iroh", "url": "https://…/figurine.png" }, …]
// La clé MESHY_API_KEY vient de ~/.claude/keys.env.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.resolve(ici, '../public/models/convives');
mkdirSync(SORTIE, { recursive: true });

const cle = readFileSync(path.join(os.homedir(), '.claude/keys.env'), 'utf8').match(/MESHY_API_KEY=([^\s"']+)/)?.[1];
if (!cle) throw new Error('MESHY_API_KEY introuvable');
const entetes = { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' };
const API = 'https://api.meshy.ai/openapi/v1/image-to-3d';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function sculpter({ id, url }) {
  const brut = path.join(os.tmpdir(), `meshy-${id}.glb`);
  const rep = await fetch(API, {
    method: 'POST', headers: entetes,
    body: JSON.stringify({ image_url: url, should_remesh: true, target_polycount: 15000, should_texture: true, enable_pbr: true }),
  });
  if (!rep.ok) throw new Error(`${id} : création ${rep.status} ${await rep.text()}`);
  const { result: tache } = await rep.json();
  console.log(`${id} : tâche ${tache}`);
  for (;;) {
    await pause(10000);
    const etat = await (await fetch(`${API}/${tache}`, { headers: entetes })).json();
    if (etat.status === 'SUCCEEDED') {
      const glb = Buffer.from(await (await fetch(etat.model_urls.glb)).arrayBuffer());
      writeFileSync(brut, glb);
      const final = path.join(SORTIE, `${id}.glb`);
      execFileSync('npx', ['-y', '@gltf-transform/cli', 'optimize', brut, final, '--compress', 'draco', '--texture-compress', 'webp', '--texture-size', '1024'], { stdio: 'inherit' });
      console.log(`${id} : ${final} (vignette ${etat.thumbnail_url})`);
      return;
    }
    if (etat.status === 'FAILED' || etat.status === 'CANCELED') throw new Error(`${id} : ${etat.status} ${etat.task_error?.message ?? ''}`);
    process.stdout.write(`${id} ${etat.status} ${etat.progress ?? 0}%\n`);
  }
}

// Meshy refuse au-delà de trois tâches en attente : trois ouvriers piochent dans la file.
const liste = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const file = [...liste];
const echecs = [];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let e = file.shift(); e; e = file.shift()) {
    try { await sculpter(e); } catch (err) { echecs.push(e.id); console.error(`ÉCHEC ${e.id} : ${err.message}`); }
  }
}));
if (echecs.length) process.exit(1);
