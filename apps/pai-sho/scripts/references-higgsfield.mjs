// Références bâties SUR l'image officielle du personnage (wiki Avatar), par
// nano-banana-pro sur Higgsfield, à travers son serveur MCP appelé à la main
// (jeton OAuth dans ~/.claude/higgsfield-oauth.json, client dans
// ~/.claude/higgsfield-client.json, obtenus le 4 octobre 2026).
// Usage : node scripts/references-higgsfield.mjs <peint|dessin> <id,id|tous>
// Écrit refs3-<style>.json à côté : [{ id, url }], à passer à meshy-image-3d.mjs
// (l'id porte déjà le suffixe 2 pour le style dessin).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const maison = os.homedir();
const MCP = 'https://mcp.higgsfield.ai/mcp';
// Fandom refuse le robot de Higgsfield (403) : les mêmes images, recopiées dans
// le seau Firebase du Salon (references-public.json), passent à sa place.
const wiki = { ...JSON.parse(readFileSync(path.join(ici, 'references-wiki.json'), 'utf8')), ...JSON.parse(readFileSync(path.join(ici, 'references-public.json'), 'utf8')) };
const CLE = { mai: 'Mai', chou: 'Cabbage merchant', tylee: 'Ty Lee', jet: 'Jet', zhao: 'Zhao', jeongjeong: 'Jeong Jeong', longfeng: 'Long Feng', pakku: 'Pakku', piandao: 'Piandao', hama: 'Hama', wanshitong: 'Wan Shi Tong', ozai: 'Ozai', irohek: 'Iroh EK', toph: 'Toph' };
const style = process.argv[2];
const ids = process.argv[3] === 'tous' ? Object.keys(CLE) : process.argv[3].split(',');
// GABARIT=<url> ajoute une seconde référence : la figurine peinte d'Iroh, dont
// la matière, la pose et le fond doivent être copiés (5 octobre 2026 : le style
// « peint » par prompt seul rendait du dessin animé pour Mai, Ty Lee, Zhao,
// Long Feng, Piandao et Ozai). MODELE=<nom> change le modèle d'image;
// SORTIE=<fichier> change le fichier de résultats.
const gabarit = process.env.GABARIT;
const fini = style === 'peint'
  ? 'Hand-painted resin tabletop figurine finish, soft matte surfaces, realistic sculpted volumes that keep the character’s exact proportions from the show (adult body, normal head size, no chibi).'
  : 'Cel-shaded collectible figurine in the exact 2D art style of the show (flat colours, clean dark outlines), keeping the character’s exact proportions from the show (normal head size, no chibi).';
const prompt = gabarit
  ? `Two reference images. The FIRST image shows the character: make a figurine of exactly this character, same face, same eyes, same hairstyle, same outfit, same colours and same accessories, nothing redesigned. The SECOND image shows a finished hand-painted resin tabletop figurine of a different character: copy its material, finish, sculpted volumes, pose, wooden stool, lighting and plain light grey background exactly, but do not copy its character. ${fini} The figurine sits comfortably on the small wooden stool, hands resting on the knees, facing straight at the camera, full body visible from head to feet, nothing cropped. Plain uniform light grey background, soft even studio light, no shadows on the ground, no text, no letters, no logo.`
  : `Turn the character in the reference image into a figurine of exactly this character: same face, same eyes, same hairstyle, same outfit, same colours and same accessories as in the reference, nothing redesigned. ${fini} The figurine sits comfortably on a small wooden tavern stool, hands resting on the knees, facing straight at the camera, full body visible from head to feet, nothing cropped. Plain uniform light grey background, soft even studio light, no shadows on the ground, no text, no letters, no logo.`;

// ─── Le jeton, rafraîchi quand Higgsfield répond 401 ────────────────
const cheminJeton = path.join(maison, '.claude/higgsfield-oauth.json');
let jeton = JSON.parse(readFileSync(cheminJeton, 'utf8'));
async function rafraichir() {
  const { client_id } = JSON.parse(readFileSync(path.join(maison, '.claude/higgsfield-client.json'), 'utf8'));
  const r = await fetch('https://clerk.higgsfield.ai/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: jeton.refresh_token, client_id }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`rafraîchissement refusé : ${JSON.stringify(d).slice(0, 200)}`);
  jeton = { ...jeton, ...d };
  writeFileSync(cheminJeton, JSON.stringify(jeton));
}

// ─── Le client MCP minimal (JSON-RPC sur HTTP, réponses en SSE) ─────
let session = '';
async function rpc(method, params, id = 1) {
  const corps = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  const entetes = () => ({ Authorization: `Bearer ${jeton.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(session ? { 'Mcp-Session-Id': session } : {}) });
  let r = await fetch(MCP, { method: 'POST', headers: entetes(), body: corps });
  if (r.status === 401) { await rafraichir(); session = ''; await ouvrir(); r = await fetch(MCP, { method: 'POST', headers: entetes(), body: corps }); }
  if (!r.ok) throw new Error(`${method} ${r.status} ${(await r.text()).slice(0, 200)}`);
  session = r.headers.get('mcp-session-id') ?? session;
  const texte = await r.text();
  const donnees = texte.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const rep = donnees.find((d) => d.id === id) ?? donnees.at(-1);
  if (rep?.error) throw new Error(`${method} : ${rep.error.message}`);
  return rep?.result;
}
async function ouvrir() {
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'paisho-figurines', version: '1' } });
  await fetch(MCP, { method: 'POST', headers: { Authorization: `Bearer ${jeton.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'Mcp-Session-Id': session }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
}
let n = 10;
async function outil(name, args) {
  const res = await rpc('tools/call', { name, arguments: args }, ++n);
  const texte = (res?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  if (process.env.DEBUG) console.log(`[${name}]`, texte.slice(0, 1500));
  if (res?.isError) throw new Error(`${name} : ${texte.slice(0, 300)}`);
  return texte;
}
// Les outils rendent du texte (souvent du JSON, parfois une phrase) : on y pêche ce qu'il faut.
const uuid = (t) => t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
const urlImage = (t) => t.match(/https?:\/\/[^\s"'\\)]+\.(?:png|jpe?g|webp)(?:\?[^\s"'\\)]*)?/i)?.[0] ?? t.match(/https?:\/\/[^\s"'\\)]+/)?.[0];

// ─── La boucle ──────────────────────────────────────────────────────
const fichier = path.join(ici, `refs3-${style}.json`);
const sortie = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')) : [];
const suffixe = style === 'dessin' ? '2' : '';
await ouvrir();
for (const id of ids) {
  const cible = id + suffixe;
  if (sortie.find((e) => e.id === cible)) { console.log(cible, 'déjà'); continue; }
  const src = wiki[CLE[id]]; if (!src) { console.log(id, 'SANS IMAGE WIKI'); continue; }
  try {
    const media = uuid(await outil('media_import_url', { url: src, type: 'image' }));
    if (!media) throw new Error('aucun media_id rendu');
    // JOB=<id> dans l'environnement reprend une tâche déjà lancée au lieu d'en payer une autre.
    const lancement = process.env.JOB ?? await outil('generate_image', { params: { model: 'nano_banana_pro', prompt, aspect_ratio: '3:4', resolution: '1k', medias: [{ value: media, role: 'image_references' }] } });
    const job = uuid(lancement);
    if (!job) throw new Error(`aucun job_id : ${lancement.slice(0, 200)}`);
    let url = null;
    // jobs_wait plafonne à quinze secondes par appel : on rappelle jusqu'à cinq minutes,
    // puis show_generation_by_ids donne l'adresse du résultat.
    for (let essai = 0; essai < 20 && !url; essai++) {
      const attente = await outil('jobs_wait', { jobs: [{ index: 0, job_id: job }], timeout_seconds: 15 });
      url = urlImage(attente);
      if (/,failed,|failed: [1-9]|errors: [1-9]/.test(attente)) throw new Error(attente.slice(0, 200));
      if (!url && /all_terminal: true/.test(attente)) url = urlImage(await outil('show_generation_by_ids', { jobs: [{ index: 0, job_id: job }] }));
    }
    if (!url) throw new Error('aucune URL d’image après l’attente');
    sortie.push({ id: cible, url });
    writeFileSync(fichier, JSON.stringify(sortie, null, 1));
    console.log(cible, url);
  } catch (err) { console.log(cible, 'ÉCHEC', err.message); }
}
